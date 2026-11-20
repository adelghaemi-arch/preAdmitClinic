/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt13_FactoryResetTests.cs
 Description: UC-PLT-13 — ریست فکتوری با OTP؛ wipe + seed ادمین کل
 Parent Dependencies: ServiceHarness
 */

using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Fakes;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Platform;

public sealed class UcPlt13_FactoryResetTests
{
    [Fact]
    [Trait("UC", "UC-PLT-13")]
    public async Task UC_PLT_13_Rejects_InvalidOtp()
    {
        var h = new ServiceHarness();
        var actor = TestIdentityHelper.AddUser(h.Store, FakeAppDataSeeder.PlatformAdminMobile, "ادمین", "کل");
        h.Store.Roles.Add(new UserRoleAssignment { UserId = actor.Id, Role = AppRole.Platform });
        var platform = h.CreatePlatformService("12345");

        await platform.RequestFactoryResetOtpAsync(actor.Id);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => platform.ConfirmFactoryResetAsync(actor.Id, "00000"));
        Assert.Contains("نامعتبر", ex.Message);
        Assert.Equal(0, h.DatabaseReset.WipeCallCount);
        Assert.Equal(0, h.Files.ClearAllCallCount);
    }

    [Fact]
    [Trait("UC", "UC-PLT-13")]
    public async Task UC_PLT_13_HappyPath_WipeSeed_And_ClearUploads()
    {
        var h = new ServiceHarness();
        var actor = TestIdentityHelper.AddUser(h.Store, FakeAppDataSeeder.PlatformAdminMobile, "ادمین", "کل");
        h.Store.Roles.Add(new UserRoleAssignment { UserId = actor.Id, Role = AppRole.Platform });
        var tempPerson = TestIdentityHelper.AddPerson(h.Store, "09121110000", "موقت", "پاک‌شو", "0011223344");
        TestIdentityHelper.AddPatient(h.Store, Guid.NewGuid(), tempPerson);
        await using var junk = new MemoryStream(new byte[] { 1, 2, 3 });
        await h.Files.SaveAsync(junk, "x.bin", "application/octet-stream");

        const string fixedOtp = "54321";
        var platform = h.CreatePlatformService(fixedOtp);
        var req = await platform.RequestFactoryResetOtpAsync(actor.Id);
        Assert.True(req.Ok);
        Assert.Equal(fixedOtp, req.DemoCode);

        await platform.ConfirmFactoryResetAsync(actor.Id, fixedOtp);

        Assert.Equal(1, h.DatabaseReset.WipeCallCount);
        Assert.Equal(1, h.Files.ClearAllCallCount);
        Assert.Empty(h.Files.Files);
        Assert.Equal(1, h.Seeder.SeedCallCount);
        h.Store.SyncNavigation();
        Assert.Contains(h.Store.Users, u => u.Person.Mobile == FakeAppDataSeeder.PlatformAdminMobile);
        Assert.Contains(h.Store.Roles, r => r.Role == AppRole.Platform);
        Assert.Empty(h.Store.Patients);
    }
}
