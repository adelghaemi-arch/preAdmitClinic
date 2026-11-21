/*
 File: backend/src/Nabz.Application/Interfaces/IApiAbuseGuardService.cs
 Description: قرارداد گارد ضدسوءاستفاده API (UC-PLT-17)
 Parent Dependencies: ApiAbuseOptions
 */

namespace Nabz.Application.Interfaces;

public enum ApiAbuseVerdict
{
    Allow = 0,
    SoftThrottle = 1,
    HardAbuse = 2,
    Denied = 3
}

public sealed record ApiAbuseEvaluateResult(
    ApiAbuseVerdict Verdict,
    int RetryAfterSeconds,
    string? DominantFingerprint,
    int SamePathCount,
    int TotalCount,
    string? Message);

public sealed record ApiAbuseIncidentDto(
    Guid Id,
    DateTime At,
    Guid? UserId,
    string? UserMobile,
    string? UserName,
    string? ClientIp,
    string DominantFingerprint,
    int SamePathCount,
    int TotalCount,
    string Severity,
    bool SmsNotified,
    bool Acknowledged,
    bool UserIsActive,
    string? Detail);

public interface IApiAbuseGuardService
{
    /// <summary>قبل از Auth: deny-set + محدودیت IP برای OTP — بدون DB.</summary>
    ApiAbuseEvaluateResult EvaluateEarly(string? tokenHash, string? clientIp, string method, string path);

    /// <summary>بعد از Auth: soft/hard برای غیر Platform؛ hard → تعلیق + SMS.</summary>
    Task<ApiAbuseEvaluateResult> EvaluatePostAuthAsync(
        Guid? userId,
        string? tokenHash,
        IReadOnlyList<string> roles,
        string method,
        string path,
        string? clientIp,
        CancellationToken ct = default);

    Task<IReadOnlyList<ApiAbuseIncidentDto>> ListIncidentsAsync(bool? acknowledged = null, int take = 50, CancellationToken ct = default);
    Task AcknowledgeAsync(Guid incidentId, string actor, CancellationToken ct = default);

    /// <summary>نرمال‌سازی مسیر برای fingerprint (Guid → {id}).</summary>
    static string NormalizeFingerprint(string method, string path)
    {
        var m = string.IsNullOrWhiteSpace(method) ? "GET" : method.Trim().ToUpperInvariant();
        var p = string.IsNullOrWhiteSpace(path) ? "/" : path.Trim();
        var q = p.IndexOf('?', StringComparison.Ordinal);
        if (q >= 0) p = p[..q];
        // شناسه‌های Guid در مسیر را یکسان می‌کنیم تا «مشابه» تشخیص داده شود
        p = System.Text.RegularExpressions.Regex.Replace(
            p,
            @"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
            "{id}");
        if (!p.StartsWith('/')) p = "/" + p;
        return m + " " + p.ToLowerInvariant();
    }

    static bool IsOtpPath(string path)
    {
        var p = path.Split('?', 2)[0];
        return p.StartsWith("/api/auth/otp", StringComparison.OrdinalIgnoreCase);
    }

    static bool IsExemptPath(string path)
    {
        var p = path.Split('?', 2)[0];
        if (p.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase)) return true;
        if (p.StartsWith("/api/platform/api-abuse", StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }
}
