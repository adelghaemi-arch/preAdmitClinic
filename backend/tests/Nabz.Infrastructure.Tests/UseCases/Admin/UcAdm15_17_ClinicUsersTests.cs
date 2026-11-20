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
        var admin = TestIdentityHelper.AddUser(h.Store, "09130001111", "ادمین", "کلینیک");
        var platformUser = TestIdentityHelper.AddUser(h.Store, "09133752696", "ادمین", "کل");
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
            userAdmin.UpsertUserAsync(false, null, "کاربر", "کاربر", "09130002222", null, AppRole.Platform, null, null, "admin"));
    }

    [Fact]
    [Trait("UC", "UC-ADM-16")]
    public async Task UC_ADM_16_Ny_EditPlatformUser_NotFoundForClinicAdmin()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var platformUser = TestIdentityHelper.AddUser(h.Store, "09133752696", "ادمین", "کل");
        h.Store.Roles.Add(new UserRoleAssignment { UserId = platformUser.Id, Role = AppRole.Platform });
        var userAdmin = h.CreateUserAdminService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            userAdmin.UpsertUserAsync(false, platformUser.Id, "x", "y", platformUser.Person.Mobile, null, AppRole.Owner, null, null, "admin"));
    }

    [Fact]
    [Trait("UC", "UC-ADM-17")]
    public async Task UC_ADM_17_Nx_SetActivePlatformHidden_Throws()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var platformUser = TestIdentityHelper.AddUser(h.Store, "09133752696", "ادمین", "کل");
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
            false, null, "دکتر", "کاربر", "09130003333", null, AppRole.Specialist, clinicId, null, "admin");

        Assert.Contains("Specialist", dto.Roles);
        Assert.Empty(dto.Contracts);
    }

    [Fact]
    [Trait("UC", "UC-ADM-16")]
    public async Task UC_ADM_16_CreateWithExistingNationalId_Merges()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var existing = TestIdentityHelper.AddUser(h.Store, "09130004444", "مریم", "قدیم", "0012345679");
        h.Store.Roles.Add(new UserRoleAssignment { UserId = existing.Id, Role = AppRole.Owner, ClinicId = clinicId });
        var userAdmin = h.CreateUserAdminService();

        var dto = await userAdmin.UpsertUserAsync(
            false, null, "مریم‌السادات", "تابش", "09130004444", "0012345679", AppRole.Owner, clinicId, null, "admin");

        Assert.Equal(existing.Id, dto.Id);
        Assert.Equal("مریم‌السادات", dto.FirstName);
        Assert.Single(h.Store.Persons, p => p.NationalId == "0012345679");
    }

    [Fact]
    [Trait("UC", "UC-ADM-16")]
    public async Task UC_ADM_16_UpdateToAnotherUsersNationalId_Throws()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var a = TestIdentityHelper.AddUser(h.Store, "09130005555", "علی‌رضا", "یک", "0012345679");
        var b = TestIdentityHelper.AddUser(h.Store, "09130006666", "بهرام", "دو", null);
        h.Store.Roles.Add(new UserRoleAssignment { UserId = a.Id, Role = AppRole.Owner });
        h.Store.Roles.Add(new UserRoleAssignment { UserId = b.Id, Role = AppRole.Owner });
        var userAdmin = h.CreateUserAdminService();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            userAdmin.UpsertUserAsync(false, b.Id, "بهرام", "دو", b.Person.Mobile, "0012345679", AppRole.Owner, null, null, "admin"));
        Assert.Contains("کد ملی", ex.Message);
    }

    [Fact]
    [Trait("UC", "UC-ADM-15")]
    public async Task UC_ADM_15_ListIncludesMemberContracts()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var owner = TestIdentityHelper.AddUser(h.Store, "09130007777", "مریم‌السادات", "تابش", "0012345679");
        h.Store.Roles.Add(new UserRoleAssignment { UserId = owner.Id, Role = AppRole.Owner, ClinicId = clinicId });
        var contract = new CorporateContract
        {
            ClinicId = clinicId,
            Code = "C-1",
            Title = "قرارداد نمونه",
            OrganizationName = "سازمان",
            Status = ContractStatus.Active
        };
        h.Store.Contracts.Add(contract);
        TestIdentityHelper.AddMember(h.Store, contract.Id, owner.Person);
        var userAdmin = h.CreateUserAdminService();

        var list = await userAdmin.ListUsersAsync(actorIsPlatformAdmin: false);

        var row = Assert.Single(list, u => u.Id == owner.Id);
        var link = Assert.Single(row.Contracts);
        Assert.Equal(contract.Id, link.ContractId);
        Assert.Equal("قرارداد نمونه", link.Title);
        Assert.Equal("member", link.Relation);
        Assert.Equal("Active", link.Status);
    }

    [Fact]
    [Trait("UC", "UC-ADM-16")]
    public async Task UC_ADM_16_CreateWithNid_MergesLegacyStaffWithoutNid()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var legacy = TestIdentityHelper.AddUser(h.Store, "09130008888", "کاربر", "قدیم", null);
        h.Store.Roles.Add(new UserRoleAssignment { UserId = legacy.Id, Role = AppRole.Specialist, ClinicId = clinicId });
        var userAdmin = h.CreateUserAdminService();

        var dto = await userAdmin.UpsertUserAsync(
            false, null, "کاربر", "تازه‌نیاد", "09130008888", "0012345679", AppRole.Specialist, clinicId, null, "admin");

        Assert.Equal(legacy.Id, dto.Id);
        Assert.Equal("0012345679", dto.NationalId);
        Assert.Single(h.Store.Users);
    }

    [Fact]
    [Trait("UC", "UC-ADM-15")]
    public async Task UC_ADM_15_DraftContract_HiddenUnlessIncludeInactive()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var owner = TestIdentityHelper.AddUser(h.Store, "09130009999", "سارا", "آزمایشی", "0012345679");
        h.Store.Roles.Add(new UserRoleAssignment { UserId = owner.Id, Role = AppRole.Owner, ClinicId = clinicId });
        var draft = new CorporateContract
        {
            ClinicId = clinicId,
            Code = "C-DRAFT",
            Title = "پیش‌نویس",
            OrganizationName = "سازمان",
            Status = ContractStatus.Draft
        };
        h.Store.Contracts.Add(draft);
        TestIdentityHelper.AddMember(h.Store, draft.Id, owner.Person);
        var userAdmin = h.CreateUserAdminService();

        var hidden = await userAdmin.ListUsersAsync(actorIsPlatformAdmin: false, includeInactiveContracts: false);
        Assert.Empty(Assert.Single(hidden, u => u.Id == owner.Id).Contracts);

        var shown = await userAdmin.ListUsersAsync(actorIsPlatformAdmin: false, includeInactiveContracts: true);
        var link = Assert.Single(Assert.Single(shown, u => u.Id == owner.Id).Contracts);
        Assert.Equal("Draft", link.Status);
        Assert.Equal("پیش‌نویس", link.Title);
    }
}