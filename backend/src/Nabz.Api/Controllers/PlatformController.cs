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
public sealed class PlatformController(IPlatformService platform, IAuthService auth, ISmsCampaignTemplateService smsTemplates) : ControllerBase
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
        try
        {
            await platform.UpdateSettingsAsync(new PlatformSettingsDto(
                body.BrandName,
                body.OtpLength,
                body.OtpTtlSeconds,
                body.IntakeDocumentMaxGroups,
                body.IntakeDocumentMaxFilesPerGroup,
                body.SupportPhone,
                body.SmsSenderId,
                body.FraudAutoCaptureSeconds,
                body.FeatureFlags), ActorName(), ct);
            return Ok(new { ok = true });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }

    [HttpPost("users")]
    public async Task<IActionResult> UpsertUser([FromBody] UpsertUserBody body, CancellationToken ct)
    {
        try
        {
            var dto = await platform.UpsertUserAsync(
                body.UserId, body.FirstName, body.LastName, body.Mobile, body.NationalId,
                body.PrimaryRole, body.ClinicId, body.ContractId, ct);
            return Ok(dto);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("یافت نشد"))
        {
            return NotFound(new { ok = false, error = ex.Message });
        }
        catch (InvalidOperationException ex) when (
            ex.Message.Contains("کد ملی")
            || ex.Message.Contains("موبایل")
            || ex.Message.Contains("نام")
            || ex.Message.Contains("قرارداد")
            || ex.Message.Contains("کلینیک"))
        {
            return Conflict(new { ok = false, error = ex.Message });
        }
    }

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

    [HttpGet("sms-templates")]
    public async Task<IActionResult> ListSmsTemplates([FromQuery] bool activeOnly = false, CancellationToken ct = default)
        => Ok(await smsTemplates.ListAsync(activeOnly, ct));

    [HttpPut("sms-templates")]
    public async Task<IActionResult> UpsertSmsTemplate([FromBody] UpsertSmsTemplateBody body, CancellationToken ct)
    {
        try
        {
            var dto = await smsTemplates.UpsertAsync(new UpsertSmsCampaignTemplateRequest(
                body.Id, body.Code, body.Title, body.BodyPreview, body.ProviderTemplateName,
                body.TokenKeys ?? [], body.RequiresEmrUrl, body.IsActive, body.SortOrder), ActorName(), ct);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }

    [HttpPost("factory-reset/request-otp")]
    public async Task<IActionResult> FactoryResetRequestOtp(CancellationToken ct)
    {
        var result = await platform.RequestFactoryResetOtpAsync(User.GetUserId(), ct);
        if (!result.Ok)
            return BadRequest(new { ok = false, error = result.Error });
        return Ok(new { ok = true, demoCode = result.DemoCode });
    }

    [HttpPost("factory-reset/confirm")]
    public async Task<IActionResult> FactoryResetConfirm([FromBody] FactoryResetConfirmBody body, CancellationToken ct)
    {
        try
        {
            await platform.ConfirmFactoryResetAsync(User.GetUserId(), body.Code ?? "", ct);
            return Ok(new { ok = true });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }

    private string ActorName() => User.GetUserId().ToString();

    public record ClinicStatusBody(Guid ClinicId, ClinicStatus Status);
    public record MultiReviewBody(Guid AlertId, FraudReviewStatus Status, string? Note);
    public record SettingsBody(
        string BrandName,
        int OtpLength,
        int OtpTtlSeconds,
        int IntakeDocumentMaxGroups,
        int IntakeDocumentMaxFilesPerGroup,
        string? SupportPhone,
        string? SmsSenderId,
        int FraudAutoCaptureSeconds = 7,
        FeatureFlagsDto? FeatureFlags = null);
    public record UpsertUserBody(Guid? UserId, string FirstName, string LastName, string Mobile, string? NationalId, AppRole PrimaryRole, Guid? ClinicId, Guid? ContractId);
    public record ActiveBody(bool IsActive);
    public record AuditBody(string Action, string Target, string? Detail);
    public record FactoryResetConfirmBody(string? Code);
    public record UpsertSmsTemplateBody(
        Guid? Id,
        string Code,
        string Title,
        string BodyPreview,
        string ProviderTemplateName,
        List<string>? TokenKeys,
        bool RequiresEmrUrl,
        bool IsActive,
        int SortOrder);
}
