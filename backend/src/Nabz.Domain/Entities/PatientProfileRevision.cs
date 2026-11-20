/*
 File: backend/src/Nabz.Domain/Entities/PatientProfileRevision.cs
 Description: سابقهٔ از→به برای تغییرات دموگرافیک/آدرس/عکس پرونده
 Parent Dependencies: Patient, User, EntityBase
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

public class PatientProfileRevision : EntityBase
{
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public string Field { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public Guid ChangedByUserId { get; set; }
    public User ChangedByUser { get; set; } = null!;
    /// <summary>owner_profile | admin | form_submit | companion_map | photo</summary>
    public string Source { get; set; } = string.Empty;
    public DateTime At { get; set; } = DateTime.UtcNow;
}
