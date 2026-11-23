/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm24_SetContractStatusTests.cs
 Description: UC-ADM-24 — فعال/غیرفعال قرارداد (Active ↔ Inactive)
 Parent Dependencies: ServiceHarness, ContractService
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm24_SetContractStatusTests
{
    [Fact]
    [Trait("UC", "UC-ADM-24")]
    public async Task UC_ADM_24_HappyPath_DeactivateAndReactivate()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد تست", "سازمان", "C-STAT"));

        Assert.Equal(nameof(ContractStatus.Active), created.Status);

        var inactive = await contracts.SetStatusAsync(created.Id, isActive: false);
        Assert.Equal(nameof(ContractStatus.Inactive), inactive.Status);

        var active = await contracts.SetStatusAsync(created.Id, isActive: true);
        Assert.Equal(nameof(ContractStatus.Active), active.Status);
    }

    [Fact]
    [Trait("UC", "UC-ADM-24")]
    public async Task UC_ADM_24_HappyPath_ActivateFromDraft()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("پیش‌نویس", "سازمان", "C-DRAFT"));
        var entity = h.Store.Contracts.Single(c => c.Id == created.Id);
        entity.Status = ContractStatus.Draft;

        var active = await contracts.SetStatusAsync(created.Id, isActive: true);
        Assert.Equal(nameof(ContractStatus.Active), active.Status);
    }

    [Fact]
    [Trait("UC", "UC-ADM-24")]
    public async Task UC_ADM_24_1x_MissingContract()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var contracts = h.CreateContractService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            contracts.SetStatusAsync(Guid.NewGuid(), isActive: false));
    }

    [Fact]
    [Trait("UC", "UC-ADM-24")]
    public async Task UC_ADM_24_2x_RejectsDeactivateWhenNotActive()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.SetStatusAsync(created.Id, isActive: false);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            contracts.SetStatusAsync(created.Id, isActive: false));
    }

    [Fact]
    [Trait("UC", "UC-ADM-24")]
    public async Task UC_ADM_24_2x_RejectsActivateFromCompleted()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("پایان", "سازمان", null));
        var entity = h.Store.Contracts.Single(c => c.Id == created.Id);
        entity.Status = ContractStatus.Completed;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            contracts.SetStatusAsync(created.Id, isActive: true));
    }
}
