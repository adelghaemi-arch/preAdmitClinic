/*
 File: backend/src/Nabz.Infrastructure/Storage/LocalFileStorage.cs
 Description: ذخیره سلسله‌مراتبی yyyy/NNN زیر persist/uploads؛ گارد ریشهٔ داکر؛ حذف امن کلید نسبی
 Parent Dependencies: IFileStorage, IConfiguration
 */

using Microsoft.Extensions.Configuration;
using Nabz.Application.Abstractions;

namespace Nabz.Infrastructure.Storage;

public sealed class LocalFileStorage(IConfiguration configuration) : IFileStorage
{
    private const string DockerPersistRoot = "/app/wwwroot/uploads";

    private string Root()
    {
        var configured = configuration["Storage:Root"];
        if (!string.IsNullOrWhiteSpace(configured))
            return Path.GetFullPath(configured);
        // اگر bind mount داکر موجود باشد، هرگز داخل /app/uploads (لایهٔ image) ننویس
        if (Directory.Exists(DockerPersistRoot))
            return Path.GetFullPath(DockerPersistRoot);
        // پیش‌فرض لوکال؛ در دیپلوی Storage__Root=/app/wwwroot/uploads الزامی است
        return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "uploads"));
    }

    public static string NormalizeNationalIdPrefix(string? nationalId)
    {
        if (string.IsNullOrWhiteSpace(nationalId)) return "000";
        var digits = new string(nationalId.Where(char.IsDigit).ToArray());
        if (digits.Length < 3) return "000";
        return digits[..3];
    }

    public async Task<StoredFileResult> SaveAsync(
        Stream content,
        string fileName,
        string contentType,
        StorageSaveContext? context = null,
        CancellationToken ct = default)
    {
        var safeName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeName)) safeName = "file.bin";
        var year = DateTime.UtcNow.ToString("yyyy");
        var prefix = NormalizeNationalIdPrefix(context?.NationalIdPrefix);
        // سلسله: سال / سه رقم کدملی / فایل — جلوگیری از انباشت در یک پوشه
        var key = $"{year}/{prefix}/{Guid.NewGuid():N}_{safeName}";
        var full = Path.Combine(Root(), key.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        await using var fs = File.Create(full);
        await content.CopyToAsync(fs, ct);
        var len = fs.Length;
        return new StoredFileResult(
            key.Replace('\\', '/'),
            safeName,
            string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            len);
    }

    public Task<(Stream Stream, string ContentType, string FileName)?> OpenReadAsync(string storageKey, CancellationToken ct = default)
    {
        var full = ResolveFullPath(storageKey);
        if (full is null || !File.Exists(full)) return Task.FromResult<(Stream, string, string)?>(null);
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

    public Task<bool> DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        var full = ResolveFullPath(storageKey);
        if (full is null || !File.Exists(full)) return Task.FromResult(false);
        File.Delete(full);
        return Task.FromResult(true);
    }

    public Task ClearAllAsync(CancellationToken ct = default)
    {
        var root = Root();
        if (!Directory.Exists(root))
        {
            Directory.CreateDirectory(root);
            return Task.CompletedTask;
        }

        // فقط محتویات — پوشهٔ ریشه برای bind mount دیپلوی باقی می‌ماند
        foreach (var dir in Directory.EnumerateDirectories(root))
            Directory.Delete(dir, recursive: true);
        foreach (var file in Directory.EnumerateFiles(root))
            File.Delete(file);

        return Task.CompletedTask;
    }

    private string? ResolveFullPath(string storageKey)
    {
        if (string.IsNullOrWhiteSpace(storageKey) || storageKey.Contains("..", StringComparison.Ordinal))
            return null;
        var full = Path.GetFullPath(Path.Combine(Root(), storageKey.Replace('/', Path.DirectorySeparatorChar)));
        var rootFull = Root();
        if (!full.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase))
            return null;
        return full;
    }
}
