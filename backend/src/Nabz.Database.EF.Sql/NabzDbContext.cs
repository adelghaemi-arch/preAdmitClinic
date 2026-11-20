/*
 File: backend/src/Nabz.Database.EF.Sql/NabzDbContext.cs
 Description: DbContext دامنهٔ v1 نبض کلینیک — تنها محل مجاز EF
 Parent Dependencies: Nabz.Domain
 */

using Microsoft.EntityFrameworkCore;
using Nabz.Domain.Entities;

namespace Nabz.Database.EF.Sql;

public class NabzDbContext : DbContext
{
    public NabzDbContext(DbContextOptions<NabzDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserRoleAssignment> UserRoleAssignments => Set<UserRoleAssignment>();
    public DbSet<OtpChallenge> OtpChallenges => Set<OtpChallenge>();
    public DbSet<AuthSession> AuthSessions => Set<AuthSession>();
    public DbSet<MultiSessionAlert> MultiSessionAlerts => Set<MultiSessionAlert>();
    public DbSet<Clinic> Clinics => Set<Clinic>();
    public DbSet<CorporateContract> CorporateContracts => Set<CorporateContract>();
    public DbSet<ContractSupervisor> ContractSupervisors => Set<ContractSupervisor>();
    public DbSet<ContractMember> ContractMembers => Set<ContractMember>();
    public DbSet<ContractPackageRule> ContractPackageRules => Set<ContractPackageRule>();
    public DbSet<PackageLibraryRule> PackageLibraryRules => Set<PackageLibraryRule>();
    public DbSet<ContractSmsLog> ContractSmsLogs => Set<ContractSmsLog>();
    public DbSet<Patient> Patients => Set<Patient>();
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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(x => x.Mobile).IsUnique();
            e.Property(x => x.Mobile).HasMaxLength(20).IsRequired();
            e.Property(x => x.NationalId).HasMaxLength(20);
            e.Property(x => x.FullName).HasMaxLength(200);
        });

        modelBuilder.Entity<UserRoleAssignment>(e =>
        {
            e.HasOne(x => x.User).WithMany(x => x.Roles).HasForeignKey(x => x.UserId);
            e.HasIndex(x => new { x.UserId, x.Role, x.ContractId });
        });

        modelBuilder.Entity<OtpChallenge>(e =>
        {
            e.HasIndex(x => new { x.Mobile, x.ExpiresAt });
            e.Property(x => x.Mobile).HasMaxLength(20);
        });

        modelBuilder.Entity<AuthSession>(e =>
        {
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
            e.HasIndex(x => new { x.UserId, x.RevokedAt });
        });

        modelBuilder.Entity<Clinic>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200);
        });

        modelBuilder.Entity<CorporateContract>(e =>
        {
            e.HasOne(x => x.Clinic).WithMany().HasForeignKey(x => x.ClinicId);
            e.HasIndex(x => x.Code);
            e.HasOne(x => x.Supervisor).WithOne(x => x.Contract).HasForeignKey<ContractSupervisor>(x => x.ContractId);
        });

        modelBuilder.Entity<ContractMember>(e =>
        {
            e.HasOne(x => x.Contract).WithMany(x => x.Members).HasForeignKey(x => x.ContractId);
            e.HasIndex(x => x.InviteToken).IsUnique();
            e.HasIndex(x => new { x.ContractId, x.NationalId });
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.NationalId).HasMaxLength(20);
        });

        modelBuilder.Entity<Patient>(e =>
        {
            e.HasOne(x => x.Clinic).WithMany().HasForeignKey(x => x.ClinicId);
            e.HasOne(x => x.OwnerUser).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasIndex(x => new { x.ClinicId, x.NationalId });
            e.HasIndex(x => x.OwnerUserId);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.NationalId).HasMaxLength(20);
        });

        modelBuilder.Entity<FormDefinition>(e =>
        {
            // Guid کلاینت‌ساخته — ValueGeneratedOnAdd روی SQLite باعث DbUpdateConcurrencyException می‌شود
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
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId);
            e.HasOne(x => x.Form).WithMany().HasForeignKey(x => x.FormId);
            e.HasIndex(x => new { x.PatientId, x.FormId });
        });

        modelBuilder.Entity<FormAnswer>(e =>
        {
            e.HasOne(x => x.Response).WithMany(x => x.Answers).HasForeignKey(x => x.ResponseId);
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
        });

        modelBuilder.Entity<GpsPoint>(e =>
        {
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId);
        });

        modelBuilder.Entity<FraudCaptureSession>(e =>
        {
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId);
        });

        modelBuilder.Entity<EvidencePackage>(e =>
        {
            e.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId);
        });

        modelBuilder.Entity<ContractPackageRule>(e =>
        {
            e.HasOne(x => x.Contract).WithMany(x => x.PackageRules).HasForeignKey(x => x.ContractId);
        });

        modelBuilder.Entity<ContractSmsLog>(e =>
        {
            e.HasOne(x => x.Contract).WithMany(x => x.SmsLogs).HasForeignKey(x => x.ContractId);
        });

        modelBuilder.Entity<MultiSessionAlert>(e =>
        {
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
        });
    }
}
