/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn03_04_FormResponseTests.cs
 Description: UC-OWN-03/04 — draft و submit پاسخ فرم؛ رد غیرمالک
 Parent Dependencies: ServiceHarness
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Owner;

public sealed class UcOwn03_04_FormResponseTests
{
    [Fact]
    [Trait("UC", "UC-OWN-03")]
    public async Task UC_OWN_03_HappyPath_SaveDraft()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, itemCode) = h.SeedPublishedForm(clinicId);
        var forms = h.CreateFormService();

        var saved = await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Draft,
            [new FormAnswerInput(itemCode, null, "بله", null, false)], owner.Id);

        Assert.Equal("Draft", saved.Status);
        Assert.Single(saved.Answers);
        Assert.False(patient.IntakeCompleted);
    }

    [Fact]
    [Trait("UC", "UC-OWN-04")]
    public async Task UC_OWN_04_HappyPath_SubmitMarksIntakeComplete()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, itemCode) = h.SeedPublishedForm(clinicId);
        var forms = h.CreateFormService();

        var saved = await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Submitted,
            [new FormAnswerInput(itemCode, null, "بله", null, false)], owner.Id);

        Assert.Equal("Submitted", saved.Status);
        Assert.NotNull(saved.SubmittedAt);
        Assert.True(h.Store.Patients.Single(p => p.Id == patient.Id).IntakeCompleted);
    }

    /// <summary>Nx: ذخیره توسط کاربر غیرمالک — UnauthorizedAccessException.</summary>
    [Theory]
    [Trait("UC", "UC-OWN-03")]
    [InlineData("00000000-0000-0000-0000-000000000001")]
    [InlineData("00000000-0000-0000-0000-000000000002")]
    [InlineData("00000000-0000-0000-0000-000000000003")]
    public async Task UC_OWN_03_Nx_NonOwnerSaveRejected(string actingUserIdText)
    {
        var actingUserId = Guid.Parse(actingUserIdText);
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, itemCode) = h.SeedPublishedForm(clinicId);
        var forms = h.CreateFormService();

        Assert.NotEqual(owner.Id, actingUserId);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            forms.SaveResponseAsync(
                patient.Id, formId, FormResponseStatus.Draft,
                [new FormAnswerInput(itemCode, null, "x", null, false)], actingUserId));
    }

    /// <summary>Nx: submit بدون پاسخ الزامی — خطای اعتبارسنجی.</summary>
    [Fact]
    [Trait("UC", "UC-OWN-04")]
    public async Task UC_OWN_04_Nx_SubmitMissingRequired_Throws()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, _) = h.SeedPublishedForm(clinicId);
        var forms = h.CreateFormService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            forms.SaveResponseAsync(
                patient.Id, formId, FormResponseStatus.Submitted, [], owner.Id));
    }
}