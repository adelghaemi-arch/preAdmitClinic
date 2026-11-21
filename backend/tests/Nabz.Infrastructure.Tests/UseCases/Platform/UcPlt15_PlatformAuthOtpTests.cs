/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt15_PlatformAuthOtpTests.cs
 Description: UC-PLT-15 — ورود ادمین کل؛ FixedOtp پایه رد؛ پایه+۱ قبول؛ اولویت روی Patient هم‌شماره
 Parent Dependencies: AuthServiceFactory, PlatformAdminIdentity
 */

using Nabz.Application.Identity;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Platform;

[Trait("UC", "UC-PLT-15")]
public sealed class UcPlt15_PlatformAuthOtpTests
{
    private const string FixedOtp = "12345";
    private static readonly string PlatformCode = PlatformAdminIdentity.IncrementFixedOtp(FixedOtp);

    [Fact]
    public async Task UC_PLT_15_HappyPath_FixedOtpPlusOne_YieldsPlatformRole()
    {
        var factory = new AuthServiceFactory();
        SeedPlatformStaff(factory);
        var auth = factory.Create(FixedOtp);

        var request = await auth.RequestOtpAsync(PlatformAdminIdentity.Mobile);
        Assert.True(request.Ok);
        Assert.Equal(FixedOtp, request.DemoCode);

        var verify = await auth.VerifyOtpAsync(PlatformAdminIdentity.Mobile, PlatformCode, "web", "clinic_web");
        Assert.True(verify.Ok);
        Assert.False(verify.NeedsSelection);
        Assert.Contains(AppRole.Platform, verify.Roles!);
        Assert.Empty(factory.Sms.SentCalls);
    }

    [Fact]
    public async Task UC_PLT_15_Na_PlainFixedOtp_Rejected()
    {
        var factory = new AuthServiceFactory();
        SeedPlatformStaff(factory);
        var auth = factory.Create(FixedOtp);

        Assert.True((await auth.RequestOtpAsync(PlatformAdminIdentity.Mobile)).Ok);
        var verify = await auth.VerifyOtpAsync(PlatformAdminIdentity.Mobile, FixedOtp, "web", "clinic_web");
        Assert.False(verify.Ok);
        Assert.Contains("نامعتبر", verify.Error);
    }

    [Fact]
    public async Task UC_PLT_15_PlatformTakesPrecedence_WhenPatientSharesMobile()
    {
        var factory = new AuthServiceFactory();
        var clinicId = Guid.NewGuid();
        factory.Store.Clinics.Add(new Clinic
        {
            Id = clinicId,
            Name = "کلینیک تست",
            IsCurrentTenant = true,
            Status = ClinicStatus.Active
        });
        SeedPlatformStaff(factory);
        // بیمار روی همان موبایل قفل — نباید کاندیدای Owner بسازد
        var patientPerson = TestIdentityHelper.AddPerson(
            factory.Store, PlatformAdminIdentity.Mobile, "بیمار", "قاطی", "0099887766");
        TestIdentityHelper.AddPatient(factory.Store, clinicId, patientPerson);

        var auth = factory.Create(FixedOtp);
        Assert.True((await auth.RequestOtpAsync(PlatformAdminIdentity.Mobile)).Ok);
        var verify = await auth.VerifyOtpAsync(PlatformAdminIdentity.Mobile, PlatformCode, "web", "clinic_web");
        Assert.True(verify.Ok);
        Assert.False(verify.NeedsSelection);
        Assert.Contains(AppRole.Platform, verify.Roles!);
        Assert.DoesNotContain(AppRole.Owner, verify.Roles!);
    }

    private static void SeedPlatformStaff(AuthServiceFactory factory)
    {
        var user = TestIdentityHelper.AddUser(
            factory.Store, PlatformAdminIdentity.Mobile, "ادمین", "کل", nationalId: null);
        factory.Store.Roles.Add(new UserRoleAssignment { UserId = user.Id, Role = AppRole.Platform });
    }
}
