/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm01_08_ContractTests.cs
 Description: UC-ADM-01 تا 08 — قرارداد، اعضا، SMS، admit
 Parent Dependencies: ServiceHarness
 */

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
    [Trait("UC", "UC-ADM-02")]
    public async Task UC_ADM_02_HappyPath_UpdateSupervisor()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        await contracts.UpdateSupervisorAsync(created.Id,
            new UpdateSupervisorRequest("ناظر", "09125556677", "مدیر", "1234567890", true));

        var reloaded = await contracts.GetAsync(created.Id);
        Assert.Equal("09125556677", reloaded!.SupervisorPhone);
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
            new ImportMemberRequest("عضو یک", "1122334455", "09120001001", 28, "مرد", null, "اداری")
        ]);

        Assert.Equal(1, n);
        Assert.Single(h.Store.Members);
    }

    [Fact]
    [Trait("UC", "UC-ADM-05")]
    public async Task UC_ADM_05_HappyPath_PackageRulesAppliedOnImport()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        await contracts.SavePackageRulesAsync(created.Id,
        [
            ("بسته جوانان", "مرد", 18, 40, "اداری", "PKG-YOUNG", 1)
        ]);

        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "2233445566", "09120001002", 25, "مرد", null, "اداری")
        ]);

        var member = h.Store.Members.Single();
        Assert.Equal("PKG-YOUNG", member.AssignedPackageCode);
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
            new ImportMemberRequest("عضو", "3344556677", "09120001003", 30, "زن", null, null)
        ]);

        var sent = await contracts.SendBulkSmsAsync(created.Id, "دعوت گروهی", null, Guid.NewGuid(), asSupervisor: false);

        Assert.Equal(1, sent);
        Assert.Empty(h.Sms.SentCalls);
        Assert.Equal(OnboardingStage.SmsSent, h.Store.Members[0].OnboardingStage);
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
            new ImportMemberRequest("عضو", "4455667788", "09120001004", 32, "مرد", null, null)
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
            new ImportMemberRequest("عضو", "5566778899", "09120001005", 35, "مرد", null, null)
        ]);
        var memberId = h.Store.Members[0].Id;

        var patient = await patients.AdmitContractMemberAsync(memberId);

        Assert.Equal("5566778899", patient.NationalId);
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
        var member = new ContractMember
        {
            ContractId = created.Id,
            FullName = "ناقص",
            NationalId = "",
            Phone = ""
        };
        h.Store.Members.Add(member);

        await Assert.ThrowsAsync<InvalidOperationException>(() => patients.AdmitContractMemberAsync(member.Id));
    }
}