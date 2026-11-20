/*
 File: backend/tests/Nabz.Api.Tests/Smoke/VaultAccessSmokeTests.cs
 Description: UC-PLT-14 — vault فقط Platform؛ Admin کلینیک Forbidden
 Parent Dependencies: NabzApiFactory
 */

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Nabz.Api.Tests.Support;

namespace Nabz.Api.Tests.Smoke;

public sealed class VaultAccessSmokeTests : IClassFixture<NabzApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public VaultAccessSmokeTests(NabzApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("UC", "UC-PLT-14")]
    [Trait("SMK", "SMK-API-PLT-14-VAULT")]
    public async Task Platform_ListVault_Ok_Admin_Forbidden()
    {
        var platformToken = await LoginAsync("09133752696");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", platformToken);
        var ok = await _client.GetAsync("/api/evidence/vault?trash=false&take=10");
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        // ادمین کلینیک seed — حتی خواندن خزانه ممنوع
        var adminToken = await LoginAsync("09120000001");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var forbidden = await _client.GetAsync("/api/evidence/vault?trash=false&take=10");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        var soft = await _client.PostAsJsonAsync("/api/evidence/vault/soft-delete", new
        {
            documentFileIds = Array.Empty<Guid>(),
            photoIds = Array.Empty<Guid>()
        });
        Assert.Equal(HttpStatusCode.Forbidden, soft.StatusCode);

        var hard = await _client.PostAsJsonAsync("/api/evidence/vault/hard-delete", new
        {
            documentFileIds = Array.Empty<Guid>(),
            photoIds = Array.Empty<Guid>()
        });
        Assert.Equal(HttpStatusCode.Forbidden, hard.StatusCode);
    }

    private async Task<string> LoginAsync(string mobile, string? nationalId = null)
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var req = await _client.PostAsJsonAsync("/api/auth/otp/request", new { mobile });
        req.EnsureSuccessStatusCode();
        var verify = await _client.PostAsJsonAsync("/api/auth/otp/verify", new
        {
            mobile,
            code = "12345",
            deviceLabel = "smoke-vault",
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
        var selectBody = await select.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        return selectBody.TryGetProperty("token", out var t) && t.ValueKind == JsonValueKind.String
            ? t.GetString()!
            : token;
    }
}
