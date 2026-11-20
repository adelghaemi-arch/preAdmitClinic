/*
 File: backend/src/Nabz.Infrastructure/Services/PlatformService.cs
 Description: وضعیت کلینیک، تنظیمات، کاربران و ممیزی پلتفرم
 Parent Dependencies: IPlatformRepository, IClinicRepository, IUserRepository, IUserAdminService
 */

using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Services;

public sealed class PlatformService(
    IPlatformRepository platform,
    IClinicRepository clinics,
    IUserRepository users,
    IAuthRepository auth,
    IUserAdminService userAdmin,
    IUnitOfWork uow) : IPlatformService
{
    public async Task UpdateClinicStatusAsync(Guid clinicId, ClinicStatus status, string actor, CancellationToken ct = default)
    {
        var clinic = await clinics.GetByIdAsync(clinicId, ct)
            ?? throw new InvalidOperationException("کلینیک یافت نشد.");
        clinic.Status = status;
        clinic.UpdatedAt = DateTime.UtcNow;
        await platform.AddAuditAsync(new PlatformAuditEntry
        {
            Actor = actor,
            Action = "PLATFORM_UPDATE_CLINIC_STATUS",
            Target = clinicId.ToString(),
            Detail = status.ToString()
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    public async Task<PlatformSettingsDto> GetSettingsAsync(CancellationToken ct = default)
    {
        var s = await EnsureSettingsAsync(ct);
        return Map(s);
    }

    public async Task UpdateSettingsAsync(PlatformSettingsDto settings, string actor, CancellationToken ct = default)
    {
        var s = await EnsureSettingsAsync(ct);
        s.BrandName = settings.BrandName;
        s.OtpLength = settings.OtpLength;
        s.OtpTtlSeconds = settings.OtpTtlSeconds;
        s.IntakeDocumentMaxGroups = settings.IntakeDocumentMaxGroups;
        s.IntakeDocumentMaxFilesPerGroup = settings.IntakeDocumentMaxFilesPerGroup;
        s.UpdatedAt = DateTime.UtcNow;
        await platform.AddAuditAsync(new PlatformAuditEntry
        {
            Actor = actor,
            Action = "PLATFORM_UPDATE_SETTINGS",
            Target = s.Id.ToString()
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    public Task<PlatformUserDto> UpsertUserAsync(Guid? userId, string fullName, string mobile, string? nationalId, AppRole primaryRole, Guid? clinicId, Guid? contractId, CancellationToken ct = default)
        // مسیر api/platform فقط ادمین کل؛ برای actor واقعی از UsersController استفاده شود
        => userAdmin.UpsertUserAsync(true, userId, fullName, mobile, nationalId, primaryRole, clinicId, contractId, "platform-api", ct);

    public Task SetUserActiveAsync(Guid userId, bool isActive, string actor, CancellationToken ct = default)
        => userAdmin.SetUserActiveAsync(true, userId, isActive, actor, ct);

    public async Task AppendAuditAsync(string actor, string action, string target, string? detail, CancellationToken ct = default)
    {
        await platform.AddAuditAsync(new PlatformAuditEntry
        {
            Actor = actor,
            Action = action,
            Target = target,
            Detail = detail
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AuditDto>> ListAuditAsync(int take = 100, CancellationToken ct = default)
    {
        var list = await platform.ListAuditAsync(take, ct);
        return list.Select(a => new AuditDto(a.Id, a.At, a.Actor, a.Action, a.Target, a.Detail)).ToList();
    }

    public async Task ReviewMultiSessionAsync(Guid alertId, FraudReviewStatus status, string? note, string reviewer, CancellationToken ct = default)
    {
        var alert = await auth.GetMultiSessionAlertAsync(alertId, ct)
            ?? throw new InvalidOperationException("هشدار چندنشستی یافت نشد.");
        alert.ReviewStatus = status;
        alert.ReviewNote = note;
        alert.ReviewedAt = DateTime.UtcNow;
        alert.ReviewedBy = reviewer;
        alert.UpdatedAt = DateTime.UtcNow;
        await platform.AddAuditAsync(new PlatformAuditEntry
        {
            Actor = reviewer,
            Action = "PLATFORM_REVIEW_MULTI_SESSION",
            Target = alertId.ToString(),
            Detail = status.ToString()
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<MultiSessionAlertDto>> ListMultiSessionAlertsAsync(FraudReviewStatus? status, int take = 50, CancellationToken ct = default)
    {
        var list = await auth.ListMultiSessionAlertsAsync(status, take, ct);
        return list.Select(a => new MultiSessionAlertDto(a.Id, a.UserId, a.ActiveSessionCount, a.ReviewStatus.ToString(), a.ReviewNote)).ToList();
    }

    public async Task ResetUserAccessAsync(Guid userId, string actor, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct)
            ?? throw new InvalidOperationException("کاربر یافت نشد.");
        var sessions = await auth.ListActiveSessionsAsync(userId, ct);
        foreach (var s in sessions)
        {
            s.RevokedAt = DateTime.UtcNow;
            s.UpdatedAt = DateTime.UtcNow;
        }
        user.IsActive = true;
        user.UpdatedAt = DateTime.UtcNow;
        await platform.AddAuditAsync(new PlatformAuditEntry
        {
            Actor = actor,
            Action = "PLATFORM_RESET_USER_ACCESS",
            Target = userId.ToString()
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    private async Task<PlatformSettings> EnsureSettingsAsync(CancellationToken ct)
    {
        var s = await platform.GetSettingsAsync(ct);
        if (s is not null) return s;
        s = new PlatformSettings();
        await platform.AddSettingsAsync(s, ct);
        await uow.SaveChangesAsync(ct);
        return s;
    }

    private static PlatformSettingsDto Map(PlatformSettings s) => new(
        s.BrandName, s.OtpLength, s.OtpTtlSeconds,
        s.IntakeDocumentMaxGroups, s.IntakeDocumentMaxFilesPerGroup);
}
