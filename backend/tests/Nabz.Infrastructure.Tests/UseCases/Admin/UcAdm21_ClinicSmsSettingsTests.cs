/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm21_ClinicSmsSettingsTests.cs
 Description: تنظیم سامانه پیامک کلینیک — ماسک secret، لوگو، SOAP طوبی، UserInfo (UC-ADM-21)
 Parent Dependencies: ServiceHarness, ClinicService, ClinicSmsSecrets, BrandLogoRules, ToubaSoapSmsSender
 */

using Nabz.Application.Brand;
using Nabz.Application.Interfaces;
using Nabz.Application.Sms;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Services;
using Nabz.Infrastructure.Sms;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm21_ClinicSmsSettingsTests
{
    [Fact]
    public void ClinicSmsSecrets_masks_and_detects_unchanged()
    {
        Assert.Equal(ClinicSmsSecrets.Mask, ClinicSmsSecrets.MaskIfSet("secret-key"));
        Assert.Null(ClinicSmsSecrets.MaskIfSet(null));
        Assert.True(ClinicSmsSecrets.IsUnchanged(null));
        Assert.True(ClinicSmsSecrets.IsUnchanged(""));
        Assert.True(ClinicSmsSecrets.IsUnchanged(ClinicSmsSecrets.Mask));
        Assert.True(ClinicSmsSecrets.IsUnchanged("********"));
        Assert.False(ClinicSmsSecrets.IsUnchanged("new-secret"));
    }

    [Fact]
    [Trait("UC", "UC-ADM-21")]
    public void ToubaSoapSmsSender_normalizes_mobile_to_09()
    {
        Assert.Equal("09121234567", ToubaSoapSmsSender.NormalizeTo09("09121234567"));
        Assert.Equal("09121234567", ToubaSoapSmsSender.NormalizeTo09("+989121234567"));
        Assert.Equal("09121234567", ToubaSoapSmsSender.NormalizeTo09("989121234567"));
    }

    [Fact]
    [Trait("UC", "UC-ADM-21")]
    public void ToubaSoapSmsSender_resolves_legacy_url_to_soap_default()
    {
        Assert.Equal(ToubaSoapSmsSender.DefaultSoapUrl, ToubaSoapSmsSender.ResolveSoapEndpoint(null));
        Assert.Equal(ToubaSoapSmsSender.DefaultSoapUrl, ToubaSoapSmsSender.ResolveSoapEndpoint(""));
        Assert.Equal(
            ToubaSoapSmsSender.DefaultSoapUrl,
            ToubaSoapSmsSender.ResolveSoapEndpoint("https://sms.tsms.ir/url/tsms.php"));
        Assert.Equal(
            "https://custom.example/soap/",
            ToubaSoapSmsSender.ResolveSoapEndpoint("https://custom.example/soap"));
    }

    [Fact]
    public async Task UpdateCurrent_masks_secrets_and_keeps_password_when_mask_sent()
    {
        var h = new ServiceHarness();
        h.SeedClinic("بیمارستان تست");
        var svc = h.CreateClinicService();

        var saved = await svc.UpdateCurrentAsync(new UpdateClinicRequest(
            Name: "بیمارستان تست",
            City: "تهران",
            Address: "آدرس",
            Latitude: 35.7,
            Longitude: 51.4,
            PreAdmitSupportPhone: "02191000000",
            SmsProvider: "Touba",
            SmsSenderNumber: "10001234",
            ToubaUsername: "user1",
            ToubaPassword: "pass-real",
            ToubaSendUrl: ClinicService.DefaultToubaSendUrl,
            ToubaOtpMessageTemplate: "کد: {code}"));

        Assert.Equal("Touba", saved.SmsProvider);
        Assert.True(saved.ToubaPasswordSet);
        Assert.Equal(ClinicSmsSecrets.Mask, saved.ToubaPassword);
        Assert.Equal(ToubaSoapSmsSender.DefaultSoapUrl, saved.ToubaSendUrl);

        var again = await svc.UpdateCurrentAsync(new UpdateClinicRequest(
            Name: "بیمارستان تست",
            City: "تهران",
            Address: "آدرس",
            Latitude: 35.7,
            Longitude: 51.4,
            SmsProvider: "Touba",
            SmsSenderNumber: "10001234",
            ToubaUsername: "user1",
            ToubaPassword: ClinicSmsSecrets.Mask,
            ToubaOtpMessageTemplate: "کد: {code}"));

        Assert.True(again.ToubaPasswordSet);
        var entity = await h.Clinics.GetCurrentAsync();
        Assert.Equal("pass-real", entity!.ToubaPassword);
        Assert.Equal(ClinicSmsProvider.Touba, entity.SmsProvider);
    }

    [Fact]
    [Trait("UC", "UC-ADM-21")]
    public async Task UpdateCurrent_remaps_legacy_tsms_php_url_to_soap()
    {
        var h = new ServiceHarness();
        h.SeedClinic("بیمارستان تست");
        var svc = h.CreateClinicService();

        var saved = await svc.UpdateCurrentAsync(new UpdateClinicRequest(
            Name: "بیمارستان تست",
            City: null,
            Address: null,
            Latitude: null,
            Longitude: null,
            SmsProvider: "Touba",
            SmsSenderNumber: "1000",
            ToubaUsername: "u",
            ToubaPassword: "p",
            ToubaSendUrl: "https://sms.tsms.ir/url/tsms.php"));

        Assert.Equal(ToubaSoapSmsSender.DefaultSoapUrl, saved.ToubaSendUrl);
    }

    [Fact]
    [Trait("UC", "UC-ADM-21")]
    public async Task UpdateCurrent_rejects_Touba_OTP_template_without_code_placeholder()
    {
        var h = new ServiceHarness();
        h.SeedClinic("بیمارستان تست");
        var svc = h.CreateClinicService();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => svc.UpdateCurrentAsync(new UpdateClinicRequest(
            Name: "بیمارستان تست",
            City: null,
            Address: null,
            Latitude: null,
            Longitude: null,
            SmsProvider: "Touba",
            SmsSenderNumber: "1000",
            ToubaUsername: "u",
            ToubaPassword: "p",
            ToubaOtpMessageTemplate: "کد ورود شما: 11111")));

        Assert.Contains("{code}", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    [Trait("UC", "UC-ADM-21")]
    public async Task GetToubaAccountInfo_returns_credit_and_numbers_from_dispatch()
    {
        var h = new ServiceHarness();
        h.SeedClinic("بیمارستان تست");
        h.Sms.ToubaCredit = 55_000;
        h.Sms.ToubaSenderNumbers = ["10001111", "30002222"];
        var svc = h.CreateClinicService();

        await svc.UpdateCurrentAsync(new UpdateClinicRequest(
            Name: "بیمارستان تست",
            City: null,
            Address: null,
            Latitude: null,
            Longitude: null,
            SmsProvider: "None",
            SmsSenderNumber: "10001111",
            ToubaUsername: "user1",
            ToubaPassword: "pass1"));

        var info = await svc.GetToubaAccountInfoAsync();
        Assert.Equal(55_000, info.Credit);
        Assert.Equal(["10001111", "30002222"], info.SenderNumbers);
        Assert.Single(h.Sms.ToubaAccountCalls);
        Assert.Equal("user1", h.Sms.ToubaAccountCalls[0].Username);
    }

    [Fact]
    [Trait("UC", "UC-ADM-21")]
    public async Task GetToubaAccountInfo_6x_requires_saved_credentials()
    {
        var h = new ServiceHarness();
        h.SeedClinic("بیمارستان تست");
        var svc = h.CreateClinicService();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => svc.GetToubaAccountInfoAsync());
        Assert.Contains("نام کاربری", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UpdateCurrent_touba_requires_credentials_and_sender()
    {
        var h = new ServiceHarness();
        h.SeedClinic("بیمارستان تست");
        var svc = h.CreateClinicService();

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.UpdateCurrentAsync(new UpdateClinicRequest(
            Name: "بیمارستان تست",
            City: null,
            Address: null,
            Latitude: null,
            Longitude: null,
            SmsProvider: "Touba",
            SmsSenderNumber: null,
            ToubaUsername: "u",
            ToubaPassword: "p")));
    }

    [Fact]
    [Trait("UC", "UC-ADM-21")]
    public async Task UploadLogo_stores_clinic_brand_key()
    {
        var h = new ServiceHarness();
        h.SeedClinic("بیمارستان تست");
        var svc = h.CreateClinicService();

        await using var png = new MemoryStream(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A });
        var result = await svc.UploadLogoAsync(png, "logo.png", "image/png");

        Assert.StartsWith(BrandLogoRules.ClinicFolder + "/", result.LogoStorageKey, StringComparison.OrdinalIgnoreCase);
        var clinic = await h.Clinics.GetCurrentAsync();
        Assert.Equal(result.LogoStorageKey, clinic!.LogoStorageKey);
        Assert.True(h.Files.Files.ContainsKey(result.LogoStorageKey));
    }

    [Fact]
    [Trait("UC", "UC-ADM-21")]
    public async Task UploadLogo_5x_rejects_invalid_mime()
    {
        var h = new ServiceHarness();
        h.SeedClinic("بیمارستان تست");
        var svc = h.CreateClinicService();

        await using var svg = new MemoryStream(new byte[] { 0x3C, 0x73, 0x76, 0x67 });
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.UploadLogoAsync(svg, "logo.svg", "image/svg+xml"));
        Assert.Contains("PNG", ex.Message, StringComparison.OrdinalIgnoreCase);
    }
}
