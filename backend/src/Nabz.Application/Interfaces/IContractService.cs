/*
 File: backend/src/Nabz.Application/Interfaces/IContractService.cs
 Description: قرارداد سازمانی، اعضا، SMS، onboarding (UC-ADM / UC-SUP)
 Parent Dependencies: Domain enums
 */

using Nabz.Domain.Enums;

namespace Nabz.Application.Interfaces;

public record ContractDto(
    Guid Id, string Code, string Title, string OrganizationName, string Status,
    string? SupervisorPhone, string? SupervisorName, int MemberCount);

public record ContractMemberDto(
    Guid Id, Guid ContractId, string FullName, string NationalId, string Phone,
    string OnboardingStage, string? AssignedPackageCode, string? AssignedPackageTitle,
    Guid? LinkedPatientId, string InviteToken);

public record CreateContractRequest(string Title, string OrganizationName, string? Code);
public record UpdateSupervisorRequest(string FullName, string Phone, string? Title, string? NationalId, bool CanSendReminders);
public record ImportMemberRequest(string FullName, string NationalId, string Phone, int? Age, string? Gender, string? Department, string? JobCategory);
public record UpdateOnboardingRequest(OnboardingStage Stage, int? ProgressPct, string? AbandonedAtStep);

public interface IContractService
{
    Task<ContractDto> CreateAsync(Guid clinicId, CreateContractRequest request, CancellationToken ct = default);
    Task UpdateSupervisorAsync(Guid contractId, UpdateSupervisorRequest request, CancellationToken ct = default);
    Task UpdateApiAsync(Guid contractId, string? apiEndpoint, string? apiKey, CancellationToken ct = default);
    Task<int> ImportMembersAsync(Guid contractId, IReadOnlyList<ImportMemberRequest> members, CancellationToken ct = default);
    Task UpdateMemberOnboardingAsync(Guid memberId, UpdateOnboardingRequest request, CancellationToken ct = default);
    Task OverrideMemberPackageAsync(Guid memberId, string packageCode, string packageTitle, CancellationToken ct = default);
    /// <summary>asSupervisor از claim سرور می‌آید نه از body کلاینت.</summary>
    Task<int> SendBulkSmsAsync(Guid contractId, string campaignTitle, IReadOnlyList<Guid>? memberIds, Guid actingUserId, bool asSupervisor, CancellationToken ct = default);
    Task SavePackageRulesAsync(Guid contractId, IReadOnlyList<(string Title, string Gender, int? MinAge, int? MaxAge, string JobCategory, string PackageCode, int Priority)> rules, CancellationToken ct = default);
    Task<ContractDto?> GetAsync(Guid contractId, CancellationToken ct = default);
    Task<IReadOnlyList<ContractMemberDto>> ListMembersAsync(Guid contractId, CancellationToken ct = default);
    Task<IReadOnlyList<ContractDto>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default);
    Task<ContractMemberDto?> GetMemberByInviteTokenAsync(string inviteToken, CancellationToken ct = default);
    Task<ContractMemberDto?> FindActiveMemberByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default);
    Task<ContractFunnelStatsDto> GetFunnelStatsAsync(Guid contractId, CancellationToken ct = default);
}

public record ContractFunnelStatsDto(
    Guid ContractId, int MemberCount,
    int NotSent, int SmsSent, int LinkOpened, int LoggedIn, int Abandoned, int Completed, int LinkedPatients);
