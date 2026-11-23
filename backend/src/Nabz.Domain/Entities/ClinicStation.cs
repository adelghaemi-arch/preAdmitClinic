/*
 File: backend/src/Nabz.Domain/Entities/ClinicStation.cs
 Description: کاتالوگ ایستگاه/اتاق کلینیک — عناوین مراحل بدون صف
 Parent Dependencies: EntityBase, Clinic
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

/// <summary>ایستگاه فیزیکی/منطقی کلینیک؛ Code پایدار، TitleFa عنوان نمایشی مسیر بیمار.</summary>
public class ClinicStation : EntityBase
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    /// <summary>کلید پایدار مثل LAB / ECG — یکتا در هر کلینیک.</summary>
    public string Code { get; set; } = string.Empty;
    public string TitleFa { get; set; } = string.Empty;
    /// <summary>paraclinic | specialist | hospitality | remote | other</summary>
    public string Category { get; set; } = "other";
    public int Floor { get; set; } = 1;
    public string RoomNumber { get; set; } = string.Empty;
    public string? PrepInstructions { get; set; }
    public string? WayfindingSteps { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
