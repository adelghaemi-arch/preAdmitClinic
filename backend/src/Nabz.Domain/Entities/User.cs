/*
 File: backend/src/Nabz.Domain/Entities/User.cs
 Description: کاربر سیستم با موبایل یکتا و وضعیت فعال
 Parent Dependencies: EntityBase
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

public class User : EntityBase
{
    public string Mobile { get; set; } = string.Empty;
    public string? NationalId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }

    public ICollection<UserRoleAssignment> Roles { get; set; } = new List<UserRoleAssignment>();
}
