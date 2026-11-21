/*
 File: backend/tests/Nabz.Infrastructure.Tests/Fakes/InMemoryStore.cs
 Description: ذخیرهٔ متمرکز لیست موجودیت‌ها برای fake repositoryها
 Parent Dependencies: Nabz.Domain.Entities
 */

using Nabz.Domain.Entities;

namespace Nabz.Infrastructure.Tests.Fakes;

public sealed class InMemoryStore
{
    public List<Person> Persons { get; } = [];
    public List<User> Users { get; } = [];
    public List<UserRoleAssignment> Roles { get; } = [];
    public List<OtpChallenge> Otps { get; } = [];
    public List<AuthSession> Sessions { get; } = [];
    public List<MultiSessionAlert> Alerts { get; } = [];
    public List<Clinic> Clinics { get; } = [];
    public List<CorporateContract> Contracts { get; } = [];
    public List<ContractMember> Members { get; } = [];
    public List<ContractSupervisor> Supervisors { get; } = [];
    public List<ContractPathwayRule> PathwayRules { get; } = [];
    public List<PathwayLibraryRule> PathwayLibraryRules { get; } = [];
    public List<ContractSmsLog> ContractSmsLogs { get; } = [];
    public List<Patient> Patients { get; } = [];
    public List<PatientProfileRevision> ProfileRevisions { get; } = [];
    public List<FormDefinition> Forms { get; } = [];
    public List<FormSection> FormSections { get; } = [];
    public List<FormItem> FormItems { get; } = [];
    public List<FormResponse> Responses { get; } = [];
    public List<FormAnswer> FormAnswers { get; } = [];
    public List<IntakeDocumentGroup> DocumentGroups { get; } = [];
    public List<IntakeDocumentFile> DocumentFiles { get; } = [];
    public List<PatientPhoto> Photos { get; } = [];
    public List<GpsPoint> GpsPoints { get; } = [];
    public List<FraudCaptureSession> FraudSessions { get; } = [];
    public List<EvidencePackage> EvidencePackages { get; } = [];
    public List<PlatformSettings> PlatformSettings { get; } = [];
    public List<PlatformAuditEntry> PlatformAudit { get; } = [];
    public List<SmsCampaignTemplate> SmsCampaignTemplates { get; } = [];
    public List<ApiAbuseIncident> ApiAbuseIncidents { get; } = [];

    /// <summary>همگام‌سازی navigationهای تغییر یافته در حافظه با لیست‌های flat برای fake repository.</summary>
    public void SyncNavigation()
    {
        foreach (var c in Contracts)
        {
            if (c.Supervisor is not null && !Supervisors.Contains(c.Supervisor))
                Supervisors.Add(c.Supervisor);

            foreach (var r in c.PathwayRules)
            {
                if (!PathwayRules.Contains(r))
                    PathwayRules.Add(r);
            }
        }

        foreach (var f in Forms)
        {
            foreach (var s in f.Sections)
            {
                if (!FormSections.Contains(s))
                    FormSections.Add(s);
            }

            foreach (var i in f.Items)
            {
                if (!FormItems.Contains(i))
                    FormItems.Add(i);
            }
        }

        foreach (var g in DocumentGroups)
        {
            foreach (var file in g.Files)
            {
                if (!DocumentFiles.Contains(file))
                    DocumentFiles.Add(file);
            }
        }

        foreach (var r in Responses)
        {
            foreach (var a in r.Answers)
            {
                if (!FormAnswers.Contains(a))
                    FormAnswers.Add(a);
            }
        }

        foreach (var u in Users)
        {
            u.Roles = Roles.Where(x => x.UserId == u.Id).ToList();
            u.Person = Persons.FirstOrDefault(p => p.Id == u.PersonId) ?? u.Person;
        }

        foreach (var p in Patients)
            p.Person = Persons.FirstOrDefault(x => x.Id == p.PersonId) ?? p.Person;

        foreach (var m in Members)
            m.Person = Persons.FirstOrDefault(x => x.Id == m.PersonId) ?? m.Person;

        foreach (var s in Supervisors)
            s.Person = Persons.FirstOrDefault(x => x.Id == s.PersonId) ?? s.Person;
    }
}