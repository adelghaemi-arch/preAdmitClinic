/*
 File: backend/src/Nabz.Domain/Entities/IntakeEvidence.cs
 Description: مدارک، عکس، GPS، نشست ضدتقلب و بسته شواهد
 Parent Dependencies: Patient, FraudReviewStatus
 */

using Nabz.Domain.Common;
using Nabz.Domain.Enums;

namespace Nabz.Domain.Entities;

public class IntakeDocumentGroup : EntityBase
{
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public string DocumentType { get; set; } = "other";
    public string TypeLabelFa { get; set; } = string.Empty;
    public string? Note { get; set; }
    public string? DocumentDate { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public ICollection<IntakeDocumentFile> Files { get; set; } = new List<IntakeDocumentFile>();
}

public class IntakeDocumentFile : EntityBase
{
    public Guid GroupId { get; set; }
    public IntakeDocumentGroup Group { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public string StorageKey { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string? DocumentDate { get; set; }
    /// <summary>حذف منطقی — فایل روی دیسک می‌ماند تا hard delete.</summary>
    public DateTime? DeletedAt { get; set; }
}

public class PatientPhoto : EntityBase
{
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public Guid? UserId { get; set; }
    public UserPhotoKind Kind { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public DateTime CapturedAt { get; set; } = DateTime.UtcNow;
    public Guid? SessionId { get; set; }
    public Guid? PackageId { get; set; }
    public double? GpsLat { get; set; }
    public double? GpsLon { get; set; }
    public double? GpsAccuracy { get; set; }
    /// <summary>حذف منطقی — فایل روی دیسک می‌ماند تا hard delete.</summary>
    public DateTime? DeletedAt { get; set; }
}

public class GpsPoint : EntityBase
{
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public Guid? UserId { get; set; }
    public double Lat { get; set; }
    public double Lon { get; set; }
    public double Accuracy { get; set; }
    public DateTime CapturedAt { get; set; } = DateTime.UtcNow;
    public string Source { get; set; } = "manual";
    public Guid? PackageId { get; set; }
}

public class FraudCaptureSession : EntityBase
{
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public Guid? UserId { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }
    public FraudReviewStatus ReviewStatus { get; set; } = FraudReviewStatus.Pending;
    public string? ReviewNote { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
    public Guid? PackageId { get; set; }
}

public class EvidencePackage : EntityBase
{
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public Guid? UserId { get; set; }
    public EvidencePackageKind Kind { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    // null یعنی بسته هنوز باز است؛ فقط در EndFraud ست می‌شود
    public DateTime? EndedAt { get; set; }
    public Guid? SessionId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string DayKey { get; set; } = string.Empty;
}
