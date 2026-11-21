/*
 File: backend/src/Nabz.Application/Interfaces/IClinicService.cs
 Description: خواندن و به‌روزرسانی کلینیک جاری + تست ارسال پیامک (UC-ADM-23)
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
    string? ToubaOtpMessageTemplate = null);

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
    IReadOnlyList<string>? Tokens = null);

public record ClinicSmsTestResult(bool Ok, string Mode, bool Simulated, string? Detail = null);

public interface IClinicService
{
    Task<ClinicDto?> GetCurrentAsync(CancellationToken ct = default);
    Task<ClinicDto> UpdateCurrentAsync(UpdateClinicRequest request, CancellationToken ct = default);
    /// <summary>ارسال تستی مستقل از FixedOtp؛ از تنظیمات ذخیره‌شدهٔ سرور.</summary>
    Task<ClinicSmsTestResult> TestSmsAsync(ClinicSmsTestRequest request, CancellationToken ct = default);
}
