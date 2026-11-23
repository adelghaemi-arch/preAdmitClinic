/*
 File: backend/src/Nabz.Infrastructure/Sms/ClinicSmsDispatch.cs
 Description: ارسال مستقیم تست طوبی/کاوه‌نگار (UC-ADM-23) — مستقل از Auth:FixedOtp
 Parent Dependencies: ToubaSoapSmsSender, KavenegarTemplateSmsSender
 */

using Nabz.Application.Abstractions;

namespace Nabz.Infrastructure.Sms;

public sealed class ClinicSmsDispatch(
    ToubaSoapSmsSender touba,
    KavenegarTemplateSmsSender kavenegar) : IClinicSmsDispatch
{
    /// <summary>پیام مسدودسازی OTP/کمپین تولید وقتی FixedOtp پر است — نه مسیر تست درگاه.</summary>
    public const string FixedOtpBlocksSmsMessage =
        "Auth:FixedOtp فعال است؛ OTP و کمپین واقعی ارسال نمی‌شوند (اولویت env محلی). تست درگاه (UC-ADM-23) جداست.";

    public Task SendToubaPlainAsync(
        string mobile,
        string content,
        string fromNum,
        string username,
        string password,
        string? sendUrl,
        CancellationToken ct = default)
        // تست درگاه باید واقعی برود حتی با FixedOtp؛ فقط مسیریاب تولید قفل می‌شود
        => touba.SendAsync(mobile, content, fromNum, username, password, sendUrl, ct);

    public async Task<ToubaAccountInfoResult> GetToubaAccountInfoAsync(
        string username,
        string password,
        string? serviceUrl,
        CancellationToken ct = default)
    {
        var info = await touba.GetAccountInfoAsync(username, password, serviceUrl, ct);
        return new ToubaAccountInfoResult(info.Credit, info.SenderNumbers);
    }

    public Task SendKavenegarTemplateAsync(
        string mobile,
        string templateName,
        IReadOnlyList<string> tokens,
        string? apiKey,
        string? sender,
        CancellationToken ct = default)
        => kavenegar.SendTemplateAsync(mobile, templateName, tokens, apiKey, sender, ct);
}
