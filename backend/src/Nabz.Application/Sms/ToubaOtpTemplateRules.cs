/*
 File: backend/src/Nabz.Application/Sms/ToubaOtpTemplateRules.cs
 Description: الزام {code} در متن OTP طوبی تا کد رندم جایگزین شود
 Parent Dependencies: —
 */

namespace Nabz.Application.Sms;

/// <summary>
/// بدون {code} متن ثابت (مثلاً ۱۱۱۱۱) به گوشی می‌رود ولی CodeHash رندم است → verify همیشه fail.
/// </summary>
public static class ToubaOtpTemplateRules
{
    public const string DefaultTemplate = "کد ورود شما: {code}";

    public const string MissingPlaceholderMessage =
        "متن OTP طوبی باید شامل {code} باشد تا کد واقعی جایگزین شود (عدد ثابت مثل ۱۱۱۱۱ باعث نامعتبر شدن کد می‌شود).";

    public static bool HasCodePlaceholder(string? template)
        => !string.IsNullOrWhiteSpace(template)
           && template.Contains("{code}", StringComparison.OrdinalIgnoreCase);

    /// <summary>خالی → پیش‌فرض؛ مقدار بدون placeholder → خطا.</summary>
    public static string ResolveOrThrow(string? template)
    {
        var tpl = template?.Trim();
        if (string.IsNullOrWhiteSpace(tpl))
            return DefaultTemplate;
        if (!HasCodePlaceholder(tpl))
            throw new InvalidOperationException(MissingPlaceholderMessage);
        return tpl;
    }

    /// <summary>فقط وقتی مقدار ست شده؛ خالی مجاز است (در ارسال از پیش‌فرض استفاده می‌شود).</summary>
    public static void EnsureValidIfSet(string? template)
    {
        if (string.IsNullOrWhiteSpace(template)) return;
        if (!HasCodePlaceholder(template))
            throw new InvalidOperationException(MissingPlaceholderMessage);
    }
}
