/*
 File: backend/src/Nabz.Application/Identity/HealthPathwayTitles.cs
 Description: نگاشت کد مسیر سلامتی سازمانی به عنوان فارسی نمایشی
 Parent Dependencies: —
 */

namespace Nabz.Application.Identity;

/// <summary>عنوان نمایشی مسیرهای سلامتی — کد انگلیسی در UI ممنوع است.</summary>
public static class HealthPathwayTitles
{
    public const string CorpMenLt40 = "CORP_MEN_LT40";
    public const string CorpMenGe40 = "CORP_MEN_GE40";
    public const string CorpWomenLt40 = "CORP_WOMEN_LT40";
    public const string CorpWomenGe40 = "CORP_WOMEN_GE40";

    /// <summary>پیش‌فرض وقتی جنسیت/سن ناقص است — کم‌حجم‌ترین مسیر آقایان.</summary>
    public const string DefaultCode = CorpMenLt40;

    public static readonly IReadOnlyDictionary<string, string> Titles = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        [CorpMenLt40] = "چکاپ آقایان زیر ۴۰ سال",
        [CorpMenGe40] = "چکاپ آقایان ۴۰ سال به بالا",
        [CorpWomenLt40] = "چکاپ بانوان زیر ۴۰ سال",
        [CorpWomenGe40] = "چکاپ بانوان ۴۰ سال به بالا",
    };

    /// <summary>اگر عنوان خالی یا برابر خودِ کد باشد، عنوان فارسی شناخته‌شده برمی‌گردد.</summary>
    public static string Resolve(string? code, string? existingTitle = null)
    {
        var c = (code ?? "").Trim();
        var t = (existingTitle ?? "").Trim();
        if (t.Length > 0 && !string.Equals(t, c, StringComparison.OrdinalIgnoreCase))
            return t;

        if (c.Length == 0)
            return Titles[DefaultCode];

        if (Titles.TryGetValue(c, out var known))
            return known;

        return t.Length > 0 ? t : c;
    }
}
