/*
 File: backend/src/Nabz.Api/Controllers/PlatformController.cs
 Description: کنترل پلتفرم — فقط نقش Platform
 Parent Dependencies: IPlatformService, IAuthService
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Api.Auth;
using Nabz.Application.Interfaces;
using Nabz.Domain.Enums;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize(Roles = "Platform")]
[Route("api/platform")]
public sealed class PlatformController(IPlatformService platform, IAuthService auth) : ControllerBase
{
    [HttpPost("clinic-status")]
    public async Task<IActionResult> ClinicStatus([FromBody] ClinicStatusBody body, CancellationToken ct)
    {
        await platform.UpdateClinicStatusAsync(body.ClinicId, body.Status, ActorName(), ct);
        return Ok(new { ok = true });
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(CancellationToken ct)
        => Ok(await platform.GetSettingsAsync(ct));

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] SettingsBody body, CancellationToken ct)
    {
        await platform.UpdateSettingsAsync(new PlatformSettingsDto(
            body.BrandName, body.OtpLength, body.OtpTtlSeconds,
            body.IntakeDocumentMaxGroups, body.IntakeDocumentMaxFilesPerGroup), ActorName(), ct);
        return Ok(new { ok = true });
    }

    [HttpPost("users")]
    public async Task<IActionResult> UpsertUser([FromBody] UpsertUserBody body, CancellationToken ct)
        => Ok(await platform.UpsertUserAsync(body.UserId, body.FullName, body.Mobile, body.NationalId, body.PrimaryRole, body.ClinicId, body.ContractId, ct));

    [HttpPost("users/{userId:guid}/active")]
    public async Task<IActionResult> SetActive(Guid userId, [FromBody] ActiveBody body, CancellationToken ct)
    {
        await platform.SetUserActiveAsync(userId, body.IsActive, ActorName(), ct);
        return Ok(new { ok = true });
    }

    [HttpPost("users/{userId:guid}/revoke-sessions")]
    public async Task<IActionResult> RevokeSessions(Guid userId, CancellationToken ct)
        => Ok(new { ok = true, revoked = await auth.RevokeAllUserSessionsAsync(userId, ct) });

    [HttpGet("audit")]
    public async Task<IActionResult> Audit([FromQuery] int take = 100, CancellationToken ct = default)
        => Ok(await platform.ListAuditAsync(take, ct));

    [HttpPost("audit")]
    public async Task<IActionResult> AppendAudit([FromBody] AuditBody body, CancellationToken ct)
    {
        await platform.AppendAuditAsync(ActorName(), body.Action, body.Target, body.Detail, ct);
        return Ok(new { ok = true });
    }

    [HttpGet("multi-session")]
    public async Task<IActionResult> ListMultiSession([FromQuery] FraudReviewStatus? status, [FromQuery] int take = 50, CancellationToken ct = default)
        => Ok(await platform.ListMultiSessionAlertsAsync(status, take, ct));

    [HttpPost("multi-session/review")]
    public async Task<IActionResult> ReviewMultiSession([FromBody] MultiReviewBody body, CancellationToken ct)
    {
        await platform.ReviewMultiSessionAsync(body.AlertId, body.Status, body.Note, ActorName(), ct);
        return Ok(new { ok = true });
    }

    [HttpPost("users/{userId:guid}/reset-access")]
    public async Task<IActionResult> ResetAccess(Guid userId, CancellationToken ct)
    {
        await platform.ResetUserAccessAsync(userId, ActorName(), ct);
        return Ok(new { ok = true });
    }

    private string ActorName() => User.GetUserId().ToString();

    public record ClinicStatusBody(Guid ClinicId, ClinicStatus Status);
    public record MultiReviewBody(Guid AlertId, FraudReviewStatus Status, string? Note);
    public record SettingsBody(string BrandName, int OtpLength, int OtpTtlSeconds, int IntakeDocumentMaxGroups, int IntakeDocumentMaxFilesPerGroup);
    public record UpsertUserBody(Guid? UserId, string FullName, string Mobile, string? NationalId, AppRole PrimaryRole, Guid? ClinicId, Guid? ContractId);
    public record ActiveBody(bool IsActive);
    public record AuditBody(string Action, string Target, string? Detail);
}
