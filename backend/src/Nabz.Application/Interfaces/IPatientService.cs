/*
 File: backend/src/Nabz.Application/Interfaces/IPatientService.cs
 Description: ثبت بیمار، تغییر موبایل ادمین، وضعیت پیش‌پذیرش، chart پزشک
 Parent Dependencies: none
 */

namespace Nabz.Application.Interfaces;

public record PatientDto(
    Guid Id, string FirstName, string LastName, string FullName,
    string NationalId, string Phone, DateOnly? BirthDate, int? Age, string? Gender, string? MaritalStatus,
    bool IntakeCompleted, string? AssignedPackageTitle, Guid? OwnerUserId,
    string? Description = null,
    double? HomeLat = null,
    double? HomeLon = null,
    string? HomeAddress = null,
    string? HomePlaque = null,
    string? HomeUnit = null,
    string? HomePostalCode = null,
    bool JourneyIntroSeen = false);

/// <summary>پلاک در مسیر CompanionHome اختیاری است؛ در فرم دموگرافیک از JSON اجباری می‌شود.</summary>
public record UpdatePatientHomeAddressRequest(
    double HomeLat,
    double HomeLon,
    string HomeAddress,
    string? HomePlaque = null,
    string? HomeUnit = null,
    string? HomePostalCode = null);

public record OwnerIntakeSnapshotDto(
    PatientDto Patient,
    string? FormStatus,
    Guid? FormId,
    string? FormCode,
    int DocumentGroupCount,
    bool HasPortrait,
    int GpsPointCount,
    /// <summary>needs_form | already_complete</summary>
    string IntakeGate,
    string? IntakeGateMessage,
    /// <summary>introduced | not_introduced | mobile_mismatch</summary>
    string HospitalIntroStatus = "not_introduced",
    string? HospitalName = null,
    string? IntroducedMobileMasked = null,
    /// <summary>نام/نام‌خانوادگی/کدملی/تاریخ‌تولد حداقل.</summary>
    bool ProfileComplete = false);

public record PatientChartDto(
    PatientDto Patient,
    string? FormStatus,
    Guid? FormId,
    string? FormCode,
    IReadOnlyList<DocumentGroupDto> Documents,
    string? PortraitStorageKey,
    IReadOnlyList<GpsPointDto> RecentGps);

/// <summary>وضعیت پیش‌پذیرش برای ادمین — بدون متن پاسخ پزشکی.</summary>
public record PatientIntakeStatusDto(
    PatientDto Patient,
    string? FormStatus,
    Guid? FormId,
    string? FormCode,
    int DocumentGroupCount,
    bool HasPortrait,
    int GpsPointCount,
    string? Description);

/// <summary>نتیجه استعلام پذیرش: بیمار کلینیک + عضویت قرارداد فعال.</summary>
public record AdmissionLookupDto(
    bool Ok,
    bool Found,
    bool InContract,
    bool Blocked,
    string? Error,
    PatientDto? Patient);

/// <summary>ویرایش پروفایل — بدون موبایل/کدملی؛ Gender فقط برای Admin.</summary>
public record UpdatePatientProfileRequest(
    string? FirstName = null,
    string? LastName = null,
    DateOnly? BirthDate = null,
    string? MaritalStatus = null,
    string? Gender = null,
    bool ClearBirthDate = false,
    double? HomeLat = null,
    double? HomeLon = null,
    string? HomeAddress = null,
    string? HomePlaque = null,
    string? HomeUnit = null,
    string? HomePostalCode = null,
    bool ApplyHome = false);

public record PatientProfileRevisionDto(
    Guid Id,
    DateTime At,
    string Field,
    string? OldValue,
    string? NewValue,
    Guid ChangedByUserId,
    string Source);

public interface IPatientService
{
    /// <summary>پذیرش idempotent عضو قرارداد — مسیر ادمین و soft-admit ورود.</summary>
    Task<PatientDto> EnsureAdmittedFromMemberAsync(Guid memberId, CancellationToken ct = default);
    Task<PatientDto> AdmitContractMemberAsync(Guid memberId, CancellationToken ct = default);
    Task<PatientDto?> GetAsync(Guid patientId, CancellationToken ct = default);
    Task<PatientDto?> LookupByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default);
    Task<AdmissionLookupDto> AdmissionLookupByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default);
    Task<IReadOnlyList<PatientDto>> SearchAsync(Guid clinicId, string? query, int take = 50, CancellationToken ct = default);
    Task<PatientDto?> GetForOwnerAsync(Guid userId, CancellationToken ct = default);
    Task<OwnerIntakeSnapshotDto?> GetOwnerIntakeSnapshotAsync(Guid userId, CancellationToken ct = default);
    Task<PatientChartDto?> GetChartAsync(Guid patientId, CancellationToken ct = default);
    Task<PatientIntakeStatusDto?> GetIntakeStatusAsync(Guid patientId, CancellationToken ct = default);
    Task<PatientDto> UpdatePhoneAsync(Guid patientId, string phone, CancellationToken ct = default);
    Task<PatientDto> UpdateHomeAddressAsync(Guid patientId, Guid actingUserId, UpdatePatientHomeAddressRequest body, CancellationToken ct = default);
    Task<PatientDto> UpdateMyProfileAsync(Guid ownerUserId, UpdatePatientProfileRequest body, CancellationToken ct = default);
    Task<PatientDto> UpdateProfileAsync(Guid patientId, Guid actingUserId, UpdatePatientProfileRequest body, bool allowGender, CancellationToken ct = default);
    /// <summary>علامت دیدن مقدمهٔ مسیر — فقط مالک پرونده.</summary>
    Task<PatientDto> DismissJourneyIntroAsync(Guid ownerUserId, CancellationToken ct = default);
    Task<IReadOnlyList<PatientProfileRevisionDto>> ListProfileRevisionsAsync(Guid patientId, int take = 100, CancellationToken ct = default);
    Task SyncOpenDraftDemographicsAsync(Guid patientId, CancellationToken ct = default);
}
