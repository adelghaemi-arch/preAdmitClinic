/*
 File: backend/src/Nabz.Domain/Entities/Clinic.cs
 Description: کلینیک تک‌مستأجر با لوکیشن، پشتیبانی پیش‌پذیرش و تنظیمات سامانه پیامک
 Parent Dependencies: ClinicStatus, ClinicSmsProvider
 */

using Nabz.Domain.Common;
using Nabz.Domain.Enums;

namespace Nabz.Domain.Entities;

public class Clinic : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    /// <summary>آدرس نمایشی بیمارستان/کلینیک برای مسیریابی Owner</summary>
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public ClinicStatus Status { get; set; } = ClinicStatus.Active;
    public string? AdminContact { get; set; }
    public string? AdminPhone { get; set; }
    /// <summary>تلفن پشتیبانی پیش‌پذیرش — در پیام خطای «شماره ثبت‌نشده» هنگام ورود OTP</summary>
    public string? PreAdmitSupportPhone { get; set; }
    public bool IsCurrentTenant { get; set; } = true;

    /// <summary>سامانه فعال پیامک بیمارستان</summary>
    public ClinicSmsProvider SmsProvider { get; set; } = ClinicSmsProvider.None;
    /// <summary>شماره/خط ارسال (کاوه‌نگار یا طوبی)</summary>
    public string? SmsSenderNumber { get; set; }

    public string? KavenegarApiKey { get; set; }
    public string? KavenegarOtpTemplate { get; set; }

    public string? ToubaUsername { get; set; }
    public string? ToubaPassword { get; set; }
    /// <summary>پیش‌فرض: https://sms.tsms.ir/url/tsms.php</summary>
    public string? ToubaSendUrl { get; set; }
    /// <summary>متن OTP طوبی؛ جایگذاری {code}</summary>
    public string? ToubaOtpMessageTemplate { get; set; }
}
