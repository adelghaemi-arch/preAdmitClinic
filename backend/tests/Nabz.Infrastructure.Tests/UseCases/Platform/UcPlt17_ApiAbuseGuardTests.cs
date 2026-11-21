/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt17_ApiAbuseGuardTests.cs
 Description: Unit گارد ضدسوءاستفاده API — soft/hard/Platform/SMS (UC-PLT-17)
 Parent Dependencies: ServiceHarness, ApiAbuseGuardService
 */

using Nabz.Application.Interfaces;
using Nabz.Application.Options;
using Nabz.Application.Security;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Platform;

public sealed class UcPlt17_ApiAbuseGuardTests
{
    [Fact]
    public async Task UcPlt17_SoftThrottle_DoesNotSuspend()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var user = SeedOwner(h, clinicId);
        var opt = LowSoftOptions();
        var guard = h.CreateApiAbuseGuardService(abuseOpt: opt);

        ApiAbuseEvaluateResult? last = null;
        for (var i = 0; i < opt.SoftSamePathCount; i++)
            last = await guard.EvaluatePostAuthAsync(user.Id, "hash", ["Owner"], "GET", "/api/contracts", null);

        Assert.Equal(ApiAbuseVerdict.SoftThrottle, last!.Verdict);
        Assert.True(user.IsActive);
        Assert.Empty(h.Store.ApiAbuseIncidents);
        Assert.Empty(h.Sms.SentCalls);
    }

    [Fact]
    public async Task UcPlt17_Hard_Suspends_Revokes_SendsSms_WhenSmsLive()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var user = SeedOwner(h, clinicId);
        var session = new AuthSession
        {
            UserId = user.Id,
            TokenHash = "TOKENHASH1",
            DeviceLabel = "t"
        };
        h.Store.Sessions.Add(session);

        var opt = LowHardOptions();
        var guard = h.CreateApiAbuseGuardService(fixedOtp: null, abuseOpt: opt);

        ApiAbuseEvaluateResult? last = null;
        for (var i = 0; i < opt.HardSamePathCount; i++)
            last = await guard.EvaluatePostAuthAsync(user.Id, "TOKENHASH1", ["Owner"], "GET", "/api/contracts", "1.2.3.4");

        Assert.Equal(ApiAbuseVerdict.HardAbuse, last!.Verdict);
        Assert.False(user.IsActive);
        Assert.NotNull(session.RevokedAt);
        Assert.True(h.AbuseMemory.IsTokenDenied("TOKENHASH1"));
        Assert.Single(h.Store.ApiAbuseIncidents);
        Assert.True(h.Store.ApiAbuseIncidents[0].SmsNotified);
        Assert.Single(h.Sms.SentCalls);
        Assert.Equal("abuse_alert", h.Sms.SentCalls[0].TemplateName);
    }

    [Fact]
    public async Task UcPlt17_FixedOtp_Hard_NoSms()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var user = SeedOwner(h, clinicId);
        var opt = LowHardOptions();
        var guard = h.CreateApiAbuseGuardService(fixedOtp: "12345", abuseOpt: opt);

        for (var i = 0; i < opt.HardSamePathCount; i++)
            await guard.EvaluatePostAuthAsync(user.Id, "h2", ["Owner"], "GET", "/api/contracts", null);

        Assert.False(user.IsActive);
        Assert.Single(h.Store.ApiAbuseIncidents);
        Assert.False(h.Store.ApiAbuseIncidents[0].SmsNotified);
        Assert.Empty(h.Sms.SentCalls);
    }

    [Fact]
    public async Task UcPlt17_Platform_Exempt()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var user = SeedOwner(h, clinicId);
        h.Store.Roles.Add(new UserRoleAssignment { UserId = user.Id, Role = AppRole.Platform, ClinicId = clinicId });
        var opt = LowHardOptions();
        var guard = h.CreateApiAbuseGuardService(abuseOpt: opt);

        ApiAbuseEvaluateResult? last = null;
        for (var i = 0; i < opt.HardSamePathCount + 20; i++)
            last = await guard.EvaluatePostAuthAsync(user.Id, "plat", ["Platform"], "GET", "/api/evidence/gps", null);

        Assert.Equal(ApiAbuseVerdict.Allow, last!.Verdict);
        Assert.True(user.IsActive);
        Assert.Empty(h.Store.ApiAbuseIncidents);
        Assert.True(h.AbuseMemory.IsPlatformToken("plat"));
    }

    [Fact]
    public async Task UcPlt17_LegitimateBurst_Gps40_And_Fraud48_NoHard()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var user = SeedOwner(h, clinicId);
        var guard = h.CreateApiAbuseGuardService(abuseOpt: new ApiAbuseOptions());

        ApiAbuseEvaluateResult? last = null;
        for (var i = 0; i < 40; i++)
            last = await guard.EvaluatePostAuthAsync(user.Id, "b1", ["Owner"], "GET", $"/api/evidence/gps?patientId={Guid.NewGuid()}", null);
        Assert.Equal(ApiAbuseVerdict.Allow, last!.Verdict);

        for (var i = 0; i < 24; i++)
        {
            last = await guard.EvaluatePostAuthAsync(user.Id, "b1", ["Owner"], "POST", "/api/files", null);
            last = await guard.EvaluatePostAuthAsync(user.Id, "b1", ["Owner"], "POST", "/api/evidence/fraud/capture", null);
        }

        Assert.Equal(ApiAbuseVerdict.Allow, last!.Verdict);
        Assert.True(user.IsActive);
        Assert.Empty(h.Store.ApiAbuseIncidents);
    }

    [Fact]
    public async Task UcPlt17_Cooldown_OneSmsOnly()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var user = SeedOwner(h, clinicId);
        var opt = LowHardOptions();
        opt.IncidentCooldownSeconds = 3600;
        var guard = h.CreateApiAbuseGuardService(fixedOtp: null, abuseOpt: opt);

        for (var i = 0; i < opt.HardSamePathCount; i++)
            await guard.EvaluatePostAuthAsync(user.Id, "c1", ["Owner"], "GET", "/api/contracts", null);
        // موج دوم در همان cooldown — سرویس Enforce را دوباره اجرا نمی‌کند
        for (var i = 0; i < opt.HardSamePathCount; i++)
            await guard.EvaluatePostAuthAsync(user.Id, "c1", ["Owner"], "GET", "/api/contracts", null);

        Assert.Single(h.Store.ApiAbuseIncidents);
        Assert.Single(h.Sms.SentCalls);
    }

    [Fact]
    public void UcPlt17_Early_DeniedToken_NoDbPath()
    {
        var h = new ServiceHarness();
        h.AbuseMemory.DenyTokenHashes(["DENIED"], TimeSpan.FromHours(1));
        var guard = h.CreateApiAbuseGuardService();
        var r = guard.EvaluateEarly("DENIED", "9.9.9.9", "GET", "/api/contracts");
        Assert.Equal(ApiAbuseVerdict.Denied, r.Verdict);
    }

    [Fact]
    public async Task UcPlt17_LastSeen_Throttled()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var user = SeedOwner(h, clinicId);
        var raw = Convert.ToBase64String(Guid.NewGuid().ToByteArray()) + Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        var hash = TokenHashing.Sha256Hex(raw);
        h.Store.Sessions.Add(new AuthSession
        {
            UserId = user.Id,
            TokenHash = hash,
            DeviceLabel = "t",
            LastSeenAt = DateTime.UtcNow.AddMinutes(-10)
        });
        var auth = h.CreateAuthService();
        await auth.ValidateTokenAsync(raw);
        var saves1 = h.UnitOfWork.SaveCount;
        await auth.ValidateTokenAsync(raw);
        // دومین Validate در پنجرهٔ ۶۰ث نباید Save اضافه کند
        Assert.Equal(saves1, h.UnitOfWork.SaveCount);
    }

    private static User SeedOwner(ServiceHarness h, Guid clinicId)
    {
        var (_, owner) = h.SeedPatient(clinicId);
        return owner;
    }

    private static ApiAbuseOptions LowSoftOptions() => new()
    {
        SoftSamePathCount = 5,
        SoftTotalCount = 100,
        SoftWindowSeconds = 10,
        HardSamePathCount = 500,
        HardTotalCount = 1000,
        HardWindowSeconds = 60
    };

    private static ApiAbuseOptions LowHardOptions() => new()
    {
        SoftSamePathCount = 1000,
        SoftTotalCount = 1000,
        SoftWindowSeconds = 10,
        HardSamePathCount = 8,
        HardTotalCount = 1000,
        HardWindowSeconds = 60,
        IncidentCooldownSeconds = 3600
    };
}
