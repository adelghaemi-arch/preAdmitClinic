/*
 File: backend/src/Nabz.Api/Controllers/FilesController.cs
 Description: آپلود/دانلود فایل؛ دانلود با گیت نقش/مالکیت (تقلب فقط Platform)
 Parent Dependencies: IFileStorage, IEvidenceService
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Api.Auth;
using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/files")]
public sealed class FilesController(IFileStorage storage, IEvidenceService evidence) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> Upload(
        IFormFile file,
        [FromForm] Guid? patientId,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { ok = false, error = "فایل خالی است." });

        string? prefix = null;
        if (patientId is Guid pid)
        {
            // Owner فقط برای پروندهٔ خود؛ Platform برای هر پرونده
            var isPlatform = User.IsInRole("Platform");
            prefix = await evidence.ResolveNationalIdPrefixForUploadAsync(pid, User.GetUserId(), isPlatform, ct);
        }

        await using var stream = file.OpenReadStream();
        var stored = await storage.SaveAsync(
            stream,
            file.FileName,
            file.ContentType,
            new StorageSaveContext(prefix),
            ct);
        return Ok(new
        {
            ok = true,
            storageKey = stored.StorageKey,
            fileName = stored.FileName,
            contentType = stored.ContentType,
            sizeBytes = stored.SizeBytes
        });
    }

    [HttpGet("{*storageKey}")]
    public async Task<IActionResult> Download(string storageKey, CancellationToken ct)
    {
        var key = Uri.UnescapeDataString(storageKey);
        var allowed = await evidence.CanDownloadStorageKeyAsync(
            key, User.GetUserId(), User.IsInRole("Platform"), ct);
        if (!allowed) return Forbid();

        var opened = await storage.OpenReadAsync(key, ct);
        if (opened is null) return NotFound();
        var (stream, contentType, fileName) = opened.Value;
        return File(stream, contentType, fileName);
    }
}
