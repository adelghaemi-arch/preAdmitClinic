/*
 File: backend/tests/Nabz.Infrastructure.Tests/Fakes/FakeAppDataSeeder.cs
 Description: seed حداقلی ادمین کل برای تست ریست فکتوری
 Parent Dependencies: IAppDataSeeder, InMemoryStore, PlatformAdminIdentity
 */

using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Tests.Fakes;

public sealed class FakeAppDataSeeder(InMemoryStore store) : IAppDataSeeder
{
    public const string PlatformAdminMobile = PlatformAdminIdentity.Mobile;
    public int SeedCallCount { get; private set; }

    public Task SeedAsync(CancellationToken ct = default)
    {
        SeedCallCount++;
        if (store.Clinics.Count == 0)
        {
            store.Clinics.Add(new Clinic
            {
                Name = "مرکز نمونه نفس",
                IsCurrentTenant = true,
                Status = ClinicStatus.Active
            });
        }

        if (store.PlatformSettings.Count == 0)
            store.PlatformSettings.Add(new PlatformSettings());

        // فقط Person بدون NID روی موبایل قفل — هم‌تراز AppDataSeeder.EnsurePlatformAdminAsync
        var adminPerson = store.Persons.FirstOrDefault(p =>
            p.Mobile == PlatformAdminMobile && string.IsNullOrWhiteSpace(p.NationalId));
        if (adminPerson is null)
        {
            adminPerson = new Person
            {
                Mobile = PlatformAdminMobile,
                FirstName = "ادمین",
                LastName = "کل"
            };
            store.Persons.Add(adminPerson);
        }

        var plat = store.Users.FirstOrDefault(u => u.PersonId == adminPerson.Id);
        if (plat is null)
        {
            plat = new User
            {
                PersonId = adminPerson.Id,
                Person = adminPerson,
                IsActive = true
            };
            store.Users.Add(plat);
        }
        else if (!plat.IsActive)
        {
            plat.IsActive = true;
        }

        // نقش Platform اشتباه روی همان موبایل را جدا کن
        var wrongRoles = store.Roles
            .Where(r => r.Role == AppRole.Platform && r.UserId != plat.Id)
            .Where(r =>
            {
                var u = store.Users.FirstOrDefault(x => x.Id == r.UserId);
                if (u is null) return false;
                var p = store.Persons.FirstOrDefault(x => x.Id == u.PersonId);
                return p?.Mobile == PlatformAdminMobile;
            })
            .ToList();
        foreach (var wrong in wrongRoles)
            store.Roles.Remove(wrong);

        if (!store.Roles.Any(r => r.UserId == plat.Id && r.Role == AppRole.Platform))
            store.Roles.Add(new UserRoleAssignment { UserId = plat.Id, Role = AppRole.Platform });

        foreach (var patient in store.Patients.Where(p => p.PersonId == adminPerson.Id).ToList())
            store.Patients.Remove(patient);

        return Task.CompletedTask;
    }
}
