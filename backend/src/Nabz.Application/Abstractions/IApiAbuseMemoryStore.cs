/*
 File: backend/src/Nabz.Application/Abstractions/IApiAbuseMemoryStore.cs
 Description: شمارنده و deny-set حافظه‌ای گارد API — بدون DB
 Parent Dependencies: none
 */

namespace Nabz.Application.Abstractions;

public interface IApiAbuseMemoryStore
{
    bool IsTokenDenied(string tokenHash);
    void DenyTokenHashes(IEnumerable<string> tokenHashes, TimeSpan ttl);
    void RememberPlatformToken(string tokenHash, TimeSpan ttl);
    bool IsPlatformToken(string tokenHash);

    /// <summary>اگر true باشد، ValidateToken نباید LastSeen را Save کند.</summary>
    bool ShouldSkipLastSeenWrite(string tokenHash, int minIntervalSeconds);

    /// <summary>شمارش پنجرهٔ لغزان؛ dominantFingerprint مسیر نرمال فعلی است.</summary>
    ApiAbuseHitResult Hit(string counterKey, string fingerprint, int softWindowSeconds, int hardWindowSeconds);

    bool TryBeginIncidentCooldown(string cooldownKey, TimeSpan cooldown);
}

public sealed record ApiAbuseHitResult(
    int SoftSamePath,
    int SoftTotal,
    int HardSamePath,
    int HardTotal,
    string DominantHardFingerprint);
