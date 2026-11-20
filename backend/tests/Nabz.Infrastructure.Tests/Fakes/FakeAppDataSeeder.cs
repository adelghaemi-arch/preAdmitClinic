/*
 File: backend/tests/Nabz.Infrastructure.Tests/Fakes/FakeAppDataSeeder.cs
 Description: seed حداقلی ادمین کل برای تست ریست فکتوری
 Parent Dependencies: IAppDataSeeder, InMemoryStore
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Tests.Fakes;

public sealed class FakeAppDataSeeder(InMemoryStore store) : IAppDataSeeder
{
    public const string PlatformAdminMobile = "09133752696";
    public int SeedCallCount { get; private set; }

    public Task SeedAsync(CancellationToken ct = default)
    {
        SeedCallCount++;
        if (store.Clinics.Count == 0)
        {
            store.Clinics.Add(new Clinic
            {
                Name = "کلینیک نمونه نبض",
                IsCurrentTenant = true,
                Status = ClinicStatus.Active
            });
        }

        if (store.PlatformSettings.Count == 0)
            store.PlatformSettings.Add(new PlatformSettings());

        var adminPerson = store.Persons.FirstOrDefault(p => p.Mobile == PlatformAdminMobile);
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

        if (!store.Users.Any(u => u.PersonId == adminPerson.Id))
        {
            var plat = new User
            {
                PersonId = adminPerson.Id,
                Person = adminPerson,
                IsActive = true
            };
            store.Users.Add(plat);
            store.Roles.Add(new UserRoleAssignment { UserId = plat.Id, Role = AppRole.Platform });
        }

        return Task.CompletedTask;
    }
}
