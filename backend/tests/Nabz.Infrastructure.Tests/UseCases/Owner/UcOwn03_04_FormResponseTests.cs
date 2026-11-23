/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn03_04_FormResponseTests.cs
 Description: UC-OWN-03/04 — upsert ItemCode (insert/update مخلوط)، پوسته خالی، submit prune
 Parent Dependencies: ServiceHarness
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Entities;
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

    /// <summary>draft با BASE_birthDate — دموگرافیک Patient در مرز بخش همگام می‌شود.</summary>
    [Fact]
    [Trait("UC", "UC-OWN-03")]
    public async Task UC_OWN_03_DraftBaseDemographics_SyncsPatientBirthDate()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, _) = h.SeedPublishedForm(clinicId);
        var form = h.Store.Forms.Single(f => f.Id == formId);
        var section = form.Sections.First();
        var birthItem = new FormItem
        {
            FormId = formId,
            SectionId = section.Id,
            Code = "CA_M_BASE_birthDate",
            LabelFa = "تاریخ تولد",
            InputType = "date",
            Required = false,
            SortOrder = 3
        };
        h.Store.FormItems.Add(birthItem);
        form.Items.Add(birthItem);
        var forms = h.CreateFormService();

        await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Draft,
            [new FormAnswerInput(birthItem.Code, null, "1986-06-22", null, false)], owner.Id);

        var refreshed = h.Store.Patients.Single(p => p.Id == patient.Id);
        Assert.Equal(new DateOnly(1986, 6, 22), refreshed.Person.BirthDate);
        Assert.False(refreshed.IntakeCompleted);
    }

    /// <summary>پوستهٔ FormResponse بدون answer — draft باید insert کند نه 409.</summary>
    [Fact]
    [Trait("UC", "UC-OWN-03")]
    public async Task UC_OWN_03_EmptyResponseShell_DraftInsertsAnswers()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, itemCode) = h.SeedPublishedForm(clinicId);
        var form = h.Store.Forms.Single(f => f.Id == formId);
        h.Store.Responses.Add(new FormResponse
        {
            PatientId = patient.Id,
            FormId = formId,
            FormCode = form.Code,
            Status = FormResponseStatus.Draft
        });
        var forms = h.CreateFormService();

        var saved = await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Draft,
            [new FormAnswerInput(itemCode, null, "از پوسته خالی", null, false)], owner.Id);

        Assert.Single(saved.Answers);
        Assert.Equal("از پوسته خالی", saved.Answers[0].ValueRaw);
        Assert.Single(h.Store.FormAnswers, a => a.ResponseId == saved.Id);
    }

    /// <summary>یک درخواست: یک کد موجود update + یک کد جدید insert.</summary>
    [Fact]
    [Trait("UC", "UC-OWN-03")]
    public async Task UC_OWN_03_MixedUpsert_UpdatesExistingAndInsertsNew()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, itemCodeA) = h.SeedPublishedForm(clinicId);
        var form = h.Store.Forms.Single(f => f.Id == formId);
        var section = form.Sections.First();
        var itemB = new FormItem
        {
            FormId = formId,
            SectionId = section.Id,
            Code = "Q-NEW",
            LabelFa = "جدید",
            InputType = "text",
            Required = false,
            SortOrder = 2
        };
        h.Store.FormItems.Add(itemB);
        form.Items.Add(itemB);
        var forms = h.CreateFormService();

        await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Draft,
            [new FormAnswerInput(itemCodeA, null, "قدیم", null, false)], owner.Id);

        var mixed = await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Draft,
            [
                new FormAnswerInput(itemCodeA, null, "به‌روز", null, false),
                new FormAnswerInput(itemB.Code, null, "تازه", null, false)
            ], owner.Id);

        Assert.Equal(2, mixed.Answers.Count);
        Assert.Contains(mixed.Answers, a => a.ItemCode == itemCodeA && a.ValueRaw == "به‌روز");
        Assert.Contains(mixed.Answers, a => a.ItemCode == itemB.Code && a.ValueRaw == "تازه");
    }

    /// <summary>دو draft پیاپی با itemCode متفاوت — merge؛ پاسخ بخش قبل پاک نمی‌شود.</summary>
    [Fact]
    [Trait("UC", "UC-OWN-03")]
    public async Task UC_OWN_03_DraftSectionMerge_KeepsPriorItemCodes()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, itemCodeA) = h.SeedPublishedForm(clinicId);
        var form = h.Store.Forms.Single(f => f.Id == formId);
        var section = form.Sections.First();
        var itemB = new FormItem
        {
            FormId = formId,
            SectionId = section.Id,
            Code = "Q-SECTION-B",
            LabelFa = "سوال بخش دوم",
            InputType = "text",
            Required = false,
            SortOrder = 2
        };
        h.Store.FormItems.Add(itemB);
        form.Items.Add(itemB);
        var forms = h.CreateFormService();

        await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Draft,
            [new FormAnswerInput(itemCodeA, null, "بخش۱", null, false)], owner.Id);

        var merged = await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Draft,
            [new FormAnswerInput(itemB.Code, null, "بخش۲", null, false)], owner.Id);

        Assert.Equal(2, merged.Answers.Count);
        Assert.Contains(merged.Answers, a => a.ItemCode == itemCodeA && a.ValueRaw == "بخش۱");
        Assert.Contains(merged.Answers, a => a.ItemCode == itemB.Code && a.ValueRaw == "بخش۲");
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

    /// <summary>submit: کد غایب از payload کامل prune می‌شود؛ کدهای ارسالی می‌مانند.</summary>
    [Fact]
    [Trait("UC", "UC-OWN-04")]
    public async Task UC_OWN_04_Submit_PrunesAnswersNotInPayload()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, itemCodeA) = h.SeedPublishedForm(clinicId);
        var form = h.Store.Forms.Single(f => f.Id == formId);
        var section = form.Sections.First();
        var itemB = new FormItem
        {
            FormId = formId,
            SectionId = section.Id,
            Code = "Q-EXTRA",
            LabelFa = "اضافی",
            InputType = "text",
            Required = false,
            SortOrder = 2
        };
        h.Store.FormItems.Add(itemB);
        form.Items.Add(itemB);
        // برای submit فقط itemCodeA الزامی است؛ itemB را required=false گذاشتیم
        var forms = h.CreateFormService();

        await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Draft,
            [
                new FormAnswerInput(itemCodeA, null, "keep", null, false),
                new FormAnswerInput(itemB.Code, null, "drop", null, false)
            ], owner.Id);

        var submitted = await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Submitted,
            [new FormAnswerInput(itemCodeA, null, "keep-final", null, false)], owner.Id);

        Assert.Equal("Submitted", submitted.Status);
        Assert.Single(submitted.Answers);
        Assert.Equal(itemCodeA, submitted.Answers[0].ItemCode);
        Assert.Equal("keep-final", submitted.Answers[0].ValueRaw);
        Assert.DoesNotContain(h.Store.FormAnswers, a => a.ItemCode == itemB.Code);
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

    /// <summary>تاریخ تکمیل فقط سرور؛ مقدار کلاینت در draft دور ریخته و روی submit مهر ایران می‌خورد.</summary>
    [Fact]
    [Trait("UC", "UC-OWN-04")]
    public async Task UC_OWN_04_FormDate_StampedOnSubmit_IgnoresClientValue()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var (formId, _, itemCode) = h.SeedPublishedForm(clinicId);
        var form = h.Store.Forms.Single(f => f.Id == formId);
        var section = form.Sections.First();
        var formDate = new FormItem
        {
            FormId = formId,
            SectionId = section.Id,
            Code = "CA_M_BASE_formDate",
            LabelFa = "تاریخ تکمیل پرسشنامه",
            InputType = "date",
            Required = true,
            SortOrder = 99
        };
        h.Store.FormItems.Add(formDate);
        form.Items.Add(formDate);
        var forms = h.CreateFormService();

        await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Draft,
            [
                new FormAnswerInput(itemCode, null, "بله", null, false),
                new FormAnswerInput(formDate.Code, null, "2099-01-01", null, false)
            ], owner.Id);

        Assert.DoesNotContain(h.Store.FormAnswers, a => a.ItemCode == formDate.Code);

        var submitted = await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Submitted,
            [
                new FormAnswerInput(itemCode, null, "بله", null, false),
                new FormAnswerInput(formDate.Code, null, "2099-01-01", null, false)
            ], owner.Id);

        var stamped = Assert.Single(submitted.Answers, a => a.ItemCode == formDate.Code);
        Assert.Equal(Nabz.Application.Time.IranTime.IranDayKey(DateTime.UtcNow), stamped.ValueRaw);
        Assert.NotEqual("2099-01-01", stamped.ValueRaw);
    }
}