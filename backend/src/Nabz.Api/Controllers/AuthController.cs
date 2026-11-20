/*
 File: backend/src/Nabz.Api/Controllers/AuthController.cs
 Description: OTP عمومی؛ revoke با نشست احرازشده
 Parent Dependencies: IAuthService, CurrentUserExtensions
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Api.Auth;
using Nabz.Application.Interfaces;

namespace Nabz.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService auth) : ControllerBase
{
    public record RequestOtpBody(string Mobile);
    public record VerifyOtpBody(string Mobile, string Code, string? DeviceLabel, string? AppSurface);

    [AllowAnonymous]
    [HttpPost("otp/request")]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpBody body, CancellationToken ct)
    {
        var r = await auth.RequestOtpAsync(body.Mobile, ct);
        if (!r.Ok) return BadRequest(new { ok = false, error = r.Error });
        return Ok(new { ok = true, demoCode = r.DemoCode });
    }

    [AllowAnonymous]
    [HttpPost("otp/verify")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpBody body, CancellationToken ct)
    {
        var r = await auth.VerifyOtpAsync(body.Mobile, body.Code, body.DeviceLabel, body.AppSurface, ct);
        if (!r.Ok) return BadRequest(new { ok = false, error = r.Error });
        return Ok(new { ok = true, userId = r.UserId, sessionId = r.SessionId, token = r.Token, roles = r.Roles });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var me = await auth.GetMeAsync(User.GetUserId(), ct);
        return me is null ? NotFound() : Ok(me);
    }

    [Authorize]
    [HttpPost("sessions/revoke")]
    public async Task<IActionResult> Revoke(CancellationToken ct)
    {
        var ok = await auth.RevokeSessionAsync(User.GetSessionId(), User.GetUserId(), allowOtherUsers: false, ct);
        return ok ? Ok(new { ok = true }) : NotFound(new { ok = false });
    }

    [Authorize]
    [HttpPost("sessions/revoke-others")]
    public async Task<IActionResult> RevokeOthers(CancellationToken ct)
    {
        var n = await auth.RevokeOtherSessionsAsync(User.GetUserId(), User.GetSessionId(), ct);
        return Ok(new { ok = true, revoked = n });
    }
}
