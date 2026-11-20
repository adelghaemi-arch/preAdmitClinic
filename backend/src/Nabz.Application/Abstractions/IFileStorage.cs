/*
 File: backend/src/Nabz.Application/Abstractions/IFileStorage.cs
 Description: ذخیره و خواندن فایل باینری بدون افشای مسیر فیزیکی به Controller
 Parent Dependencies: none
 */

namespace Nabz.Application.Abstractions;

public record StoredFileResult(string StorageKey, string FileName, string ContentType, long SizeBytes);

public interface IFileStorage
{
    Task<StoredFileResult> SaveAsync(Stream content, string fileName, string contentType, CancellationToken ct = default);
    Task<(Stream Stream, string ContentType, string FileName)?> OpenReadAsync(string storageKey, CancellationToken ct = default);
}
