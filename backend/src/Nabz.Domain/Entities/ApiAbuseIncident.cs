/*
 File: backend/src/Nabz.Domain/Entities/ApiAbuseIncident.cs
 Description: حادثهٔ سوءاستفادهٔ API برای فهرست ادمین کل (UC-PLT-17)
 Parent Dependencies: EntityBase, User
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

public class ApiAbuseIncident : EntityBase
{
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    /// <summary>برای مسیر ناشناس OTP؛ در غیر این صورت خالی.</summary>
    public string? ClientIp { get; set; }
    public string DominantFingerprint { get; set; } = string.Empty;
    public int SamePathCount { get; set; }
    public int TotalCount { get; set; }
    public string Severity { get; set; } = ApiAbuseSeverities.Hard;
    public bool SmsNotified { get; set; }
    public bool Acknowledged { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public string? AcknowledgedBy { get; set; }
    public string? Detail { get; set; }
}

public static class ApiAbuseSeverities
{
    public const string Soft = "Soft";
    public const string Hard = "Hard";
    public const string IpThrottle = "IpThrottle";
}
