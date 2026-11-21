/*
 File: backend/src/Nabz.Application/Options/AuthOptions.cs
 Description: تنظیمات ورود؛ FixedOtp بای‌پس SMS و رندم برای محیط توسعه
 Parent Dependencies: none
 */

namespace Nabz.Application.Options;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    /// <summary>اگر غیرخالی باشد، کد OTP همین مقدار است و کاوه‌نگار صدا زده نمی‌شود.</summary>
    public string? FixedOtp { get; set; }

    public bool HasFixedOtp => !string.IsNullOrWhiteSpace(FixedOtp);
}

public sealed class KavenegarOptions
{
    public const string SectionName = "Kavenegar";

    public string? ApiKey { get; set; }
    public string? Sender { get; set; }
    public string? OtpTemplate { get; set; }
    public string? InviteTemplate { get; set; }
    /// <summary>قالب هشدار سوءاستفاده API به ادمین کل (UC-PLT-17).</summary>
    public string? AbuseAlertTemplate { get; set; }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}
