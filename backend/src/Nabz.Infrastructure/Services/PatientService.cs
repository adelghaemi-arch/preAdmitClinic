/*
 File: backend/src/Nabz.Infrastructure/Services/PatientService.cs
 Description: EnsureAdmitted، snapshot Owner با hospitalIntro، پروفایل/سوابق، chart
 Parent Dependencies: IPatientRepository, IContractRepository, IFormRepository, IPersonRepository
 */

using System.Globalization;
using System.Text.Json;
using Nabz.Application.Abstractions;
using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Patients;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Forms;

namespace Nabz.Infrastructure.Services;

public sealed class PatientService(
    IPatientRepository patients,
    IPatientProfileRevisionRepository profileRevisions,
    IContractRepository contracts,
    IUserRepository users,
    IPersonRepository persons,
    IFormRepository forms,
    IEvidenceRepository evidence,
    IClinicRepository clinics,
    IPathwayCatalogRepository pathwayCatalog,
    IUnitOfWork uow) : IPatientService
{
    public Task<PatientDto> AdmitContractMemberAsync(Guid memberId, CancellationToken ct = default)
        => EnsureAdmittedFromMemberAsync(memberId, ct);

    public async Task<PatientDto> EnsureAdmittedFromMemberAsync(Guid memberId, CancellationToken ct = default)
    {
        var member = await contracts.GetMemberByIdAsync(memberId, ct)
            ?? throw new InvalidOperationException("عضو قرارداد یافت نشد.");
        var roster = member.Person ?? throw new InvalidOperationException("هویت عضو بارگذاری نشد.");
        if (string.IsNullOrWhiteSpace(roster.NationalId) || string.IsNullOrWhiteSpace(roster.Mobile))
            throw new InvalidOperationException("داده عضو ناقص است.");

        var contract = await contracts.GetByIdAsync(member.ContractId, ct: ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");

        // همیشه NID نرمال برای جلوگیری از پرونده تکراری به‌خاطر صفر پیشوند اکسل
        var nid = IranNationalId.Normalize(roster.NationalId);
        roster.NationalId = nid;
        var canonicalPerson = await persons.GetByNationalIdAsync(nid, ct);
        if (canonicalPerson is not null && canonicalPerson.Id != roster.Id)
        {
            // عضو باید همان Person کدملی باشد — هم‌تراز import/Ensure
            member.PersonId = canonicalPerson.Id;
            member.Person = canonicalPerson;
            roster = canonicalPerson;
        }

        if (member.LinkedPatientId is Guid existingId)
        {
            var existing = await patients.GetByIdAsync(existingId, ct);
            if (existing is not null)
            {
                SyncPatientFromMember(existing, member);
                member.UpdatedAt = DateTime.UtcNow;
                await uow.SaveChangesAsync(ct);
                return Map(existing, member.ScheduledVisitDate);
            }
        }

        var byNational = await patients.GetByNationalIdAsync(nid, contract.ClinicId, ct);
        if (byNational is not null)
        {
            // تکراری: فقط لینک قرارداد — Patient جدید ساخته نمی‌شود
            member.LinkedPatientId = byNational.Id;
            SyncPatientFromMember(byNational, member);
            member.UpdatedAt = DateTime.UtcNow;
            await uow.SaveChangesAsync(ct);
            return Map(byNational, member.ScheduledVisitDate);
        }

        var phone = IranMobile.Normalize(roster.Mobile);
        PersonEnsureHelper.ApplyRosterToPerson(roster, PersonEnsureHelper.FromPerson(roster) with { Mobile = phone, NationalId = nid });

        // هویت مالک فقط با کدملی — موبایل تکراری نباید دو بیمار را یکی کند
        var owner = await users.GetByNationalIdAsync(nid, ct);
        var patient = new Patient
        {
            ClinicId = contract.ClinicId,
            PersonId = roster.Id,
            Person = roster,
            OwnerUserId = owner?.Id,
            LinkedContractMemberId = member.Id,
            MaritalStatus = MaritalStatusNormalizer.Normalize(member.MaritalStatus) ?? member.MaritalStatus,
            AssignedPathwayCode = member.AssignedPathwayCode,
            AssignedPathwayTitle = member.AssignedPathwayTitle,
            QrToken = Guid.NewGuid().ToString("N"),
            IntakeCompleted = false
        };
        await patients.AddAsync(patient, ct);

        if (owner is null)
        {
            owner = new User
            {
                PersonId = roster.Id,
                Person = roster,
                IsActive = true
            };
            await users.AddAsync(owner, ct);
            users.AddRole(new UserRoleAssignment { UserId = owner.Id, Role = AppRole.Owner, ClinicId = contract.ClinicId });
            patient.OwnerUserId = owner.Id;
        }
        else
        {
            // همگام Person مالک با roster؛ موبایل Person فقط اگر خالی — تا OTP چندهویتی نشکند
            var ownerPerson = owner.Person;
            if (string.IsNullOrWhiteSpace(ownerPerson.FirstName)) ownerPerson.FirstName = roster.FirstName;
            if (string.IsNullOrWhiteSpace(ownerPerson.LastName)) ownerPerson.LastName = roster.LastName;
            ownerPerson.BirthDate ??= roster.BirthDate;
            if (string.IsNullOrWhiteSpace(ownerPerson.Mobile) && IranMobile.IsValid(phone))
                ownerPerson.Mobile = phone;
            ownerPerson.UpdatedAt = DateTime.UtcNow;
            owner.UpdatedAt = DateTime.UtcNow;
            if (patient.OwnerUserId is null)
                patient.OwnerUserId = owner.Id;
        }

        member.LinkedPatientId = patient.Id;
        member.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return Map(patient, member.ScheduledVisitDate);
    }

    public async Task<PatientDto?> GetAsync(Guid patientId, CancellationToken ct = default)
    {
        var p = await patients.GetByIdAsync(patientId, ct);
        return p is null ? null : await MapAsync(p, ct);
    }

    public async Task<PatientDto?> LookupByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default)
    {
        var nid = IranNationalId.Normalize(nationalId);
        var p = await patients.GetByNationalIdAsync(nid, clinicId, ct);
        return p is null ? null : await MapAsync(p, ct);
    }

    public async Task<AdmissionLookupDto> AdmissionLookupByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default)
    {
        const string notInContractMsg =
            "کد ملی شما در هیچ قراردادی یافت نشد. لطفا با سازمان خود جهت ثبت اطلاعات تماس حاصل فرمایید.";
        var nid = IranNationalId.Normalize(nationalId);
        var patient = await patients.GetByNationalIdAsync(nid, clinicId, ct);
        var member = await contracts.FindActiveMemberByNationalIdAsync(clinicId, nid, ct);
        var inContract = member is not null;

        if (patient is not null)
            return new AdmissionLookupDto(true, true, inContract, false, null, await MapAsync(patient, ct));

        if (inContract)
            return new AdmissionLookupDto(true, false, true, false, null, null);

        // بدون عضویت قرارداد فعال: پذیرش walk-in مجاز نیست
        return new AdmissionLookupDto(true, false, false, true, notInContractMsg, null);
    }

    public async Task<IReadOnlyList<PatientDto>> SearchAsync(Guid clinicId, string? query, int take = 50, CancellationToken ct = default)
    {
        var list = await patients.SearchAsync(clinicId, query, take, ct);
        return list.Select(p => Map(p)).ToList();
    }

    public async Task<PatientDto?> GetForOwnerAsync(Guid userId, CancellationToken ct = default)
    {
        var p = await patients.GetByOwnerUserIdAsync(userId, ct);
        return p is null ? null : await MapAsync(p, ct);
    }

    public async Task<OwnerIntakeSnapshotDto?> GetOwnerIntakeSnapshotAsync(Guid userId, CancellationToken ct = default)
    {
        var p = await patients.GetByOwnerUserIdAsync(userId, ct);
        if (p is null) return null;

        string? formStatus = null;
        Guid? formId = null;
        string? formCode = null;
        var formProgressPct = 0;
        var intakeGate = "already_complete";
        string? intakeGateMessage =
            "شما قبلاً پیش‌پذیرش را تکمیل کرده‌اید؛ نیازی به تکرار این مرحله نیست.";
        var clinic = await clinics.GetCurrentAsync(ct);
        if (clinic is not null)
        {
            // ساختار آیتم‌ها برای محاسبهٔ درصد پیشرفت پیش‌نویس لازم است
            var formList = await forms.ListByClinicWithStructureAsync(clinic.Id, ct);
            var publishedMatching = formList
                .Where(f => f.Status == FormPublishStatus.Published)
                .Where(f => FormAudienceEvaluator.MatchesFormAudience(f, p, out _))
                .ToList();

            // اولین فرم مخاطب‌شدهٔ بدون Submitted = سوالات جدید/ناتمام
            foreach (var published in publishedMatching)
            {
                var response = await forms.GetResponseAsync(p.Id, published.Id, ct);
                var status = response?.Status.ToString() ?? "None";
                formId ??= published.Id;
                formCode ??= published.Code;
                formStatus ??= status;
                if (response is null || response.Status != FormResponseStatus.Submitted)
                {
                    intakeGate = "needs_form";
                    intakeGateMessage = null;
                    formId = published.Id;
                    formCode = published.Code;
                    formStatus = status;
                    if (response?.Answers is { Count: > 0 })
                    {
                        var answerMap = response.Answers
                            .GroupBy(a => a.ItemCode, StringComparer.OrdinalIgnoreCase)
                            .ToDictionary(
                                g => g.Key,
                                g => (string?)(g.Last().ValueCode ?? g.Last().ValueRaw),
                                StringComparer.OrdinalIgnoreCase);
                        formProgressPct = FormService.ComputeFormProgressPct(published, p, answerMap);
                    }
                    break;
                }
            }

            if (publishedMatching.Count == 0)
            {
                // بدون فرم مخاطب — اگر intake کامل است پیام تکمیل؛ وگرنه نیاز به فرم عمومی
                if (!p.IntakeCompleted)
                {
                    intakeGate = "needs_form";
                    intakeGateMessage = null;
                }
            }
            else if (intakeGate == "already_complete" && !p.IntakeCompleted)
            {
                // همه submitted ولی فلگ پرونده هنوز false — همگام با واقعیت
                intakeGate = "needs_form";
                intakeGateMessage = null;
            }
        }
        else if (!p.IntakeCompleted)
        {
            intakeGate = "needs_form";
            intakeGateMessage = null;
        }

        var docs = await evidence.ListDocumentGroupsByPatientAsync(p.Id, ct);
        var portrait = await evidence.GetLatestPortraitAsync(p.Id, ct);
        var gps = await evidence.ListGpsByPatientAsync(p.Id, 1, ct);

        var hospitalName = clinic?.Name;
        var hospitalIntroStatus = "not_introduced";
        string? introducedMasked = null;
        DateOnly? scheduledVisitDate = null;
        var person = p.Person;
        var nid = IranNationalId.Normalize(person.NationalId ?? "");
        if (clinic is not null && !string.IsNullOrWhiteSpace(nid))
        {
            var member = await contracts.FindActiveMemberByNationalIdAsync(clinic.Id, nid, ct);
            if (member is not null)
            {
                scheduledVisitDate = member.ScheduledVisitDate;
                // عضو قرارداد هم درصد را نگه می‌دارد؛ اگر از پاسخ فرم صفر بود از اینجا بردار
                if (formProgressPct <= 0 && member.ProfileProgressPct > 0 && !p.IntakeCompleted)
                    formProgressPct = Math.Clamp(member.ProfileProgressPct, 0, 99);
                var introduced = IranMobile.Normalize(
                    string.IsNullOrWhiteSpace(member.IntroducedMobile) ? member.Person.Mobile : member.IntroducedMobile);
                var current = IranMobile.Normalize(person.Mobile ?? "");
                if (!string.IsNullOrWhiteSpace(introduced) &&
                    !string.IsNullOrWhiteSpace(current) &&
                    !string.Equals(introduced, current, StringComparison.Ordinal))
                {
                    hospitalIntroStatus = "mobile_mismatch";
                    introducedMasked = MaskMobile(introduced);
                }
                else
                {
                    hospitalIntroStatus = "introduced";
                }
            }
        }

        if (p.IntakeCompleted || string.Equals(intakeGate, "already_complete", StringComparison.Ordinal))
            formProgressPct = 100;

        var profileComplete = IsProfileComplete(person);
        // itinerary از کاتالوگ مسیر تخصیص‌یافته — مستقل از پذیرش روز مراجعه
        var itinerary = await BuildPathwayItineraryAsync(p, ct);

        return new OwnerIntakeSnapshotDto(
            Map(p, scheduledVisitDate), formStatus, formId, formCode, docs.Count, portrait is not null, gps.Count,
            intakeGate, intakeGateMessage,
            hospitalIntroStatus, hospitalName, introducedMasked, profileComplete,
            // تامنیل اطلاعات پایه روی فرانت با همین کلید از /api/files لود می‌شود
            portrait?.StorageKey, itinerary, formProgressPct);
    }

    public async Task<PathwayItineraryStationDto> ConfirmPathwayStationAsync(
        Guid ownerUserId, Guid stationDefId, CancellationToken ct = default)
    {
        var p = await patients.GetByOwnerUserIdAsync(ownerUserId, ct)
            ?? throw new InvalidOperationException("پرونده یافت نشد.");
        if (!p.IntakeCompleted)
            throw new InvalidOperationException("پس از تکمیل پیش‌پذیرش می‌توانید ایستگاه‌ها را تأیید کنید.");

        var station = await pathwayCatalog.GetStationByIdAsync(stationDefId, ct)
            ?? throw new InvalidOperationException("ایستگاه مسیر یافت نشد.");

        var def = await pathwayCatalog.GetByCodeAsync(
            p.AssignedPathwayCode ?? HealthPathwayTitles.DefaultCode, includeStations: true, ct);
        if (def is null || def.Stations.All(s => s.Id != stationDefId))
            throw new InvalidOperationException("این ایستگاه متعلق به مسیر تخصیص‌یافته شما نیست.");

        var existing = await pathwayCatalog.GetProgressAsync(p.Id, stationDefId, ct);
        if (existing is null)
        {
            await pathwayCatalog.AddProgressAsync(new PatientPathwayStationProgress
            {
                PatientId = p.Id,
                PathwayStationDefId = stationDefId,
                ConfirmedAt = DateTime.UtcNow
            }, ct);
            await uow.SaveChangesAsync(ct);
            existing = await pathwayCatalog.GetProgressAsync(p.Id, stationDefId, ct);
        }

        return new PathwayItineraryStationDto(
            station.Id,
            station.RoomCode,
            station.TitleFa,
            station.StepOrder,
            station.IsOptional,
            true,
            existing?.ConfirmedAt ?? DateTime.UtcNow);
    }

    private async Task<IReadOnlyList<PathwayItineraryStationDto>> BuildPathwayItineraryAsync(
        Patient p, CancellationToken ct)
    {
        var code = string.IsNullOrWhiteSpace(p.AssignedPathwayCode)
            ? HealthPathwayTitles.DefaultCode
            : p.AssignedPathwayCode!;
        var def = await pathwayCatalog.GetByCodeAsync(code, includeStations: true, ct);
        if (def is null || def.Stations.Count == 0)
            return Array.Empty<PathwayItineraryStationDto>();

        var progress = await pathwayCatalog.ListProgressByPatientAsync(p.Id, ct);
        var byStation = progress.ToDictionary(x => x.PathwayStationDefId);
        return def.Stations
            .OrderBy(s => s.StepOrder)
            .Select(s =>
            {
                byStation.TryGetValue(s.Id, out var prog);
                return new PathwayItineraryStationDto(
                    s.Id,
                    s.RoomCode,
                    s.TitleFa,
                    s.StepOrder,
                    s.IsOptional,
                    prog is not null,
                    prog?.ConfirmedAt);
            })
            .ToList();
    }

    public async Task<PatientChartDto?> GetChartAsync(Guid patientId, CancellationToken ct = default)
    {
        var p = await patients.GetByIdAsync(patientId, ct);
        if (p is null) return null;

        string? formStatus = null;
        Guid? formId = null;
        string? formCode = null;
        var formList = await forms.ListByClinicAsync(p.ClinicId, ct);
        var published = formList.FirstOrDefault(f => f.Status == FormPublishStatus.Published);
        if (published is not null)
        {
            formId = published.Id;
            formCode = published.Code;
            var response = await forms.GetResponseAsync(p.Id, published.Id, ct);
            formStatus = response?.Status.ToString() ?? "None";
        }

        var docEntities = await evidence.ListDocumentGroupsByPatientAsync(p.Id, ct);
        var docs = docEntities
            .Select(g => new DocumentGroupDto(g.Id, g.PatientId, g.DocumentType, g.TypeLabelFa, g.Files.Count))
            .ToList();
        var portrait = await evidence.GetLatestPortraitAsync(p.Id, ct);
        var gpsEntities = await evidence.ListGpsByPatientAsync(p.Id, 20, ct);
        var personName = PersonName.Display(p.Person.FirstName, p.Person.LastName);
        var gps = gpsEntities
            .Select(g => new GpsPointDto(
                g.Id, g.PatientId, g.UserId, g.Lat, g.Lon, g.Accuracy, g.CapturedAt, g.Source,
                personName, p.Person.NationalId))
            .ToList();

        return new PatientChartDto(Map(p), formStatus, formId, formCode, docs, portrait?.StorageKey, gps);
    }

    public async Task<PatientIntakeStatusDto?> GetIntakeStatusAsync(Guid patientId, CancellationToken ct = default)
    {
        var p = await patients.GetByIdAsync(patientId, ct);
        if (p is null) return null;

        string? formStatus = null;
        Guid? formId = null;
        string? formCode = null;
        var formList = await forms.ListByClinicAsync(p.ClinicId, ct);
        var published = formList.FirstOrDefault(f => f.Status == FormPublishStatus.Published);
        if (published is not null)
        {
            formId = published.Id;
            formCode = published.Code;
            var response = await forms.GetResponseAsync(p.Id, published.Id, ct);
            formStatus = response?.Status.ToString() ?? "None";
        }

        var docs = await evidence.ListDocumentGroupsByPatientAsync(p.Id, ct);
        var portrait = await evidence.GetLatestPortraitAsync(p.Id, ct);
        var gps = await evidence.ListGpsByPatientAsync(p.Id, 1, ct);

        // فقط وضعیت و شرح — بدون متن پاسخ پزشکی
        return new PatientIntakeStatusDto(
            Map(p), formStatus, formId, formCode, docs.Count, portrait is not null, gps.Count, p.Description);
    }

    public async Task<PatientDto> UpdatePhoneAsync(Guid patientId, string phone, CancellationToken ct = default)
    {
        var normalized = IranMobile.Normalize(phone);
        if (!IranMobile.IsValid(normalized))
            throw new InvalidOperationException("شماره موبایل نامعتبر است.");

        var p = await patients.GetByIdAsync(patientId, ct)
            ?? throw new InvalidOperationException("بیمار یافت نشد.");

        p.Person.Mobile = normalized;
        p.Person.UpdatedAt = DateTime.UtcNow;
        p.UpdatedAt = DateTime.UtcNow;

        // زنجیره ورود: User مالک و عضو قرارداد با همان PersonId
        if (p.OwnerUserId is Guid ownerId)
        {
            var owner = await users.GetByIdAsync(ownerId, ct);
            if (owner is not null && owner.PersonId == p.PersonId)
            {
                owner.UpdatedAt = DateTime.UtcNow;
            }
        }

        if (p.LinkedContractMemberId is Guid memberId)
        {
            var member = await contracts.GetMemberByIdAsync(memberId, ct);
            if (member is not null && member.PersonId == p.PersonId)
                member.UpdatedAt = DateTime.UtcNow;
        }

        await uow.SaveChangesAsync(ct);
        return Map(p);
    }

    public async Task<PatientDto> UpdateHomeAddressAsync(
        Guid patientId,
        Guid actingUserId,
        UpdatePatientHomeAddressRequest body,
        CancellationToken ct = default)
    {
        var err = ResidenceAddressParser.ValidateHomeRequest(body);
        if (err is not null)
            throw new InvalidOperationException(err);

        var p = await patients.GetByIdAsync(patientId, ct)
            ?? throw new InvalidOperationException("بیمار یافت نشد.");
        // فقط مالک پرونده آدرس منزل را عوض می‌کند
        if (p.OwnerUserId != actingUserId)
            throw new UnauthorizedAccessException("فقط مالک پرونده مجاز است.");

        var before = PatientProfileDiff.SnapshotHome(p);
        ResidenceAddressParser.ApplyToPatient(p, body);
        var after = PatientProfileDiff.SnapshotHome(p);
        var revs = PatientProfileDiff.Build(p.Id, actingUserId, "companion_map", before, after);
        if (revs.Count > 0)
            await profileRevisions.AddRangeAsync(revs, ct);
        await uow.SaveChangesAsync(ct);
        return Map(p);
    }

    public Task<PatientDto> UpdateMyProfileAsync(Guid ownerUserId, UpdatePatientProfileRequest body, CancellationToken ct = default)
        => UpdateProfileCoreAsync(ownerUserId, body, allowGender: false, requireOwnerMatch: true, source: "owner_profile", ct);

    public Task<PatientDto> UpdateProfileAsync(
        Guid patientId, Guid actingUserId, UpdatePatientProfileRequest body, bool allowGender, CancellationToken ct = default)
        => UpdateProfileCoreAsync(actingUserId, body, allowGender, requireOwnerMatch: false, source: "admin", ct, patientId);

    public async Task<PatientDto> DismissJourneyIntroAsync(Guid ownerUserId, CancellationToken ct = default)
    {
        var p = await patients.GetByOwnerUserIdAsync(ownerUserId, ct)
            ?? throw new InvalidOperationException("پروندهٔ سلامتجو برای این حساب یافت نشد.");
        // مایلستون intro — فقط یک‌بار؛ بدون revision پروفایل
        if (!p.JourneyIntroSeen)
        {
            p.JourneyIntroSeen = true;
            p.UpdatedAt = DateTime.UtcNow;
            await uow.SaveChangesAsync(ct);
        }
        return Map(p);
    }

    public async Task<IReadOnlyList<PatientProfileRevisionDto>> ListProfileRevisionsAsync(
        Guid patientId, int take = 100, CancellationToken ct = default)
    {
        var list = await profileRevisions.ListByPatientAsync(patientId, Math.Clamp(take, 1, 500), ct);
        return list.Select(x => new PatientProfileRevisionDto(
            x.Id, x.At, x.Field, x.OldValue, x.NewValue, x.ChangedByUserId, x.Source)).ToList();
    }

    public async Task SyncOpenDraftDemographicsAsync(Guid patientId, CancellationToken ct = default)
    {
        var patient = await patients.GetByIdAsync(patientId, ct);
        if (patient is null) return;
        var allForms = await forms.ListByClinicWithStructureAsync(patient.ClinicId, ct);
        foreach (var f in allForms.Where(x => x.Status == FormPublishStatus.Published))
        {
            var response = await forms.GetResponseAsync(patientId, f.Id, ct);
            if (response is null || response.Status != FormResponseStatus.Draft) continue;
            PatchDraftAnswer(response, f, "_BASE_birthDate", patient.Person.BirthDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            // draft با مقدار نرمال‌شده تا select کاتالوگ خالی نماند
            PatchDraftAnswer(response, f, "_BASE_maritalStatus",
                MaritalStatusNormalizer.Normalize(patient.MaritalStatus) ?? patient.MaritalStatus, asCode: true);
            if (patient.HomeLat is not null && patient.HomeLon is not null && !string.IsNullOrWhiteSpace(patient.HomeAddress))
            {
                var json = JsonSerializer.Serialize(new
                {
                    lat = patient.HomeLat,
                    lon = patient.HomeLon,
                    address = patient.HomeAddress,
                    plaque = patient.HomePlaque ?? "",
                    unit = patient.HomeUnit,
                    postalCode = patient.HomePostalCode
                });
                PatchDraftAnswer(response, f, "_BASE_residence", json);
            }
            response.UpdatedAt = DateTime.UtcNow;
        }
        await uow.SaveChangesAsync(ct);
    }

    private async Task<PatientDto> UpdateProfileCoreAsync(
        Guid actingUserId,
        UpdatePatientProfileRequest body,
        bool allowGender,
        bool requireOwnerMatch,
        string source,
        CancellationToken ct,
        Guid? patientId = null)
    {
        Patient? p;
        if (requireOwnerMatch)
        {
            p = await patients.GetByOwnerUserIdAsync(actingUserId, ct)
                ?? throw new InvalidOperationException("پروندهٔ سلامتجو برای این حساب یافت نشد.");
        }
        else
        {
            p = await patients.GetByIdAsync(patientId ?? Guid.Empty, ct)
                ?? throw new InvalidOperationException("بیمار یافت نشد.");
        }

        if (body.ApplyHome)
        {
            if (body.HomeLat is null || body.HomeLon is null || string.IsNullOrWhiteSpace(body.HomeAddress))
                throw new InvalidOperationException("برای ذخیرهٔ آدرس، مختصات و متن آدرس الزامی است.");
            var homeErr = ResidenceAddressParser.ValidateHomeRequest(new UpdatePatientHomeAddressRequest(
                body.HomeLat.Value, body.HomeLon.Value, body.HomeAddress,
                body.HomePlaque, body.HomeUnit, body.HomePostalCode));
            if (homeErr is not null) throw new InvalidOperationException(homeErr);
        }

        var before = PatientProfileDiff.SnapshotDemographics(p);

        if (body.FirstName is not null && body.FirstName.Trim().Length < 2)
            throw new InvalidOperationException("نام حداقل ۲ حرف باشد.");
        if (body.LastName is not null && body.LastName.Trim().Length < 2)
            throw new InvalidOperationException("نام‌خانوادگی حداقل ۲ حرف باشد.");

        PersonEnsureHelper.ApplyDemographicsToPerson(
            p.Person,
            body.FirstName,
            body.LastName,
            body.BirthDate,
            body.ClearBirthDate,
            body.Gender,
            allowGender,
            body.FatherName);

        if (body.MaritalStatus is not null)
        {
            // خالی = پاک کردن؛ مقدار غیرکانونیکال رد می‌شود
            if (string.IsNullOrWhiteSpace(body.MaritalStatus))
                p.MaritalStatus = null;
            else
                p.MaritalStatus = MaritalStatusNormalizer.Normalize(body.MaritalStatus)
                    ?? throw new InvalidOperationException("وضعیت تأهل نامعتبر است.");
        }

        if (body.ApplyHome)
        {
            ResidenceAddressParser.ApplyToPatient(p, new UpdatePatientHomeAddressRequest(
                body.HomeLat!.Value, body.HomeLon!.Value, body.HomeAddress!,
                body.HomePlaque, body.HomeUnit, body.HomePostalCode));
        }

        p.UpdatedAt = DateTime.UtcNow;
        var after = PatientProfileDiff.SnapshotDemographics(p);
        var revs = PatientProfileDiff.Build(p.Id, actingUserId, source, before, after);
        if (revs.Count > 0)
            await profileRevisions.AddRangeAsync(revs, ct);

        // همگام Person مالک وقتی همان PersonId است
        if (p.OwnerUserId is Guid ownerId)
        {
            var owner = await users.GetByIdAsync(ownerId, ct);
            if (owner is not null && owner.PersonId == p.PersonId)
                owner.UpdatedAt = DateTime.UtcNow;
        }

        await uow.SaveChangesAsync(ct);
        await SyncOpenDraftDemographicsAsync(p.Id, ct);
        return Map(p);
    }

    private static void PatchDraftAnswer(
        FormResponse response,
        FormDefinition form,
        string suffix,
        string? value,
        bool asCode = false)
    {
        if (value is null) return;
        var hit = response.Answers.FirstOrDefault(a =>
            a.ItemCode.EndsWith(suffix, StringComparison.OrdinalIgnoreCase));
        if (hit is null)
        {
            // از ساختار فرم یا پاسخ موجود — حتی وقتی Answers خالی است
            var itemCode = form.Items
                .Select(i => i.Code)
                .FirstOrDefault(c => c.EndsWith(suffix, StringComparison.OrdinalIgnoreCase));
            if (itemCode is null)
            {
                var sample = response.Answers.FirstOrDefault(a =>
                    a.ItemCode.Contains("_BASE_", StringComparison.Ordinal));
                if (sample is null) return;
                var prefix = sample.ItemCode[..sample.ItemCode.IndexOf("_BASE_", StringComparison.Ordinal)];
                itemCode = prefix + suffix;
            }
            hit = new FormAnswer { ResponseId = response.Id, ItemCode = itemCode };
            response.Answers.Add(hit);
        }
        if (asCode) { hit.ValueCode = value; hit.ValueRaw = value; }
        else { hit.ValueRaw = value; hit.ValueCode = null; }
    }

    /// <summary>لینک چندقراردادی: پکیج و اشاره‌گر عضو؛ هویت فقط وقتی PersonId یکی است روی همان Person.</summary>
    private void SyncPatientFromMember(Patient patient, ContractMember member)
    {
        patient.AssignedPathwayCode = member.AssignedPathwayCode;
        patient.AssignedPathwayTitle = member.AssignedPathwayTitle;
        patient.LinkedContractMemberId = member.Id;

        // Person جدا یعنی دادهٔ ناسازگار؛ رونویسی هویت پرونده از رستر ممنوع
        if (patient.PersonId == member.PersonId)
            PersonEnsureHelper.ApplyRosterToPerson(patient.Person, PersonEnsureHelper.FromPerson(member.Person));

        patient.UpdatedAt = DateTime.UtcNow;
    }

    private async Task<PatientDto> MapAsync(Patient p, CancellationToken ct, DateOnly? scheduledVisitDate = null)
    {
        var visit = scheduledVisitDate;
        // تاریخ مراجعه از عضو لینک‌شده برای بنر پیش‌پذیرش
        if (visit is null && p.LinkedContractMemberId is Guid memberId)
        {
            var member = await contracts.GetMemberByIdAsync(memberId, ct);
            visit = member?.ScheduledVisitDate;
        }
        return Map(p, visit);
    }

    private static PatientDto Map(Patient p, DateOnly? scheduledVisitDate = null)
    {
        var person = p.Person;
        return new(
            p.Id, person.FirstName, person.LastName, PersonName.Display(person.FirstName, person.LastName),
            person.NationalId ?? "", person.Mobile, person.BirthDate, AgeCalculator.FromBirthDate(person.BirthDate), person.Gender,
            MaritalStatusNormalizer.Normalize(p.MaritalStatus) ?? p.MaritalStatus,
            p.IntakeCompleted, p.AssignedPathwayTitle, p.OwnerUserId, p.Description,
            p.HomeLat, p.HomeLon, p.HomeAddress, p.HomePlaque, p.HomeUnit, p.HomePostalCode,
            // تکمیل intake یعنی intro دیگر معنا ندارد — برای دادهٔ قدیمی بدون ستون
            p.JourneyIntroSeen || p.IntakeCompleted,
            person.FatherName,
            scheduledVisitDate);
    }

    private static bool IsProfileComplete(Person person)
    {
        // حداقل هویت برای فرد جدید قبل از استفاده از پنل
        if (string.IsNullOrWhiteSpace(person.FirstName) || person.FirstName.Trim().Length < 2) return false;
        if (string.IsNullOrWhiteSpace(person.LastName) || person.LastName.Trim().Length < 2) return false;
        if (string.IsNullOrWhiteSpace(IranNationalId.Normalize(person.NationalId ?? ""))) return false;
        if (person.BirthDate is null) return false;
        return true;
    }

    private static string MaskMobile(string mobile)
    {
        var m = IranMobile.Normalize(mobile);
        if (m.Length < 8) return "***";
        return m[..4] + "***" + m[^4..];
    }
}