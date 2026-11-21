/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm23_FixedOtpBlocksSmsTests.cs
 Description: با Auth:FixedOtp هیچ ارسال واقعی از ClinicSmsDispatch انجام نمی‌شود
 Parent Dependencies: ClinicSmsDispatch, AuthOptions
 */

using Microsoft.Extensions.Options;
using Nabz.Application.Options;
using Nabz.Infrastructure.Sms;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm23_FixedOtpBlocksSmsTests
{
    [Fact]
    public async Task Dispatch_blocks_Touba_when_FixedOtp_set()
    {
        var dispatch = new ClinicSmsDispatch(
            touba: null!,
            kavenegar: null!,
            Options.Create(new AuthOptions { FixedOtp = "12345" }));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dispatch.SendToubaPlainAsync("09121234567", "x", "1000", "u", "p", null));
        Assert.Contains("FixedOtp", ex.Message);
    }

    [Fact]
    public async Task Dispatch_blocks_Kavenegar_when_FixedOtp_set()
    {
        var dispatch = new ClinicSmsDispatch(
            touba: null!,
            kavenegar: null!,
            Options.Create(new AuthOptions { FixedOtp = "12345" }));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dispatch.SendKavenegarTemplateAsync("09121234567", "otp", ["1"], "key", "1000"));
        Assert.Contains("FixedOtp", ex.Message);
    }
}
