/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm25_ClinicStationCatalogTests.cs
 Description: UC-ADM-25 — کاتالوگ ایستگاه کلینیک؛ CRUD، فعال/غیرفعال، sync عنوان مسیر
 Parent Dependencies: ServiceHarness, ClinicStationService
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Entities;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm25_ClinicStationCatalogTests
{
    [Fact]
    [Trait("UC", "UC-ADM-25")]
    public async Task UC_ADM_25_HappyPath_CreateListUpdateAndDeactivate()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var svc = h.CreateClinicStationService();

        var created = await svc.CreateAsync(new UpsertClinicStationRequest(
            Code: "lab",
            TitleFa: "آزمایشگاه",
            Category: "paraclinic",
            Floor: 1,
            RoomNumber: "۱۰۲",
            PrepInstructions: "ناشتا باشید",
            WayfindingSteps: "از لابی به چپ"));

        Assert.Equal("LAB", created.Code);
        Assert.Equal("آزمایشگاه", created.TitleFa);
        Assert.True(created.IsActive);

        var all = await svc.ListCurrentAsync(activeOnly: false);
        Assert.Single(all);

        var updated = await svc.UpdateAsync(created.Id, new UpsertClinicStationRequest(
            TitleFa: "آزمایشگاه تشخیص طبی",
            Floor: 2,
            RoomNumber: "۲۰۱"));
        Assert.Equal("آزمایشگاه تشخیص طبی", updated.TitleFa);
        Assert.Equal(2, updated.Floor);

        var inactive = await svc.SetActiveAsync(created.Id, isActive: false);
        Assert.False(inactive.IsActive);

        var activeOnly = await svc.ListCurrentAsync(activeOnly: true);
        Assert.Empty(activeOnly);

        var includingInactive = await svc.ListCurrentAsync(activeOnly: false);
        Assert.Single(includingInactive);
    }

    [Fact]
    [Trait("UC", "UC-ADM-25")]
    public async Task UC_ADM_25_HappyPath_TitleSyncsPathwayStationDefs()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var pathwayId = Guid.NewGuid();
        h.Store.PathwayDefinitions.Add(new PathwayDefinition
        {
            Id = pathwayId,
            Code = "PKG-TEST",
            Title = "مسیر تست",
            IsActive = true,
            IsInLibrary = true,
        });
        h.Store.PathwayStationDefs.Add(new PathwayStationDef
        {
            PathwayDefinitionId = pathwayId,
            RoomCode = "ECG",
            TitleFa = "نوار قلب قدیمی",
            StepOrder = 1,
        });

        var svc = h.CreateClinicStationService();
        var created = await svc.CreateAsync(new UpsertClinicStationRequest(
            Code: "ECG",
            TitleFa: "نوار قلب (ECG)",
            Category: "paraclinic",
            Floor: 2,
            RoomNumber: "۲۰۴"));

        Assert.Equal("نوار قلب (ECG)", h.Store.PathwayStationDefs.Single(s => s.RoomCode == "ECG").TitleFa);

        await svc.UpdateAsync(created.Id, new UpsertClinicStationRequest(TitleFa: "ECG به‌روز"));
        Assert.Equal("ECG به‌روز", h.Store.PathwayStationDefs.Single(s => s.RoomCode == "ECG").TitleFa);
        Assert.Equal(clinicId, h.Store.ClinicStations.Single().ClinicId);
    }

    [Fact]
    [Trait("UC", "UC-ADM-25")]
    public async Task UC_ADM_25_1x_DuplicateCodeRejected()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var svc = h.CreateClinicStationService();
        await svc.CreateAsync(new UpsertClinicStationRequest(Code: "CARDIO", TitleFa: "قلب"));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.CreateAsync(new UpsertClinicStationRequest(Code: "cardio", TitleFa: "تکراری")));
    }

    [Fact]
    [Trait("UC", "UC-ADM-25")]
    public async Task UC_ADM_25_1x_MissingTitleRejected()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var svc = h.CreateClinicStationService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.CreateAsync(new UpsertClinicStationRequest(Code: "X", TitleFa: "  ")));
    }

    [Fact]
    [Trait("UC", "UC-ADM-25")]
    public async Task UC_ADM_25_2x_UpdateOtherClinicForbidden()
    {
        var h = new ServiceHarness();
        var currentId = h.SeedClinic();
        var otherClinicId = Guid.NewGuid();
        h.Store.Clinics.Add(new Clinic
        {
            Id = otherClinicId,
            Name = "کلینیک دیگر",
            IsCurrentTenant = false,
        });
        var foreign = new ClinicStation
        {
            ClinicId = otherClinicId,
            Code = "LAB",
            TitleFa = "آزمایشگاه دیگر",
            IsActive = true,
        };
        h.Store.ClinicStations.Add(foreign);

        var svc = h.CreateClinicStationService();
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            svc.UpdateAsync(foreign.Id, new UpsertClinicStationRequest(TitleFa: "هک")));

        Assert.Equal(currentId, h.Store.Clinics.Single(c => c.IsCurrentTenant).Id);
    }
}
