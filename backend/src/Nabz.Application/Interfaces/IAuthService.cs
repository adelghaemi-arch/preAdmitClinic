/*
 File: backend/src/Nabz.Application/Interfaces/IAuthService.cs
 Description: OTP ورود، انتخاب کدملی چندنفره، اعتبارسنجی توکن نشست، revoke
 Parent Dependencies: AppRole, AuthSessionPrincipal
 */

using Nabz.Application.Security;
using Nabz.Domain.Enums;

namespace Nabz.Application.Interfaces;

public record OtpRequestResult(bool Ok, string? DemoCode, string? Error);
public record OtpIdentityCandidate(string NationalId, string FirstName, string LastName);
public record OtpVerifyResult(
    bool Ok,
    Guid? UserId,
    Guid? SessionId,
    string? Token,
    IReadOnlyList<AppRole>? Roles,
    bool NeedsSelection,
    IReadOnlyList<OtpIdentityCandidate>? Candidates,
    string? Error);
public record SessionDto(Guid Id, Guid UserId, string DeviceLabel, DateTime CreatedAt, DateTime LastSeenAt, DateTime? RevokedAt);
public record AuthMeDto(
    Guid UserId,
    string FirstName,
    string LastName,
    string FullName,
    string Mobile,
    IReadOnlyList<AppRole> Roles,
    Guid? ClinicId,
    Guid? ContractId,
    bool IsActive);

public interface IAuthService
{
    Task<OtpRequestResult> RequestOtpAsync(string mobile, CancellationToken ct = default);
    /// <summary>OTP اکشن (مثلاً FactoryReset) — جدا از ورود؛ Purpose روی challenge ذخیره می‌شود.</summary>
    Task<OtpRequestResult> RequestActionOtpAsync(string mobile, string purpose, CancellationToken ct = default);
    /// <summary>تأیید و مصرف OTP اکشن بدون صدور نشست.</summary>
    Task<OtpRequestResult> VerifyActionOtpAsync(string mobile, string purpose, string code, CancellationToken ct = default);
    Task<OtpVerifyResult> VerifyOtpAsync(string mobile, string code, string? deviceLabel, string? appSurface, CancellationToken ct = default);
    Task<OtpVerifyResult> SelectIdentityAsync(Guid sessionId, string nationalId, CancellationToken ct = default);
    Task<AuthSessionPrincipal?> ValidateTokenAsync(string rawToken, CancellationToken ct = default);
    Task<AuthMeDto?> GetMeAsync(Guid userId, CancellationToken ct = default);
    Task<bool> RevokeSessionAsync(Guid sessionId, Guid actingUserId, bool allowOtherUsers, CancellationToken ct = default);
    Task<int> RevokeOtherSessionsAsync(Guid userId, Guid keepSessionId, CancellationToken ct = default);
    Task<int> RevokeAllUserSessionsAsync(Guid userId, CancellationToken ct = default);
}
