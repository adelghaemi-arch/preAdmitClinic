/*
 File: backend/src/Nabz.Api/Controllers/EvidenceController.cs
 Description: مدارک، عکس، GPS، نشست ضدتقلب — actingUser از claim
 Parent Dependencies: IEvidenceService, CurrentUserExtensions
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Api.Auth;
using Nabz.Application.Interfaces;
using Nabz.Domain.Enums;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/evidence")]
public sealed class EvidenceController(IEvidenceService evidence) : ControllerBase
{
    [Authorize(Roles = "Owner")]
    [HttpPost("documents/groups")]
    public async Task<IActionResult> AddGroup([FromBody] AddGroupBody body, CancellationToken ct)
        => Ok(await evidence.AddDocumentGroupAsync(body.PatientId, User.GetUserId(), body.DocumentType, body.TypeLabelFa, body.Note, body.DocumentDate, ct));

    [Authorize(Roles = "Owner")]
    [HttpPost("documents/files")]
    public async Task<IActionResult> AddFiles([FromBody] AddFilesBody body, CancellationToken ct)
    {
        await evidence.AddDocumentFilesAsync(body.GroupId, User.GetUserId(),
            body.Files.Select(f => (f.FileName, f.MimeType, f.StorageKey, f.SizeBytes, f.DocumentDate)).ToList(), ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Owner")]
    [HttpDelete("documents/groups/{groupId:guid}")]
    public async Task<IActionResult> RemoveGroup(Guid groupId, CancellationToken ct)
    {
        await evidence.RemoveDocumentGroupAsync(groupId, User.GetUserId(), ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Owner")]
    [HttpDelete("documents/files/{fileId:guid}")]
    public async Task<IActionResult> RemoveFile(Guid fileId, CancellationToken ct)
    {
        await evidence.RemoveDocumentFileAsync(fileId, User.GetUserId(), ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Owner,Specialist,Admin,Platform")]
    [HttpGet("gps")]
    public async Task<IActionResult> ListGps([FromQuery] Guid patientId, [FromQuery] int take = 50, CancellationToken ct = default)
        => Ok(await evidence.ListGpsByPatientAsync(patientId, take, ct));

    [Authorize(Roles = "Owner")]
    [HttpPost("photos")]
    public async Task<IActionResult> Photo([FromBody] PhotoBody body, CancellationToken ct)
    {
        await evidence.UpdatePatientPhotoAsync(body.PatientId, User.GetUserId(), body.StorageKey, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Owner")]
    [HttpPost("fraud/start")]
    public async Task<IActionResult> StartFraud([FromBody] FraudStartBody body, CancellationToken ct)
        => Ok(new { ok = true, sessionId = await evidence.StartFraudSessionAsync(body.PatientId, User.GetUserId(), ct) });

    [Authorize(Roles = "Owner")]
    [HttpPost("fraud/capture")]
    public async Task<IActionResult> Capture([FromBody] FraudCaptureBody body, CancellationToken ct)
    {
        await evidence.CaptureFraudFrameAsync(body.SessionId, User.GetUserId(), body.StorageKey, body.Lat, body.Lon, body.Accuracy, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Owner")]
    [HttpPost("fraud/end")]
    public async Task<IActionResult> EndFraud([FromBody] FraudEndBody body, CancellationToken ct)
    {
        await evidence.EndFraudSessionAsync(body.SessionId, User.GetUserId(), ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Owner")]
    [HttpPost("gps")]
    public async Task<IActionResult> Gps([FromBody] GpsBody body, CancellationToken ct)
    {
        await evidence.RecordGpsAsync(body.PatientId, User.GetUserId(), body.Lat, body.Lon, body.Accuracy, body.Source ?? "manual", ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Platform")]
    [HttpPost("fraud/review")]
    public async Task<IActionResult> Review([FromBody] ReviewBody body, CancellationToken ct)
    {
        await evidence.ReviewFraudSessionAsync(body.SessionId, body.Status, body.Note, body.Reviewer, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Platform")]
    [HttpGet("fraud/sessions")]
    public async Task<IActionResult> ListSessions([FromQuery] FraudReviewStatus? status, [FromQuery] int take = 50, CancellationToken ct = default)
        => Ok(await evidence.ListFraudSessionsAsync(status, take, ct));

    [Authorize(Roles = "Platform")]
    [HttpGet("fraud/sessions/{sessionId:guid}")]
    public async Task<IActionResult> FraudDetail(Guid sessionId, CancellationToken ct)
    {
        var s = await evidence.GetFraudSessionDetailAsync(sessionId, ct);
        return s is null ? NotFound() : Ok(s);
    }

    [Authorize(Roles = "Specialist,Admin,Owner,Platform")]
    [HttpGet("documents")]
    public async Task<IActionResult> ListDocuments([FromQuery] Guid patientId, CancellationToken ct)
        => Ok(await evidence.ListDocumentsByPatientAsync(patientId, ct));

    [Authorize(Roles = "Specialist,Admin,Owner,Platform")]
    [HttpGet("photos/portrait")]
    public async Task<IActionResult> Portrait([FromQuery] Guid patientId, CancellationToken ct)
    {
        var p = await evidence.GetPortraitAsync(patientId, ct);
        return p is null ? NotFound() : Ok(p);
    }

    [Authorize(Roles = "Specialist,Admin,Platform")]
    [HttpGet("photos")]
    public async Task<IActionResult> ListPhotos([FromQuery] Guid patientId, CancellationToken ct)
        => Ok(await evidence.ListPhotosByPatientAsync(patientId, ct));

    public record AddGroupBody(Guid PatientId, string DocumentType, string TypeLabelFa, string? Note, string? DocumentDate);
    public record FileBody(string FileName, string MimeType, string StorageKey, long SizeBytes, string? DocumentDate);
    public record AddFilesBody(Guid GroupId, List<FileBody> Files);
    public record PhotoBody(Guid PatientId, string StorageKey);
    public record FraudStartBody(Guid PatientId);
    public record FraudCaptureBody(Guid SessionId, string StorageKey, double? Lat, double? Lon, double? Accuracy);
    public record FraudEndBody(Guid SessionId);
    public record GpsBody(Guid PatientId, double Lat, double Lon, double Accuracy, string? Source);
    public record ReviewBody(Guid SessionId, FraudReviewStatus Status, string? Note, string Reviewer);
}
