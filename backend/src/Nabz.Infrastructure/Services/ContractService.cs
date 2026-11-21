/*
 File: backend/src/Nabz.Infrastructure/Services/ContractService.cs
 Description: قرارداد (ایجاد/ویرایش پایه)، اعضا، قیف onboarding + formStatus پیشرفت پرسشنامه
 Parent Dependencies: IContractRepository, IPatientRepository, IUserRepository, IPersonRepository, ISmsSender, AuthOptions
 */

using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nabz.Application.Abstractions;
using Nabz.Application.Common;
using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Options;
using Nabz.Application.Sms;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Services;

public sealed class ContractService(
    IContractRepository contracts,
    IPathwayLibraryRuleRepository libraryRules,
    IPatientRepository patients,
    IUserRepository users,
    IPersonRepository persons,
    IClinicRepository clinics,
    ISmsCampaignTemplateRepository smsTemplates,
    IUnitOfWork uow,
    ISmsSender sms,
    IOptions<AuthOptions> authOptions,
    IOptions<KavenegarOptions> kavenegarOptions,
    IOptions<FrontendUrlsOptions> frontendUrls,
    ILogger<ContractService> logger) : IContractService
{
    public async Task<ContractDto> CreateAsync(Guid clinicId, CreateContractRequest request, CancellationToken ct = default)
    {
        var code = string.IsNullOrWhiteSpace(request.Code)
            ? $"C-{DateTime.UtcNow:yyyyMMddHHmmss}"
            : request.Code!.Trim();
        // بدون قانون، همه اعضا همین مسیر اصلی را می‌گیرند
        var defaultPkg = string.IsNullOrWhiteSpace(request.DefaultPathwayCode)
            ? "FULL_CHECKUP"
            : request.DefaultPathwayCode!.Trim();
        var entity = new CorporateContract
        {
            ClinicId = clinicId,
            Code = code,
            Title = request.Title.Trim(),
            OrganizationName = request.OrganizationName.Trim(),
            DefaultPathwayCode = defaultPkg,
            Status = ContractStatus.Active
        };
        await contracts.AddAsync(entity, ct);
        await uow.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<ContractDto> UpdateAsync(Guid contractId, UpdateContractRequest request, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, ct: ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var title = (request.Title ?? "").Trim();
        var org = (request.OrganizationName ?? "").Trim();
        // همان حداقل طول ایجاد؛ Code تغییرپذیر نیست
        if (title.Length < 3)
            throw new InvalidOperationException("عنوان قرارداد باید حداقل ۳ نویسه باشد.");
        if (org.Length < 2)
            throw new InvalidOperationException("نام سازمان را وارد کنید.");
        contract.Title = title;
        contract.OrganizationName = org;
        if (!string.IsNullOrWhiteSpace(request.DefaultPathwayCode))
            contract.DefaultPathwayCode = request.DefaultPathwayCode.Trim();
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return Map(contract);
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
            var gender = NormalizeImportGender(m.Gender);

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

            var father = string.IsNullOrWhiteSpace(m.FatherName) ? null : m.FatherName.Trim();
            var person = await PersonEnsureHelper.EnsurePersonAsync(persons, new PersonEnsureHelper.IdentityInput(
                phone, nid, first, last, gender, m.BirthDate, father), ct);

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
                IntroducedMobile = phone,
                ScheduledVisitDate = m.ScheduledVisitDate
            };
            // گروه فقط اگر کد مسیر معتبر باشد → override؛ برچسب آزاد نادیده
            if (!TryApplyPathwayCodeFromGroup(contract, member, m.PathwayCodeOrGroup))
                ApplyPathwayRules(contract, member);
            if (existingPatient is not null)
            {
                existingPatient.AssignedPathwayCode = member.AssignedPathwayCode;
                existingPatient.AssignedPathwayTitle = member.AssignedPathwayTitle;
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
        var gender = NormalizeImportGender(request.Gender);
        var father = string.IsNullOrWhiteSpace(request.FatherName) ? null : request.FatherName.Trim();

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
                phone, nid, first, last, gender, request.BirthDate, father));
        }
        else
        {
            var person = await PersonEnsureHelper.EnsurePersonAsync(persons, new PersonEnsureHelper.IdentityInput(
                phone, nid, first, last, gender, request.BirthDate, father), ct);
            member.PersonId = person.Id;
            member.Person = person;
        }
        member.MaritalStatus = MaritalStatusNormalizer.Normalize(request.MaritalStatus);
        member.Department = string.IsNullOrWhiteSpace(request.Department) ? null : request.Department.Trim();
        member.JobCategory = string.IsNullOrWhiteSpace(request.JobCategory) ? null : request.JobCategory.Trim();
        member.PersonnelCode = string.IsNullOrWhiteSpace(request.PersonnelCode) ? null : request.PersonnelCode.Trim();
        // ویرایش ادمین شماره معرفی را هم هم‌تراز می‌کند
        member.IntroducedMobile = phone;
        member.ScheduledVisitDate = request.ScheduledVisitDate;
        member.UpdatedAt = DateTime.UtcNow;

        // گروه=کد مسیر → override؛ وگرنه قبل از پذیرش بازمحاسبه قواعد
        if (TryApplyPathwayCodeFromGroup(contract, member, request.PathwayCodeOrGroup))
        {
            /* مسیر دستی از کد ست شد */
        }
        else if (!member.ManualPathwayOverride && member.LinkedPatientId is null)
            ApplyPathwayRules(contract, member);

        await SyncLinkedPatientFromMemberAsync(member, ct);
        await uow.SaveChangesAsync(ct);
        return MapMember(member);
    }

    public async Task DeleteMemberAsync(Guid memberId, CancellationToken ct = default)
    {
        var member = await contracts.GetMemberByIdAsync(memberId, ct)
            ?? throw new InvalidOperationException("عضو یافت نشد.");

        // حذف فقط قبل از ورود به پیش‌پذیرش (لینک/لاگین/فرم/پذیرش کلینیک)
        var formStatus = ResolveFormStatus(member);
        if (member.LinkedPatientId is not null
            || member.OnboardingStage is not (OnboardingStage.NotSent or OnboardingStage.SmsSent)
            || formStatus is "Draft" or "Submitted")
        {
            throw new InvalidOperationException("حذف فقط قبل از ورود به پیش‌پذیرش مجاز است.");
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

    public async Task OverrideMemberPathwayAsync(Guid memberId, string pathwayCode, string pathwayTitle, CancellationToken ct = default)
    {
        var member = await contracts.GetMemberByIdAsync(memberId, ct)
            ?? throw new InvalidOperationException("عضو یافت نشد.");
        var code = string.IsNullOrWhiteSpace(pathwayCode) ? HealthPathwayTitles.FullCheckupCode : pathwayCode.Trim();
        var title = string.IsNullOrWhiteSpace(pathwayTitle) ? null : pathwayTitle.Trim();
        member.AssignedPathwayCode = code;
        member.AssignedPathwayTitle = HealthPathwayTitles.Resolve(code, title);
        member.ManualPathwayOverride = true;
        // عنوان سطل مسیر برای UI — نه ثابت manual_override تا عضو همان لحظه در کارت درست دیده شود
        member.MatchedPathwayTitle = title ?? HealthPathwayTitles.Resolve(code);
        member.UpdatedAt = DateTime.UtcNow;

        // پذیرش‌شده: مسیر پرونده هم با override دستی هم‌تراز شود
        if (member.LinkedPatientId is Guid patientId)
        {
            var patient = await patients.GetByIdAsync(patientId, ct);
            if (patient is not null)
            {
                patient.AssignedPathwayCode = member.AssignedPathwayCode;
                patient.AssignedPathwayTitle = member.AssignedPathwayTitle;
                patient.UpdatedAt = DateTime.UtcNow;
            }
        }

        await uow.SaveChangesAsync(ct);
    }

    public async Task<int> SendBulkSmsAsync(Guid contractId, Guid templateId, string? campaignTitle, IReadOnlyList<Guid>? memberIds, Guid actingUserId, bool asSupervisor, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        // ناظر فقط با CanSendReminders و فقط روی قرارداد خودش
        if (asSupervisor)
        {
            if (contract.Supervisor is null || !contract.Supervisor.CanSendReminders || !contract.Supervisor.IsActive)
                throw new UnauthorizedAccessException("ناظر مجاز به ارسال پیامک نیست.");
        }

        var campaign = await smsTemplates.GetByIdAsync(templateId, ct)
            ?? throw new InvalidOperationException("قالب پیامک یافت نشد.");
        if (!campaign.IsActive)
            throw new InvalidOperationException("قالب پیامک غیرفعال است.");
        if (campaign.RequiresEmrUrl)
            throw new InvalidOperationException("این قالب به لینک پرونده الکترونیک نیاز دارد که هنوز فعال نشده است.");

        var targets = contract.Members.AsEnumerable();
        if (memberIds is { Count: > 0 })
            targets = targets.Where(m => memberIds.Contains(m.Id));
        var list = targets.ToList();

        var authCfg = authOptions.Value;
        var kav = kavenegarOptions.Value;
        var clinic = await clinics.GetCurrentAsync(ct);
        var smsProvider = clinic?.SmsProvider ?? ClinicSmsProvider.None;
        if (smsProvider == ClinicSmsProvider.None && kav.IsConfigured)
            smsProvider = ClinicSmsProvider.Kavenegar;

        var providerName = string.IsNullOrWhiteSpace(campaign.ProviderTemplateName)
            ? kav.InviteTemplate
            : campaign.ProviderTemplateName.Trim();
        var tokenKeys = ParseTemplateTokenKeys(campaign.TokenKeysJson);
        var logTitle = string.IsNullOrWhiteSpace(campaignTitle) ? campaign.Title : campaignTitle.Trim();
        var sent = 0;

        foreach (var m in list)
        {
            // بای‌پس FixedOtp: بدون درگاه واقعی
            if (!authCfg.HasFixedOtp)
            {
                try
                {
                    if (smsProvider == ClinicSmsProvider.Touba)
                    {
                        var body = FillSmsBodyPreview(campaign.BodyPreview, m, tokenKeys);
                        if (string.IsNullOrWhiteSpace(body))
                            throw new InvalidOperationException("پیش‌نمایش متن قالب برای ارسال طوبی خالی است.");
                        await sms.SendPlainAsync(m.Person.Mobile, body, ct);
                    }
                    else if (smsProvider == ClinicSmsProvider.Kavenegar)
                    {
                        if (string.IsNullOrWhiteSpace(providerName))
                            throw new InvalidOperationException("نام قالب کاوه‌نگار برای این کمپین پیکربندی نشده است.");
                        var tokens = ResolveSmsTokens(m, tokenKeys);
                        await sms.SendTemplateAsync(m.Person.Mobile, providerName, tokens, ct);
                    }
                    else
                    {
                        throw new InvalidOperationException("سامانه پیامک کلینیک پیکربندی نشده است.");
                    }
                    sent++;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "ارسال {Template} به {Phone} ناموفق", campaign.Code, m.Person.Mobile);
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

        var senderLabel = smsProvider == ClinicSmsProvider.Touba
            ? (clinic?.SmsSenderNumber ?? "touba")
            : (FirstNonEmpty(clinic?.SmsSenderNumber, kav.Sender) ?? "kavenegar");

        await contracts.AddSmsLogAsync(new ContractSmsLog
        {
            ContractId = contractId,
            SenderName = senderLabel,
            CampaignTitle = logTitle,
            AudienceLabel = memberIds is { Count: > 0 } ? "selected" : "all",
            MessageTemplate = $"{campaign.Code}:{(authCfg.HasFixedOtp ? "(fixed-otp-bypass)" : smsProvider == ClinicSmsProvider.Touba ? "touba-plain" : providerName)}",
            RecipientCount = sent
        }, ct);
        logger.LogInformation("Bulk SMS قالب {Code} توسط {UserId} برای قرارداد {ContractId}: {Count}", campaign.Code, actingUserId, contractId, sent);
        await uow.SaveChangesAsync(ct);
        return sent;
    }

    private IReadOnlyList<string> ResolveSmsTokens(ContractMember m, IReadOnlyList<string> keys)
    {
        var map = BuildTokenMap(m);
        return keys.Select(k => map.TryGetValue(k, out var v) ? v : string.Empty).ToList();
    }

    private string FillSmsBodyPreview(string? bodyPreview, ContractMember m, IReadOnlyList<string> keys)
    {
        var body = bodyPreview ?? string.Empty;
        var map = BuildTokenMap(m);
        foreach (var key in keys.Concat(SmsTemplateTokenKeys.All).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var val = map.TryGetValue(key, out var v) ? v : string.Empty;
            body = body.Replace("{" + key + "}", val, StringComparison.OrdinalIgnoreCase);
        }
        return body.Trim();
    }

    private Dictionary<string, string> BuildTokenMap(ContractMember m)
    {
        var name = PersonName.Display(m.Person.FirstName, m.Person.LastName);
        var inviteToken = m.InviteToken ?? string.Empty;
        var inviteUrl = BuildInviteUrl(inviteToken);
        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [SmsTemplateTokenKeys.Name] = name,
            [SmsTemplateTokenKeys.InviteToken] = inviteToken,
            [SmsTemplateTokenKeys.InviteUrl] = inviteUrl,
            [SmsTemplateTokenKeys.EmrUrl] = string.Empty,
        };
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var v in values)
        {
            if (!string.IsNullOrWhiteSpace(v)) return v.Trim();
        }
        return null;
    }

    private string BuildInviteUrl(string inviteToken)
    {
        var bas = (frontendUrls.Value.My ?? string.Empty).Trim().TrimEnd('/');
        if (string.IsNullOrWhiteSpace(bas) || string.IsNullOrWhiteSpace(inviteToken))
            return inviteToken;
        return $"{bas}/?invite={Uri.EscapeDataString(inviteToken)}";
    }

    private static IReadOnlyList<string> ParseTemplateTokenKeys(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [SmsTemplateTokenKeys.InviteToken, SmsTemplateTokenKeys.Name];
        try
        {
            var raw = JsonSerializer.Deserialize<List<string>>(json) ?? [];
            return SmsCampaignTemplateService.NormalizeTokenKeys(raw);
        }
        catch
        {
            return [SmsTemplateTokenKeys.InviteToken, SmsTemplateTokenKeys.Name];
        }
    }

    public async Task<PathwayRulesReapplyResult> SavePathwayRulesAsync(Guid contractId, IReadOnlyList<PathwayRuleInput> rules, bool reapplyMembers = true, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        // حذف صریح تا Clear روی navigation باعث یتیم‌شدن ردیف‌ها نشود
        if (contract.PathwayRules.Count > 0)
            contracts.RemovePathwayRules(contract.PathwayRules.ToList());
        contract.PathwayRules.Clear();
        foreach (var r in rules.OrderBy(x => x.Priority))
        {
            contract.PathwayRules.Add(new ContractPathwayRule
            {
                ContractId = contractId,
                LibraryRuleId = r.LibraryRuleId,
                Title = r.Title,
                Gender = r.Gender,
                MinAge = r.MinAge,
                MaxAge = r.MaxAge,
                JobCategory = r.JobCategory,
                PathwayCode = r.PathwayCode,
                Priority = r.Priority
            });
        }
        // تغییر فقط‌اولویت: بدون جابه‌جایی خودکار؛ ادمین از «بررسی مجدد» استفاده می‌کند
        var result = reapplyMembers
            ? ReapplyEligibleMembers(contract)
            : new PathwayRulesReapplyResult(0, 0);
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return result;
    }

    public async Task<PathwayRulesReapplyResult> AttachLibraryRulesAsync(Guid contractId, IReadOnlyList<Guid> libraryRuleIds, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var existingLibIds = contract.PathwayRules
            .Where(r => r.LibraryRuleId.HasValue)
            .Select(r => r.LibraryRuleId!.Value)
            .ToHashSet();
        var nextPriority = contract.PathwayRules.Count == 0
            ? 1
            : contract.PathwayRules.Max(r => r.Priority) + 1;

        foreach (var libId in libraryRuleIds.Distinct())
        {
            if (existingLibIds.Contains(libId)) continue;
            var lib = await libraryRules.GetByIdAsync(libId, ct)
                ?? throw new InvalidOperationException("قانون کتابخانه یافت نشد.");
            var rule = new ContractPathwayRule
            {
                ContractId = contractId,
                LibraryRuleId = lib.Id,
                Title = lib.Title,
                Gender = lib.Gender,
                MinAge = lib.MinAge,
                MaxAge = lib.MaxAge,
                JobCategory = lib.JobCategory,
                PathwayCode = lib.PathwayCode,
                Priority = nextPriority++
            };
            await contracts.AddPathwayRuleAsync(rule, ct);
            contract.PathwayRules.Add(rule);
        }

        var result = ReapplyEligibleMembers(contract);
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return result;
    }

    public async Task<PathwayRulesReapplyResult> DetachPathwayRuleAsync(Guid contractId, Guid ruleId, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var rule = contract.PathwayRules.FirstOrDefault(r => r.Id == ruleId)
            ?? await contracts.GetPathwayRuleByIdAsync(ruleId, ct)
            ?? throw new InvalidOperationException("قانون قرارداد یافت نشد.");
        if (rule.ContractId != contractId)
            throw new InvalidOperationException("این قانون متعلق به این قرارداد نیست.");

        contracts.RemovePathwayRules([rule]);
        contract.PathwayRules.Remove(rule);

        // بدون قانون → مسیر پیش‌فرض برای افراد قبل از پذیرش
        var result = ReapplyEligibleMembers(contract);
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return result;
    }

    public async Task<PathwayRecheckPreviewDto> PreviewPathwayRecheckAsync(Guid contractId, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var rows = new List<PathwayRecheckRowDto>(contract.Members.Count);
        foreach (var m in contract.Members)
        {
            var proposed = ProposePathwayAssignment(contract, m);
            var currentCode = m.AssignedPathwayCode;
            var currentTitle = HealthPathwayTitles.Resolve(m.AssignedPathwayCode, m.AssignedPathwayTitle);
            var admitted = m.LinkedPatientId.HasValue;
            var wouldChange =
                !string.Equals(currentCode, proposed.Code, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(m.MatchedPathwayTitle ?? "", proposed.MatchedTitle ?? "", StringComparison.Ordinal);
            var canApply = !admitted;
            rows.Add(new PathwayRecheckRowDto(
                m.Id,
                PersonName.Display(m.Person.FirstName, m.Person.LastName),
                currentCode,
                currentTitle,
                m.MatchedPathwayTitle,
                proposed.Code,
                proposed.Title,
                proposed.MatchedTitle,
                wouldChange,
                m.ManualPathwayOverride,
                admitted,
                canApply));
        }
        return new PathwayRecheckPreviewDto(rows);
    }

    public async Task<PathwayRecheckApplyResult> ApplyPathwayRecheckAsync(Guid contractId, IReadOnlyList<Guid> memberIds, CancellationToken ct = default)
    {
        var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var idSet = memberIds.ToHashSet();
        var applied = 0;
        var skipped = 0;
        foreach (var m in contract.Members.Where(x => idSet.Contains(x.Id)))
        {
            if (m.LinkedPatientId.HasValue)
            {
                skipped++;
                continue;
            }
            m.ManualPathwayOverride = false;
            ApplyPathwayRules(contract, m);
            m.UpdatedAt = DateTime.UtcNow;
            applied++;
        }
        contract.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return new PathwayRecheckApplyResult(applied, skipped);
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
        var formStatus = ResolveFormStatus(m);
        return new(
        m.Id, m.ContractId,
        p.FirstName, p.LastName, PersonName.Display(p.FirstName, p.LastName),
        p.NationalId ?? "", p.Mobile,
        p.BirthDate, AgeCalculator.FromBirthDate(p.BirthDate), p.Gender,
        MaritalStatusNormalizer.Normalize(m.MaritalStatus) ?? m.MaritalStatus,
        m.Department, m.JobCategory, m.PersonnelCode,
        m.OnboardingStage.ToString(), m.AssignedPathwayCode,
        HealthPathwayTitles.Resolve(m.AssignedPathwayCode, m.AssignedPathwayTitle),
        m.MatchedPathwayTitle,
        m.ManualPathwayOverride,
        m.LinkedPatientId, m.InviteToken,
        m.SmsInviteCount, m.LastSmsAt,
        m.ProfileProgressPct, m.AbandonedAtStep, m.ProfileCompletedAt,
        formStatus, formStatus == "Submitted",
        p.FatherName, m.ScheduledVisitDate);
    }

    /// <summary>مذکر/مونث و مترادف‌های اکسل سازمانی → مرد/زن.</summary>
    internal static string NormalizeImportGender(string? raw)
    {
        var g = (raw ?? "").Trim();
        if (g.Contains("زن", StringComparison.Ordinal) || g.Contains("مونث", StringComparison.Ordinal)
            || g.Contains("خانم", StringComparison.Ordinal) || g.Equals("f", StringComparison.OrdinalIgnoreCase))
            return "زن";
        if (g.Contains("مرد", StringComparison.Ordinal) || g.Contains("مذكر", StringComparison.Ordinal)
            || g.Contains("مذکر", StringComparison.Ordinal) || g.Contains("آقا", StringComparison.Ordinal)
            || g.Equals("m", StringComparison.OrdinalIgnoreCase))
            return "مرد";
        return g;
    }

    /// <summary>اگر مقدار گروه کد مسیر قرارداد/کاتالوگ باشد مسیر را override می‌کند؛ وگرنه false.</summary>
    internal static bool TryApplyPathwayCodeFromGroup(CorporateContract contract, ContractMember member, string? raw)
    {
        var code = (raw ?? "").Trim();
        if (code.Length == 0) return false;

        var known = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { HealthPathwayTitles.FullCheckupCode };
        if (!string.IsNullOrWhiteSpace(contract.DefaultPathwayCode))
            known.Add(contract.DefaultPathwayCode.Trim());
        foreach (var rule in contract.PathwayRules ?? Array.Empty<ContractPathwayRule>())
        {
            if (!string.IsNullOrWhiteSpace(rule.PathwayCode))
                known.Add(rule.PathwayCode.Trim());
        }

        if (!known.Contains(code)) return false;

        var resolved = known.First(k => string.Equals(k, code, StringComparison.OrdinalIgnoreCase));
        member.AssignedPathwayCode = resolved;
        member.AssignedPathwayTitle = HealthPathwayTitles.Resolve(resolved);
        member.MatchedPathwayTitle = member.AssignedPathwayTitle;
        member.ManualPathwayOverride = true;
        return true;
    }

    /// <summary>None / Draft / Submitted از stage و درصد ذخیره‌شده روی عضو.</summary>
    internal static string ResolveFormStatus(ContractMember m)
    {
        if (m.OnboardingStage == OnboardingStage.Completed)
            return "Submitted";
        if (m.ProfileProgressPct > 0 || m.OnboardingStage == OnboardingStage.Abandoned)
            return "Draft";
        return "None";
    }

    public async Task<ContractFunnelStatsDto> GetFunnelStatsAsync(Guid contractId, CancellationToken ct = default)
    {
        var c = await contracts.GetByIdAsync(contractId, includeMembers: true, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var members = c.Members;
        var formStatuses = members.Select(ResolveFormStatus).ToList();
        return new ContractFunnelStatsDto(
            contractId,
            members.Count,
            members.Count(m => m.OnboardingStage == OnboardingStage.NotSent),
            members.Count(m => m.OnboardingStage == OnboardingStage.SmsSent),
            members.Count(m => m.OnboardingStage == OnboardingStage.LinkOpened),
            members.Count(m => m.OnboardingStage == OnboardingStage.LoggedIn),
            members.Count(m => m.OnboardingStage == OnboardingStage.Abandoned),
            members.Count(m => m.OnboardingStage == OnboardingStage.Completed),
            members.Count(m => m.LinkedPatientId.HasValue),
            formStatuses.Count(s => s == "Draft"),
            formStatuses.Count(s => s == "Submitted"));
    }

    /// <summary>
    /// قبل از پذیرش (بدون LinkedPatient) بازمحاسبه؛ پذیرش‌شده‌ها بسته فعلی را نگه می‌دارند تا دستی در نوبت‌دهی عوض شوند.
    /// </summary>
    private static PathwayRulesReapplyResult ReapplyEligibleMembers(CorporateContract contract)
    {
        var recalculated = 0;
        var needsManual = 0;
        foreach (var m in contract.Members)
        {
            if (m.ManualPathwayOverride) continue;
            if (m.LinkedPatientId.HasValue)
            {
                needsManual++;
                continue;
            }
            ApplyPathwayRules(contract, m);
            recalculated++;
        }
        return new PathwayRulesReapplyResult(recalculated, needsManual);
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

        patient.AssignedPathwayCode = member.AssignedPathwayCode;
        patient.AssignedPathwayTitle = member.AssignedPathwayTitle;
        patient.UpdatedAt = DateTime.UtcNow;

        if (patient.OwnerUserId is Guid ownerId)
        {
            var owner = await users.GetByIdAsync(ownerId, ct);
            if (owner is not null && owner.PersonId == patient.PersonId)
                owner.UpdatedAt = DateTime.UtcNow;
        }
    }

    private readonly record struct ProposedPathway(string Code, string Title, string? MatchedTitle);

    /// <summary>پیشنهاد مسیر بر اساس اولویت (عدد کمتر زودتر)؛ بدون نوشتن روی عضو.</summary>
    private static ProposedPathway ProposePathwayAssignment(CorporateContract contract, ContractMember member)
    {
        var age = AgeCalculator.FromBirthDate(member.Person.BirthDate) ?? 0;
        var memberGender = member.Person.Gender ?? "";
        var rule = contract.PathwayRules
            .OrderBy(r => r.Priority)
            .FirstOrDefault(r =>
                (r.Gender == "همه" || r.Gender == memberGender) &&
                (r.JobCategory == "همه" || r.JobCategory == member.JobCategory) &&
                (!r.MinAge.HasValue || age >= r.MinAge) &&
                (!r.MaxAge.HasValue || age <= r.MaxAge));
        if (rule is null)
        {
            var code = string.IsNullOrWhiteSpace(contract.DefaultPathwayCode)
                ? HealthPathwayTitles.FullCheckupCode
                : contract.DefaultPathwayCode!;
            var title = HealthPathwayTitles.Resolve(code);
            return new ProposedPathway(code, title, null);
        }
        return new ProposedPathway(
            rule.PathwayCode,
            HealthPathwayTitles.Resolve(rule.PathwayCode, rule.Title),
            rule.Title);
    }

    private static void ApplyPathwayRules(CorporateContract contract, ContractMember member)
    {
        var proposed = ProposePathwayAssignment(contract, member);
        member.AssignedPathwayCode = proposed.Code;
        member.AssignedPathwayTitle = proposed.Title;
        member.MatchedPathwayTitle = proposed.MatchedTitle;
    }

    private static ContractDto Map(CorporateContract c, int? memberCount = null) => new(
        c.Id, c.Code, c.Title, c.OrganizationName, c.Status.ToString(),
        c.Supervisor?.Person.Mobile,
        c.Supervisor is null ? null : PersonName.Display(c.Supervisor.Person.FirstName, c.Supervisor.Person.LastName),
        memberCount ?? c.Members?.Count ?? 0,
        c.DefaultPathwayCode,
        (c.PathwayRules ?? Array.Empty<ContractPathwayRule>())
            .OrderBy(r => r.Priority)
            .Select(r => new ContractPathwayRuleDto(
                r.Id, r.LibraryRuleId,
                r.Title, r.Gender, r.MinAge, r.MaxAge, r.JobCategory, r.PathwayCode, r.Priority))
            .ToList());
}
