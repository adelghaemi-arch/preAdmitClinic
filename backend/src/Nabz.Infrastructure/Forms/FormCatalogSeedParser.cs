/*
 File: backend/src/Nabz.Infrastructure/Forms/FormCatalogSeedParser.cs
 Description: پارس form-catalog.seed.json به FormPackageDto
 Parent Dependencies: FormPackageDto
 */

using System.Text.Json;
using Nabz.Application.Interfaces;

namespace Nabz.Infrastructure.Forms;

public static class FormCatalogSeedParser
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static FormPackageDto Parse(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var schemaVersion = root.TryGetProperty("schemaVersion", out var sv) && sv.TryGetInt32(out var n) ? n : 2;
        if (!root.TryGetProperty("forms", out var formsEl) || formsEl.ValueKind != JsonValueKind.Array)
            throw new InvalidOperationException("کاتالوگ فرم فاقد آرایه forms است.");

        var forms = new List<FormPackageFormDto>();
        foreach (var f in formsEl.EnumerateArray())
        {
            var code = f.GetProperty("code").GetString() ?? "";
            var title = f.GetProperty("title").GetString() ?? "";
            var version = f.TryGetProperty("version", out var ver) && ver.TryGetInt32(out var vv) ? vv : 1;
            var status = f.TryGetProperty("status", out var st) ? st.GetString() ?? "published" : "published";
            var sortOrder = f.TryGetProperty("sortOrder", out var so) && so.TryGetInt32(out var ss) ? ss : 0;
            var warning = f.TryGetProperty("warningText", out var wt) ? wt.GetString() : null;
            var audienceJson = f.TryGetProperty("targetAudience", out var ta)
                ? ta.GetRawText()
                : "{}";

            var sectionsById = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var sections = new List<FormPackageSectionDto>();
            if (f.TryGetProperty("sections", out var secs) && secs.ValueKind == JsonValueKind.Array)
            {
                foreach (var s in secs.EnumerateArray())
                {
                    var sid = s.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
                    var scode = s.GetProperty("code").GetString() ?? "";
                    if (!string.IsNullOrWhiteSpace(sid)) sectionsById[sid] = scode;
                    sections.Add(new FormPackageSectionDto(
                        scode,
                        s.GetProperty("title").GetString() ?? "",
                        s.TryGetProperty("sortOrder", out var sso) && sso.TryGetInt32(out var ssi) ? ssi : 0,
                        s.TryGetProperty("timeWindowHint", out var tw) ? tw.GetString() : null,
                        s.TryGetProperty("guideText", out var gt) ? gt.GetString() : null));
                }
            }

            var items = new List<FormPackageItemDto>();
            if (f.TryGetProperty("items", out var itemsEl) && itemsEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var it in itemsEl.EnumerateArray())
                {
                    var sectionId = it.TryGetProperty("sectionId", out var secId) ? secId.GetString() ?? "" : "";
                    var sectionCode = sectionsById.GetValueOrDefault(sectionId, "");
                    if (string.IsNullOrWhiteSpace(sectionCode) && it.TryGetProperty("sectionCode", out var scEl))
                        sectionCode = scEl.GetString() ?? "";

                    var visibility = it.TryGetProperty("visibilityRules", out var vr) ? vr.GetRawText() : "[]";
                    var selectOpts = it.TryGetProperty("selectOptions", out var soEl) && soEl.ValueKind != JsonValueKind.Null
                        ? soEl.GetRawText()
                        : null;
                    var coding = it.TryGetProperty("coding", out var codingEl) ? codingEl.GetRawText() : "{}";

                    items.Add(new FormPackageItemDto(
                        sectionCode,
                        it.GetProperty("code").GetString() ?? "",
                        it.GetProperty("labelFa").GetString() ?? "",
                        it.TryGetProperty("inputType", out var itEl) ? itEl.GetString() ?? "yn_unk" : "yn_unk",
                        it.TryGetProperty("required", out var req) && req.ValueKind == JsonValueKind.True,
                        it.TryGetProperty("sortOrder", out var iso) && iso.TryGetInt32(out var isi) ? isi : 0,
                        visibility,
                        it.TryGetProperty("helpText", out var ht) ? ht.GetString() : null,
                        it.TryGetProperty("notesPolicy", out var np) ? np.GetString() ?? "never" : "never",
                        it.TryGetProperty("prefillFromPatient", out var pf) && pf.ValueKind != JsonValueKind.Null ? pf.GetString() : null,
                        it.TryGetProperty("readOnlyIfPrefill", out var ro) && ro.ValueKind == JsonValueKind.True,
                        selectOpts,
                        coding));
                }
            }

            forms.Add(new FormPackageFormDto(code, title, version, status, sortOrder, warning, audienceJson, sections, items));
        }

        return new FormPackageDto(schemaVersion, forms);
    }
}
