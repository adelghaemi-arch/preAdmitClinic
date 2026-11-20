/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn01_IranMobileNormalizeTests.cs
 Description: نرمال موبایل ایران به 09… شامل +98 / 0098 / 98
 Parent Dependencies: Nabz.Application.Identity
 */

using Nabz.Application.Identity;

namespace Nabz.Infrastructure.Tests.UseCases.Owner;

[Trait("UC", "UC-OWN-01")]
public sealed class UcOwn01_IranMobileNormalizeTests
{
    [Theory]
    [InlineData("09123456789", "09123456789")]
    [InlineData("۰۹۱۲۳۴۵۶۷۸۹", "09123456789")]
    [InlineData("+989123456789", "09123456789")]
    [InlineData("00989123456789", "09123456789")]
    [InlineData("989123456789", "09123456789")]
    [InlineData("9123456789", "09123456789")]
    public void Normalize_CountryAndLocalForms_To09(string raw, string expected)
    {
        Assert.Equal(expected, IranMobile.Normalize(raw));
        Assert.True(IranMobile.IsValid(raw));
    }

    [Fact]
    public void Normalize_DoesNotProduce8912_FromPlus98()
    {
        // باگ قبلی: ۱۲ رقم ۹۸… → ۱۱ رقم آخر ۸۹۱۲…
        var n = IranMobile.Normalize("+989123456789");
        Assert.StartsWith("09", n);
        Assert.Equal(11, n.Length);
        Assert.DoesNotContain("8912", n);
    }
}
