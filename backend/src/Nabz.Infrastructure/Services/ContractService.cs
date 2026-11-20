/*
 File: backend/src/Nabz.Infrastructure/Services/ContractService.cs
 Description: قرارداد، اعضا، بسته سلامت، SMS قالبی و onboarding
 Parent Dependencies: IContractRepository, ISmsSender, AuthOptions, KavenegarOptions
 */

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Options;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Services;

public sealed class ContractService(
    IContractRepository contracts,
    IUnitOfWork uow,
    ISmsSender sms,
    IOptions<AuthOptions> authOptions,
    IOptions<KavenegarOptions> kavenegarOptions,
    ILogger<ContractService> logger) : IContractService
{
    public async Task<ContractDto> CreateAsync(Guid clinicId, CreateContractRequest request, CancellationToken ct = default)
    {
        var code = string.IsNullOrWhiteSpace(request.Code)
            ? $"C-{DateTime.UtcNow:yyyyMMddHHmmss}"
            : request.Code!.Trim();
        var entity = new CorporateContract
        {
            ClinicId = clinicId,
            Code = code,
            Title = request.Title.Trim(),
            OrganizationName = request.OrganizationName.Trim(),
            Status = ContractStatus.Active
        };
        await contracts.AddAsync(entity, ct);
        await uow.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task UpdateSupervisorAsync(Guid contractId, UpdateSupervisorRequest request, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, ct: ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        if (contract.Supervisor is null)
        {
            contract.Supervisor = new ContractSupervisor { ContractId = contract.Id };
        }
        contract.Supervisor.FullName = request.FullName.Trim();
        contract.Supervisor.Phone = request.Phone.Trim();
        contract.Supervisor.Title = request.Title;
        contract.Supervisor.NationalId = request.NationalId;
        contract.Supervisor.CanSendReminders = request.CanSendReminders;
        contract.Supervisor.IsActive = true;
        contract.Supervisor.AssignedAt = DateTime.UtcNow;
        contract.Supervisor.UpdatedAt = DateTime.UtcNow;
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task<int> ImportMembersAsync(Guid contractId, IReadOnlyList<ImportMemberRequest> members, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var n = 0;
        foreach (var m in members)
        {
            var member = new ContractMember
            {
                ContractId = contractId,
                InviteToken = Guid.NewGuid().ToString("N")[..10].ToUpperInvariant(),
                FullName = m.FullName.Trim(),
                NationalId = m.NationalId.Trim(),
                Phone = m.Phone.Trim(),
                Age = m.Age,
                Gender = m.Gender,
                Department = m.Department,
                JobCategory = m.JobCategory,
                Source = "manual",
                OnboardingStage = OnboardingStage.NotSent
            };
            ApplyPackageRules(contract, member);
            await contracts.AddMemberAsync(member, ct);
            n++;
        }
        await uow.SaveChangesAsync(ct);
        return n;
    }

    public async Task UpdateMemberOnboardingAsync(Guid memberId, UpdateOnboardingRequest request, CancellationToken ct = default)
    {
        var member = await contracts.GetMemberByIdAsync(memberId, ct)
            ?? throw new InvalidOperationException("عضو یافت نشد.");
        member.OnboardingStage = request.Stage;
        if (request.ProgressPct.HasValue) member.ProfileProgressPct = request.ProgressPct.Value;
        member.AbandonedAtStep = request.AbandonedAtStep;
        member.LastActivityAt = DateTime.UtcNow;
        if (request.Stage == OnboardingStage.LinkOpened && member.LinkOpenedAt is null)
            member.LinkOpenedAt = DateTime.UtcNow;
        if (request.Stage == OnboardingStage.LoggedIn && member.LoggedInAt is null)
            member.LoggedInAt = DateTime.UtcNow;
        if (request.Stage == OnboardingStage.Completed)
            member.ProfileCompletedAt = DateTime.UtcNow;
        member.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task UpdateApiAsync(Guid contractId, string? apiEndpoint, string? apiKey, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, ct: ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        contract.ApiEndpoint = apiEndpoint;
        contract.ApiKey = apiKey;
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task OverrideMemberPackageAsync(Guid memberId, string packageCode, string packageTitle, CancellationToken ct = default)
    {
        var member = await contracts.GetMemberByIdAsync(memberId, ct)
            ?? throw new InvalidOperationException("عضو یافت نشد.");
        member.AssignedPackageCode = packageCode;
        member.AssignedPackageTitle = packageTitle;
        member.ManualPackageOverride = true;
        member.MatchedRuleTitle = "manual_override";
        member.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task<int> SendBulkSmsAsync(Guid contractId, string campaignTitle, IReadOnlyList<Guid>? memberIds, Guid actingUserId, bool asSupervisor, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        // ناظر فقط با CanSendReminders و فقط روی قرارداد خودش
        if (asSupervisor)
        {
            if (contract.Supervisor is null || !contract.Supervisor.CanSendReminders || !contract.Supervisor.IsActive)
                throw new UnauthorizedAccessException("ناظر مجاز به ارسال پیامک نیست.");
        }

        var targets = contract.Members.AsEnumerable();
        if (memberIds is { Count: > 0 })
            targets = targets.Where(m => memberIds.Contains(m.Id));
        var list = targets.ToList();

        var authCfg = authOptions.Value;
        var kav = kavenegarOptions.Value;
        var template = kav.InviteTemplate;
        var sent = 0;

        foreach (var m in list)
        {
            // بای‌پس FixedOtp: بدون کاوه‌نگار؛ وگرنه فقط قالب Invite
            if (!authCfg.HasFixedOtp)
            {
                if (string.IsNullOrWhiteSpace(template))
                    throw new InvalidOperationException("قالب دعوت کاوه‌نگار پیکربندی نشده است.");
                try
                {
                    await sms.SendTemplateAsync(m.Phone, template, new[] { m.InviteToken, m.FullName }, ct);
                    sent++;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "ارسال دعوت قالبی به {Phone} ناموفق", m.Phone);
                    continue;
                }
            }
            else
            {
                sent++;
            }

            m.SmsInviteCount++;
            m.LastSmsAt = DateTime.UtcNow;
            if (m.OnboardingStage == OnboardingStage.NotSent)
                m.OnboardingStage = OnboardingStage.SmsSent;
            m.UpdatedAt = DateTime.UtcNow;
        }

        await contracts.AddSmsLogAsync(new ContractSmsLog
        {
            ContractId = contractId,
            SenderName = kav.Sender ?? "kavenegar",
            CampaignTitle = campaignTitle,
            AudienceLabel = memberIds is { Count: > 0 } ? "selected" : "all",
            MessageTemplate = template ?? "(fixed-otp-bypass)",
            RecipientCount = sent
        }, ct);
        // actingUserId از claim سرور برای ممیزی آینده در دسترس است
        logger.LogInformation("Bulk SMS توسط {UserId} برای قرارداد {ContractId}: {Count}", actingUserId, contractId, sent);
        await uow.SaveChangesAsync(ct);
        return sent;
    }

    public async Task SavePackageRulesAsync(Guid contractId, IReadOnlyList<(string Title, string Gender, int? MinAge, int? MaxAge, string JobCategory, string PackageCode, int Priority)> rules, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        // حذف صریح تا Clear روی navigation باعث یتیم‌شدن ردیف‌ها نشود
        if (contract.PackageRules.Count > 0)
            contracts.RemovePackageRules(contract.PackageRules.ToList());
        contract.PackageRules.Clear();
        foreach (var r in rules.OrderBy(x => x.Priority))
        {
            contract.PackageRules.Add(new ContractPackageRule
            {
                ContractId = contractId,
                Title = r.Title,
                Gender = r.Gender,
                MinAge = r.MinAge,
                MaxAge = r.MaxAge,
                JobCategory = r.JobCategory,
                PackageCode = r.PackageCode,
                Priority = r.Priority
            });
        }
        foreach (var m in contract.Members.Where(x => !x.ManualPackageOverride))
            ApplyPackageRules(contract, m);
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task<ContractDto?> GetAsync(Guid contractId, CancellationToken ct = default)
    {
        var c = await contracts.GetByIdAsync(contractId, includeMembers: true, ct);
        return c is null ? null : Map(c);
    }

    public async Task<IReadOnlyList<ContractMemberDto>> ListMembersAsync(Guid contractId, CancellationToken ct = default)
    {
        var c = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        return c.Members.Select(m => new ContractMemberDto(
            m.Id, m.ContractId, m.FullName, m.NationalId, m.Phone,
            m.OnboardingStage.ToString(), m.AssignedPackageCode, m.AssignedPackageTitle,
            m.LinkedPatientId, m.InviteToken)).ToList();
    }

    public async Task<IReadOnlyList<ContractDto>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default)
    {
        var list = await contracts.ListByClinicAsync(clinicId, ct);
        return list.Select(Map).ToList();
    }

    public async Task<ContractMemberDto?> GetMemberByInviteTokenAsync(string inviteToken, CancellationToken ct = default)
    {
        var m = await contracts.GetMemberByInviteTokenAsync(inviteToken.Trim().ToUpperInvariant(), ct);
        if (m is null) return null;
        return MapMember(m);
    }

    public async Task<ContractMemberDto?> FindActiveMemberByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default)
    {
        var m = await contracts.FindActiveMemberByNationalIdAsync(clinicId, nationalId.Trim(), ct);
        return m is null ? null : MapMember(m);
    }

    private static ContractMemberDto MapMember(ContractMember m) => new(
        m.Id, m.ContractId, m.FullName, m.NationalId, m.Phone,
        m.OnboardingStage.ToString(), m.AssignedPackageCode, m.AssignedPackageTitle,
        m.LinkedPatientId, m.InviteToken);

    public async Task<ContractFunnelStatsDto> GetFunnelStatsAsync(Guid contractId, CancellationToken ct = default)
    {
        var c = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var members = c.Members;
        return new ContractFunnelStatsDto(
            contractId,
            members.Count,
            members.Count(m => m.OnboardingStage == OnboardingStage.NotSent),
            members.Count(m => m.OnboardingStage == OnboardingStage.SmsSent),
            members.Count(m => m.OnboardingStage == OnboardingStage.LinkOpened),
            members.Count(m => m.OnboardingStage == OnboardingStage.LoggedIn),
            members.Count(m => m.OnboardingStage == OnboardingStage.Abandoned),
            members.Count(m => m.OnboardingStage == OnboardingStage.Completed),
            members.Count(m => m.LinkedPatientId.HasValue));
    }

    private static void ApplyPackageRules(CorporateContract contract, ContractMember member)
    {
        var rule = contract.PackageRules
            .OrderBy(r => r.Priority)
            .FirstOrDefault(r =>
                (r.Gender == "همه" || r.Gender == member.Gender) &&
                (r.JobCategory == "همه" || r.JobCategory == member.JobCategory) &&
                (!r.MinAge.HasValue || (member.Age ?? 0) >= r.MinAge) &&
                (!r.MaxAge.HasValue || (member.Age ?? 0) <= r.MaxAge));
        if (rule is null)
        {
            member.AssignedPackageCode = contract.DefaultPackageCode;
            member.AssignedPackageTitle = contract.DefaultPackageCode;
            member.MatchedRuleTitle = null;
            return;
        }
        member.AssignedPackageCode = rule.PackageCode;
        member.AssignedPackageTitle = rule.Title;
        member.MatchedRuleTitle = rule.Title;
    }

    private static ContractDto Map(CorporateContract c) => new(
        c.Id, c.Code, c.Title, c.OrganizationName, c.Status.ToString(),
        c.Supervisor?.Phone, c.Supervisor?.FullName, c.Members?.Count ?? 0);
}
