/*
 File: backend/tests/Nabz.Infrastructure.Tests/Support/ServiceHarness.cs
 Description: هارنس واحد تست — store، fake repositoryها و ساخت سرویس‌های Infrastructure
 Parent Dependencies: Fakes, Nabz.Infrastructure.Services
 */

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Nabz.Application.Options;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Services;
using Nabz.Infrastructure.Tests.Fakes;

namespace Nabz.Infrastructure.Tests.Support;

public sealed class ServiceHarness
{
    public InMemoryStore Store { get; } = new();
    public FakeSmsSender Sms { get; } = new();
    public FakeUnitOfWork UnitOfWork { get; }

    public FakeUserRepository Users { get; }
    public FakeAuthRepository Auth { get; }
    public FakeClinicRepository Clinics { get; }
    public FakeContractRepository Contracts { get; }
    public FakePatientRepository Patients { get; }
    public FakeFormRepository Forms { get; }
    public FakeEvidenceRepository Evidence { get; }
    public FakePlatformRepository Platform { get; }

    public ServiceHarness()
    {
        UnitOfWork = new FakeUnitOfWork(Store);
        Users = new FakeUserRepository(Store);
        Auth = new FakeAuthRepository(Store);
        Clinics = new FakeClinicRepository(Store);
        Contracts = new FakeContractRepository(Store);
        Patients = new FakePatientRepository(Store);
        Forms = new FakeFormRepository(Store);
        Evidence = new FakeEvidenceRepository(Store);
        Platform = new FakePlatformRepository(Store);
    }

    public AuthService CreateAuthService(string fixedOtp = "12345")
    {
        var authOptions = Options.Create(new AuthOptions { FixedOtp = fixedOtp });
        var kavenegarOptions = Options.Create(new KavenegarOptions { InviteTemplate = "invite", OtpTemplate = "otp" });
        return new AuthService(
            Users, Auth, Contracts, Patients, Clinics, UnitOfWork, Sms,
            authOptions, kavenegarOptions, NullLogger<AuthService>.Instance);
    }

    public FormService CreateFormService() => new(Forms, Patients, UnitOfWork);

    public EvidenceService CreateEvidenceService() => new(Evidence, Patients, Platform, UnitOfWork);

    public PatientService CreatePatientService() =>
        new(Patients, Contracts, Users, Forms, Evidence, Clinics, UnitOfWork);

    public ContractService CreateContractService(string fixedOtp = "12345")
    {
        var authOptions = Options.Create(new AuthOptions { FixedOtp = fixedOtp });
        var kavenegarOptions = Options.Create(new KavenegarOptions { InviteTemplate = "invite" });
        return new ContractService(
            Contracts, UnitOfWork, Sms, authOptions, kavenegarOptions, NullLogger<ContractService>.Instance);
    }

    public UserAdminService CreateUserAdminService() => new(Users, Platform, UnitOfWork);

    public PlatformService CreatePlatformService() =>
        new(Platform, Clinics, Users, Auth, CreateUserAdminService(), UnitOfWork);

    public Guid SeedClinic(string name = "کلینیک تست")
    {
        var clinicId = Guid.NewGuid();
        Store.Clinics.Add(new Clinic
        {
            Id = clinicId,
            Name = name,
            IsCurrentTenant = true,
            Status = ClinicStatus.Active
        });
        return clinicId;
    }

    public (Patient Patient, User Owner) SeedPatient(Guid clinicId, string? phone = null, Guid? ownerUserId = null)
    {
        var ownerId = ownerUserId ?? Guid.NewGuid();
        var mobile = phone ?? "09133751001";
        var owner = new User
        {
            Id = ownerId,
            Mobile = mobile,
            FullName = "بیمار تست",
            NationalId = "0012345678",
            IsActive = true
        };
        Store.Users.Add(owner);
        Store.Roles.Add(new UserRoleAssignment { UserId = ownerId, Role = AppRole.Owner, ClinicId = clinicId });

        var patient = new Patient
        {
            ClinicId = clinicId,
            OwnerUserId = ownerId,
            Phone = mobile,
            FullName = owner.FullName,
            NationalId = owner.NationalId ?? "0012345678",
            Age = 30,
            Gender = "مرد"
        };
        Store.Patients.Add(patient);
        Store.SyncNavigation();
        return (patient, owner);
    }

    public (Guid FormId, Guid ItemId, string ItemCode) SeedPublishedForm(Guid clinicId, string code = "INTAKE-01")
    {
        var form = new FormDefinition
        {
            ClinicId = clinicId,
            Code = code,
            Title = "پرسشنامه پیش‌پذیرش",
            Status = FormPublishStatus.Published,
            TargetAudienceJson = "{}",
            Version = 1
        };
        var section = new FormSection
        {
            FormId = form.Id,
            Code = "SEC-1",
            Title = "اطلاعات پایه",
            SortOrder = 1
        };
        var item = new FormItem
        {
            FormId = form.Id,
            SectionId = section.Id,
            Code = "Q-HEALTH-OK",
            LabelFa = "آیا سالم هستید؟",
            InputType = "text",
            Required = true,
            SortOrder = 1
        };
        Store.Forms.Add(form);
        Store.FormSections.Add(section);
        Store.FormItems.Add(item);
        form.Sections.Add(section);
        form.Items.Add(item);
        return (form.Id, item.Id, item.Code);
    }

    public void SeedPlatformSettings(
        int maxGroups = 20,
        int maxFilesPerGroup = 20,
        long maxBytes = 5 * 1024 * 1024)
    {
        if (Store.PlatformSettings.Count > 0) return;
        Store.PlatformSettings.Add(new PlatformSettings
        {
            BrandName = "نبض تست",
            OtpLength = 5,
            OtpTtlSeconds = 120,
            IntakeDocumentMaxGroups = maxGroups,
            IntakeDocumentMaxFilesPerGroup = maxFilesPerGroup,
            IntakeDocumentMaxBytes = maxBytes
        });
    }
}