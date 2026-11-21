/*
 File: backend/tests/Nabz.Api.Tests/Smoke/AuthOtpSmokeTests.cs
 Description: API smoke برای UC-OWN-01 / UC-OWN-02 / UC-PLT-15 — OTP FixedOtp (+۱ ادمین کل)، انتخاب کدملی
 Parent Dependencies: NabzApiFactory, SmokeOtp
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
    public async Task RequestAndVerify_SharedMobile_NeedsSelectionThenSelect()
    {
        // موبایل seed شده با دو کدملی
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
        Assert.True(verifyBody.GetProperty("needsSelection").GetBoolean());
        var token = verifyBody.GetProperty("token").GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var select = await _client.PostAsJsonAsync("/api/auth/otp/select", new { nationalId = "0012345679" });
        Assert.Equal(HttpStatusCode.OK, select.StatusCode);
        var selectBody = await select.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(selectBody.GetProperty("ok").GetBoolean());
        Assert.Contains("Owner", selectBody.GetProperty("roles").EnumerateArray().Select(x => x.GetString()));
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
    [Trait("UC", "UC-OWN-01")]
    [Trait("SMK", "SMK-API-OWN-01")]
    public async Task OtpMode_WhenFixedOtpConfigured_ReturnsEnabledTrue()
    {
        var res = await _client.GetAsync("/api/auth/otp/mode");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.GetProperty("fixedOtpEnabled").GetBoolean());
    }

    [Fact]
    [Trait("UC", "UC-OWN-01")]
    [Trait("SMK", "SMK-API-OWN-01")]
    public async Task OtpMode_WhenSmsMode_ReturnsEnabledFalse()
    {
        using var smsFactory = new NabzApiSmsFactory();
        var client = smsFactory.CreateClient();
        var res = await client.GetAsync("/api/auth/otp/mode");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.False(body.GetProperty("fixedOtpEnabled").GetBoolean());
    }

    [Fact]
    [Trait("UC", "UC-OWN-02")]
    [Trait("SMK", "SMK-API-OWN-02")]
    public async Task MeAndIntakeSnapshot_AfterLogin_Succeed()
    {
        var token = await LoginAsync("09123458910", "0012345679");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var me = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var meBody = await me.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("09123458910", meBody.GetProperty("mobile").GetString());

        var snap = await _client.GetAsync("/api/patients/mine/intake-snapshot");
        Assert.Equal(HttpStatusCode.OK, snap.StatusCode);
    }

    [Fact]
    [Trait("UC", "UC-PLT-15")]
    [Trait("SMK", "SMK-API-PLT-15")]
    public async Task PlatformAdmin_Login_HasPlatformRole()
    {
        // موبایل ثابت ادمین کل — تک‌کاندیدا؛ کد = FixedOtp+1
        var mobile = "09133752696";
        var req = await _client.PostAsJsonAsync("/api/auth/otp/request", new { mobile });
        Assert.Equal(HttpStatusCode.OK, req.StatusCode);
        var reqBody = await req.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(SmokeOtp.FixedOtp, reqBody.GetProperty("demoCode").GetString());

        var plain = await _client.PostAsJsonAsync("/api/auth/otp/verify", new
        {
            mobile,
            code = SmokeOtp.FixedOtp,
            deviceLabel = "smoke",
            appSurface = "clinic_web"
        });
        Assert.Equal(HttpStatusCode.BadRequest, plain.StatusCode);

        var token = await LoginAsync(mobile);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var me = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var meBody = await me.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var roles = meBody.GetProperty("roles").EnumerateArray().Select(x => x.GetString()).ToList();
        Assert.Contains("Platform", roles);
    }

    private async Task<string> LoginAsync(string mobile, string? nationalId = null)
    {
        var req = await _client.PostAsJsonAsync("/api/auth/otp/request", new { mobile });
        req.EnsureSuccessStatusCode();
        var verify = await _client.PostAsJsonAsync("/api/auth/otp/verify", new
        {
            mobile,
            code = SmokeOtp.CodeFor(mobile),
            deviceLabel = "smoke",
            appSurface = "clinic_web"
        });
        verify.EnsureSuccessStatusCode();
        var body = await verify.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var token = body.GetProperty("token").GetString()!;
        var needsSelection = body.TryGetProperty("needsSelection", out var ns) && ns.GetBoolean();
        if (!needsSelection)
            return token;

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var nid = nationalId
                  ?? body.GetProperty("candidates").EnumerateArray().First().GetProperty("nationalId").GetString()!;
        var select = await _client.PostAsJsonAsync("/api/auth/otp/select", new { nationalId = nid });
        select.EnsureSuccessStatusCode();
        return token;
    }
}
