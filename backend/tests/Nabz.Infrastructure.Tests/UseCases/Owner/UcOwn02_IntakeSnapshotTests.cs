/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn02_IntakeSnapshotTests.cs
 Description: UC-OWN-02 — snapshot پیش‌پذیرش مالک
 Parent Dependencies: ServiceHarness
 */

using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Owner;

public sealed class UcOwn02_IntakeSnapshotTests
{
    [Fact]
    [Trait("UC", "UC-OWN-02")]
    public async Task UC_OWN_02_HappyPath_ReturnsIntakeSnapshotWithFormAndCounts()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, _) = h.SeedPublishedForm(clinicId);

        var patients = h.CreatePatientService();
        var snapshot = await patients.GetOwnerIntakeSnapshotAsync(owner.Id);

        Assert.NotNull(snapshot);
        Assert.Equal(patient.Id, snapshot!.Patient.Id);
        Assert.Equal("None", snapshot.FormStatus);
        Assert.Equal(formId, snapshot.FormId);
        Assert.False(snapshot.HasPortrait);
        Assert.Equal(0, snapshot.DocumentGroupCount);
        Assert.Equal(0, snapshot.GpsPointCount);
    }

    /// <summary>Na: مالک بدون پرونده — snapshot تهی.</summary>
    [Fact]
    [Trait("UC", "UC-OWN-02")]
    public async Task UC_OWN_02_Na_NoPatient_ReturnsNull()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var patients = h.CreatePatientService();

        var snapshot = await patients.GetOwnerIntakeSnapshotAsync(Guid.NewGuid());

        Assert.Null(snapshot);
    }
}