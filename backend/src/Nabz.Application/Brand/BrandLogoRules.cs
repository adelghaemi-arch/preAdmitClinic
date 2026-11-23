/*
 File: backend/src/Nabz.Application/Brand/BrandLogoRules.cs
 Description: قواعد MIME/اندازه و پیشوند مسیر لوگوی کلینیک و قرارداد
 Parent Dependencies: none
 */

namespace Nabz.Application.Brand;

public static class BrandLogoRules
{
    public const long MaxBytes = 2 * 1024 * 1024;
    public const string ClinicFolder = "clinic-brand";
    public const string ContractFolderPrefix = "contract-brand";

    public static bool IsAllowedContentType(string? contentType)
    {
        var ct = (contentType ?? "").Trim().ToLowerInvariant();
        return ct is "image/png" or "image/jpeg" or "image/jpg" or "image/webp";
    }

    public static string NormalizeExtension(string contentType, string fileName)
    {
        var ct = (contentType ?? "").Trim().ToLowerInvariant();
        if (ct is "image/png") return ".png";
        if (ct is "image/webp") return ".webp";
        if (ct is "image/jpeg" or "image/jpg") return ".jpg";
        var ext = Path.GetExtension(fileName);
        return string.IsNullOrWhiteSpace(ext) ? ".bin" : ext.ToLowerInvariant();
    }

    public static string ContractFolder(Guid contractId) => $"{ContractFolderPrefix}/{contractId:N}";

    public static bool IsBrandStorageKey(string storageKey)
    {
        var key = (storageKey ?? "").Trim().Replace('\\', '/');
        return key.StartsWith(ClinicFolder + "/", StringComparison.OrdinalIgnoreCase)
               || key.StartsWith(ContractFolderPrefix + "/", StringComparison.OrdinalIgnoreCase);
    }

    public static void EnsureValidUpload(string contentType, long sizeBytes)
    {
        if (!IsAllowedContentType(contentType))
            throw new InvalidOperationException("فقط تصویر PNG، JPEG یا WebP مجاز است.");
        if (sizeBytes <= 0 || sizeBytes > MaxBytes)
            throw new InvalidOperationException("حجم لوگو باید حداکثر ۲ مگابایت باشد.");
    }
}
