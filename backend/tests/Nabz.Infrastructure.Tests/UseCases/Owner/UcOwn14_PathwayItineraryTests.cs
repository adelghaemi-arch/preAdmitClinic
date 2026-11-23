/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn14_PathwayItineraryTests.cs
 Description: تست واحد itinerary مسیر و confirm خوداظهاری (UC-OWN-14)
 Parent Dependencies: ServiceHarness, HealthPathwayTitles
 */

using Nabz.Application.Identity;
using Nabz.Domain.Entities;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Owner;

public sealed class UcOwn14_PathwayItineraryTests
{
    [Fact]
    public async Task UcOwn14_Snapshot_IncludesOrderedItinerary_WhenPathwaySeeded()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        patient.IntakeCompleted = true;
        patient.AssignedPathwayCode = HealthPathwayTitles.CorpMenLt40;
        SeedMenLt40(h);

        var snap = await h.CreatePatientService().GetOwnerIntakeSnapshotAsync(owner.Id);
        Assert.NotNull(snap);
        Assert.Equal(3, snap!.PathwayItinerary!.Count);
        Assert.Equal("LAB", snap.PathwayItinerary[0].RoomCode);
        Assert.False(snap.PathwayItinerary[0].Confirmed);
        Assert.Equal("REMOTE_REVIEW", snap.PathwayItinerary[^1].RoomCode);
    }

    [Fact]
    public async Task UcOwn14_Confirm_OutOfOrder_AndIdempotent()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        patient.IntakeCompleted = true;
        patient.AssignedPathwayCode = HealthPathwayTitles.CorpMenLt40;
        var stations = SeedMenLt40(h);
        var remote = stations.Single(s => s.RoomCode == "REMOTE_REVIEW");

        var svc = h.CreatePatientService();
        // خارج از ترتیب: ابتدا آخرین ایستگاه
        var first = await svc.ConfirmPathwayStationAsync(owner.Id, remote.Id);
        Assert.True(first.Confirmed);

        var again = await svc.ConfirmPathwayStationAsync(owner.Id, remote.Id);
        Assert.True(again.Confirmed);
        Assert.Single(h.Store.PathwayStationProgress);
    }

    [Fact]
    public async Task UcOwn14_Confirm_Rejected_WhenIntakeIncomplete()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        patient.IntakeCompleted = false;
        patient.AssignedPathwayCode = HealthPathwayTitles.CorpMenLt40;
        var stations = SeedMenLt40(h);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            h.CreatePatientService().ConfirmPathwayStationAsync(owner.Id, stations[0].Id));
    }

    private static List<PathwayStationDef> SeedMenLt40(ServiceHarness h)
    {
        var def = new PathwayDefinition
        {
            Code = HealthPathwayTitles.CorpMenLt40,
            Title = HealthPathwayTitles.Resolve(HealthPathwayTitles.CorpMenLt40),
            IsActive = true,
            EstimatedTotalMinutes = 70,
        };
        var stations = new List<PathwayStationDef>
        {
            new() { PathwayDefinitionId = def.Id, RoomCode = "LAB", TitleFa = "آزمایشگاه", StepOrder = 1 },
            new() { PathwayDefinitionId = def.Id, RoomCode = "US_ABD", TitleFa = "سونو", StepOrder = 2 },
            new() { PathwayDefinitionId = def.Id, RoomCode = "REMOTE_REVIEW", TitleFa = "پایش", StepOrder = 3 },
        };
        foreach (var s in stations) def.Stations.Add(s);
        h.Store.PathwayDefinitions.Add(def);
        h.Store.PathwayStationDefs.AddRange(stations);
        return stations;
    }
}
