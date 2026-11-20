/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Platform/UcPlt14_FileVaultTests.cs
 Description: UC-PLT-14 — soft/hard خزانه فایل و پنهان‌شدن از لیست عادی
 Parent Dependencies: ServiceHarness, FakeFileStorage
 */

using Nabz.Application.Abstractions;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Platform;

public sealed class UcPlt14_FileVaultTests
{
    [Fact]
    [Trait("UC", "UC-PLT-14")]
    public async Task UC_PLT_14_ResolvePrefix_UsesNationalIdDigits()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();

        var prefix = await evidence.ResolveNationalIdPrefixForUploadAsync(patient.Id, owner.Id, isPlatform: false);

        Assert.Equal("001", prefix);
    }

    [Fact]
    [Trait("UC", "UC-PLT-14")]
    public async Task UC_PLT_14_SoftDelete_HidesFromActiveList_ShowsInTrash()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();

        var group = await evidence.AddDocumentGroupAsync(patient.Id, owner.Id, "lab", "آزمایش", null, null);
        await evidence.AddDocumentFilesAsync(group.Id, owner.Id,
        [
            ("lab.pdf", "application/pdf", "2026/001/lab.pdf", 12, null)
        ]);
        var fileId = h.Store.DocumentFiles.Single().Id;

        await evidence.SoftDeleteVaultFilesAsync([fileId], []);

        Assert.NotNull(h.Store.DocumentFiles.Single().DeletedAt);
        Assert.Empty(await evidence.ListVaultFilesAsync(trashOnly: false));
        var trash = await evidence.ListVaultFilesAsync(trashOnly: true);
        Assert.Contains(trash, r => r.Id == fileId && r.DeletedAt is not null);

        var ownerDocs = await evidence.ListDocumentsByPatientAsync(patient.Id);
        Assert.Empty(ownerDocs.Single().Files);
    }

    [Fact]
    [Trait("UC", "UC-PLT-14")]
    public async Task UC_PLT_14_HardDelete_RemovesBlobAndRow()
    {
        var h = new ServiceHarness();
        h.SeedPlatformSettings();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId);
        var evidence = h.CreateEvidenceService();

        await using var ms = new MemoryStream(new byte[] { 1, 2, 3, 4 });
        var saved = await h.Files.SaveAsync(ms, "portrait.jpg", "image/jpeg", new StorageSaveContext("001"));
        await evidence.UpdatePatientPhotoAsync(patient.Id, owner.Id, saved.StorageKey);
        var photoId = h.Store.Photos.Single().Id;
        Assert.Single(h.Files.Files);

        await evidence.HardDeleteVaultFilesAsync([], [photoId]);

        Assert.Empty(h.Store.Photos);
        Assert.Empty(h.Files.Files);
        Assert.True(h.Files.DeleteCallCount >= 1);
    }

    [Fact]
    [Trait("UC", "UC-PLT-14")]
    public async Task UC_PLT_14_FakeStorage_SaveKeyIncludesNationalPrefix()
    {
        var h = new ServiceHarness();
        await using var ms = new MemoryStream(new byte[] { 7 });
        var saved = await h.Files.SaveAsync(ms, "x.jpg", "image/jpeg", new StorageSaveContext("1904636919"));
        var year = DateTime.UtcNow.ToString("yyyy");
        Assert.StartsWith($"{year}/190/", saved.StorageKey);
    }
}
