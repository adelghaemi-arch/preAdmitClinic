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
        Assert.NotNull(verify.UserId);
        Assert.NotNull(verify.SessionId);
        Assert.False(string.IsNullOrWhiteSpace(verify.Token));
        Assert.Contains(AppRole.Owner, verify.Roles!);
        Assert.Null(verify.Error);

        var patient = factory.Store.Patients.First(p => p.ClinicId == clinicId);
        Assert.Equal(verify.UserId, patient.OwnerUserId);
        Assert.Empty(factory.Sms.SentCalls);
    }

    [Theory]
    [InlineData("09999999999")]
    [InlineData("00000")]
    public async Task UC_OWN_01_UnknownMobile_Fails_WithoutSms(string mobile)
    {
        var factory = new AuthServiceFactory();
        SeedClinicAndPatient(factory, KnownMobile);
        var auth = factory.Create(FixedOtp);

        var request = await auth.RequestOtpAsync(mobile);

        Assert.False(request.Ok);
        Assert.Null(request.DemoCode);
        Assert.Equal("شماره در سیستم ثبت نشده است.", request.Error);
        Assert.Empty(factory.Store.Otps);
        Assert.Empty(factory.Sms.SentCalls);
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
        factory.Store.Patients.Add(new Patient
        {
            ClinicId = clinicId,
            Phone = patientPhone,
            FullName = "بیمار تست",
            NationalId = "0012345678"
        });
        return clinicId;
    }
}