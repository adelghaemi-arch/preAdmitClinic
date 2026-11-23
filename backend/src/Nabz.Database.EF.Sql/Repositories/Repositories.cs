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

public sealed class PersonRepository(NabzDbContext db) : IPersonRepository
{
    public Task<Person?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.Persons.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<Person?> GetByNationalIdAsync(string nationalId, CancellationToken ct = default)
        => db.Persons.FirstOrDefaultAsync(x => x.NationalId != null && x.NationalId == nationalId, ct);

    public Task<List<Person>> ListByMobileAsync(string mobile, CancellationToken ct = default)
        => db.Persons.Where(x => x.Mobile == mobile).ToListAsync(ct);

    public async Task AddAsync(Person person, CancellationToken ct = default)
        => await db.Persons.AddAsync(person, ct);
}

public sealed class UserRepository(NabzDbContext db) : IUserRepository
{
    private static IQueryable<User> WithPerson(IQueryable<User> q)
        => q.Include(x => x.Person).Include(x => x.Roles);

    public Task<User?> GetByMobileAsync(string mobile, CancellationToken ct = default)
        => WithPerson(db.Users).FirstOrDefaultAsync(x => x.Person.Mobile == mobile, ct);

    public Task<List<User>> ListByMobileAsync(string mobile, CancellationToken ct = default)
        => WithPerson(db.Users).Where(x => x.Person.Mobile == mobile).ToListAsync(ct);

    public Task<User?> GetByNationalIdAsync(string nationalId, CancellationToken ct = default)
        => WithPerson(db.Users)
            .FirstOrDefaultAsync(x => x.Person.NationalId != null && x.Person.NationalId == nationalId, ct);

    public Task<User?> GetByPersonIdAsync(Guid personId, CancellationToken ct = default)
        => WithPerson(db.Users).FirstOrDefaultAsync(x => x.PersonId == personId, ct);

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => WithPerson(db.Users).FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(User user, CancellationToken ct = default) => await db.Users.AddAsync(user, ct);

    public Task<List<UserRoleAssignment>> ListRolesAsync(Guid userId, CancellationToken ct = default)
        => db.UserRoleAssignments.Where(x => x.UserId == userId).ToListAsync(ct);

    public void AddRole(UserRoleAssignment assignment) => db.UserRoleAssignments.Add(assignment);

    public Task<List<User>> ListUsersAsync(AppRole? excludeHavingRole = null, int take = 500, string? q = null, CancellationToken ct = default)
    {
        // ادمین کلینیک نباید کاربران دارای نقش Platform را اصلاً ببیند
        IQueryable<User> query = ApplyUserSearch(WithPerson(db.Users), excludeHavingRole, q);
        return query.OrderBy(u => u.Person.LastName).ThenBy(u => u.Person.FirstName).Take(take).ToListAsync(ct);
    }

    public async Task<(List<User> Items, int TotalCount)> ListUsersPagedAsync(
        AppRole? excludeHavingRole, int skip, int take, string? q, CancellationToken ct = default)
    {
        IQueryable<User> query = ApplyUserSearch(WithPerson(db.Users), excludeHavingRole, q);
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(u => u.Person.LastName).ThenBy(u => u.Person.FirstName)
            .Skip(skip).Take(take)
            .ToListAsync(ct);
        return (items, total);
    }

    private static IQueryable<User> ApplyUserSearch(
        IQueryable<User> query, AppRole? excludeHavingRole, string? q)
    {
        if (excludeHavingRole is AppRole excluded)
            query = query.Where(u => !u.Roles.Any(r => r.Role == excluded));
        if (string.IsNullOrWhiteSpace(q)) return query;
        var term = q.Trim();
        return query.Where(u =>
            u.Person.FirstName.Contains(term)
            || u.Person.LastName.Contains(term)
            || (u.Person.FirstName + " " + u.Person.LastName).Contains(term)
            || u.Person.Mobile.Contains(term)
            || (u.Person.NationalId != null && u.Person.NationalId.Contains(term)));
    }
}

public sealed class AuthRepository(NabzDbContext db) : IAuthRepository
{
    public async Task AddOtpAsync(OtpChallenge challenge, CancellationToken ct = default)
        => await db.OtpChallenges.AddAsync(challenge, ct);

    public Task<OtpChallenge?> GetLatestActiveOtpAsync(string mobile, string purpose, CancellationToken ct = default)
        => db.OtpChallenges
            .Where(x => x.Mobile == mobile && x.Purpose == purpose && !x.Consumed && x.ExpiresAt > DateTime.UtcNow)
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

public sealed class ClinicStationRepository(NabzDbContext db) : IClinicStationRepository
{
    public Task<List<ClinicStation>> ListByClinicAsync(Guid clinicId, bool activeOnly, CancellationToken ct = default)
    {
        var q = db.ClinicStations.Where(x => x.ClinicId == clinicId);
        if (activeOnly) q = q.Where(x => x.IsActive);
        return q.OrderBy(x => x.SortOrder).ThenBy(x => x.TitleFa).ToListAsync(ct);
    }

    public Task<ClinicStation?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.ClinicStations.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<ClinicStation?> GetByClinicAndCodeAsync(Guid clinicId, string code, CancellationToken ct = default)
        => db.ClinicStations.FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Code == code, ct);

    public async Task AddAsync(ClinicStation station, CancellationToken ct = default)
        => await db.ClinicStations.AddAsync(station, ct);

    public async Task<int> SyncPathwayStationTitlesAsync(string roomCode, string titleFa, CancellationToken ct = default)
    {
        var rows = await db.PathwayStationDefs
            .Where(x => x.RoomCode == roomCode)
            .ToListAsync(ct);
        foreach (var row in rows)
        {
            row.TitleFa = titleFa;
            row.UpdatedAt = DateTime.UtcNow;
        }
        return rows.Count;
    }
}

public sealed class ContractRepository(NabzDbContext db) : IContractRepository
{
    public Task<CorporateContract?> GetByIdAsync(Guid id, bool includeMembers = false, CancellationToken ct = default)
    {
        IQueryable<CorporateContract> q = db.CorporateContracts
            .Include(x => x.Supervisor)!.ThenInclude(s => s!.Person)
            .Include(x => x.PathwayRules);
        if (includeMembers) q = q.Include(x => x.Members).ThenInclude(m => m.Person);
        return q.FirstOrDefaultAsync(x => x.Id == id, ct);
    }

    public Task<List<CorporateContract>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default)
        => db.CorporateContracts
            .Include(x => x.Supervisor)!.ThenInclude(s => s!.Person)
            .Include(x => x.PathwayRules)
            // Members را Include نمی‌کنیم — فقط count جداگانه برای لیست سبک
            .Where(x => x.ClinicId == clinicId).ToListAsync(ct);

    public async Task<Dictionary<Guid, int>> CountMembersByContractIdsAsync(
        IReadOnlyList<Guid> contractIds, CancellationToken ct = default)
    {
        if (contractIds.Count == 0) return new Dictionary<Guid, int>();
        var rows = await db.ContractMembers.AsNoTracking()
            .Where(m => contractIds.Contains(m.ContractId))
            .GroupBy(m => m.ContractId)
            .Select(g => new { ContractId = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        return rows.ToDictionary(x => x.ContractId, x => x.Count);
    }

    public async Task<(List<ContractMember> Items, int TotalCount)> ListMembersPagedAsync(
        Guid contractId, int skip, int take, string? q, CancellationToken ct = default)
    {
        var query = db.ContractMembers.AsNoTracking()
            .Include(m => m.Person)
            .Where(m => m.ContractId == contractId);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(m =>
                m.Person.FirstName.Contains(term)
                || m.Person.LastName.Contains(term)
                || (m.Person.NationalId != null && m.Person.NationalId.Contains(term))
                || m.Person.Mobile.Contains(term)
                || (m.PersonnelCode != null && m.PersonnelCode.Contains(term))
                || (m.Department != null && m.Department.Contains(term)));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(m => m.Person.LastName).ThenBy(m => m.Person.FirstName)
            .Skip(skip).Take(take)
            .ToListAsync(ct);
        return (items, total);
    }

    public async Task AddAsync(CorporateContract contract, CancellationToken ct = default)
        => await db.CorporateContracts.AddAsync(contract, ct);

    public Task<ContractMember?> GetMemberByIdAsync(Guid memberId, CancellationToken ct = default)
        => db.ContractMembers.Include(x => x.Person).FirstOrDefaultAsync(x => x.Id == memberId, ct);

    public Task<ContractMember?> FindActiveMemberByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default)
    {
        // فراخوان باید NID را Normalize کرده باشد؛ مقایسه روی Person
        return db.ContractMembers
            .Include(m => m.Contract)
            .Include(m => m.Person)
            .Where(m => m.Person.NationalId == nationalId
                        && m.Contract.ClinicId == clinicId
                        && m.Contract.Status == ContractStatus.Active)
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }

    public Task<List<ContractMember>> ListActiveMembersByPhoneAsync(Guid clinicId, string mobile, CancellationToken ct = default)
    {
        // موبایل فعلی Person یا شمارهٔ معرفی رستر
        return db.ContractMembers
            .Include(m => m.Contract)
            .Include(m => m.Person)
            .Where(m => m.Contract.ClinicId == clinicId
                        && m.Contract.Status == ContractStatus.Active
                        && (m.Person.Mobile == mobile || m.IntroducedMobile == mobile))
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<ContractMembershipLink>> ListMembershipSummariesByNationalIdsAsync(
        IReadOnlyList<string> nationalIds, Guid? clinicIdFilter, bool includeInactive = false, CancellationToken ct = default)
    {
        if (nationalIds.Count == 0) return [];
        var set = nationalIds.Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        if (set.Count == 0) return [];

        var q = db.ContractMembers.AsNoTracking()
            .Where(m => m.Person.NationalId != null && set.Contains(m.Person.NationalId));
        if (clinicIdFilter is Guid clinicId)
            q = q.Where(m => m.Contract.ClinicId == clinicId);
        if (!includeInactive)
            q = q.Where(m => m.Contract.Status == ContractStatus.Active);

        return await q
            .Select(m => new ContractMembershipLink(
                m.Person.NationalId!, m.ContractId, m.Contract.Title, m.Contract.ClinicId, m.Contract.Status.ToString()))
            .ToListAsync(ct);
    }

    public async Task<List<ContractTitleLink>> ListContractTitlesByIdsAsync(
        IReadOnlyList<Guid> contractIds, Guid? clinicIdFilter, bool includeInactive = false, CancellationToken ct = default)
    {
        if (contractIds.Count == 0) return [];
        var set = contractIds.Distinct().ToList();
        var q = db.CorporateContracts.AsNoTracking().Where(c => set.Contains(c.Id));
        if (clinicIdFilter is Guid clinicId)
            q = q.Where(c => c.ClinicId == clinicId);
        if (!includeInactive)
            q = q.Where(c => c.Status == ContractStatus.Active);

        return await q
            .Select(c => new ContractTitleLink(c.Id, c.Title, c.ClinicId, c.Status.ToString()))
            .ToListAsync(ct);
    }

    public Task<ContractMember?> GetMemberByInviteTokenAsync(string token, CancellationToken ct = default)
        => db.ContractMembers.Include(x => x.Person).FirstOrDefaultAsync(x => x.InviteToken == token, ct);

    public async Task AddMemberAsync(ContractMember member, CancellationToken ct = default)
        => await db.ContractMembers.AddAsync(member, ct);

    public void RemoveMember(ContractMember member)
        => db.ContractMembers.Remove(member);

    public async Task AddSmsLogAsync(ContractSmsLog log, CancellationToken ct = default)
        => await db.ContractSmsLogs.AddAsync(log, ct);

    public Task<ContractSupervisor?> GetSupervisorByPhoneAsync(string phone, CancellationToken ct = default)
        => db.ContractSupervisors.Include(x => x.Contract).Include(x => x.Person)
            .FirstOrDefaultAsync(x => x.Person.Mobile == phone && x.IsActive, ct);

    public void RemovePathwayRules(IEnumerable<ContractPathwayRule> rules)
        => db.ContractPathwayRules.RemoveRange(rules);

    public Task<ContractPathwayRule?> GetPathwayRuleByIdAsync(Guid ruleId, CancellationToken ct = default)
        => db.ContractPathwayRules.FirstOrDefaultAsync(x => x.Id == ruleId, ct);

    public Task<List<ContractPathwayRule>> ListPathwayRulesByLibraryPathwayIdAsync(Guid libraryPathwayId, CancellationToken ct = default)
        => db.ContractPathwayRules.Where(x => x.LibraryPathwayId == libraryPathwayId).ToListAsync(ct);

    public async Task AddPathwayRuleAsync(ContractPathwayRule rule, CancellationToken ct = default)
        => await db.ContractPathwayRules.AddAsync(rule, ct);
}

public sealed class PathwayCatalogRepository(NabzDbContext db) : IPathwayCatalogRepository
{
    private static IQueryable<PathwayDefinition> WithStations(IQueryable<PathwayDefinition> q, bool includeStations)
        => includeStations ? q.Include(x => x.Stations) : q;

    public Task<PathwayDefinition?> GetByIdAsync(Guid id, bool includeStations = true, CancellationToken ct = default)
        => WithStations(db.PathwayDefinitions.AsQueryable(), includeStations)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<PathwayDefinition?> GetByCodeAsync(string code, bool includeStations = true, CancellationToken ct = default)
        => WithStations(db.PathwayDefinitions.AsQueryable(), includeStations)
            .FirstOrDefaultAsync(x => x.Code == code, ct);

    public Task<PathwayStationDef?> GetStationByIdAsync(Guid stationDefId, CancellationToken ct = default)
        => db.PathwayStationDefs.FirstOrDefaultAsync(x => x.Id == stationDefId, ct);

    public Task<List<PathwayDefinition>> ListActiveAsync(CancellationToken ct = default)
        => db.PathwayDefinitions.Include(x => x.Stations)
            .Where(x => x.IsActive)
            .OrderBy(x => x.Code)
            .ToListAsync(ct);

    public Task<List<PathwayDefinition>> ListAsync(string? query, bool libraryOnly, int take, CancellationToken ct = default)
    {
        var q = db.PathwayDefinitions.Include(x => x.Stations).AsQueryable();
        if (libraryOnly)
            q = q.Where(x => x.IsInLibrary);
        if (!string.IsNullOrWhiteSpace(query))
        {
            var t = query.Trim();
            q = q.Where(x =>
                x.Title.Contains(t) || x.Code.Contains(t)
                || (x.Description != null && x.Description.Contains(t))
                || x.JobCategory.Contains(t) || x.Gender.Contains(t));
        }
        return q.OrderBy(x => x.Code).Take(take).ToListAsync(ct);
    }

    public Task<int> CountAsync(CancellationToken ct = default)
        => db.PathwayDefinitions.CountAsync(ct);

    public async Task AddAsync(PathwayDefinition def, CancellationToken ct = default)
        => await db.PathwayDefinitions.AddAsync(def, ct);

    public void Remove(PathwayDefinition def) => db.PathwayDefinitions.Remove(def);

    public void RemoveRange(IEnumerable<PathwayDefinition> defs)
        => db.PathwayDefinitions.RemoveRange(defs);

    public void RemoveStations(IEnumerable<PathwayStationDef> stations)
        => db.PathwayStationDefs.RemoveRange(stations);

    public Task<int> CountAttachedContractsAsync(Guid pathwayId, CancellationToken ct = default)
        => db.ContractPathwayRules
            .Where(x => x.LibraryPathwayId == pathwayId)
            .Select(x => x.ContractId)
            .Distinct()
            .CountAsync(ct);

    public async Task<(int ActiveMatched, int PreviouslyUsed)> CountMemberUsageAsync(Guid pathwayId, CancellationToken ct = default)
    {
        // match با عنوان مسیر قرارداد متصل به کاتالوگ — هم‌تراز ApplyPathwayRules
        var matched = db.ContractPathwayRules
            .Where(r => r.LibraryPathwayId == pathwayId)
            .Join(
                db.ContractMembers,
                r => new { r.ContractId, Title = r.Title },
                m => new { m.ContractId, Title = m.MatchedPathwayTitle ?? "" },
                (r, m) => m);

        var active = await matched.Where(m => m.OnboardingStage != OnboardingStage.Completed).Select(m => m.Id).Distinct().CountAsync(ct);
        var previously = await matched.Where(m => m.OnboardingStage == OnboardingStage.Completed).Select(m => m.Id).Distinct().CountAsync(ct);
        return (active, previously);
    }

    public Task<List<PatientPathwayStationProgress>> ListProgressByPatientAsync(Guid patientId, CancellationToken ct = default)
        => db.PatientPathwayStationProgresses.Where(x => x.PatientId == patientId).ToListAsync(ct);

    public Task<PatientPathwayStationProgress?> GetProgressAsync(Guid patientId, Guid stationDefId, CancellationToken ct = default)
        => db.PatientPathwayStationProgresses
            .FirstOrDefaultAsync(x => x.PatientId == patientId && x.PathwayStationDefId == stationDefId, ct);

    public async Task AddProgressAsync(PatientPathwayStationProgress progress, CancellationToken ct = default)
        => await db.PatientPathwayStationProgresses.AddAsync(progress, ct);
}

public sealed class PatientRepository(NabzDbContext db) : IPatientRepository
{
    private static IQueryable<Patient> WithPerson(IQueryable<Patient> q)
        => q.Include(x => x.Person);

    public Task<Patient?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => WithPerson(db.Patients).FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<Patient?> GetByNationalIdAsync(string nationalId, Guid clinicId, CancellationToken ct = default)
        => WithPerson(db.Patients)
            .FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Person.NationalId == nationalId, ct);

    public Task<Patient?> GetByPersonIdAsync(Guid personId, Guid clinicId, CancellationToken ct = default)
        => WithPerson(db.Patients).FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.PersonId == personId, ct);

    public Task<Patient?> GetByOwnerUserIdAsync(Guid userId, CancellationToken ct = default)
        => WithPerson(db.Patients).FirstOrDefaultAsync(x => x.OwnerUserId == userId, ct);

    public async Task<Dictionary<Guid, Guid>> MapPatientIdsByOwnerUserIdsAsync(
        IReadOnlyList<Guid> userIds, CancellationToken ct = default)
    {
        if (userIds.Count == 0) return new Dictionary<Guid, Guid>();
        var rows = await db.Patients
            .AsNoTracking()
            .Where(x => x.OwnerUserId != null && userIds.Contains(x.OwnerUserId.Value))
            .Select(x => new { OwnerId = x.OwnerUserId!.Value, x.Id })
            .ToListAsync(ct);
        // یک Owner حداکثر یک Patient — در صورت تکرار، اولین را نگه می‌داریم
        return rows.GroupBy(r => r.OwnerId).ToDictionary(g => g.Key, g => g.First().Id);
    }

    public Task<Patient?> GetByPhoneAsync(string phone, Guid clinicId, CancellationToken ct = default)
        => WithPerson(db.Patients)
            .FirstOrDefaultAsync(x => x.ClinicId == clinicId && x.Person.Mobile == phone, ct);

    public Task<List<Patient>> ListByPhoneAsync(string phone, Guid clinicId, CancellationToken ct = default)
        => WithPerson(db.Patients)
            .Where(x => x.ClinicId == clinicId && x.Person.Mobile == phone).ToListAsync(ct);

    public Task<List<Patient>> SearchAsync(Guid clinicId, string? query, int take, CancellationToken ct = default)
    {
        var q = WithPerson(db.Patients).Where(x => x.ClinicId == clinicId);
        if (!string.IsNullOrWhiteSpace(query))
        {
            var t = query.Trim();
            q = q.Where(x => x.Person.FirstName.Contains(t) || x.Person.LastName.Contains(t)
                || (x.Person.FirstName + " " + x.Person.LastName).Contains(t)
                || (x.Person.NationalId != null && x.Person.NationalId.Contains(t))
                || x.Person.Mobile.Contains(t));
        }
        return q.OrderBy(x => x.Person.LastName).ThenBy(x => x.Person.FirstName).Take(take).ToListAsync(ct);
    }

    public async Task AddAsync(Patient patient, CancellationToken ct = default) => await db.Patients.AddAsync(patient, ct);
}

public sealed class PatientProfileRevisionRepository(NabzDbContext db) : IPatientProfileRevisionRepository
{
    public async Task AddRangeAsync(IEnumerable<PatientProfileRevision> items, CancellationToken ct = default)
        => await db.PatientProfileRevisions.AddRangeAsync(items, ct);

    public Task<List<PatientProfileRevision>> ListByPatientAsync(Guid patientId, int take, CancellationToken ct = default)
        => db.PatientProfileRevisions
            .Where(x => x.PatientId == patientId)
            .OrderByDescending(x => x.At)
            .Take(take)
            .ToListAsync(ct);
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

    public async Task AddAnswerAsync(FormAnswer answer, CancellationToken ct = default)
        => await db.FormAnswers.AddAsync(answer, ct);

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

    public void RemovePhoto(PatientPhoto photo) => db.PatientPhotos.Remove(photo);

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

    public Task<FraudCaptureSession?> GetOpenFraudSessionAsync(Guid patientId, Guid userId, CancellationToken ct = default)
        => db.FraudCaptureSessions
            .Where(x => x.PatientId == patientId && x.UserId == userId && x.EndedAt == null)
            .OrderByDescending(x => x.StartedAt)
            .FirstOrDefaultAsync(ct);

    public async Task AddEvidencePackageAsync(EvidencePackage package, CancellationToken ct = default)
        => await db.EvidencePackages.AddAsync(package, ct);

    public Task<EvidencePackage?> GetEvidencePackageAsync(Guid id, CancellationToken ct = default)
        => db.EvidencePackages.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<FraudCaptureSession>> ListFraudSessionsAsync(FraudReviewStatus? status, int take, CancellationToken ct = default)
    {
        var q = db.FraudCaptureSessions.AsQueryable();
        if (status.HasValue) q = q.Where(x => x.ReviewStatus == status);
        return q.OrderByDescending(x => x.StartedAt).Take(take).ToListAsync(ct);
    }

    public Task<List<GpsPoint>> ListGpsByPatientAsync(Guid patientId, int take, CancellationToken ct = default)
        => db.GpsPoints.Where(x => x.PatientId == patientId).OrderByDescending(x => x.CapturedAt).Take(take).ToListAsync(ct);

    public Task<List<IntakeDocumentGroup>> ListDocumentGroupsByPatientAsync(Guid patientId, CancellationToken ct = default)
        => db.IntakeDocumentGroups.Include(x => x.Files.Where(f => f.DeletedAt == null))
            .Where(x => x.PatientId == patientId)
            .OrderByDescending(x => x.UploadedAt)
            .ToListAsync(ct);

    public Task<List<PatientPhoto>> ListPhotosByPatientAsync(Guid patientId, CancellationToken ct = default)
        => db.PatientPhotos.Where(x => x.PatientId == patientId && x.DeletedAt == null)
            .OrderByDescending(x => x.CapturedAt).ToListAsync(ct);

    public Task<List<PatientPhoto>> ListPhotosBySessionAsync(Guid sessionId, CancellationToken ct = default)
        => db.PatientPhotos.Where(x => x.SessionId == sessionId && x.DeletedAt == null)
            .OrderBy(x => x.CapturedAt).ToListAsync(ct);

    public Task<PatientPhoto?> GetLatestPortraitAsync(Guid patientId, CancellationToken ct = default)
        => db.PatientPhotos
            .Where(x => x.PatientId == patientId && x.Kind == UserPhotoKind.Portrait && x.DeletedAt == null)
            .OrderByDescending(x => x.CapturedAt)
            .FirstOrDefaultAsync(ct);

    public Task<PatientPhoto?> GetPhotoAsync(Guid photoId, CancellationToken ct = default)
        => db.PatientPhotos.FirstOrDefaultAsync(x => x.Id == photoId, ct);

    public Task<List<IntakeDocumentFile>> ListDocumentFilesByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default)
        => db.IntakeDocumentFiles.Include(x => x.Group).ThenInclude(g => g.Patient).ThenInclude(p => p.Person)
            .Where(x => ids.Contains(x.Id)).ToListAsync(ct);

    public Task<List<PatientPhoto>> ListPhotosByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default)
        => db.PatientPhotos.Include(x => x.Patient).ThenInclude(p => p.Person)
            .Where(x => ids.Contains(x.Id)).ToListAsync(ct);

    public Task<List<IntakeDocumentFile>> ListVaultDocumentFilesAsync(bool trashOnly, int take, CancellationToken ct = default)
    {
        var q = db.IntakeDocumentFiles
            .Include(x => x.Group).ThenInclude(g => g.Patient).ThenInclude(p => p.Person)
            .AsQueryable();
        q = trashOnly ? q.Where(x => x.DeletedAt != null) : q.Where(x => x.DeletedAt == null);
        return q.OrderByDescending(x => x.CreatedAt).Take(take).ToListAsync(ct);
    }

    public Task<List<PatientPhoto>> ListVaultPhotosAsync(bool trashOnly, int take, CancellationToken ct = default)
    {
        var q = db.PatientPhotos.Include(x => x.Patient).ThenInclude(p => p.Person).AsQueryable();
        q = trashOnly ? q.Where(x => x.DeletedAt != null) : q.Where(x => x.DeletedAt == null);
        return q.OrderByDescending(x => x.CapturedAt).Take(take).ToListAsync(ct);
    }

    public Task<PatientPhoto?> FindPhotoByStorageKeyAsync(string storageKey, CancellationToken ct = default)
    {
        // یک کلید ممکن است هم پرتره و هم fraud_confirm باشد؛ پرتره اولویت دارد تا Owner بتواند دانلود کند
        var key = (storageKey ?? "").Replace('\\', '/').Trim();
        return db.PatientPhotos.Include(x => x.Patient)
            .Where(x => x.StorageKey == key || x.StorageKey == storageKey)
            .OrderBy(x => x.Kind == UserPhotoKind.Portrait ? 0 : 1)
            .ThenByDescending(x => x.CapturedAt)
            .FirstOrDefaultAsync(ct);
    }

    public Task<IntakeDocumentFile?> FindDocumentFileByStorageKeyAsync(string storageKey, CancellationToken ct = default)
        => db.IntakeDocumentFiles.Include(x => x.Group).ThenInclude(g => g.Patient)
            .FirstOrDefaultAsync(x => x.StorageKey == storageKey, ct);
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

public sealed class SmsCampaignTemplateRepository(NabzDbContext db) : ISmsCampaignTemplateRepository
{
    public Task<SmsCampaignTemplate?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.SmsCampaignTemplates.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<SmsCampaignTemplate?> GetByCodeAsync(string code, CancellationToken ct = default)
        => db.SmsCampaignTemplates.FirstOrDefaultAsync(x => x.Code == code, ct);

    public Task<List<SmsCampaignTemplate>> ListAsync(bool activeOnly, CancellationToken ct = default)
    {
        var q = db.SmsCampaignTemplates.AsQueryable();
        if (activeOnly) q = q.Where(x => x.IsActive);
        return q.OrderBy(x => x.SortOrder).ThenBy(x => x.Title).ToListAsync(ct);
    }

    public async Task AddAsync(SmsCampaignTemplate template, CancellationToken ct = default)
        => await db.SmsCampaignTemplates.AddAsync(template, ct);
}

public sealed class ApiAbuseRepository(NabzDbContext db) : IApiAbuseRepository
{
    public async Task AddAsync(ApiAbuseIncident incident, CancellationToken ct = default)
        => await db.ApiAbuseIncidents.AddAsync(incident, ct);

    public Task<ApiAbuseIncident?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.ApiAbuseIncidents.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<ApiAbuseIncident>> ListAsync(bool? acknowledged, int take, CancellationToken ct = default)
    {
        var q = db.ApiAbuseIncidents.AsQueryable();
        if (acknowledged.HasValue)
            q = q.Where(x => x.Acknowledged == acknowledged.Value);
        return q.OrderByDescending(x => x.CreatedAt).Take(take).ToListAsync(ct);
    }
}
