/*
 File: backend/src/Nabz.Infrastructure/Services/ClinicService.cs
 Description: سرویس کلینیک جاری — لوکیشن، پشتیبانی، سامانه پیامک، تست ارسال قبل از فعال‌سازی (UC-ADM-23)
 Parent Dependencies: IClinicRepository, IClinicSmsDispatch, ISmsCampaignTemplateRepository, ClinicSmsTestSamples
 */

using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Options;
using Nabz.Application.Sms;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Services;

public sealed class ClinicService(
    IClinicRepository clinics,
    IUnitOfWork uow,
    IClinicSmsDispatch smsDispatch,
    ISmsCampaignTemplateRepository smsTemplates,
    IOptions<KavenegarOptions> kavenegarOptions,
    ILogger<ClinicService> logger) : IClinicService
{
    public const string DefaultToubaSendUrl = "https://sms.tsms.ir/url/tsms.php";
    private static readonly Regex Mobile09 = new(@"^09\d{9}$", RegexOptions.Compiled);

    public async Task<ClinicDto?> GetCurrentAsync(CancellationToken ct = default)
    {
        var c = await clinics.GetCurrentAsync(ct);
        return c is null ? null : Map(c);
    }

    public async Task<ClinicDto> UpdateCurrentAsync(UpdateClinicRequest request, CancellationToken ct = default)
    {
        var name = (request.Name ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("نام بیمارستان/کلینیک الزامی است.");
        if (name.Length > 200)
            throw new InvalidOperationException("نام بیش از حد طولانی است.");

        var c = await clinics.GetCurrentAsync(ct)
            ?? throw new InvalidOperationException("کلینیک جاری یافت نشد.");

        if (request.Latitude is null != request.Longitude is null)
            throw new InvalidOperationException("عرض و طول جغرافیایی باید هر دو ست شوند.");
        if (request.Latitude is double lat && (lat < -90 || lat > 90))
            throw new InvalidOperationException("عرض جغرافیایی نامعتبر است.");
        if (request.Longitude is double lon && (lon < -180 || lon > 180))
            throw new InvalidOperationException("طول جغرافیایی نامعتبر است.");

        c.Name = name;
        c.City = string.IsNullOrWhiteSpace(request.City) ? null : request.City.Trim();
        c.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        c.Latitude = request.Latitude;
        c.Longitude = request.Longitude;
        var support = (request.PreAdmitSupportPhone ?? string.Empty).Trim();
        if (support.Length > 32)
            throw new InvalidOperationException("شماره پشتیبانی پیش‌پذیرش بیش از حد طولانی است.");
        c.PreAdmitSupportPhone = string.IsNullOrWhiteSpace(support) ? null : support;

        if (request.SmsProvider is not null)
            c.SmsProvider = ParseProvider(request.SmsProvider);

        c.SmsSenderNumber = NormalizeOptional(request.SmsSenderNumber, 64);

        if (!ClinicSmsSecrets.IsUnchanged(request.KavenegarApiKey))
            c.KavenegarApiKey = NormalizeOptional(request.KavenegarApiKey, 200);

        if (request.KavenegarOtpTemplate is not null)
            c.KavenegarOtpTemplate = NormalizeOptional(request.KavenegarOtpTemplate, 120);

        if (request.ToubaUsername is not null)
            c.ToubaUsername = NormalizeOptional(request.ToubaUsername, 120);

        if (!ClinicSmsSecrets.IsUnchanged(request.ToubaPassword))
            c.ToubaPassword = NormalizeOptional(request.ToubaPassword, 200);

        if (request.ToubaSendUrl is not null)
        {
            var url = NormalizeOptional(request.ToubaSendUrl, 300);
            c.ToubaSendUrl = string.IsNullOrWhiteSpace(url) ? DefaultToubaSendUrl : url;
        }

        if (request.ToubaOtpMessageTemplate is not null)
            c.ToubaOtpMessageTemplate = NormalizeOptional(request.ToubaOtpMessageTemplate, 500);

        ValidateSmsConfig(c);

        c.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return Map(c);
    }

    public async Task<ClinicSmsTestResult> TestSmsAsync(ClinicSmsTestRequest request, CancellationToken ct = default)
    {
        // FixedOtp عمداً نادیده — هدف تست درگاه واقعی است؛ از مسیریاب تولید استفاده نمی‌شود
        var c = await clinics.GetCurrentAsync(ct)
            ?? throw new InvalidOperationException("کلینیک جاری یافت نشد.");

        var effective = ResolveTestProvider(c, request.Provider);

        var mobile = NormalizeMobile09(request.Mobile);
        if (!Mobile09.IsMatch(mobile))
            throw new InvalidOperationException("شماره موبایل معتبر ۱۱ رقمی وارد کنید (مثل ۰۹۱۲۳۴۵۶۷۸۹).");

        var mode = (request.Mode ?? string.Empty).Trim();
        if (mode.Equals(ClinicSmsTestModes.Direct, StringComparison.OrdinalIgnoreCase))
        {
            if (effective != ClinicSmsProvider.Touba)
                throw new InvalidOperationException("پیامک مستقیم فقط برای طوبی است؛ کاوه‌نگار فقط قالب دارد.");
            var body = (request.PlainBody ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(body))
                throw new InvalidOperationException("متن پیامک مستقیم خالی است.");
            if (body.Length > 900)
                throw new InvalidOperationException("متن پیامک بیش از حد طولانی است.");

            await EnsureToubaCreds(c);
            await smsDispatch.SendToubaPlainAsync(
                mobile, body, c.SmsSenderNumber!, c.ToubaUsername!, c.ToubaPassword!, c.ToubaSendUrl, ct);
            logger.LogInformation("تست SMS Direct به {Mobile} (Touba, active={Active})", MaskMobile(mobile), c.SmsProvider);
            return new ClinicSmsTestResult(true, ClinicSmsTestModes.Direct, Simulated: false, "پیامک مستقیم ارسال شد.");
        }

        if (mode.Equals(ClinicSmsTestModes.ProviderTemplate, StringComparison.OrdinalIgnoreCase))
        {
            if (effective != ClinicSmsProvider.Kavenegar)
                throw new InvalidOperationException("قالب سامانهٔ درگاه فقط برای کاوه‌نگار است؛ برای طوبی از متن مستقیم یا قالب آماده استفاده کنید.");
            var templateName = (request.ProviderTemplateName ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(templateName))
                throw new InvalidOperationException("نام قالب پنل کاوه‌نگار الزامی است.");

            var tokens = (request.Tokens ?? Array.Empty<string>())
                .Select(t => (t ?? string.Empty).Trim())
                .Where(t => t.Length > 0)
                .Take(3)
                .ToList();
            if (tokens.Count == 0)
                tokens = ["تست"];

            await smsDispatch.SendKavenegarTemplateAsync(
                mobile,
                templateName,
                tokens,
                FirstNonEmpty(c.KavenegarApiKey, kavenegarOptions.Value.ApiKey),
                FirstNonEmpty(c.SmsSenderNumber, kavenegarOptions.Value.Sender),
                ct);
            logger.LogInformation("تست SMS ProviderTemplate {Template} به {Mobile}", templateName, MaskMobile(mobile));
            return new ClinicSmsTestResult(true, ClinicSmsTestModes.ProviderTemplate, Simulated: false, "قالب درگاه ارسال شد.");
        }

        if (mode.Equals(ClinicSmsTestModes.AppTemplate, StringComparison.OrdinalIgnoreCase))
        {
            if (request.TemplateId is null || request.TemplateId == Guid.Empty)
                throw new InvalidOperationException("قالب آماده انتخاب نشده است.");

            var campaign = await smsTemplates.GetByIdAsync(request.TemplateId.Value, ct)
                ?? throw new InvalidOperationException("قالب پیامک یافت نشد.");
            if (!campaign.IsActive)
                throw new InvalidOperationException("قالب انتخاب‌شده غیرفعال است.");

            var tokenKeys = ClinicSmsTestSamples.ParseTokenKeys(campaign.TokenKeysJson);

            if (effective == ClinicSmsProvider.Touba)
            {
                var body = ClinicSmsTestSamples.FillBodyPreview(campaign.BodyPreview, tokenKeys, mobile);
                if (string.IsNullOrWhiteSpace(body))
                    throw new InvalidOperationException("پیش‌نمایش قالب پس از جایگذاری خالی است.");
                await EnsureToubaCreds(c);
                await smsDispatch.SendToubaPlainAsync(
                    mobile, body, c.SmsSenderNumber!, c.ToubaUsername!, c.ToubaPassword!, c.ToubaSendUrl, ct);
                logger.LogInformation("تست SMS AppTemplate {Code} plain به {Mobile}", campaign.Code, MaskMobile(mobile));
                return new ClinicSmsTestResult(true, ClinicSmsTestModes.AppTemplate, Simulated: false, $"قالب «{campaign.Title}» ارسال شد.");
            }

            var providerName = (campaign.ProviderTemplateName ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(providerName))
                throw new InvalidOperationException("این قالب نام قالب کاوه‌نگار (ProviderTemplateName) ندارد.");
            var tokens = ClinicSmsTestSamples.ResolveTokens(tokenKeys, mobile);
            await smsDispatch.SendKavenegarTemplateAsync(
                mobile,
                providerName,
                tokens,
                FirstNonEmpty(c.KavenegarApiKey, kavenegarOptions.Value.ApiKey),
                FirstNonEmpty(c.SmsSenderNumber, kavenegarOptions.Value.Sender),
                ct);
            logger.LogInformation("تست SMS AppTemplate {Code} lookup به {Mobile}", campaign.Code, MaskMobile(mobile));
            return new ClinicSmsTestResult(true, ClinicSmsTestModes.AppTemplate, Simulated: false, $"قالب «{campaign.Title}» ارسال شد.");
        }

        throw new InvalidOperationException("حالت تست نامعتبر است (AppTemplate / Direct / ProviderTemplate).");
    }

    private static ClinicSmsProvider ResolveTestProvider(Clinic c, string? requestProvider)
    {
        ClinicSmsProvider? requested = null;
        if (!string.IsNullOrWhiteSpace(requestProvider))
        {
            requested = ParseProvider(requestProvider.Trim());
            if (requested == ClinicSmsProvider.None)
                throw new InvalidOperationException("Provider تست باید کاوه‌نگار یا طوبی باشد.");
        }

        if (c.SmsProvider != ClinicSmsProvider.None
            && requested is ClinicSmsProvider rp
            && rp != c.SmsProvider)
        {
            throw new InvalidOperationException(
                $"درگاه فعال ذخیره‌شده ({c.SmsProvider}) با Provider تست ({rp}) یکی نیست.");
        }

        var effective = requested ?? c.SmsProvider;
        if (effective == ClinicSmsProvider.None)
            throw new InvalidOperationException(
                "برای تست، فیلد Provider را بفرستید (Touba / Kavenegar) یا درگاه فعال را تنظیم کنید.");
        return effective;
    }

    private static Task EnsureToubaCreds(Clinic c)
    {
        if (string.IsNullOrWhiteSpace(c.ToubaUsername)
            || string.IsNullOrWhiteSpace(c.ToubaPassword)
            || string.IsNullOrWhiteSpace(c.SmsSenderNumber))
        {
            throw new InvalidOperationException(
                "برای تست طوبی، نام کاربری، رمز و خط ارسال را ذخیره کنید (درگاه فعال می‌تواند غیرفعال بماند).");
        }
        return Task.CompletedTask;
    }

    private static void ValidateSmsConfig(Clinic c)
    {
        // فقط هنگام فعال‌سازی تولید اجباری است؛ با None می‌توان اعتبار را برای تست ذخیره کرد
        if (c.SmsProvider == ClinicSmsProvider.Touba)
        {
            if (string.IsNullOrWhiteSpace(c.ToubaUsername))
                throw new InvalidOperationException("برای طوبی نام کاربری الزامی است.");
            if (string.IsNullOrWhiteSpace(c.ToubaPassword))
                throw new InvalidOperationException("برای طوبی رمز عبور الزامی است.");
            if (string.IsNullOrWhiteSpace(c.SmsSenderNumber))
                throw new InvalidOperationException("شماره ارسال‌کننده (خط) برای طوبی الزامی است.");
        }
    }

    private static ClinicSmsProvider ParseProvider(string raw)
    {
        var s = raw.Trim();
        if (s.Equals("Kavenegar", StringComparison.OrdinalIgnoreCase) || s == "کاوه‌نگار")
            return ClinicSmsProvider.Kavenegar;
        if (s.Equals("Touba", StringComparison.OrdinalIgnoreCase) || s == "طوبی" || s.Equals("TSMS", StringComparison.OrdinalIgnoreCase))
            return ClinicSmsProvider.Touba;
        if (s.Equals("None", StringComparison.OrdinalIgnoreCase) || s == "هیچ‌کدام")
            return ClinicSmsProvider.None;
        throw new InvalidOperationException("سامانه پیامک نامعتبر است (None / Kavenegar / Touba).");
    }

    private static string? NormalizeOptional(string? value, int maxLen)
    {
        if (value is null) return null;
        var t = value.Trim();
        if (t.Length == 0) return null;
        if (t.Length > maxLen)
            throw new InvalidOperationException($"طول فیلد بیش از {maxLen} نویسه است.");
        return t;
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var v in values)
        {
            if (!string.IsNullOrWhiteSpace(v)) return v.Trim();
        }
        return null;
    }

    private static string NormalizeMobile09(string? mobile)
    {
        var m = (mobile ?? string.Empty).Trim().Replace(" ", "").Replace("-", "");
        m = string.Concat(m.Select(ch => ch switch
        {
            >= '۰' and <= '۹' => (char)('0' + (ch - '۰')),
            >= '٠' and <= '٩' => (char)('0' + (ch - '٠')),
            _ => ch
        }));
        if (m.StartsWith("+98", StringComparison.Ordinal)) m = "0" + m[3..];
        if (m.StartsWith("0098", StringComparison.Ordinal)) m = "0" + m[4..];
        if (m.StartsWith("98") && m.Length == 12) m = "0" + m[2..];
        if (m.Length == 10 && m.StartsWith('9')) m = "0" + m;
        return m;
    }

    private static string MaskMobile(string mobile)
        => mobile.Length >= 11 ? $"{mobile[..4]}***{mobile[^2..]}" : "***";

    private static ClinicDto Map(Clinic c)
        => new(
            c.Id,
            c.Name,
            c.City,
            c.Status.ToString(),
            c.IsCurrentTenant,
            c.Address,
            c.Latitude,
            c.Longitude,
            c.PreAdmitSupportPhone,
            c.SmsProvider.ToString(),
            c.SmsSenderNumber,
            ClinicSmsSecrets.MaskIfSet(c.KavenegarApiKey),
            !string.IsNullOrWhiteSpace(c.KavenegarApiKey),
            c.KavenegarOtpTemplate,
            c.ToubaUsername,
            ClinicSmsSecrets.MaskIfSet(c.ToubaPassword),
            !string.IsNullOrWhiteSpace(c.ToubaPassword),
            c.ToubaSendUrl ?? DefaultToubaSendUrl,
            c.ToubaOtpMessageTemplate);
}
