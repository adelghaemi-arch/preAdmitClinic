/*
 File: backend/src/Nabz.Infrastructure/Services/IntakePdfService.cs
 Description: UC-ADM-26 — ساخت مدل/HTML و PDF Chromium برای پرسشنامه submitted
 Parent Dependencies: IContractService, IFormRepository, IClinicRepository, IFileStorage, IBrowserPdfRenderer
 */

using System.Globalization;
using System.Text.Json;
using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Pdf;
using Nabz.Domain.Entities;

namespace Nabz.Infrastructure.Services;

public sealed class IntakePdfService(
    IContractService contracts,
    IContractRepository contractRepo,
    IFormRepository forms,
    IClinicRepository clinics,
    IFileStorage files,
    IBrowserPdfRenderer pdfRenderer) : IIntakePdfService
{
    private static readonly Lazy<(string Regular, string Bold)> Fonts = new(LoadEmbeddedFonts);

    public async Task<IntakePdfFileResult> GenerateMemberIntakePdfAsync(
        Guid contractId, Guid memberId, CancellationToken ct = default)
    {
        var dto = await contracts.GetMemberSubmittedFormAsync(contractId, memberId, ct)
            ?? throw new InvalidOperationException("پاسخ تکمیل‌شده یافت نشد.");

        var contract = await contractRepo.GetByIdAsync(contractId, includeMembers: false, ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");
        var clinic = await clinics.GetByIdAsync(contract.ClinicId, ct)
            ?? await clinics.GetCurrentAsync(ct);
        var hospitalName = (clinic?.Name ?? "").Trim();
        if (string.IsNullOrWhiteSpace(hospitalName)) hospitalName = "بیمارستان";

        var form = await forms.GetByIdAsync(dto.FormId, includeStructure: true, ct);
        var model = BuildModel(dto, form, hospitalName,
            await TryLogoDataUriAsync(clinic?.LogoStorageKey, ct),
            await TryLogoDataUriAsync(contract.PartnerLogoStorageKey, ct));

        var html = IntakePdfHtmlBuilder.Build(model);
        var bytes = await pdfRenderer.RenderHtmlToPdfAsync(html, ct);
        if (bytes.Length < 5 || bytes[0] != (byte)'%' || bytes[1] != (byte)'P')
            throw new InvalidOperationException("خروجی PDF نامعتبر بود.");

        var safeName = SanitizeFileName($"پرسشنامه_{dto.FullName}_{dto.NationalId}.pdf");
        return new IntakePdfFileResult(bytes, safeName, "application/pdf");
    }

    private static IntakePdfDocumentModel BuildModel(
        MemberSubmittedFormDto dto,
        FormDefinition? form,
        string hospitalName,
        string? hospitalLogo,
        string? partnerLogo)
    {
        var answersByCode = dto.Answers
            .Where(a => !a.SkippedByRule)
            .GroupBy(a => a.ItemCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var sections = new List<IntakePdfSectionModel>();
        if (form?.Sections is { Count: > 0 } && form.Items is { Count: > 0 })
        {
            foreach (var section in form.Sections.OrderBy(s => s.SortOrder))
            {
                var rows = new List<IntakePdfRowModel>();
                foreach (var item in form.Items.Where(i => i.SectionId == section.Id).OrderBy(i => i.SortOrder))
                {
                    if (!answersByCode.TryGetValue(item.Code, out var ans)) continue;
                    var value = FormatValue(item.InputType, ans.ValueCode, ans.ValueRaw);
                    var notes = (ans.Notes ?? "").Trim();
                    var isFlag = IsRedFlag(item.CodingJson) &&
                                 string.Equals(ans.ValueCode, "yes", StringComparison.OrdinalIgnoreCase);
                    var hasNotes = notes.Length > 0 &&
                                   (item.InputType != "yn_unk" ||
                                    string.Equals(ans.ValueCode, "yes", StringComparison.OrdinalIgnoreCase));
                    rows.Add(new IntakePdfRowModel
                    {
                        Label = item.LabelFa,
                        Value = value,
                        Notes = hasNotes ? notes : "",
                        IsRedFlag = isFlag,
                        HasNotes = hasNotes
                    });
                }
                if (rows.Count == 0) continue;
                sections.Add(new IntakePdfSectionModel
                {
                    Title = section.Title,
                    FlagCount = rows.Count(r => r.IsRedFlag),
                    Rows = rows
                });
            }
        }
        else
        {
            var rows = answersByCode.Values.Select(a => new IntakePdfRowModel
            {
                Label = a.ItemCode,
                Value = FormatValue("text", a.ValueCode, a.ValueRaw),
                Notes = (a.Notes ?? "").Trim(),
                IsRedFlag = false,
                HasNotes = !string.IsNullOrWhiteSpace(a.Notes)
            }).ToList();
            if (rows.Count > 0)
            {
                sections.Add(new IntakePdfSectionModel
                {
                    Title = "پاسخ‌ها",
                    FlagCount = 0,
                    Rows = rows
                });
            }
        }

        var fonts = Fonts.Value;
        var ageLabel = dto.Age is int age ? $"{PersianPdfDigits.ToFa(age)} سال" : "—";
        var submitted = dto.SubmittedAt is DateTime dt
            ? PersianPdfDigits.ToFa(dt.ToLocalTime().ToString("yyyy/MM/dd HH:mm", CultureInfo.InvariantCulture))
            : "—";

        return new IntakePdfDocumentModel
        {
            HospitalLabel = hospitalName,
            HospitalLogoDataUri = hospitalLogo,
            PartnerLogoDataUri = partnerLogo,
            OrganizationName = string.IsNullOrWhiteSpace(dto.OrganizationName) ? "—" : dto.OrganizationName.Trim(),
            FullName = dto.FullName,
            NationalId = dto.NationalId,
            AgeLabel = ageLabel,
            Gender = string.IsNullOrWhiteSpace(dto.Gender) ? "—" : dto.Gender!,
            FormTitle = string.IsNullOrWhiteSpace(dto.FormTitle) ? "پرسشنامه پیش‌پذیرش" : dto.FormTitle,
            FormCode = string.IsNullOrWhiteSpace(dto.FormCode) ? "—" : dto.FormCode,
            SubmittedLabel = submitted,
            Sections = sections,
            TotalAnswers = sections.Sum(s => s.Rows.Count),
            FlagTotal = sections.Sum(s => s.FlagCount),
            FontRegularDataUri = fonts.Regular,
            FontBoldDataUri = fonts.Bold
        };
    }

    private async Task<string?> TryLogoDataUriAsync(string? storageKey, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(storageKey)) return null;
        try
        {
            var opened = await files.OpenReadAsync(storageKey, ct);
            if (opened is null) return null;
            await using var stream = opened.Value.Stream;
            await using var ms = new MemoryStream();
            await stream.CopyToAsync(ms, ct);
            var bytes = ms.ToArray();
            if (bytes.Length == 0) return null;
            var mime = string.IsNullOrWhiteSpace(opened.Value.ContentType)
                ? "image/png"
                : opened.Value.ContentType;
            return $"data:{mime};base64,{Convert.ToBase64String(bytes)}";
        }
        catch
        {
            return null;
        }
    }

    private static string FormatValue(string inputType, string? valueCode, string? valueRaw)
    {
        if (inputType == "yn_unk")
        {
            return valueCode?.ToLowerInvariant() switch
            {
                "yes" => "بله",
                "no" => "خیر",
                "unknown" => "نمی‌دانم",
                _ => string.IsNullOrWhiteSpace(valueRaw) ? "—" : valueRaw.Trim()
            };
        }
        var raw = (valueRaw ?? "").Trim();
        return raw.Length == 0 ? "—" : raw;
    }

    private static bool IsRedFlag(string? codingJson)
    {
        if (string.IsNullOrWhiteSpace(codingJson)) return false;
        try
        {
            using var doc = JsonDocument.Parse(codingJson);
            if (doc.RootElement.TryGetProperty("redFlagOnYes", out var rf) && rf.ValueKind == JsonValueKind.True)
                return true;
            if (doc.RootElement.TryGetProperty("aiTags", out var tags) && tags.ValueKind == JsonValueKind.Array)
            {
                foreach (var t in tags.EnumerateArray())
                {
                    if (t.ValueKind == JsonValueKind.String &&
                        string.Equals(t.GetString(), "red_flag", StringComparison.OrdinalIgnoreCase))
                        return true;
                }
            }
        }
        catch
        {
            /* JSON خراب = بدون هشدار */
        }
        return false;
    }

    private static (string Regular, string Bold) LoadEmbeddedFonts()
    {
        static string? Load(string resourceLeaf)
        {
            var asm = typeof(IntakePdfService).Assembly;
            var name = asm.GetManifestResourceNames()
                .FirstOrDefault(n => n.EndsWith(resourceLeaf, StringComparison.OrdinalIgnoreCase));
            if (name is null) return null;
            using var stream = asm.GetManifestResourceStream(name);
            if (stream is null) return null;
            using var ms = new MemoryStream();
            stream.CopyTo(ms);
            return $"data:font/ttf;base64,{Convert.ToBase64String(ms.ToArray())}";
        }

        return (
            Load("Vazirmatn-Regular.ttf") ?? "",
            Load("Vazirmatn-Bold.ttf") ?? "");
    }

    private static string SanitizeFileName(string name)
    {
        foreach (var c in Path.GetInvalidFileNameChars())
            name = name.Replace(c, '_');
        return string.IsNullOrWhiteSpace(name) ? "intake.pdf" : name;
    }
}
