/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm21_ClinicSmsSettingsTests.cs
 Description: تنظیم سامانه پیامک کلینیک — ماسک secret و اعتبارسنجی طوبی
 Parent Dependencies: ServiceHarness, ClinicService, ClinicSmsSecrets, ToubaUrlSmsSender
 */

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
    public void ToubaUrlSmsSender_normalizes_mobile_to_09()
    {
        Assert.Equal("09121234567", ToubaUrlSmsSender.NormalizeTo09("09121234567"));
        Assert.Equal("09121234567", ToubaUrlSmsSender.NormalizeTo09("+989121234567"));
        Assert.Equal("09121234567", ToubaUrlSmsSender.NormalizeTo09("989121234567"));
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
}
