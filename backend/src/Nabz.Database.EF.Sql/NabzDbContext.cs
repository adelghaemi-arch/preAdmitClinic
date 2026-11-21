/*
 File: backend/src/Nabz.Database.EF.Sql/NabzDbContext.cs
 Description: DbContext دامنهٔ v1 نفس — تنها محل مجاز EF
 Parent Dependencies: Nabz.Domain
 */

using Microsoft.EntityFrameworkCore;
using Nabz.Domain.Entities;

namespace Nabz.Database.EF.Sql;

public class NabzDbContext : DbContext
{
    public NabzDbContext(DbContextOptions<NabzDbContext> options) : base(options) { }

    public DbSet<Person> Persons => Set<Person>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRoleAssignment> UserRoleAssignments => Set<UserRoleAssignment>();
    public DbSet<OtpChallenge> OtpChallenges => Set<OtpChallenge>();
    public DbSet<AuthSession> AuthSessions => Set<AuthSession>();
    public DbSet<MultiSessionAlert> MultiSessionAlerts => Set<MultiSessionAlert>();
    public DbSet<Clinic> Clinics => Set<Clinic>();
    public DbSet<CorporateContract> CorporateContracts => Set<CorporateContract>();
    public DbSet<ContractSupervisor> ContractSupervisors => Set<ContractSupervisor>();
    public DbSet<ContractMember> ContractMembers => Set<ContractMember>();
    public DbSet<ContractPathwayRule> ContractPathwayRules => Set<ContractPathwayRule>();
    public DbSet<PathwayLibraryRule> PathwayLibraryRules => Set<PathwayLibraryRule>();
    public DbSet<ContractSmsLog> ContractSmsLogs => Set<ContractSmsLog>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<PatientProfileRevision> PatientProfileRevisions => Set<PatientProfileRevision>();
    public DbSet<FormDefinition> FormDefinitions => Set<FormDefinition>();
    public DbSet<FormSection> FormSections => Set<FormSection>();
    public DbSet<FormItem> FormItems => Set<FormItem>();
    public DbSet<FormResponse> FormResponses => Set<FormResponse>();
    public DbSet<FormAnswer> FormAnswers => Set<FormAnswer>();
    public DbSet<IntakeDocumentGroup> IntakeDocumentGroups => Set<IntakeDocumentGroup>();
    public DbSet<IntakeDocumentFile> IntakeDocumentFiles => Set<IntakeDocumentFile>();
    public DbSet<PatientPhoto> PatientPhotos => Set<PatientPhoto>();
    public DbSet<GpsPoint> GpsPoints => Set<GpsPoint>();
    public DbSet<FraudCaptureSession> FraudCaptureSessions => Set<FraudCaptureSession>();
    public DbSet<EvidencePackage> EvidencePackages => Set<EvidencePackage>();
    public DbSet<PlatformSettings> PlatformSettings => Set<PlatformSettings>();
    public DbSet<PlatformAuditEntry> PlatformAuditEntries => Set<PlatformAuditEntry>();
    public DbSet<SmsCampaignTemplate> SmsCampaignTemplates => Set<SmsCampaignTemplate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Person>(e =>
        {
            // موبایل تکراری مجاز (چند هویت روی یک شماره)
            e.HasIndex(x => x.Mobile);
            e.Property(x => x.Mobile).HasMaxLength(20).IsRequired();
            e.Property(x => x.NationalId).HasMaxLength(20);
            e.HasIndex(x => x.NationalId)
                .IsUnique()
                .HasFilter("NationalId IS NOT NULL AND NationalId <> ''");
            e.Property(x => x.FirstName).HasMaxLength(100).IsRequired();
            e.Property(x => x.LastName).HasMaxLength(100).IsRequired();
            e.Property(x => x.FatherName).HasMaxLength(100);
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasOne(x => x.Person).WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.PersonId).IsUnique();
        });

        modelBuilder.Entity<UserRoleAssignment>(e =>
        {
            e.HasOne(x => x.User).WithMany(x => x.Roles).HasForeignKey(x => x.UserId);
            e.HasIndex(x => new { x.UserId, x.Role, x.ContractId });
        });

        modelBuilder.Entity<OtpChallenge>(e =>
        {
            e.HasIndex(x => new { x.Mobile, x.Purpose, x.ExpiresAt });
            e.Property(x => x.Mobile).HasMaxLength(20);
            e.Property(x => x.Purpose).HasMaxLength(32).IsRequired();
        });

        modelBuilder.Entity<AuthSession>(e =>
        {
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).IsRequired(false);
            e.HasIndex(x => new { x.UserId, x.RevokedAt });
            e.Property(x => x.PendingMobile).HasMaxLength(20);
            e.Property(x => x.LoginMobile).HasMaxLength(20);
        });

        modelBuilder.Entity<Clinic>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.PreAdmitSupportPhone).HasMaxLength(32);
            e.Property(x => x.SmsSenderNumber).HasMaxLength(64);
            e.Property(x => x.KavenegarApiKey).HasMaxLength(200);
            e.Property(x => x.KavenegarOtpTemplate).HasMaxLength(120);
            e.Property(x => x.ToubaUsername).HasMaxLength(120);
            e.Property(x => x.ToubaPassword).HasMaxLength(200);
            e.Property(x => x.ToubaSendUrl).HasMaxLength(300);
            e.Property(x => x.ToubaOtpMessageTemplate).HasMaxLength(500);
        });

        modelBuilder.Entity<CorporateContract>(e =>
        {
            e.HasOne(x => x.Clinic).WithMany().HasForeignKey(x => x.ClinicId);
            e.HasIndex(x => x.Code);
            e.HasOne(x => x.Supervisor).WithOne(x => x.Contract).HasForeignKey<ContractSupervisor>(x => x.ContractId);
        });

        modelBuilder.Entity<ContractSupervisor>(e =>
        {
            e.HasOne(x => x.Person).WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ContractMember>(e =>
        {
            e.HasOne(x => x.Contract).WithMany(x => x.Members).HasForeignKey(x => x.ContractId);
            e.HasOne(x => x.Person).WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.InviteToken).IsUnique();
            // در یک قرارداد یک Person تکراری مجاز نیست
            e.HasIndex(x => new { x.ContractId, x.PersonId }).IsUnique();
            e.Property(x => x.IntroducedMobile).HasMaxLength(20);
        });

        modelBuilder.Entity<Patient>(e =>
        {
            e.HasOne(x => x.Clinic).WithMany().HasForeignKey(x => x.ClinicId);
            e.HasOne(x => x.Person).WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.OwnerUser).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasIndex(x => new { x.ClinicId, x.PersonId }).IsUnique();
            e.HasIndex(x => x.OwnerUserId)
                .IsUnique()
                .HasFilter("OwnerUserId IS NOT NULL");
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.HomePostalCode).HasMaxLength(10);
        });

        modelBuilder.Entity<PatientProfileRevision>(e =>
        {
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId);
            e.HasOne(x => x.ChangedByUser).WithMany().HasForeignKey(x => x.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.PatientId, x.At });
            e.Property(x => x.Field).HasMaxLength(64).IsRequired();
            e.Property(x => x.Source).HasMaxLength(32).IsRequired();
            e.Property(x => x.OldValue).HasMaxLength(2000);
            e.Property(x => x.NewValue).HasMaxLength(2000);
        });

        modelBuilder.Entity<FormDefinition>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.HasIndex(x => new { x.ClinicId, x.Code, x.Version });
        });

        modelBuilder.Entity<FormSection>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.HasOne(x => x.Form).WithMany(x => x.Sections).HasForeignKey(x => x.FormId);
        });

        modelBuilder.Entity<FormItem>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.HasOne(x => x.Form).WithMany(x => x.Items).HasForeignKey(x => x.FormId);
            e.HasOne(x => x.Section).WithMany().HasForeignKey(x => x.SectionId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<FormResponse>(e =>
        {
            // Id از EntityBase کلاینت‌ساید است؛ ValueGeneratedOnAdd باعث state غلط و 409 روی insert می‌شد
            e.Property(x => x.Id).ValueGeneratedNever();
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId);
            e.HasOne(x => x.Form).WithMany().HasForeignKey(x => x.FormId);
            e.HasIndex(x => new { x.PatientId, x.FormId });
        });

        modelBuilder.Entity<FormAnswer>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            // طول محدود برای ایندکس یکتا (upsert بر اساس ItemCode)
            e.Property(x => x.ItemCode).HasMaxLength(128).IsRequired();
            e.HasOne(x => x.Response).WithMany(x => x.Answers).HasForeignKey(x => x.ResponseId);
            e.HasIndex(x => new { x.ResponseId, x.ItemCode }).IsUnique();
        });

        modelBuilder.Entity<IntakeDocumentGroup>(e =>
        {
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId);
        });

        modelBuilder.Entity<IntakeDocumentFile>(e =>
        {
            e.HasOne(x => x.Group).WithMany(x => x.Files).HasForeignKey(x => x.GroupId);
        });

        modelBuilder.Entity<PatientPhoto>(e =>
        {
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId);
            e.Property(x => x.MimeType).HasMaxLength(100);
        });

        modelBuilder.Entity<GpsPoint>(e =>
        {
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId);
        });

        modelBuilder.Entity<FraudCaptureSession>(e =>
        {
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId);
            e.Property(x => x.WireWrapKey).HasMaxLength(128);
        });

        modelBuilder.Entity<EvidencePackage>(e =>
        {
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId);
        });

        modelBuilder.Entity<ContractPathwayRule>(e =>
        {
            e.HasOne(x => x.Contract).WithMany(x => x.PathwayRules).HasForeignKey(x => x.ContractId);
        });

        modelBuilder.Entity<ContractSmsLog>(e =>
        {
            e.HasOne(x => x.Contract).WithMany(x => x.SmsLogs).HasForeignKey(x => x.ContractId);
        });

        modelBuilder.Entity<MultiSessionAlert>(e =>
        {
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<SmsCampaignTemplate>(e =>
        {
            e.Property(x => x.Code).HasMaxLength(64).IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.ProviderTemplateName).HasMaxLength(120);
            e.Property(x => x.TokenKeysJson).HasMaxLength(500).IsRequired();
            e.HasIndex(x => x.SortOrder);
        });
    }
}
