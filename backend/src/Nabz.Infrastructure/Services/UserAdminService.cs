/*
 File: backend/src/Nabz.Infrastructure/Services/UserAdminService.cs
 Description: upsert با کلید کدملی روی Person؛ enrichment قراردادها و LinkedPatientId برای شواهد
 Parent Dependencies: IUserRepository, IPersonRepository, IPatientRepository, IContractRepository, IClinicRepository, IPlatformRepository, IUnitOfWork
 */

using Nabz.Application.Abstractions;
using Nabz.Application.Common;
using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Services;

public sealed class UserAdminService(
    IUserRepository users,
    IPersonRepository persons,
    IPatientRepository patients,
    IContractRepository contracts,
    IClinicRepository clinics,
    IPlatformRepository platform,
    IUnitOfWork uow) : IUserAdminService
{
    private static readonly AppRole[] AllRoles = Enum.GetValues<AppRole>();
    private static readonly AppRole[] ClinicAssignableRoles =
        AllRoles.Where(r => r != AppRole.Platform).ToArray();

    public IReadOnlyList<AppRole> ListAssignableRoles(bool actorIsPlatformAdmin)
        => actorIsPlatformAdmin ? AllRoles : ClinicAssignableRoles;

    public async Task<IReadOnlyList<PlatformUserDto>> ListUsersAsync(
        bool actorIsPlatformAdmin,
        bool includeInactiveContracts = false,
        string? q = null,
        CancellationToken ct = default)
    {
        // ادمین کلینیک اصلاً نباید از وجود ادمین‌های کل مطلع شود
        var exclude = actorIsPlatformAdmin ? (AppRole?)null : AppRole.Platform;
        var list = await users.ListUsersAsync(exclude, 500, q, ct);
        var clinicFilter = await ResolveClinicFilterAsync(actorIsPlatformAdmin, ct);
        return await MapManyAsync(list, clinicFilter, includeInactiveContracts, ct);
    }

    public async Task<PagedResultDto<PlatformUserDto>> ListUsersPagedAsync(
        bool actorIsPlatformAdmin,
        int page,
        int pageSize,
        string? q = null,
        bool includeInactiveContracts = false,
        CancellationToken ct = default)
    {
        var exclude = actorIsPlatformAdmin ? (AppRole?)null : AppRole.Platform;
        var p = Paging.ClampPage(page);
        var size = Paging.ClampPageSize(pageSize);
        var (list, total) = await users.ListUsersPagedAsync(exclude, (p - 1) * size, size, q, ct);
        var clinicFilter = await ResolveClinicFilterAsync(actorIsPlatformAdmin, ct);
        var mapped = await MapManyAsync(list, clinicFilter, includeInactiveContracts, ct);
        return new PagedResultDto<PlatformUserDto>(mapped, p, size, total);
    }

    public async Task<PlatformUserDto> UpsertUserAsync(
        bool actorIsPlatformAdmin,
        Guid? userId,
        string firstName,
        string lastName,
        string mobile,
        string? nationalId,
        AppRole primaryRole,
        Guid? clinicId,
        Guid? contractId,
        string actor,
        CancellationToken ct = default)
    {
        EnsureAssignable(actorIsPlatformAdmin, primaryRole);
        var first = firstName.Trim();
        var last = lastName.Trim();
        if (first.Length < 2) throw new InvalidOperationException("نام الزامی است.");
        if (last.Length < 1) throw new InvalidOperationException("نام‌خانوادگی الزامی است.");

        // ناظر بدون قرارداد در لیست «بدون قرارداد» می‌ماند ولی نقش می‌گیرد — ممنوع
        if (primaryRole == AppRole.Supervisor && contractId is null)
            throw new InvalidOperationException("برای نقش ناظر انتخاب قرارداد الزامی است.");

        var phone = IranMobile.Normalize(mobile);
        if (!IranMobile.IsValid(phone))
            throw new InvalidOperationException("شماره موبایل معتبر نیست.");

        string? nid = null;
        if (!string.IsNullOrWhiteSpace(nationalId))
        {
            nid = IranNationalId.Normalize(nationalId);
            // فقط وقتی ادمین کدملی می‌فرستد باید checksum درست باشد
            if (!IranNationalId.IsValid(nid))
                throw new InvalidOperationException("کد ملی نامعتبر است.");
        }

        User user;
        if (userId is Guid id)
        {
            user = await users.GetByIdAsync(id, ct)
                ?? throw new InvalidOperationException("کاربر یافت نشد.");
            EnsureTargetVisible(actorIsPlatformAdmin, user);

            if (nid is not null)
            {
                var ownerOfNid = await users.GetByNationalIdAsync(nid, ct);
                if (ownerOfNid is not null && ownerOfNid.Id != user.Id)
                    throw new InvalidOperationException("این کد ملی قبلاً ثبت شده است.");
            }

            ApplyIdentityToPerson(user.Person, first, last, phone, nid);
            user.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            // کلید هویت: کدملی روی Person؛ موبایل تکراری دیگر merge اجباری نیست
            User? existing = null;
            if (!string.IsNullOrWhiteSpace(nid))
                existing = await users.GetByNationalIdAsync(nid, ct);
            if (existing is null)
            {
                var byMobile = await users.ListByMobileAsync(phone, ct);
                // یک ردیف staff قدیمی بدون NID → غنی‌سازی حتی وقتی ادمین حالا NID می‌دهد
                if (byMobile.Count == 1 && string.IsNullOrWhiteSpace(byMobile[0].Person.NationalId))
                    existing = byMobile[0];
            }

            if (existing is not null)
            {
                EnsureTargetVisible(actorIsPlatformAdmin, existing);
                user = existing;
                ApplyIdentityToPerson(user.Person, first, last, phone, nid, allowMobileSync: true);
                user.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var person = await ResolvePersonForNewUserAsync(first, last, phone, nid, ct);
                var linked = await users.GetByPersonIdAsync(person.Id, ct);
                if (linked is not null)
                    throw new InvalidOperationException("برای این هویت قبلاً حساب ورود ساخته شده است.");

                user = new User
                {
                    PersonId = person.Id,
                    Person = person,
                    IsActive = true
                };
                await users.AddAsync(user, ct);
            }
        }

        if (!user.Roles.Any(r => r.Role == primaryRole && r.ContractId == contractId))
        {
            users.AddRole(new UserRoleAssignment
            {
                UserId = user.Id,
                Role = primaryRole,
                ClinicId = clinicId,
                ContractId = contractId
            });
        }

        await platform.AddAuditAsync(new PlatformAuditEntry
        {
            Actor = actor,
            Action = actorIsPlatformAdmin ? "PLATFORM_UPSERT_USER" : "ADMIN_UPSERT_USER",
            Target = user.Id.ToString(),
            Detail = primaryRole.ToString()
        }, ct);
        await uow.SaveChangesAsync(ct);

        // نقش‌ها ممکن است تازه اضافه شده باشند؛ upsert همیشه غیرفعال‌ها را هم نشان می‌دهد
        user = await users.GetByIdAsync(user.Id, ct) ?? user;
        var clinicFilter = await ResolveClinicFilterAsync(actorIsPlatformAdmin, ct);
        var mapped = await MapManyAsync([user], clinicFilter, includeInactiveContracts: true, ct);
        return mapped[0];
    }

    public async Task SetUserActiveAsync(bool actorIsPlatformAdmin, Guid userId, bool isActive, string actor, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct)
            ?? throw new InvalidOperationException("کاربر یافت نشد.");
        EnsureTargetVisible(actorIsPlatformAdmin, user);

        user.IsActive = isActive;
        user.UpdatedAt = DateTime.UtcNow;
        await platform.AddAuditAsync(new PlatformAuditEntry
        {
            Actor = actor,
            Action = actorIsPlatformAdmin ? "PLATFORM_SET_USER_ACTIVE" : "ADMIN_SET_USER_ACTIVE",
            Target = userId.ToString(),
            Detail = isActive.ToString()
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    private async Task<Person> ResolvePersonForNewUserAsync(
        string first, string last, string phone, string? nid, CancellationToken ct)
    {
        Person? person = null;
        if (!string.IsNullOrWhiteSpace(nid))
            person = await persons.GetByNationalIdAsync(nid, ct);

        if (person is not null)
        {
            ApplyIdentityToPerson(person, first, last, phone, nid, allowMobileSync: true);
            return person;
        }

        person = new Person
        {
            FirstName = first,
            LastName = last,
            Mobile = phone,
            NationalId = nid
        };
        await persons.AddAsync(person, ct);
        return person;
    }

    private static void ApplyIdentityToPerson(
        Person person,
        string first,
        string last,
        string phone,
        string? nid,
        bool allowMobileSync = false)
    {
        person.FirstName = first;
        person.LastName = last;
        if (!string.IsNullOrWhiteSpace(nid))
            person.NationalId = nid;

        if (!allowMobileSync)
        {
            person.Mobile = phone;
        }
        else
        {
            // روی merge موبایل را فقط اگر خالی بود عوض کن تا OTP چندهویتی نشکند
            if (string.IsNullOrWhiteSpace(person.Mobile))
                person.Mobile = phone;
            else if (!string.Equals(person.Mobile, phone, StringComparison.Ordinal)
                     && !string.IsNullOrWhiteSpace(nid)
                     && string.Equals(person.NationalId, nid, StringComparison.Ordinal))
            {
                // همان هویت کدملی — همگام‌سازی موبایل عمدی ادمین
                person.Mobile = phone;
            }
        }

        person.UpdatedAt = DateTime.UtcNow;
    }

    private async Task<Guid?> ResolveClinicFilterAsync(bool actorIsPlatformAdmin, CancellationToken ct)
    {
        if (actorIsPlatformAdmin) return null;
        var clinic = await clinics.GetCurrentAsync(ct)
            ?? throw new InvalidOperationException("کلینیک جاری یافت نشد.");
        return clinic.Id;
    }

    private async Task<IReadOnlyList<PlatformUserDto>> MapManyAsync(
        IReadOnlyList<User> list, Guid? clinicFilter, bool includeInactiveContracts, CancellationToken ct)
    {
        var nids = list
            .Select(u => u.Person.NationalId)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Cast<string>()
            .Distinct()
            .ToList();

        var memberLinks = await contracts.ListMembershipSummariesByNationalIdsAsync(
            nids, clinicFilter, includeInactiveContracts, ct);
        var membersByNid = memberLinks
            .GroupBy(m => m.NationalId, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.Ordinal);

        var supervisorContractIds = list
            .SelectMany(u => u.Roles)
            .Where(r => r.Role == AppRole.Supervisor && r.ContractId is Guid)
            .Select(r => r.ContractId!.Value)
            .Distinct()
            .ToList();
        var titles = await contracts.ListContractTitlesByIdsAsync(
            supervisorContractIds, clinicFilter, includeInactiveContracts, ct);
        var titleById = titles.ToDictionary(t => t.ContractId, t => t);

        var ownerIds = list.Select(u => u.Id).ToList();
        var patientByOwner = await patients.MapPatientIdsByOwnerUserIdsAsync(ownerIds, ct);

        return list.Select(u => MapOne(u, membersByNid, titleById, patientByOwner)).ToList();
    }

    private static PlatformUserDto MapOne(
        User user,
        Dictionary<string, List<ContractMembershipLink>> membersByNid,
        Dictionary<Guid, ContractTitleLink> titleById,
        IReadOnlyDictionary<Guid, Guid> patientByOwner)
    {
        var p = user.Person;
        var contracts = new List<UserContractSummaryDto>();
        if (!string.IsNullOrWhiteSpace(p.NationalId)
            && membersByNid.TryGetValue(p.NationalId, out var members))
        {
            foreach (var m in members)
                contracts.Add(new UserContractSummaryDto(m.ContractId, m.Title, "member", m.Status));
        }

        foreach (var role in user.Roles.Where(r => r.Role == AppRole.Supervisor && r.ContractId is Guid))
        {
            var cid = role.ContractId!.Value;
            if (!titleById.TryGetValue(cid, out var title)) continue;
            contracts.Add(new UserContractSummaryDto(cid, title.Title, "supervisor", title.Status));
        }

        patientByOwner.TryGetValue(user.Id, out var linkedPatientId);
        return new PlatformUserDto(
            user.Id,
            p.FirstName,
            p.LastName,
            PersonName.Display(p.FirstName, p.LastName),
            p.Mobile,
            p.NationalId,
            user.IsActive,
            user.Roles.Select(r => r.Role.ToString()).Distinct().ToList(),
            contracts,
            linkedPatientId == Guid.Empty ? null : linkedPatientId);
    }

    private static void EnsureAssignable(bool actorIsPlatformAdmin, AppRole role)
    {
        // ادمین کلینیک هرگز نباید نقش Platform را حتی با درخواست جعلی کلاینت منصوب کند
        if (!actorIsPlatformAdmin && role == AppRole.Platform)
            throw new UnauthorizedAccessException("انتصاب این نقش مجاز نیست.");
    }

    private static void EnsureTargetVisible(bool actorIsPlatformAdmin, User user)
    {
        if (actorIsPlatformAdmin) return;
        if (user.Roles.Any(r => r.Role == AppRole.Platform))
            throw new InvalidOperationException("کاربر یافت نشد.");
    }
}