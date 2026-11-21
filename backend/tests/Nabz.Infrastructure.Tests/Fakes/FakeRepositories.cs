/*
 File: backend/tests/Nabz.Infrastructure.Tests/Fakes/FakeRepositories.cs
 Description: پیاده‌سازی in-memory تمام I*Repository برای تست unit
 Parent Dependencies: IRepositories.cs, InMemoryStore
 */

using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Tests.Fakes;

public sealed class FakePersonRepository(InMemoryStore store) : IPersonRepository
{
    public Task<Person?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(store.Persons.FirstOrDefault(x => x.Id == id));

    public Task<Person?> GetByNationalIdAsync(string nationalId, CancellationToken ct = default)
        => Task.FromResult(store.Persons.FirstOrDefault(x => x.NationalId != null && x.NationalId == nationalId));

    public Task<List<Person>> ListByMobileAsync(string mobile, CancellationToken ct = default)
        => Task.FromResult(store.Persons.Where(x => x.Mobile == mobile).ToList());

    public Task AddAsync(Person person, CancellationToken ct = default)
    {
        store.Persons.Add(person);
        return Task.CompletedTask;
    }
}

public sealed class FakeUserRepository(InMemoryStore store) : IUserRepository
{
    private void HydratePerson(User? user)
    {
        if (user is null) return;
        user.Person = store.Persons.FirstOrDefault(p => p.Id == user.PersonId) ?? user.Person;
        user.Roles = store.Roles.Where(x => x.UserId == user.Id).ToList();
    }

    public Task<User?> GetByMobileAsync(string mobile, CancellationToken ct = default)
    {
        var personIds = store.Persons.Where(p => p.Mobile == mobile).Select(p => p.Id).ToHashSet();
        var user = store.Users.FirstOrDefault(x => personIds.Contains(x.PersonId));
        HydratePerson(user);
        return Task.FromResult(user);
    }

    public Task<List<User>> ListByMobileAsync(string mobile, CancellationToken ct = default)
    {
        var personIds = store.Persons.Where(p => p.Mobile == mobile).Select(p => p.Id).ToHashSet();
        var list = store.Users.Where(x => personIds.Contains(x.PersonId)).ToList();
        foreach (var u in list) HydratePerson(u);
        return Task.FromResult(list);
    }

    public Task<User?> GetByNationalIdAsync(string nationalId, CancellationToken ct = default)
    {
        var personId = store.Persons.FirstOrDefault(p => p.NationalId == nationalId)?.Id;
        var user = personId is null ? null : store.Users.FirstOrDefault(x => x.PersonId == personId);
        HydratePerson(user);
        return Task.FromResult(user);
    }

    public Task<User?> GetByPersonIdAsync(Guid personId, CancellationToken ct = default)
    {
        var user = store.Users.FirstOrDefault(x => x.PersonId == personId);
        HydratePerson(user);
        return Task.FromResult(user);
    }

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = store.Users.FirstOrDefault(x => x.Id == id);
        HydratePerson(user);
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

        var list = q
            .Select(u =>
            {
                HydratePerson(u);
                return u;
            })
            .OrderBy(u => u.Person.LastName)
            .ThenBy(u => u.Person.FirstName)
            .Take(take)
            .ToList();
        return Task.FromResult(list);
    }

    public Task<(List<User> Items, int TotalCount)> ListUsersPagedAsync(
        AppRole? excludeHavingRole, int skip, int take, string? q, CancellationToken ct = default)
    {
        IEnumerable<User> query = store.Users;
        if (excludeHavingRole is AppRole excluded)
        {
            var excludedIds = store.Roles.Where(r => r.Role == excluded).Select(r => r.UserId).ToHashSet();
            query = query.Where(u => !excludedIds.Contains(u.Id));
        }
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(u =>
            {
                HydratePerson(u);
                return u.Person.FirstName.Contains(term, StringComparison.OrdinalIgnoreCase)
                    || u.Person.LastName.Contains(term, StringComparison.OrdinalIgnoreCase)
                    || u.Person.Mobile.Contains(term, StringComparison.OrdinalIgnoreCase)
                    || (u.Person.NationalId?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false);
            });
        }
        var all = query.Select(u => { HydratePerson(u); return u; })
            .OrderBy(u => u.Person.LastName).ThenBy(u => u.Person.FirstName).ToList();
        return Task.FromResult((all.Skip(skip).Take(take).ToList(), all.Count));
    }
}

public sealed class FakeAuthRepository(InMemoryStore store) : IAuthRepository
{
    public Task AddOtpAsync(OtpChallenge challenge, CancellationToken ct = default)
    {
        store.Otps.Add(challenge);
        return Task.CompletedTask;
    }

    public Task<OtpChallenge?> GetLatestActiveOtpAsync(string mobile, string purpose, CancellationToken ct = default)
    {
        var otp = store.Otps
            .Where(x => x.Mobile == mobile && x.Purpose == purpose && !x.Consumed && x.ExpiresAt > DateTime.UtcNow)
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
    private void HydratePerson(ContractMember? member)
    {
        if (member is null) return;
        member.Person = store.Persons.FirstOrDefault(p => p.Id == member.PersonId) ?? member.Person;
    }

    private void HydratePerson(ContractSupervisor? sup)
    {
        if (sup is null) return;
        sup.Person = store.Persons.FirstOrDefault(p => p.Id == sup.PersonId) ?? sup.Person;
    }

    public Task<CorporateContract?> GetByIdAsync(Guid id, bool includeMembers = false, CancellationToken ct = default)
    {
        var contract = store.Contracts.FirstOrDefault(x => x.Id == id);
        if (contract is null)
            return Task.FromResult<CorporateContract?>(null);

        contract.Supervisor = store.Supervisors.FirstOrDefault(s => s.ContractId == contract.Id);
        HydratePerson(contract.Supervisor);
        contract.PackageRules = store.PackageRules.Where(r => r.ContractId == contract.Id).ToList();
        if (includeMembers)
        {
            contract.Members = store.Members.Where(m => m.ContractId == contract.Id).ToList();
            foreach (var m in contract.Members) HydratePerson(m);
        }

        return Task.FromResult<CorporateContract?>(contract);
    }

    public Task<List<CorporateContract>> ListByClinicAsync(Guid clinicId, CancellationToken ct = default)
    {
        var list = store.Contracts.Where(x => x.ClinicId == clinicId).ToList();
        foreach (var c in list)
        {
            c.Supervisor = store.Supervisors.FirstOrDefault(s => s.ContractId == c.Id);
            HydratePerson(c.Supervisor);
            // هم‌تراز EF: قوانین بسته در List هم لازم است تا ContractDto.PackageRules خالی نماند
            c.PackageRules = store.PackageRules.Where(r => r.ContractId == c.Id).ToList();
            c.Members = store.Members.Where(m => m.ContractId == c.Id).ToList();
            foreach (var m in c.Members) HydratePerson(m);
        }

        return Task.FromResult(list);
    }

    public Task AddAsync(CorporateContract contract, CancellationToken ct = default)
    {
        store.Contracts.Add(contract);
        return Task.CompletedTask;
    }

    public Task<Dictionary<Guid, int>> CountMembersByContractIdsAsync(
        IReadOnlyList<Guid> contractIds, CancellationToken ct = default)
    {
        var dict = store.Members
            .Where(m => contractIds.Contains(m.ContractId))
            .GroupBy(m => m.ContractId)
            .ToDictionary(g => g.Key, g => g.Count());
        return Task.FromResult(dict);
    }

    public Task<(List<ContractMember> Items, int TotalCount)> ListMembersPagedAsync(
        Guid contractId, int skip, int take, string? q, CancellationToken ct = default)
    {
        IEnumerable<ContractMember> query = store.Members.Where(m => m.ContractId == contractId);
        foreach (var m in query) HydratePerson(m);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(m =>
                m.Person.FirstName.Contains(term, StringComparison.OrdinalIgnoreCase)
                || m.Person.LastName.Contains(term, StringComparison.OrdinalIgnoreCase)
                || (m.Person.NationalId?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false)
                || m.Person.Mobile.Contains(term, StringComparison.OrdinalIgnoreCase)
                || (m.PersonnelCode?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false)
                || (m.Department?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false));
        }
        var all = query.OrderByDescending(m => m.CreatedAt).ToList();
        return Task.FromResult((all.Skip(skip).Take(take).ToList(), all.Count));
    }

    public Task<ContractMember?> GetMemberByIdAsync(Guid memberId, CancellationToken ct = default)
    {
        var member = store.Members.FirstOrDefault(x => x.Id == memberId);
        HydratePerson(member);
        return Task.FromResult(member);
    }

    public Task<ContractMember?> FindActiveMemberByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default)
    {
        var member = store.Members
            .Select(m =>
            {
                HydratePerson(m);
                m.Contract = store.Contracts.FirstOrDefault(c => c.Id == m.ContractId);
                return m;
            })
            .Where(m => m.Person.NationalId == nationalId
                        && m.Contract is not null
                        && m.Contract.ClinicId == clinicId
                        && m.Contract.Status == ContractStatus.Active)
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefault();
        return Task.FromResult(member);
    }

    public Task<List<ContractMember>> ListActiveMembersByPhoneAsync(Guid clinicId, string mobile, CancellationToken ct = default)
    {
        var list = store.Members
            .Select(m =>
            {
                HydratePerson(m);
                m.Contract = store.Contracts.FirstOrDefault(c => c.Id == m.ContractId);
                return m;
            })
            .Where(m => m.Contract is not null
                        && m.Contract.ClinicId == clinicId
                        && m.Contract.Status == ContractStatus.Active
                        && (m.Person.Mobile == mobile || m.IntroducedMobile == mobile))
            .OrderByDescending(m => m.CreatedAt)
            .ToList();
        return Task.FromResult(list);
    }

    public Task<List<ContractMembershipLink>> ListMembershipSummariesByNationalIdsAsync(
        IReadOnlyList<string> nationalIds, Guid? clinicIdFilter, bool includeInactive = false, CancellationToken ct = default)
    {
        var set = nationalIds.Where(n => !string.IsNullOrWhiteSpace(n)).ToHashSet(StringComparer.Ordinal);
        var list = store.Members
            .Select(m =>
            {
                HydratePerson(m);
                return m;
            })
            .Where(m => m.Person.NationalId != null && set.Contains(m.Person.NationalId))
            .Select(m =>
            {
                var c = store.Contracts.FirstOrDefault(x => x.Id == m.ContractId);
                if (c is null) return null;
                if (!includeInactive && c.Status != ContractStatus.Active) return null;
                if (clinicIdFilter is not null && c.ClinicId != clinicIdFilter) return null;
                return new ContractMembershipLink(m.Person.NationalId!, m.ContractId, c.Title, c.ClinicId, c.Status.ToString());
            })
            .Where(x => x is not null)
            .Cast<ContractMembershipLink>()
            .ToList();
        return Task.FromResult(list);
    }

    public Task<List<ContractTitleLink>> ListContractTitlesByIdsAsync(
        IReadOnlyList<Guid> contractIds, Guid? clinicIdFilter, bool includeInactive = false, CancellationToken ct = default)
    {
        var set = contractIds.ToHashSet();
        var list = store.Contracts
            .Where(c => set.Contains(c.Id)
                        && (clinicIdFilter is null || c.ClinicId == clinicIdFilter)
                        && (includeInactive || c.Status == ContractStatus.Active))
            .Select(c => new ContractTitleLink(c.Id, c.Title, c.ClinicId, c.Status.ToString()))
            .ToList();
        return Task.FromResult(list);
    }

    public Task<ContractMember?> GetMemberByInviteTokenAsync(string token, CancellationToken ct = default)
    {
        var member = store.Members.FirstOrDefault(x => x.InviteToken == token);
        HydratePerson(member);
        return Task.FromResult(member);
    }

    public Task AddMemberAsync(ContractMember member, CancellationToken ct = default)
    {
        store.Members.Add(member);
        return Task.CompletedTask;
    }

    public void RemoveMember(ContractMember member)
        => store.Members.Remove(member);

    public Task AddSmsLogAsync(ContractSmsLog log, CancellationToken ct = default)
    {
        store.ContractSmsLogs.Add(log);
        return Task.CompletedTask;
    }

    public Task<ContractSupervisor?> GetSupervisorByPhoneAsync(string phone, CancellationToken ct = default)
    {
        ContractSupervisor? sup = null;
        foreach (var s in store.Supervisors.Where(x => x.IsActive))
        {
            HydratePerson(s);
            if (s.Person.Mobile == phone)
            {
                sup = s;
                break;
            }
        }

        if (sup is null)
        {
            foreach (var c in store.Contracts)
            {
                var nav = c.Supervisor;
                if (nav is null || !nav.IsActive) continue;
                HydratePerson(nav);
                if (nav.Person.Mobile == phone)
                {
                    sup = nav;
                    if (!store.Supervisors.Contains(sup))
                        store.Supervisors.Add(sup);
                    break;
                }
            }
        }

        if (sup is not null)
        {
            HydratePerson(sup);
            sup.Contract = store.Contracts.First(c => c.Id == sup.ContractId);
        }

        return Task.FromResult(sup);
    }

    public void RemovePackageRules(IEnumerable<ContractPackageRule> rules)
    {
        foreach (var rule in rules)
            store.PackageRules.Remove(rule);
    }

    public Task<ContractPackageRule?> GetPackageRuleByIdAsync(Guid ruleId, CancellationToken ct = default)
        => Task.FromResult(store.PackageRules.FirstOrDefault(x => x.Id == ruleId));

    public Task<List<ContractPackageRule>> ListPackageRulesByLibraryRuleIdAsync(Guid libraryRuleId, CancellationToken ct = default)
        => Task.FromResult(store.PackageRules.Where(x => x.LibraryRuleId == libraryRuleId).ToList());

    public Task AddPackageRuleAsync(ContractPackageRule rule, CancellationToken ct = default)
    {
        if (!store.PackageRules.Contains(rule))
            store.PackageRules.Add(rule);
        return Task.CompletedTask;
    }
}

public sealed class FakePackageLibraryRuleRepository(InMemoryStore store) : IPackageLibraryRuleRepository
{
    public Task<PackageLibraryRule?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(store.PackageLibraryRules.FirstOrDefault(x => x.Id == id));

    public Task<List<PackageLibraryRule>> ListAsync(string? query, int take, CancellationToken ct = default)
    {
        IEnumerable<PackageLibraryRule> q = store.PackageLibraryRules;
        if (!string.IsNullOrWhiteSpace(query))
        {
            var t = query.Trim();
            q = q.Where(x =>
                x.Title.Contains(t, StringComparison.OrdinalIgnoreCase)
                || x.Code.Contains(t, StringComparison.OrdinalIgnoreCase)
                || (x.Description?.Contains(t, StringComparison.OrdinalIgnoreCase) ?? false)
                || x.JobCategory.Contains(t, StringComparison.OrdinalIgnoreCase)
                || x.Gender.Contains(t, StringComparison.OrdinalIgnoreCase)
                || x.PackageCode.Contains(t, StringComparison.OrdinalIgnoreCase));
        }
        return Task.FromResult(q.OrderBy(x => x.Code).Take(take).ToList());
    }

    public Task<int> CountAsync(CancellationToken ct = default)
        => Task.FromResult(store.PackageLibraryRules.Count);

    public Task AddAsync(PackageLibraryRule rule, CancellationToken ct = default)
    {
        store.PackageLibraryRules.Add(rule);
        return Task.CompletedTask;
    }

    public void Remove(PackageLibraryRule rule) => store.PackageLibraryRules.Remove(rule);

    public Task<int> CountAttachedContractsAsync(Guid libraryRuleId, CancellationToken ct = default)
        => Task.FromResult(store.PackageRules.Where(x => x.LibraryRuleId == libraryRuleId).Select(x => x.ContractId).Distinct().Count());

    public Task<(int ActiveMatched, int PreviouslyUsed)> CountMemberUsageAsync(Guid libraryRuleId, CancellationToken ct = default)
    {
        var titlesByContract = store.PackageRules
            .Where(r => r.LibraryRuleId == libraryRuleId)
            .GroupBy(r => r.ContractId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.Title).ToHashSet(StringComparer.Ordinal));

        var matched = store.Members.Where(m =>
            titlesByContract.TryGetValue(m.ContractId, out var titles)
            && m.MatchedRuleTitle is not null
            && titles.Contains(m.MatchedRuleTitle));

        var active = matched.Count(m => m.OnboardingStage != OnboardingStage.Completed);
        var previously = matched.Count(m => m.OnboardingStage == OnboardingStage.Completed);
        return Task.FromResult((active, previously));
    }
}

public sealed class FakePatientRepository(InMemoryStore store) : IPatientRepository
{
    private void HydratePerson(Patient? patient)
    {
        if (patient is null) return;
        patient.Person = store.Persons.FirstOrDefault(p => p.Id == patient.PersonId) ?? patient.Person;
    }

    public Task<Patient?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var patient = store.Patients.FirstOrDefault(x => x.Id == id);
        HydratePerson(patient);
        return Task.FromResult(patient);
    }

    public Task<Patient?> GetByNationalIdAsync(string nationalId, Guid clinicId, CancellationToken ct = default)
    {
        var patient = store.Patients
            .Where(x => x.ClinicId == clinicId)
            .Select(p =>
            {
                HydratePerson(p);
                return p;
            })
            .FirstOrDefault(x => x.Person.NationalId == nationalId);
        return Task.FromResult(patient);
    }

    public Task<Patient?> GetByPersonIdAsync(Guid personId, Guid clinicId, CancellationToken ct = default)
    {
        var patient = store.Patients.FirstOrDefault(x => x.ClinicId == clinicId && x.PersonId == personId);
        HydratePerson(patient);
        return Task.FromResult(patient);
    }

    public Task<Patient?> GetByOwnerUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        var patient = store.Patients.FirstOrDefault(x => x.OwnerUserId == userId);
        HydratePerson(patient);
        return Task.FromResult(patient);
    }

    public Task<Dictionary<Guid, Guid>> MapPatientIdsByOwnerUserIdsAsync(
        IReadOnlyList<Guid> userIds, CancellationToken ct = default)
    {
        var map = store.Patients
            .Where(x => x.OwnerUserId is Guid oid && userIds.Contains(oid))
            .GroupBy(x => x.OwnerUserId!.Value)
            .ToDictionary(g => g.Key, g => g.First().Id);
        return Task.FromResult(map);
    }

    public Task<Patient?> GetByPhoneAsync(string phone, Guid clinicId, CancellationToken ct = default)
    {
        var patient = store.Patients
            .Where(x => x.ClinicId == clinicId)
            .Select(p =>
            {
                HydratePerson(p);
                return p;
            })
            .FirstOrDefault(x => x.Person.Mobile == phone);
        return Task.FromResult(patient);
    }

    public Task<List<Patient>> ListByPhoneAsync(string phone, Guid clinicId, CancellationToken ct = default)
    {
        var list = store.Patients
            .Where(x => x.ClinicId == clinicId)
            .Select(p =>
            {
                HydratePerson(p);
                return p;
            })
            .Where(x => x.Person.Mobile == phone)
            .ToList();
        return Task.FromResult(list);
    }

    public Task<List<Patient>> SearchAsync(Guid clinicId, string? query, int take, CancellationToken ct = default)
    {
        var q = store.Patients.Where(x => x.ClinicId == clinicId).Select(p =>
        {
            HydratePerson(p);
            return p;
        });
        if (!string.IsNullOrWhiteSpace(query))
        {
            var t = query.Trim();
            q = q.Where(x => x.Person.FirstName.Contains(t) || x.Person.LastName.Contains(t)
                || (x.Person.FirstName + " " + x.Person.LastName).Contains(t)
                || (x.Person.NationalId != null && x.Person.NationalId.Contains(t))
                || x.Person.Mobile.Contains(t));
        }

        return Task.FromResult(q.OrderBy(x => x.Person.LastName).ThenBy(x => x.Person.FirstName).Take(take).ToList());
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

    public Task AddAnswerAsync(FormAnswer answer, CancellationToken ct = default)
    {
        if (!store.FormAnswers.Contains(answer))
            store.FormAnswers.Add(answer);
        var response = store.Responses.FirstOrDefault(r => r.Id == answer.ResponseId);
        if (response is not null && !response.Answers.Contains(answer))
            response.Answers.Add(answer);
        return Task.CompletedTask;
    }

    public void RemoveAnswers(IEnumerable<FormAnswer> answers)
    {
        foreach (var answer in answers)
        {
            store.FormAnswers.Remove(answer);
            foreach (var response in store.Responses)
                response.Answers.Remove(answer);
        }
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

    public void RemovePhoto(PatientPhoto photo) => store.Photos.Remove(photo);

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

    public Task<FraudCaptureSession?> GetOpenFraudSessionAsync(Guid patientId, Guid userId, CancellationToken ct = default)
        => Task.FromResult(
            store.FraudSessions
                .Where(x => x.PatientId == patientId && x.UserId == userId && x.EndedAt == null)
                .OrderByDescending(x => x.StartedAt)
                .FirstOrDefault());

    public Task AddEvidencePackageAsync(EvidencePackage package, CancellationToken ct = default)
    {
        store.EvidencePackages.Add(package);
        return Task.CompletedTask;
    }

    public Task<EvidencePackage?> GetEvidencePackageAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(store.EvidencePackages.FirstOrDefault(x => x.Id == id));

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
            g.Files = store.DocumentFiles.Where(f => f.GroupId == g.Id && f.DeletedAt == null).ToList();
        return Task.FromResult(groups);
    }

    public Task<List<PatientPhoto>> ListPhotosByPatientAsync(Guid patientId, CancellationToken ct = default)
        => Task.FromResult(store.Photos.Where(x => x.PatientId == patientId && x.DeletedAt == null).OrderByDescending(x => x.CapturedAt).ToList());

    public Task<List<PatientPhoto>> ListPhotosBySessionAsync(Guid sessionId, CancellationToken ct = default)
        => Task.FromResult(store.Photos.Where(x => x.SessionId == sessionId && x.DeletedAt == null).OrderBy(x => x.CapturedAt).ToList());

    public Task<PatientPhoto?> GetLatestPortraitAsync(Guid patientId, CancellationToken ct = default)
        => Task.FromResult(store.Photos
            .Where(x => x.PatientId == patientId && x.Kind == UserPhotoKind.Portrait && x.DeletedAt == null)
            .OrderByDescending(x => x.CapturedAt)
            .FirstOrDefault());

    public Task<PatientPhoto?> GetPhotoAsync(Guid photoId, CancellationToken ct = default)
        => Task.FromResult(store.Photos.FirstOrDefault(x => x.Id == photoId));

    public Task<List<IntakeDocumentFile>> ListDocumentFilesByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default)
    {
        var list = store.DocumentFiles.Where(x => ids.Contains(x.Id)).ToList();
        foreach (var f in list)
        {
            f.Group = store.DocumentGroups.First(g => g.Id == f.GroupId);
            var patient = store.Patients.FirstOrDefault(p => p.Id == f.Group.PatientId);
            if (patient is not null)
            {
                patient.Person = store.Persons.First(p => p.Id == patient.PersonId);
                f.Group.Patient = patient;
            }
        }
        return Task.FromResult(list);
    }

    public Task<List<PatientPhoto>> ListPhotosByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default)
    {
        var list = store.Photos.Where(x => ids.Contains(x.Id)).ToList();
        foreach (var ph in list)
        {
            var patient = store.Patients.FirstOrDefault(p => p.Id == ph.PatientId);
            if (patient is not null)
            {
                patient.Person = store.Persons.First(p => p.Id == patient.PersonId);
                ph.Patient = patient;
            }
        }
        return Task.FromResult(list);
    }

    public Task<List<IntakeDocumentFile>> ListVaultDocumentFilesAsync(bool trashOnly, int take, CancellationToken ct = default)
    {
        var q = store.DocumentFiles.AsEnumerable();
        q = trashOnly ? q.Where(x => x.DeletedAt != null) : q.Where(x => x.DeletedAt == null);
        var list = q.OrderByDescending(x => x.CreatedAt).Take(take).ToList();
        foreach (var f in list)
        {
            f.Group = store.DocumentGroups.First(g => g.Id == f.GroupId);
            var patient = store.Patients.FirstOrDefault(p => p.Id == f.Group.PatientId);
            if (patient is not null)
            {
                patient.Person = store.Persons.First(p => p.Id == patient.PersonId);
                f.Group.Patient = patient;
            }
        }
        return Task.FromResult(list);
    }

    public Task<List<PatientPhoto>> ListVaultPhotosAsync(bool trashOnly, int take, CancellationToken ct = default)
    {
        var q = store.Photos.AsEnumerable();
        q = trashOnly ? q.Where(x => x.DeletedAt != null) : q.Where(x => x.DeletedAt == null);
        var list = q.OrderByDescending(x => x.CapturedAt).Take(take).ToList();
        foreach (var ph in list)
        {
            var patient = store.Patients.FirstOrDefault(p => p.Id == ph.PatientId);
            if (patient is not null)
            {
                patient.Person = store.Persons.First(p => p.Id == patient.PersonId);
                ph.Patient = patient;
            }
        }
        return Task.FromResult(list);
    }

    public Task<PatientPhoto?> FindPhotoByStorageKeyAsync(string storageKey, CancellationToken ct = default)
        => Task.FromResult(store.Photos.FirstOrDefault(x => x.StorageKey == storageKey));

    public Task<IntakeDocumentFile?> FindDocumentFileByStorageKeyAsync(string storageKey, CancellationToken ct = default)
        => Task.FromResult(store.DocumentFiles.FirstOrDefault(x => x.StorageKey == storageKey));
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

public sealed class FakePatientProfileRevisionRepository(InMemoryStore store) : IPatientProfileRevisionRepository
{
    public Task AddRangeAsync(IEnumerable<PatientProfileRevision> items, CancellationToken ct = default)
    {
        store.ProfileRevisions.AddRange(items);
        return Task.CompletedTask;
    }

    public Task<List<PatientProfileRevision>> ListByPatientAsync(Guid patientId, int take, CancellationToken ct = default)
        => Task.FromResult(store.ProfileRevisions.Where(x => x.PatientId == patientId)
            .OrderByDescending(x => x.At).Take(take).ToList());
}