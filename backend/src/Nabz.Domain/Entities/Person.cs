/*
 File: backend/src/Nabz.Domain/Entities/Person.cs
 Description: منبع واحد هویت طبیعی — نام، کدملی، موبایل، تولد، جنسیت
 Parent Dependencies: EntityBase
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

/// <summary>شخص حقیقی؛ کلید کسب‌وکار کدملی وقتی پر است؛ موبایل تکراری مجاز.</summary>
public class Person : EntityBase
{
    public string Mobile { get; set; } = string.Empty;
    public string? NationalId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? Email { get; set; }
}
