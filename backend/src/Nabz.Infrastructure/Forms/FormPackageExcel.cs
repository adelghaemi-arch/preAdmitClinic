/*
 File: backend/src/Nabz.Infrastructure/Forms/FormPackageExcel.cs
 Description: تبدیل بسته پرسشنامه ↔ Excel (Forms/Sections/Items/VisibilityRules)
 Parent Dependencies: ClosedXML, FormPackageDto
 */

using System.Text.Json;
using ClosedXML.Excel;
using Nabz.Application.Interfaces;

namespace Nabz.Infrastructure.Forms;

public static class FormPackageExcel
{
    public static byte[] ToExcel(FormPackageDto package)
    {
        using var wb = new XLWorkbook();
        var forms = wb.Worksheets.Add("Forms");
        forms.Cell(1, 1).InsertTable(package.Forms.Select(f => new
        {
            f.Code,
            f.Title,
            f.Version,
            f.Status,
            f.SortOrder,
            WarningText = f.WarningText ?? "",
            TargetAudienceJson = f.TargetAudienceJson
        }));

        var sections = wb.Worksheets.Add("Sections");
        sections.Cell(1, 1).InsertTable(
            package.Forms.SelectMany(f => f.Sections.Select(s => new
            {
                FormCode = f.Code,
                s.Code,
                s.Title,
                s.SortOrder,
                TimeWindowHint = s.TimeWindowHint ?? "",
                GuideText = s.GuideText ?? ""
            })));

        var items = wb.Worksheets.Add("Items");
        items.Cell(1, 1).InsertTable(
            package.Forms.SelectMany(f => f.Items.Select(i => new
            {
                FormCode = f.Code,
                i.SectionCode,
                i.Code,
                i.LabelFa,
                i.InputType,
                i.Required,
                i.SortOrder,
                HelpText = i.HelpText ?? "",
                i.NotesPolicy,
                PrefillFromPatient = i.PrefillFromPatient ?? "",
                i.ReadOnlyIfPrefill,
                SelectOptionsJson = i.SelectOptionsJson ?? "",
                CodingJson = i.CodingJson
            })));

        var rules = wb.Worksheets.Add("VisibilityRules");
        var ruleRows = new List<object>();
        foreach (var f in package.Forms)
        {
            foreach (var item in f.Items)
            {
                using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(item.VisibilityRulesJson) ? "[]" : item.VisibilityRulesJson);
                if (doc.RootElement.ValueKind != JsonValueKind.Array) continue;
                foreach (var rule in doc.RootElement.EnumerateArray())
                {
                    ruleRows.Add(new
                    {
                        FormCode = f.Code,
                        ItemCode = item.Code,
                        Field = rule.TryGetProperty("field", out var field) ? field.GetString() ?? "" : "",
                        Op = rule.TryGetProperty("op", out var op) ? op.GetString() ?? "" : "",
                        Value = rule.TryGetProperty("value", out var val)
                            ? (val.ValueKind == JsonValueKind.Array ? string.Join("، ", val.EnumerateArray().Select(x => x.ToString())) : val.ToString())
                            : ""
                    });
                }
            }
        }
        if (ruleRows.Count == 0)
            ruleRows.Add(new { FormCode = "", ItemCode = "", Field = "", Op = "", Value = "" });
        rules.Cell(1, 1).InsertTable(ruleRows);

        var guide = wb.Worksheets.Add("راهنما");
        guide.Cell(1, 1).Value = "بسته پرسشنامه پیش‌پذیرش — مرد/زن، سن، تاهل روی VisibilityRules";
        guide.Cell(2, 1).Value = "Import از شیت‌های Forms / Sections / Items / VisibilityRules انجام می‌شود.";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public static FormPackageDto FromExcel(Stream stream)
    {
        using var wb = new XLWorkbook(stream);
        var formsSheet = wb.Worksheet("Forms");
        var sectionsSheet = wb.Worksheet("Sections");
        var itemsSheet = wb.Worksheet("Items");
        var rulesSheet = wb.Worksheets.FirstOrDefault(w => w.Name == "VisibilityRules");

        var formsRange = formsSheet.RangeUsed() ?? throw new InvalidOperationException("شیت Forms خالی است.");
        var formRows = formsRange.RowsUsed().Skip(1).ToList();
        if (formRows.Count == 0) throw new InvalidOperationException("هیچ فرمی در Excel نیست.");

        var sectionRows = (sectionsSheet.RangeUsed()?.RowsUsed().Skip(1) ?? Enumerable.Empty<IXLRangeRow>()).ToList();
        var itemRows = (itemsSheet.RangeUsed()?.RowsUsed().Skip(1) ?? Enumerable.Empty<IXLRangeRow>()).ToList();
        var ruleRows = (rulesSheet?.RangeUsed()?.RowsUsed().Skip(1) ?? Enumerable.Empty<IXLRangeRow>()).ToList();

        var forms = new List<FormPackageFormDto>();
        foreach (var row in formRows)
        {
            var code = Cell(row, 1);
            if (string.IsNullOrWhiteSpace(code)) continue;
            var sections = sectionRows
                .Where(r => Cell(r, 1) == code)
                .Select(r => new FormPackageSectionDto(Cell(r, 2), Cell(r, 3), Int(r, 4), NullIfEmpty(Cell(r, 5)), NullIfEmpty(Cell(r, 6))))
                .ToList();

            var items = new List<FormPackageItemDto>();
            foreach (var ir in itemRows.Where(r => Cell(r, 1) == code))
            {
                var itemCode = Cell(ir, 3);
                var itemRules = ruleRows
                    .Where(r => Cell(r, 1) == code && Cell(r, 2) == itemCode && !string.IsNullOrWhiteSpace(Cell(r, 3)))
                    .Select(r => BuildRuleJson(Cell(r, 3), Cell(r, 4), Cell(r, 5)))
                    .Where(x => x is not null)
                    .ToList();
                var visibility = itemRules.Count == 0 ? "[]" : "[" + string.Join(",", itemRules) + "]";
                items.Add(new FormPackageItemDto(
                    Cell(ir, 2), itemCode, Cell(ir, 4), Cell(ir, 5), Bool(ir, 6), Int(ir, 7),
                    visibility, NullIfEmpty(Cell(ir, 8)), string.IsNullOrWhiteSpace(Cell(ir, 9)) ? "never" : Cell(ir, 9),
                    NullIfEmpty(Cell(ir, 10)), Bool(ir, 11), NullIfEmpty(Cell(ir, 12)),
                    string.IsNullOrWhiteSpace(Cell(ir, 13)) ? "{}" : Cell(ir, 13)));
            }

            forms.Add(new FormPackageFormDto(
                code, Cell(row, 2), Int(row, 3) is var v and > 0 ? v : 1,
                string.IsNullOrWhiteSpace(Cell(row, 4)) ? "published" : Cell(row, 4),
                Int(row, 5), NullIfEmpty(Cell(row, 6)),
                string.IsNullOrWhiteSpace(Cell(row, 7)) ? "{}" : Cell(row, 7),
                sections, items));
        }

        return new FormPackageDto(2, forms);
    }

    private static string? BuildRuleJson(string field, string op, string value)
    {
        if (string.IsNullOrWhiteSpace(field) || string.IsNullOrWhiteSpace(op)) return null;
        object valueObj;
        if (value.Contains('،') || value.Contains(','))
        {
            var parts = value.Split(['،', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            valueObj = parts;
        }
        else if (int.TryParse(value, out var n)) valueObj = n;
        else valueObj = value;

        return JsonSerializer.Serialize(new { field, op, value = valueObj });
    }

    private static string Cell(IXLRangeRow row, int col) => row.Cell(col).GetString().Trim();
    private static string? NullIfEmpty(string s) => string.IsNullOrWhiteSpace(s) ? null : s;
    private static int Int(IXLRangeRow row, int col) => int.TryParse(Cell(row, col), out var n) ? n : 0;
    private static bool Bool(IXLRangeRow row, int col)
    {
        var s = Cell(row, col).ToLowerInvariant();
        return s is "true" or "1" or "yes" or "بله";
    }
}
