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
public record FraudSessionDto(Guid Id, Guid PatientId, string ReviewStatus, DateTime StartedAt, DateTime? EndedAt, string? ReviewNote, IReadOnlyList<PhotoDto> Frames);
public record GpsPointDto(Guid Id, Guid PatientId, double Lat, double Lon, double Accuracy, DateTime CapturedAt, string Source);

public interface IEvidenceService
{
    Task<DocumentGroupDto> AddDocumentGroupAsync(Guid patientId, Guid actingUserId, string documentType, string typeLabelFa, string? note, string? documentDate, CancellationToken ct = default);
    Task AddDocumentFilesAsync(Guid groupId, Guid actingUserId, IReadOnlyList<(string FileName, string MimeType, string StorageKey, long SizeBytes, string? DocumentDate)> files, CancellationToken ct = default);
    Task RemoveDocumentGroupAsync(Guid groupId, Guid actingUserId, CancellationToken ct = default);
    Task RemoveDocumentFileAsync(Guid fileId, Guid actingUserId, CancellationToken ct = default);
    Task UpdatePatientPhotoAsync(Guid patientId, Guid actingUserId, string storageKey, CancellationToken ct = default);
    Task<Guid> StartFraudSessionAsync(Guid patientId, Guid actingUserId, CancellationToken ct = default);
    Task CaptureFraudFrameAsync(Guid sessionId, Guid actingUserId, string storageKey, double? lat, double? lon, double? accuracy, CancellationToken ct = default);
    Task EndFraudSessionAsync(Guid sessionId, Guid actingUserId, CancellationToken ct = default);
    Task RecordGpsAsync(Guid patientId, Guid actingUserId, double lat, double lon, double accuracy, string source, CancellationToken ct = default);
    Task ReviewFraudSessionAsync(Guid sessionId, FraudReviewStatus status, string? note, string reviewer, CancellationToken ct = default);
    Task<IReadOnlyList<FraudSessionDto>> ListFraudSessionsAsync(FraudReviewStatus? status, int take = 50, CancellationToken ct = default);
    Task<FraudSessionDto?> GetFraudSessionDetailAsync(Guid sessionId, CancellationToken ct = default);
    Task<IReadOnlyList<GpsPointDto>> ListGpsByPatientAsync(Guid patientId, int take = 50, CancellationToken ct = default);
    Task<IReadOnlyList<DocumentGroupDetailDto>> ListDocumentsByPatientAsync(Guid patientId, CancellationToken ct = default);
    Task<PhotoDto?> GetPortraitAsync(Guid patientId, CancellationToken ct = default);
    Task<IReadOnlyList<PhotoDto>> ListPhotosByPatientAsync(Guid patientId, CancellationToken ct = default);
}
