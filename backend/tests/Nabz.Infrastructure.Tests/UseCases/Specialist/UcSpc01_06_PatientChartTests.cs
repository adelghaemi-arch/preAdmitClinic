/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Specialist/UcSpc01_06_PatientChartTests.cs
 Description: UC-SPC-01 تا 06 — جستجو، lookup، chart
 Parent Dependencies: ServiceHarness
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Specialist;

public sealed class UcSpc01_06_PatientChartTests
{
    [Fact]
    [Trait("UC", "UC-SPC-01")]
    public async Task UC_SPC_01_HappyPath_SearchReturnsPatients()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        h.SeedPatient(clinicId);
        var patients = h.CreatePatientService();

        var list = await patients.SearchAsync(clinicId, null);

        Assert.Single(list);
    }

    [Fact]
    [Trait("UC", "UC-SPC-02")]
    public async Task UC_SPC_02_HappyPath_SearchByQuery()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, _) = h.SeedPatient(clinicId, "09121112222");
        var patients = h.CreatePatientService();

        var list = await patients.SearchAsync(clinicId, patient.Person.FirstName[..3]);

        Assert.Contains(list, p => p.Id == patient.Id);
    }

    [Fact]
    [Trait("UC", "UC-SPC-02")]
    public async Task UC_SPC_02_SearchByMobileAndNationalId()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, _) = h.SeedPatient(clinicId, "09123334444");
        var patients = h.CreatePatientService();

        var byMobile = await patients.SearchAsync(clinicId, "09123334444");
        var byNid = await patients.SearchAsync(clinicId, patient.Person.NationalId);

        Assert.Contains(byMobile, p => p.Id == patient.Id);
        Assert.Contains(byNid, p => p.Id == patient.Id);
        Assert.Equal(patient.Person.Mobile, byMobile.First(p => p.Id == patient.Id).Phone);
    }

    [Fact]
    [Trait("UC", "UC-SPC-03")]
    public async Task UC_SPC_03_HappyPath_LookupUnknownNationalId_ReturnsNull()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var patients = h.CreatePatientService();

        var found = await patients.LookupByNationalIdAsync(clinicId, "9999999999");

        Assert.Null(found);
    }

    [Fact]
    [Trait("UC", "UC-SPC-04")]
    public async Task UC_SPC_04_HappyPath_GetChart()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, itemCode) = h.SeedPublishedForm(clinicId);
        var patients = h.CreatePatientService();
        var forms = h.CreateFormService();

        await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Submitted,
            [new FormAnswerInput(itemCode, null, "بله", null, false)], owner.Id);

        var chart = await patients.GetChartAsync(patient.Id);

        Assert.NotNull(chart);
        Assert.Equal("Submitted", chart!.FormStatus);
        Assert.Equal(patient.Id, chart.Patient.Id);
    }

    [Fact]
    [Trait("UC", "UC-SPC-05")]
    public async Task UC_SPC_05_HappyPath_DraftHiddenFromSpecialist()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, itemCode) = h.SeedPublishedForm(clinicId);
        var forms = h.CreateFormService();

        await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Draft,
            [new FormAnswerInput(itemCode, null, "موقت", null, false)], owner.Id);

        var response = await forms.GetResponseForSpecialistAsync(patient.Id, formId);

        Assert.Null(response);
    }

    [Fact]
    [Trait("UC", "UC-SPC-06")]
    public async Task UC_SPC_06_HappyPath_ChartIncludesDocsWhenPresent()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();
        await evidence.AddDocumentGroupAsync(patient.Id, owner.Id, "lab", "آزمایش", null, null);
        var patients = h.CreatePatientService();

        var chart = await patients.GetChartAsync(patient.Id);

        Assert.NotNull(chart);
        Assert.Single(chart!.Documents);
    }

    [Fact]
    [Trait("UC", "UC-SPC-06")]
    public async Task UC_SPC_06_SpecialistCanDownloadDocumentFile()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();
        var group = await evidence.AddDocumentGroupAsync(patient.Id, owner.Id, "lab_urine", "آزمایش ادرار", null, null);
        const string key = "2026/001/doc-urine.pdf";
        await evidence.AddDocumentFilesAsync(
            group.Id, owner.Id,
            [( "urine.pdf", "application/pdf", key, 1200, null )]);

        var specialistOk = await evidence.CanDownloadStorageKeyAsync(
            key, Guid.NewGuid(), isPlatform: false, isSpecialist: true);
        var strangerOk = await evidence.CanDownloadStorageKeyAsync(
            key, Guid.NewGuid(), isPlatform: false, isSpecialist: false);

        Assert.True(specialistOk);
        Assert.False(strangerOk);
    }
}