/*
 File: backend/src/Nabz.Application/Options/FrontendUrlsOptions.cs
 Description: URLهای عمومی فرانت برای ساخت لینک دعوت در توکن SMS
 Parent Dependencies: none
 */

namespace Nabz.Application.Options;

public sealed class FrontendUrlsOptions
{
    public const string SectionName = "FrontendUrls";

    /// <summary>پایهٔ my (مثلاً https://my.nafasmed.ir) — برای invite_url</summary>
    public string? My { get; set; }

    public string? News { get; set; }
}
