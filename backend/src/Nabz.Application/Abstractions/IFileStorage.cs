/*
 File: backend/src/Nabz.Application/Abstractions/IFileStorage.cs
 Description: ذخیره/خواندن/حذف فایل باینری؛ مسیر نسبی بدون افشای Root به Controller
 Parent Dependencies: none
 */

namespace Nabz.Application.Abstractions;

public record StoredFileResult(string StorageKey, string FileName, string ContentType, long SizeBytes);

/// <summary>
/// زمینهٔ شارد مسیر: سال UTC + سه رقم اول کدملی.
/// اگر <see cref="CanonicalFileName"/> ست باشد، همان نام داخلی (بدون نام کلاینت) روی دیسک می‌رود.
/// </summary>
/// <param name="FolderOverride">اگر ست باشد مسیر کلید = folder/file (بدون سال/کدملی) — برای برند کلینیک/قرارداد.</param>
public record StorageSaveContext(
    string? NationalIdPrefix = null,
    string? CanonicalFileName = null,
    string? FolderOverride = null);

public interface IFileStorage
{
    Task<StoredFileResult> SaveAsync(
        Stream content,
        string fileName,
        string contentType,
        StorageSaveContext? context = null,
        CancellationToken ct = default);

    Task<(Stream Stream, string ContentType, string FileName)?> OpenReadAsync(string storageKey, CancellationToken ct = default);

    /// <summary>حذف فیزیکی یک فایل نسبی؛ false اگر نبود یا کلید نامعتبر.</summary>
    Task<bool> DeleteAsync(string storageKey, CancellationToken ct = default);

    /// <summary>پاک کردن محتویات ریشهٔ آپلود (خود پوشه می‌ماند) — ریست فکتوری.</summary>
    Task ClearAllAsync(CancellationToken ct = default);
}
