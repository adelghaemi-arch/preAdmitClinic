/*
 File: backend/src/Nabz.Application/Options/FrontendUrlsOptions.cs
 Description: URLهای عمومی فرانت برای CORS و لینک دعوت؛ My/News می‌توانند لیست کاما‌جدا باشند
 Parent Dependencies: none
 */

namespace Nabz.Application.Options;

public sealed class FrontendUrlsOptions
{
    public const string SectionName = "FrontendUrls";

    /// <summary>
    /// Origin(های) my — یک یا چند تا با , یا ؛ (نمونه: https://my.example.ir).
    /// برای invite_url فقط اولین origin استفاده می‌شود.
    /// </summary>
    public string? My { get; set; }

    /// <summary>Origin(های) news — همان قرارداد لیست برای CORS</summary>
    public string? News { get; set; }

    /// <summary>اولین origin معتبر My برای ساخت لینک دعوت</summary>
    public string? PrimaryMy => ParseOrigins(My).FirstOrDefault();

    /// <summary>شکستن رشتهٔ env به originهای تمیز (بدون / انتهایی)</summary>
    public static IReadOnlyList<string> ParseOrigins(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return [];

        return raw
            .Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(o => o.TrimEnd('/'))
            .Where(o => o.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }
}
