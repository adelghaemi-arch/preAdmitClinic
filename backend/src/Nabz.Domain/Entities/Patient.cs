/*
 File: backend/src/Nabz.Domain/Entities/Patient.cs
 Description: پرونده بالینی کلینیک؛ هویت از Person
 Parent Dependencies: User, Person, ContractMember
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

public class Patient : EntityBase
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;
    /// <summary>پیوند مستقیم سلامتجو به پرونده — یک OwnerUserId حداکثر یک Patient.</summary>
    public Guid? OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }
    public Guid? LinkedContractMemberId { get; set; }
    public string? MaritalStatus { get; set; }
    /// <summary>شرح کوتاه غیرپزشکی؛ ادمین می‌تواند ببیند بدون دسترسی به پاسخ فرم.</summary>
    public string? Description { get; set; }
    public bool IntakeCompleted { get; set; }
    public DateTime? IntakeCompletedAt { get; set; }
    /// <summary>مقدمهٔ مسیر پیش‌پذیرش دیده/رد شده — منبع حقیقت سرور، نه مرورگر.</summary>
    public bool JourneyIntroSeen { get; set; }
    public string? AssignedPackageCode { get; set; }
    public string? AssignedPackageTitle { get; set; }
    public string? QrToken { get; set; }
    public double? HomeLat { get; set; }
    public double? HomeLon { get; set; }
    public string? HomeAddress { get; set; }
    /// <summary>پلاک ساختمان محل سکونت — برای ارسال جواب/نمونه.</summary>
    public string? HomePlaque { get; set; }
    /// <summary>واحد آپارتمان — اختیاری.</summary>
    public string? HomeUnit { get; set; }
    /// <summary>کد پستی ۱۰ رقمی ایران — اختیاری برای ارسال جواب/آزمایش.</summary>
    public string? HomePostalCode { get; set; }
}