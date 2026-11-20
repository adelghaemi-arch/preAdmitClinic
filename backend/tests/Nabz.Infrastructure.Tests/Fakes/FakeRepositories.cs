/*
 File: backend/tests/Nabz.Infrastructure.Tests/Fakes/FakeRepositories.cs
 Description: پیاده‌سازی in-memory تمام I*Repository برای تست unit
 Parent Dependencies: IRepositories.cs, InMemoryStore
 */

using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Tests.Fakes;

public sealed class FakeUserRepository(InMemoryStore store) : IUserRepository
{
    private void HydrateRoles(User? user)
    {
        if (user is null) return;
        user.Roles = store.Roles.Where(x => x.UserId == user.Id).ToList();
    }

    public Task<User?> GetByMobileAsync(string mobile, CancellationToken ct = default)
    {
        var user = store.Users.FirstOrDefault(x => x.Mobile == mobile);
        HydrateRoles(user);
        return Task.FromResult(user);
    }

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = store.Users.FirstOrDefault(x => x.Id == id);
        HydrateRoles(user);
        return Task.FromResult(user);
    }

    public Task AddAsync(User user, CancellationToken ct = default)
    {
        store.Users.Add(user);
        return Task.CompletedTask;
    }

    public Task<List<UserRoleAssignment>> ListRolesAsync(Guid userId, CancellationToken ct = default)
        => Task.FromResult(store.Roles.Where(x => x.UserId == userId).ToList());

    public void AddRole(UserRoleAssignment assignment) => store.Roles.Add(assignment);

    public Task<List<User>> ListUsersAsync(AppRole? excludeHavingRole = null, int take = 500, CancellationToken ct = default)
    {
        IEnumerable<User> q = store.Users;
        if (excludeHavingRole is AppRole excluded)
        {
            var excludedIds = store.Roles.Where(r => r.Role == excluded).Select(r => r.UserId).ToHashSet();
            q = q.Where(u => !excludedIds.Contains(u.Id));
        }

        var list = q.OrderBy(u => u.FullName).Take(take).ToList();
        foreach (var u in list)
            HydrateRoles(u);
        return Task.FromResult(list);
    }
}

public sealed class FakeAuthRepository(InMemoryStore store) : IAuthRepository
{
    public Task AddOtpAsync(OtpChallenge challenge, CancellationToken ct = default)
    {
        store.Otps.Add(challenge);
        return Task.CompletedTask;
    }

    public Task<OtpChallenge?> GetLatestActiveOtpAsync(string mobile, CancellationToken ct = default)
    {
        var otp = store.Otps
            .Where(x => x.Mobile == mobile && !x.Consumed && x.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault();
        return Task.FromResult(otp);
    }

    public Task AddSessionAsync(AuthSession session, CancellationToken ct = default)
    {
        store.Sessions.Add(session);
        return Task.CompletedTask;
    }

    public Task<AuthSession?> GetSessionByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(store.Sessions.FirstOrDefault(x => x.Id == id));

    public Task<AuthSession?> GetActiveSessionByTokenHashAsync(string tokenHash, CancellationToken ct = default)
        => Task.FromResult(store.Sessions.FirstOrDefault(x => x.TokenHash == tokenHash && x.RevokedAt == null));

    public Task<List<AuthSession>> ListActiveSessionsAsync(Guid userId, CancellationToken ct = default)
        => Task.FromResult(store.Sessions.Where(x => x.UserId == userId && x.RevokedAt == null).ToList());

    public Task AddMultiSessionAlertAsync(MultiSessionAlert alert, CancellationToken ct = default)
    {
        store.Alerts.Add(alert);
        return Task.CompletedTask;
    }

    public Task<MultiSessionAlert?> GetMultiSessionAlertAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(store.Alerts.FirstOrDefault(x => x.Id == id));

    public Task<List<MultiSessionAlert>> ListMultiSessionAlertsAsync(FraudReviewStatus? status, int take, CancellationToken ct = default)
    {
        var q = store.Alerts.AsEnumerable();
        if (status.HasValue)
            q = q.Where(x => x.ReviewStatus == status);
        return Task.FromResult(q.OrderByDescending(x => x.CreatedAt).Take(take).ToList());
    }
}

public sealed class FakeClinicRepository(InMemoryStore store) : IClinicRepository
{
    public Task<Clinic?> GetCurrentAsync(CancellationToken ct = default)
        => Task.FromResult(store.Clinics.FirstOrDefault(x => x.IsCurrentTenant));

    public Task<Clinic?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(store.Clinics.FirstOrDefault(x => x.Id == id));

    public Task AddAsync(Clinic clinic, CancellationToken ct = default)
    {
        store.Clinics.Add(clinic);
        return Task.CompletedTask;
    }
}

public sealed class FakeContractRepository(InMemoryStore store) : IContractRepository
{
    public Task<CorporateContract?> GetByIdAsync(Guid id, bool includeMembers = false, CancellationToken ct = default)
    {
        var contract = store.Contracts.FirstOrDefault(x => x.Id == id);
        if (contract is null)
            return Task.FromResult<CorporateContract?>(null);

        contract.Supervisor = store.Supervisors.FirstOrDefault(s => s.ContractId == contract.Id);
        contract.PackageRules = store.PackageRules.Where(r => r.ContractId == contract.Id).ToList();
        if (includeMembers)
            contract.Members = store.Members.Where(m => m.ContractId == contract.Id).ToList();
        return Task.FromResult<CorporateContract?>(contract);
    }

    public Task<List<CorporateContract>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default)
    {
        var list = store.Contracts.Where(x => x.ClinicId == clinicId).ToList();
        foreach (var c in list)
        {
            c.Supervisor = store.Supervisors.FirstOrDefault(s => s.ContractId == c.Id);
            c.Members = store.Members.Where(m => m.ContractId == c.Id).ToList();
        }

        return Task.FromResult(list);
    }

    public Task AddAsync(CorporateContract contract, CancellationToken ct = default)
    {
        store.Contracts.Add(contract);
        return Task.CompletedTask;
    }

    public Task<ContractMember?> GetMemberByIdAsync(Guid memberId, CancellationToken ct = default)
        => Task.FromResult(store.Members.FirstOrDefault(x => x.Id == memberId));

    public Task<ContractMember?> FindActiveMemberByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default)
    {
        var member = store.Members
            .Where(m => m.NationalId == nationalId)
            .Select(m =>
            {
                m.Contract = store.Contracts.FirstOrDefault(c => c.Id == m.ContractId);
                return m;
            })
            .Where(m => m.Contract is not null
                        && m.Contract.ClinicId == clinicId
                        && m.Contract.Status == ContractStatus.Active)
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefault();
        return Task.FromResult(member);
    }

    public Task<ContractMember?> GetMemberByInviteTokenAsync(string token, CancellationToken ct = default)
        => Task.FromResult(store.Members.FirstOrDefault(x => x.InviteToken == token));

    public Task AddMemberAsync(ContractMember member, CancellationToken ct = default)
    {
        store.Members.Add(member);
        return Task.CompletedTask;
    }

    public Task AddSmsLogAsync(ContractSmsLog log, CancellationToken ct = default)
    {
        store.ContractSmsLogs.Add(log);
        return Task.CompletedTask;
    }

    public Task<ContractSupervisor?> GetSupervisorByPhoneAsync(string phone, CancellationToken ct = default)
    {
        var sup = store.Supervisors.FirstOrDefault(x => x.Phone == phone && x.IsActive);
        if (sup is null)
        {
            sup = store.Contracts
                .Select(c => c.Supervisor)
                .FirstOrDefault(s => s is not null && s.Phone == phone && s.IsActive);
            if (sup is not null && !store.Supervisors.Contains(sup))
                store.Supervisors.Add(sup);
        }

        if (sup is not null)
            sup.Contract = store.Contracts.First(c => c.Id == sup.ContractId);
        return Task.FromResult(sup);
    }

    public void RemovePackageRules(IEnumerable<ContractPackageRule> rules)
    {
        foreach (var rule in rules)
            store.PackageRules.Remove(rule);
    }
}

public sealed class FakePatientRepository(InMemoryStore store) : IPatientRepository
{
    public Task<Patient?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(store.Patients.FirstOrDefault(x => x.Id == id));

    public Task<Patient?> GetByNationalIdAsync(string nationalId, Guid clinicId, CancellationToken ct = default)
        => Task.FromResult(store.Patients.FirstOrDefault(x => x.ClinicId == clinicId && x.NationalId == nationalId));

    public Task<Patient?> GetByOwnerUserIdAsync(Guid userId, CancellationToken ct = default)
        => Task.FromResult(store.Patients.FirstOrDefault(x => x.OwnerUserId == userId));

    public Task<Patient?> GetByPhoneAsync(string phone, Guid clinicId, CancellationToken ct = default)
        => Task.FromResult(store.Patients.FirstOrDefault(x => x.ClinicId == clinicId && x.Phone == phone));

    public Task<List<Patient>> SearchAsync(Guid clinicId, string? query, int take, CancellationToken ct = default)
    {
        var q = store.Patients.Where(x => x.ClinicId == clinicId);
        if (!string.IsNullOrWhiteSpace(query))
        {
            var t = query.Trim();
            q = q.Where(x => x.FullName.Contains(t) || x.NationalId.Contains(t) || x.Phone.Contains(t));
        }

        return Task.FromResult(q.OrderBy(x => x.FullName).Take(take).ToList());
    }

    public Task AddAsync(Patient patient, CancellationToken ct = default)
    {
        store.Patients.Add(patient);
        return Task.CompletedTask;
    }
}

public sealed class FakeFormRepository(InMemoryStore store) : IFormRepository
{
    private void AttachStructure(FormDefinition form)
    {
        form.Sections = store.FormSections.Where(s => s.FormId == form.Id).ToList();
        form.Items = store.FormItems.Where(i => i.FormId == form.Id).ToList();
    }

    public Task<FormDefinition?> GetByIdAsync(Guid id, bool includeStructure = true, CancellationToken ct = default)
    {
        var form = store.Forms.FirstOrDefault(x => x.Id == id);
        if (form is not null && includeStructure)
            AttachStructure(form);
        return Task.FromResult(form);
    }

    public Task<FormDefinition?> GetPublishedByCodeAsync(Guid clinicId, string code, CancellationToken ct = default)
    {
        var form = store.Forms
            .Where(x => x.ClinicId == clinicId && x.Code == code && x.Status == FormPublishStatus.Published)
            .OrderByDescending(x => x.Version)
            .FirstOrDefault();
        if (form is not null)
            AttachStructure(form);
        return Task.FromResult(form);
    }

    public Task<FormDefinition?> GetByClinicAndCodeAsync(Guid clinicId, string code, bool includeStructure = true, CancellationToken ct = default)
    {
        var form = store.Forms
            .Where(x => x.ClinicId == clinicId && x.Code == code)
            .OrderByDescending(x => x.Version)
            .FirstOrDefault();
        if (form is not null && includeStructure)
            AttachStructure(form);
        return Task.FromResult(form);
    }

    public Task<List<FormDefinition>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default)
        => Task.FromResult(store.Forms.Where(x => x.ClinicId == clinicId).OrderBy(x => x.SortOrder).ToList());

    public Task<List<FormDefinition>> ListByClinicWithStructureAsync(Guid clinicId, CancellationToken ct = default)
    {
        var list = store.Forms.Where(x => x.ClinicId == clinicId).OrderBy(x => x.SortOrder).ToList();
        foreach (var form in list) AttachStructure(form);
        return Task.FromResult(list);
    }

    public Task AddAsync(FormDefinition form, CancellationToken ct = default)
    {
        store.Forms.Add(form);
        return Task.CompletedTask;
    }

    public Task<FormResponse?> GetResponseAsync(Guid patientId, Guid formId, CancellationToken ct = default)
    {
        var response = store.Responses.FirstOrDefault(x => x.PatientId == patientId && x.FormId == formId);
        if (response is not null)
            response.Answers = store.FormAnswers.Where(a => a.ResponseId == response.Id).ToList();
        return Task.FromResult(response);
    }

    public Task AddResponseAsync(FormResponse response, CancellationToken ct = default)
    {
        store.Responses.Add(response);
        return Task.CompletedTask;
    }

    public void RemoveAnswers(IEnumerable<FormAnswer> answers)
    {
        foreach (var answer in answers)
            store.FormAnswers.Remove(answer);
    }
}

public sealed class FakeEvidenceRepository(InMemoryStore store) : IEvidenceRepository
{
    public Task AddDocumentGroupAsync(IntakeDocumentGroup group, CancellationToken ct = default)
    {
        store.DocumentGroups.Add(group);
        return Task.CompletedTask;
    }

    public Task<IntakeDocumentGroup?> GetDocumentGroupAsync(Guid groupId, CancellationToken ct = default)
    {
        var group = store.DocumentGroups.FirstOrDefault(x => x.Id == groupId);
        if (group is not null)
            group.Files = store.DocumentFiles.Where(f => f.GroupId == group.Id).ToList();
        return Task.FromResult(group);
    }

    public void RemoveDocumentGroup(IntakeDocumentGroup group)
    {
        store.DocumentGroups.Remove(group);
        foreach (var file in store.DocumentFiles.Where(f => f.GroupId == group.Id).ToList())
            store.DocumentFiles.Remove(file);
    }

    public Task<IntakeDocumentFile?> GetDocumentFileAsync(Guid fileId, CancellationToken ct = default)
    {
        var file = store.DocumentFiles.FirstOrDefault(x => x.Id == fileId);
        if (file is not null)
            file.Group = store.DocumentGroups.First(g => g.Id == file.GroupId);
        return Task.FromResult(file);
    }

    public void RemoveDocumentFile(IntakeDocumentFile file) => store.DocumentFiles.Remove(file);

    public Task<int> CountGroupsAsync(Guid patientId, CancellationToken ct = default)
        => Task.FromResult(store.DocumentGroups.Count(x => x.PatientId == patientId));

    public Task AddPhotoAsync(PatientPhoto photo, CancellationToken ct = default)
    {
        store.Photos.Add(photo);
        return Task.CompletedTask;
    }

    public Task AddGpsAsync(GpsPoint point, CancellationToken ct = default)
    {
        store.GpsPoints.Add(point);
        return Task.CompletedTask;
    }

    public Task AddFraudSessionAsync(FraudCaptureSession session, CancellationToken ct = default)
    {
        store.FraudSessions.Add(session);
        return Task.CompletedTask;
    }

    public Task<FraudCaptureSession?> GetFraudSessionAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(store.FraudSessions.FirstOrDefault(x => x.Id == id));

    public Task AddEvidencePackageAsync(EvidencePackage package, CancellationToken ct = default)
    {
        store.EvidencePackages.Add(package);
        return Task.CompletedTask;
    }

    public Task<List<FraudCaptureSession>> ListFraudSessionsAsync(FraudReviewStatus? status, int take, CancellationToken ct = default)
    {
        var q = store.FraudSessions.AsEnumerable();
        if (status.HasValue)
            q = q.Where(x => x.ReviewStatus == status);
        return Task.FromResult(q.OrderByDescending(x => x.StartedAt).Take(take).ToList());
    }

    public Task<List<GpsPoint>> ListGpsByPatientAsync(Guid patientId, int take, CancellationToken ct = default)
        => Task.FromResult(store.GpsPoints.Where(x => x.PatientId == patientId).OrderByDescending(x => x.CapturedAt).Take(take).ToList());

    public Task<List<IntakeDocumentGroup>> ListDocumentGroupsByPatientAsync(Guid patientId, CancellationToken ct = default)
    {
        var groups = store.DocumentGroups
            .Where(x => x.PatientId == patientId)
            .OrderByDescending(x => x.UploadedAt)
            .ToList();
        foreach (var g in groups)
            g.Files = store.DocumentFiles.Where(f => f.GroupId == g.Id).ToList();
        return Task.FromResult(groups);
    }

    public Task<List<PatientPhoto>> ListPhotosByPatientAsync(Guid patientId, CancellationToken ct = default)
        => Task.FromResult(store.Photos.Where(x => x.PatientId == patientId).OrderByDescending(x => x.CapturedAt).ToList());

    public Task<List<PatientPhoto>> ListPhotosBySessionAsync(Guid sessionId, CancellationToken ct = default)
        => Task.FromResult(store.Photos.Where(x => x.SessionId == sessionId).OrderBy(x => x.CapturedAt).ToList());

    public Task<PatientPhoto?> GetLatestPortraitAsync(Guid patientId, CancellationToken ct = default)
        => Task.FromResult(store.Photos
            .Where(x => x.PatientId == patientId && x.Kind == UserPhotoKind.Portrait)
            .OrderByDescending(x => x.CapturedAt)
            .FirstOrDefault());
}

public sealed class FakePlatformRepository(InMemoryStore store) : IPlatformRepository
{
    public Task<PlatformSettings?> GetSettingsAsync(CancellationToken ct = default)
        => Task.FromResult(store.PlatformSettings.OrderBy(x => x.CreatedAt).FirstOrDefault());

    public Task AddSettingsAsync(PlatformSettings settings, CancellationToken ct = default)
    {
        store.PlatformSettings.Add(settings);
        return Task.CompletedTask;
    }

    public Task AddAuditAsync(PlatformAuditEntry entry, CancellationToken ct = default)
    {
        store.PlatformAudit.Add(entry);
        return Task.CompletedTask;
    }

    public Task<List<PlatformAuditEntry>> ListAuditAsync(int take, CancellationToken ct = default)
        => Task.FromResult(store.PlatformAudit.OrderByDescending(x => x.At).Take(take).ToList());
}