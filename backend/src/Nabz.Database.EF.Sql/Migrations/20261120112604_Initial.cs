/*
 File: backend/src/Nabz.Database.EF.Sql/Migrations/20261120112604_Initial.cs
 Description: تنها مایگریشن schema — Persons + کل ساختار دامنه
 Parent Dependencies: NabzDbContext
 */

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Clinics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    City = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AdminContact = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AdminPhone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsCurrentTenant = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FormDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    WarningText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TargetAudienceJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OtpChallenges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Mobile = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    CodeHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DemoCodePlain = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Consumed = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtpChallenges", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PackageLibraryRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MinAge = table.Column<int>(type: "int", nullable: true),
                    MaxAge = table.Column<int>(type: "int", nullable: true),
                    JobCategory = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PackageCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PackageLibraryRules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Persons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Mobile = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    NationalId = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BirthDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Persons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlatformAuditEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    At = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Actor = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Target = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Detail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformAuditEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlatformSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BrandName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SupportPhone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OtpLength = table.Column<int>(type: "int", nullable: false),
                    OtpTtlSeconds = table.Column<int>(type: "int", nullable: false),
                    SmsSenderId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FraudAutoCaptureSeconds = table.Column<int>(type: "int", nullable: false),
                    IntakeDocumentMaxGroups = table.Column<int>(type: "int", nullable: false),
                    IntakeDocumentMaxFilesPerGroup = table.Column<int>(type: "int", nullable: false),
                    IntakeDocumentMaxBytes = table.Column<long>(type: "bigint", nullable: false),
                    FeatureFlagsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OsmLocalJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CorporateContracts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OrganizationName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ApiEndpoint = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ApiKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastApiSyncAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DefaultPackageCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CorporateContracts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CorporateContracts_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FormSections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FormId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    TimeWindowHint = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GuideText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormSections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FormSections_FormDefinitions_FormId",
                        column: x => x.FormId,
                        principalTable: "FormDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PersonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Persons_PersonId",
                        column: x => x.PersonId,
                        principalTable: "Persons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ContractMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PersonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InviteToken = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PersonnelCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MaritalStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Department = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    JobCategory = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Source = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AssignedPackageCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AssignedPackageTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MatchedRuleTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ManualPackageOverride = table.Column<bool>(type: "bit", nullable: false),
                    OnboardingStage = table.Column<int>(type: "int", nullable: false),
                    ProfileProgressPct = table.Column<int>(type: "int", nullable: false),
                    AbandonedAtStep = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SmsInviteCount = table.Column<int>(type: "int", nullable: false),
                    LastSmsAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LinkOpenedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LoggedInAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastActivityAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ProfileCompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LinkedPatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractMembers_CorporateContracts_ContractId",
                        column: x => x.ContractId,
                        principalTable: "CorporateContracts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ContractMembers_Persons_PersonId",
                        column: x => x.PersonId,
                        principalTable: "Persons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ContractPackageRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LibraryRuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MinAge = table.Column<int>(type: "int", nullable: true),
                    MaxAge = table.Column<int>(type: "int", nullable: true),
                    JobCategory = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PackageCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractPackageRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractPackageRules_CorporateContracts_ContractId",
                        column: x => x.ContractId,
                        principalTable: "CorporateContracts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContractSmsLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CampaignTitle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AudienceLabel = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MessageTemplate = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RecipientCount = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractSmsLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractSmsLogs_CorporateContracts_ContractId",
                        column: x => x.ContractId,
                        principalTable: "CorporateContracts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContractSupervisors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PersonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CanSendReminders = table.Column<bool>(type: "bit", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastSeenAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractSupervisors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractSupervisors_CorporateContracts_ContractId",
                        column: x => x.ContractId,
                        principalTable: "CorporateContracts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ContractSupervisors_Persons_PersonId",
                        column: x => x.PersonId,
                        principalTable: "Persons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FormItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FormId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LabelFa = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InputType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Required = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    VisibilityRulesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HelpText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NotesPolicy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PrefillFromPatient = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReadOnlyIfPrefill = table.Column<bool>(type: "bit", nullable: false),
                    SelectOptionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CodingJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FormItems_FormDefinitions_FormId",
                        column: x => x.FormId,
                        principalTable: "FormDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FormItems_FormSections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "FormSections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AuthSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TokenHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeviceLabel = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AppSurface = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IpHint = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastSeenAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PendingSelection = table.Column<bool>(type: "bit", nullable: false),
                    PendingMobile = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuthSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "MultiSessionAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActiveSessionCount = table.Column<int>(type: "int", nullable: false),
                    ReviewStatus = table.Column<int>(type: "int", nullable: false),
                    ReviewNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MultiSessionAlerts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MultiSessionAlerts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Patients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PersonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LinkedContractMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MaritalStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IntakeCompleted = table.Column<bool>(type: "bit", nullable: false),
                    IntakeCompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    JourneyIntroSeen = table.Column<bool>(type: "bit", nullable: false),
                    AssignedPackageCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AssignedPackageTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    QrToken = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HomeLat = table.Column<double>(type: "float", nullable: true),
                    HomeLon = table.Column<double>(type: "float", nullable: true),
                    HomeAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HomePlaque = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HomeUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HomePostalCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Patients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Patients_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Patients_Persons_PersonId",
                        column: x => x.PersonId,
                        principalTable: "Persons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Patients_Users_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserRoleAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    ContractId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ClinicId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoleAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserRoleAssignments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EvidencePackages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Label = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DayKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EvidencePackages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EvidencePackages_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FormResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FormId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FormCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FormResponses_FormDefinitions_FormId",
                        column: x => x.FormId,
                        principalTable: "FormDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FormResponses_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FraudCaptureSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewStatus = table.Column<int>(type: "int", nullable: false),
                    ReviewNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PackageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FraudCaptureSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FraudCaptureSessions_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GpsPoints",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Lat = table.Column<double>(type: "float", nullable: false),
                    Lon = table.Column<double>(type: "float", nullable: false),
                    Accuracy = table.Column<double>(type: "float", nullable: false),
                    CapturedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PackageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GpsPoints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GpsPoints_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IntakeDocumentGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DocumentType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TypeLabelFa = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DocumentDate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntakeDocumentGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IntakeDocumentGroups_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientPhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    StorageKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CapturedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PackageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    GpsLat = table.Column<double>(type: "float", nullable: true),
                    GpsLon = table.Column<double>(type: "float", nullable: true),
                    GpsAccuracy = table.Column<double>(type: "float", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientPhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientPhotos_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientProfileRevisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Field = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    OldValue = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    NewValue = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ChangedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    At = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientProfileRevisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientProfileRevisions_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PatientProfileRevisions_Users_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FormAnswers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResponseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ValueCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ValueRaw = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SkippedByRule = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FormAnswers_FormResponses_ResponseId",
                        column: x => x.ResponseId,
                        principalTable: "FormResponses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IntakeDocumentFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MimeType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StorageKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    DocumentDate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntakeDocumentFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IntakeDocumentFiles_IntakeDocumentGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "IntakeDocumentGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuthSessions_UserId_RevokedAt",
                table: "AuthSessions",
                columns: new[] { "UserId", "RevokedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractMembers_ContractId_PersonId",
                table: "ContractMembers",
                columns: new[] { "ContractId", "PersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContractMembers_InviteToken",
                table: "ContractMembers",
                column: "InviteToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContractMembers_PersonId",
                table: "ContractMembers",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractPackageRules_ContractId",
                table: "ContractPackageRules",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractSmsLogs_ContractId",
                table: "ContractSmsLogs",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractSupervisors_ContractId",
                table: "ContractSupervisors",
                column: "ContractId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContractSupervisors_PersonId",
                table: "ContractSupervisors",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateContracts_ClinicId",
                table: "CorporateContracts",
                column: "ClinicId");

            migrationBuilder.CreateIndex(
                name: "IX_CorporateContracts_Code",
                table: "CorporateContracts",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_EvidencePackages_PatientId",
                table: "EvidencePackages",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_FormAnswers_ResponseId",
                table: "FormAnswers",
                column: "ResponseId");

            migrationBuilder.CreateIndex(
                name: "IX_FormDefinitions_ClinicId_Code_Version",
                table: "FormDefinitions",
                columns: new[] { "ClinicId", "Code", "Version" });

            migrationBuilder.CreateIndex(
                name: "IX_FormItems_FormId",
                table: "FormItems",
                column: "FormId");

            migrationBuilder.CreateIndex(
                name: "IX_FormItems_SectionId",
                table: "FormItems",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_FormResponses_FormId",
                table: "FormResponses",
                column: "FormId");

            migrationBuilder.CreateIndex(
                name: "IX_FormResponses_PatientId_FormId",
                table: "FormResponses",
                columns: new[] { "PatientId", "FormId" });

            migrationBuilder.CreateIndex(
                name: "IX_FormSections_FormId",
                table: "FormSections",
                column: "FormId");

            migrationBuilder.CreateIndex(
                name: "IX_FraudCaptureSessions_PatientId",
                table: "FraudCaptureSessions",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_GpsPoints_PatientId",
                table: "GpsPoints",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_IntakeDocumentFiles_GroupId",
                table: "IntakeDocumentFiles",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_IntakeDocumentGroups_PatientId",
                table: "IntakeDocumentGroups",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_MultiSessionAlerts_UserId",
                table: "MultiSessionAlerts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_OtpChallenges_Mobile_Purpose_ExpiresAt",
                table: "OtpChallenges",
                columns: new[] { "Mobile", "Purpose", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PatientPhotos_PatientId",
                table: "PatientPhotos",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientProfileRevisions_ChangedByUserId",
                table: "PatientProfileRevisions",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientProfileRevisions_PatientId_At",
                table: "PatientProfileRevisions",
                columns: new[] { "PatientId", "At" });

            migrationBuilder.CreateIndex(
                name: "IX_Patients_ClinicId_PersonId",
                table: "Patients",
                columns: new[] { "ClinicId", "PersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_OwnerUserId",
                table: "Patients",
                column: "OwnerUserId",
                unique: true,
                filter: "OwnerUserId IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_PersonId",
                table: "Patients",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_Persons_Mobile",
                table: "Persons",
                column: "Mobile");

            migrationBuilder.CreateIndex(
                name: "IX_Persons_NationalId",
                table: "Persons",
                column: "NationalId",
                unique: true,
                filter: "NationalId IS NOT NULL AND NationalId <> ''");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoleAssignments_UserId_Role_ContractId",
                table: "UserRoleAssignments",
                columns: new[] { "UserId", "Role", "ContractId" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_PersonId",
                table: "Users",
                column: "PersonId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuthSessions");

            migrationBuilder.DropTable(
                name: "ContractMembers");

            migrationBuilder.DropTable(
                name: "ContractPackageRules");

            migrationBuilder.DropTable(
                name: "ContractSmsLogs");

            migrationBuilder.DropTable(
                name: "ContractSupervisors");

            migrationBuilder.DropTable(
                name: "EvidencePackages");

            migrationBuilder.DropTable(
                name: "FormAnswers");

            migrationBuilder.DropTable(
                name: "FormItems");

            migrationBuilder.DropTable(
                name: "FraudCaptureSessions");

            migrationBuilder.DropTable(
                name: "GpsPoints");

            migrationBuilder.DropTable(
                name: "IntakeDocumentFiles");

            migrationBuilder.DropTable(
                name: "MultiSessionAlerts");

            migrationBuilder.DropTable(
                name: "OtpChallenges");

            migrationBuilder.DropTable(
                name: "PackageLibraryRules");

            migrationBuilder.DropTable(
                name: "PatientPhotos");

            migrationBuilder.DropTable(
                name: "PatientProfileRevisions");

            migrationBuilder.DropTable(
                name: "PlatformAuditEntries");

            migrationBuilder.DropTable(
                name: "PlatformSettings");

            migrationBuilder.DropTable(
                name: "UserRoleAssignments");

            migrationBuilder.DropTable(
                name: "CorporateContracts");

            migrationBuilder.DropTable(
                name: "FormResponses");

            migrationBuilder.DropTable(
                name: "FormSections");

            migrationBuilder.DropTable(
                name: "IntakeDocumentGroups");

            migrationBuilder.DropTable(
                name: "FormDefinitions");

            migrationBuilder.DropTable(
                name: "Patients");

            migrationBuilder.DropTable(
                name: "Clinics");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Persons");
        }
    }
}
