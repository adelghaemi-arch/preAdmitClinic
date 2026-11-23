/*
 File: backend/src/Nabz.Api/Seed/AppDataSeeder.cs
 Description: seed دامنه، کاتالوگ مسیر سازمانی، کتابخانه قوانین و کاتالوگ فرم — startup و ریست فکتوری
 Parent Dependencies: NabzDbContext, IFormService, FormCatalogSeedParser, PlatformAdminIdentity, HealthPathwayTitles, CorporatePathwayStationCatalog
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
            Name = "مرکز نمونه نفس",
            City = "تهران",
            Address = "تهران، مرکز نمونه نفس",
            Latitude = 35.7219,
            Longitude = 51.3347,
            Status = ClinicStatus.Active,
            IsCurrentTenant = true,
            AdminPhone = "02100000000",
            PreAdmitSupportPhone = "02191000000"
        });
    }
    else
    {
        // هم‌ترازی دیتابیس موجود: اگر شماره پشتیبانی پیش‌پذیرش خالی است، مقدار پیش‌فرض بگذار
        foreach (var seededClinic in await db.Clinics.Where(c => c.PreAdmitSupportPhone == null || c.PreAdmitSupportPhone == "").ToListAsync(ct))
        {
            seededClinic.PreAdmitSupportPhone = "02191000000";
            seededClinic.UpdatedAt = DateTime.UtcNow;
        }
    }

    if (!await db.PlatformSettings.AnyAsync())
    {
        db.PlatformSettings.Add(new PlatformSettings
        {
            // تلفن پشتیبانی پیش‌فرض برای پیام خطای ورود شماره ثبت‌نشده
            SupportPhone = "02191000000"
        });
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
        if (string.IsNullOrWhiteSpace(existing.SupportPhone))
        {
            existing.SupportPhone = "02191000000";
            existing.UpdatedAt = DateTime.UtcNow;
        }
    }

    await EnsureSmsCampaignTemplatesAsync(ct);

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

    // ادمین کل: فقط Person بدون NID روی موبایل قفل؛ نه اولین Person (ممکن است بیمار باشد)
    await EnsurePlatformAdminAsync(ct);

    await db.SaveChangesAsync(ct);

    var clinic = await db.Clinics.FirstAsync(c => c.IsCurrentTenant);
    await EnsureClinicStationsAsync(clinic.Id, ct);
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
            DefaultPathwayCode = HealthPathwayTitles.DefaultCode
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
            AssignedPathwayCode = HealthPathwayTitles.CorpWomenLt40,
            AssignedPathwayTitle = HealthPathwayTitles.Resolve(HealthPathwayTitles.CorpWomenLt40),
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
            AssignedPathwayCode = HealthPathwayTitles.CorpMenGe40,
            AssignedPathwayTitle = HealthPathwayTitles.Resolve(HealthPathwayTitles.CorpMenGe40),
            Source = "seed"
        });
        await db.SaveChangesAsync(ct);
    }

    // wipe + چهار قالب سازمانی و قوانین جنسیت×سن
    await SeedCorporatePathwaysAsync(ct);
    }

    private async Task SeedCorporatePathwaysAsync(CancellationToken ct)
    {
        // idempotent بر اساس Code — کتابخانه = خود PathwayDefinition؛ ایستگاه‌ها reconcile روی RoomCode
        foreach (var c in CorporatePathwayStationCatalog.Entries)
        {
            var title = HealthPathwayTitles.Resolve(c.Code);
            var def = await db.PathwayDefinitions.Include(x => x.Stations)
                .FirstOrDefaultAsync(x => x.Code == c.Code, ct);
            if (def is null)
            {
                def = new PathwayDefinition
                {
                    Code = c.Code,
                    Title = title,
                    Description = c.Description,
                    EstimatedTotalMinutes = c.EstimatedTotalMinutes,
                    IsActive = true,
                    IsInLibrary = true,
                    Gender = c.Gender,
                    MinAge = c.MinAge,
                    MaxAge = c.MaxAge,
                    JobCategory = "همه",
                };
                foreach (var s in c.Stations.OrderBy(x => x.StepOrder))
                {
                    def.Stations.Add(new PathwayStationDef
                    {
                        PathwayDefinitionId = def.Id,
                        RoomCode = s.RoomCode,
                        TitleFa = s.TitleFa,
                        StepOrder = s.StepOrder,
                        IsOptional = s.IsOptional,
                    });
                }
                db.PathwayDefinitions.Add(def);
            }
            else
            {
                def.Title = title;
                def.Description = c.Description;
                def.EstimatedTotalMinutes = c.EstimatedTotalMinutes;
                def.IsActive = true;
                def.IsInLibrary = true;
                def.Gender = c.Gender;
                def.MinAge = c.MinAge;
                def.MaxAge = c.MaxAge;
                def.JobCategory = "همه";
                def.UpdatedAt = DateTime.UtcNow;
                await ReconcileCorporateStationsAsync(def, c.Stations, ct);
            }
        }

        // قرارداد دمو: پیش‌فرض + هم‌ترازی کد مسیر اعضای seed
        var demo = await db.CorporateContracts.FirstOrDefaultAsync(c => c.Code == "DEMO-ORG", ct);
        if (demo is not null)
        {
            demo.DefaultPathwayCode = HealthPathwayTitles.DefaultCode;
            demo.UpdatedAt = DateTime.UtcNow;
            var members = await db.ContractMembers.Include(m => m.Person)
                .Where(m => m.ContractId == demo.Id).ToListAsync(ct);
            foreach (var m in members)
            {
                var age = AgeCalculator.FromBirthDate(m.Person.BirthDate);
                var gender = m.Person.Gender ?? "";
                string code;
                if (gender == "زن")
                    code = age is >= 40 ? HealthPathwayTitles.CorpWomenGe40 : HealthPathwayTitles.CorpWomenLt40;
                else
                    code = age is >= 40 ? HealthPathwayTitles.CorpMenGe40 : HealthPathwayTitles.CorpMenLt40;
                m.AssignedPathwayCode = code;
                m.AssignedPathwayTitle = HealthPathwayTitles.Resolve(code);
                m.MatchedPathwayTitle = null;
                m.UpdatedAt = DateTime.UtcNow;
                if (m.LinkedPatientId is Guid pid)
                {
                    var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == pid, ct);
                    if (patient is not null)
                    {
                        patient.AssignedPathwayCode = code;
                        patient.AssignedPathwayTitle = HealthPathwayTitles.Resolve(code);
                        patient.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }
        }

        await db.SaveChangesAsync(ct);
    }

    /// <summary>UC-ADM-25 — کاتالوگ ایستگاه کلینیک از کدهای مسیر سازمانی + مطب‌های نمونه.</summary>
    private async Task EnsureClinicStationsAsync(Guid clinicId, CancellationToken ct)
    {
        var catalog = new Dictionary<string, (string Title, string Category, int Floor, string RoomNumber)>(
            StringComparer.OrdinalIgnoreCase);

        foreach (var entry in CorporatePathwayStationCatalog.Entries)
        {
            foreach (var s in entry.Stations)
            {
                if (catalog.ContainsKey(s.RoomCode)) continue;
                var category = s.RoomCode switch
                {
                    "LAB" or "ECG" or "US_ABD" or "US_BREAST" or "STRESS" or "PAP" or "RADIO" => "paraclinic",
                    "HOSP_MEAL" => "hospitality",
                    "REMOTE_REVIEW" => "remote",
                    _ => "specialist",
                };
                catalog[s.RoomCode] = (s.TitleFa, category, 1, "");
            }
        }

        // مطب‌های نمونهٔ mock که در مسیر سازمانی نیستند
        catalog.TryAdd("PULMO", ("مطب فوق‌تخصصی ریه", "specialist", 2, "۲۰۶"));
        catalog.TryAdd("DENTAL", ("کلینیک دندانپزشکی", "specialist", 3, "۳۰۲"));
        catalog.TryAdd("RADIO", ("رادیولوژی و تصویربرداری دیجیتال", "paraclinic", 1, "۱۰۵"));
        catalog.TryAdd("CARDIO", ("مطب تخصصی قلب و عروق", "specialist", 2, "۲۰۱"));
        catalog.TryAdd("LAB", ("آزمایشگاه تشخیص طبی", "paraclinic", 1, "۱۰۲"));
        catalog.TryAdd("ECG", ("نوار قلب (ECG)", "paraclinic", 2, "۲۰۴"));

        var existing = await db.ClinicStations.Where(x => x.ClinicId == clinicId).ToListAsync(ct);
        var byCode = existing.ToDictionary(x => x.Code, StringComparer.OrdinalIgnoreCase);
        var sort = 1;
        foreach (var (code, meta) in catalog.OrderBy(kv => kv.Key))
        {
            if (byCode.ContainsKey(code)) continue;
            db.ClinicStations.Add(new ClinicStation
            {
                ClinicId = clinicId,
                Code = code.ToUpperInvariant(),
                TitleFa = meta.Title,
                Category = meta.Category,
                Floor = meta.Floor,
                RoomNumber = meta.RoomNumber,
                IsActive = true,
                SortOrder = sort++,
            });
        }

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// هم‌ترازی ایستگاه‌ها با کاتالوگ: upsert روی RoomCode، حذف اضافه‌ها پس از پاک کردن progress وابسته.
    /// Guid تعریف مسیر حفظ می‌شود تا LibraryPathwayId قرارداد نشکند.
    /// </summary>
    private async Task ReconcileCorporateStationsAsync(
        PathwayDefinition def,
        IReadOnlyList<CorporatePathwayStationSpec> desired,
        CancellationToken ct)
    {
        var desiredCodes = desired.Select(s => s.RoomCode).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingByCode = def.Stations
            .GroupBy(s => s.RoomCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var toRemove = def.Stations
            .Where(s => !desiredCodes.Contains(s.RoomCode))
            .ToList();
        if (toRemove.Count > 0)
        {
            var removeIds = toRemove.Select(s => s.Id).ToList();
            var orphanProgress = await db.PatientPathwayStationProgresses
                .Where(p => removeIds.Contains(p.PathwayStationDefId))
                .ToListAsync(ct);
            if (orphanProgress.Count > 0)
                db.PatientPathwayStationProgresses.RemoveRange(orphanProgress);
            db.PathwayStationDefs.RemoveRange(toRemove);
            foreach (var s in toRemove)
                def.Stations.Remove(s);
        }

        foreach (var spec in desired.OrderBy(s => s.StepOrder))
        {
            if (existingByCode.TryGetValue(spec.RoomCode, out var row))
            {
                row.TitleFa = spec.TitleFa;
                row.StepOrder = spec.StepOrder;
                row.IsOptional = spec.IsOptional;
                row.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                def.Stations.Add(new PathwayStationDef
                {
                    PathwayDefinitionId = def.Id,
                    RoomCode = spec.RoomCode,
                    TitleFa = spec.TitleFa,
                    StepOrder = spec.StepOrder,
                    IsOptional = spec.IsOptional,
                });
            }
        }
    }

    /// <summary>
    /// Person بدون NID روی موبایل قفل؛ انتقال نقش Platform از Person/Patient اشتباه؛ حذف Patient روی staff.
    /// </summary>
    private async Task EnsurePlatformAdminAsync(CancellationToken ct)
    {
        var mobile = PlatformAdminIdentity.Mobile;
        var platPerson = await EnsurePersonAsync(mobile, null, "ادمین", "کل", null, null, ct);
        var plat = await EnsureUserAsync(platPerson, ct);

        // نقش Platform روی همان موبایل ولی User اشتباه (مثلاً Person بیمار) را جدا کن
        var wrongPlatformRoles = await db.UserRoleAssignments
            .Include(r => r.User).ThenInclude(u => u!.Person)
            .Where(r => r.Role == AppRole.Platform
                        && r.UserId != plat.Id
                        && r.User.Person.Mobile == mobile)
            .ToListAsync(ct);
        foreach (var wrong in wrongPlatformRoles)
            db.UserRoleAssignments.Remove(wrong);

        if (!await db.UserRoleAssignments.AnyAsync(r => r.UserId == plat.Id && r.Role == AppRole.Platform, ct))
            db.UserRoleAssignments.Add(new UserRoleAssignment { UserId = plat.Id, Role = AppRole.Platform });

        if (!plat.IsActive)
        {
            plat.IsActive = true;
            plat.UpdatedAt = DateTime.UtcNow;
        }

        // staff ادمین کل نباید پرونده بیمار داشته باشد — مسیر OTP تک‌کاندیدا می‌ماند
        var strayPatients = await db.Patients.Where(p => p.PersonId == platPerson.Id).ToListAsync(ct);
        if (strayPatients.Count > 0)
            db.Patients.RemoveRange(strayPatients);
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

    private async Task EnsureSmsCampaignTemplatesAsync(CancellationToken ct)
    {
        // seed قالب‌های پلتفرم؛ ProviderTemplateName را ادمین کل با نام واقعی کاوه‌نگار هم‌تراز می‌کند
        var seeds = new (string Code, string Title, string Body, string Provider, string TokensJson, bool RequiresEmr, int Order)[]
        {
            ("invite_register", "دعوت تکمیل ثبت‌نام پیش‌پذیرش",
                "سلام {name}، برای تکمیل ثبت‌نام پیش‌پذیرش از لینک اختصاصی استفاده کنید: {invite_url}",
                "invite", """["invite_token","name"]""", false, 1),
            ("abandon_followup", "پیگیری رهاکردگان پرسشنامه",
                "سلام {name}، تکمیل پرسشنامه پیش‌پذیرش شما ناتمام مانده است. ادامه از این لینک: {invite_url}",
                "invite", """["invite_token","name"]""", false, 2),
            ("appointment_today", "یادآوری نوبت امروز",
                "سلام {name}، یادآوری نوبت مراجعهٔ امروز. جزئیات و لینک: {invite_url}",
                "invite", """["invite_token","name"]""", false, 3),
            ("emr_view", "لینک مشاهده پرونده الکترونیک",
                "سلام {name}، برای مشاهده پرونده الکترونیک از این لینک استفاده کنید: {emr_url}",
                "emr_view", """["name","emr_url"]""", true, 4),
        };

        foreach (var s in seeds)
        {
            var row = await db.SmsCampaignTemplates.FirstOrDefaultAsync(t => t.Code == s.Code, ct);
            if (row is null)
            {
                db.SmsCampaignTemplates.Add(new SmsCampaignTemplate
                {
                    Code = s.Code,
                    Title = s.Title,
                    BodyPreview = s.Body,
                    ProviderTemplateName = s.Provider,
                    TokenKeysJson = s.TokensJson,
                    RequiresEmrUrl = s.RequiresEmr,
                    // قالب پرونده تا آماده‌شدن لینک، seed می‌شود ولی IsActive=false
                    IsActive = !s.RequiresEmr,
                    SortOrder = s.Order,
                });
            }
        }
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
