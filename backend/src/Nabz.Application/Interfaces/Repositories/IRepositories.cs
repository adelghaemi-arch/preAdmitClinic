/*
 File: backend/src/Nabz.Application/Interfaces/Repositories/IRepositories.cs
 Description: قراردادهای Repository دامنهٔ v1
 Parent Dependencies: Nabz.Domain
 */

using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Application.Interfaces.Repositories;

public interface IPersonRepository
{
    Task<Person?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Person?> GetByNationalIdAsync(string nationalId, CancellationToken ct = default);
    Task<List<Person>> ListByMobileAsync(string mobile, CancellationToken ct = default);
    Task AddAsync(Person person, CancellationToken ct = default);
}

public interface IUserRepository
{
    /// <summary>اولین کاربر با این موبایل Person — فقط وقتی یکتا بودن فرض شده؛ ترجیح ListByMobileAsync.</summary>
    Task<User?> GetByMobileAsync(string mobile, CancellationToken ct = default);
    Task<List<User>> ListByMobileAsync(string mobile, CancellationToken ct = default);
    Task<User?> GetByNationalIdAsync(string nationalId, CancellationToken ct = default);
    Task<User?> GetByPersonIdAsync(Guid personId, CancellationToken ct = default);
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(User user, CancellationToken ct = default);
    Task<List<UserRoleAssignment>> ListRolesAsync(Guid userId, CancellationToken ct = default);
    void AddRole(UserRoleAssignment assignment);
    /// <summary>فهرست کاربران؛ در صورت excludeHavingRole کاربران دارای آن نقش حذف می‌شوند.</summary>
    Task<List<User>> ListUsersAsync(AppRole? excludeHavingRole = null, int take = 500, CancellationToken ct = default);
    Task<(List<User> Items, int TotalCount)> ListUsersPagedAsync(
        AppRole? excludeHavingRole, int skip, int take, string? q, CancellationToken ct = default);
}

public interface IAuthRepository
{
    Task AddOtpAsync(OtpChallenge challenge, CancellationToken ct = default);
    /// <summary>آخرین OTP مصرف‌نشده برای موبایل و Purpose مشخص.</summary>
    Task<OtpChallenge?> GetLatestActiveOtpAsync(string mobile, string purpose, CancellationToken ct = default);
    Task AddSessionAsync(AuthSession session, CancellationToken ct = default);
    Task<AuthSession?> GetSessionByIdAsync(Guid id, CancellationToken ct = default);
    Task<AuthSession?> GetActiveSessionByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task<List<AuthSession>> ListActiveSessionsAsync(Guid userId, CancellationToken ct = default);
    Task AddMultiSessionAlertAsync(MultiSessionAlert alert, CancellationToken ct = default);
    Task<MultiSessionAlert?> GetMultiSessionAlertAsync(Guid id, CancellationToken ct = default);
    Task<List<MultiSessionAlert>> ListMultiSessionAlertsAsync(FraudReviewStatus? status, int take, CancellationToken ct = default);
}

public interface IClinicRepository
{
    Task<Clinic?> GetCurrentAsync(CancellationToken ct = default);
    Task<Clinic?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(Clinic clinic, CancellationToken ct = default);
}

public interface IContractRepository
{
    Task<CorporateContract?> GetByIdAsync(Guid id, bool includeMembers = false, CancellationToken ct = default);
    Task<List<CorporateContract>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default);
    Task<Dictionary<Guid, int>> CountMembersByContractIdsAsync(IReadOnlyList<Guid> contractIds, CancellationToken ct = default);
    Task<(List<ContractMember> Items, int TotalCount)> ListMembersPagedAsync(
        Guid contractId, int skip, int take, string? q, CancellationToken ct = default);
    Task AddAsync(CorporateContract contract, CancellationToken ct = default);
    Task<ContractMember?> GetMemberByIdAsync(Guid memberId, CancellationToken ct = default);
    /// <summary>عضو فعال قرارداد کلینیک با کد ملی (برای گیت پذیرش).</summary>
    Task<ContractMember?> FindActiveMemberByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default);
    /// <summary>اعضای فعال قرارداد کلینیک با موبایل Person یا IntroducedMobile.</summary>
    Task<List<ContractMember>> ListActiveMembersByPhoneAsync(Guid clinicId, string mobile, CancellationToken ct = default);
    /// <summary>عضویت‌های ContractMember برای کدملی‌ها؛ پیش‌فرض فقط Active مگر includeInactive.</summary>
    Task<List<ContractMembershipLink>> ListMembershipSummariesByNationalIdsAsync(
        IReadOnlyList<string> nationalIds, Guid? clinicIdFilter, bool includeInactive = false, CancellationToken ct = default);
    /// <summary>عنوان قراردادها بر اساس Id؛ پیش‌فرض فقط Active مگر includeInactive.</summary>
    Task<List<ContractTitleLink>> ListContractTitlesByIdsAsync(
        IReadOnlyList<Guid> contractIds, Guid? clinicIdFilter, bool includeInactive = false, CancellationToken ct = default);
    Task<ContractMember?> GetMemberByInviteTokenAsync(string token, CancellationToken ct = default);
    Task AddMemberAsync(ContractMember member, CancellationToken ct = default);
    void RemoveMember(ContractMember member);
    Task AddSmsLogAsync(ContractSmsLog log, CancellationToken ct = default);
    Task<ContractSupervisor?> GetSupervisorByPhoneAsync(string phone, CancellationToken ct = default);
    void RemovePackageRules(IEnumerable<ContractPackageRule> rules);
    Task<ContractPackageRule?> GetPackageRuleByIdAsync(Guid ruleId, CancellationToken ct = default);
    /// <summary>قوانین قرارداد متصل به یک قانون کتابخانه (برای همگام‌سازی ویرایش).</summary>
    Task<List<ContractPackageRule>> ListPackageRulesByLibraryRuleIdAsync(Guid libraryRuleId, CancellationToken ct = default);
    Task AddPackageRuleAsync(ContractPackageRule rule, CancellationToken ct = default);
}

public interface IPackageLibraryRuleRepository
{
    Task<PackageLibraryRule?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<PackageLibraryRule>> ListAsync(string? query, int take, CancellationToken ct = default);
    Task<int> CountAsync(CancellationToken ct = default);
    Task AddAsync(PackageLibraryRule rule, CancellationToken ct = default);
    void Remove(PackageLibraryRule rule);
    Task<int> CountAttachedContractsAsync(Guid libraryRuleId, CancellationToken ct = default);
    /// <summary>آمار اعضا: فعال (غیر Completed) و قبلاً استفاده‌کرده (Completed) بر اساس match عنوان قانون متصل.</summary>
    Task<(int ActiveMatched, int PreviouslyUsed)> CountMemberUsageAsync(Guid libraryRuleId, CancellationToken ct = default);
}

/// <summary>لینک عضویت برای enrichment لیست کاربران ادمین.</summary>
public record ContractMembershipLink(string NationalId, Guid ContractId, string Title, Guid ClinicId, string Status);

/// <summary>عنوان قرارداد برای نقش ناظر.</summary>
public record ContractTitleLink(Guid ContractId, string Title, Guid ClinicId, string Status);

public interface IPatientRepository
{
    Task<Patient?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Patient?> GetByNationalIdAsync(string nationalId, Guid clinicId, CancellationToken ct = default);
    Task<Patient?> GetByPersonIdAsync(Guid personId, Guid clinicId, CancellationToken ct = default);
    Task<Patient?> GetByOwnerUserIdAsync(Guid userId, CancellationToken ct = default);
    /// <summary>نقشه OwnerUserId → Patient برای لیست کاربران پلتفرم (بدون N+1).</summary>
    Task<Dictionary<Guid, Guid>> MapPatientIdsByOwnerUserIdsAsync(IReadOnlyList<Guid> userIds, CancellationToken ct = default);
    Task<Patient?> GetByPhoneAsync(string phone, Guid clinicId, CancellationToken ct = default);
    Task<List<Patient>> ListByPhoneAsync(string phone, Guid clinicId, CancellationToken ct = default);
    Task<List<Patient>> SearchAsync(Guid clinicId, string? query, int take, CancellationToken ct = default);
    Task AddAsync(Patient patient, CancellationToken ct = default);
}

public interface IPatientProfileRevisionRepository
{
    Task AddRangeAsync(IEnumerable<PatientProfileRevision> items, CancellationToken ct = default);
    Task<List<PatientProfileRevision>> ListByPatientAsync(Guid patientId, int take, CancellationToken ct = default);
}

public interface IFormRepository
{
    Task<FormDefinition?> GetByIdAsync(Guid id, bool includeStructure = true, CancellationToken ct = default);
    Task<FormDefinition?> GetPublishedByCodeAsync(Guid clinicId, string code, CancellationToken ct = default);
    Task<FormDefinition?> GetByClinicAndCodeAsync(Guid clinicId, string code, bool includeStructure = true, CancellationToken ct = default);
    Task<List<FormDefinition>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default);
    Task<List<FormDefinition>> ListByClinicWithStructureAsync(Guid clinicId, CancellationToken ct = default);
    Task AddAsync(FormDefinition form, CancellationToken ct = default);
    Task<FormResponse?> GetResponseAsync(Guid patientId, Guid formId, CancellationToken ct = default);
    Task AddResponseAsync(FormResponse response, CancellationToken ct = default);
    void RemoveAnswers(IEnumerable<FormAnswer> answers);
}

public interface IEvidenceRepository
{
    Task AddDocumentGroupAsync(IntakeDocumentGroup group, CancellationToken ct = default);
    Task<IntakeDocumentGroup?> GetDocumentGroupAsync(Guid groupId, CancellationToken ct = default);
    void RemoveDocumentGroup(IntakeDocumentGroup group);
    Task<IntakeDocumentFile?> GetDocumentFileAsync(Guid fileId, CancellationToken ct = default);
    void RemoveDocumentFile(IntakeDocumentFile file);
    void RemovePhoto(PatientPhoto photo);
    Task<int> CountGroupsAsync(Guid patientId, CancellationToken ct = default);
    Task AddPhotoAsync(PatientPhoto photo, CancellationToken ct = default);
    Task AddGpsAsync(GpsPoint point, CancellationToken ct = default);
    Task AddFraudSessionAsync(FraudCaptureSession session, CancellationToken ct = default);
    Task<FraudCaptureSession?> GetFraudSessionAsync(Guid id, CancellationToken ct = default);
    /// <summary>نشست باز همان Owner برای جلوگیری از نشست یتیم در remount دوربین</summary>
    Task<FraudCaptureSession?> GetOpenFraudSessionAsync(Guid patientId, Guid userId, CancellationToken ct = default);
    Task AddEvidencePackageAsync(EvidencePackage package, CancellationToken ct = default);
    Task<EvidencePackage?> GetEvidencePackageAsync(Guid id, CancellationToken ct = default);
    Task<List<FraudCaptureSession>> ListFraudSessionsAsync(FraudReviewStatus? status, int take, CancellationToken ct = default);
    Task<List<GpsPoint>> ListGpsByPatientAsync(Guid patientId, int take, CancellationToken ct = default);
    Task<List<IntakeDocumentGroup>> ListDocumentGroupsByPatientAsync(Guid patientId, CancellationToken ct = default);
    Task<List<PatientPhoto>> ListPhotosByPatientAsync(Guid patientId, CancellationToken ct = default);
    Task<List<PatientPhoto>> ListPhotosBySessionAsync(Guid sessionId, CancellationToken ct = default);
    Task<PatientPhoto?> GetLatestPortraitAsync(Guid patientId, CancellationToken ct = default);
    Task<PatientPhoto?> GetPhotoAsync(Guid photoId, CancellationToken ct = default);
    Task<List<IntakeDocumentFile>> ListDocumentFilesByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default);
    Task<List<PatientPhoto>> ListPhotosByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default);
    Task<List<IntakeDocumentFile>> ListVaultDocumentFilesAsync(bool trashOnly, int take, CancellationToken ct = default);
    Task<List<PatientPhoto>> ListVaultPhotosAsync(bool trashOnly, int take, CancellationToken ct = default);
    /// <summary>برای گیت دانلود /api/files — جستجو با StorageKey</summary>
    Task<PatientPhoto?> FindPhotoByStorageKeyAsync(string storageKey, CancellationToken ct = default);
    Task<IntakeDocumentFile?> FindDocumentFileByStorageKeyAsync(string storageKey, CancellationToken ct = default);
}

public interface IPlatformRepository
{
    Task<PlatformSettings?> GetSettingsAsync(CancellationToken ct = default);
    Task AddSettingsAsync(PlatformSettings settings, CancellationToken ct = default);
    Task AddAuditAsync(PlatformAuditEntry entry, CancellationToken ct = default);
    Task<List<PlatformAuditEntry>> ListAuditAsync(int take, CancellationToken ct = default);
}
