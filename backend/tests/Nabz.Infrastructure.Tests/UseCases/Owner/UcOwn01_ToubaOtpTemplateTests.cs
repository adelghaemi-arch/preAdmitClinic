/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn01_ToubaOtpTemplateTests.cs
 Description: UC-OWN-01 — قالب طوبی OTP بدون {code} رد می‌شود؛ با {code} SMS واقعی می‌رود
 Parent Dependencies: AuthServiceFactory, ToubaOtpTemplateRules
 */

using Nabz.Application.Sms;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Owner;

public sealed class UcOwn01_ToubaOtpTemplateTests
{
    private const string KnownMobile = "09123458910";

    [Fact]
    [Trait("UC", "UC-OWN-01")]
    public async Task RequestOtp_Touba_WithoutCodePlaceholder_Fails_NoSms()
    {
        var factory = new AuthServiceFactory();
        SeedToubaClinic(factory, "کد ورود شما: 11111");
        var auth = factory.Create(fixedOtp: "");

        var result = await auth.RequestOtpAsync(KnownMobile);

        Assert.False(result.Ok);
        Assert.Equal(ToubaOtpTemplateRules.MissingPlaceholderMessage, result.Error);
        Assert.Empty(factory.Sms.PlainCalls);
    }

    [Fact]
    [Trait("UC", "UC-OWN-01")]
    public async Task RequestOtp_Touba_WithCodePlaceholder_SendsPlainContainingCode()
    {
        var factory = new AuthServiceFactory();
        SeedToubaClinic(factory, "کد ورود شما: {code}");
        var auth = factory.Create(fixedOtp: "");

        var result = await auth.RequestOtpAsync(KnownMobile);

        Assert.True(result.Ok);
        Assert.Null(result.DemoCode);
        Assert.Single(factory.Sms.PlainCalls);
        var body = factory.Sms.PlainCalls[0].Content ?? "";
        Assert.Contains("کد ورود شما:", body, StringComparison.Ordinal);
        Assert.DoesNotContain("{code}", body, StringComparison.OrdinalIgnoreCase);
        Assert.Matches(@"\d{5}", body);
    }

    private static void SeedToubaClinic(AuthServiceFactory factory, string? otpTemplate)
    {
        var clinicId = Guid.NewGuid();
        factory.Store.Clinics.Add(new Clinic
        {
            Id = clinicId,
            Name = "کلینیک تست",
            IsCurrentTenant = true,
            Status = ClinicStatus.Active,
            SmsProvider = ClinicSmsProvider.Touba,
            ToubaUsername = "u",
            ToubaPassword = "p",
            SmsSenderNumber = "1000",
            ToubaOtpMessageTemplate = otpTemplate
        });
        var person = TestIdentityHelper.AddPerson(factory.Store, KnownMobile, "بیمار", "تست", "0012345679");
        TestIdentityHelper.AddPatient(factory.Store, clinicId, person);
        factory.Store.SyncNavigation();
    }
}
