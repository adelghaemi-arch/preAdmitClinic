/*
 File: backend/src/Nabz.Application/Interfaces/IPlatformService.cs
 Description: کنترل پلتفرم، کاربران، تنظیمات، ممیزی (UC-PLT)
 Parent Dependencies: ClinicStatus, AppRole
 */

using Nabz.Domain.Enums;

namespace Nabz.Application.Interfaces;

public record PlatformUserDto(Guid Id, string FullName, string Mobile, string? NationalId, bool IsActive, IReadOnlyList<string> Roles);
public record AuditDto(Guid Id, DateTime At, string Actor, string Action, string Target, string? Detail);
public record PlatformSettingsDto(string BrandName, int OtpLength, int OtpTtlSeconds, int IntakeDocumentMaxGroups, int IntakeDocumentMaxFilesPerGroup);
public record MultiSessionAlertDto(Guid Id, Guid UserId, int ActiveSessionCount, string ReviewStatus, string? ReviewNote);

public interface IPlatformService
{
    Task UpdateClinicStatusAsync(Guid clinicId, ClinicStatus status, string actor, CancellationToken ct = default);
    Task<PlatformSettingsDto> GetSettingsAsync(CancellationToken ct = default);
    Task UpdateSettingsAsync(PlatformSettingsDto settings, string actor, CancellationToken ct = default);
    Task<PlatformUserDto> UpsertUserAsync(Guid? userId, string fullName, string mobile, string? nationalId, AppRole primaryRole, Guid? clinicId, Guid? contractId, CancellationToken ct = default);
    Task SetUserActiveAsync(Guid userId, bool isActive, string actor, CancellationToken ct = default);
    Task AppendAuditAsync(string actor, string action, string target, string? detail, CancellationToken ct = default);
    Task<IReadOnlyList<AuditDto>> ListAuditAsync(int take = 100, CancellationToken ct = default);
    Task ReviewMultiSessionAsync(Guid alertId, FraudReviewStatus status, string? note, string reviewer, CancellationToken ct = default);
    Task<IReadOnlyList<MultiSessionAlertDto>> ListMultiSessionAlertsAsync(FraudReviewStatus? status, int take = 50, CancellationToken ct = default);
    Task ResetUserAccessAsync(Guid userId, string actor, CancellationToken ct = default);
}
