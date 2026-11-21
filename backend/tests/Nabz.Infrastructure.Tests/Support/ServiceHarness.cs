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
    public FakeFileStorage Files { get; } = new();
    public FakeDatabaseFactoryReset DatabaseReset { get; }
    public FakeAppDataSeeder Seeder { get; }

    public FakePersonRepository Persons { get; }
    public FakeUserRepository Users { get; }
    public FakeAuthRepository Auth { get; }
    public FakeClinicRepository Clinics { get; }
    public FakeContractRepository Contracts { get; }
    public FakePathwayLibraryRuleRepository LibraryRules { get; }
    public FakePatientRepository Patients { get; }
    public FakePatientProfileRevisionRepository ProfileRevisions { get; }
    public FakeFormRepository Forms { get; }
    public FakeEvidenceRepository Evidence { get; }
    public FakePlatformRepository Platform { get; }
    public FakeSmsCampaignTemplateRepository SmsTemplates { get; }

    public ServiceHarness()
    {
        UnitOfWork = new FakeUnitOfWork(Store);
        Persons = new FakePersonRepository(Store);
        Users = new FakeUserRepository(Store);
        Auth = new FakeAuthRepository(Store);
        Clinics = new FakeClinicRepository(Store);
        Contracts = new FakeContractRepository(Store);
        LibraryRules = new FakePathwayLibraryRuleRepository(Store);
        Patients = new FakePatientRepository(Store);
        ProfileRevisions = new FakePatientProfileRevisionRepository(Store);
        Forms = new FakeFormRepository(Store);
        Evidence = new FakeEvidenceRepository(Store);
        Platform = new FakePlatformRepository(Store);
        SmsTemplates = new FakeSmsCampaignTemplateRepository(Store);
        DatabaseReset = new FakeDatabaseFactoryReset(Store);
        Seeder = new FakeAppDataSeeder(Store);
        SeedDefaultSmsTemplate();
    }

    public Guid SeedDefaultSmsTemplate(string code = "invite_register")
    {
        var existing = Store.SmsCampaignTemplates.FirstOrDefault(t => t.Code == code);
        if (existing is not null) return existing.Id;
        var t = new SmsCampaignTemplate
        {
            Code = code,
            Title = "دعوت تکمیل ثبت‌نام",
            BodyPreview = "سلام {name}، لینک ثبت‌نام: {invite_url}",
            ProviderTemplateName = "invite",
            TokenKeysJson = """["invite_token","name"]""",
            IsActive = true,
            SortOrder = 1,
        };
        Store.SmsCampaignTemplates.Add(t);
        return t.Id;
    }

    public Nabz.Infrastructure.Abuse.ApiAbuseMemoryStore AbuseMemory { get; } = new();

    public AuthService CreateAuthService(string fixedOtp = "12345")
    {
        var authOptions = Options.Create(new AuthOptions { FixedOtp = fixedOtp });
        var kavenegarOptions = Options.Create(new KavenegarOptions { InviteTemplate = "invite", OtpTemplate = "otp" });
        var abuseOptions = Options.Create(new ApiAbuseOptions());
        return new AuthService(
            Users, Persons, Auth, Contracts, Patients, Clinics, Platform, CreatePatientService(), UnitOfWork, Sms,
            AbuseMemory, authOptions, kavenegarOptions, abuseOptions, NullLogger<AuthService>.Instance);
    }

    public ApiAbuseGuardService CreateApiAbuseGuardService(
        string? fixedOtp = "12345",
        string? abuseAlertTemplate = "abuse_alert",
        string? apiKey = "test-key",
        ApiAbuseOptions? abuseOpt = null)
    {
        var authOptions = Options.Create(new AuthOptions { FixedOtp = fixedOtp });
        var kavenegarOptions = Options.Create(new KavenegarOptions
        {
            InviteTemplate = "invite",
            OtpTemplate = "otp",
            AbuseAlertTemplate = abuseAlertTemplate,
            ApiKey = apiKey,
            Sender = "1000"
        });
        return new ApiAbuseGuardService(
            AbuseMemory,
            new FakeApiAbuseRepository(Store),
            Auth,
            Users,
            Platform,
            UnitOfWork,
            Sms,
            Options.Create(abuseOpt ?? new ApiAbuseOptions()),
            authOptions,
            kavenegarOptions,
            NullLogger<ApiAbuseGuardService>.Instance);
    }

    public FormService CreateFormService() => new(Forms, Patients, ProfileRevisions, Users, Contracts, UnitOfWork);

    public EvidenceService CreateEvidenceService() => new(Evidence, Patients, ProfileRevisions, Platform, Files, UnitOfWork);

    public PatientService CreatePatientService() =>
        new(Patients, ProfileRevisions, Contracts, Users, Persons, Forms, Evidence, Clinics, UnitOfWork);

    public ContractService CreateContractService(string fixedOtp = "12345")
    {
        var authOptions = Options.Create(new AuthOptions { FixedOtp = fixedOtp });
        var kavenegarOptions = Options.Create(new KavenegarOptions { InviteTemplate = "invite" });
        var frontendUrls = Options.Create(new FrontendUrlsOptions { My = "https://my.example.test" });
        return new ContractService(
            Contracts, LibraryRules, Patients, Users, Persons, Clinics, SmsTemplates, UnitOfWork, Sms,
            authOptions, kavenegarOptions, frontendUrls, NullLogger<ContractService>.Instance);
    }

    public ClinicService CreateClinicService()
        => new(
            Clinics,
            UnitOfWork,
            Sms,
            SmsTemplates,
            Options.Create(new KavenegarOptions { InviteTemplate = "invite", ApiKey = "test-key", Sender = "1000" }),
            NullLogger<ClinicService>.Instance);

    public PathwayLibraryRuleService CreatePathwayLibraryRuleService()
        => new(LibraryRules, Contracts, UnitOfWork);

    public UserAdminService CreateUserAdminService() => new(Users, Persons, Patients, Contracts, Clinics, Platform, UnitOfWork);

    public PlatformService CreatePlatformService(string fixedOtp = "12345") =>
        new(
            Platform, Clinics, Users, Auth, CreateUserAdminService(),
            CreateAuthService(fixedOtp), DatabaseReset, Files, Seeder, UnitOfWork,
            NullLogger<PlatformService>.Instance);

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
        var person = TestIdentityHelper.AddPerson(
            Store, mobile, "بیمار", "تست", "0012345679", new DateOnly(1996, 1, 1), "مرد");
        var owner = TestIdentityHelper.AddUser(Store, person, isActive: true, id: ownerId);
        Store.Roles.Add(new UserRoleAssignment { UserId = ownerId, Role = AppRole.Owner, ClinicId = clinicId });

        var patient = TestIdentityHelper.AddPatient(Store, clinicId, person, ownerId);
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
            BrandName = "نفس تست",
            OtpLength = 5,
            OtpTtlSeconds = 120,
            FraudAutoCaptureSeconds = 7,
            IntakeDocumentMaxGroups = maxGroups,
            IntakeDocumentMaxFilesPerGroup = maxFilesPerGroup,
            IntakeDocumentMaxBytes = maxBytes,
            FeatureFlagsJson = "{}"
        });
    }
}