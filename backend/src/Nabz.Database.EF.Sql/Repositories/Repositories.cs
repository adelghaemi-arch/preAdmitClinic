/*
 File: backend/src/Nabz.Database.EF.Sql/Repositories/Repositories.cs
 Description: پیاده‌سازی Repositoryهای v1 روی NabzDbContext
 Parent Dependencies: I*Repository, NabzDbContext
 */

using Microsoft.EntityFrameworkCore;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Database.EF.Sql.Repositories;

public sealed class UserRepository(NabzDbContext db) : IUserRepository
{
    public Task<User?> GetByMobileAsync(string mobile, CancellationToken ct = default)
        => db.Users.Include(x => x.Roles).FirstOrDefaultAsync(x => x.Mobile == mobile, ct);

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.Users.Include(x => x.Roles).FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(User user, CancellationToken ct = default) => await db.Users.AddAsync(user, ct);

    public Task<List<UserRoleAssignment>> ListRolesAsync(Guid userId, CancellationToken ct = default)
        => db.UserRoleAssignments.Where(x => x.UserId == userId).ToListAsync(ct);

    public void AddRole(UserRoleAssignment assignment) => db.UserRoleAssignments.Add(assignment);

    public Task<List<User>> ListUsersAsync(AppRole? excludeHavingRole = null, int take = 500, CancellationToken ct = default)
    {
        // ادمین کلینیک نباید کاربران دارای نقش Platform را اصلاً ببیند
        IQueryable<User> q = db.Users.Include(x => x.Roles);
        if (excludeHavingRole is AppRole excluded)
            q = q.Where(u => !u.Roles.Any(r => r.Role == excluded));
        return q.OrderBy(u => u.FullName).Take(take).ToListAsync(ct);
    }
}

public sealed class AuthRepository(NabzDbContext db) : IAuthRepository
{
    public async Task AddOtpAsync(OtpChallenge challenge, CancellationToken ct = default)
        => await db.OtpChallenges.AddAsync(challenge, ct);

    public Task<OtpChallenge?> GetLatestActiveOtpAsync(string mobile, CancellationToken ct = default)
        => db.OtpChallenges
            .Where(x => x.Mobile == mobile && !x.Consumed && x.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public async Task AddSessionAsync(AuthSession session, CancellationToken ct = default)
        => await db.AuthSessions.AddAsync(session, ct);

    public Task<AuthSession?> GetSessionByIdAsync(Guid id, CancellationToken ct = default)
        => db.AuthSessions.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<AuthSession?> GetActiveSessionByTokenHashAsync(string tokenHash, CancellationToken ct = default)
        => db.AuthSessions.FirstOrDefaultAsync(
            x => x.TokenHash == tokenHash && x.RevokedAt == null, ct);

    public Task<List<AuthSession>> ListActiveSessionsAsync(Guid userId, CancellationToken ct = default)
        => db.AuthSessions.Where(x => x.UserId == userId && x.RevokedAt == null).ToListAsync(ct);

    public async Task AddMultiSessionAlertAsync(MultiSessionAlert alert, CancellationToken ct = default)
        => await db.MultiSessionAlerts.AddAsync(alert, ct);

    public Task<MultiSessionAlert?> GetMultiSessionAlertAsync(Guid id, CancellationToken ct = default)
        => db.MultiSessionAlerts.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<MultiSessionAlert>> ListMultiSessionAlertsAsync(FraudReviewStatus? status, int take, CancellationToken ct = default)
    {
        var q = db.MultiSessionAlerts.AsQueryable();
        if (status.HasValue) q = q.Where(x => x.ReviewStatus == status);
        return q.OrderByDescending(x => x.CreatedAt).Take(take).ToListAsync(ct);
    }
}

public sealed class ClinicRepository(NabzDbContext db) : IClinicRepository
{
    public Task<Clinic?> GetCurrentAsync(CancellationToken ct = default)
        => db.Clinics.FirstOrDefaultAsync(x => x.IsCurrentTenant, ct);

    public Task<Clinic?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.Clinics.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(Clinic clinic, CancellationToken ct = default) => await db.Clinics.AddAsync(clinic, ct);
}

public sealed class ContractRepository(NabzDbContext db) : IContractRepository
{
    public Task<CorporateContract?> GetByIdAsync(Guid id, bool includeMembers = false, CancellationToken ct = default)
    {
        IQueryable<CorporateContract> q = db.CorporateContracts
            .Include(x => x.Supervisor)
            .Include(x => x.PackageRules);
        if (includeMembers) q = q.Include(x => x.Members);
        return q.FirstOrDefaultAsync(x => x.Id == id, ct);
    }

    public Task<List<CorporateContract>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default)
        => db.CorporateContracts.Include(x => x.Supervisor).Include(x => x.Members)
            .Where(x => x.ClinicId == clinicId).ToListAsync(ct);

    public async Task AddAsync(CorporateContract contract, CancellationToken ct = default)
        => await db.CorporateContracts.AddAsync(contract, ct);

    public Task<ContractMember?> GetMemberByIdAsync(Guid memberId, CancellationToken ct = default)
        => db.ContractMembers.FirstOrDefaultAsync(x => x.Id == memberId, ct);

    public Task<ContractMember?> FindActiveMemberByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default)
        => db.ContractMembers
            .Include(m => m.Contract)
            .Where(m => m.NationalId == nationalId
                        && m.Contract.ClinicId == clinicId
                        && m.Contract.Status == ContractStatus.Active)
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public Task<ContractMember?> GetMemberByInviteTokenAsync(string token, CancellationToken ct = default)
        => db.ContractMembers.FirstOrDefaultAsync(x => x.InviteToken == token, ct);

    public async Task AddMemberAsync(ContractMember member, CancellationToken ct = default)
        => await db.ContractMembers.AddAsync(member, ct);

    public async Task AddSmsLogAsync(ContractSmsLog log, CancellationToken ct = default)
        => await db.ContractSmsLogs.AddAsync(log, ct);

    public Task<ContractSupervisor?> GetSupervisorByPhoneAsync(string phone, CancellationToken ct = default)
        => db.ContractSupervisors.Include(x => x.Contract)
            .FirstOrDefaultAsync(x => x.Phone == phone && x.IsActive, ct);

    public void RemovePackageRules(IEnumerable<ContractPackageRule> rules)
        => db.ContractPackageRules.RemoveRange(rules);
}

public sealed class PatientRepository(NabzDbContext db) : IPatientRepository
{
    public Task<Patient?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.Patients.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<Patient?> GetByNationalIdAsync(string nationalId, Guid clinicId, CancellationToken ct = default)
        => db.Patients.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.NationalId == nationalId, ct);

    public Task<Patient?> GetByOwnerUserIdAsync(Guid userId, CancellationToken ct = default)
        => db.Patients.FirstOrDefaultAsync(x => x.OwnerUserId == userId, ct);

    public Task<Patient?> GetByPhoneAsync(string phone, Guid clinicId, CancellationToken ct = default)
        => db.Patients.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Phone == phone, ct);

    public Task<List<Patient>> SearchAsync(Guid clinicId, string? query, int take, CancellationToken ct = default)
    {
        var q = db.Patients.Where(x => x.ClinicId == clinicId);
        if (!string.IsNullOrWhiteSpace(query))
        {
            var t = query.Trim();
            q = q.Where(x => x.FullName.Contains(t) || x.NationalId.Contains(t) || x.Phone.Contains(t));
        }
        return q.OrderBy(x => x.FullName).Take(take).ToListAsync(ct);
    }

    public async Task AddAsync(Patient patient, CancellationToken ct = default) => await db.Patients.AddAsync(patient, ct);
}

public sealed class FormRepository(NabzDbContext db) : IFormRepository
{
    public Task<FormDefinition?> GetByIdAsync(Guid id, bool includeStructure = true, CancellationToken ct = default)
    {
        IQueryable<FormDefinition> q = db.FormDefinitions;
        if (includeStructure) q = q.Include(x => x.Sections).Include(x => x.Items);
        return q.FirstOrDefaultAsync(x => x.Id == id, ct);
    }

    public Task<FormDefinition?> GetPublishedByCodeAsync(Guid clinicId, string code, CancellationToken ct = default)
        => db.FormDefinitions.Include(x => x.Sections).Include(x => x.Items)
            .Where(x => x.ClinicId == clinicId && x.Code == code && x.Status == FormPublishStatus.Published)
            .OrderByDescending(x => x.Version)
            .FirstOrDefaultAsync(ct);

    public Task<FormDefinition?> GetByClinicAndCodeAsync(Guid clinicId, string code, bool includeStructure = true, CancellationToken ct = default)
    {
        IQueryable<FormDefinition> q = db.FormDefinitions;
        if (includeStructure) q = q.Include(x => x.Sections).Include(x => x.Items);
        return q.Where(x => x.ClinicId == clinicId && x.Code == code)
            .OrderByDescending(x => x.Version)
            .FirstOrDefaultAsync(ct);
    }

    public Task<List<FormDefinition>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default)
        => db.FormDefinitions.Where(x => x.ClinicId == clinicId).OrderBy(x => x.SortOrder).ToListAsync(ct);

    public Task<List<FormDefinition>> ListByClinicWithStructureAsync(Guid clinicId, CancellationToken ct = default)
        => db.FormDefinitions.Include(x => x.Sections).Include(x => x.Items)
            .Where(x => x.ClinicId == clinicId).OrderBy(x => x.SortOrder).ToListAsync(ct);

    public async Task AddAsync(FormDefinition form, CancellationToken ct = default)
        => await db.FormDefinitions.AddAsync(form, ct);

    public Task<FormResponse?> GetResponseAsync(Guid patientId, Guid formId, CancellationToken ct = default)
        => db.FormResponses.Include(x => x.Answers)
            .FirstOrDefaultAsync(x => x.PatientId == patientId && x.FormId == formId, ct);

    public async Task AddResponseAsync(FormResponse response, CancellationToken ct = default)
        => await db.FormResponses.AddAsync(response, ct);

    public void RemoveAnswers(IEnumerable<FormAnswer> answers) => db.FormAnswers.RemoveRange(answers);
}

public sealed class EvidenceRepository(NabzDbContext db) : IEvidenceRepository
{
    public async Task AddDocumentGroupAsync(IntakeDocumentGroup group, CancellationToken ct = default)
        => await db.IntakeDocumentGroups.AddAsync(group, ct);

    public Task<IntakeDocumentGroup?> GetDocumentGroupAsync(Guid groupId, CancellationToken ct = default)
        => db.IntakeDocumentGroups.Include(x => x.Files).FirstOrDefaultAsync(x => x.Id == groupId, ct);

    public void RemoveDocumentGroup(IntakeDocumentGroup group) => db.IntakeDocumentGroups.Remove(group);

    public Task<IntakeDocumentFile?> GetDocumentFileAsync(Guid fileId, CancellationToken ct = default)
        => db.IntakeDocumentFiles.Include(x => x.Group).FirstOrDefaultAsync(x => x.Id == fileId, ct);

    public void RemoveDocumentFile(IntakeDocumentFile file) => db.IntakeDocumentFiles.Remove(file);

    public Task<int> CountGroupsAsync(Guid patientId, CancellationToken ct = default)
        => db.IntakeDocumentGroups.CountAsync(x => x.PatientId == patientId, ct);

    public async Task AddPhotoAsync(PatientPhoto photo, CancellationToken ct = default)
        => await db.PatientPhotos.AddAsync(photo, ct);

    public async Task AddGpsAsync(GpsPoint point, CancellationToken ct = default)
        => await db.GpsPoints.AddAsync(point, ct);

    public async Task AddFraudSessionAsync(FraudCaptureSession session, CancellationToken ct = default)
        => await db.FraudCaptureSessions.AddAsync(session, ct);

    public Task<FraudCaptureSession?> GetFraudSessionAsync(Guid id, CancellationToken ct = default)
        => db.FraudCaptureSessions.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddEvidencePackageAsync(EvidencePackage package, CancellationToken ct = default)
        => await db.EvidencePackages.AddAsync(package, ct);

    public Task<List<FraudCaptureSession>> ListFraudSessionsAsync(FraudReviewStatus? status, int take, CancellationToken ct = default)
    {
        var q = db.FraudCaptureSessions.AsQueryable();
        if (status.HasValue) q = q.Where(x => x.ReviewStatus == status);
        return q.OrderByDescending(x => x.StartedAt).Take(take).ToListAsync(ct);
    }

    public Task<List<GpsPoint>> ListGpsByPatientAsync(Guid patientId, int take, CancellationToken ct = default)
        => db.GpsPoints.Where(x => x.PatientId == patientId).OrderByDescending(x => x.CapturedAt).Take(take).ToListAsync(ct);

    public Task<List<IntakeDocumentGroup>> ListDocumentGroupsByPatientAsync(Guid patientId, CancellationToken ct = default)
        => db.IntakeDocumentGroups.Include(x => x.Files)
            .Where(x => x.PatientId == patientId)
            .OrderByDescending(x => x.UploadedAt)
            .ToListAsync(ct);

    public Task<List<PatientPhoto>> ListPhotosByPatientAsync(Guid patientId, CancellationToken ct = default)
        => db.PatientPhotos.Where(x => x.PatientId == patientId)
            .OrderByDescending(x => x.CapturedAt).ToListAsync(ct);

    public Task<List<PatientPhoto>> ListPhotosBySessionAsync(Guid sessionId, CancellationToken ct = default)
        => db.PatientPhotos.Where(x => x.SessionId == sessionId)
            .OrderBy(x => x.CapturedAt).ToListAsync(ct);

    public Task<PatientPhoto?> GetLatestPortraitAsync(Guid patientId, CancellationToken ct = default)
        => db.PatientPhotos
            .Where(x => x.PatientId == patientId && x.Kind == UserPhotoKind.Portrait)
            .OrderByDescending(x => x.CapturedAt)
            .FirstOrDefaultAsync(ct);
}

public sealed class PlatformRepository(NabzDbContext db) : IPlatformRepository
{
    public Task<PlatformSettings?> GetSettingsAsync(CancellationToken ct = default)
        => db.PlatformSettings.OrderBy(x => x.CreatedAt).FirstOrDefaultAsync(ct);

    public async Task AddSettingsAsync(PlatformSettings settings, CancellationToken ct = default)
        => await db.PlatformSettings.AddAsync(settings, ct);

    public async Task AddAuditAsync(PlatformAuditEntry entry, CancellationToken ct = default)
        => await db.PlatformAuditEntries.AddAsync(entry, ct);

    public Task<List<PlatformAuditEntry>> ListAuditAsync(int take, CancellationToken ct = default)
        => db.PlatformAuditEntries.OrderByDescending(x => x.At).Take(take).ToListAsync(ct);
}
