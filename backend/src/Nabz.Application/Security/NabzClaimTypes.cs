/*
 File: backend/src/Nabz.Application/Security/NabzClaimTypes.cs
 Description: نام claimهای نشست نبض و مدل principal
 Parent Dependencies: none
 */

namespace Nabz.Application.Security;

public static class NabzClaimTypes
{
    public const string SessionId = "nabz_session_id";
    public const string ContractId = "nabz_contract_id";
}

public record AuthSessionPrincipal(
    Guid UserId,
    Guid SessionId,
    IReadOnlyList<string> Roles,
    Guid? ContractId,
    bool IsActive);
