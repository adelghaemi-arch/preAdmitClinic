/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm09_14_FormAdminTests.cs
 Description: UC-ADM-09 تا 11 — مدیریت فرم (upsert، publish، reorder)
 Parent Dependencies: ServiceHarness
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm09_14_FormAdminTests
{
    [Fact]
    [Trait("UC", "UC-ADM-09")]
    public async Task UC_ADM_09_HappyPath_UpsertFormAndStructure()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var forms = h.CreateFormService();

        var summary = await forms.UpsertFormAsync(clinicId, null, "ADM-FORM", "فرم ادمین", null, "{}");
        await forms.UpsertStructureAsync(summary.Id,
        [
            new FormSectionUpsert(null, "S1", "بخش", 1, null)
        ],
        [
            new FormItemUpsert(null, "S1", "I1", "سوال", "text", false, 1, null, null, null, "{}")
        ]);

        var structure = await forms.GetStructureAsync(summary.Id);

        Assert.NotNull(structure);
        Assert.Single(structure!.Sections);
        Assert.Single(structure.Items);
    }

    [Fact]
    [Trait("UC", "UC-ADM-10")]
    public async Task UC_ADM_10_HappyPath_PublishForm()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var forms = h.CreateFormService();
        var summary = await forms.UpsertFormAsync(clinicId, null, "PUB", "انتشار", null, "{}");

        await forms.PublishFormAsync(summary.Id);

        var form = h.Store.Forms.Single(f => f.Id == summary.Id);
        Assert.Equal(FormPublishStatus.Published, form.Status);
    }

    [Fact]
    [Trait("UC", "UC-ADM-11")]
    public async Task UC_ADM_11_HappyPath_ReorderItems()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (formId, itemId, _) = h.SeedPublishedForm(clinicId);
        var forms = h.CreateFormService();

        await forms.ReorderItemsAsync(formId, [(itemId, 99)]);

        var item = h.Store.FormItems.Single(i => i.Id == itemId);
        Assert.Equal(99, item.SortOrder);
    }
}