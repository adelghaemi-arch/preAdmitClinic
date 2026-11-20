/*
 File: backend/src/Nabz.Application/Interfaces/IAuthService.cs
 Description: OTP ورود، اعتبارسنجی توکن نشست، revoke
 Parent Dependencies: AppRole, AuthSessionPrincipal
 */

using Nabz.Application.Security;
using Nabz.Domain.Enums;

namespace Nabz.Application.Interfaces;

public record OtpRequestResult(bool Ok, string? DemoCode, string? Error);
public record OtpVerifyResult(bool Ok, Guid? UserId, Guid? SessionId, string? Token, IReadOnlyList<AppRole>? Roles, string? Error);
public record SessionDto(Guid Id, Guid UserId, string DeviceLabel, DateTime CreatedAt, DateTime LastSeenAt, DateTime? RevokedAt);
public record AuthMeDto(
    Guid UserId,
    string FullName,
    string Mobile,
    IReadOnlyList<AppRole> Roles,
    Guid? ClinicId,
    Guid? ContractId,
    bool IsActive);

public interface IAuthService
{
    Task<OtpRequestResult> RequestOtpAsync(string mobile, CancellationToken ct = default);
    Task<OtpVerifyResult> VerifyOtpAsync(string mobile, string code, string? deviceLabel, string? appSurface, CancellationToken ct = default);
    Task<AuthSessionPrincipal?> ValidateTokenAsync(string rawToken, CancellationToken ct = default);
    Task<AuthMeDto?> GetMeAsync(Guid userId, CancellationToken ct = default);
    Task<bool> RevokeSessionAsync(Guid sessionId, Guid actingUserId, bool allowOtherUsers, CancellationToken ct = default);
    Task<int> RevokeOtherSessionsAsync(Guid userId, Guid keepSessionId, CancellationToken ct = default);
    Task<int> RevokeAllUserSessionsAsync(Guid userId, CancellationToken ct = default);
}
