/*
 File: backend/src/Nabz.Domain/Entities/PlatformSettings.cs
 Description: تنظیمات پلتفرم، ممیزی و سقف‌های مدرک/OTP
 Parent Dependencies: none
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

public class PlatformSettings : EntityBase
{
    public string BrandName { get; set; } = "نفس";
    public string? SupportPhone { get; set; }
    public int OtpLength { get; set; } = 5;
    public int OtpTtlSeconds { get; set; } = 120;
    public string? SmsSenderId { get; set; }
    // پیش‌فرض عملیاتی ضدتقلب؛ ادمین کل در تنظیمات ۲–۱۵ را ست می‌کند
    public int FraudAutoCaptureSeconds { get; set; } = 7;
    public int IntakeDocumentMaxGroups { get; set; } = 20;
    public int IntakeDocumentMaxFilesPerGroup { get; set; } = 20;
    public long IntakeDocumentMaxBytes { get; set; } = 5 * 1024 * 1024;
    public string FeatureFlagsJson { get; set; } = "{}";
    public string OsmLocalJson { get; set; } = "{}";
}

public class PlatformAuditEntry : EntityBase
{
    public DateTime At { get; set; } = DateTime.UtcNow;
    public string Actor { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string? Detail { get; set; }
}
