/*
 File: backend/src/Nabz.Domain/Entities/Clinic.cs
 Description: کلینیک تک‌مستأجر پیش‌فرض با وضعیت پلتفرم
 Parent Dependencies: ClinicStatus
 */

using Nabz.Domain.Common;
using Nabz.Domain.Enums;

namespace Nabz.Domain.Entities;

public class Clinic : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public ClinicStatus Status { get; set; } = ClinicStatus.Active;
    public string? AdminContact { get; set; }
    public string? AdminPhone { get; set; }
    public bool IsCurrentTenant { get; set; } = true;
}
