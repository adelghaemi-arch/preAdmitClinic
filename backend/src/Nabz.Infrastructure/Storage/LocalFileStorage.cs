/*
 File: backend/src/Nabz.Infrastructure/Storage/LocalFileStorage.cs
 Description: ذخیره فایل زیر پوشهٔ uploads (قابل نگاشت به server/persist/uploads)
 Parent Dependencies: IFileStorage, IConfiguration
 */

using Microsoft.Extensions.Configuration;
using Nabz.Application.Abstractions;

namespace Nabz.Infrastructure.Storage;

public sealed class LocalFileStorage(IConfiguration configuration) : IFileStorage
{
    private string Root()
    {
        var configured = configuration["Storage:Root"];
        if (!string.IsNullOrWhiteSpace(configured))
            return Path.GetFullPath(configured);
        // پیش‌فرض: کنار API، هم‌تراز persist/uploads در دیپلوی
        return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "uploads"));
    }

    public async Task<StoredFileResult> SaveAsync(Stream content, string fileName, string contentType, CancellationToken ct = default)
    {
        var safeName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeName)) safeName = "file.bin";
        var key = $"{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid():N}_{safeName}";
        var full = Path.Combine(Root(), key.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        await using var fs = File.Create(full);
        await content.CopyToAsync(fs, ct);
        var len = fs.Length;
        return new StoredFileResult(key.Replace('\\', '/'), safeName, string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType, len);
    }

    public Task<(Stream Stream, string ContentType, string FileName)?> OpenReadAsync(string storageKey, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(storageKey) || storageKey.Contains("..", StringComparison.Ordinal))
            return Task.FromResult<(Stream, string, string)?>(null);
        var full = Path.Combine(Root(), storageKey.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(full)) return Task.FromResult<(Stream, string, string)?>(null);
        Stream stream = File.OpenRead(full);
        var name = Path.GetFileName(full);
        var ext = Path.GetExtension(name).ToLowerInvariant();
        var ctype = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
        return Task.FromResult<(Stream, string, string)?>((stream, ctype, name));
    }
}
