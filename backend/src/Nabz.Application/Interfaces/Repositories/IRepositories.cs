/*
 File: backend/src/Nabz.Application/Interfaces/Repositories/IRepositories.cs
 Description: قراردادهای Repository دامنهٔ v1
 Parent Dependencies: Nabz.Domain
 */

using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Application.Interfaces.Repositories;

public interface IUserRepository
{
    Task<User?> GetByMobileAsync(string mobile, CancellationToken ct = default);
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(User user, CancellationToken ct = default);
    Task<List<UserRoleAssignment>> ListRolesAsync(Guid userId, CancellationToken ct = default);
    void AddRole(UserRoleAssignment assignment);
    /// <summary>فهرست کاربران؛ در صورت excludeHavingRole کاربران دارای آن نقش حذف می‌شوند.</summary>
    Task<List<User>> ListUsersAsync(AppRole? excludeHavingRole = null, int take = 500, CancellationToken ct = default);
}

public interface IAuthRepository
{
    Task AddOtpAsync(OtpChallenge challenge, CancellationToken ct = default);
    Task<OtpChallenge?> GetLatestActiveOtpAsync(string mobile, CancellationToken ct = default);
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
    Task AddAsync(CorporateContract contract, CancellationToken ct = default);
    Task<ContractMember?> GetMemberByIdAsync(Guid memberId, CancellationToken ct = default);
    /// <summary>عضو فعال قرارداد کلینیک با کد ملی (برای گیت پذیرش).</summary>
    Task<ContractMember?> FindActiveMemberByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default);
    Task<ContractMember?> GetMemberByInviteTokenAsync(string token, CancellationToken ct = default);
    Task AddMemberAsync(ContractMember member, CancellationToken ct = default);
    Task AddSmsLogAsync(ContractSmsLog log, CancellationToken ct = default);
    Task<ContractSupervisor?> GetSupervisorByPhoneAsync(string phone, CancellationToken ct = default);
    void RemovePackageRules(IEnumerable<ContractPackageRule> rules);
}

public interface IPatientRepository
{
    Task<Patient?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Patient?> GetByNationalIdAsync(string nationalId, Guid clinicId, CancellationToken ct = default);
    Task<Patient?> GetByOwnerUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<Patient?> GetByPhoneAsync(string phone, Guid clinicId, CancellationToken ct = default);
    Task<List<Patient>> SearchAsync(Guid clinicId, string? query, int take, CancellationToken ct = default);
    Task AddAsync(Patient patient, CancellationToken ct = default);
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
    Task<int> CountGroupsAsync(Guid patientId, CancellationToken ct = default);
    Task AddPhotoAsync(PatientPhoto photo, CancellationToken ct = default);
    Task AddGpsAsync(GpsPoint point, CancellationToken ct = default);
    Task AddFraudSessionAsync(FraudCaptureSession session, CancellationToken ct = default);
    Task<FraudCaptureSession?> GetFraudSessionAsync(Guid id, CancellationToken ct = default);
    Task AddEvidencePackageAsync(EvidencePackage package, CancellationToken ct = default);
    Task<List<FraudCaptureSession>> ListFraudSessionsAsync(FraudReviewStatus? status, int take, CancellationToken ct = default);
    Task<List<GpsPoint>> ListGpsByPatientAsync(Guid patientId, int take, CancellationToken ct = default);
    Task<List<IntakeDocumentGroup>> ListDocumentGroupsByPatientAsync(Guid patientId, CancellationToken ct = default);
    Task<List<PatientPhoto>> ListPhotosByPatientAsync(Guid patientId, CancellationToken ct = default);
    Task<List<PatientPhoto>> ListPhotosBySessionAsync(Guid sessionId, CancellationToken ct = default);
    Task<PatientPhoto?> GetLatestPortraitAsync(Guid patientId, CancellationToken ct = default);
}

public interface IPlatformRepository
{
    Task<PlatformSettings?> GetSettingsAsync(CancellationToken ct = default);
    Task AddSettingsAsync(PlatformSettings settings, CancellationToken ct = default);
    Task AddAuditAsync(PlatformAuditEntry entry, CancellationToken ct = default);
    Task<List<PlatformAuditEntry>> ListAuditAsync(int take, CancellationToken ct = default);
}
