/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm01_08_ContractTests.cs
 Description: UC-ADM-01 تا 08 و 04b و 22 — قرارداد، اعضا، ویرایش/حذف، لوگوی شریک، قوانین بسته، SMS، admit
 Parent Dependencies: ServiceHarness
 */

using Nabz.Application.Brand;
using Nabz.Application.Interfaces;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm01_08_ContractTests
{
    [Fact]
    [Trait("UC", "UC-ADM-01")]
    public async Task UC_ADM_01_HappyPath_CreateContract()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();

        var dto = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد الف", "سازمان الف", "C-001"));

        Assert.Equal("C-001", dto.Code);
        Assert.Single(h.Store.Contracts);
    }

    [Fact]
    [Trait("UC", "UC-ADM-22")]
    public async Task UC_ADM_22_HappyPath_UpdateContract()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد الف", "سازمان الف", "C-001", "CORP_MEN_LT40"));

        var updated = await contracts.UpdateAsync(created.Id,
            new UpdateContractRequest("قرارداد به‌روز", "سازمان به‌روز", "CORP_WOMEN_LT40"));

        Assert.Equal("C-001", updated.Code);
        Assert.Equal("قرارداد به‌روز", updated.Title);
        Assert.Equal("سازمان به‌روز", updated.OrganizationName);
        Assert.Equal("CORP_WOMEN_LT40", updated.DefaultPathwayCode);
    }

    [Fact]
    [Trait("UC", "UC-ADM-22")]
    public async Task UC_ADM_22_UploadPartnerLogo_stores_contract_brand_key()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد الف", "سازمان الف", "C-001"));

        await using var jpeg = new MemoryStream(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10 });
        var result = await contracts.UploadPartnerLogoAsync(created.Id, jpeg, "partner.jpg", "image/jpeg");

        Assert.StartsWith(
            BrandLogoRules.ContractFolderPrefix + "/",
            result.PartnerLogoStorageKey,
            StringComparison.OrdinalIgnoreCase);
        var entity = h.Store.Contracts.Single(c => c.Id == created.Id);
        Assert.Equal(result.PartnerLogoStorageKey, entity.PartnerLogoStorageKey);
        Assert.True(h.Files.Files.ContainsKey(result.PartnerLogoStorageKey));
    }

    [Fact]
    [Trait("UC", "UC-ADM-22")]
    public async Task UC_ADM_22_3x_UploadPartnerLogo_rejects_invalid_mime()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد الف", "سازمان الف", "C-001"));

        await using var gif = new MemoryStream(new byte[] { 0x47, 0x49, 0x46 });
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            contracts.UploadPartnerLogoAsync(created.Id, gif, "x.gif", "image/gif"));
    }

    [Fact]
    [Trait("UC", "UC-ADM-22")]
    public async Task UC_ADM_22_1x_RejectsShortTitle()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد الف", "سازمان الف", null));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            contracts.UpdateAsync(created.Id, new UpdateContractRequest("اب", "سازمان", null)));
    }

    [Fact]
    [Trait("UC", "UC-ADM-22")]
    public async Task UC_ADM_22_2x_MissingContract()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var contracts = h.CreateContractService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            contracts.UpdateAsync(Guid.NewGuid(), new UpdateContractRequest("عنوان کافی", "سازمان", null)));
    }

    [Fact]
    [Trait("UC", "UC-ADM-02")]
    public async Task UC_ADM_02_HappyPath_UpdateSupervisor()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        await contracts.UpdateSupervisorAsync(created.Id,
            new UpdateSupervisorRequest("ناظر", "سازمانی", "09125556677", null, "0012345679", true));

        var reloaded = await contracts.GetAsync(created.Id);
        Assert.Equal("09125556677", reloaded!.SupervisorPhone);
    }

    [Fact]
    [Trait("UC", "UC-ADM-02")]
    public async Task UC_ADM_02_UpdateSupervisor_WithoutNationalId_1x_rejects()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            contracts.UpdateSupervisorAsync(created.Id,
                new UpdateSupervisorRequest("رضا", "محمدی", "09125556677", null, null, true)));
        Assert.Contains("کدملی", ex.Message);
    }

    [Fact]
    [Trait("UC", "UC-ADM-02")]
    public async Task UC_ADM_02_UpdateSupervisor_InvalidNationalId_1x_rejects()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            contracts.UpdateSupervisorAsync(created.Id,
                new UpdateSupervisorRequest("رضا", "محمدی", "09125556677", null, "1234567890", true)));
        Assert.Contains("نامعتبر", ex.Message);
    }

    [Fact]
    [Trait("UC", "UC-ADM-03")]
    public async Task UC_ADM_03_HappyPath_UpdateContractApi()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        await contracts.UpdateApiAsync(created.Id, "https://api.example/sync", "secret-key");

        var entity = h.Store.Contracts.Single(c => c.Id == created.Id);
        Assert.Equal("https://api.example/sync", entity.ApiEndpoint);
    }

    [Fact]
    [Trait("UC", "UC-ADM-04")]
    public async Task UC_ADM_04_HappyPath_ImportMembers()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        var n = await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "یک", "0499370899", "09120001001", new DateOnly(1998, 1, 1), "مرد", null, null, "اداری", null)
        ]);

        Assert.Equal(1, n.Imported);
        Assert.Single(h.Store.Members);
    }

    [Fact]
    [Trait("UC", "UC-ADM-04")]
    public async Task UC_ADM_04_Import_FatherVisit_And_PathwayFromGroupCode()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null, "CORP_MEN_LT40"));
        var visit = new DateOnly(2026, 11, 22);

        var batch = await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest(
                "عضو", "یک", "0499370899", "09120001001", new DateOnly(1998, 1, 1), "مذکر",
                null, null, null, null, "هرمز", visit, "CORP_MEN_LT40"),
            new ImportMemberRequest(
                "عضو", "دو", "0011223340", "09120001002", new DateOnly(1999, 1, 1), "مونث",
                null, null, null, null, "عبدالله", null, "آقایان 40+"),
        ]);

        Assert.Equal(2, batch.Imported);
        h.Store.SyncNavigation();
        var byNid = h.Store.Members.ToDictionary(m => m.Person.NationalId!);
        Assert.Equal("هرمز", byNid["0499370899"].Person.FatherName);
        Assert.Equal(visit, byNid["0499370899"].ScheduledVisitDate);
        Assert.True(byNid["0499370899"].ManualPathwayOverride);
        Assert.Equal("CORP_MEN_LT40", byNid["0499370899"].AssignedPathwayCode);
        Assert.Equal("زن", byNid["0011223340"].Person.Gender);
        Assert.False(byNid["0011223340"].ManualPathwayOverride);
        Assert.Null(byNid["0011223340"].ScheduledVisitDate);
    }

    [Fact]
    [Trait("UC", "UC-ADM-04")]
    public async Task UC_ADM_04_Import_NormalizesMaritalStatus()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        var batch = await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "یک", "0499370899", "09120001001", new DateOnly(1998, 1, 1), "مرد", "سایر", null, null, null),
            new ImportMemberRequest("عضو", "دو", "0011223340", "09120001002", new DateOnly(1999, 1, 1), "زن", "مطلقه", null, null, null),
            new ImportMemberRequest("عضو", "سه", "0012345679", "09120001003", new DateOnly(2000, 1, 1), "مرد", "بیوه", null, null, null),
            new ImportMemberRequest("عضو", "چهار", "0076543218", "09120001004", new DateOnly(1995, 1, 1), "زن", "متاهل", null, null, null),
            new ImportMemberRequest("عضو", "پنج", "0123456789", "09120001005", new DateOnly(1994, 1, 1), "مرد", "نامعلوم", null, null, null),
        ]);

        Assert.Equal(5, batch.Imported);
        h.Store.SyncNavigation();
        var byNid = h.Store.Members.ToDictionary(m => m.Person.NationalId!);
        Assert.Equal("سایر", byNid["0499370899"].MaritalStatus);
        Assert.Equal("ازدواج‌کرده", byNid["0011223340"].MaritalStatus);
        Assert.Equal("ازدواج‌کرده", byNid["0012345679"].MaritalStatus);
        Assert.Equal("متأهل", byNid["0076543218"].MaritalStatus);
        Assert.Null(byNid["0123456789"].MaritalStatus);
    }

    [Fact]
    [Trait("UC", "UC-ADM-04")]
    public async Task UC_ADM_04_SameContract_NationalId_CannotDuplicate()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        // در یک بچ: اولی ثبت، دومی duplicate
        var batch = await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "یک", "0499370899", "09120001001", new DateOnly(1998, 1, 1), "مرد", null, null, null, null),
            new ImportMemberRequest("عضو", "دو", "0499370899", "09120001002", new DateOnly(1999, 1, 1), "زن", null, null, null, null)
        ]);
        Assert.Equal(1, batch.Imported);
        Assert.Equal(1, batch.Duplicates);
        Assert.Single(h.Store.Members);
        Assert.Contains(batch.Results, r => r.Status == "duplicate");

        // ایمپورت بعدی همان کدملی در همان قرارداد → دوباره duplicate، بدون عضو جدید
        var again = await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "سه", "0499370899", "09120001003", new DateOnly(2000, 1, 1), "مرد", null, null, null, null)
        ]);
        Assert.Equal(0, again.Imported);
        Assert.Equal(1, again.Duplicates);
        Assert.Single(h.Store.Members);
    }

    [Fact]
    [Trait("UC", "UC-ADM-05")]
    public async Task UC_ADM_05_HappyPath_pathwayRulesAppliedOnImport()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        await contracts.SavePathwayRulesAsync(created.Id,
        [
            new PathwayRuleInput("بسته جوانان", "مرد", 18, 40, "اداری", "PKG-YOUNG", 1, null)
        ]);

        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "تست", "0011223340", "09120001002", new DateOnly(2001, 1, 1), "مرد", null, null, "اداری", null)
        ]);

        var member = h.Store.Members.Single();
        Assert.Equal("PKG-YOUNG", member.AssignedPathwayCode);
    }

    [Fact]
    [Trait("UC", "UC-ADM-06")]
    public async Task UC_ADM_06_HappyPath_BulkSms_FixedOtp_NoRealSms()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService(fixedOtp: "12345");
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "تست", "0012345679", "09120001003", new DateOnly(1996, 1, 1), "زن", null, null, null, null)
        ]);

        var templateId = h.SeedDefaultSmsTemplate();
        var sent = await contracts.SendBulkSmsAsync(created.Id, templateId, "دعوت گروهی", null, Guid.NewGuid(), asSupervisor: false);

        Assert.Equal(1, sent);
        Assert.Empty(h.Sms.SentCalls);
        Assert.Equal(OnboardingStage.SmsSent, h.Store.Members[0].OnboardingStage);
    }

    [Fact]
    [Trait("UC", "UC-ADM-06")]
    public async Task UC_ADM_06_SingleMemberSms_UpdatesCountAndDto()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService(fixedOtp: "12345");
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("علی", "فردی", "0012345687", "09120001013", new DateOnly(1995, 2, 2), "مرد", null, null, null, null),
            new ImportMemberRequest("سارا", "دیگر", "0012345695", "09120001014", new DateOnly(1997, 3, 3), "زن", null, null, null, null)
        ]);
        var targetId = h.Store.Members[0].Id;

        // فقط یک عضو از طریق memberIds — مسیر دکمه ردیف قیف
        var templateId = h.SeedDefaultSmsTemplate();
        var sent = await contracts.SendBulkSmsAsync(
            created.Id, templateId, "دعوت فردی — علی فردی", [targetId], Guid.NewGuid(), asSupervisor: false);

        Assert.Equal(1, sent);
        Assert.Equal(1, h.Store.Members[0].SmsInviteCount);
        Assert.Equal(0, h.Store.Members[1].SmsInviteCount);
        Assert.Equal(OnboardingStage.SmsSent, h.Store.Members[0].OnboardingStage);
        Assert.Equal(OnboardingStage.NotSent, h.Store.Members[1].OnboardingStage);

        var dto = (await contracts.ListMembersAsync(created.Id)).Single(m => m.Id == targetId);
        Assert.Equal(1, dto.SmsInviteCount);
        Assert.NotNull(dto.LastSmsAt);
    }

    [Fact]
    [Trait("UC", "UC-ADM-07")]
    public async Task UC_ADM_07_HappyPath_OnboardingFunnelStats()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "تست", "0076543218", "09120001004", new DateOnly(1994, 1, 1), "مرد", null, null, null, null)
        ]);
        var memberId = h.Store.Members[0].Id;

        await contracts.UpdateMemberOnboardingAsync(memberId, new UpdateOnboardingRequest(OnboardingStage.LoggedIn, 50, null));

        var funnel = await contracts.GetFunnelStatsAsync(created.Id);

        Assert.Equal(1, funnel.MemberCount);
        Assert.Equal(1, funnel.LoggedIn);
    }

    [Fact]
    [Trait("UC", "UC-ADM-08")]
    public async Task UC_ADM_08_HappyPath_AdmitMember()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var patients = h.CreatePatientService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "تست", "0123456789", "09120001005", new DateOnly(1991, 1, 1), "مرد", null, null, null, null)
        ]);
        var memberId = h.Store.Members[0].Id;

        var patient = await patients.AdmitContractMemberAsync(memberId);

        Assert.Equal("0123456789", patient.NationalId);
        Assert.NotNull(h.Store.Members[0].LinkedPatientId);
    }

    /// <summary>Nx: admit عضو با داده ناقص.</summary>
    [Fact]
    [Trait("UC", "UC-ADM-08")]
    public async Task UC_ADM_08_Nx_IncompleteMember_Throws()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var patients = h.CreatePatientService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        var incomplete = TestIdentityHelper.AddPerson(h.Store, "", "ناقص", "تست", "");
        TestIdentityHelper.AddMember(h.Store, created.Id, incomplete);
        var member = h.Store.Members.Single();

        await Assert.ThrowsAsync<InvalidOperationException>(() => patients.AdmitContractMemberAsync(member.Id));
    }

    [Fact]
    [Trait("UC", "UC-ADM-04b")]
    public async Task UC_ADM_04b_DefaultPathway_UsesPersianTitle()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "تست", "0499370899", "09120001001", new DateOnly(1998, 1, 1), "مرد", null, null, null, null)
        ]);

        var member = h.Store.Members.Single();
        Assert.Equal("CORP_MEN_LT40", member.AssignedPathwayCode);
        Assert.Equal("چکاپ آقایان زیر ۴۰ سال", member.AssignedPathwayTitle);
    }

    [Fact]
    [Trait("UC", "UC-ADM-04b")]
    public async Task UC_ADM_04b_UpdateMember_AfterAdmit_KeepsLink()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var patients = h.CreatePatientService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "یک", "0499370899", "09120001001", new DateOnly(1998, 1, 1), "مرد", null, "واحد الف", "اداری", null)
        ]);
        var memberId = h.Store.Members[0].Id;
        await patients.AdmitContractMemberAsync(memberId);
        Assert.NotNull(h.Store.Members[0].LinkedPatientId);

        await contracts.UpdateMemberAsync(memberId, new ImportMemberRequest(
            "عضو", "ویرایش‌شده", "0499370899", "09120001099", new DateOnly(1997, 5, 5), "مرد", null, "واحد ب", "فنی و مهندسی", "P-1"));

        h.Store.SyncNavigation();
        var updated = h.Store.Members.Single(m => m.Id == memberId);
        Assert.Equal("ویرایش‌شده", updated.Person.LastName);
        Assert.Equal("09120001099", updated.Person.Mobile);
        Assert.Equal("واحد ب", updated.Department);
        Assert.NotNull(updated.LinkedPatientId);
    }

    [Fact]
    [Trait("UC", "UC-ADM-04b")]
    public async Task UC_ADM_04b_DeleteMember_BeforePreadmit_Ok()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "یک", "0499370899", "09120001001", new DateOnly(1998, 1, 1), "مرد", null, null, null, null)
        ]);
        var memberId = h.Store.Members[0].Id;

        await contracts.DeleteMemberAsync(memberId);
        Assert.Empty(h.Store.Members);
    }

    [Fact]
    [Trait("UC", "UC-ADM-04b")]
    public async Task UC_ADM_04b_2y_DeleteRejected_AfterLinkOpened()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "یک", "0499370899", "09120001001", new DateOnly(1998, 1, 1), "مرد", null, null, null, null)
        ]);
        var memberId = h.Store.Members[0].Id;
        await contracts.UpdateMemberOnboardingAsync(memberId,
            new UpdateOnboardingRequest(OnboardingStage.LinkOpened, null, null));

        await Assert.ThrowsAsync<InvalidOperationException>(() => contracts.DeleteMemberAsync(memberId));
        Assert.Single(h.Store.Members);
    }

    [Fact]
    [Trait("UC", "UC-ADM-04b")]
    public async Task UC_ADM_04b_2y_DeleteRejected_AfterAdmit()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var patients = h.CreatePatientService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "یک", "0499370899", "09120001001", new DateOnly(1998, 1, 1), "مرد", null, null, null, null)
        ]);
        var memberId = h.Store.Members[0].Id;
        await patients.AdmitContractMemberAsync(memberId);

        await Assert.ThrowsAsync<InvalidOperationException>(() => contracts.DeleteMemberAsync(memberId));
        Assert.Single(h.Store.Members);
    }

    [Fact]
    [Trait("UC", "UC-ADM-05")]
    public async Task UC_ADM_05_DetachRule_SkipsAdmittedMembers()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var patients = h.CreatePatientService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null, "CORP_MEN_LT40"));

        await contracts.SavePathwayRulesAsync(created.Id,
        [
            new PathwayRuleInput("قانون ویژه", "همه", null, null, "همه", "PKG-SPECIAL", 1, null)
        ]);
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "آزاد", "0499370899", "09120001001", new DateOnly(1998, 1, 1), "مرد", null, null, null, null),
            new ImportMemberRequest("عضو", "پذیرش", "0011223340", "09120001002", new DateOnly(1995, 1, 1), "زن", null, null, null, null)
        ]);
        h.Store.SyncNavigation();
        var free = h.Store.Members.Single(m => m.Person.NationalId == "0499370899");
        var admitted = h.Store.Members.Single(m => m.Person.NationalId == "0011223340");
        Assert.Equal("PKG-SPECIAL", free.AssignedPathwayCode);
        Assert.Equal("PKG-SPECIAL", admitted.AssignedPathwayCode);

        await patients.AdmitContractMemberAsync(admitted.Id);
        var ruleId = h.Store.PathwayRules.Single(r => r.ContractId == created.Id).Id;

        var result = await contracts.DetachPathwayRuleAsync(created.Id, ruleId);

        Assert.Equal(1, result.Recalculated);
        Assert.Equal(1, result.NeedsManual);
        Assert.Equal("CORP_MEN_LT40", h.Store.Members.Single(m => m.Id == free.Id).AssignedPathwayCode);
        Assert.Equal("چکاپ آقایان زیر ۴۰ سال", h.Store.Members.Single(m => m.Id == free.Id).AssignedPathwayTitle);
        // پذیرش‌شده بسته قبلی را نگه می‌دارد تا دستی عوض شود
        Assert.Equal("PKG-SPECIAL", h.Store.Members.Single(m => m.Id == admitted.Id).AssignedPathwayCode);
    }

    [Fact]
    [Trait("UC", "UC-ADM-05")]
    public async Task UC_ADM_05_Override_SetsMatchedPathwayTitleToSelectedTitle()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null, "CORP_MEN_LT40"));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "تست", "0499370899", "09120001001", new DateOnly(1998, 1, 1), "مرد", null, null, null, null)
        ]);
        var memberId = h.Store.Members[0].Id;

        await contracts.OverrideMemberPathwayAsync(memberId, "CORP_MEN_LT40", "مسیر سالمندان");

        var m = h.Store.Members.Single();
        Assert.True(m.ManualPathwayOverride);
        Assert.Equal("مسیر سالمندان", m.MatchedPathwayTitle);
        Assert.Equal("CORP_MEN_LT40", m.AssignedPathwayCode);
    }

    [Fact]
    [Trait("UC", "UC-ADM-05")]
    public async Task UC_ADM_05_RecheckPreviewAndApply_MovesEligibleMembers()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null, "CORP_MEN_LT40"));

        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("علی", "جوان", "0499370899", "09120001001", new DateOnly(2000, 1, 1), "مرد", null, null, null, null)
        ]);
        var memberId = h.Store.Members[0].Id;
        Assert.Equal("CORP_MEN_LT40", h.Store.Members[0].AssignedPathwayCode);

        // قانون جدید بدون reapply — عضو روی پیش‌فرض می‌ماند تا recheck
        await contracts.SavePathwayRulesAsync(created.Id,
        [
            new PathwayRuleInput("جوانان", "مرد", 18, 40, "همه", "PKG-YOUNG", 1, null)
        ], reapplyMembers: false);

        Assert.Equal("CORP_MEN_LT40", h.Store.Members[0].AssignedPathwayCode);

        var preview = await contracts.PreviewPathwayRecheckAsync(created.Id);
        var row = Assert.Single(preview.Rows);
        Assert.True(row.WouldChange);
        Assert.True(row.CanApply);
        Assert.Equal("PKG-YOUNG", row.ProposedPathwayCode);
        Assert.Equal("جوانان", row.ProposedMatchedTitle);

        var applied = await contracts.ApplyPathwayRecheckAsync(created.Id, [memberId]);
        Assert.Equal(1, applied.Applied);
        Assert.Equal(0, applied.Skipped);
        Assert.False(h.Store.Members[0].ManualPathwayOverride);
        Assert.Equal("PKG-YOUNG", h.Store.Members[0].AssignedPathwayCode);
        Assert.Equal("جوانان", h.Store.Members[0].MatchedPathwayTitle);
    }
}
