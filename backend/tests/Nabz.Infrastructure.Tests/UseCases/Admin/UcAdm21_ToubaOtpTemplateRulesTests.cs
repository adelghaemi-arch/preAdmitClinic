/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm21_ToubaOtpTemplateRulesTests.cs
 Description: UC-ADM-21 — قوانین {code} طوبی و گارد FixedOtp در Production
 Parent Dependencies: ToubaOtpTemplateRules, AuthProductionGuards
 */

using Nabz.Application.Options;
using Nabz.Application.Sms;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm21_ToubaOtpTemplateRulesTests
{
    [Fact]
    [Trait("UC", "UC-ADM-21")]
    public void ResolveOrThrow_empty_uses_default_with_placeholder()
    {
        var tpl = ToubaOtpTemplateRules.ResolveOrThrow(null);
        Assert.Equal(ToubaOtpTemplateRules.DefaultTemplate, tpl);
        Assert.True(ToubaOtpTemplateRules.HasCodePlaceholder(tpl));
    }

    [Fact]
    [Trait("UC", "UC-ADM-21")]
    public void ResolveOrThrow_rejects_literal_11111_without_placeholder()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => ToubaOtpTemplateRules.ResolveOrThrow("کد ورود شما: 11111"));
        Assert.Equal(ToubaOtpTemplateRules.MissingPlaceholderMessage, ex.Message);
    }

    [Fact]
    [Trait("UC", "UC-ADM-21")]
    public void EnsureValidIfSet_allows_null_or_empty()
    {
        ToubaOtpTemplateRules.EnsureValidIfSet(null);
        ToubaOtpTemplateRules.EnsureValidIfSet("  ");
    }

    [Fact]
    public void AuthProductionGuards_blocks_FixedOtp_in_Production()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => AuthProductionGuards.EnsureFixedOtpAllowed(true, "11111"));
        Assert.Equal(AuthProductionGuards.FixedOtpForbiddenInProductionMessage, ex.Message);
    }

    [Fact]
    public void AuthProductionGuards_allows_empty_FixedOtp_in_Production()
    {
        AuthProductionGuards.EnsureFixedOtpAllowed(true, "");
        AuthProductionGuards.EnsureFixedOtpAllowed(true, null);
        AuthProductionGuards.EnsureFixedOtpAllowed(false, "12345");
    }
}
