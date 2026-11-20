/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm18_FormPackageIoTests.cs
 Description: UC-ADM-18 — خروجی/ورود بسته پرسشنامه JSON و Excel
 Parent Dependencies: ServiceHarness, IFormService
 */

using System.Text;
using Nabz.Application.Interfaces;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm18_FormPackageIoTests
{
    private static FormPackageDto SamplePackage(string code = "CA_PKG_TEST") => new(
        2,
        [
            new FormPackageFormDto(
                code, "فرم تست بسته", 1, "published", 1, "هشدار تست",
                """{"gender":"مرد","ageMin":18,"ageMax":null}""",
                [new FormPackageSectionDto("SEC_BASE", "پایه", 1, null, null)],
                [
                    new FormPackageItemDto(
                        "SEC_BASE", "Q1", "سوال عمومی", "yn_unk", true, 1,
                        "[]", null, "never", null, false, null, "{}"),
                    new FormPackageItemDto(
                        "SEC_BASE", "Q_AGE50", "سوال ≥۵۰", "yn_unk", false, 2,
                        """[{"field":"age","op":"gte","value":50}]""", null, "never", null, false, null, "{}")
                ])
        ]);

    [Fact]
    [Trait("UC", "UC-ADM-18")]
    public async Task UC_ADM_18_HappyPath_JsonRoundTrip_PreservesVisibility()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var forms = h.CreateFormService();

        var imported = await forms.ImportPackageAsync(clinicId, SamplePackage());
        Assert.Equal(1, imported.ImportedForms);
        Assert.Contains("CA_PKG_TEST", imported.Codes);

        var exported = await forms.ExportPackageAsync(clinicId);
        Assert.Equal(2, exported.SchemaVersion);
        var form = Assert.Single(exported.Forms);
        Assert.Equal("CA_PKG_TEST", form.Code);
        Assert.Contains("ageMin", form.TargetAudienceJson);
        var ageItem = form.Items.Single(i => i.Code == "Q_AGE50");
        Assert.Contains("\"field\":\"age\"", ageItem.VisibilityRulesJson);
        Assert.Contains("gte", ageItem.VisibilityRulesJson);
    }

    [Fact]
    [Trait("UC", "UC-ADM-18")]
    public async Task UC_ADM_18_HappyPath_ExcelRoundTrip()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var forms = h.CreateFormService();

        await forms.ImportPackageAsync(clinicId, SamplePackage("CA_XLSX"));
        var bytes = await forms.ExportPackageExcelAsync(clinicId);
        Assert.True(bytes.Length > 100);

        var clinic2 = h.SeedClinic("کلینیک دوم");
        await using var stream = new MemoryStream(bytes);
        var result = await forms.ImportPackageExcelAsync(clinic2, stream);
        Assert.Equal(1, result.ImportedForms);
        Assert.Contains("CA_XLSX", result.Codes);
    }

    [Fact]
    [Trait("UC", "UC-ADM-18")]
    public async Task UC_ADM_18_Nx_EmptyPackage_Throws()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var forms = h.CreateFormService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            forms.ImportPackageAsync(clinicId, new FormPackageDto(2, [])));
    }

    [Fact]
    [Trait("UC", "UC-ADM-18")]
    public async Task UC_ADM_18_Nx_InvalidGender_Throws()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var forms = h.CreateFormService();
        var bad = new FormPackageDto(2,
        [
            new FormPackageFormDto(
                "BAD_G", "بد", 1, "draft", 1, null,
                """{"gender":"نامشخص"}""",
                [new FormPackageSectionDto("S1", "س", 1, null, null)],
                [new FormPackageItemDto("S1", "I1", "سوال", "text", false, 1, "[]", null, "never", null, false, null, "{}")])
        ]);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            forms.ImportPackageAsync(clinicId, bad));
        Assert.Contains("جنسیت", ex.Message);
    }
}
