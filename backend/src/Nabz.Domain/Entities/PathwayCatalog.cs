/*
 File: backend/src/Nabz.Domain/Entities/PathwayCatalog.cs
 Description: مسیر سلامتی واحد (معیار تطبیق + ایستگاه‌ها) و پیشرفت خوداظهاری بیمار
 Parent Dependencies: EntityBase, Patient
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

/// <summary>مسیر سلامتی — عنوان، معیار جمعیتی و ترتیب ایستگاه در یک آبجکت.</summary>
public class PathwayDefinition : EntityBase
{
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int EstimatedTotalMinutes { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>در کتابخانه مرکزی قابل اتصال به قراردادها باشد.</summary>
    public bool IsInLibrary { get; set; } = true;
    public string Gender { get; set; } = "همه";
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }
    public string JobCategory { get; set; } = "همه";
    public ICollection<PathwayStationDef> Stations { get; set; } = new List<PathwayStationDef>();
}

public class PathwayStationDef : EntityBase
{
    public Guid PathwayDefinitionId { get; set; }
    public PathwayDefinition PathwayDefinition { get; set; } = null!;
    public string RoomCode { get; set; } = string.Empty;
    public string TitleFa { get; set; } = string.Empty;
    public int StepOrder { get; set; }
    /// <summary>گام اختیاری (مثلاً تست ورزش / پاپ) — در itinerary نمایش داده می‌شود.</summary>
    public bool IsOptional { get; set; }
}

/// <summary>تأیید خوداظهاری «رفتم» روی itinerary — جدا از صف بالینی VisitStation.</summary>
public class PatientPathwayStationProgress : EntityBase
{
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public Guid PathwayStationDefId { get; set; }
    public PathwayStationDef PathwayStationDef { get; set; } = null!;
    public DateTime ConfirmedAt { get; set; } = DateTime.UtcNow;
}
