/*
 File: backend/src/Nabz.Domain/Entities/Clinic.cs
 Description: کلینیک تک‌مستأجر پیش‌فرض با وضعیت پلتفرم و مختصات نمایشی
 Parent Dependencies: ClinicStatus
 */

using Nabz.Domain.Common;
using Nabz.Domain.Enums;

namespace Nabz.Domain.Entities;

public class Clinic : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    /// <summary>آدرس نمایشی بیمارستان/کلینیک برای مسیریابی Owner</summary>
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public ClinicStatus Status { get; set; } = ClinicStatus.Active;
    public string? AdminContact { get; set; }
    public string? AdminPhone { get; set; }
    public bool IsCurrentTenant { get; set; } = true;
}
