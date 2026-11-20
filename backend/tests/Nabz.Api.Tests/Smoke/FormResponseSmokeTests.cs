/*
 File: backend/tests/Nabz.Api.Tests/Smoke/FormResponseSmokeTests.cs
 Description: SMK — Owner draft پاسخ فرم ۲۰۰؛ غیرمالک ۴۰۳؛ بیمار نامعتبر ۴۰۰ (نه ۵۰۰)
 Parent Dependencies: NabzApiFactory
 */

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Nabz.Api.Tests.Support;

namespace Nabz.Api.Tests.Smoke;

public sealed class FormResponseSmokeTests : IClassFixture<NabzApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public FormResponseSmokeTests(NabzApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("UC", "UC-OWN-03")]
    [Trait("SMK", "SMK-API-OWN-03")]
    public async Task Owner_SaveDraft_ReturnsOk()
    {
        var token = await LoginAsync("09123458910", "0012345679");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var (patientId, formId, itemCode) = await ResolveOwnerFormAsync();
        var res = await _client.PostAsJsonAsync("/api/forms/responses", new
        {
            patientId,
            formId,
            submit = false,
            answers = new[] { new { itemCode, valueCode = (string?)null, valueRaw = "بله", notes = (string?)null, skippedByRule = false } }
        });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    [Trait("UC", "UC-OWN-03")]
    [Trait("SMK", "SMK-API-OWN-03")]
    public async Task Owner_SaveDraft_UnknownPatient_ReturnsBadRequest()
    {
        var token = await LoginAsync("09123458910", "0012345679");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var (_, formId, itemCode) = await ResolveOwnerFormAsync();
        var res = await _client.PostAsJsonAsync("/api/forms/responses", new
        {
            patientId = Guid.Parse("00000000-0000-0000-0000-000000000099"),
            formId,
            submit = false,
            answers = new[] { new { itemCode, valueCode = (string?)null, valueRaw = "x", notes = (string?)null, skippedByRule = false } }
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.False(body.GetProperty("ok").GetBoolean());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("error").GetString()));
    }

    [Fact]
    [Trait("UC", "UC-OWN-03")]
    [Trait("SMK", "SMK-API-OWN-03")]
    public async Task Specialist_SaveDraft_ReturnsForbidden()
    {
        // پزشک seed؛ نقش Owner ندارد → ۴۰۳ از Authorize
        var token = await LoginAsync("09120000002");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var res = await _client.PostAsJsonAsync("/api/forms/responses", new
        {
            patientId = Guid.NewGuid(),
            formId = Guid.NewGuid(),
            submit = false,
            answers = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    private async Task<(Guid PatientId, Guid FormId, string ItemCode)> ResolveOwnerFormAsync()
    {
        var snap = await _client.GetFromJsonAsync<JsonElement>("/api/patients/mine/intake-snapshot", JsonOpts);
        var patientId = snap.GetProperty("patient").GetProperty("id").GetGuid();
        Assert.NotEqual(Guid.Empty, patientId);

        var clinic = await _client.GetFromJsonAsync<JsonElement>("/api/clinics/current", JsonOpts);
        var clinicId = clinic.GetProperty("id").GetGuid();
        var structures = await _client.GetFromJsonAsync<JsonElement>($"/api/forms/structures?clinicId={clinicId}", JsonOpts);
        Assert.True(structures.GetArrayLength() >= 1);
        var form = structures.EnumerateArray().First(f =>
            string.Equals(f.GetProperty("status").GetString(), "Published", StringComparison.OrdinalIgnoreCase)
            || string.Equals(f.GetProperty("status").GetString(), "published", StringComparison.OrdinalIgnoreCase));
        var formId = form.GetProperty("id").GetGuid();
        var itemCode = form.GetProperty("items").EnumerateArray().First().GetProperty("code").GetString()!;
        return (patientId, formId, itemCode);
    }

    private async Task<string> LoginAsync(string mobile, string? nationalId = null)
    {
        // هر تست Authorization قبلی را پاک کند تا Bearer قاطی نشود
        _client.DefaultRequestHeaders.Authorization = null;
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

        // نشست pending همان token را نگه می‌دارد؛ Select هویت را روی همان session می‌نویسد
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var nid = nationalId
                  ?? body.GetProperty("candidates").EnumerateArray().First().GetProperty("nationalId").GetString()!;
        var select = await _client.PostAsJsonAsync("/api/auth/otp/select", new { nationalId = nid });
        select.EnsureSuccessStatusCode();
        return token;
    }
}
