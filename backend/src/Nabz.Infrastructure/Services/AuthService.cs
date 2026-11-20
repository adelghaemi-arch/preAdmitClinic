/*
 File: backend/src/Nabz.Infrastructure/Services/AuthService.cs
 Description: OTP (FixedOtp یا رندم+قالب کاوه‌نگار)، نشست، اعتبارسنجی توکن
 Parent Dependencies: IAuthRepository, ISmsSender, AuthOptions, KavenegarOptions
 */

using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Options;
using Nabz.Application.Security;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Services;

public sealed class AuthService(
    IUserRepository users,
    IAuthRepository auth,
    IContractRepository contracts,
    IPatientRepository patients,
    IClinicRepository clinics,
    IUnitOfWork uow,
    ISmsSender sms,
    IOptions<AuthOptions> authOptions,
    IOptions<KavenegarOptions> kavenegarOptions,
    ILogger<AuthService> logger) : IAuthService
{
    public async Task<OtpRequestResult> RequestOtpAsync(string mobile, CancellationToken ct = default)
    {
        mobile = NormalizeMobile(mobile);
        if (string.IsNullOrWhiteSpace(mobile))
            return new OtpRequestResult(false, null, "شماره موبایل نامعتبر است.");

        // ورود فقط اگر کاربر، بیمار ثبت‌شده، یا ناظر قرارداد باشد
        var user = await users.GetByMobileAsync(mobile, ct);
        var clinic = await clinics.GetCurrentAsync(ct);
        Patient? patient = null;
        if (clinic is not null)
            patient = await patients.GetByPhoneAsync(mobile, clinic.Id, ct);
        var supervisor = await contracts.GetSupervisorByPhoneAsync(mobile, ct);
        if (user is null && patient is null && supervisor is null)
            return new OtpRequestResult(false, null, "شماره در سیستم ثبت نشده است.");

        var authCfg = authOptions.Value;
        var kav = kavenegarOptions.Value;
        string code;
        string? demoCode = null;

        // بای‌پس: کد ثابت از env — بدون رندم و بدون کاوه‌نگار
        if (authCfg.HasFixedOtp)
        {
            code = authCfg.FixedOtp!.Trim();
            demoCode = code;
        }
        else
        {
            code = RandomNumberGenerator.GetInt32(10000, 99999).ToString();
            var template = kav.OtpTemplate;
            if (string.IsNullOrWhiteSpace(template))
                return new OtpRequestResult(false, null, "قالب OTP کاوه‌نگار پیکربندی نشده است.");
            try
            {
                await sms.SendTemplateAsync(mobile, template, new[] { code }, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "ارسال OTP قالبی برای {Mobile} ناموفق", mobile);
                return new OtpRequestResult(false, null, "ارسال پیامک ورود ناموفق بود.");
            }
        }

        var ttl = 120;
        await auth.AddOtpAsync(new OtpChallenge
        {
            Mobile = mobile,
            CodeHash = Hash(code),
            DemoCodePlain = demoCode ?? string.Empty,
            ExpiresAt = DateTime.UtcNow.AddSeconds(ttl)
        }, ct);
        await uow.SaveChangesAsync(ct);
        return new OtpRequestResult(true, demoCode, null);
    }

    public async Task<OtpVerifyResult> VerifyOtpAsync(string mobile, string code, string? deviceLabel, string? appSurface, CancellationToken ct = default)
    {
        mobile = NormalizeMobile(mobile);
        var challenge = await auth.GetLatestActiveOtpAsync(mobile, ct);
        if (challenge is null || challenge.CodeHash != Hash(code))
            return new OtpVerifyResult(false, null, null, null, null, "کد نامعتبر یا منقضی است.");

        challenge.Consumed = true;
        challenge.UpdatedAt = DateTime.UtcNow;

        var user = await users.GetByMobileAsync(mobile, ct);
        if (user is null)
        {
            user = new User { Mobile = mobile, FullName = mobile, IsActive = true };
            await users.AddAsync(user, ct);

            var supervisor = await contracts.GetSupervisorByPhoneAsync(mobile, ct);
            if (supervisor is not null)
            {
                users.AddRole(new UserRoleAssignment
                {
                    UserId = user.Id,
                    Role = AppRole.Supervisor,
                    ContractId = supervisor.ContractId
                });
            }
            else
            {
                users.AddRole(new UserRoleAssignment { UserId = user.Id, Role = AppRole.Owner });
                var clinic = await clinics.GetCurrentAsync(ct);
                if (clinic is not null)
                {
                    var patient = await patients.GetByPhoneAsync(mobile, clinic.Id, ct);
                    // پیوند مستقیم مالک پس از اولین ورود
                    if (patient is not null && patient.OwnerUserId is null)
                    {
                        patient.OwnerUserId = user.Id;
                        patient.UpdatedAt = DateTime.UtcNow;
                        user.FullName = patient.FullName;
                        user.NationalId = patient.NationalId;
                    }
                }
            }
        }

        if (!user.IsActive)
            return new OtpVerifyResult(false, null, null, null, null, "حساب غیرفعال است.");

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var session = new AuthSession
        {
            UserId = user.Id,
            TokenHash = Hash(token),
            DeviceLabel = string.IsNullOrWhiteSpace(deviceLabel) ? "web" : deviceLabel!,
            AppSurface = string.IsNullOrWhiteSpace(appSurface) ? "clinic_web" : appSurface!,
            LastSeenAt = DateTime.UtcNow
        };
        await auth.AddSessionAsync(session, ct);

        var active = await auth.ListActiveSessionsAsync(user.Id, ct);
        // هشدار ضدتقلب وقتی بیش از یک نشست هم‌زمان فعال است
        if (active.Count >= 1)
        {
            await auth.AddMultiSessionAlertAsync(new MultiSessionAlert
            {
                UserId = user.Id,
                ActiveSessionCount = active.Count + 1,
                ReviewStatus = FraudReviewStatus.Pending
            }, ct);
        }

        await uow.SaveChangesAsync(ct);
        var roles = (await users.ListRolesAsync(user.Id, ct)).Select(r => r.Role).ToList();
        return new OtpVerifyResult(true, user.Id, session.Id, token, roles, null);
    }

    public async Task<AuthSessionPrincipal?> ValidateTokenAsync(string rawToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawToken)) return null;
        var session = await auth.GetActiveSessionByTokenHashAsync(Hash(rawToken.Trim()), ct);
        if (session is null) return null;

        var user = await users.GetByIdAsync(session.UserId, ct);
        if (user is null || !user.IsActive) return null;

        session.LastSeenAt = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);

        var roleRows = await users.ListRolesAsync(user.Id, ct);
        var roles = roleRows.Select(r => r.Role.ToString()).ToList();
        var contractId = roleRows.FirstOrDefault(r => r.Role == AppRole.Supervisor && r.ContractId.HasValue)?.ContractId;
        return new AuthSessionPrincipal(user.Id, session.Id, roles, contractId, user.IsActive);
    }

    public async Task<AuthMeDto?> GetMeAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct);
        if (user is null) return null;
        var roleRows = await users.ListRolesAsync(user.Id, ct);
        var roles = roleRows.Select(r => r.Role).Distinct().ToList();
        var clinic = await clinics.GetCurrentAsync(ct);
        var contractId = roleRows.FirstOrDefault(r => r.Role == AppRole.Supervisor && r.ContractId.HasValue)?.ContractId;
        return new AuthMeDto(
            user.Id,
            user.FullName,
            user.Mobile,
            roles,
            clinic?.Id,
            contractId,
            user.IsActive);
    }

    public async Task<bool> RevokeSessionAsync(Guid sessionId, Guid actingUserId, bool allowOtherUsers, CancellationToken ct = default)
    {
        var session = await auth.GetSessionByIdAsync(sessionId, ct);
        if (session is null || session.RevokedAt is not null) return false;
        if (!allowOtherUsers && session.UserId != actingUserId) return false;
        session.RevokedAt = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return true;
    }

    public async Task<int> RevokeOtherSessionsAsync(Guid userId, Guid keepSessionId, CancellationToken ct = default)
    {
        var sessions = await auth.ListActiveSessionsAsync(userId, ct);
        var n = 0;
        foreach (var s in sessions.Where(x => x.Id != keepSessionId))
        {
            s.RevokedAt = DateTime.UtcNow;
            s.UpdatedAt = DateTime.UtcNow;
            n++;
        }
        if (n > 0) await uow.SaveChangesAsync(ct);
        return n;
    }

    public async Task<int> RevokeAllUserSessionsAsync(Guid userId, CancellationToken ct = default)
    {
        var sessions = await auth.ListActiveSessionsAsync(userId, ct);
        foreach (var s in sessions)
        {
            s.RevokedAt = DateTime.UtcNow;
            s.UpdatedAt = DateTime.UtcNow;
        }
        if (sessions.Count > 0) await uow.SaveChangesAsync(ct);
        return sessions.Count;
    }

    private static string NormalizeMobile(string mobile) => (mobile ?? string.Empty).Trim();

    private static string Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes);
    }
}
