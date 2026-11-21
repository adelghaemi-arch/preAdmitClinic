/*
 File: backend/tests/Nabz.Api.Tests/Smoke/ApiAbuseGuardSmokeTests.cs
 Description: API smoke UC-PLT-17 — soft ۴۲۹ و hard تعلیق + فهرست ادمین کل
 Parent Dependencies: NabzApiFactory, SmokeOtp
 */

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Nabz.Api.Tests.Support;

namespace Nabz.Api.Tests.Smoke;

public sealed class ApiAbuseGuardSmokeTests : IClassFixture<NabzApiAbuseFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public ApiAbuseGuardSmokeTests(NabzApiAbuseFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("UC", "UC-PLT-17")]
    [Trait("SMK", "SMK-API-PLT-17")]
    public async Task SoftThenHard_SuspendsOwner_PlatformListsIncident()
    {
        var ownerToken = await LoginOwnerAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);

        var sawHardOrDeny = false;
        for (var i = 0; i < 20; i++)
        {
            var res = await _client.GetAsync("/api/clinics/current");
            // hard → ۴۲۹؛ درخواست بعدی با deny-set → ۴۰۱
            if (res.StatusCode is HttpStatusCode.TooManyRequests or HttpStatusCode.Unauthorized)
            {
                sawHardOrDeny = true;
                break;
            }
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
        Assert.True(sawHardOrDeny);

        // با FixedOtp، SMS نمی‌رود ولی تعلیق و فهرست باید باشد
        var platformToken = await LoginPlatformAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", platformToken);
        var list = await _client.GetAsync("/api/platform/api-abuse?take=20");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        var body = await list.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.GetArrayLength() >= 1);
        Assert.Equal("Hard", body[0].GetProperty("severity").GetString());
        Assert.False(body[0].GetProperty("smsNotified").GetBoolean());
    }

    private async Task<string> LoginOwnerAsync()
    {
        await _client.PostAsJsonAsync("/api/auth/otp/request", new { mobile = "09123458910" });
        var verify = await _client.PostAsJsonAsync("/api/auth/otp/verify", new
        {
            mobile = "09123458910",
            code = SmokeOtp.FixedOtp,
            deviceLabel = "abuse-smoke",
            appSurface = "clinic_web"
        });
        var verifyBody = await verify.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var token = verifyBody.GetProperty("token").GetString()!;
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (verifyBody.GetProperty("needsSelection").GetBoolean())
        {
            var select = await _client.PostAsJsonAsync("/api/auth/otp/select", new { nationalId = "0012345679" });
            Assert.Equal(HttpStatusCode.OK, select.StatusCode);
        }
        return token;
    }

    private async Task<string> LoginPlatformAsync()
    {
        _client.DefaultRequestHeaders.Authorization = null;
        const string mobile = "09133752696";
        await _client.PostAsJsonAsync("/api/auth/otp/request", new { mobile });
        var verify = await _client.PostAsJsonAsync("/api/auth/otp/verify", new
        {
            mobile,
            code = SmokeOtp.CodeFor(mobile),
            deviceLabel = "abuse-smoke-plt",
            appSurface = "clinic_web"
        });
        var verifyBody = await verify.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        return verifyBody.GetProperty("token").GetString()!;
    }
}

/// <summary>آستانه‌های پایین برای رسیدن سریع به hard در smoke.</summary>
public sealed class NabzApiAbuseFactory : NabzApiFactory
{
    public NabzApiAbuseFactory() : base()
    {
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("ApiAbuse:SoftSamePathCount", "1000");
        builder.UseSetting("ApiAbuse:SoftTotalCount", "1000");
        builder.UseSetting("ApiAbuse:HardSamePathCount", "12");
        builder.UseSetting("ApiAbuse:HardTotalCount", "1000");
        builder.UseSetting("ApiAbuse:HardWindowSeconds", "60");
        builder.UseSetting("ApiAbuse:LastSeenMinIntervalSeconds", "60");
    }
}
