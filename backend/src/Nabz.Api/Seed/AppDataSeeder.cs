/*
 File: backend/src/Nabz.Api/Seed/AppDataSeeder.cs
 Description: seed idempotent دامنه و کاتالوگ فرم — startup و ریست فکتوری
 Parent Dependencies: NabzDbContext, IFormService, FormCatalogSeedParser
 */

using Microsoft.EntityFrameworkCore;
using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Database.EF.Sql;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Forms;

namespace Nabz.Api.Seed;

public sealed class AppDataSeeder(NabzDbContext db, IFormService forms) : IAppDataSeeder
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        await SeedDomainAsync(ct);
        await SeedFormCatalogAsync(ct);
    }

    private async Task SeedDomainAsync(CancellationToken ct)
    {
    if (!await db.Clinics.AnyAsync())
    {
        db.Clinics.Add(new Clinic
        {
            Name = "کلینیک نمونه نبض",
            City = "تهران",
            Address = "تهران، کلینیک نمونه نبض",
            Latitude = 35.7219,
            Longitude = 51.3347,
            Status = ClinicStatus.Active,
            IsCurrentTenant = true,
            AdminPhone = "02100000000"
        });
    }

    if (!await db.PlatformSettings.AnyAsync())
    {
        db.PlatformSettings.Add(new PlatformSettings());
    }
    else
    {
        // یک‌بار هم‌ترازی پیش‌فرض قدیمی ۳ → ۷ برای ردیف seed (قبل از اینکه ادمین مقدار دیگری ست کند)
        var existing = await db.PlatformSettings.FirstAsync(ct);
        if (existing.FraudAutoCaptureSeconds == 3
            && (string.IsNullOrWhiteSpace(existing.FeatureFlagsJson) || existing.FeatureFlagsJson.Trim() == "{}"))
        {
            existing.FraudAutoCaptureSeconds = 7;
            existing.UpdatedAt = DateTime.UtcNow;
        }
    }

    // کلید هویت Owner = کدملی؛ موبایل می‌تواند با بیمار دیگر مشترک باشد (دو Person، یک Mobile)
    const string ownerNid = "0012345679";
    var ownerPerson = await EnsurePersonAsync("09123458910", ownerNid, "مریم‌السادات", "تابش", "زن",
        new DateOnly(1983, 3, 21), ct);
    var owner = await EnsureUserAsync(ownerPerson, ct);
    if (!await db.UserRoleAssignments.AnyAsync(r => r.UserId == owner.Id && r.Role == AppRole.Owner))
        db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = owner.Id, Role = AppRole.Owner });

    var adminPerson = await EnsurePersonAsync("09120000001", null, "ادمین", "کلینیک", null, null, ct);
    var admin = await EnsureUserAsync(adminPerson, ct);
    if (!await db.UserRoleAssignments.AnyAsync(r => r.UserId == admin.Id && r.Role == AppRole.Admin))
        db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = admin.Id, Role = AppRole.Admin });

    var docPerson = await EnsurePersonAsync("09120000002", null, "پزشک", "نمونه", null, null, ct);
    var doc = await EnsureUserAsync(docPerson, ct);
    if (!await db.UserRoleAssignments.AnyAsync(r => r.UserId == doc.Id && r.Role == AppRole.Specialist))
        db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = doc.Id, Role = AppRole.Specialist });

    // ادمین کل همیشه این موبایل است (ثابت پروژه — .cursorrules)
    const string platformAdminMobile = "09133752696";
    var platPerson = await db.Persons.FirstOrDefaultAsync(p => p.Mobile == platformAdminMobile, ct)
        ?? await EnsurePersonAsync(platformAdminMobile, null, "ادمین", "کل", null, null, ct);
    var plat = await EnsureUserAsync(platPerson, ct);
    if (!await db.UserRoleAssignments.AnyAsync(r => r.UserId == plat.Id && r.Role == AppRole.Platform))
        db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = plat.Id, Role = AppRole.Platform });
    if (!plat.IsActive)
    {
        plat.IsActive = true;
        plat.UpdatedAt = DateTime.UtcNow;
    }

    await db.SaveChangesAsync(ct);

    var clinic = await db.Clinics.FirstAsync(c => c.IsCurrentTenant);
    if (!await db.Patients.AnyAsync(p => p.ClinicId == clinic.Id && p.PersonId == ownerPerson.Id))
    {
        db.Patients.Add(new Patient
        {
            ClinicId = clinic.Id,
            PersonId = ownerPerson.Id,
            OwnerUserId = owner.Id,
            IntakeCompleted = false,
            QrToken = Guid.NewGuid().ToString("N")
        });
        await db.SaveChangesAsync(ct);
    }

    // بیمار دوم با همان موبایل — مسیر OTP چندکدملی (Person جدا، Mobile مشترک)
    const string sharedPhone = "09123458910";
    const string secondNid = "0012345687";
    var owner2Person = await EnsurePersonAsync(sharedPhone, secondNid, "علی", "هم‌شماره", "مرد",
        new DateOnly(1990, 5, 1), ct);
    var owner2User = await EnsureUserAsync(owner2Person, ct);
    if (!await db.UserRoleAssignments.AnyAsync(r => r.UserId == owner2User.Id && r.Role == AppRole.Owner))
        db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = owner2User.Id, Role = AppRole.Owner });
    await db.SaveChangesAsync(ct);

    if (!await db.Patients.AnyAsync(p => p.ClinicId == clinic.Id && p.PersonId == owner2Person.Id))
    {
        db.Patients.Add(new Patient
        {
            ClinicId = clinic.Id,
            PersonId = owner2Person.Id,
            OwnerUserId = owner2User.Id,
            Description = "بیمار دمو با موبایل مشترک — برای انتخاب OTP",
            IntakeCompleted = false,
            QrToken = Guid.NewGuid().ToString("N")
        });
        await db.SaveChangesAsync(ct);
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
        await db.SaveChangesAsync(ct);
    }
    else if (demoContract.Status != ContractStatus.Active)
    {
        demoContract.Status = ContractStatus.Active;
        demoContract.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    var supPerson = await EnsurePersonAsync(supervisorMobile, null, "ناظر", "سازمانی نمونه", null, null, ct);
    // ۱:۱ قرارداد↔ناظر؛ گارد فقط روی ContractId — نه PersonId (Person بدون NID قبلاً هر استارت عوض می‌شد)
    const string supervisorTitle = "نماینده و ناظر سلامت سازمان";
    var existingSup = await db.ContractSupervisors.FirstOrDefaultAsync(s => s.ContractId == demoContract.Id, ct);
    if (existingSup is null)
    {
        db.ContractSupervisors.Add(new ContractSupervisor
        {
            ContractId = demoContract.Id,
            PersonId = supPerson.Id,
            Title = supervisorTitle,
            IsActive = true,
            CanSendReminders = true
        });
        await db.SaveChangesAsync(ct);
    }
    else if (existingSup.PersonId != supPerson.Id
             || existingSup.Title != supervisorTitle
             || !existingSup.IsActive
             || !existingSup.CanSendReminders)
    {
        existingSup.PersonId = supPerson.Id;
        existingSup.Title = supervisorTitle;
        existingSup.IsActive = true;
        existingSup.CanSendReminders = true;
        existingSup.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    var supUser = await EnsureUserAsync(supPerson, ct);
    var supAssignment = await db.UserRoleAssignments
        .FirstOrDefaultAsync(r => r.UserId == supUser.Id && r.Role == AppRole.Supervisor, ct);
    if (supAssignment is null)
    {
        db.UserRoleAssignments.Add(new UserRoleAssignment
        {
            UserId = supUser.Id,
            Role = AppRole.Supervisor,
            ContractId = demoContract.Id,
            ClinicId = clinic.Id
        });
        await db.SaveChangesAsync(ct);
    }
    else if (supAssignment.ContractId != demoContract.Id || supAssignment.ClinicId != clinic.Id)
    {
        // تضمین لینک نقش ناظر به قرارداد دمو
        supAssignment.ContractId = demoContract.Id;
        supAssignment.ClinicId = clinic.Id;
        await db.SaveChangesAsync(ct);
    }

    // فرم‌های سرطان CA_M/CA_F از SeedFormCatalogAsync (کاتالوگ کامل) می‌آیند؛ PREADMIT_V1 دیگر seed نمی‌شود.
    // اگر نسخهٔ قدیمی PREADMIT_V1 مانده، آرشیو کن تا با فرم‌های منتشرشده قاطی نشود.
    var legacy = await db.FormDefinitions.FirstOrDefaultAsync(f => f.ClinicId == clinic.Id && f.Code == "PREADMIT_V1");
    if (legacy is not null && legacy.Status != FormPublishStatus.Archived)
    {
        legacy.Status = FormPublishStatus.Archived;
        legacy.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    var ownerPatient = await db.Patients
        .Include(p => p.Person)
        .FirstOrDefaultAsync(p => p.ClinicId == clinic.Id && p.Person.NationalId == ownerNid);

    // عضو مالک (مریم) — NID مثبت برای OTP و پیش‌پذیرش
    if (!await db.ContractMembers.AnyAsync(m => m.ContractId == demoContract.Id && m.PersonId == ownerPerson.Id))
    {
        db.ContractMembers.Add(new ContractMember
        {
            ContractId = demoContract.Id,
            PersonId = ownerPerson.Id,
            InviteToken = Guid.NewGuid().ToString("N")[..10].ToUpperInvariant(),
            PersonnelCode = "OWN-001",
            Department = "اداری",
            JobCategory = "ستادی",
            OnboardingStage = OnboardingStage.LoggedIn,
            AssignedPackageCode = "FULL_CHECKUP",
            AssignedPackageTitle = "چکاپ جامع",
            LinkedPatientId = ownerPatient?.Id,
            Source = "seed"
        });
        await db.SaveChangesAsync(ct);
    }
    else if (ownerPatient is not null)
    {
        var ownerMember = await db.ContractMembers.FirstAsync(m => m.ContractId == demoContract.Id && m.PersonId == ownerPerson.Id);
        if (ownerMember.LinkedPatientId != ownerPatient.Id)
        {
            ownerMember.LinkedPatientId = ownerPatient.Id;
            ownerMember.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    // NID قدیمی دمو بدون checksum معتبر؛ seed idempotent بازنویسی نمی‌کرد → کاندیدای شبح OTP روی موبایل مشترک
    const string legacyDemoNid = "0012345678";
    const string canonicalOwnerNid = "0012345679";
    var legacyPatient = await db.Patients
        .Include(p => p.Person)
        .FirstOrDefaultAsync(p =>
            p.ClinicId == clinic.Id &&
            p.Person.NationalId == legacyDemoNid &&
            p.Person.Mobile == sharedPhone);
    var legacyMembers = await db.ContractMembers
        .Include(m => m.Person)
        .Where(m => m.ContractId == demoContract.Id && m.Person.NationalId == legacyDemoNid)
        .ToListAsync();
    if (legacyMembers.Count > 0)
    {
        var hasCanonicalMember = await db.ContractMembers.AnyAsync(m =>
            m.ContractId == demoContract.Id && m.PersonId == ownerPerson.Id);
        if (hasCanonicalMember)
        {
            db.ContractMembers.RemoveRange(legacyMembers);
        }
        else
        {
            foreach (var m in legacyMembers)
            {
                m.PersonId = ownerPerson.Id;
                m.UpdatedAt = DateTime.UtcNow;
            }
        }
        await db.SaveChangesAsync(ct);
    }

    if (legacyPatient is not null)
    {
        var linkedMembers = await db.ContractMembers
            .Where(m => m.LinkedPatientId == legacyPatient.Id)
            .ToListAsync();
        foreach (var m in linkedMembers)
        {
            m.LinkedPatientId = null;
            m.UpdatedAt = DateTime.UtcNow;
        }

        var legacyUser = await db.Users
            .Include(u => u.Person)
            .FirstOrDefaultAsync(u => u.Person.NationalId == legacyDemoNid);
        var canonicalUser = await db.Users
            .Include(u => u.Person)
            .FirstOrDefaultAsync(u => u.Person.NationalId == canonicalOwnerNid);
        if (legacyUser is not null)
        {
            // اگر مالک پروندهٔ canonical همان User یتیم باشد، NID را rename نکن / حذف نکن
            var ownsCanonicalPatient = ownerPatient is not null && ownerPatient.OwnerUserId == legacyUser.Id;
            if (!ownsCanonicalPatient)
            {
                if (canonicalUser is not null)
                {
                    var roles = await db.UserRoleAssignments.Where(r => r.UserId == legacyUser.Id).ToListAsync();
                    db.UserRoleAssignments.RemoveRange(roles);
                    var sessions = await db.AuthSessions.Where(s => s.UserId == legacyUser.Id).ToListAsync();
                    db.AuthSessions.RemoveRange(sessions);
                    // PatientProfileRevision.ChangedByUserId = Restrict؛ اگر revision مانده، فقط از OTP خارج شو
                    var hasRestrictRefs = await db.PatientProfileRevisions.AnyAsync(r => r.ChangedByUserId == legacyUser.Id);
                    if (hasRestrictRefs)
                    {
                        legacyUser.Person.NationalId = null;
                        legacyUser.IsActive = false;
                        legacyUser.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        db.Users.Remove(legacyUser);
                    }
                }
                else
                {
                    legacyUser.PersonId = ownerPerson.Id;
                    legacyUser.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        db.Patients.Remove(legacyPatient);
        await db.SaveChangesAsync(ct);

        // بعد از حذف یتیم، لینک عضو مالک را دوباره به بیمار canonical ببند
        ownerPatient = await db.Patients
            .Include(p => p.Person)
            .FirstOrDefaultAsync(p => p.ClinicId == clinic.Id && p.Person.NationalId == canonicalOwnerNid);
        if (ownerPatient is not null)
        {
            var ownerMember = await db.ContractMembers.FirstOrDefaultAsync(m =>
                m.ContractId == demoContract.Id && m.PersonId == ownerPerson.Id);
            if (ownerMember is not null && ownerMember.LinkedPatientId != ownerPatient.Id)
            {
                ownerMember.LinkedPatientId = ownerPatient.Id;
                ownerMember.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);
            }
        }
    }
    else
    {
        // بیمار یتیم نیست ولی User با NID قدیمی (مثلاً از انتخاب OTP قبلی) هنوز کاندیدا می‌سازد
        var strayLegacyUser = await db.Users
            .Include(u => u.Person)
            .FirstOrDefaultAsync(u =>
                u.Person.NationalId == legacyDemoNid && u.Person.Mobile == sharedPhone);
        var canonicalUserOnly = await db.Users
            .Include(u => u.Person)
            .FirstOrDefaultAsync(u => u.Person.NationalId == canonicalOwnerNid);
        if (strayLegacyUser is not null && canonicalUserOnly is not null &&
            (ownerPatient is null || ownerPatient.OwnerUserId != strayLegacyUser.Id))
        {
            var roles = await db.UserRoleAssignments.Where(r => r.UserId == strayLegacyUser.Id).ToListAsync();
            db.UserRoleAssignments.RemoveRange(roles);
            var sessions = await db.AuthSessions.Where(s => s.UserId == strayLegacyUser.Id).ToListAsync();
            db.AuthSessions.RemoveRange(sessions);
            var hasRestrictRefs = await db.PatientProfileRevisions.AnyAsync(r => r.ChangedByUserId == strayLegacyUser.Id);
            if (hasRestrictRefs)
            {
                strayLegacyUser.Person.NationalId = null;
                strayLegacyUser.IsActive = false;
                strayLegacyUser.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                db.Users.Remove(strayLegacyUser);
            }
            await db.SaveChangesAsync(ct);
        }
    }

    // عضو آمادهٔ admit (بدون بیمار لینک‌شده در حالت اولیه)
  const string admitDemoNid = "0011223340";
    var admitPerson = await EnsurePersonAsync("09121112233", admitDemoNid, "عضو", "نمونه قرارداد", "مرد",
        new DateOnly(1987, 6, 15), ct);
    if (!await db.ContractMembers.AnyAsync(m => m.ContractId == demoContract.Id && m.PersonId == admitPerson.Id))
    {
        db.ContractMembers.Add(new ContractMember
        {
            ContractId = demoContract.Id,
            PersonId = admitPerson.Id,
            InviteToken = Guid.NewGuid().ToString("N")[..10].ToUpperInvariant(),
            PersonnelCode = "ADM-001",
            Department = "فنی و مهندسی",
            JobCategory = "عملیات و فنی",
            OnboardingStage = OnboardingStage.NotSent,
            AssignedPackageCode = "FULL_CHECKUP",
            AssignedPackageTitle = "چکاپ جامع",
            Source = "seed"
        });
        await db.SaveChangesAsync(ct);
    }

    }

    private async Task<Person> EnsurePersonAsync(
        string mobile,
        string? nationalId,
        string firstName,
        string lastName,
        string? gender,
        DateOnly? birthDate,
        CancellationToken ct)
    {
        var phone = IranMobile.Normalize(mobile);
        string? nid = string.IsNullOrWhiteSpace(nationalId) ? null : IranNationalId.Normalize(nationalId);
        Person? person = null;
        if (nid is not null)
            person = await db.Persons.FirstOrDefaultAsync(p => p.NationalId == nid, ct);
        else
            // staff بدون NID؛ فیلتر NationalId==null تا با OTP چندکدملی روی موبایل مشترک قاطی نشود
            person = await db.Persons.FirstOrDefaultAsync(p => p.Mobile == phone && p.NationalId == null, ct);

        if (person is null)
        {
            person = new Person
            {
                Mobile = phone,
                NationalId = nid,
                FirstName = firstName,
                LastName = lastName,
                Gender = gender,
                BirthDate = birthDate
            };
            db.Persons.Add(person);
            await db.SaveChangesAsync(ct);
            return person;
        }

        // هم‌تراز نام seed بدون ساخت ردیف جدید
        var touched = false;
        if (!string.IsNullOrWhiteSpace(firstName) && person.FirstName != firstName)
        {
            person.FirstName = firstName;
            touched = true;
        }
        if (!string.IsNullOrWhiteSpace(lastName) && person.LastName != lastName)
        {
            person.LastName = lastName;
            touched = true;
        }
        if (touched)
        {
            person.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        return person;
    }

    private async Task<User> EnsureUserAsync(Person person, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.PersonId == person.Id, ct);
        if (user is not null) return user;
        user = new User { PersonId = person.Id, IsActive = true };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return user;
    }

    private async Task SeedFormCatalogAsync(CancellationToken ct)
    {
        var clinic = await db.Clinics.FirstOrDefaultAsync(c => c.IsCurrentTenant, ct);
        if (clinic is null) return;

        // اگر هر دو فرم سرطان با ساختار موجودند و آیتم آدرس سکونت هم هست، seed کامل را تکرار نکن
        var maleExists = await db.FormDefinitions.AnyAsync(f => f.ClinicId == clinic.Id && f.Code == "cancer_screening_male_v02", ct);
        var femaleExists = await db.FormDefinitions.AnyAsync(f => f.ClinicId == clinic.Id && f.Code == "cancer_screening_female_v02", ct);
        if (maleExists && femaleExists)
        {
            var maleItems = await db.FormItems.CountAsync(i => i.Form.ClinicId == clinic.Id && i.Form.Code == "cancer_screening_male_v02", ct);
            // delta: بدون *_BASE_residence دوباره ImportPackage (upsert) اجرا می‌شود
            var hasResidence = await db.FormItems.AnyAsync(i =>
                i.Form.ClinicId == clinic.Id &&
                (i.Code == "CA_M_BASE_residence" || i.Code == "CA_F_BASE_residence"), ct);
            if (maleItems > 10 && hasResidence) return;
        }

        var path = Path.Combine(AppContext.BaseDirectory, "SeedData", "form-catalog.seed.json");
        if (!File.Exists(path))
            path = Path.Combine(Directory.GetCurrentDirectory(), "SeedData", "form-catalog.seed.json");
        if (!File.Exists(path)) return;

        var json = await File.ReadAllTextAsync(path, ct);
        var package = FormCatalogSeedParser.Parse(json);
        await forms.ImportPackageAsync(clinic.Id, package, ct);
    }
}
