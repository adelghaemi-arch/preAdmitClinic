/*
 File: backend/src/Nabz.Api/Controllers/AuthController.cs
 Description: OTP عمومی؛ حالت FixedOtp؛ انتخاب هویت؛ revoke با نشست احرازشده
 Parent Dependencies: IAuthService, AuthOptions, CurrentUserExtensions
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Nabz.Api.Auth;
using Nabz.Application.Interfaces;
using Nabz.Application.Options;

namespace Nabz.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService auth, IOptions<AuthOptions> authOptions) : ControllerBase
{
    public record RequestOtpBody(string Mobile);
    public record VerifyOtpBody(string Mobile, string Code, string? DeviceLabel, string? AppSurface);
    public record SelectIdentityBody(string NationalId);

    /// <summary>پرچم عمومی: آیا OTP ثابت (بدون پیامک) فعال است — بدون افشای خود کد.</summary>
    [AllowAnonymous]
    [HttpGet("otp/mode")]
    public IActionResult OtpMode()
        => Ok(new { fixedOtpEnabled = authOptions.Value.HasFixedOtp });

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
        return Ok(new
        {
            ok = true,
            userId = r.UserId,
            sessionId = r.SessionId,
            token = r.Token,
            roles = r.Roles,
            needsSelection = r.NeedsSelection,
            candidates = r.Candidates
        });
    }

    /// <summary>بعد از OTP چندنفره؛ فقط با claim pending_selection.</summary>
    [Authorize]
    [HttpPost("otp/select")]
    public async Task<IActionResult> SelectIdentity([FromBody] SelectIdentityBody body, CancellationToken ct)
    {
        if (!User.IsPendingSelection())
            return Forbid();
        var r = await auth.SelectIdentityAsync(User.GetSessionId(), body.NationalId, ct);
        if (!r.Ok) return BadRequest(new { ok = false, error = r.Error });
        return Ok(new
        {
            ok = true,
            userId = r.UserId,
            sessionId = r.SessionId,
            token = r.Token,
            roles = r.Roles,
            needsSelection = false
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        // نشست pending هنوز هویت نهایی ندارد
        if (User.IsPendingSelection())
            return Conflict(new { ok = false, error = "ابتدا هویت (کد ملی) را انتخاب کنید." });
        var me = await auth.GetMeAsync(User.GetUserId(), ct);
        return me is null ? NotFound() : Ok(me);
    }

    [Authorize]
    [HttpPost("sessions/revoke")]
    public async Task<IActionResult> Revoke(CancellationToken ct)
    {
        var ok = await auth.RevokeSessionAsync(User.GetSessionId(), User.TryGetUserId() ?? Guid.Empty, allowOtherUsers: false, ct);
        return ok ? Ok(new { ok = true }) : NotFound(new { ok = false });
    }

    [Authorize]
    [HttpPost("sessions/revoke-others")]
    public async Task<IActionResult> RevokeOthers(CancellationToken ct)
    {
        if (User.IsPendingSelection())
            return Conflict(new { ok = false, error = "ابتدا هویت را انتخاب کنید." });
        var n = await auth.RevokeOtherSessionsAsync(User.GetUserId(), User.GetSessionId(), ct);
        return Ok(new { ok = true, revoked = n });
    }
}
