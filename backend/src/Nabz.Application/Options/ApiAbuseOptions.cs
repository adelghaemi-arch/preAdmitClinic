/*
 File: backend/src/Nabz.Application/Options/ApiAbuseOptions.cs
 Description: آستانه‌های گارد ضدسوءاستفاده API (UC-PLT-17)
 Parent Dependencies: none
 */

namespace Nabz.Application.Options;

public sealed class ApiAbuseOptions
{
    public const string SectionName = "ApiAbuse";

    public int SoftSamePathCount { get; set; } = 80;
    public int SoftTotalCount { get; set; } = 120;
    public int SoftWindowSeconds { get; set; } = 10;

    public int HardSamePathCount { get; set; } = 250;
    public int HardTotalCount { get; set; } = 600;
    public int HardWindowSeconds { get; set; } = 60;

    public int SoftRetryAfterSeconds { get; set; } = 10;
    public int HardRetryAfterSeconds { get; set; } = 60;
    public int IpHardRetryAfterSeconds { get; set; } = 120;

    /// <summary>حداقل فاصلهٔ نوشتن LastSeenAt روی نشست (ثانیه).</summary>
    public int LastSeenMinIntervalSeconds { get; set; } = 60;

    /// <summary>cooldown ثبت hard / SMS به ازای هر کلید (ثانیه).</summary>
    public int IncidentCooldownSeconds { get; set; } = 3600;

    public int DenySetTtlHours { get; set; } = 24;
}
