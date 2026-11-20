/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm19_FormMatrixCatalogTests.cs
 Description: UC-ADM-19 — کاتالوگ ماتریس CA + FormAudienceEvaluator
 Parent Dependencies: ServiceHarness, FormAudienceEvaluator
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Forms;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm19_FormMatrixCatalogTests
{
    private static FormPackageDto MiniCaCatalog() => new(
        2,
        [
            new FormPackageFormDto(
                "cancer_screening_male_v02", "غربالگری آقایان", 2, "published", 1, null,
                """{"gender":"مرد","ageMin":18}""",
                [new FormPackageSectionDto("CA_M_BASE", "پایه", 1, null, null)],
                [
                    new FormPackageItemDto(
                        "CA_M_BASE", "CA_M_Q1", "سوال عمومی مرد", "yn_unk", true, 1,
                        "[]", null, "never", null, false, null, "{}"),
                    new FormPackageItemDto(
                        "CA_M_BASE", "CA_M_Q68", "PSA ≥۵۰", "yn_unk", false, 2,
                        """[{"field":"age","op":"gte","value":50}]""", null, "never", null, false, null, "{}")
                ]),
            new FormPackageFormDto(
                "cancer_screening_female_v02", "غربالگری بانوان", 2, "published", 2, null,
                """{"gender":"زن","ageMin":18}""",
                [new FormPackageSectionDto("CA_F_BASE", "پایه", 1, null, null)],
                [
                    new FormPackageItemDto(
                        "CA_F_BASE", "CA_F_Q1", "سوال عمومی زن", "yn_unk", true, 1,
                        "[]", null, "never", null, false, null, "{}"),
                    new FormPackageItemDto(
                        "CA_F_BASE", "CA_F_Q19", "بارداری — متأهل", "yn_unk", false, 2,
                        """[{"field":"maritalStatus","op":"in","value":["متأهل","ازدواج‌کرده"]}]""",
                        null, "never", null, false, null, "{}")
                ])
        ]);

    [Fact]
    [Trait("UC", "UC-ADM-19")]
    public async Task UC_ADM_19_HappyPath_ImportCatalog_BothPublished()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var forms = h.CreateFormService();

        var result = await forms.ImportPackageAsync(clinicId, MiniCaCatalog());
        Assert.Equal(2, result.ImportedForms);

        var structures = await forms.ListStructuresAsync(clinicId);
        Assert.Equal(2, structures.Count);
        Assert.All(structures, s => Assert.Equal("Published", s.Status));
        Assert.Contains(structures, s => s.Code == "cancer_screening_male_v02");
        Assert.Contains(structures, s => s.Code == "cancer_screening_female_v02");
    }

    [Fact]
    [Trait("UC", "UC-ADM-19")]
    public void UC_ADM_19_Evaluator_GenderHame_IsWildcard()
    {
        var form = new FormDefinition
        {
            TargetAudienceJson = """{"gender":"همه","ageMin":18}"""
        };
        var patient = new Patient { Age = 25, Gender = "زن" };
        Assert.True(FormAudienceEvaluator.MatchesFormAudience(form, patient, out var reason));
        Assert.Null(reason);
    }

    [Fact]
    [Trait("UC", "UC-ADM-19")]
    [Trait("UC", "UC-OWN-03")]
    public void UC_ADM_19_Evaluator_AgeMin_RejectsUnderage()
    {
        var form = new FormDefinition
        {
            TargetAudienceJson = """{"gender":"مرد","ageMin":18}"""
        };
        var patient = new Patient { Age = 15, Gender = "مرد" };
        Assert.False(FormAudienceEvaluator.MatchesFormAudience(form, patient, out var reason));
        Assert.Contains("18", reason!);
    }

    [Fact]
    [Trait("UC", "UC-ADM-19")]
    [Trait("UC", "UC-OWN-03")]
    public void UC_ADM_19_Evaluator_MaritalAndAgeVisibility()
    {
        var marriedItem = new FormItem
        {
            VisibilityRulesJson = """[{"field":"maritalStatus","op":"in","value":["متأهل","ازدواج‌کرده"]}]"""
        };
        var ageItem = new FormItem
        {
            VisibilityRulesJson = """[{"field":"age","op":"gte","value":50}]"""
        };
        var answers = new Dictionary<string, string?>();

        var married = new Patient { Age = 40, Gender = "زن", MaritalStatus = "متأهل" };
        Assert.True(FormAudienceEvaluator.IsItemVisible(marriedItem, married, answers));
        Assert.False(FormAudienceEvaluator.IsItemVisible(ageItem, married, answers));

        var singleYoung = new Patient { Age = 22, Gender = "زن", MaritalStatus = "مجرد" };
        Assert.False(FormAudienceEvaluator.IsItemVisible(marriedItem, singleYoung, answers));

        var older = new Patient { Age = 55, Gender = "مرد", MaritalStatus = "مجرد" };
        Assert.True(FormAudienceEvaluator.IsItemVisible(ageItem, older, answers));
    }

    [Fact]
    [Trait("UC", "UC-OWN-03")]
    public async Task UC_OWN_03_Resolve_RejectsUnderAgeMin()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var forms = h.CreateFormService();
        await forms.ImportPackageAsync(clinicId, MiniCaCatalog());

        var (patient, _) = h.SeedPatient(clinicId);
        patient.Age = 16;
        patient.Gender = "مرد";

        var male = h.Store.Forms.Single(f => f.Code == "cancer_screening_male_v02");
        var resolved = await forms.ResolveForPatientAsync(male.Id, patient.Id);
        Assert.NotNull(resolved.RejectReason);
        Assert.Empty(resolved.VisibleItemCodes);
    }
}
