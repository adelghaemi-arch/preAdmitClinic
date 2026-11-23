/*
 File: backend/src/Nabz.Domain/Entities/CorporateContract.cs
 Description: قرارداد سازمانی، ناظر، اعضا و مسیرهای سلامتی (بدون نوبت/سقف روزانه)
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
    /// <summary>کلید لوگوی سازمان/بانک طرف‌قرارداد برای PDF (contract-brand/...)</summary>
    public string? PartnerLogoStorageKey { get; set; }
    public ContractStatus Status { get; set; } = ContractStatus.Draft;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? ApiEndpoint { get; set; }
    public string? ApiKey { get; set; }
    public DateTime? LastApiSyncAt { get; set; }
    public string? DefaultPathwayCode { get; set; }

    public ContractSupervisor? Supervisor { get; set; }
    public ICollection<ContractMember> Members { get; set; } = new List<ContractMember>();
    public ICollection<ContractPathwayRule> PathwayRules { get; set; } = new List<ContractPathwayRule>();
    public ICollection<ContractSmsLog> SmsLogs { get; set; } = new List<ContractSmsLog>();
}

public class ContractSupervisor : EntityBase
{
    public Guid ContractId { get; set; }
    public CorporateContract Contract { get; set; } = null!;
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;
    public string? Title { get; set; }
    public bool IsActive { get; set; } = true;
    public bool CanSendReminders { get; set; } = true;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastSeenAt { get; set; }
}

public class ContractMember : EntityBase
{
    public Guid ContractId { get; set; }
    public CorporateContract Contract { get; set; } = null!;
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;
    public string InviteToken { get; set; } = string.Empty;
    public string? PersonnelCode { get; set; }
    public string? MaritalStatus { get; set; }
    public string? Department { get; set; }
    public string? JobCategory { get; set; }
    public string Source { get; set; } = "manual";
    // کد قالب ایستگاهی مسیر سلامتی (مثلاً CORP_MEN_LT40)
    public string? AssignedPathwayCode { get; set; }
    public string? AssignedPathwayTitle { get; set; }
    public string? MatchedPathwayTitle { get; set; }
    public bool ManualPathwayOverride { get; set; }
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
    /// <summary>موبایل معرفی در رستر قرارداد — با تغییر بعدی Person.Mobile قاطی نمی‌شود.</summary>
    public string? IntroducedMobile { get; set; }
    /// <summary>تاریخ مراجعه برنامه‌ریزی‌شده از اکسل/رستر — بنر پیش‌پذیرش Owner.</summary>
    public DateOnly? ScheduledVisitDate { get; set; }
}

public class ContractPathwayRule : EntityBase
{
    public Guid ContractId { get; set; }
    public CorporateContract Contract { get; set; } = null!;
    /// <summary>ارجاع به PathwayDefinition کتابخانه (در صورت اتصال از کاتالوگ).</summary>
    public Guid? LibraryPathwayId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Gender { get; set; } = "همه";
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }
    public string JobCategory { get; set; } = "همه";
    public string PathwayCode { get; set; } = string.Empty;
    public int Priority { get; set; }
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
