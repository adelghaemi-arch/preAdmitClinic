/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn01_AuthOtpTests.cs
 Description: UC-OWN-01 — OTP با FixedOtp و بیمار موجود
 Parent Dependencies: AuthServiceFactory
 */

using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Owner;

[Trait("UC", "UC-OWN-01")]
public sealed class UcOwn01_AuthOtpTests
{
    private const string FixedOtp = "12345";
    private const string KnownMobile = "09133751001";

    [Fact]
    public async Task UC_OWN_01_HappyPath_RequestAndVerify_WhenPatientExistsByPhone()
    {
        var factory = new AuthServiceFactory();
        var clinicId = SeedClinicAndPatient(factory, KnownMobile);
        var auth = factory.Create(FixedOtp);

        var request = await auth.RequestOtpAsync(KnownMobile);
        Assert.True(request.Ok);
        Assert.Equal(FixedOtp, request.DemoCode);
        Assert.Null(request.Error);
        Assert.Empty(factory.Sms.SentCalls);

        var verify = await auth.VerifyOtpAsync(KnownMobile, FixedOtp, "test-device", "clinic_web");
        Assert.True(verify.Ok);
        Assert.False(verify.NeedsSelection);
        Assert.NotNull(verify.UserId);
        Assert.NotNull(verify.SessionId);
        Assert.False(string.IsNullOrWhiteSpace(verify.Token));
        Assert.Contains(AppRole.Owner, verify.Roles!);
        Assert.Null(verify.Error);

        var patient = factory.Store.Patients.First(p => p.ClinicId == clinicId);
        Assert.Equal(verify.UserId, patient.OwnerUserId);
        Assert.Empty(factory.Sms.SentCalls);
    }

    [Fact]
    public async Task UC_OWN_01_SharedMobile_NeedsSelection_ThenSelectByNationalId()
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
        TestIdentityHelper.AddPatient(factory.Store, clinicId,
            TestIdentityHelper.AddPerson(factory.Store, KnownMobile, "یکی", "اول", "0011111111"));
        TestIdentityHelper.AddPatient(factory.Store, clinicId,
            TestIdentityHelper.AddPerson(factory.Store, KnownMobile, "دومی", "دوم", "0022222222"));
        var auth = factory.Create(FixedOtp);

        Assert.True((await auth.RequestOtpAsync(KnownMobile)).Ok);
        var verify = await auth.VerifyOtpAsync(KnownMobile, FixedOtp, "web", "clinic_web");
        Assert.True(verify.Ok);
        Assert.True(verify.NeedsSelection);
        Assert.NotNull(verify.Token);
        Assert.Equal(2, verify.Candidates!.Count);
        Assert.Null(verify.Roles);

        var session = factory.Store.Sessions.Single();
        Assert.True(session.PendingSelection);

        var select = await auth.SelectIdentityAsync(session.Id, "0022222222");
        Assert.True(select.Ok);
        Assert.False(select.NeedsSelection);
        Assert.Contains(AppRole.Owner, select.Roles!);
        Assert.False(session.PendingSelection);
        Assert.Equal(select.UserId, session.UserId);

        factory.Store.SyncNavigation();
        var linked = factory.Store.Patients.First(p => p.Person.NationalId == "0022222222");
        Assert.Equal(select.UserId, linked.OwnerUserId);
    }

    [Fact]
    public async Task UC_OWN_01_UnknownMobile_Fails_WithoutSms()
    {
        var factory = new AuthServiceFactory();
        SeedClinicAndPatient(factory, KnownMobile);
        var auth = factory.Create(FixedOtp);

        var request = await auth.RequestOtpAsync("09999999999");

        Assert.False(request.Ok);
        Assert.Null(request.DemoCode);
        Assert.Equal("شماره در سیستم ثبت نشده است.", request.Error);
        Assert.Empty(factory.Store.Otps);
        Assert.Empty(factory.Sms.SentCalls);
    }

    [Fact]
    public async Task UC_OWN_01_ContractMemberOnly_RequestAndVerify_SoftAdmits()
    {
        var factory = new AuthServiceFactory();
        const string memberPhone = "09121112233";
        var clinicId = Guid.NewGuid();
        factory.Store.Clinics.Add(new Clinic
        {
            Id = clinicId,
            Name = "بیمارستان عدل",
            IsCurrentTenant = true,
            Status = ClinicStatus.Active
        });
        var contractId = Guid.NewGuid();
        factory.Store.Contracts.Add(new CorporateContract
        {
            Id = contractId,
            ClinicId = clinicId,
            Code = "C-1",
            Title = "قرارداد تست",
            OrganizationName = "سازمان",
            Status = ContractStatus.Active
        });
        var person = TestIdentityHelper.AddPerson(
            factory.Store, memberPhone, "عضو", "جدید", "0011223340", new DateOnly(1990, 1, 1), "مرد");
        TestIdentityHelper.AddMember(factory.Store, contractId, person);
        factory.Store.SyncNavigation();
        var auth = factory.Create(FixedOtp);

        var request = await auth.RequestOtpAsync(memberPhone);
        Assert.True(request.Ok);
        Assert.Equal(FixedOtp, request.DemoCode);

        var verify = await auth.VerifyOtpAsync(memberPhone, FixedOtp, "web", "clinic_web");
        Assert.True(verify.Ok);
        Assert.False(verify.NeedsSelection);
        Assert.Contains(AppRole.Owner, verify.Roles!);
        Assert.NotEmpty(factory.Store.Patients);
        Assert.Equal(verify.UserId, factory.Store.Patients[0].OwnerUserId);
        Assert.NotNull(factory.Store.Members[0].LinkedPatientId);
        Assert.Equal(OnboardingStage.LoggedIn, factory.Store.Members[0].OnboardingStage);
    }

    [Fact]
    public async Task UC_OWN_01_InvalidMobileFormat_Fails()
    {
        var factory = new AuthServiceFactory();
        SeedClinicAndPatient(factory, KnownMobile);
        var auth = factory.Create(FixedOtp);

        var request = await auth.RequestOtpAsync("00000");

        Assert.False(request.Ok);
        Assert.Equal("شماره موبایل نامعتبر است.", request.Error);
        Assert.Empty(factory.Store.Otps);
    }

    [Theory]
    [InlineData("00000")]
    [InlineData("99999")]
    [InlineData("54321")]
    [InlineData("11111")]
    public async Task UC_OWN_01_WrongCode_FailsVerification(string wrongCode)
    {
        var factory = new AuthServiceFactory();
        SeedClinicAndPatient(factory, KnownMobile);
        var auth = factory.Create(FixedOtp);

        var request = await auth.RequestOtpAsync(KnownMobile);
        Assert.True(request.Ok);
        Assert.Empty(factory.Sms.SentCalls);

        var verify = await auth.VerifyOtpAsync(KnownMobile, wrongCode, null, null);

        Assert.False(verify.Ok);
        Assert.Null(verify.UserId);
        Assert.Equal("کد نامعتبر یا منقضی است.", verify.Error);
        Assert.Empty(factory.Store.Sessions);
        Assert.Empty(factory.Sms.SentCalls);
    }

    [Fact]
    public async Task UC_OWN_01_FixedOtpPath_NeverInvokesSmsSender()
    {
        var factory = new AuthServiceFactory { };
        factory.Sms.ThrowOnSend = true;
        SeedClinicAndPatient(factory, KnownMobile);
        var auth = factory.Create(FixedOtp);

        await auth.RequestOtpAsync(KnownMobile);
        await auth.VerifyOtpAsync(KnownMobile, FixedOtp, "web", "clinic_web");

        Assert.Empty(factory.Sms.SentCalls);
    }

    private static Guid SeedClinicAndPatient(AuthServiceFactory factory, string patientPhone)
    {
        var clinicId = Guid.NewGuid();
        factory.Store.Clinics.Add(new Clinic
        {
            Id = clinicId,
            Name = "کلینیک تست",
            IsCurrentTenant = true,
            Status = ClinicStatus.Active
        });
        var person = TestIdentityHelper.AddPerson(factory.Store, patientPhone, "بیمار", "تست", "0012345679");
        TestIdentityHelper.AddPatient(factory.Store, clinicId, person);
        factory.Store.SyncNavigation();
        return clinicId;
    }
}