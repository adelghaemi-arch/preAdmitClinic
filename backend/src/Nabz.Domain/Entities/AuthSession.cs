/*
 File: backend/src/Nabz.Domain/Entities/AuthSession.cs
 Description: نشست OTP فعال؛ برای revoke خود/پلتفرم و هشدار چندنشستی
 Parent Dependencies: User
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

public class AuthSession : EntityBase
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string TokenHash { get; set; } = string.Empty;
    public string DeviceLabel { get; set; } = string.Empty;
    public string AppSurface { get; set; } = "clinic_web";
    public string? IpHint { get; set; }
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
}

public class OtpChallenge : EntityBase
{
    public string Mobile { get; set; } = string.Empty;
    public string CodeHash { get; set; } = string.Empty;
    /// <summary>در حالت دمو کد خام برای نمایش UI نگه داشته می‌شود.</summary>
    public string? DemoCodePlain { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool Consumed { get; set; }
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
