/*
 File: backend/src/Nabz.Infrastructure/Services/EvidenceService.cs
 Description: مدارک، عکس، GPS، خزانه فایل Platform و حذف soft/hard با IFileStorage
 Parent Dependencies: IEvidenceRepository, IPatientRepository, IPlatformRepository, IFileStorage
 */

using Nabz.Application.Abstractions;
using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Storage;

namespace Nabz.Infrastructure.Services;

public sealed class EvidenceService(
    IEvidenceRepository evidence,
    IPatientRepository patients,
    IPatientProfileRevisionRepository profileRevisions,
    IPlatformRepository platform,
    IFileStorage files,
    IUnitOfWork uow) : IEvidenceService
{
    public async Task<string> ResolveNationalIdPrefixForUploadAsync(
        Guid patientId, Guid actingUserId, bool isPlatform, CancellationToken ct = default)
    {
        var patient = await patients.GetByIdAsync(patientId, ct)
            ?? throw new InvalidOperationException("بیمار یافت نشد.");
        if (!isPlatform && patient.OwnerUserId != actingUserId)
            throw new UnauthorizedAccessException("فقط مالک پرونده مجاز به آپلود است.");
        return LocalFileStorage.NormalizeNationalIdPrefix(patient.Person.NationalId);
    }

    public async Task<FraudCaptureConfigDto> GetFraudCaptureConfigAsync(CancellationToken ct = default)
    {
        var settings = await platform.GetSettingsAsync(ct);
        var seconds = settings?.FraudAutoCaptureSeconds ?? 7;
        if (seconds is < 2 or > 15) seconds = 7;
        var flags = PlatformService.ParseFlags(settings?.FeatureFlagsJson);
        return new FraudCaptureConfigDto(seconds, flags.FraudWatch);
    }

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
        // Owner: حذف فیزیکی blob تا orphan نماند
        foreach (var f in group.Files.ToList())
            await files.DeleteAsync(f.StorageKey, ct);
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
        await files.DeleteAsync(file.StorageKey, ct);
        evidence.RemoveDocumentFile(file);
        await uow.SaveChangesAsync(ct);
    }

    public async Task UpdatePatientPhotoAsync(Guid patientId, Guid actingUserId, string storageKey, CancellationToken ct = default)
    {
        await RequireOwner(patientId, actingUserId, ct);
        var previous = await evidence.GetLatestPortraitAsync(patientId, ct);
        await evidence.AddPhotoAsync(new PatientPhoto
        {
            PatientId = patientId,
            UserId = actingUserId,
            Kind = UserPhotoKind.Portrait,
            StorageKey = storageKey,
            CapturedAt = DateTime.UtcNow
        }, ct);
        // سوابق از→به برای تعویض عکس پرونده
        var revs = Application.Patients.PatientProfileDiff.Build(
            patientId,
            actingUserId,
            "photo",
            new Dictionary<string, string?> { ["Portrait"] = previous?.StorageKey },
            new Dictionary<string, string?> { ["Portrait"] = storageKey });
        if (revs.Count > 0)
            await profileRevisions.AddRangeAsync(revs, ct);
        await uow.SaveChangesAsync(ct);
    }

    public async Task<Guid> StartFraudSessionAsync(Guid patientId, Guid actingUserId, CancellationToken ct = default)
    {
        await RequireOwner(patientId, actingUserId, ct);
        // فلگ ادمین کل؛ فقط کلاینت کافی نیست
        var flags = PlatformService.ParseFlags((await platform.GetSettingsAsync(ct))?.FeatureFlagsJson);
        if (!flags.FraudWatch)
            throw new InvalidOperationException("ثبت ضدتقلب دوربین توسط ادمین کل غیرفعال شده است.");
        // remount دوربین نباید نشست باز قبلی را یتیم کند
        var open = await evidence.GetOpenFraudSessionAsync(patientId, actingUserId, ct);
        if (open is not null)
            return open.Id;

        var started = DateTime.UtcNow;
        var package = new EvidencePackage
        {
            PatientId = patientId,
            UserId = actingUserId,
            Kind = EvidencePackageKind.CameraSession,
            Label = "camera_session",
            DayKey = started.ToString("yyyy-MM-dd"),
            StartedAt = started,
            EndedAt = null
        };
        await evidence.AddEvidencePackageAsync(package, ct);
        await uow.SaveChangesAsync(ct);

        var session = new FraudCaptureSession
        {
            PatientId = patientId,
            UserId = actingUserId,
            PackageId = package.Id,
            StartedAt = started
        };
        await evidence.AddFraudSessionAsync(session, ct);
        package.SessionId = session.Id;
        await uow.SaveChangesAsync(ct);
        return session.Id;
    }

    public async Task CaptureFraudFrameAsync(Guid sessionId, Guid actingUserId, string storageKey, double? lat, double? lon, double? accuracy, UserPhotoKind kind = UserPhotoKind.FraudAuto, CancellationToken ct = default)
    {
        var session = await evidence.GetFraudSessionAsync(sessionId, ct)
            ?? throw new InvalidOperationException("نشست ضدتقلب یافت نشد.");
        if (session.UserId != actingUserId)
            throw new UnauthorizedAccessException();
        if (session.EndedAt is not null)
            throw new InvalidOperationException("نشست ضدتقلب بسته شده است.");
        if (kind is not UserPhotoKind.FraudAuto and not UserPhotoKind.FraudConfirm)
            throw new InvalidOperationException("نوع فریم ضدتقلب نامعتبر است.");
        await evidence.AddPhotoAsync(new PatientPhoto
        {
            PatientId = session.PatientId,
            UserId = actingUserId,
            Kind = kind,
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
        if (session.EndedAt is not null)
            return;
        var ended = DateTime.UtcNow;
        session.EndedAt = ended;
        session.UpdatedAt = ended;
        if (session.PackageId is Guid packageId)
        {
            var package = await evidence.GetEvidencePackageAsync(packageId, ct);
            if (package is not null)
                package.EndedAt = ended;
        }
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
        var patient = await patients.GetByIdAsync(patientId, ct);
        var fullName = patient is null
            ? ""
            : PersonName.Display(patient.Person.FirstName, patient.Person.LastName);
        var nationalId = patient?.Person.NationalId;
        return list.Select(g => new GpsPointDto(
            g.Id, g.PatientId, g.UserId, g.Lat, g.Lon, g.Accuracy, g.CapturedAt, g.Source, fullName, nationalId)).ToList();
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

    public async Task<IReadOnlyList<VaultFileDto>> ListVaultFilesAsync(bool trashOnly, int take = 100, CancellationToken ct = default)
    {
        var half = Math.Max(1, take / 2);
        var docs = await evidence.ListVaultDocumentFilesAsync(trashOnly, half, ct);
        var photos = await evidence.ListVaultPhotosAsync(trashOnly, half, ct);
        var rows = new List<VaultFileDto>();
        foreach (var f in docs)
        {
            var person = f.Group.Patient.Person;
            rows.Add(new VaultFileDto(
                f.Id,
                "document",
                f.Group.PatientId,
                f.StorageKey,
                f.FileName,
                f.SizeBytes,
                PersonName.Display(person.FirstName, person.LastName),
                person.NationalId,
                f.CreatedAt,
                f.DeletedAt));
        }
        foreach (var p in photos)
        {
            var person = p.Patient.Person;
            var kind = p.Kind switch
            {
                UserPhotoKind.Portrait => "portrait",
                UserPhotoKind.FraudConfirm => "fraud_confirm",
                UserPhotoKind.FraudAuto => "fraud_auto",
                _ => p.Kind.ToString().ToLowerInvariant()
            };
            rows.Add(new VaultFileDto(
                p.Id,
                kind,
                p.PatientId,
                p.StorageKey,
                Path.GetFileName(p.StorageKey),
                0,
                PersonName.Display(person.FirstName, person.LastName),
                person.NationalId,
                p.CapturedAt,
                p.DeletedAt));
        }
        return rows.OrderByDescending(r => r.CapturedAt).Take(take).ToList();
    }

    public async Task SoftDeleteVaultFilesAsync(
        IReadOnlyList<Guid> documentFileIds, IReadOnlyList<Guid> photoIds, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var docs = await evidence.ListDocumentFilesByIdsAsync(documentFileIds, ct);
        foreach (var f in docs.Where(x => x.DeletedAt is null))
        {
            f.DeletedAt = now;
            f.UpdatedAt = now;
        }
        var photos = await evidence.ListPhotosByIdsAsync(photoIds, ct);
        foreach (var p in photos.Where(x => x.DeletedAt is null))
        {
            p.DeletedAt = now;
            p.UpdatedAt = now;
        }
        await uow.SaveChangesAsync(ct);
    }

    public async Task HardDeleteVaultFilesAsync(
        IReadOnlyList<Guid> documentFileIds, IReadOnlyList<Guid> photoIds, CancellationToken ct = default)
    {
        var docs = await evidence.ListDocumentFilesByIdsAsync(documentFileIds, ct);
        foreach (var f in docs)
        {
            await files.DeleteAsync(f.StorageKey, ct);
            evidence.RemoveDocumentFile(f);
        }
        var photos = await evidence.ListPhotosByIdsAsync(photoIds, ct);
        foreach (var p in photos)
        {
            await files.DeleteAsync(p.StorageKey, ct);
            evidence.RemovePhoto(p);
        }
        await uow.SaveChangesAsync(ct);
    }

    private async Task<FraudSessionDto> MapFraudSession(FraudCaptureSession s, bool includeFrames, CancellationToken ct)
    {
        IReadOnlyList<PhotoDto> frames = Array.Empty<PhotoDto>();
        if (includeFrames)
        {
            var photos = await evidence.ListPhotosBySessionAsync(s.Id, ct);
            frames = photos.Select(MapPhoto).ToList();
        }
        // هویت برای پنل پلتفرم از Person پرونده — نه hash Guid در FE
        var patient = await patients.GetByIdAsync(s.PatientId, ct);
        var fullName = patient is null
            ? "بیمار بدون نام"
            : PersonName.Display(patient.Person.FirstName, patient.Person.LastName);
        var nationalId = patient?.Person.NationalId;
        return new FraudSessionDto(
            s.Id,
            s.PatientId,
            s.UserId,
            s.PackageId,
            fullName,
            nationalId,
            s.ReviewStatus.ToString(),
            s.StartedAt,
            s.EndedAt,
            s.ReviewNote,
            s.ReviewedAt,
            s.ReviewedBy,
            frames);
    }

    private static PhotoDto MapPhoto(PatientPhoto p) => new(
        p.Id, p.PatientId, p.Kind.ToString(), p.StorageKey, p.CapturedAt, p.SessionId, p.GpsLat, p.GpsLon);

    public async Task<bool> CanDownloadStorageKeyAsync(
        string storageKey, Guid actingUserId, bool isPlatform, CancellationToken ct = default)
    {
        var key = Uri.UnescapeDataString(storageKey ?? "").Trim();
        if (string.IsNullOrEmpty(key)) return false;

        var photo = await evidence.FindPhotoByStorageKeyAsync(key, ct);
        if (photo is not null)
        {
            // فریم ضدتقلب فقط برای ادمین کل
            if (photo.Kind is UserPhotoKind.FraudAuto or UserPhotoKind.FraudConfirm)
                return isPlatform;
            if (isPlatform) return true;
            return photo.Patient?.OwnerUserId == actingUserId
                   || (await patients.GetByIdAsync(photo.PatientId, ct))?.OwnerUserId == actingUserId;
        }

        var doc = await evidence.FindDocumentFileByStorageKeyAsync(key, ct);
        if (doc is not null)
        {
            if (isPlatform) return true;
            var patientId = doc.Group?.PatientId ?? Guid.Empty;
            if (patientId == Guid.Empty) return false;
            if (doc.Group?.Patient?.OwnerUserId == actingUserId) return true;
            return (await patients.GetByIdAsync(patientId, ct))?.OwnerUserId == actingUserId;
        }

        // کلید بدون رکورد در DB — دانلود ممنوع (جلوگیری از enumeration)
        return false;
    }

    private async Task<Patient> RequireOwner(Guid patientId, Guid actingUserId, CancellationToken ct)
    {
        var patient = await patients.GetByIdAsync(patientId, ct)
            ?? throw new InvalidOperationException("بیمار یافت نشد.");
        if (patient.OwnerUserId != actingUserId)
            throw new UnauthorizedAccessException("فقط مالک پرونده مجاز است.");
        return patient;
    }
}
