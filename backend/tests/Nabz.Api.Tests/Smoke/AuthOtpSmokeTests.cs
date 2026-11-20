/*
 File: backend/tests/Nabz.Api.Tests/Smoke/AuthOtpSmokeTests.cs
 Description: API smoke برای UC-OWN-01 / UC-OWN-02 — OTP FixedOtp و snapshot
 Parent Dependencies: NabzApiFactory
 */

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Nabz.Api.Tests.Support;

namespace Nabz.Api.Tests.Smoke;

public sealed class AuthOtpSmokeTests : IClassFixture<NabzApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public AuthOtpSmokeTests(NabzApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("UC", "UC-OWN-01")]
    [Trait("SMK", "SMK-API-OWN-01")]
    public async Task RequestAndVerify_FixedOtp_ReturnsTokenWithoutSms()
    {
        // موبایل seed شدهٔ owner در Program.SeedAsync
        var req = await _client.PostAsJsonAsync("/api/auth/otp/request", new { mobile = "09123458910" });
        Assert.Equal(HttpStatusCode.OK, req.StatusCode);
        var reqBody = await req.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(reqBody.GetProperty("ok").GetBoolean());
        Assert.Equal("12345", reqBody.GetProperty("demoCode").GetString());

        var verify = await _client.PostAsJsonAsync("/api/auth/otp/verify", new
        {
            mobile = "09123458910",
            code = "12345",
            deviceLabel = "smoke",
            appSurface = "clinic_web"
        });
        Assert.Equal(HttpStatusCode.OK, verify.StatusCode);
        var verifyBody = await verify.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(verifyBody.GetProperty("ok").GetBoolean());
        Assert.False(string.IsNullOrWhiteSpace(verifyBody.GetProperty("token").GetString()));
    }

    [Fact]
    [Trait("UC", "UC-OWN-01")]
    [Trait("SMK", "SMK-API-OWN-01")]
    public async Task RequestOtp_UnknownMobile_ReturnsBadRequest()
    {
        var req = await _client.PostAsJsonAsync("/api/auth/otp/request", new { mobile = "09999999999" });
        Assert.Equal(HttpStatusCode.BadRequest, req.StatusCode);
    }

    [Fact]
    [Trait("UC", "UC-OWN-02")]
    [Trait("SMK", "SMK-API-OWN-02")]
    public async Task MeAndIntakeSnapshot_AfterLogin_Succeed()
    {
        var token = await LoginAsync("09123458910");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var me = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var meBody = await me.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("09123458910", meBody.GetProperty("mobile").GetString());

        var snap = await _client.GetAsync("/api/patients/mine/intake-snapshot");
        Assert.Equal(HttpStatusCode.OK, snap.StatusCode);
    }

    [Fact]
    [Trait("UC", "UC-PLT-04")]
    [Trait("SMK", "SMK-API-PLT-AUTH")]
    public async Task PlatformAdmin_Login_HasPlatformRole()
    {
        // موبایل ثابت ادمین کل
        var token = await LoginAsync("09133752696");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var me = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var meBody = await me.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var roles = meBody.GetProperty("roles").EnumerateArray().Select(x => x.GetString()).ToList();
        Assert.Contains("Platform", roles);
    }

    private async Task<string> LoginAsync(string mobile)
    {
        var req = await _client.PostAsJsonAsync("/api/auth/otp/request", new { mobile });
        req.EnsureSuccessStatusCode();
        var verify = await _client.PostAsJsonAsync("/api/auth/otp/verify", new
        {
            mobile,
            code = "12345",
            deviceLabel = "smoke",
            appSurface = "clinic_web"
        });
        verify.EnsureSuccessStatusCode();
        var body = await verify.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        return body.GetProperty("token").GetString()!;
    }
}
