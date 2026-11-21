/*
 File: backend/src/Nabz.Infrastructure/Sms/ClinicRoutingSmsSender.cs
 Description: مسیریابی ISmsSender بر اساس SmsProvider کلینیک (+ fallback env کاوه‌نگار)
 Parent Dependencies: KavenegarTemplateSmsSender, ToubaUrlSmsSender, IClinicRepository
 */

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Options;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Sms;

public sealed class ClinicRoutingSmsSender(
    IClinicRepository clinics,
    KavenegarTemplateSmsSender kavenegar,
    ToubaUrlSmsSender touba,
    IOptions<KavenegarOptions> kavenegarOptions,
    ILogger<ClinicRoutingSmsSender> logger) : ISmsSender
{
    public async Task SendTemplateAsync(string mobile, string templateName, IReadOnlyList<string> tokens, CancellationToken ct = default)
    {
        var clinic = await clinics.GetCurrentAsync(ct);
        var provider = ResolveProvider(clinic?.SmsProvider ?? ClinicSmsProvider.None);

        if (provider == ClinicSmsProvider.Touba)
            throw new InvalidOperationException("برای طوبی از SendPlainAsync استفاده کنید (متن از BodyPreview ساخته می‌شود).");

        if (provider != ClinicSmsProvider.Kavenegar)
            throw new InvalidOperationException("سامانه پیامک کلینیک برای ارسال قالبی پیکربندی نشده است.");

        var apiKey = FirstNonEmpty(clinic?.KavenegarApiKey, kavenegarOptions.Value.ApiKey);
        var sender = FirstNonEmpty(clinic?.SmsSenderNumber, kavenegarOptions.Value.Sender);
        await kavenegar.SendTemplateAsync(mobile, templateName, tokens, apiKey, sender, ct);
    }

    public async Task SendPlainAsync(string mobile, string content, CancellationToken ct = default)
    {
        var clinic = await clinics.GetCurrentAsync(ct);
        var provider = ResolveProvider(clinic?.SmsProvider ?? ClinicSmsProvider.None);

        if (provider == ClinicSmsProvider.Kavenegar)
            throw new InvalidOperationException("کاوه‌نگار فقط ارسال قالبی دارد؛ SendPlainAsync برای طوبی است.");

        if (provider != ClinicSmsProvider.Touba)
            throw new InvalidOperationException("سامانه پیامک کلینیک برای ارسال متنی پیکربندی نشده است.");

        if (clinic is null)
            throw new InvalidOperationException("کلینیک جاری یافت نشد.");

        await touba.SendAsync(
            mobile,
            content,
            clinic.SmsSenderNumber ?? string.Empty,
            clinic.ToubaUsername ?? string.Empty,
            clinic.ToubaPassword ?? string.Empty,
            clinic.ToubaSendUrl,
            ct);
    }

    private ClinicSmsProvider ResolveProvider(ClinicSmsProvider clinicProvider)
    {
        if (clinicProvider != ClinicSmsProvider.None)
            return clinicProvider;
        if (kavenegarOptions.Value.IsConfigured)
        {
            logger.LogDebug("SmsProvider کلینیک None است؛ fallback به Kavenegar از env.");
            return ClinicSmsProvider.Kavenegar;
        }
        return ClinicSmsProvider.None;
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var v in values)
        {
            if (!string.IsNullOrWhiteSpace(v)) return v.Trim();
        }
        return null;
    }
}
