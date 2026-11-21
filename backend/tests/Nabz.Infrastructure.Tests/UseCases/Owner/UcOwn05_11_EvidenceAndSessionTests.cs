/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn05_11_EvidenceAndSessionTests.cs
 Description: UC-OWN-05 تا 11 — عکس، مدارک، ضدتقلب، GPS، revoke نشست
 Parent Dependencies: ServiceHarness
 */

using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Owner;

public sealed class UcOwn05_11_EvidenceAndSessionTests
{
    [Fact]
    [Trait("UC", "UC-OWN-05")]
    public async Task UC_OWN_05_HappyPath_UpdatePatientPhoto()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();

        await evidence.UpdatePatientPhotoAsync(patient.Id, owner.Id, "uploads/portrait.jpg");

        Assert.Single(h.Store.Photos);
        Assert.Equal(UserPhotoKind.Portrait, h.Store.Photos[0].Kind);
    }

    [Fact]
    [Trait("UC", "UC-OWN-06")]
    public async Task UC_OWN_06_HappyPath_AddDocumentGroup()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();

        var group = await evidence.AddDocumentGroupAsync(
            patient.Id, owner.Id, "lab", "آزمایش", null, null);

        Assert.Equal("lab", group.DocumentType);
        Assert.Equal(1, h.Store.DocumentGroups.Count);
    }

    [Fact]
    [Trait("UC", "UC-OWN-07")]
    public async Task UC_OWN_07_HappyPath_AddDocumentFiles()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings(maxFilesPerGroup: 2);
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();
        var group = await evidence.AddDocumentGroupAsync(patient.Id, owner.Id, "lab", "آزمایش", null, null);

        await evidence.AddDocumentFilesAsync(group.Id, owner.Id,
        [
            ("f1.pdf", "application/pdf", "k1", 100, null),
            ("f2.pdf", "application/pdf", "k2", 100, null)
        ]);

        Assert.Equal(2, h.Store.DocumentFiles.Count);
    }

    /// <summary>Nx: تجاوز از سقف فایل در گروه.</summary>
    [Fact]
    [Trait("UC", "UC-OWN-07")]
    public async Task UC_OWN_07_Nx_MaxFilesExceeded_Throws()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings(maxFilesPerGroup: 1);
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();
        var group = await evidence.AddDocumentGroupAsync(patient.Id, owner.Id, "lab", "آزمایش", null, null);

        await evidence.AddDocumentFilesAsync(group.Id, owner.Id,
            [("f1.pdf", "application/pdf", "k1", 100, null)]);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            evidence.AddDocumentFilesAsync(group.Id, owner.Id,
                [("f2.pdf", "application/pdf", "k2", 100, null)]));
    }

    [Fact]
    [Trait("UC", "UC-OWN-08")]
    public async Task UC_OWN_08_HappyPath_RemoveDocumentGroup()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();
        var group = await evidence.AddDocumentGroupAsync(patient.Id, owner.Id, "lab", "آزمایش", null, null);

        await evidence.RemoveDocumentGroupAsync(group.Id, owner.Id);

        Assert.Empty(h.Store.DocumentGroups);
    }

    [Fact]
    [Trait("UC", "UC-OWN-09")]
    public async Task UC_OWN_09_HappyPath_FraudSessionLifecycle()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();

        var config = await evidence.GetFraudCaptureConfigAsync();
        Assert.Equal(7, config.FraudAutoCaptureSeconds);
        Assert.True(config.FraudWatchEnabled);

        var started = await evidence.StartFraudSessionAsync(patient.Id, owner.Id);
        Assert.False(string.IsNullOrWhiteSpace(started.WrapKey));
        h.Files.Seed("frames/1.jpg", [0xFF, 0xD8, 0xFF, 0xD9]);
        h.Files.Seed("frames/2.jpg", [0xFF, 0xD8, 0xFF, 0xD9]);
        await evidence.CaptureFraudFrameAsync(started.SessionId, owner.Id, "frames/1.jpg", 35.7, 51.4, 5);
        await evidence.CaptureFraudFrameAsync(started.SessionId, owner.Id, "frames/2.jpg", null, null, null);
        await evidence.EndFraudSessionAsync(started.SessionId, owner.Id);

        var session = h.Store.FraudSessions.Single(s => s.Id == started.SessionId);
        Assert.NotNull(session.EndedAt);
        Assert.Equal(started.WrapKey, session.WireWrapKey);
        Assert.Equal(2, h.Store.Photos.Count(p => p.SessionId == started.SessionId));
    }

    [Fact]
    [Trait("UC", "UC-OWN-09")]
    public async Task UC_OWN_09_Nx_CaptureWithoutBlob_Throws()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();
        var started = await evidence.StartFraudSessionAsync(patient.Id, owner.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            evidence.CaptureFraudFrameAsync(started.SessionId, owner.Id, "missing/key.jpg", null, null, null));
    }

    /// <summary>Nx: فلگ fraudWatch خاموش ⇒ شروع نشست ممنوع.</summary>
    [Fact]
    [Trait("UC", "UC-OWN-09")]
    public async Task UC_OWN_09_Nx_FraudWatchDisabled_Throws()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        h.Store.PlatformSettings[0].FeatureFlagsJson =
            """{"fraudWatch":false,"gpsTracking":true,"multiClinicRegistry":false,"corporateContracts":true,"multiSessionWatch":true}""";
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            evidence.StartFraudSessionAsync(patient.Id, owner.Id));
    }

    [Fact]
    [Trait("UC", "UC-OWN-10")]
    public async Task UC_OWN_10_HappyPath_RecordGps()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();

        await evidence.RecordGpsAsync(patient.Id, owner.Id, 35.7, 51.4, 10, "owner_app");

        Assert.Single(h.Store.GpsPoints);
    }

    /// <summary>Nx: GPS توسط غیرمالک رد می‌شود (همان الگوی UC-OWN-10 doc).</summary>
    [Fact]
    [Trait("UC", "UC-OWN-10")]
    public async Task UC_OWN_10_Nx_NonOwnerGpsRejected()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, _) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            evidence.RecordGpsAsync(patient.Id, Guid.NewGuid(), 1, 2, 1, "owner_app"));
    }

    [Fact]
    [Trait("UC", "UC-OWN-11")]
    public async Task UC_OWN_11_HappyPath_RevokeSession()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (_, owner) = h.SeedPatient(clinicId);
        var session = new AuthSession
        {
            UserId = owner.Id,
            TokenHash = "hash",
            DeviceLabel = "web"
        };
        h.Store.Sessions.Add(session);
        var auth = h.CreateAuthService();

        var ok = await auth.RevokeSessionAsync(session.Id, owner.Id, allowOtherUsers: false);

        Assert.True(ok);
        Assert.NotNull(h.Store.Sessions[0].RevokedAt);
    }
}