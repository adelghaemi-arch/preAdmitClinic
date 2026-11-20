/*
 File: backend/src/Nabz.Infrastructure/Services/EvidenceService.cs
 Description: مدارک، عکس، GPS و بازبینی ضدتقلب با سقف‌های تنظیمات
 Parent Dependencies: IEvidenceRepository, IPatientRepository, IPlatformRepository
 */

using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Services;

public sealed class EvidenceService(
    IEvidenceRepository evidence,
    IPatientRepository patients,
    IPlatformRepository platform,
    IUnitOfWork uow) : IEvidenceService
{
    public async Task<DocumentGroupDto> AddDocumentGroupAsync(Guid patientId, Guid actingUserId, string documentType, string typeLabelFa, string? note, string? documentDate, CancellationToken ct = default)
    {
        var patient = await RequireOwner(patientId, actingUserId, ct);
        if (patient.IntakeCompleted)
            throw new InvalidOperationException("پس از تکمیل پیش‌پذیرش امکان افزودن مدرک نیست.");

        var settings = await platform.GetSettingsAsync(ct);
        var maxGroups = settings?.IntakeDocumentMaxGroups ?? 20;
        var count = await evidence.CountGroupsAsync(patientId, ct);
        if (count >= maxGroups)
            throw new InvalidOperationException($"حداکثر {maxGroups} تیپ مدرک مجاز است.");

        var group = new IntakeDocumentGroup
        {
            PatientId = patientId,
            DocumentType = documentType,
            TypeLabelFa = typeLabelFa,
            Note = note,
            DocumentDate = documentDate
        };
        await evidence.AddDocumentGroupAsync(group, ct);
        await uow.SaveChangesAsync(ct);
        return new DocumentGroupDto(group.Id, patientId, documentType, typeLabelFa, 0);
    }

    public async Task AddDocumentFilesAsync(Guid groupId, Guid actingUserId, IReadOnlyList<(string FileName, string MimeType, string StorageKey, long SizeBytes, string? DocumentDate)> files, CancellationToken ct = default)
    {
        var group = await evidence.GetDocumentGroupAsync(groupId, ct)
            ?? throw new InvalidOperationException("گروه مدرک یافت نشد.");
        var patient = await RequireOwner(group.PatientId, actingUserId, ct);
        if (patient.IntakeCompleted)
            throw new InvalidOperationException("پس از تکمیل پیش‌پذیرش امکان افزودن فایل نیست.");

        var settings = await platform.GetSettingsAsync(ct);
        var maxFiles = settings?.IntakeDocumentMaxFilesPerGroup ?? 20;
        var maxBytes = settings?.IntakeDocumentMaxBytes ?? 5 * 1024 * 1024;
        if (group.Files.Count + files.Count > maxFiles)
            throw new InvalidOperationException($"هر تیپ مدرک حداکثر {maxFiles} فایل می‌پذیرد.");

        foreach (var f in files)
        {
            if (f.SizeBytes > maxBytes)
                throw new InvalidOperationException("حجم فایل بیش از سقف مجاز است.");
            group.Files.Add(new IntakeDocumentFile
            {
                GroupId = group.Id,
                FileName = f.FileName,
                MimeType = f.MimeType,
                StorageKey = f.StorageKey,
                SizeBytes = f.SizeBytes,
                DocumentDate = f.DocumentDate
            });
        }
        group.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task RemoveDocumentGroupAsync(Guid groupId, Guid actingUserId, CancellationToken ct = default)
    {
        var group = await evidence.GetDocumentGroupAsync(groupId, ct)
            ?? throw new InvalidOperationException("گروه مدرک یافت نشد.");
        var patient = await RequireOwner(group.PatientId, actingUserId, ct);
        if (patient.IntakeCompleted)
            throw new InvalidOperationException("پس از تکمیل پیش‌پذیرش امکان حذف مدرک نیست.");
        evidence.RemoveDocumentGroup(group);
        await uow.SaveChangesAsync(ct);
    }

    public async Task RemoveDocumentFileAsync(Guid fileId, Guid actingUserId, CancellationToken ct = default)
    {
        var file = await evidence.GetDocumentFileAsync(fileId, ct)
            ?? throw new InvalidOperationException("فایل یافت نشد.");
        var patient = await RequireOwner(file.Group.PatientId, actingUserId, ct);
        if (patient.IntakeCompleted)
            throw new InvalidOperationException("پس از تکمیل پیش‌پذیرش امکان حذف فایل نیست.");
        evidence.RemoveDocumentFile(file);
        await uow.SaveChangesAsync(ct);
    }

    public async Task UpdatePatientPhotoAsync(Guid patientId, Guid actingUserId, string storageKey, CancellationToken ct = default)
    {
        await RequireOwner(patientId, actingUserId, ct);
        await evidence.AddPhotoAsync(new PatientPhoto
        {
            PatientId = patientId,
            UserId = actingUserId,
            Kind = UserPhotoKind.Portrait,
            StorageKey = storageKey,
            CapturedAt = DateTime.UtcNow
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    public async Task<Guid> StartFraudSessionAsync(Guid patientId, Guid actingUserId, CancellationToken ct = default)
    {
        await RequireOwner(patientId, actingUserId, ct);
        var package = new EvidencePackage
        {
            PatientId = patientId,
            UserId = actingUserId,
            Kind = EvidencePackageKind.CameraSession,
            Label = "camera_session",
            DayKey = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            StartedAt = DateTime.UtcNow,
            EndedAt = DateTime.UtcNow
        };
        await evidence.AddEvidencePackageAsync(package, ct);
        await uow.SaveChangesAsync(ct);

        var session = new FraudCaptureSession
        {
            PatientId = patientId,
            UserId = actingUserId,
            PackageId = package.Id,
            StartedAt = DateTime.UtcNow
        };
        await evidence.AddFraudSessionAsync(session, ct);
        package.SessionId = session.Id;
        await uow.SaveChangesAsync(ct);
        return session.Id;
    }

    public async Task CaptureFraudFrameAsync(Guid sessionId, Guid actingUserId, string storageKey, double? lat, double? lon, double? accuracy, CancellationToken ct = default)
    {
        var session = await evidence.GetFraudSessionAsync(sessionId, ct)
            ?? throw new InvalidOperationException("نشست ضدتقلب یافت نشد.");
        if (session.UserId != actingUserId)
            throw new UnauthorizedAccessException();
        await evidence.AddPhotoAsync(new PatientPhoto
        {
            PatientId = session.PatientId,
            UserId = actingUserId,
            Kind = UserPhotoKind.FraudAuto,
            StorageKey = storageKey,
            SessionId = sessionId,
            PackageId = session.PackageId,
            GpsLat = lat,
            GpsLon = lon,
            GpsAccuracy = accuracy
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    public async Task EndFraudSessionAsync(Guid sessionId, Guid actingUserId, CancellationToken ct = default)
    {
        var session = await evidence.GetFraudSessionAsync(sessionId, ct)
            ?? throw new InvalidOperationException("نشست ضدتقلب یافت نشد.");
        // فقط مالک نشست می‌تواند پایان دهد
        if (session.UserId != actingUserId)
            throw new UnauthorizedAccessException("فقط صاحب نشست ضدتقلب مجاز است.");
        session.EndedAt = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task RecordGpsAsync(Guid patientId, Guid actingUserId, double lat, double lon, double accuracy, string source, CancellationToken ct = default)
    {
        await RequireOwner(patientId, actingUserId, ct);
        await evidence.AddGpsAsync(new GpsPoint
        {
            PatientId = patientId,
            UserId = actingUserId,
            Lat = lat,
            Lon = lon,
            Accuracy = accuracy,
            Source = source
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    public async Task ReviewFraudSessionAsync(Guid sessionId, FraudReviewStatus status, string? note, string reviewer, CancellationToken ct = default)
    {
        var session = await evidence.GetFraudSessionAsync(sessionId, ct)
            ?? throw new InvalidOperationException("نشست ضدتقلب یافت نشد.");
        session.ReviewStatus = status;
        session.ReviewNote = note;
        session.ReviewedAt = DateTime.UtcNow;
        session.ReviewedBy = reviewer;
        session.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<FraudSessionDto>> ListFraudSessionsAsync(FraudReviewStatus? status, int take = 50, CancellationToken ct = default)
    {
        var list = await evidence.ListFraudSessionsAsync(status, take, ct);
        var result = new List<FraudSessionDto>();
        foreach (var s in list)
            result.Add(await MapFraudSession(s, includeFrames: false, ct));
        return result;
    }

    public async Task<FraudSessionDto?> GetFraudSessionDetailAsync(Guid sessionId, CancellationToken ct = default)
    {
        var s = await evidence.GetFraudSessionAsync(sessionId, ct);
        return s is null ? null : await MapFraudSession(s, includeFrames: true, ct);
    }

    public async Task<IReadOnlyList<GpsPointDto>> ListGpsByPatientAsync(Guid patientId, int take = 50, CancellationToken ct = default)
    {
        var list = await evidence.ListGpsByPatientAsync(patientId, take, ct);
        return list.Select(g => new GpsPointDto(g.Id, g.PatientId, g.Lat, g.Lon, g.Accuracy, g.CapturedAt, g.Source)).ToList();
    }

    public async Task<IReadOnlyList<DocumentGroupDetailDto>> ListDocumentsByPatientAsync(Guid patientId, CancellationToken ct = default)
    {
        var groups = await evidence.ListDocumentGroupsByPatientAsync(patientId, ct);
        return groups.Select(g => new DocumentGroupDetailDto(
            g.Id, g.PatientId, g.DocumentType, g.TypeLabelFa, g.Note, g.DocumentDate,
            g.Files.Select(f => new DocumentFileDto(f.Id, f.FileName, f.MimeType, f.StorageKey, f.SizeBytes, f.DocumentDate)).ToList()
        )).ToList();
    }

    public async Task<PhotoDto?> GetPortraitAsync(Guid patientId, CancellationToken ct = default)
    {
        var p = await evidence.GetLatestPortraitAsync(patientId, ct);
        return p is null ? null : MapPhoto(p);
    }

    public async Task<IReadOnlyList<PhotoDto>> ListPhotosByPatientAsync(Guid patientId, CancellationToken ct = default)
    {
        var list = await evidence.ListPhotosByPatientAsync(patientId, ct);
        return list.Select(MapPhoto).ToList();
    }

    private async Task<FraudSessionDto> MapFraudSession(FraudCaptureSession s, bool includeFrames, CancellationToken ct)
    {
        IReadOnlyList<PhotoDto> frames = Array.Empty<PhotoDto>();
        if (includeFrames)
        {
            var photos = await evidence.ListPhotosBySessionAsync(s.Id, ct);
            frames = photos.Select(MapPhoto).ToList();
        }
        return new FraudSessionDto(s.Id, s.PatientId, s.ReviewStatus.ToString(), s.StartedAt, s.EndedAt, s.ReviewNote, frames);
    }

    private static PhotoDto MapPhoto(PatientPhoto p) => new(
        p.Id, p.PatientId, p.Kind.ToString(), p.StorageKey, p.CapturedAt, p.SessionId, p.GpsLat, p.GpsLon);

    private async Task<Patient> RequireOwner(Guid patientId, Guid actingUserId, CancellationToken ct)
    {
        var patient = await patients.GetByIdAsync(patientId, ct)
            ?? throw new InvalidOperationException("بیمار یافت نشد.");
        if (patient.OwnerUserId != actingUserId)
            throw new UnauthorizedAccessException("فقط مالک پرونده مجاز است.");
        return patient;
    }
}
