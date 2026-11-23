/*
 File: backend/src/Nabz.Application/Interfaces/IClinicService.cs
 Description: خواندن و به‌روزرسانی کلینیک جاری + تست پیامک + حساب طوبی (UC-ADM-21/23)
 Parent Dependencies: none
 */

namespace Nabz.Application.Interfaces;

public record ClinicDto(
    Guid Id,
    string Name,
    string? City,
    string Status,
    bool IsCurrentTenant,
    string? Address = null,
    double? Latitude = null,
    double? Longitude = null,
    string? PreAdmitSupportPhone = null,
    string SmsProvider = "None",
    string? SmsSenderNumber = null,
    string? KavenegarApiKey = null,
    bool KavenegarApiKeySet = false,
    string? KavenegarOtpTemplate = null,
    string? ToubaUsername = null,
    string? ToubaPassword = null,
    bool ToubaPasswordSet = false,
    string? ToubaSendUrl = null,
    string? ToubaOtpMessageTemplate = null,
    string? LogoStorageKey = null);

public record UpdateClinicRequest(
    string Name,
    string? City,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? PreAdmitSupportPhone = null,
    string? SmsProvider = null,
    string? SmsSenderNumber = null,
    string? KavenegarApiKey = null,
    string? KavenegarOtpTemplate = null,
    string? ToubaUsername = null,
    string? ToubaPassword = null,
    string? ToubaSendUrl = null,
    string? ToubaOtpMessageTemplate = null);

public record ClinicLogoUploadResult(string LogoStorageKey, string FileName, string ContentType, long SizeBytes);

/// <summary>حالت‌های تست ارسال — AppTemplate / Direct / ProviderTemplate.</summary>
public static class ClinicSmsTestModes
{
    public const string AppTemplate = "AppTemplate";
    public const string Direct = "Direct";
    public const string ProviderTemplate = "ProviderTemplate";
}

public record ClinicSmsTestRequest(
    string Mode,
    string Mobile,
    Guid? TemplateId = null,
    string? PlainBody = null,
    string? ProviderTemplateName = null,
    IReadOnlyList<string>? Tokens = null,
    /// <summary>درگاه تست وقتی SmsProvider فعال None است (Touba / Kavenegar).</summary>
    string? Provider = null);

public record ClinicSmsTestResult(bool Ok, string Mode, bool Simulated, string? Detail = null);

/// <summary>نتیجهٔ UserInfo طوبی (اعتبار + خطوط ارسال).</summary>
public record ClinicToubaAccountDto(int Credit, IReadOnlyList<string> SenderNumbers);

public interface IClinicService
{
    Task<ClinicDto?> GetCurrentAsync(CancellationToken ct = default);
    Task<ClinicDto> UpdateCurrentAsync(UpdateClinicRequest request, CancellationToken ct = default);
    /// <summary>UC-ADM-21 — آپلود لوگوی بیمارستان (PNG/JPEG/WebP).</summary>
    Task<ClinicLogoUploadResult> UploadLogoAsync(Stream content, string fileName, string contentType, CancellationToken ct = default);
    /// <summary>ارسال تستی مستقل از FixedOtp؛ از تنظیمات ذخیره‌شدهٔ سرور.</summary>
    Task<ClinicSmsTestResult> TestSmsAsync(ClinicSmsTestRequest request, CancellationToken ct = default);
    /// <summary>UC-ADM-21 — بارگذاری اعتبار و خطوط از UserInfo طوبی با اعتبار ذخیره‌شده.</summary>
    Task<ClinicToubaAccountDto> GetToubaAccountInfoAsync(CancellationToken ct = default);
}
