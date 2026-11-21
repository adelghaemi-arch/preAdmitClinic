/*
 File: backend/src/Nabz.Infrastructure/Sms/ClinicSmsDispatch.cs
 Description: ارسال مستقیم تست طوبی/کاوه‌نگار؛ با Auth:FixedOtp مسدود (اولویت env محلی)
 Parent Dependencies: ToubaUrlSmsSender, KavenegarTemplateSmsSender, AuthOptions
 */

using Microsoft.Extensions.Options;
using Nabz.Application.Abstractions;
using Nabz.Application.Options;

namespace Nabz.Infrastructure.Sms;

public sealed class ClinicSmsDispatch(
    ToubaUrlSmsSender touba,
    KavenegarTemplateSmsSender kavenegar,
    IOptions<AuthOptions> authOptions) : IClinicSmsDispatch
{
    public const string FixedOtpBlocksSmsMessage =
        "Auth:FixedOtp فعال است؛ ارسال واقعی پیامک غیرفعال است (اولویت با env محلی). برای تست درگاه، FixedOtp را موقتاً خالی کنید.";

    public Task SendToubaPlainAsync(
        string mobile,
        string content,
        string fromNum,
        string username,
        string password,
        string? sendUrl,
        CancellationToken ct = default)
    {
        EnsureRealSmsAllowed();
        return touba.SendAsync(mobile, content, fromNum, username, password, sendUrl, ct);
    }

    public Task SendKavenegarTemplateAsync(
        string mobile,
        string templateName,
        IReadOnlyList<string> tokens,
        string? apiKey,
        string? sender,
        CancellationToken ct = default)
    {
        EnsureRealSmsAllowed();
        return kavenegar.SendTemplateAsync(mobile, templateName, tokens, apiKey, sender, ct);
    }

    private void EnsureRealSmsAllowed()
    {
        if (authOptions.Value.HasFixedOtp)
            throw new InvalidOperationException(FixedOtpBlocksSmsMessage);
    }
}
