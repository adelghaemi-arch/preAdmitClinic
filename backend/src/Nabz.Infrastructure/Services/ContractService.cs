/*
 File: backend/src/Nabz.Infrastructure/Services/ContractService.cs
 Description: قرارداد، اعضا (CRUD)، بسته سلامت با گیت پذیرش، SMS قالبی و onboarding
 Parent Dependencies: IContractRepository, IPatientRepository, IUserRepository, IPersonRepository, ISmsSender, AuthOptions
 */

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nabz.Application.Abstractions;
using Nabz.Application.Common;
using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Options;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Services;

public sealed class ContractService(
    IContractRepository contracts,
    IPackageLibraryRuleRepository libraryRules,
    IPatientRepository patients,
    IUserRepository users,
    IPersonRepository persons,
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
        // بدون قانون، همه اعضا همین مسیر اصلی را می‌گیرند
        var defaultPkg = string.IsNullOrWhiteSpace(request.DefaultPackageCode)
            ? "FULL_CHECKUP"
            : request.DefaultPackageCode!.Trim();
        var entity = new CorporateContract
        {
            ClinicId = clinicId,
            Code = code,
            Title = request.Title.Trim(),
            OrganizationName = request.OrganizationName.Trim(),
            DefaultPackageCode = defaultPkg,
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
        var supPhone = IranMobile.Normalize(request.Phone);
        if (!IranMobile.IsValid(supPhone))
            throw new InvalidOperationException("شماره موبایل ناظر نامعتبر است.");
        var supNid = string.IsNullOrWhiteSpace(request.NationalId)
            ? null
            : IranNationalId.Normalize(request.NationalId);
        var supPerson = await PersonEnsureHelper.EnsurePersonAsync(persons, new PersonEnsureHelper.IdentityInput(
            supPhone, supNid, request.FirstName.Trim(), request.LastName.Trim(), null, null), ct);

        if (contract.Supervisor is null)
        {
            contract.Supervisor = new ContractSupervisor { ContractId = contract.Id };
        }
        contract.Supervisor.PersonId = supPerson.Id;
        contract.Supervisor.Person = supPerson;
        contract.Supervisor.Title = request.Title;
        contract.Supervisor.CanSendReminders = request.CanSendReminders;
        contract.Supervisor.IsActive = true;
        contract.Supervisor.AssignedAt = DateTime.UtcNow;
        contract.Supervisor.UpdatedAt = DateTime.UtcNow;
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task<ImportMembersResult> ImportMembersAsync(Guid contractId, IReadOnlyList<ImportMemberRequest> members, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var existingNids = new HashSet<string>(
            contract.Members
                .Where(x => !string.IsNullOrWhiteSpace(x.Person.NationalId))
                .Select(x => IranNationalId.Normalize(x.Person.NationalId!)),
            StringComparer.Ordinal);
        var results = new List<ImportMemberRowResult>();
        var imported = 0;
        var duplicates = 0;
        var rejected = 0;

        foreach (var m in members)
        {
            var first = (m.FirstName ?? "").Trim();
            var last = (m.LastName ?? "").Trim();
            if (IranNationalId.LooksLikeScientificNotation(m.NationalId) ||
                IranNationalId.LooksLikeScientificNotation(m.Phone))
            {
                rejected++;
                results.Add(new ImportMemberRowResult(first, last, m.NationalId ?? "", "rejected", "کدملی/موبایل شبیه نماد علمی اکسل است."));
                continue;
            }
            var nid = IranNationalId.Normalize(m.NationalId);
            var phone = IranMobile.Normalize(m.Phone);
            var gender = (m.Gender ?? "").Trim();

            if (first.Length < 2)
            {
                rejected++;
                results.Add(new ImportMemberRowResult(first, last, nid, "rejected", "نام الزامی است."));
                continue;
            }
            if (last.Length < 2)
            {
                rejected++;
                results.Add(new ImportMemberRowResult(first, last, nid, "rejected", "نام‌خانوادگی الزامی است."));
                continue;
            }
            if (!IranNationalId.IsValid(nid))
            {
                rejected++;
                results.Add(new ImportMemberRowResult(first, last, nid, "rejected", "کدملی نامعتبر است."));
                continue;
            }
            if (!IranMobile.IsValid(phone))
            {
                rejected++;
                results.Add(new ImportMemberRowResult(first, last, nid, "rejected", "شماره موبایل نامعتبر است."));
                continue;
            }
            if (gender is not ("مرد" or "زن"))
            {
                rejected++;
                results.Add(new ImportMemberRowResult(first, last, nid, "rejected", "جنسیت باید مرد یا زن باشد."));
                continue;
            }
            if (existingNids.Contains(nid))
            {
                duplicates++;
                results.Add(new ImportMemberRowResult(first, last, nid, "duplicate", "کدملی قبلاً در قرارداد ثبت شده است."));
                continue;
            }

            // تاهل اختیاری: کاتالوگ ۴تایی؛ مطلقه/بیوه → ازدواج‌کرده؛ ناشناخته → null بدون رد ردیف
            var marital = MaritalStatusNormalizer.Normalize(m.MaritalStatus);

            // سلامتجوی تکراری: فقط عضو قرارداد + لینک؛ Patient جدید ساخته نمی‌شود
            var existingPatient = await patients.GetByNationalIdAsync(nid, contract.ClinicId, ct);

            var person = await PersonEnsureHelper.EnsurePersonAsync(persons, new PersonEnsureHelper.IdentityInput(
                phone, nid, first, last, gender, m.BirthDate), ct);

            var member = new ContractMember
            {
                ContractId = contractId,
                PersonId = person.Id,
                Person = person,
                InviteToken = Guid.NewGuid().ToString("N")[..10].ToUpperInvariant(),
                MaritalStatus = marital,
                Department = string.IsNullOrWhiteSpace(m.Department) ? null : m.Department.Trim(),
                JobCategory = string.IsNullOrWhiteSpace(m.JobCategory) ? null : m.JobCategory.Trim(),
                PersonnelCode = string.IsNullOrWhiteSpace(m.PersonnelCode) ? null : m.PersonnelCode.Trim(),
                Source = "manual",
                OnboardingStage = OnboardingStage.NotSent,
                LinkedPatientId = existingPatient?.Id,
                // شماره معرفی رستر — برای بنر mismatch بعد از تغییر Person.Mobile
                IntroducedMobile = phone
            };
            ApplyPackageRules(contract, member);
            if (existingPatient is not null)
            {
                existingPatient.AssignedPackageCode = member.AssignedPackageCode;
                existingPatient.AssignedPackageTitle = member.AssignedPackageTitle;
                existingPatient.LinkedContractMemberId = member.Id;
                existingPatient.UpdatedAt = DateTime.UtcNow;
            }
            await contracts.AddMemberAsync(member, ct);
            existingNids.Add(nid);
            imported++;
            results.Add(existingPatient is not null
                ? new ImportMemberRowResult(first, last, nid, "linked", "پرونده موجود — فقط به قرارداد وصل شد.")
                : new ImportMemberRowResult(first, last, nid, "imported", null));
        }

        await uow.SaveChangesAsync(ct);
        return new ImportMembersResult(imported, duplicates, rejected, results);
    }

    public async Task<ContractMemberDto> UpdateMemberAsync(Guid memberId, ImportMemberRequest request, CancellationToken ct = default)
    {
        var member = await contracts.GetMemberByIdAsync(memberId, ct)
            ?? throw new InvalidOperationException("عضو یافت نشد.");
        var contract = await contracts.GetByIdAsync(member.ContractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");

        var first = (request.FirstName ?? "").Trim();
        var last = (request.LastName ?? "").Trim();
        var nid = IranNationalId.Normalize(request.NationalId);
        var phone = IranMobile.Normalize(request.Phone);
        var gender = (request.Gender ?? "").Trim();

        if (first.Length < 2) throw new InvalidOperationException("نام الزامی است.");
        if (last.Length < 2) throw new InvalidOperationException("نام‌خانوادگی الزامی است.");
        if (!IranNationalId.IsValid(nid)) throw new InvalidOperationException("کدملی نامعتبر است.");
        if (!IranMobile.IsValid(phone)) throw new InvalidOperationException("شماره موبایل نامعتبر است.");
        if (gender is not ("مرد" or "زن")) throw new InvalidOperationException("جنسیت باید مرد یا زن باشد.");

        // یکتایی کدملی داخل همان قرارداد (به‌جز خود ردیف)
        if (contract.Members.Any(x => x.Id != memberId && x.Person.NationalId == nid))
            throw new InvalidOperationException("کدملی قبلاً در این قرارداد ثبت شده است.");

        // عضو لینک‌شده به پرونده نباید PersonId عوض کند؛ وگرنه SyncLinkedPatient می‌شکند
        if (member.LinkedPatientId is not null)
        {
            var other = await persons.GetByNationalIdAsync(nid, ct);
            if (other is not null && other.Id != member.PersonId)
                throw new InvalidOperationException("کدملی متعلق به شخص دیگری است؛ برای عضو پذیرفته‌شده قابل اعمال نیست.");
            PersonEnsureHelper.ApplyRosterToPerson(member.Person, new PersonEnsureHelper.IdentityInput(
                phone, nid, first, last, gender, request.BirthDate));
        }
        else
        {
            var person = await PersonEnsureHelper.EnsurePersonAsync(persons, new PersonEnsureHelper.IdentityInput(
                phone, nid, first, last, gender, request.BirthDate), ct);
            member.PersonId = person.Id;
            member.Person = person;
        }
        member.MaritalStatus = MaritalStatusNormalizer.Normalize(request.MaritalStatus);
        member.Department = string.IsNullOrWhiteSpace(request.Department) ? null : request.Department.Trim();
        member.JobCategory = string.IsNullOrWhiteSpace(request.JobCategory) ? null : request.JobCategory.Trim();
        member.PersonnelCode = string.IsNullOrWhiteSpace(request.PersonnelCode) ? null : request.PersonnelCode.Trim();
        // ویرایش ادمین شماره معرفی را هم هم‌تراز می‌کند
        member.IntroducedMobile = phone;
        member.UpdatedAt = DateTime.UtcNow;

        // قبل از پذیرش: بسته را با قوانین جدید دموگرافیک بازمحاسبه کن؛ بعد از پذیرش بسته دستی می‌ماند
        if (!member.ManualPackageOverride && member.LinkedPatientId is null)
            ApplyPackageRules(contract, member);

        await SyncLinkedPatientFromMemberAsync(member, ct);
        await uow.SaveChangesAsync(ct);
        return MapMember(member);
    }

    public async Task DeleteMemberAsync(Guid memberId, CancellationToken ct = default)
    {
        var member = await contracts.GetMemberByIdAsync(memberId, ct)
            ?? throw new InvalidOperationException("عضو یافت نشد.");

        // پرونده بیمار می‌ماند؛ فقط لینک عضو قرارداد قطع می‌شود
        if (member.LinkedPatientId is Guid patientId)
        {
            var patient = await patients.GetByIdAsync(patientId, ct);
            if (patient is not null)
            {
                if (patient.LinkedContractMemberId == member.Id)
                    patient.LinkedContractMemberId = null;
                patient.UpdatedAt = DateTime.UtcNow;
            }
        }

        contracts.RemoveMember(member);
        await uow.SaveChangesAsync(ct);
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
        var code = string.IsNullOrWhiteSpace(packageCode) ? HealthPackageTitles.FullCheckupCode : packageCode.Trim();
        member.AssignedPackageCode = code;
        member.AssignedPackageTitle = HealthPackageTitles.Resolve(code, packageTitle);
        member.ManualPackageOverride = true;
        member.MatchedRuleTitle = "manual_override";
        member.UpdatedAt = DateTime.UtcNow;

        // پذیرش‌شده: بسته پرونده هم با override دستی هم‌تراز شود
        if (member.LinkedPatientId is Guid patientId)
        {
            var patient = await patients.GetByIdAsync(patientId, ct);
            if (patient is not null)
            {
                patient.AssignedPackageCode = member.AssignedPackageCode;
                patient.AssignedPackageTitle = member.AssignedPackageTitle;
                patient.UpdatedAt = DateTime.UtcNow;
            }
        }

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
                    var mp = m.Person;
                    await sms.SendTemplateAsync(mp.Mobile, template, new[] { m.InviteToken, PersonName.Display(mp.FirstName, mp.LastName) }, ct);
                    sent++;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "ارسال دعوت قالبی به {Phone} ناموفق", m.Person.Mobile);
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

    public async Task<PackageRulesReapplyResult> SavePackageRulesAsync(Guid contractId, IReadOnlyList<PackageRuleInput> rules, CancellationToken ct = default)
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
                LibraryRuleId = r.LibraryRuleId,
                Title = r.Title,
                Gender = r.Gender,
                MinAge = r.MinAge,
                MaxAge = r.MaxAge,
                JobCategory = r.JobCategory,
                PackageCode = r.PackageCode,
                Priority = r.Priority
            });
        }
        var result = ReapplyEligibleMembers(contract);
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return result;
    }

    public async Task<PackageRulesReapplyResult> AttachLibraryRulesAsync(Guid contractId, IReadOnlyList<Guid> libraryRuleIds, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var existingLibIds = contract.PackageRules
            .Where(r => r.LibraryRuleId.HasValue)
            .Select(r => r.LibraryRuleId!.Value)
            .ToHashSet();
        var nextPriority = contract.PackageRules.Count == 0
            ? 1
            : contract.PackageRules.Max(r => r.Priority) + 1;

        foreach (var libId in libraryRuleIds.Distinct())
        {
            if (existingLibIds.Contains(libId)) continue;
            var lib = await libraryRules.GetByIdAsync(libId, ct)
                ?? throw new InvalidOperationException("قانون کتابخانه یافت نشد.");
            var rule = new ContractPackageRule
            {
                ContractId = contractId,
                LibraryRuleId = lib.Id,
                Title = lib.Title,
                Gender = lib.Gender,
                MinAge = lib.MinAge,
                MaxAge = lib.MaxAge,
                JobCategory = lib.JobCategory,
                PackageCode = lib.PackageCode,
                Priority = nextPriority++
            };
            await contracts.AddPackageRuleAsync(rule, ct);
            contract.PackageRules.Add(rule);
        }

        var result = ReapplyEligibleMembers(contract);
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return result;
    }

    public async Task<PackageRulesReapplyResult> DetachPackageRuleAsync(Guid contractId, Guid ruleId, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var rule = contract.PackageRules.FirstOrDefault(r => r.Id == ruleId)
            ?? await contracts.GetPackageRuleByIdAsync(ruleId, ct)
            ?? throw new InvalidOperationException("قانون قرارداد یافت نشد.");
        if (rule.ContractId != contractId)
            throw new InvalidOperationException("این قانون متعلق به این قرارداد نیست.");

        contracts.RemovePackageRules([rule]);
        contract.PackageRules.Remove(rule);

        // بدون قانون → مسیر پیش‌فرض برای افراد قبل از پذیرش
        var result = ReapplyEligibleMembers(contract);
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return result;
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
        return c.Members.Select(MapMember).ToList();
    }

    public async Task<PagedResultDto<ContractMemberDto>> ListMembersPagedAsync(
        Guid contractId, int page, int pageSize, string? q, CancellationToken ct = default)
    {
        _ = await contracts.GetByIdAsync(contractId, includeMembers: false, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var p = Paging.ClampPage(page);
        var size = Paging.ClampPageSize(pageSize);
        var (items, total) = await contracts.ListMembersPagedAsync(contractId, (p - 1) * size, size, q, ct);
        return new PagedResultDto<ContractMemberDto>(items.Select(MapMember).ToList(), p, size, total);
    }

    public async Task<IReadOnlyList<ContractDto>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default)
    {
        var list = await contracts.ListByClinicAsync(clinicId, ct);
        var counts = await contracts.CountMembersByContractIdsAsync(list.Select(c => c.Id).ToList(), ct);
        return list.Select(c => Map(c, counts.GetValueOrDefault(c.Id))).ToList();
    }

    public async Task<ContractMemberDto?> GetMemberByInviteTokenAsync(string inviteToken, CancellationToken ct = default)
    {
        var m = await contracts.GetMemberByInviteTokenAsync(inviteToken.Trim().ToUpperInvariant(), ct);
        if (m is null) return null;
        return MapMember(m);
    }

    public async Task<ContractMemberDto?> FindActiveMemberByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default)
    {
        var nid = IranNationalId.Normalize(nationalId);
        var m = await contracts.FindActiveMemberByNationalIdAsync(clinicId, nid, ct);
        return m is null ? null : MapMember(m);
    }

    private static ContractMemberDto MapMember(ContractMember m)
    {
        var p = m.Person;
        return new(
        m.Id, m.ContractId,
        p.FirstName, p.LastName, PersonName.Display(p.FirstName, p.LastName),
        p.NationalId ?? "", p.Mobile,
        p.BirthDate, AgeCalculator.FromBirthDate(p.BirthDate), p.Gender,
        MaritalStatusNormalizer.Normalize(m.MaritalStatus) ?? m.MaritalStatus,
        m.Department, m.JobCategory, m.PersonnelCode,
        m.OnboardingStage.ToString(), m.AssignedPackageCode,
        HealthPackageTitles.Resolve(m.AssignedPackageCode, m.AssignedPackageTitle),
        m.MatchedRuleTitle,
        m.LinkedPatientId, m.InviteToken,
        m.SmsInviteCount, m.LastSmsAt);
    }

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

    /// <summary>
    /// قبل از پذیرش (بدون LinkedPatient) بازمحاسبه؛ پذیرش‌شده‌ها بسته فعلی را نگه می‌دارند تا دستی در نوبت‌دهی عوض شوند.
    /// </summary>
    private static PackageRulesReapplyResult ReapplyEligibleMembers(CorporateContract contract)
    {
        var recalculated = 0;
        var needsManual = 0;
        foreach (var m in contract.Members)
        {
            if (m.ManualPackageOverride) continue;
            if (m.LinkedPatientId.HasValue)
            {
                needsManual++;
                continue;
            }
            ApplyPackageRules(contract, m);
            recalculated++;
        }
        return new PackageRulesReapplyResult(recalculated, needsManual);
    }

    private async Task SyncLinkedPatientFromMemberAsync(ContractMember member, CancellationToken ct)
    {
        if (member.LinkedPatientId is not Guid patientId) return;
        var patient = await patients.GetByIdAsync(patientId, ct);
        if (patient is null) return;

        var roster = member.Person;
        // یک منبع حقیقت: اگر PersonId یکی است فقط فیلدهای Person را همگام کن
        if (patient.PersonId != member.PersonId)
            throw new InvalidOperationException("هویت عضو و پروندهٔ لینک‌شده ناسازگار است.");
        PersonEnsureHelper.ApplyRosterToPerson(patient.Person, PersonEnsureHelper.FromPerson(roster));

        patient.AssignedPackageCode = member.AssignedPackageCode;
        patient.AssignedPackageTitle = member.AssignedPackageTitle;
        patient.UpdatedAt = DateTime.UtcNow;

        if (patient.OwnerUserId is Guid ownerId)
        {
            var owner = await users.GetByIdAsync(ownerId, ct);
            if (owner is not null && owner.PersonId == patient.PersonId)
                owner.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static void ApplyPackageRules(CorporateContract contract, ContractMember member)
    {
        var age = AgeCalculator.FromBirthDate(member.Person.BirthDate) ?? 0;
        var memberGender = member.Person.Gender ?? "";
        var rule = contract.PackageRules
            .OrderBy(r => r.Priority)
            .FirstOrDefault(r =>
                (r.Gender == "همه" || r.Gender == memberGender) &&
                (r.JobCategory == "همه" || r.JobCategory == member.JobCategory) &&
                (!r.MinAge.HasValue || age >= r.MinAge) &&
                (!r.MaxAge.HasValue || age <= r.MaxAge));
        if (rule is null)
        {
            // بدون قانون / بدون match → مسیر اصلی قرارداد با عنوان فارسی
            var code = string.IsNullOrWhiteSpace(contract.DefaultPackageCode)
                ? HealthPackageTitles.FullCheckupCode
                : contract.DefaultPackageCode;
            member.AssignedPackageCode = code;
            member.AssignedPackageTitle = HealthPackageTitles.Resolve(code);
            member.MatchedRuleTitle = null;
            return;
        }
        member.AssignedPackageCode = rule.PackageCode;
        member.AssignedPackageTitle = HealthPackageTitles.Resolve(rule.PackageCode, rule.Title);
        member.MatchedRuleTitle = rule.Title;
    }

    private static ContractDto Map(CorporateContract c, int? memberCount = null) => new(
        c.Id, c.Code, c.Title, c.OrganizationName, c.Status.ToString(),
        c.Supervisor?.Person.Mobile,
        c.Supervisor is null ? null : PersonName.Display(c.Supervisor.Person.FirstName, c.Supervisor.Person.LastName),
        memberCount ?? c.Members?.Count ?? 0,
        c.DefaultPackageCode,
        (c.PackageRules ?? Array.Empty<ContractPackageRule>())
            .OrderBy(r => r.Priority)
            .Select(r => new ContractPackageRuleDto(
                r.Id, r.LibraryRuleId,
                r.Title, r.Gender, r.MinAge, r.MaxAge, r.JobCategory, r.PackageCode, r.Priority))
            .ToList());
}
