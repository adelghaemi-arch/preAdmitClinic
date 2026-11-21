/*
 File: backend/tests/Nabz.Api.Tests/Smoke/FraudCaptureSmokeTests.cs
 Description: smoke لوکال UC-OWN-09 — config، start/upload/capture/end، تنظیمات ادمین، enforce fraudWatch
 Parent Dependencies: NabzApiFactory, AuthOtpSmokeTests login pattern
 */

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Nabz.Api.Tests.Support;
using Nabz.Application.Security;

namespace Nabz.Api.Tests.Smoke;

public sealed class FraudCaptureSmokeTests : IClassFixture<NabzApiFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    // JPEG 1×1 minimal — فقط برای آپلود فایل
    private static readonly byte[] TinyJpeg =
    [
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
        0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4, 0x00, 0x14,
        0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0xFF, 0xD9
    ];

    public FraudCaptureSmokeTests(NabzApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("UC", "UC-OWN-09")]
    [Trait("SMK", "SMK-API-OWN-09")]
    public async Task FraudFlow_ConfigCaptureAndAdminInterval_WorksEndToEnd()
    {
        // —— Owner: config پیش‌فرض ۷ ——
        var ownerToken = await LoginAsync("09123458910", "0012345679");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);

        var cfgRes = await _client.GetAsync("/api/evidence/fraud/config");
        Assert.Equal(HttpStatusCode.OK, cfgRes.StatusCode);
        var cfg = await cfgRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(7, cfg.GetProperty("fraudAutoCaptureSeconds").GetInt32());
        Assert.True(cfg.GetProperty("fraudWatchEnabled").GetBoolean());

        var snapRes = await _client.GetAsync("/api/patients/mine/intake-snapshot");
        snapRes.EnsureSuccessStatusCode();
        var patientId = (await snapRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts))
            .GetProperty("patient").GetProperty("id").GetGuid();

        var startRes = await _client.PostAsJsonAsync("/api/evidence/fraud/start", new { patientId });
        Assert.Equal(HttpStatusCode.OK, startRes.StatusCode);
        var startBody = await startRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var sessionId = startBody.GetProperty("sessionId").GetGuid();
        var wrapKey = startBody.GetProperty("wrapKey").GetString()!;
        Assert.NotEqual(Guid.Empty, sessionId);
        Assert.False(string.IsNullOrWhiteSpace(wrapKey));

        var key1 = await UploadWrappedFraudAsync(sessionId, wrapKey, patientId);
        var key2 = await UploadWrappedFraudAsync(sessionId, wrapKey, patientId);
        Assert.DoesNotContain("fraud", key1, StringComparison.OrdinalIgnoreCase);
        Assert.EndsWith(".jpg", key1, StringComparison.OrdinalIgnoreCase);

        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsJsonAsync("/api/evidence/fraud/capture", new
        {
            sessionId,
            storageKey = key1,
            kind = "fraud_auto",
            lat = 35.7,
            lon = 51.4,
            accuracy = 12.0
        })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsJsonAsync("/api/evidence/fraud/capture", new
        {
            sessionId,
            storageKey = key2,
            kind = "fraud_auto"
        })).StatusCode);

        Assert.Equal(HttpStatusCode.OK,
            (await _client.PostAsJsonAsync("/api/evidence/fraud/end", new { sessionId })).StatusCode);

        // —— Platform: فریم‌ها + دانلود با اسلش ——
        var platToken = await LoginAsync("09133752696");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", platToken);

        var detailRes = await _client.GetAsync($"/api/evidence/fraud/sessions/{sessionId}");
        Assert.Equal(HttpStatusCode.OK, detailRes.StatusCode);
        var detail = await detailRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(2, detail.GetProperty("frames").GetArrayLength());

        var storageKey = detail.GetProperty("frames")[0].GetProperty("storageKey").GetString()!;
        Assert.Contains("/", storageKey);
        var path = string.Join("/", storageKey.Split('/').Select(Uri.EscapeDataString));
        var fileRes = await _client.GetAsync($"/api/files/{path}");
        Assert.Equal(HttpStatusCode.OK, fileRes.StatusCode);
        var downloaded = await fileRes.Content.ReadAsByteArrayAsync();
        Assert.True(downloaded.Length > 10);
        Assert.Equal(0xFF, downloaded[0]);
        Assert.Equal(0xD8, downloaded[1]);
        Assert.Equal("image/jpeg", fileRes.Content.Headers.ContentType?.MediaType);

        // زمان پاسخ API باید آفست ایران داشته باشد
        var startedAt = detail.GetProperty("startedAt").GetString()!;
        Assert.Contains("+03:30", startedAt);

        // —— Platform: بازه ۸ ——
        var current = await (await _client.GetAsync("/api/platform/settings"))
            .Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var put8 = await _client.PutAsJsonAsync("/api/platform/settings", SettingsBody(current, 8, fraudWatch: true));
        Assert.Equal(HttpStatusCode.OK, put8.StatusCode);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var cfg8 = await (await _client.GetAsync("/api/evidence/fraud/config"))
            .Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(8, cfg8.GetProperty("fraudAutoCaptureSeconds").GetInt32());

        // —— fraudWatch خاموش ⇒ start رد می‌شود (TestHost ممکن است exception بدهد) ——
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", platToken);
        var putOff = await _client.PutAsJsonAsync("/api/platform/settings", SettingsBody(current, 8, fraudWatch: false));
        Assert.Equal(HttpStatusCode.OK, putOff.StatusCode);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var blocked = false;
        try
        {
            var blockedRes = await _client.PostAsJsonAsync("/api/evidence/fraud/start", new { patientId });
            blocked = blockedRes.StatusCode != HttpStatusCode.OK;
            if (!blocked)
            {
                var body = await blockedRes.Content.ReadAsStringAsync();
                blocked = body.Contains("غیرفعال", StringComparison.Ordinal);
            }
        }
        catch (Exception ex)
        {
            blocked = ex.Message.Contains("غیرفعال", StringComparison.Ordinal)
                      || (ex.InnerException?.Message.Contains("غیرفعال", StringComparison.Ordinal) ?? false);
        }
        Assert.True(blocked, "شروع نشست با fraudWatch=false باید رد شود.");

        // بازگردانی فلگ برای پاکی fixture مشترک
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", platToken);
        await _client.PutAsJsonAsync("/api/platform/settings", SettingsBody(current, 7, fraudWatch: true));
    }

    private static object SettingsBody(JsonElement current, int seconds, bool fraudWatch) => new
    {
        brandName = current.GetProperty("brandName").GetString(),
        otpLength = current.GetProperty("otpLength").GetInt32(),
        otpTtlSeconds = current.GetProperty("otpTtlSeconds").GetInt32(),
        intakeDocumentMaxGroups = current.GetProperty("intakeDocumentMaxGroups").GetInt32(),
        intakeDocumentMaxFilesPerGroup = current.GetProperty("intakeDocumentMaxFilesPerGroup").GetInt32(),
        supportPhone = "02191000000",
        smsSenderId = "NABZ",
        fraudAutoCaptureSeconds = seconds,
        featureFlags = new
        {
            fraudWatch,
            gpsTracking = true,
            multiClinicRegistry = false,
            corporateContracts = true,
            multiSessionWatch = true
        }
    };

    private async Task<string> UploadWrappedFraudAsync(Guid sessionId, string wrapKey, Guid patientId)
    {
        var envelope = FraudFrameWireCodec.Wrap(TinyJpeg, wrapKey);
        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(envelope);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        form.Add(fileContent, "file", $"{Guid.NewGuid():N}.bin");
        form.Add(new StringContent(sessionId.ToString()), "sessionId");
        form.Add(new StringContent(patientId.ToString()), "patientId");
        var res = await _client.PostAsync("/api/files", form);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("image/jpeg", body.GetProperty("contentType").GetString());
        var key = body.GetProperty("storageKey").GetString();
        Assert.False(string.IsNullOrWhiteSpace(key));
        return key!;
    }

    private async Task<string> LoginAsync(string mobile, string? nationalId = null)
    {
        var req = await _client.PostAsJsonAsync("/api/auth/otp/request", new { mobile });
        req.EnsureSuccessStatusCode();
        var verify = await _client.PostAsJsonAsync("/api/auth/otp/verify", new
        {
            mobile,
            code = "12345",
            deviceLabel = "fraud-smoke",
            appSurface = "clinic_web"
        });
        verify.EnsureSuccessStatusCode();
        var body = await verify.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var token = body.GetProperty("token").GetString()!;
        var needsSelection = body.TryGetProperty("needsSelection", out var ns) && ns.GetBoolean();
        if (!needsSelection)
            return token;

        // توکن بعد از select عوض نمی‌شود؛ همان Bearer ادامه می‌یابد
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var nid = nationalId
                  ?? body.GetProperty("candidates").EnumerateArray().First().GetProperty("nationalId").GetString()!;
        var select = await _client.PostAsJsonAsync("/api/auth/otp/select", new { nationalId = nid });
        select.EnsureSuccessStatusCode();
        return token;
    }
}
