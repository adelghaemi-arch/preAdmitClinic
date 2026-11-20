/*
 File: backend/tests/Nabz.Infrastructure.Tests/Fakes/FakeFileStorage.cs
 Description: ذخیره باینری فایل در حافظه برای تست سرویس
 Parent Dependencies: Nabz.Application.Abstractions.IFileStorage
 */

using System.Collections.Concurrent;
using Nabz.Application.Abstractions;

namespace Nabz.Infrastructure.Tests.Fakes;

public sealed class FakeFileStorage : IFileStorage
{
    private readonly ConcurrentDictionary<string, (byte[] Bytes, string ContentType, string FileName)> _files = new();

    public IReadOnlyDictionary<string, (byte[] Bytes, string ContentType, string FileName)> Files => _files;

    public async Task<StoredFileResult> SaveAsync(Stream content, string fileName, string contentType, CancellationToken ct = default)
    {
        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();
        var key = Guid.NewGuid().ToString("N");
        _files[key] = (bytes, contentType, fileName);
        return new StoredFileResult(key, fileName, contentType, bytes.Length);
    }

    public Task<(Stream Stream, string ContentType, string FileName)?> OpenReadAsync(string storageKey, CancellationToken ct = default)
    {
        if (!_files.TryGetValue(storageKey, out var entry))
            return Task.FromResult<(Stream, string, string)?>(null);

        var stream = new MemoryStream(entry.Bytes);
        return Task.FromResult<(Stream, string, string)?>((stream, entry.ContentType, entry.FileName));
    }
}