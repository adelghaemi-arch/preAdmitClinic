/*
 File: backend/src/Nabz.Api/Auth/CurrentUserExtensions.cs
 Description: خواندن userId/sessionId/contract از Claims
 Parent Dependencies: NabzClaimTypes
 */

using System.Security.Claims;
using Nabz.Application.Security;

namespace Nabz.Api.Auth;

public static class CurrentUserExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("کاربر احراز نشده است.");
        return Guid.Parse(raw);
    }

    public static Guid GetSessionId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(NabzClaimTypes.SessionId)
            ?? throw new UnauthorizedAccessException("نشست احراز نشده است.");
        return Guid.Parse(raw);
    }

    public static Guid? GetContractId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(NabzClaimTypes.ContractId);
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    public static bool IsInAppRole(this ClaimsPrincipal user, string role)
        => user.IsInRole(role);
}
