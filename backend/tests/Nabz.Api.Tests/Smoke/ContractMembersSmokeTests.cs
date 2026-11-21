/*
 File: backend/tests/Nabz.Api.Tests/Smoke/ContractMembersSmokeTests.cs
 Description: Platform⊇Admin روی members/import؛ Owner همچنان 403
 Parent Dependencies: NabzApiFactory
 */

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Nabz.Api.Tests.Support;

namespace Nabz.Api.Tests.Smoke;

public sealed class ContractMembersSmokeTests : IClassFixture<NabzApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public ContractMembersSmokeTests(NabzApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("UC", "UC-PLT-04")]
    [Trait("SMK", "SMK-API-PLT-CONTRACT-MEMBERS")]
    public async Task Platform_ListContractMembers_ReturnsOk()
    {
        var token = await LoginAsync("09133752696");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var clinic = await _client.GetFromJsonAsync<JsonElement>("/api/clinics/current", JsonOpts);
        var clinicId = clinic.GetProperty("id").GetGuid();

        var list = await _client.GetAsync($"/api/contracts?clinicId={clinicId}");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        var contracts = await list.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(contracts.GetArrayLength() >= 1);
        var contractId = contracts[0].GetProperty("id").GetGuid();

        var members = await _client.GetAsync($"/api/contracts/{contractId}/members");
        Assert.Equal(HttpStatusCode.OK, members.StatusCode);
    }

    [Fact]
    [Trait("UC", "UC-ADM-04")]
    [Trait("SMK", "SMK-API-PLT-CONTRACT-IMPORT")]
    public async Task Platform_ImportMembers_NotForbidden()
    {
        var token = await LoginAsync("09133752696");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var clinic = await _client.GetFromJsonAsync<JsonElement>("/api/clinics/current", JsonOpts);
        var clinicId = clinic.GetProperty("id").GetGuid();
        var contracts = await _client.GetFromJsonAsync<JsonElement>($"/api/contracts?clinicId={clinicId}", JsonOpts);
        var contractId = contracts[0].GetProperty("id").GetGuid();

        // بدنه خالی: نباید 403 باشد (۲۰۰ با imported=0)
        var import = await _client.PostAsJsonAsync($"/api/contracts/{contractId}/members/import", Array.Empty<object>());
        Assert.NotEqual(HttpStatusCode.Forbidden, import.StatusCode);
        Assert.Equal(HttpStatusCode.OK, import.StatusCode);
    }

    [Fact]
    [Trait("UC", "UC-ADM-04")]
    [Trait("SMK", "SMK-API-OWN-CONTRACT-IMPORT-FORBIDDEN")]
    public async Task Owner_ImportMembers_Forbidden()
    {
        var token = await LoginAsync("09123458910", "0012345679");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // نقش Owner برای Authorize کافی است؛ id قرارداد مهم نیست
        var import = await _client.PostAsJsonAsync(
            $"/api/contracts/{Guid.Parse("00000000-0000-0000-0000-000000000001")}/members/import",
            Array.Empty<object>());
        Assert.Equal(HttpStatusCode.Forbidden, import.StatusCode);
    }

    private async Task<string> LoginAsync(string mobile, string? nationalId = null)
    {
        // کلاینت مشترک بین تست‌ها؛ Bearer قبلی verify را خراب نکند
        _client.DefaultRequestHeaders.Authorization = null;
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
        var selectBody = await select.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        return selectBody.TryGetProperty("token", out var t) && t.ValueKind == JsonValueKind.String
            ? t.GetString()!
            : token;
    }
}
