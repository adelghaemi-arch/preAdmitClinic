/*
 File: backend/src/Nabz.Application/Interfaces/IEvidenceService.cs
 Description: مدارک، عکس، GPS و نشست ضدتقلب — write و read
 Parent Dependencies: FraudReviewStatus
 */

using Nabz.Domain.Enums;

namespace Nabz.Application.Interfaces;

public record DocumentFileDto(Guid Id, string FileName, string MimeType, string StorageKey, long SizeBytes, string? DocumentDate);
public record DocumentGroupDetailDto(Guid Id, Guid PatientId, string DocumentType, string TypeLabelFa, string? Note, string? DocumentDate, IReadOnlyList<DocumentFileDto> Files);
public record DocumentGroupDto(Guid Id, Guid PatientId, string DocumentType, string TypeLabelFa, int FileCount);
public record PhotoDto(Guid Id, Guid PatientId, string Kind, string StorageKey, DateTime CapturedAt, Guid? SessionId, double? GpsLat, double? GpsLon);
/// <summary>نشست ضدتقلب با هویت Person برای بازبینی پلتفرم — نه فقط Guid خام.</summary>
public record FraudSessionDto(
    Guid Id,
    Guid PatientId,
    Guid? UserId,
    Guid? PackageId,
    string PatientFullName,
    string? PatientNationalId,
    string ReviewStatus,
    DateTime StartedAt,
    DateTime? EndedAt,
    string? ReviewNote,
    DateTime? ReviewedAt,
    string? ReviewedBy,
    IReadOnlyList<PhotoDto> Frames);
public record GpsPointDto(
    Guid Id,
    Guid PatientId,
    Guid? UserId,
    double Lat,
    double Lon,
    double Accuracy,
    DateTime CapturedAt,
    string Source,
    string? PatientFullName,
    string? PatientNationalId);
/// <summary>برش عمومی تنظیمات ضدتقلب برای نقش‌های غیر-Platform (مثلاً Owner).</summary>
public record FraudCaptureConfigDto(int FraudAutoCaptureSeconds, bool FraudWatchEnabled);

/// <summary>شروع/reuse نشست ضدتقلب — wrapKey فقط برای Owner نشست‌دار.</summary>
public record FraudStartResultDto(Guid SessionId, string WrapKey);

/// <summary>ردیف خزانهٔ فایل برای ادمین کل — document یا photo.</summary>
public record VaultFileDto(
    Guid Id,
    string Kind,
    Guid PatientId,
    string StorageKey,
    string FileName,
    long SizeBytes,
    string PatientFullName,
    string? NationalId,
    DateTime CapturedAt,
    DateTime? DeletedAt);

public interface IEvidenceService
{
    /// <summary>سه رقم اول کدملی برای شارد مسیر آپلود؛ Owner فقط مالک پرونده.</summary>
    Task<string> ResolveNationalIdPrefixForUploadAsync(Guid patientId, Guid actingUserId, bool isPlatform, CancellationToken ct = default);
    Task<IReadOnlyList<VaultFileDto>> ListVaultFilesAsync(bool trashOnly, int take = 100, CancellationToken ct = default);
    Task SoftDeleteVaultFilesAsync(IReadOnlyList<Guid> documentFileIds, IReadOnlyList<Guid> photoIds, CancellationToken ct = default);
    Task HardDeleteVaultFilesAsync(IReadOnlyList<Guid> documentFileIds, IReadOnlyList<Guid> photoIds, CancellationToken ct = default);
    Task<FraudCaptureConfigDto> GetFraudCaptureConfigAsync(CancellationToken ct = default);
    Task<DocumentGroupDto> AddDocumentGroupAsync(Guid patientId, Guid actingUserId, string documentType, string typeLabelFa, string? note, string? documentDate, CancellationToken ct = default);
    Task AddDocumentFilesAsync(Guid groupId, Guid actingUserId, IReadOnlyList<(string FileName, string MimeType, string StorageKey, long SizeBytes, string? DocumentDate)> files, CancellationToken ct = default);
    Task RemoveDocumentGroupAsync(Guid groupId, Guid actingUserId, CancellationToken ct = default);
    Task RemoveDocumentFileAsync(Guid fileId, Guid actingUserId, CancellationToken ct = default);
    Task UpdatePatientPhotoAsync(Guid patientId, Guid actingUserId, string storageKey, CancellationToken ct = default);
    Task<FraudStartResultDto> StartFraudSessionAsync(Guid patientId, Guid actingUserId, CancellationToken ct = default);
    /// <summary>کلید پوشش سیم برای آپلود فریم مبهم؛ فقط مالک نشست باز.</summary>
    Task<string> GetFraudWireWrapKeyAsync(Guid sessionId, Guid actingUserId, CancellationToken ct = default);
    Task CaptureFraudFrameAsync(Guid sessionId, Guid actingUserId, string storageKey, double? lat, double? lon, double? accuracy, UserPhotoKind kind = UserPhotoKind.FraudAuto, CancellationToken ct = default);
    Task EndFraudSessionAsync(Guid sessionId, Guid actingUserId, CancellationToken ct = default);
    Task RecordGpsAsync(Guid patientId, Guid actingUserId, double lat, double lon, double accuracy, string source, CancellationToken ct = default);
    Task ReviewFraudSessionAsync(Guid sessionId, FraudReviewStatus status, string? note, string reviewer, CancellationToken ct = default);
    Task<IReadOnlyList<FraudSessionDto>> ListFraudSessionsAsync(FraudReviewStatus? status, int take = 50, CancellationToken ct = default);
    Task<FraudSessionDto?> GetFraudSessionDetailAsync(Guid sessionId, CancellationToken ct = default);
    Task<IReadOnlyList<GpsPointDto>> ListGpsByPatientAsync(Guid patientId, int take = 50, CancellationToken ct = default);
    Task<IReadOnlyList<DocumentGroupDetailDto>> ListDocumentsByPatientAsync(Guid patientId, CancellationToken ct = default);
    Task<PhotoDto?> GetPortraitAsync(Guid patientId, CancellationToken ct = default);
    Task<IReadOnlyList<PhotoDto>> ListPhotosByPatientAsync(Guid patientId, CancellationToken ct = default);
    /// <summary>
    /// گیت دانلود فایل: Platform همه؛ Owner پروندهٔ خود؛ Specialist مدارک/پرتره (نه فریم تقلب).
    /// کلید ناشناس در DB → false.
    /// </summary>
    Task<bool> CanDownloadStorageKeyAsync(
        string storageKey,
        Guid actingUserId,
        bool isPlatform,
        bool isSpecialist = false,
        bool isAdmin = false,
        CancellationToken ct = default);
}
