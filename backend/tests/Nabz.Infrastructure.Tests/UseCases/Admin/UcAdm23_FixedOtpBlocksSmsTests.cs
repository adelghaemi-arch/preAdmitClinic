/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm23_FixedOtpBlocksSmsTests.cs
 Description: UC-ADM-23 — FixedOtp فقط مسیریاب تولید را قفل می‌کند، نه تست درگاه
 Parent Dependencies: ClinicRoutingSmsSender, AuthOptions
 */

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Nabz.Application.Options;
using Nabz.Infrastructure.Sms;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm23_FixedOtpBlocksSmsTests
{
    [Fact]
    public async Task Routing_blocks_OTP_campaign_when_FixedOtp_set()
    {
        var sender = new ClinicRoutingSmsSender(
            clinics: null!,
            kavenegar: null!,
            touba: null!,
            Options.Create(new KavenegarOptions()),
            Options.Create(new AuthOptions { FixedOtp = "12345" }),
            NullLogger<ClinicRoutingSmsSender>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sender.SendPlainAsync("09121234567", "x"));
        Assert.Contains("FixedOtp", ex.Message);
    }

    [Fact]
    public async Task Routing_blocks_template_when_FixedOtp_set()
    {
        var sender = new ClinicRoutingSmsSender(
            clinics: null!,
            kavenegar: null!,
            touba: null!,
            Options.Create(new KavenegarOptions()),
            Options.Create(new AuthOptions { FixedOtp = "12345" }),
            NullLogger<ClinicRoutingSmsSender>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sender.SendTemplateAsync("09121234567", "otp", ["1"]));
        Assert.Contains("FixedOtp", ex.Message);
    }
}
