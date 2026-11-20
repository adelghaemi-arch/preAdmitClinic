/*
 File: backend/src/Nabz.Application/Interfaces/IPatientService.cs
 Description: ثبت بیمار از عضو قرارداد و فهرست/جستجوی پزشک
 Parent Dependencies: none
 */

namespace Nabz.Application.Interfaces;

public record PatientDto(
    Guid Id, string FullName, string NationalId, string Phone, int? Age, string? Gender,
    bool IntakeCompleted, string? AssignedPackageTitle, Guid? OwnerUserId);

public record OwnerIntakeSnapshotDto(
    PatientDto Patient,
    string? FormStatus,
    Guid? FormId,
    string? FormCode,
    int DocumentGroupCount,
    bool HasPortrait,
    int GpsPointCount);

public record PatientChartDto(
    PatientDto Patient,
    string? FormStatus,
    Guid? FormId,
    string? FormCode,
    IReadOnlyList<DocumentGroupDto> Documents,
    string? PortraitStorageKey,
    IReadOnlyList<GpsPointDto> RecentGps);

/// <summary>نتیجه استعلام پذیرش: بیمار کلینیک + عضویت قرارداد فعال.</summary>
public record AdmissionLookupDto(
    bool Ok,
    bool Found,
    bool InContract,
    bool Blocked,
    string? Error,
    PatientDto? Patient);

public interface IPatientService
{
    Task<PatientDto> AdmitContractMemberAsync(Guid memberId, CancellationToken ct = default);
    Task<PatientDto?> GetAsync(Guid patientId, CancellationToken ct = default);
    Task<PatientDto?> LookupByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default);
    Task<AdmissionLookupDto> AdmissionLookupByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default);
    Task<IReadOnlyList<PatientDto>> SearchAsync(Guid clinicId, string? query, int take = 50, CancellationToken ct = default);
    Task<PatientDto?> GetForOwnerAsync(Guid userId, CancellationToken ct = default);
    Task<OwnerIntakeSnapshotDto?> GetOwnerIntakeSnapshotAsync(Guid userId, CancellationToken ct = default);
    Task<PatientChartDto?> GetChartAsync(Guid patientId, CancellationToken ct = default);
}
