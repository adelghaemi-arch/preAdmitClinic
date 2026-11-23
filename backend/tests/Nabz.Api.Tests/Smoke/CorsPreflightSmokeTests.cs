/*
 File: backend/tests/Nabz.Api.Tests/Smoke/CorsPreflightSmokeTests.cs
 Description: smoke OPTIONS — وجود Access-Control-Allow-Origin برای Origin فرانت
 Parent Dependencies: NabzApiFactory
 */

using System.Net;
using Nabz.Api.Tests.Support;

namespace Nabz.Api.Tests.Smoke;

public sealed class CorsPreflightSmokeTests : IClassFixture<NabzApiFactory>
{
    private readonly HttpClient _client;

    public CorsPreflightSmokeTests(NabzApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    [Trait("SMK", "SMK-API-CORS")]
    public async Task Options_OtpRequest_FromMyOrigin_ReturnsAllowOrigin()
    {
        using var req = new HttpRequestMessage(HttpMethod.Options, "/api/auth/otp/request");
        req.Headers.TryAddWithoutValidation("Origin", "https://my.nafasmed.ir");
        req.Headers.TryAddWithoutValidation("Access-Control-Request-Method", "POST");
        req.Headers.TryAddWithoutValidation("Access-Control-Request-Headers", "content-type,authorization");

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.True(res.Headers.TryGetValues("Access-Control-Allow-Origin", out var origins));
        Assert.Contains("https://my.nafasmed.ir", origins);
    }

    [Fact]
    [Trait("SMK", "SMK-API-CORS")]
    public async Task Options_OtpRequest_FromSecondListedMyOrigin_ReturnsAllowOrigin()
    {
        // دومین origin در FrontendUrls:My با کاما — هر دامنهٔ فرانت این هاست
        using var req = new HttpRequestMessage(HttpMethod.Options, "/api/auth/otp/request");
        req.Headers.TryAddWithoutValidation("Origin", "https://my.cors-second.example");
        req.Headers.TryAddWithoutValidation("Access-Control-Request-Method", "POST");
        req.Headers.TryAddWithoutValidation("Access-Control-Request-Headers", "content-type");

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.True(res.Headers.TryGetValues("Access-Control-Allow-Origin", out var origins));
        Assert.Contains("https://my.cors-second.example", origins);
    }
}
