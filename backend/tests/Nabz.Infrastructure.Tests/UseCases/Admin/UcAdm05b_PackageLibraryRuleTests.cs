/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm05b_PackageLibraryRuleTests.cs
 Description: تست واحد کتابخانه مرکزی قوانین (UC-ADM-05b)
 Parent Dependencies: ServiceHarness, PackageLibraryRuleService, ContractService
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm05b_PackageLibraryRuleTests
{
    [Fact]
    [Trait("UC", "UC-ADM-05b")]
    public async Task UC_ADM_05b_HappyPath_CreateSearchUpdateAttachStats()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var library = h.CreatePackageLibraryRuleService();
        var contracts = h.CreateContractService();

        var created = await library.CreateAsync(new UpsertPackageLibraryRuleRequest(
            "آقایان اداری زیر ۴۰", "تست", "مرد", 18, 40, "اداری", "PKG-ADMIN"));

        Assert.StartsWith("LR-", created.Code);
        Assert.Equal(0, created.AttachedContractCount);

        var found = await library.ListAsync("اداری");
        Assert.Contains(found, r => r.Id == created.Id);

        var contract = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.AttachLibraryRulesAsync(contract.Id, [created.Id]);

        await contracts.ImportMembersAsync(contract.Id,
        [
            new ImportMemberRequest("عضو", "تست", "0011223340", "09120001002", new DateOnly(2000, 1, 1), "مرد", null, null, "اداری", null)
        ]);

        var afterAttach = await library.GetAsync(created.Id);
        Assert.NotNull(afterAttach);
        Assert.Equal(1, afterAttach!.AttachedContractCount);
        Assert.Equal(1, afterAttach.ActiveMatchedCount);
        Assert.Equal(0, afterAttach.PreviouslyUsedCount);

        var memberId = h.Store.Members[0].Id;
        await contracts.UpdateMemberOnboardingAsync(memberId, new UpdateOnboardingRequest(OnboardingStage.Completed, 100, null));

        var afterComplete = await library.GetAsync(created.Id);
        Assert.Equal(0, afterComplete!.ActiveMatchedCount);
        Assert.Equal(1, afterComplete.PreviouslyUsedCount);

        await library.UpdateAsync(created.Id, new UpsertPackageLibraryRuleRequest(
            "عنوان جدید قانون", "به‌روز", "مرد", 18, 40, "اداری", "PKG-ADMIN"));
        var linked = h.Store.PackageRules.Single(r => r.LibraryRuleId == created.Id);
        Assert.Equal("عنوان جدید قانون", linked.Title);
    }

    [Fact]
    [Trait("UC", "UC-ADM-05b")]
    public async Task UC_ADM_05b_Nx_DeleteWhileAttached_Throws()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var library = h.CreatePackageLibraryRuleService();
        var contracts = h.CreateContractService();

        var rule = await library.CreateAsync(new UpsertPackageLibraryRuleRequest(
            "قانون", null, "همه", null, null, "همه", "FULL_CHECKUP"));
        var contract = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.AttachLibraryRulesAsync(contract.Id, [rule.Id]);

        await Assert.ThrowsAsync<InvalidOperationException>(() => library.DeleteAsync(rule.Id));
    }

    [Fact]
    [Trait("UC", "UC-ADM-05b")]
    public async Task UC_ADM_05b_HappyPath_DetachThenDelete()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var library = h.CreatePackageLibraryRuleService();
        var contracts = h.CreateContractService();

        var rule = await library.CreateAsync(new UpsertPackageLibraryRuleRequest(
            "قانون", null, "همه", null, null, "همه", "FULL_CHECKUP"));
        var contract = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.AttachLibraryRulesAsync(contract.Id, [rule.Id]);
        var ruleId = h.Store.PackageRules.Single().Id;

        await contracts.DetachPackageRuleAsync(contract.Id, ruleId);
        await library.DeleteAsync(rule.Id);

        Assert.Empty(h.Store.PackageLibraryRules);
        Assert.Empty(h.Store.PackageRules);
    }
}
