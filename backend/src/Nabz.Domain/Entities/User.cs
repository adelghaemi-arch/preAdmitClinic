/*
 File: backend/src/Nabz.Domain/Entities/User.cs
 Description: حساب ورود و نقش‌ها؛ هویت از Person
 Parent Dependencies: EntityBase, Person
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

public class User : EntityBase
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }

    public ICollection<UserRoleAssignment> Roles { get; set; } = new List<UserRoleAssignment>();
}
