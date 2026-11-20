/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt01_12_PlatformTests.cs
 Description: UC-PLT-01 تا 12 — پلتفرم: کلینیک، تنظیمات، کاربران، fraud، audit
 Parent Dependencies: ServiceHarness
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Platform;

public sealed class UcPlt01_12_PlatformTests
{
    [Fact]
    [Trait("UC", "UC-PLT-01")]
    public async Task UC_PLT_01_HappyPath_UpdateClinicStatus()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var platform = h.CreatePlatformService();

        await platform.UpdateClinicStatusAsync(clinicId, ClinicStatus.Suspended, "platform-admin");

        Assert.Equal(ClinicStatus.Suspended, h.Store.Clinics[0].Status);
        Assert.Contains(h.Store.PlatformAudit, a => a.Action == "PLATFORM_UPDATE_CLINIC_STATUS");
    }

    [Fact]
    [Trait("UC", "UC-PLT-02")]
    public async Task UC_PLT_02_HappyPath_GetAndUpdateSettings()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var platform = h.CreatePlatformService();

        var current = await platform.GetSettingsAsync();
        await platform.UpdateSettingsAsync(
            new PlatformSettingsDto("برند جدید", 5, 120, 10, 5), "platform-admin");

        var updated = await platform.GetSettingsAsync();
        Assert.Equal("برند جدید", updated.BrandName);
        Assert.Equal(10, updated.IntakeDocumentMaxGroups);
    }

    [Fact]
    [Trait("UC", "UC-PLT-04")]
    public async Task UC_PLT_04_HappyPath_UpsertUserAllRoles()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var platform = h.CreatePlatformService();

        var dto = await platform.UpsertUserAsync(null, "کاربر پلتفرم", "09135556677", null, AppRole.Platform, clinicId, null);

        Assert.Contains("Platform", dto.Roles);
    }

    [Fact]
    [Trait("UC", "UC-PLT-05")]
    public async Task UC_PLT_05_HappyPath_SetUserActive()
    {
        var h = new ServiceHarness();
        var user = new User { Mobile = "09136667788", FullName = "فعال", IsActive = true };
        h.Store.Users.Add(user);
        var platform = h.CreatePlatformService();

        await platform.SetUserActiveAsync(user.Id, false, "platform-admin");

        Assert.False(h.Store.Users[0].IsActive);
    }

    [Fact]
    [Trait("UC", "UC-PLT-06")]
    public async Task UC_PLT_06_HappyPath_ResetUserAccess_RevokesSessions()
    {
        var h = new ServiceHarness();
        var user = new User { Mobile = "09137778899", FullName = "کاربر", IsActive = false };
        h.Store.Users.Add(user);
        h.Store.Sessions.Add(new AuthSession { UserId = user.Id, TokenHash = "t1" });
        h.Store.Sessions.Add(new AuthSession { UserId = user.Id, TokenHash = "t2" });
        var platform = h.CreatePlatformService();

        await platform.ResetUserAccessAsync(user.Id, "platform-admin");

        Assert.True(h.Store.Users[0].IsActive);
        Assert.All(h.Store.Sessions, s => Assert.NotNull(s.RevokedAt));
    }

    [Fact]
    [Trait("UC", "UC-PLT-07")]
    public async Task UC_PLT_07_HappyPath_ReviewFraudSession()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();
        var sessionId = await evidence.StartFraudSessionAsync(patient.Id, owner.Id);

        await evidence.ReviewFraudSessionAsync(sessionId, FraudReviewStatus.Cleared, "ok", "reviewer");

        Assert.Equal(FraudReviewStatus.Cleared, h.Store.FraudSessions[0].ReviewStatus);
    }

    [Fact]
    [Trait("UC", "UC-PLT-08")]
    public async Task UC_PLT_08_HappyPath_ReviewMultiSessionAlert()
    {
        var h = new ServiceHarness();
        var userId = Guid.NewGuid();
        var alert = new MultiSessionAlert { UserId = userId, ActiveSessionCount = 3 };
        h.Store.Alerts.Add(alert);
        var platform = h.CreatePlatformService();

        await platform.ReviewMultiSessionAsync(alert.Id, FraudReviewStatus.Flagged, "check", "reviewer");

        Assert.Equal(FraudReviewStatus.Flagged, h.Store.Alerts[0].ReviewStatus);
    }

    [Fact]
    [Trait("UC", "UC-PLT-09")]
    public async Task UC_PLT_09_HappyPath_ListGpsByPatient()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();
        await evidence.RecordGpsAsync(patient.Id, owner.Id, 35.1, 51.2, 8, "owner_app");

        var points = await evidence.ListGpsByPatientAsync(patient.Id);

        Assert.Single(points);
    }

    /// <summary>Na: بیمار بدون GPS — لیست خالی.</summary>
    [Fact]
    [Trait("UC", "UC-PLT-09")]
    public async Task UC_PLT_09_Na_NoGps_ReturnsEmpty()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, _) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();

        var points = await evidence.ListGpsByPatientAsync(patient.Id);

        Assert.Empty(points);
    }

    [Fact]
    [Trait("UC", "UC-PLT-10")]
    public async Task UC_PLT_10_HappyPath_RevokeAllSessionsViaAuth()
    {
        var h = new ServiceHarness();
        var userId = Guid.NewGuid();
        h.Store.Sessions.Add(new AuthSession { UserId = userId, TokenHash = "a" });
        var auth = h.CreateAuthService();

        var n = await auth.RevokeAllUserSessionsAsync(userId);

        Assert.Equal(1, n);
    }

    [Fact]
    [Trait("UC", "UC-PLT-11")]
    public async Task UC_PLT_11_HappyPath_AuditTrail()
    {
        var h = new ServiceHarness();
        var platform = h.CreatePlatformService();

        await platform.AppendAuditAsync("actor", "TEST_ACTION", "target", "detail");
        var list = await platform.ListAuditAsync(10);

        Assert.Contains(list, a => a.Action == "TEST_ACTION");
    }

    [Fact]
    [Trait("UC", "UC-PLT-12")]
    public async Task UC_PLT_12_HappyPath_HealthViaSettingsRead()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var platform = h.CreatePlatformService();

        var settings = await platform.GetSettingsAsync();

        Assert.False(string.IsNullOrWhiteSpace(settings.BrandName));
        Assert.True(settings.OtpLength > 0);
    }
}