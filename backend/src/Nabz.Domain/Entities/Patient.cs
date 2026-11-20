/*
 File: backend/src/Nabz.Domain/Entities/Patient.cs
 Description: پرونده بیمار سیستم؛ مالک مستقیم OwnerUserId بدون Companion
 Parent Dependencies: User, ContractMember
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

public class Patient : EntityBase
{
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    /// <summary>پیوند مستقیم سلامتجو به پرونده — جایگزین links.self در mock.</summary>
    public Guid? OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }
    public Guid? LinkedContractMemberId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string NationalId { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public string? MaritalStatus { get; set; }
    public bool IntakeCompleted { get; set; }
    public DateTime? IntakeCompletedAt { get; set; }
    public string? AssignedPackageCode { get; set; }
    public string? AssignedPackageTitle { get; set; }
    public string? QrToken { get; set; }
    public double? HomeLat { get; set; }
    public double? HomeLon { get; set; }
    public string? HomeAddress { get; set; }
}
