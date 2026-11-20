/*
 File: backend/tests/Nabz.Api.Tests/Smoke/FormPackageSmokeTests.cs
 Description: SMK-API-ADM-18 — خروجی/ورود بسته پرسشنامه با نقش Admin
 Parent Dependencies: NabzApiFactory
 */

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Nabz.Api.Tests.Support;

namespace Nabz.Api.Tests.Smoke;

public sealed class FormPackageSmokeTests : IClassFixture<NabzApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public FormPackageSmokeTests(NabzApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("UC", "UC-ADM-18")]
    [Trait("SMK", "SMK-API-ADM-18")]
    public async Task Admin_ExportAndImportPackage_RoundTrip()
    {
        var token = await LoginAsync("09120000001");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var clinic = await _client.GetFromJsonAsync<JsonElement>("/api/clinics/current", JsonOpts);
        var clinicId = clinic.GetProperty("id").GetGuid();

        var export = await _client.GetAsync($"/api/forms/package?clinicId={clinicId}");
        Assert.Equal(HttpStatusCode.OK, export.StatusCode);
        var package = await export.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(package.TryGetProperty("schemaVersion", out var ver));
        Assert.Equal(2, ver.GetInt32());
        Assert.True(package.TryGetProperty("forms", out var formsEl));
        Assert.True(formsEl.GetArrayLength() >= 1);

        var importBody = new StringContent(package.GetRawText(), Encoding.UTF8, "application/json");
        var import = await _client.PostAsync($"/api/forms/package?clinicId={clinicId}", importBody);
        Assert.Equal(HttpStatusCode.OK, import.StatusCode);
        var importResult = await import.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(importResult.GetProperty("importedForms").GetInt32() >= 1);
    }

    [Fact]
    [Trait("UC", "UC-ADM-18")]
    [Trait("SMK", "SMK-API-ADM-18")]
    public async Task Owner_ExportPackage_Forbidden()
    {
        var token = await LoginAsync("09123458910");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var clinic = await _client.GetFromJsonAsync<JsonElement>("/api/clinics/current", JsonOpts);
        var clinicId = clinic.GetProperty("id").GetGuid();

        var export = await _client.GetAsync($"/api/forms/package?clinicId={clinicId}");
        Assert.Equal(HttpStatusCode.Forbidden, export.StatusCode);
    }

    private async Task<string> LoginAsync(string mobile, string? nationalId = null)
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
        var token = body.GetProperty("token").GetString()!;
        var needsSelection = body.TryGetProperty("needsSelection", out var ns) && ns.GetBoolean();
        if (!needsSelection)
            return token;

        // موبایل مشترک seed — بدون select نقش Owner صادر نمی‌شود و 403 گمراه‌کننده است
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var nid = nationalId
                  ?? body.GetProperty("candidates").EnumerateArray().First().GetProperty("nationalId").GetString()!;
        var select = await _client.PostAsJsonAsync("/api/auth/otp/select", new { nationalId = nid });
        select.EnsureSuccessStatusCode();
        return token;
    }
}
