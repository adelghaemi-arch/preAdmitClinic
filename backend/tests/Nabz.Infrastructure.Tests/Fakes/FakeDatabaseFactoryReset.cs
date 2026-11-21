/*
 File: backend/tests/Nabz.Infrastructure.Tests/Fakes/FakeDatabaseFactoryReset.cs
 Description: wipe حافظهٔ InMemoryStore به‌جای EnsureDeleted واقعی
 Parent Dependencies: IDatabaseFactoryReset, InMemoryStore
 */

using Nabz.Application.Abstractions;

namespace Nabz.Infrastructure.Tests.Fakes;

public sealed class FakeDatabaseFactoryReset(InMemoryStore store) : IDatabaseFactoryReset
{
    public int WipeCallCount { get; private set; }

    public Task WipeAndMigrateAsync(CancellationToken ct = default)
    {
        WipeCallCount++;
        store.Persons.Clear();
        store.Users.Clear();
        store.Roles.Clear();
        store.Otps.Clear();
        store.Sessions.Clear();
        store.Alerts.Clear();
        store.Clinics.Clear();
        store.Contracts.Clear();
        store.Members.Clear();
        store.Supervisors.Clear();
        store.PathwayRules.Clear();
        store.PathwayLibraryRules.Clear();
        store.ContractSmsLogs.Clear();
        store.Patients.Clear();
        store.ProfileRevisions.Clear();
        store.Forms.Clear();
        store.FormSections.Clear();
        store.FormItems.Clear();
        store.Responses.Clear();
        store.FormAnswers.Clear();
        store.DocumentGroups.Clear();
        store.DocumentFiles.Clear();
        store.Photos.Clear();
        store.GpsPoints.Clear();
        store.FraudSessions.Clear();
        store.EvidencePackages.Clear();
        store.PlatformSettings.Clear();
        store.PlatformAudit.Clear();
        store.SmsCampaignTemplates.Clear();
        store.ApiAbuseIncidents.Clear();
        return Task.CompletedTask;
    }
}
