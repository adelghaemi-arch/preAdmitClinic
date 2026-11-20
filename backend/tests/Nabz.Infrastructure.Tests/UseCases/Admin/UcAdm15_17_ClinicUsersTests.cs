/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm15_17_ClinicUsersTests.cs
 Description: UC-ADM-15 تا 17 — کاربران کلینیک و مخفی‌سازی Platform
 Parent Dependencies: ServiceHarness
 */

using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm15_17_ClinicUsersTests
{
    [Fact]
    [Trait("UC", "UC-ADM-15")]
    public async Task UC_ADM_15_HappyPath_ListHidesPlatformUsers()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var admin = new User { Mobile = "09130001111", FullName = "ادمین کلینیک", IsActive = true };
        var platformUser = new User { Mobile = "09133752696", FullName = "ادمین کل", IsActive = true };
        h.Store.Users.AddRange(admin, platformUser);
        h.Store.Roles.Add(new UserRoleAssignment { UserId = admin.Id, Role = AppRole.Admin, ClinicId = clinicId });
        h.Store.Roles.Add(new UserRoleAssignment { UserId = platformUser.Id, Role = AppRole.Platform });
        var userAdmin = h.CreateUserAdminService();

        var list = await userAdmin.ListUsersAsync(actorIsPlatformAdmin: false);

        Assert.Single(list);
        Assert.Equal(admin.Id, list[0].Id);
    }

    [Fact]
    [Trait("UC", "UC-ADM-16")]
    public async Task UC_ADM_16_Nx_ClinicAdminCannotAssignPlatformRole()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var userAdmin = h.CreateUserAdminService();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            userAdmin.UpsertUserAsync(false, null, "کاربر", "09130002222", null, AppRole.Platform, null, null, "admin"));
    }

    [Fact]
    [Trait("UC", "UC-ADM-16")]
    public async Task UC_ADM_16_Ny_EditPlatformUser_NotFoundForClinicAdmin()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var platformUser = new User { Mobile = "09133752696", FullName = "ادمین کل", IsActive = true };
        h.Store.Users.Add(platformUser);
        h.Store.Roles.Add(new UserRoleAssignment { UserId = platformUser.Id, Role = AppRole.Platform });
        var userAdmin = h.CreateUserAdminService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            userAdmin.UpsertUserAsync(false, platformUser.Id, "x", platformUser.Mobile, null, AppRole.Owner, null, null, "admin"));
    }

    [Fact]
    [Trait("UC", "UC-ADM-17")]
    public async Task UC_ADM_17_Nx_SetActivePlatformHidden_Throws()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var platformUser = new User { Mobile = "09133752696", FullName = "ادمین کل", IsActive = true };
        h.Store.Users.Add(platformUser);
        h.Store.Roles.Add(new UserRoleAssignment { UserId = platformUser.Id, Role = AppRole.Platform });
        var userAdmin = h.CreateUserAdminService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            userAdmin.SetUserActiveAsync(false, platformUser.Id, false, "admin"));
    }

    [Fact]
    [Trait("UC", "UC-ADM-16")]
    public async Task UC_ADM_16_HappyPath_UpsertClinicSpecialist()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var userAdmin = h.CreateUserAdminService();

        var dto = await userAdmin.UpsertUserAsync(
            false, null, "دکتر", "09130003333", null, AppRole.Specialist, clinicId, null, "admin");

        Assert.Contains("Specialist", dto.Roles);
    }
}