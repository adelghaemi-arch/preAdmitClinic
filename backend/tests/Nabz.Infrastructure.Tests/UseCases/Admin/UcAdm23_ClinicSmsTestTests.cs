/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm23_ClinicSmsTestTests.cs
 Description: تست ارسال پیامک تنظیمات کلینیک — سه حالت + استثناها (UC-ADM-23)
 Parent Dependencies: ServiceHarness, ClinicService, ClinicSmsTestSamples
 */

using Nabz.Application.Interfaces;
using Nabz.Application.Sms;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm23_ClinicSmsTestTests
{
    [Fact]
    public async Task AppTemplate_Touba_sends_plain_filled_body()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var clinic = (await h.Clinics.GetCurrentAsync())!;
        clinic.SmsProvider = ClinicSmsProvider.Touba;
        clinic.ToubaUsername = "u";
        clinic.ToubaPassword = "p";
        clinic.SmsSenderNumber = "1000";
        var templateId = h.SeedDefaultSmsTemplate();
        var svc = h.CreateClinicService();

        var result = await svc.TestSmsAsync(new ClinicSmsTestRequest(
            ClinicSmsTestModes.AppTemplate, "09121234567", TemplateId: templateId));

        Assert.True(result.Ok);
        Assert.False(result.Simulated);
        Assert.Single(h.Sms.PlainCalls);
        Assert.Contains("کاربر تست", h.Sms.PlainCalls[0].Content);
        Assert.Empty(h.Sms.SentCalls);
    }

    [Fact]
    public async Task AppTemplate_Kavenegar_sends_provider_template()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var clinic = (await h.Clinics.GetCurrentAsync())!;
        clinic.SmsProvider = ClinicSmsProvider.Kavenegar;
        clinic.KavenegarApiKey = "key";
        var templateId = h.SeedDefaultSmsTemplate();
        var svc = h.CreateClinicService();

        var result = await svc.TestSmsAsync(new ClinicSmsTestRequest(
            ClinicSmsTestModes.AppTemplate, "09121234567", TemplateId: templateId));

        Assert.True(result.Ok);
        Assert.Single(h.Sms.SentCalls);
        Assert.Equal("invite", h.Sms.SentCalls[0].TemplateName);
        Assert.Empty(h.Sms.PlainCalls);
    }

    [Fact]
    public async Task Direct_Touba_sends_plain()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var clinic = (await h.Clinics.GetCurrentAsync())!;
        clinic.SmsProvider = ClinicSmsProvider.Touba;
        clinic.ToubaUsername = "u";
        clinic.ToubaPassword = "p";
        clinic.SmsSenderNumber = "1000";
        var svc = h.CreateClinicService();

        var result = await svc.TestSmsAsync(new ClinicSmsTestRequest(
            ClinicSmsTestModes.Direct, "09121112233", PlainBody: "سلام تست"));

        Assert.True(result.Ok);
        Assert.Equal(ClinicSmsTestModes.Direct, result.Mode);
        Assert.Single(h.Sms.PlainCalls);
        Assert.Equal("سلام تست", h.Sms.PlainCalls[0].Content);
    }

    [Fact]
    public async Task ProviderTemplate_Kavenegar_sends_lookup()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var clinic = (await h.Clinics.GetCurrentAsync())!;
        clinic.SmsProvider = ClinicSmsProvider.Kavenegar;
        var svc = h.CreateClinicService();

        var result = await svc.TestSmsAsync(new ClinicSmsTestRequest(
            ClinicSmsTestModes.ProviderTemplate,
            "09123334455",
            ProviderTemplateName: "otp",
            Tokens: ["11111", "token2"]));

        Assert.True(result.Ok);
        Assert.Single(h.Sms.SentCalls);
        Assert.Equal("otp", h.Sms.SentCalls[0].TemplateName);
        Assert.Equal(["11111", "token2"], h.Sms.SentCalls[0].Tokens);
    }

    [Fact]
    public async Task None_provider_1x_rejects()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var svc = h.CreateClinicService();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.TestSmsAsync(new ClinicSmsTestRequest(ClinicSmsTestModes.Direct, "09121234567", PlainBody: "x")));
        Assert.Contains("درگاه", ex.Message);
        Assert.Empty(h.Sms.PlainCalls);
    }

    [Fact]
    public async Task Invalid_mobile_2x_rejects()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var clinic = (await h.Clinics.GetCurrentAsync())!;
        clinic.SmsProvider = ClinicSmsProvider.Touba;
        clinic.ToubaUsername = "u";
        clinic.ToubaPassword = "p";
        clinic.SmsSenderNumber = "1000";
        var svc = h.CreateClinicService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.TestSmsAsync(new ClinicSmsTestRequest(ClinicSmsTestModes.Direct, "123", PlainBody: "x")));
    }

    [Fact]
    public async Task Direct_on_Kavenegar_3x_rejects()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var clinic = (await h.Clinics.GetCurrentAsync())!;
        clinic.SmsProvider = ClinicSmsProvider.Kavenegar;
        var svc = h.CreateClinicService();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.TestSmsAsync(new ClinicSmsTestRequest(ClinicSmsTestModes.Direct, "09121234567", PlainBody: "x")));
        Assert.Contains("طوبی", ex.Message);
    }

    [Fact]
    public async Task ProviderTemplate_on_Touba_3x_rejects()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var clinic = (await h.Clinics.GetCurrentAsync())!;
        clinic.SmsProvider = ClinicSmsProvider.Touba;
        clinic.ToubaUsername = "u";
        clinic.ToubaPassword = "p";
        clinic.SmsSenderNumber = "1000";
        var svc = h.CreateClinicService();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.TestSmsAsync(new ClinicSmsTestRequest(
                ClinicSmsTestModes.ProviderTemplate, "09121234567", ProviderTemplateName: "otp")));
        Assert.Contains("کاوه‌نگار", ex.Message);
    }

    [Fact]
    public async Task AppTemplate_missing_provider_name_on_Kavenegar_5x_rejects()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var clinic = (await h.Clinics.GetCurrentAsync())!;
        clinic.SmsProvider = ClinicSmsProvider.Kavenegar;
        var id = Guid.NewGuid();
        h.Store.SmsCampaignTemplates.Add(new SmsCampaignTemplate
        {
            Id = id,
            Code = "no_provider",
            Title = "بدون نام درگاه",
            BodyPreview = "سلام",
            ProviderTemplateName = "",
            TokenKeysJson = """["name"]""",
            IsActive = true,
        });
        var svc = h.CreateClinicService();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.TestSmsAsync(new ClinicSmsTestRequest(ClinicSmsTestModes.AppTemplate, "09121234567", TemplateId: id)));
        Assert.Contains("ProviderTemplateName", ex.Message);
    }

    [Fact]
    public void Sample_tokens_fill_body_preview()
    {
        var body = ClinicSmsTestSamples.FillBodyPreview(
            "سلام {name} لینک {invite_url}",
            [SmsTemplateTokenKeys.Name, SmsTemplateTokenKeys.InviteUrl],
            "09120000000");
        Assert.Contains("کاربر تست", body);
        Assert.Contains("example.local", body);
    }
}
