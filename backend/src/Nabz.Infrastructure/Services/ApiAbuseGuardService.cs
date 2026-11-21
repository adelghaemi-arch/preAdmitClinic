/*
 File: backend/src/Nabz.Infrastructure/Services/ApiAbuseGuardService.cs
 Description: ارزیابی soft/hard، تعلیق کاربر، SMS ادمین کل (UC-PLT-17)
 Parent Dependencies: IApiAbuseMemoryStore, IApiAbuseRepository, IAuthRepository, IUserRepository, ISmsSender
 */

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nabz.Application.Abstractions;
using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Options;
using Nabz.Domain.Entities;

namespace Nabz.Infrastructure.Services;

public sealed class ApiAbuseGuardService(
    IApiAbuseMemoryStore memory,
    IApiAbuseRepository abuseRepo,
    IAuthRepository auth,
    IUserRepository users,
    IPlatformRepository platform,
    IUnitOfWork uow,
    ISmsSender sms,
    IOptions<ApiAbuseOptions> abuseOptions,
    IOptions<AuthOptions> authOptions,
    IOptions<KavenegarOptions> kavenegarOptions,
    ILogger<ApiAbuseGuardService> logger) : IApiAbuseGuardService
{
    public ApiAbuseEvaluateResult EvaluateEarly(string? tokenHash, string? clientIp, string method, string path)
    {
        var opt = abuseOptions.Value;
        if (string.Equals(method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
            return Allow();
        if (IApiAbuseGuardService.IsExemptPath(path))
            return Allow();

        if (!string.IsNullOrWhiteSpace(tokenHash) && memory.IsTokenDenied(tokenHash))
        {
            return new ApiAbuseEvaluateResult(
                ApiAbuseVerdict.Denied,
                opt.HardRetryAfterSeconds,
                null,
                0,
                0,
                "دسترسی به‌دلیل سوءاستفاده معلق شده است.");
        }

        // توکن Platform کش‌شده: قبل از Auth هم soft/IP را رد نمی‌کنیم
        if (!string.IsNullOrWhiteSpace(tokenHash) && memory.IsPlatformToken(tokenHash))
            return Allow();

        // فقط OTP ناشناس با IP؛ لاگین‌شده در PostAuth شمرده می‌شود تا soft مانع hard نشود
        if (!IApiAbuseGuardService.IsOtpPath(path) || string.IsNullOrWhiteSpace(clientIp))
            return Allow();

        var fp = IApiAbuseGuardService.NormalizeFingerprint(method, path);
        var hit = memory.Hit("ip:" + clientIp, fp, opt.SoftWindowSeconds, opt.HardWindowSeconds);

        if (hit.HardSamePath >= opt.HardSamePathCount || hit.HardTotal >= opt.HardTotalCount)
        {
            // بدون نوشتن DB روی مسیر Early (scope درخواست ممکن است برای fire-and-forget زنده نماند)
            logger.LogWarning(
                "محدودیت سخت OTP از IP {Ip} fp={Fp} same={Same} total={Total}",
                clientIp, hit.DominantHardFingerprint, hit.HardSamePath, hit.HardTotal);
            return new ApiAbuseEvaluateResult(
                ApiAbuseVerdict.SoftThrottle,
                opt.IpHardRetryAfterSeconds,
                hit.DominantHardFingerprint,
                hit.HardSamePath,
                hit.HardTotal,
                "تعداد درخواست از این IP بیش از حد مجاز است.");
        }

        if (hit.SoftSamePath >= opt.SoftSamePathCount || hit.SoftTotal >= opt.SoftTotalCount)
        {
            return new ApiAbuseEvaluateResult(
                ApiAbuseVerdict.SoftThrottle,
                opt.SoftRetryAfterSeconds,
                fp,
                hit.SoftSamePath,
                hit.SoftTotal,
                "درخواست‌های تکراری زیاد است؛ کمی بعد تلاش کنید.");
        }

        return Allow();
    }

    public async Task<ApiAbuseEvaluateResult> EvaluatePostAuthAsync(
        Guid? userId,
        string? tokenHash,
        IReadOnlyList<string> roles,
        string method,
        string path,
        string? clientIp,
        CancellationToken ct = default)
    {
        var opt = abuseOptions.Value;
        if (string.Equals(method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
            return Allow();
        if (IApiAbuseGuardService.IsExemptPath(path))
            return Allow();

        var isPlatform = roles.Any(r => string.Equals(r, "Platform", StringComparison.OrdinalIgnoreCase));
        if (isPlatform)
        {
            if (!string.IsNullOrWhiteSpace(tokenHash))
                memory.RememberPlatformToken(tokenHash, TimeSpan.FromHours(12));
            return Allow();
        }

        if (userId is null || userId == Guid.Empty)
            return Allow();

        var key = "user:" + userId.Value.ToString("N");
        var fp = IApiAbuseGuardService.NormalizeFingerprint(method, path);
        var hit = memory.Hit(key, fp, opt.SoftWindowSeconds, opt.HardWindowSeconds);

        if (hit.HardSamePath >= opt.HardSamePathCount || hit.HardTotal >= opt.HardTotalCount)
        {
            await EnforceHardAsync(userId.Value, tokenHash, clientIp, hit, ct);
            return new ApiAbuseEvaluateResult(
                ApiAbuseVerdict.HardAbuse,
                opt.HardRetryAfterSeconds,
                hit.DominantHardFingerprint,
                hit.HardSamePath,
                hit.HardTotal,
                "دسترسی به‌دلیل سوءاستفاده معلق شد.");
        }

        if (hit.SoftSamePath >= opt.SoftSamePathCount || hit.SoftTotal >= opt.SoftTotalCount)
        {
            return new ApiAbuseEvaluateResult(
                ApiAbuseVerdict.SoftThrottle,
                opt.SoftRetryAfterSeconds,
                fp,
                hit.SoftSamePath,
                hit.SoftTotal,
                "درخواست‌های تکراری زیاد است؛ کمی بعد تلاش کنید.");
        }

        return Allow();
    }

    public async Task<IReadOnlyList<ApiAbuseIncidentDto>> ListIncidentsAsync(bool? acknowledged = null, int take = 50, CancellationToken ct = default)
    {
        var list = await abuseRepo.ListAsync(acknowledged, Math.Clamp(take, 1, 200), ct);
        var result = new List<ApiAbuseIncidentDto>(list.Count);
        foreach (var i in list)
        {
            string? mobile = null;
            string? name = null;
            var active = true;
            if (i.UserId is Guid uid)
            {
                var user = await users.GetByIdAsync(uid, ct);
                if (user is not null)
                {
                    active = user.IsActive;
                    mobile = user.Person?.Mobile;
                    name = $"{user.Person?.FirstName} {user.Person?.LastName}".Trim();
                }
            }
            result.Add(new ApiAbuseIncidentDto(
                i.Id, i.CreatedAt, i.UserId, mobile, name, i.ClientIp,
                i.DominantFingerprint, i.SamePathCount, i.TotalCount, i.Severity,
                i.SmsNotified, i.Acknowledged, active, i.Detail));
        }
        return result;
    }

    public async Task AcknowledgeAsync(Guid incidentId, string actor, CancellationToken ct = default)
    {
        var incident = await abuseRepo.GetByIdAsync(incidentId, ct)
            ?? throw new InvalidOperationException("حادثه یافت نشد.");
        incident.Acknowledged = true;
        incident.AcknowledgedAt = DateTime.UtcNow;
        incident.AcknowledgedBy = actor;
        incident.UpdatedAt = DateTime.UtcNow;
        await platform.AddAuditAsync(new PlatformAuditEntry
        {
            Actor = actor,
            Action = "PLATFORM_ACK_API_ABUSE",
            Target = incidentId.ToString()
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    private async Task EnforceHardAsync(Guid userId, string? tokenHash, string? clientIp, ApiAbuseHitResult hit, CancellationToken ct)
    {
        var opt = abuseOptions.Value;
        var cooldownKey = "hard:" + userId.ToString("N");
        if (!memory.TryBeginIncidentCooldown(cooldownKey, TimeSpan.FromSeconds(Math.Max(60, opt.IncidentCooldownSeconds))))
            return;

        var sessions = await auth.ListActiveSessionsAsync(userId, ct);
        var hashes = sessions.Select(s => s.TokenHash).Where(h => !string.IsNullOrWhiteSpace(h)).ToList();
        if (!string.IsNullOrWhiteSpace(tokenHash) && !hashes.Contains(tokenHash, StringComparer.OrdinalIgnoreCase))
            hashes.Add(tokenHash);
        memory.DenyTokenHashes(hashes, TimeSpan.FromHours(Math.Max(1, opt.DenySetTtlHours)));

        var user = await users.GetByIdAsync(userId, ct);
        if (user is not null)
        {
            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;
        }

        foreach (var s in sessions)
        {
            // فقط اگر هنوز revoke نشده؛ جلوی race با LastSeen
            if (s.RevokedAt is null)
            {
                s.RevokedAt = DateTime.UtcNow;
                s.UpdatedAt = DateTime.UtcNow;
            }
        }

        var smsSent = await TryNotifyPlatformAdminAsync(user, hit, ct);
        await abuseRepo.AddAsync(new ApiAbuseIncident
        {
            UserId = userId,
            ClientIp = clientIp,
            DominantFingerprint = hit.DominantHardFingerprint,
            SamePathCount = hit.HardSamePath,
            TotalCount = hit.HardTotal,
            Severity = ApiAbuseSeverities.Hard,
            SmsNotified = smsSent,
            Detail = $"تعلیق خودکار؛ softSame={hit.SoftSamePath} softTotal={hit.SoftTotal}"
        }, ct);

        await platform.AddAuditAsync(new PlatformAuditEntry
        {
            Actor = "system",
            Action = "PLATFORM_API_ABUSE_SUSPEND",
            Target = userId.ToString(),
            Detail = hit.DominantHardFingerprint
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    private async Task<bool> TryNotifyPlatformAdminAsync(User? abuser, ApiAbuseHitResult hit, CancellationToken ct)
    {
        // FixedOtp یعنی SMS خاموش — فقط در محیط واقعی خبر بده
        if (authOptions.Value.HasFixedOtp)
            return false;

        var template = kavenegarOptions.Value.AbuseAlertTemplate?.Trim();
        if (string.IsNullOrWhiteSpace(template) || !kavenegarOptions.Value.IsConfigured)
        {
            logger.LogInformation("SMS هشدار abuse رد شد: قالب یا ApiKey کاوه‌نگار تنظیم نیست.");
            return false;
        }

        var mobile = PlatformAdminIdentity.Mobile;
        var who = abuser?.Person?.Mobile ?? abuser?.Id.ToString("N")[..8] ?? "unknown";
        var pathToken = Truncate(hit.DominantHardFingerprint, 40);
        var countToken = hit.HardTotal.ToString();
        try
        {
            await sms.SendTemplateAsync(mobile, template, [who, pathToken, countToken], ct);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "ارسال SMS هشدار abuse به ادمین کل ناموفق");
            return false;
        }
    }

    private static ApiAbuseEvaluateResult Allow()
        => new(ApiAbuseVerdict.Allow, 0, null, 0, 0, null);

    private static string Truncate(string value, int max)
        => value.Length <= max ? value : value[..max];
}
