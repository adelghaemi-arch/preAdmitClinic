/*
 File: backend/src/Nabz.Application/Identity/CorporatePathwayStationCatalog.cs
 Description: ترتیب ایستگاه‌ها و معیار جمعیتی seed چهار مسیر سازمانی (پروتکل کلینیک)
 Parent Dependencies: HealthPathwayTitles
 */

namespace Nabz.Application.Identity;

/// <summary>تعریف یک ایستگاه در کاتالوگ seed سازمانی.</summary>
public sealed record CorporatePathwayStationSpec(
    string RoomCode,
    string TitleFa,
    int StepOrder,
    bool IsOptional = false);

/// <summary>متادیتای یک مسیر سازمانی seed (کتابخانه = خود PathwayDefinition).</summary>
public sealed record CorporatePathwayCatalogEntry(
    string Code,
    string Description,
    int EstimatedTotalMinutes,
    string Gender,
    int? MinAge,
    int? MaxAge,
    IReadOnlyList<CorporatePathwayStationSpec> Stations);

/// <summary>
/// منبع حقیقت ترتیب ایستگاه‌های CORP_* برای seed و تست — Guid کتابخانه جداست.
/// HOSP_MEAL اختیاری (بسته به شلوغی صف)؛ STRESS/PAP شرطی بالینی.
/// </summary>
public static class CorporatePathwayStationCatalog
{
    public const string HospMeal = "HOSP_MEAL";

    public static readonly IReadOnlyList<CorporatePathwayCatalogEntry> Entries =
    [
        new(
            HealthPathwayTitles.CorpMenLt40,
            "آزمایش، سونو، پذیرایی، نوار قلب، سپس پایش غیرحضوری پس از جواب آزمایش",
            90,
            "مرد",
            null,
            39,
            [
                new("LAB", "آزمایشگاه", 1),
                new("US_ABD", "سونوگرافی شکم و لگن", 2),
                new(HospMeal, "پذیرایی / صبحانه (پس از سونو؛ بسته به شلوغی صف)", 3, IsOptional: true),
                new("ECG", "نوار قلب", 4),
                new("REMOTE_REVIEW", "ویزیت غیرحضوری و بررسی پرونده (پس از جواب آزمایش)", 5),
            ]),
        new(
            HealthPathwayTitles.CorpMenGe40,
            "آزمایش، سونو، پذیرایی، نوار قلب، ویزیت قلب و اکو؛ تست ورزش در صورت صلاح‌دید؛ پایش غیرحضوری",
            120,
            "مرد",
            40,
            null,
            [
                new("LAB", "آزمایشگاه", 1),
                new("US_ABD", "سونوگرافی شکم و لگن", 2),
                new(HospMeal, "پذیرایی / صبحانه (پس از سونو؛ بسته به شلوغی صف)", 3, IsOptional: true),
                new("ECG", "نوار قلب", 4),
                new("CARDIO", "ویزیت قلب و اکو", 5),
                new("STRESS", "تست ورزش", 6, IsOptional: true),
                new("REMOTE_REVIEW", "ویزیت غیرحضوری و بررسی پرونده (پس از جواب آزمایش)", 7),
            ]),
        new(
            HealthPathwayTitles.CorpWomenLt40,
            "آزمایش، سونو شکم/لگن و برست، پذیرایی، نوار قلب، ویزیت زنان؛ پاپ در صورت نیاز؛ پایش غیرحضوری",
            120,
            "زن",
            null,
            39,
            [
                new("LAB", "آزمایشگاه", 1),
                new("US_ABD", "سونوگرافی شکم و لگن", 2),
                new("US_BREAST", "سونوگرافی پستان", 3),
                new(HospMeal, "پذیرایی / صبحانه (پس از سونو؛ بسته به شلوغی صف)", 4, IsOptional: true),
                new("ECG", "نوار قلب", 5),
                new("GYN", "ویزیت متخصص زنان", 6),
                new("PAP", "پاپ اسمیر", 7, IsOptional: true),
                new("REMOTE_REVIEW", "ویزیت غیرحضوری و بررسی پرونده (پس از جواب آزمایش)", 8),
            ]),
        new(
            HealthPathwayTitles.CorpWomenGe40,
            "مسیر کامل بانوان ۴۰+ شامل برست، پذیرایی، قلب/اکو و زنان؛ تست ورزش و پاپ اختیاری؛ پایش غیرحضوری",
            160,
            "زن",
            40,
            null,
            [
                new("LAB", "آزمایشگاه", 1),
                new("US_ABD", "سونوگرافی شکم و لگن", 2),
                new("US_BREAST", "سونوگرافی پستان", 3),
                new(HospMeal, "پذیرایی / صبحانه (پس از سونو؛ بسته به شلوغی صف)", 4, IsOptional: true),
                new("ECG", "نوار قلب", 5),
                new("CARDIO", "ویزیت قلب و اکو", 6),
                new("STRESS", "تست ورزش", 7, IsOptional: true),
                new("GYN", "ویزیت متخصص زنان", 8),
                new("PAP", "پاپ اسمیر", 9, IsOptional: true),
                new("REMOTE_REVIEW", "ویزیت غیرحضوری و بررسی پرونده (پس از جواب آزمایش)", 10),
            ]),
    ];

    public static CorporatePathwayCatalogEntry? Find(string code) =>
        Entries.FirstOrDefault(e => string.Equals(e.Code, code, StringComparison.OrdinalIgnoreCase));

    public static IReadOnlyList<string> RoomCodes(string pathwayCode) =>
        Find(pathwayCode)?.Stations.OrderBy(s => s.StepOrder).Select(s => s.RoomCode).ToList()
        ?? [];
}
