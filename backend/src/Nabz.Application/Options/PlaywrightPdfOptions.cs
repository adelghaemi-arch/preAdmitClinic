/*
 File: backend/src/Nabz.Application/Options/PlaywrightPdfOptions.cs
 Description: مسیر اختیاری Chromium برای رندر PDF
 Parent Dependencies: none
 */

namespace Nabz.Application.Options;

public sealed class PlaywrightPdfOptions
{
    public const string SectionName = "Playwright";

    /// <summary>مسیر اجرایی Chromium؛ خالی = browser نصب‌شدهٔ Playwright.</summary>
    public string? ExecutablePath { get; set; }
}
