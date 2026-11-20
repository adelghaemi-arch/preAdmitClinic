/*
 File: backend/src/Nabz.Domain/Common/EntityBase.cs
 Description: پایهٔ مشترک موجودیت‌های دامنه با شناسه و زمان ایجاد
 Parent Dependencies: none
 */

namespace Nabz.Domain.Common;

public abstract class EntityBase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
