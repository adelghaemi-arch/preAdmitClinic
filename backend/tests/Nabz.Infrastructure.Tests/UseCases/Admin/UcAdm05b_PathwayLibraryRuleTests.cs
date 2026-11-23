/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm05b_PathwayLibraryRuleTests.cs
 Description: UC-ADM-05b — مسیر سلامتی واحد در کتابخانه؛ اتصال/همگام‌سازی/حذف
 Parent Dependencies: ServiceHarness, PathwayService, ContractService
 */

using Nabz.Application.Interfaces;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm05b_PathwayLibraryRuleTests
{
    private static UpsertPathwayRequest SampleRequest(
        string title = "چکاپ آقایان زیر ۴۰ سال",
        string gender = "مرد",
        int? minAge = null,
        int? maxAge = 39,
        bool isInLibrary = true) =>
        new(
            title,
            "توضیح مسیر تست",
            gender,
            minAge,
            maxAge,
            "همه",
            isInLibrary,
            70,
            [new PathwayStationInput("LAB", "آزمایشگاه", 1), new PathwayStationInput("US_ABD", "سونو", 2)]);

    [Fact]
    public async Task UcAdm05b_Create_Attach_And_Sync_On_Update()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var pathways = h.CreatePathwayService();
        var contracts = h.CreateContractService();

        var created = await pathways.CreateAsync(SampleRequest());
        Assert.Equal("HP-001", created.Code);
        Assert.Equal(2, created.Stations.Count);

        var contract = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد تست", "سازمان", null));
        await contracts.AttachLibraryPathwaysAsync(contract.Id, [created.Id]);

        var linked = h.Store.PathwayRules.Single(r => r.LibraryPathwayId == created.Id);
        Assert.Equal(created.Title, linked.Title);
        Assert.Equal(created.Code, linked.PathwayCode);
        Assert.Equal("مرد", linked.Gender);

        await pathways.UpdateAsync(created.Id, SampleRequest(title: "چکاپ آقایان به‌روز", maxAge: 45));
        linked = h.Store.PathwayRules.Single(r => r.LibraryPathwayId == created.Id);
        Assert.Equal("چکاپ آقایان به‌روز", linked.Title);
        Assert.Equal(45, linked.MaxAge);
    }

    [Fact]
    public async Task UcAdm05b_Delete_Blocked_When_Attached()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var pathways = h.CreatePathwayService();
        var contracts = h.CreateContractService();

        var pathway = await pathways.CreateAsync(SampleRequest());
        var contract = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.AttachLibraryPathwaysAsync(contract.Id, [pathway.Id]);

        await Assert.ThrowsAsync<InvalidOperationException>(() => pathways.DeleteAsync(pathway.Id));
    }

    [Fact]
    public async Task UcAdm05b_Delete_After_Detach()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var pathways = h.CreatePathwayService();
        var contracts = h.CreateContractService();

        var pathway = await pathways.CreateAsync(SampleRequest());
        var contract = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.AttachLibraryPathwaysAsync(contract.Id, [pathway.Id]);
        var ruleId = h.Store.PathwayRules.Single(r => r.LibraryPathwayId == pathway.Id).Id;
        await contracts.DetachPathwayRuleAsync(contract.Id, ruleId);

        await pathways.DeleteAsync(pathway.Id);
        Assert.Empty(h.Store.PathwayDefinitions);
    }
}
