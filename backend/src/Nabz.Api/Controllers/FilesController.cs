/*
 File: backend/src/Nabz.Api/Controllers/FilesController.cs
 Description: آپلود/دانلود فایل؛ فریم ضدتقلب مبهم (NBZ1) با unwrap و تأیید JPEG
 Parent Dependencies: IFileStorage, IEvidenceService, FraudFrameWireCodec
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Api.Auth;
using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Security;

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
        [FromForm] Guid? sessionId,
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

        await using var uploadStream = file.OpenReadStream();
        using var ms = new MemoryStream();
        await uploadStream.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();

        Stream saveStream;
        string contentType;
        string storeFileName;
        StorageSaveContext? saveCtx;

        if (FraudFrameWireCodec.IsEnvelope(bytes))
        {
            // فریم ضدتقلب مبهم — sessionId و کلید نشست اجباری
            if (sessionId is not Guid sid)
                return BadRequest(new { ok = false, error = "برای فایل پوشش‌دار، شناسهٔ نشست الزامی است." });
            string wrapKey;
            try
            {
                wrapKey = await evidence.GetFraudWireWrapKeyAsync(sid, User.GetUserId(), ct);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ok = false, error = ex.Message });
            }

            byte[] jpeg;
            try
            {
                jpeg = FraudFrameWireCodec.Unwrap(bytes, wrapKey);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ok = false, error = ex.Message });
            }

            var canonical = $"{Guid.NewGuid():N}.jpg";
            saveStream = new MemoryStream(jpeg);
            contentType = "image/jpeg";
            storeFileName = canonical;
            saveCtx = new StorageSaveContext(prefix, CanonicalFileName: canonical);
        }
        else
        {
            // آپلود عادی (پرتره / مدارک) — بدون پوشش
            saveStream = new MemoryStream(bytes);
            contentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType;
            storeFileName = file.FileName;
            saveCtx = new StorageSaveContext(prefix);
        }

        await using (saveStream)
        {
            var stored = await storage.SaveAsync(saveStream, storeFileName, contentType, saveCtx, ct);
            return Ok(new
            {
                ok = true,
                storageKey = stored.StorageKey,
                fileName = stored.FileName,
                contentType = stored.ContentType,
                sizeBytes = stored.SizeBytes
            });
        }
    }

    [HttpGet("{*storageKey}")]
    public async Task<IActionResult> Download(string storageKey, CancellationToken ct)
    {
        var key = Uri.UnescapeDataString(storageKey);
        var allowed = await evidence.CanDownloadStorageKeyAsync(
            key,
            User.GetUserId(),
            User.IsInRole("Platform"),
            User.IsInRole("Specialist"),
            User.IsInRole("Admin"),
            ct);
        if (!allowed) return Forbid();

        var opened = await storage.OpenReadAsync(key, ct);
        if (opened is null) return NotFound();
        var (stream, contentType, fileName) = opened.Value;
        // نام خنثی برای دانلود — بدون پیشوند fraud در Content-Disposition
        var downloadName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(downloadName))
            downloadName = "file.bin";
        return File(stream, contentType, downloadName);
    }
}
