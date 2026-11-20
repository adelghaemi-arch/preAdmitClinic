/*
 File: backend/src/Nabz.Domain/Entities/AuthSession.cs
 Description: نشست OTP؛ PendingSelection برای انتخاب کدملی وقتی موبایل چندنفره است
 Parent Dependencies: User
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

public class AuthSession : EntityBase
{
    /// <summary>تا قبل از select ممکن است خالی باشد (نشست pending).</summary>
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public string DeviceLabel { get; set; } = string.Empty;
    public string AppSurface { get; set; } = "clinic_web";
    public string? IpHint { get; set; }
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
    /// <summary>true = فقط otp/select مجاز؛ نقش کاربردی صادر نمی‌شود.</summary>
    public bool PendingSelection { get; set; }
    /// <summary>موبایل نرمال‌شده برای فهرست کاندیدا هنگام pending.</summary>
    public string? PendingMobile { get; set; }
    /// <summary>موبایل OTP ورود — برای بنر mismatch معرفی به بیمارستان.</summary>
    public string? LoginMobile { get; set; }
}

public class OtpChallenge : EntityBase
{
    public string Mobile { get; set; } = string.Empty;
    /// <summary>Login یا FactoryReset — تا OTP اکشن با ورود قاطی نشود.</summary>
    public string Purpose { get; set; } = OtpPurposes.Login;
    public string CodeHash { get; set; } = string.Empty;
    /// <summary>در حالت دمو کد خام برای نمایش UI نگه داشته می‌شود.</summary>
    public string? DemoCodePlain { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool Consumed { get; set; }
}

/// <summary>مقادیر مجاز Purpose روی OtpChallenge.</summary>
public static class OtpPurposes
{
    public const string Login = "Login";
    public const string FactoryReset = "FactoryReset";
}

public class MultiSessionAlert : EntityBase
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public int ActiveSessionCount { get; set; }
    public Nabz.Domain.Enums.FraudReviewStatus ReviewStatus { get; set; }
        = Nabz.Domain.Enums.FraudReviewStatus.Pending;
    public string? ReviewNote { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
}
