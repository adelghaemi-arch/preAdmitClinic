/*
 File: backend/src/Nabz.Application/Interfaces/IContractService.cs
 Description: قرارداد سازمانی، ایجاد/ویرایش پایه، اعضا، SMS، onboarding (UC-ADM / UC-SUP)
 Parent Dependencies: Domain enums
 */

using Nabz.Application.Common;
using Nabz.Domain.Enums;

namespace Nabz.Application.Interfaces;

public record ContractPathwayRuleDto(
    Guid Id, Guid? LibraryRuleId,
    string Title, string Gender, int? MinAge, int? MaxAge, string JobCategory, string PathwayCode, int Priority);

public record ContractDto(
    Guid Id, string Code, string Title, string OrganizationName, string Status,
    string? SupervisorPhone, string? SupervisorName, int MemberCount,
    string? DefaultPathwayCode,
    IReadOnlyList<ContractPathwayRuleDto> PathwayRules);

public record ContractMemberDto(
    Guid Id, Guid ContractId,
    string FirstName, string LastName, string FullName,
    string NationalId, string Phone,
    DateOnly? BirthDate, int? Age, string? Gender, string? MaritalStatus,
    string? Department, string? JobCategory, string? PersonnelCode,
    string OnboardingStage, string? AssignedPathwayCode, string? AssignedPathwayTitle,
    string? MatchedPathwayTitle,
    bool ManualPathwayOverride,
    Guid? LinkedPatientId, string InviteToken,
    // شمارش دعوت برای badge قیف پس از SMS فردی/گروهی
    int SmsInviteCount, DateTime? LastSmsAt,
    // پیشرفت پرسشنامه پیش‌پذیرش (همگام با FormResponse)
    int ProfileProgressPct, string? AbandonedAtStep, DateTime? ProfileCompletedAt,
    /// <summary>None | Draft | Submitted</summary>
    string FormStatus, bool IntakeCompleted,
    string? FatherName = null,
    DateOnly? ScheduledVisitDate = null);

public record PathwayRuleInput(
    string Title, string Gender, int? MinAge, int? MaxAge, string JobCategory, string PathwayCode, int Priority, Guid? LibraryRuleId);

public record CreateContractRequest(string Title, string OrganizationName, string? Code, string? DefaultPathwayCode = null);
/// <summary>ویرایش مشخصات پایه؛ Code پس از ایجاد قفل است.</summary>
public record UpdateContractRequest(string Title, string OrganizationName, string? DefaultPathwayCode = null);
public record UpdateSupervisorRequest(string FirstName, string LastName, string Phone, string? Title, string? NationalId, bool CanSendReminders);
public record ImportMemberRequest(
    string FirstName, string LastName, string NationalId, string Phone, DateOnly BirthDate,
    string Gender, string? MaritalStatus, string? Department, string? JobCategory, string? PersonnelCode,
    /// <summary>نام پدر — اختیاری.</summary>
    string? FatherName = null,
    /// <summary>تاریخ مراجعه برنامه‌ای — اختیاری.</summary>
    DateOnly? ScheduledVisitDate = null,
    /// <summary>اگر کد مسیر معتبر قرارداد/کاتالوگ باشد مسیر override می‌شود؛ برچسب آزاد نادیده.</summary>
    string? PathwayCodeOrGroup = null);

public record ImportMemberRowResult(string FirstName, string LastName, string NationalId, string Status, string? Reason);
public record ImportMembersResult(int Imported, int Duplicates, int Rejected, IReadOnlyList<ImportMemberRowResult> Results);

public record UpdateOnboardingRequest(OnboardingStage Stage, int? ProgressPct, string? AbandonedAtStep);

/// <summary>نتیجه بازمحاسبه قوانین: قبل از پذیرش خودکار؛ بعد از پذیرش دستی.</summary>
public record PathwayRulesReapplyResult(int Recalculated, int NeedsManual);

public record PathwayRecheckRowDto(
    Guid MemberId,
    string FullName,
    string? CurrentPathwayCode,
    string? CurrentPathwayTitle,
    string? CurrentMatchedTitle,
    string? ProposedPathwayCode,
    string? ProposedPathwayTitle,
    string? ProposedMatchedTitle,
    bool WouldChange,
    bool ManualOverride,
    bool Admitted,
    bool CanApply);

public record PathwayRecheckPreviewDto(IReadOnlyList<PathwayRecheckRowDto> Rows);
public record PathwayRecheckApplyRequest(IReadOnlyList<Guid> MemberIds);
public record PathwayRecheckApplyResult(int Applied, int Skipped);

public interface IContractService
{
    Task<ContractDto> CreateAsync(Guid clinicId, CreateContractRequest request, CancellationToken ct = default);
    Task<ContractDto> UpdateAsync(Guid contractId, UpdateContractRequest request, CancellationToken ct = default);
    Task UpdateSupervisorAsync(Guid contractId, UpdateSupervisorRequest request, CancellationToken ct = default);
    Task UpdateApiAsync(Guid contractId, string? apiEndpoint, string? apiKey, CancellationToken ct = default);
    Task<ImportMembersResult> ImportMembersAsync(Guid contractId, IReadOnlyList<ImportMemberRequest> members, CancellationToken ct = default);
    Task<ContractMemberDto> UpdateMemberAsync(Guid memberId, ImportMemberRequest request, CancellationToken ct = default);
    Task DeleteMemberAsync(Guid memberId, CancellationToken ct = default);
    Task UpdateMemberOnboardingAsync(Guid memberId, UpdateOnboardingRequest request, CancellationToken ct = default);
    Task OverrideMemberPathwayAsync(Guid memberId, string pathwayCode, string pathwayTitle, CancellationToken ct = default);
    /// <summary>asSupervisor از claim سرور می‌آید نه از body کلاینت. templateId قالب پلتفرم؛ campaignTitle اختیاری برای لاگ.</summary>
    Task<int> SendBulkSmsAsync(Guid contractId, Guid templateId, string? campaignTitle, IReadOnlyList<Guid>? memberIds, Guid actingUserId, bool asSupervisor, CancellationToken ct = default);
    /// <param name="reapplyMembers">اگر false فقط اولویت/قوانین ذخیره می‌شود؛ جابه‌جایی اعضا با recheck.</param>
    Task<PathwayRulesReapplyResult> SavePathwayRulesAsync(Guid contractId, IReadOnlyList<PathwayRuleInput> rules, bool reapplyMembers = true, CancellationToken ct = default);
    Task<PathwayRulesReapplyResult> AttachLibraryRulesAsync(Guid contractId, IReadOnlyList<Guid> libraryRuleIds, CancellationToken ct = default);
    Task<PathwayRulesReapplyResult> DetachPathwayRuleAsync(Guid contractId, Guid ruleId, CancellationToken ct = default);
    Task<PathwayRecheckPreviewDto> PreviewPathwayRecheckAsync(Guid contractId, CancellationToken ct = default);
    Task<PathwayRecheckApplyResult> ApplyPathwayRecheckAsync(Guid contractId, IReadOnlyList<Guid> memberIds, CancellationToken ct = default);
    Task<ContractDto?> GetAsync(Guid contractId, CancellationToken ct = default);
    Task<IReadOnlyList<ContractMemberDto>> ListMembersAsync(Guid contractId, CancellationToken ct = default);
    Task<PagedResultDto<ContractMemberDto>> ListMembersPagedAsync(
        Guid contractId, int page, int pageSize, string? q, CancellationToken ct = default);
    Task<IReadOnlyList<ContractDto>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default);
    Task<ContractMemberDto?> GetMemberByInviteTokenAsync(string inviteToken, CancellationToken ct = default);
    Task<ContractMemberDto?> FindActiveMemberByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default);
    Task<ContractFunnelStatsDto> GetFunnelStatsAsync(Guid contractId, CancellationToken ct = default);
}

public record ContractFunnelStatsDto(
    Guid ContractId, int MemberCount,
    int NotSent, int SmsSent, int LinkOpened, int LoggedIn, int Abandoned, int Completed, int LinkedPatients,
    /// <summary>اعضایی که پرسشنامه را شروع کرده‌اند (Draft / Abandoned با پیشرفت).</summary>
    int FormDraft,
    /// <summary>اعضایی که پیش‌پذیرش را تکمیل کرده‌اند.</summary>
    int FormSubmitted);
