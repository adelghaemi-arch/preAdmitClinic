/*
 File: backend/src/Nabz.Api/Program.cs
 Description: هاست API؛ Auth نشست، MigrateAsync و seed اولیه
 Parent Dependencies: Nabz.Infrastructure, Nabz.Database.EF.Sql, SessionAuthenticationHandler
 */

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Nabz.Api.Auth;
using Nabz.Application.Interfaces;
using Nabz.Database.EF.Sql;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure;
using Nabz.Infrastructure.Forms;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
builder.Services.AddOpenApi();
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin()));

builder.Services.AddAuthentication(SessionAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(
        SessionAuthenticationHandler.SchemeName, _ => { });
builder.Services.AddAuthorization();

var isTesting = builder.Environment.IsEnvironment("Testing");
var cs = builder.Configuration.GetConnectionString("NabzClinic");
// Testing فقط SQLite؛ appsettings ممکن است هنوز Server= SQL داشته باشد
if (isTesting && (string.IsNullOrWhiteSpace(cs) || cs.Contains("Server=", StringComparison.OrdinalIgnoreCase)))
    cs = "Data Source=nabz-api-tests.db";
cs ??= "Server=localhost;Database=NabzClinic;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=True;";
builder.Services.AddNabzDatabase(cs, useSqlite: isTesting);
builder.Services.AddNabzInfrastructure(builder.Configuration);

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NabzDbContext>();
    // محیط Testing: EnsureCreated روی SQLite — بدون Migrate SQL Server
    if (app.Environment.IsEnvironment("Testing"))
        await db.Database.EnsureCreatedAsync();
    else
        await db.Database.MigrateAsync();
    await SeedAsync(db);
    await SeedFormCatalogAsync(scope.ServiceProvider);
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

static async Task SeedAsync(NabzDbContext db)
{
    if (!await db.Clinics.AnyAsync())
    {
        db.Clinics.Add(new Clinic
        {
            Name = "کلینیک نمونه نبض",
            City = "تهران",
            Status = ClinicStatus.Active,
            IsCurrentTenant = true,
            AdminPhone = "02100000000"
        });
    }

    if (!await db.PlatformSettings.AnyAsync())
        db.PlatformSettings.Add(new PlatformSettings());

    if (!await db.Users.AnyAsync(u => u.Mobile == "09123458910"))
    {
        var owner = new User
        {
            Mobile = "09123458910",
            FullName = "مریم‌السادات تابش",
            NationalId = "0012345678",
            Gender = "زن",
            IsActive = true
        };
        db.Users.Add(owner);
        db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = owner.Id, Role = AppRole.Owner });
    }

    if (!await db.Users.AnyAsync(u => u.Mobile == "09120000001"))
    {
        var admin = new User
        {
            Mobile = "09120000001",
            FullName = "ادمین کلینیک",
            IsActive = true
        };
        db.Users.Add(admin);
        db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = admin.Id, Role = AppRole.Admin });
    }

    if (!await db.Users.AnyAsync(u => u.Mobile == "09120000002"))
    {
        var doc = new User
        {
            Mobile = "09120000002",
            FullName = "پزشک نمونه",
            IsActive = true
        };
        db.Users.Add(doc);
        db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = doc.Id, Role = AppRole.Specialist });
    }

    // ادمین کل همیشه این موبایل است (ثابت پروژه — .cursorrules)
    const string platformAdminMobile = "09133752696";
    if (!await db.Users.AnyAsync(u => u.Mobile == platformAdminMobile))
    {
        var plat = new User
        {
            Mobile = platformAdminMobile,
            FullName = "ادمین کل",
            IsActive = true
        };
        db.Users.Add(plat);
        db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = plat.Id, Role = AppRole.Platform });
    }
    else
    {
        // اگر کاربر هست ولی نقش Platform ندارد، نقش را تضمین کن
        var plat = await db.Users.FirstAsync(u => u.Mobile == platformAdminMobile);
        if (!await db.UserRoleAssignments.AnyAsync(r => r.UserId == plat.Id && r.Role == AppRole.Platform))
            db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = plat.Id, Role = AppRole.Platform });
        if (!plat.IsActive)
        {
            plat.IsActive = true;
            plat.UpdatedAt = DateTime.UtcNow;
        }
    }

    await db.SaveChangesAsync();

    var clinic = await db.Clinics.FirstAsync(c => c.IsCurrentTenant);
    var ownerUser = await db.Users.FirstAsync(u => u.Mobile == "09123458910");
    if (!await db.Patients.AnyAsync(p => p.Phone == "09123458910"))
    {
        db.Patients.Add(new Patient
        {
            ClinicId = clinic.Id,
            OwnerUserId = ownerUser.Id,
            FullName = ownerUser.FullName,
            NationalId = ownerUser.NationalId ?? "0012345678",
            Phone = ownerUser.Mobile,
            Age = 42,
            Gender = "زن",
            IntakeCompleted = false,
            QrToken = Guid.NewGuid().ToString("N")
        });
        await db.SaveChangesAsync();
    }

    // قرارداد پایه تست: DEMO-ORG (idempotent)
    const string demoContractCode = "DEMO-ORG";
    const string supervisorMobile = "09123409876";
    // NID خارج قرارداد فقط برای تست گیت پذیرش — عضو seed نمی‌شود: 0099887766
    var demoContract = await db.CorporateContracts.FirstOrDefaultAsync(c => c.ClinicId == clinic.Id && c.Code == demoContractCode);
    if (demoContract is null)
    {
        demoContract = new CorporateContract
        {
            ClinicId = clinic.Id,
            Code = demoContractCode,
            Title = "قرارداد نمونه سازمانی",
            OrganizationName = "سازمان نمونه",
            Status = ContractStatus.Active,
            DefaultPackageCode = "FULL_CHECKUP"
        };
        db.CorporateContracts.Add(demoContract);
        await db.SaveChangesAsync();
    }
    else if (demoContract.Status != ContractStatus.Active)
    {
        demoContract.Status = ContractStatus.Active;
        demoContract.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    if (!await db.ContractSupervisors.AnyAsync(s => s.ContractId == demoContract.Id && s.Phone == supervisorMobile))
    {
        db.ContractSupervisors.Add(new ContractSupervisor
        {
            ContractId = demoContract.Id,
            FullName = "ناظر سازمانی نمونه",
            Phone = supervisorMobile,
            Title = "نماینده و ناظر سلامت سازمان",
            IsActive = true,
            CanSendReminders = true
        });
        await db.SaveChangesAsync();
    }

    if (!await db.Users.AnyAsync(u => u.Mobile == supervisorMobile))
    {
        var supUser = new User
        {
            Mobile = supervisorMobile,
            FullName = "ناظر سازمانی نمونه",
            IsActive = true
        };
        db.Users.Add(supUser);
        await db.SaveChangesAsync();
        db.UserRoleAssignments.Add(new UserRoleAssignment
        {
            UserId = supUser.Id,
            Role = AppRole.Supervisor,
            ContractId = demoContract.Id,
            ClinicId = clinic.Id
        });
        await db.SaveChangesAsync();
    }
    else
    {
        var supUser = await db.Users.FirstAsync(u => u.Mobile == supervisorMobile);
        if (!await db.UserRoleAssignments.AnyAsync(r => r.UserId == supUser.Id && r.Role == AppRole.Supervisor))
        {
            db.UserRoleAssignments.Add(new UserRoleAssignment
            {
                UserId = supUser.Id,
                Role = AppRole.Supervisor,
                ContractId = demoContract.Id,
                ClinicId = clinic.Id
            });
            await db.SaveChangesAsync();
        }
        else
        {
            // تضمین لینک نقش ناظر به قرارداد دمو
            var assignment = await db.UserRoleAssignments.FirstAsync(r => r.UserId == supUser.Id && r.Role == AppRole.Supervisor);
            if (assignment.ContractId != demoContract.Id || assignment.ClinicId != clinic.Id)
            {
                assignment.ContractId = demoContract.Id;
                assignment.ClinicId = clinic.Id;
                await db.SaveChangesAsync();
            }
        }
    }

    // فرم‌های سرطان CA_M/CA_F از SeedFormCatalogAsync (کاتالوگ کامل) می‌آیند؛ PREADMIT_V1 دیگر seed نمی‌شود.
    // اگر نسخهٔ قدیمی PREADMIT_V1 مانده، آرشیو کن تا با فرم‌های منتشرشده قاطی نشود.
    var legacy = await db.FormDefinitions.FirstOrDefaultAsync(f => f.ClinicId == clinic.Id && f.Code == "PREADMIT_V1");
    if (legacy is not null && legacy.Status != FormPublishStatus.Archived)
    {
        legacy.Status = FormPublishStatus.Archived;
        legacy.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    var ownerPatient = await db.Patients.FirstOrDefaultAsync(p => p.ClinicId == clinic.Id && p.Phone == "09123458910");

    // عضو مالک (مریم) — NID مثبت برای OTP و پیش‌پذیرش
    if (!await db.ContractMembers.AnyAsync(m => m.ContractId == demoContract.Id && m.NationalId == "0012345678"))
    {
        db.ContractMembers.Add(new ContractMember
        {
            ContractId = demoContract.Id,
            InviteToken = Guid.NewGuid().ToString("N")[..10].ToUpperInvariant(),
            PersonnelCode = "OWN-001",
            FullName = ownerUser.FullName,
            NationalId = "0012345678",
            Phone = "09123458910",
            Age = 42,
            Gender = "زن",
            Department = "اداری",
            JobCategory = "ستادی",
            OnboardingStage = OnboardingStage.LoggedIn,
            AssignedPackageCode = "FULL_CHECKUP",
            AssignedPackageTitle = "چکاپ جامع",
            LinkedPatientId = ownerPatient?.Id,
            Source = "seed"
        });
        await db.SaveChangesAsync();
    }
    else if (ownerPatient is not null)
    {
        var ownerMember = await db.ContractMembers.FirstAsync(m => m.ContractId == demoContract.Id && m.NationalId == "0012345678");
        if (ownerMember.LinkedPatientId != ownerPatient.Id)
        {
            ownerMember.LinkedPatientId = ownerPatient.Id;
            ownerMember.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }

    // عضو آمادهٔ admit (بدون بیمار لینک‌شده در حالت اولیه)
    if (!await db.ContractMembers.AnyAsync(m => m.ContractId == demoContract.Id && m.NationalId == "0011223344"))
    {
        db.ContractMembers.Add(new ContractMember
        {
            ContractId = demoContract.Id,
            InviteToken = Guid.NewGuid().ToString("N")[..10].ToUpperInvariant(),
            PersonnelCode = "ADM-001",
            FullName = "عضو نمونه قرارداد",
            NationalId = "0011223344",
            Phone = "09121112233",
            Age = 38,
            Gender = "مرد",
            Department = "فنی و مهندسی",
            JobCategory = "عملیات و فنی",
            OnboardingStage = OnboardingStage.NotSent,
            AssignedPackageCode = "FULL_CHECKUP",
            AssignedPackageTitle = "چکاپ جامع",
            Source = "seed"
        });
        await db.SaveChangesAsync();
    }
}

static async Task SeedFormCatalogAsync(IServiceProvider sp)
{
    var db = sp.GetRequiredService<NabzDbContext>();
    var forms = sp.GetRequiredService<IFormService>();
    var clinic = await db.Clinics.FirstOrDefaultAsync(c => c.IsCurrentTenant);
    if (clinic is null) return;

    // اگر هر دو فرم سرطان با ساختار موجودند، seed را تکرار نکن (idempotent سریع)
    var maleExists = await db.FormDefinitions.AnyAsync(f => f.ClinicId == clinic.Id && f.Code == "cancer_screening_male_v02");
    var femaleExists = await db.FormDefinitions.AnyAsync(f => f.ClinicId == clinic.Id && f.Code == "cancer_screening_female_v02");
    if (maleExists && femaleExists)
    {
        var maleItems = await db.FormItems.CountAsync(i => i.Form.ClinicId == clinic.Id && i.Form.Code == "cancer_screening_male_v02");
        if (maleItems > 10) return;
    }

    var path = Path.Combine(AppContext.BaseDirectory, "SeedData", "form-catalog.seed.json");
    if (!File.Exists(path))
        path = Path.Combine(Directory.GetCurrentDirectory(), "SeedData", "form-catalog.seed.json");
    if (!File.Exists(path)) return;

    var json = await File.ReadAllTextAsync(path);
    var package = FormCatalogSeedParser.Parse(json);
    await forms.ImportPackageAsync(clinic.Id, package);
}

// برای WebApplicationFactory در تست‌های smoke
public partial class Program;
