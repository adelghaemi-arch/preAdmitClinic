/*
 File: backend/src/Nabz.Api/Controllers/FilesController.cs
 Description: آپلود و دانلود فایل شواهد/مدارک
 Parent Dependencies: IFileStorage
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Application.Abstractions;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/files")]
public sealed class FilesController(IFileStorage storage) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { ok = false, error = "فایل خالی است." });
        await using var stream = file.OpenReadStream();
        var stored = await storage.SaveAsync(stream, file.FileName, file.ContentType, ct);
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
        var opened = await storage.OpenReadAsync(Uri.UnescapeDataString(storageKey), ct);
        if (opened is null) return NotFound();
        var (stream, contentType, fileName) = opened.Value;
        return File(stream, contentType, fileName);
    }
}
