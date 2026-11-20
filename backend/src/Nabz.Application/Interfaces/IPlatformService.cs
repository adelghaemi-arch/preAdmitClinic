/*
 File: backend/src/Nabz.Application/Interfaces/IPlatformService.cs
 Description: کنترل پلتفرم، کاربران، تنظیمات، ممیزی (UC-PLT)
 Parent Dependencies: ClinicStatus, AppRole
 */

using Nabz.Domain.Enums;

namespace Nabz.Application.Interfaces;

/// <summary>خلاصه قرارداد مرتبط با کاربر در فهرست ادمین (عضو یا ناظر).</summary>
public record UserContractSummaryDto(Guid ContractId, string Title, string Relation, string Status);

public record PlatformUserDto(
    Guid Id, string FirstName, string LastName, string FullName,
    string Mobile, string? NationalId, bool IsActive, IReadOnlyList<string> Roles,
    IReadOnlyList<UserContractSummaryDto> Contracts,
    /// <summary>پرونده Owner با OwnerUserId — برای hydrate GPS/شواهد در FE.</summary>
    Guid? LinkedPatientId = null);
public record AuditDto(Guid Id, DateTime At, string Actor, string Action, string Target, string? Detail);
/// <summary>فلگ‌های پلتفرم — هم‌تراز FE؛ JSON خالی مثل «همه روشن به‌جز multiClinic» تفسیر می‌شود.</summary>
public record FeatureFlagsDto(
    bool FraudWatch = true,
    bool GpsTracking = true,
    bool MultiClinicRegistry = false,
    bool CorporateContracts = true,
    bool MultiSessionWatch = true);
public record PlatformSettingsDto(
    string BrandName,
    int OtpLength,
    int OtpTtlSeconds,
    int IntakeDocumentMaxGroups,
    int IntakeDocumentMaxFilesPerGroup,
    string? SupportPhone = null,
    string? SmsSenderId = null,
    int FraudAutoCaptureSeconds = 7,
    FeatureFlagsDto? FeatureFlags = null);
public record MultiSessionAlertDto(Guid Id, Guid UserId, int ActiveSessionCount, string ReviewStatus, string? ReviewNote);

public interface IPlatformService
{
    Task UpdateClinicStatusAsync(Guid clinicId, ClinicStatus status, string actor, CancellationToken ct = default);
    Task<PlatformSettingsDto> GetSettingsAsync(CancellationToken ct = default);
    Task UpdateSettingsAsync(PlatformSettingsDto settings, string actor, CancellationToken ct = default);
    Task<PlatformUserDto> UpsertUserAsync(Guid? userId, string firstName, string lastName, string mobile, string? nationalId, AppRole primaryRole, Guid? clinicId, Guid? contractId, CancellationToken ct = default);
    Task SetUserActiveAsync(Guid userId, bool isActive, string actor, CancellationToken ct = default);
    Task AppendAuditAsync(string actor, string action, string target, string? detail, CancellationToken ct = default);
    Task<IReadOnlyList<AuditDto>> ListAuditAsync(int take = 100, CancellationToken ct = default);
    Task ReviewMultiSessionAsync(Guid alertId, FraudReviewStatus status, string? note, string reviewer, CancellationToken ct = default);
    Task<IReadOnlyList<MultiSessionAlertDto>> ListMultiSessionAlertsAsync(FraudReviewStatus? status, int take = 50, CancellationToken ct = default);
    Task ResetUserAccessAsync(Guid userId, string actor, CancellationToken ct = default);
    /// <summary>ارسال OTP تأیید ریست فکتوری به موبایل کاربر نشست.</summary>
    Task<OtpRequestResult> RequestFactoryResetOtpAsync(Guid actorUserId, CancellationToken ct = default);
    /// <summary>پس از OTP معتبر: wipe DB + آپلودها + seed اولیه.</summary>
    Task ConfirmFactoryResetAsync(Guid actorUserId, string code, CancellationToken ct = default);
}
