/*
 File: backend/src/Nabz.Api/Auth/SessionAuthenticationHandler.cs
 Description: اعتبارسنجی Bearer توکن opaque از روی AuthSession
 Parent Dependencies: IAuthService
 */

using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Nabz.Application.Interfaces;
using Nabz.Application.Security;

namespace Nabz.Api.Auth;

public sealed class SessionAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "NabzSession";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var header))
            return AuthenticateResult.NoResult();

        var value = header.ToString();
        if (string.IsNullOrWhiteSpace(value) || !value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.NoResult();

        var token = value["Bearer ".Length..].Trim();
        if (string.IsNullOrEmpty(token))
            return AuthenticateResult.Fail("توکن خالی است.");

        var auth = Context.RequestServices.GetRequiredService<IAuthService>();
        var principal = await auth.ValidateTokenAsync(token, Context.RequestAborted);
        if (principal is null)
            return AuthenticateResult.Fail("نشست نامعتبر یا منقضی است.");

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, principal.UserId.ToString()),
            new(NabzClaimTypes.SessionId, principal.SessionId.ToString())
        };
        foreach (var role in principal.Roles)
            claims.Add(new Claim(ClaimTypes.Role, role));
        if (principal.ContractId is Guid cid)
            claims.Add(new Claim(NabzClaimTypes.ContractId, cid.ToString()));

        var identity = new ClaimsIdentity(claims, SchemeName);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
        return AuthenticateResult.Success(ticket);
    }
}
