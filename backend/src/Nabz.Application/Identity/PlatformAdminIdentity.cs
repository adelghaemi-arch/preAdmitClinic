/*
 File: backend/src/Nabz.Application/Identity/PlatformAdminIdentity.cs
 Description: موبایل قفل‌شدهٔ ادمین کل (Platform) — seed و FixedOtp+1
 Parent Dependencies: —
 */

namespace Nabz.Application.Identity;

/// <summary>شناسهٔ ثابت ادمین کل؛ تغییر بدون تصمیم مالک پروژه ممنوع.</summary>
public static class PlatformAdminIdentity
{
    public const string Mobile = "09133752696";

    public static bool IsPlatformAdminMobile(string? mobile)
    {
        if (string.IsNullOrWhiteSpace(mobile)) return false;
        return IranMobile.Normalize(mobile) == Mobile;
    }

    /// <summary>کد واقعی FixedOtp برای ادمین کل = پایه + ۱؛ نمایش UI همان پایه می‌ماند.</summary>
    public static string IncrementFixedOtp(string baseCode)
    {
        var trimmed = (baseCode ?? string.Empty).Trim();
        if (long.TryParse(trimmed, out var n))
            return (n + 1).ToString();
        return trimmed + "1";
    }
}
