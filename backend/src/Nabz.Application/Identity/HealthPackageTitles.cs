/*
 File: backend/src/Nabz.Application/Identity/HealthPackageTitles.cs
 Description: نگاشت کد بسته سلامت به عنوان فارسی نمایشی
 Parent Dependencies: —
 */

namespace Nabz.Application.Identity;

/// <summary>عنوان نمایشی بسته‌ها — کد انگلیسی در UI ممنوع است.</summary>
public static class HealthPackageTitles
{
    public const string FullCheckupCode = "FULL_CHECKUP";
    public const string FullCheckupTitle = "چکاپ جامع";

    /// <summary>اگر عنوان خالی یا برابر خودِ کد باشد، عنوان فارسی شناخته‌شده برمی‌گردد.</summary>
    public static string Resolve(string? code, string? existingTitle = null)
    {
        var c = (code ?? "").Trim();
        var t = (existingTitle ?? "").Trim();
        if (t.Length > 0 && !string.Equals(t, c, StringComparison.OrdinalIgnoreCase))
            return t;

        if (string.Equals(c, FullCheckupCode, StringComparison.OrdinalIgnoreCase) || c.Length == 0)
            return FullCheckupTitle;

        // کد ناشناخته بدون عنوان — حداقل خود کد را برنگردان اگر FULL_CHECKUP نبود
        return t.Length > 0 ? t : c;
    }
}
