/*
 File: backend/src/Nabz.Domain/Entities/CorporateContract.cs
 Description: قرارداد سازمانی، ناظر، اعضا و قوانین بسته (بدون نوبت/سقف روزانه)
 Parent Dependencies: ContractStatus, OnboardingStage
 */

using Nabz.Domain.Common;
using Nabz.Domain.Enums;

namespace Nabz.Domain.Entities;

public class CorporateContract : EntityBase
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string OrganizationName { get; set; } = string.Empty;
    public ContractStatus Status { get; set; } = ContractStatus.Draft;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? ApiEndpoint { get; set; }
    public string? ApiKey { get; set; }
    public DateTime? LastApiSyncAt { get; set; }
    public string? DefaultPackageCode { get; set; }

    public ContractSupervisor? Supervisor { get; set; }
    public ICollection<ContractMember> Members { get; set; } = new List<ContractMember>();
    public ICollection<ContractPackageRule> PackageRules { get; set; } = new List<ContractPackageRule>();
    public ICollection<ContractSmsLog> SmsLogs { get; set; } = new List<ContractSmsLog>();
}

public class ContractSupervisor : EntityBase
{
    public Guid ContractId { get; set; }
    public CorporateContract Contract { get; set; } = null!;
    public string FullName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? NationalId { get; set; }
    public bool IsActive { get; set; } = true;
    public bool CanSendReminders { get; set; } = true;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastSeenAt { get; set; }
}

public class ContractMember : EntityBase
{
    public Guid ContractId { get; set; }
    public CorporateContract Contract { get; set; } = null!;
    public string InviteToken { get; set; } = string.Empty;
    public string? PersonnelCode { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string NationalId { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public string? Department { get; set; }
    public string? JobCategory { get; set; }
    public string Source { get; set; } = "manual";
    /// <summary>کد بسته سلامت — نه مسیر ایستگاهی.</summary>
    public string? AssignedPackageCode { get; set; }
    public string? AssignedPackageTitle { get; set; }
    public string? MatchedRuleTitle { get; set; }
    public bool ManualPackageOverride { get; set; }
    public OnboardingStage OnboardingStage { get; set; } = OnboardingStage.NotSent;
    public int ProfileProgressPct { get; set; }
    public string? AbandonedAtStep { get; set; }
    public int SmsInviteCount { get; set; }
    public DateTime? LastSmsAt { get; set; }
    public DateTime? LinkOpenedAt { get; set; }
    public DateTime? LoggedInAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public DateTime? ProfileCompletedAt { get; set; }
    public Guid? LinkedPatientId { get; set; }
}

public class ContractPackageRule : EntityBase
{
    public Guid ContractId { get; set; }
    public CorporateContract Contract { get; set; } = null!;
    public Guid? LibraryRuleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Gender { get; set; } = "همه";
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }
    public string JobCategory { get; set; } = "همه";
    public string PackageCode { get; set; } = string.Empty;
    public int Priority { get; set; }
}

public class PackageLibraryRule : EntityBase
{
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Gender { get; set; } = "همه";
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }
    public string JobCategory { get; set; } = "همه";
    public string PackageCode { get; set; } = string.Empty;
}

public class ContractSmsLog : EntityBase
{
    public Guid ContractId { get; set; }
    public CorporateContract Contract { get; set; } = null!;
    public string SenderName { get; set; } = string.Empty;
    public string CampaignTitle { get; set; } = string.Empty;
    public string AudienceLabel { get; set; } = string.Empty;
    public string MessageTemplate { get; set; } = string.Empty;
    public int RecipientCount { get; set; }
}
