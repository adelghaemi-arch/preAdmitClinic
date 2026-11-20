/*
 File: backend/src/Nabz.Domain/Entities/UserRoleAssignment.cs
 Description: انتساب نقش v1 به کاربر؛ ناظر می‌تواند به قرارداد محدود شود
 Parent Dependencies: AppRole, User
 */

using Nabz.Domain.Common;
using Nabz.Domain.Enums;

namespace Nabz.Domain.Entities;

public class UserRoleAssignment : EntityBase
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public AppRole Role { get; set; }
    /// <summary>برای ناظر: محدودهٔ قرارداد سازمان خود.</summary>
    public Guid? ContractId { get; set; }
    public Guid? ClinicId { get; set; }
}
