/*
 File: backend/src/Nabz.Infrastructure/Services/PatientService.cs
 Description: admit عضو قرارداد، جستجو، snapshot پیش‌پذیرش مالک
 Parent Dependencies: IPatientRepository, IFormRepository, IEvidenceRepository
 */

using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Services;

public sealed class PatientService(
    IPatientRepository patients,
    IContractRepository contracts,
    IUserRepository users,
    IFormRepository forms,
    IEvidenceRepository evidence,
    IClinicRepository clinics,
    IUnitOfWork uow) : IPatientService
{
    public async Task<PatientDto> AdmitContractMemberAsync(Guid memberId, CancellationToken ct = default)
    {
        var member = await contracts.GetMemberByIdAsync(memberId, ct)
            ?? throw new InvalidOperationException("عضو قرارداد یافت نشد.");
        if (string.IsNullOrWhiteSpace(member.NationalId) || string.IsNullOrWhiteSpace(member.Phone))
            throw new InvalidOperationException("داده عضو ناقص است.");

        var contract = await contracts.GetByIdAsync(member.ContractId, ct: ct)
            ?? throw new InvalidOperationException("قرارداد یافت نشد.");

        if (member.LinkedPatientId is Guid existingId)
        {
            var existing = await patients.GetByIdAsync(existingId, ct);
            if (existing is not null) return Map(existing);
        }

        var byNational = await patients.GetByNationalIdAsync(member.NationalId, contract.ClinicId, ct);
        if (byNational is not null)
        {
            member.LinkedPatientId = byNational.Id;
            member.UpdatedAt = DateTime.UtcNow;
            await uow.SaveChangesAsync(ct);
            return Map(byNational);
        }

        var owner = await users.GetByMobileAsync(member.Phone, ct);
        var patient = new Patient
        {
            ClinicId = contract.ClinicId,
            OwnerUserId = owner?.Id,
            LinkedContractMemberId = member.Id,
            FullName = member.FullName,
            NationalId = member.NationalId,
            Phone = member.Phone,
            Age = member.Age,
            Gender = member.Gender,
            AssignedPackageCode = member.AssignedPackageCode,
            AssignedPackageTitle = member.AssignedPackageTitle,
            QrToken = Guid.NewGuid().ToString("N"),
            IntakeCompleted = false
        };
        await patients.AddAsync(patient, ct);

        if (owner is null)
        {
            owner = new User
            {
                Mobile = member.Phone,
                FullName = member.FullName,
                NationalId = member.NationalId,
                Gender = member.Gender,
                IsActive = true
            };
            await users.AddAsync(owner, ct);
            users.AddRole(new UserRoleAssignment { UserId = owner.Id, Role = AppRole.Owner, ClinicId = contract.ClinicId });
            patient.OwnerUserId = owner.Id;
        }

        member.LinkedPatientId = patient.Id;
        member.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return Map(patient);
    }

    public async Task<PatientDto?> GetAsync(Guid patientId, CancellationToken ct = default)
    {
        var p = await patients.GetByIdAsync(patientId, ct);
        return p is null ? null : Map(p);
    }

    public async Task<PatientDto?> LookupByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default)
    {
        var p = await patients.GetByNationalIdAsync(nationalId.Trim(), clinicId, ct);
        return p is null ? null : Map(p);
    }

    public async Task<AdmissionLookupDto> AdmissionLookupByNationalIdAsync(Guid clinicId, string nationalId, CancellationToken ct = default)
    {
        const string notInContractMsg =
            "کد ملی شما در هیچ قراردادی یافت نشد. لطفا با سازمان خود جهت ثبت اطلاعات تماس حاصل فرمایید.";
        var nid = nationalId.Trim();
        var patient = await patients.GetByNationalIdAsync(nid, clinicId, ct);
        var member = await contracts.FindActiveMemberByNationalIdAsync(clinicId, nid, ct);
        var inContract = member is not null;

        if (patient is not null)
            return new AdmissionLookupDto(true, true, inContract, false, null, Map(patient));

        if (inContract)
            return new AdmissionLookupDto(true, false, true, false, null, null);

        // بدون عضویت قرارداد فعال: پذیرش walk-in مجاز نیست
        return new AdmissionLookupDto(true, false, false, true, notInContractMsg, null);
    }

    public async Task<IReadOnlyList<PatientDto>> SearchAsync(Guid clinicId, string? query, int take = 50, CancellationToken ct = default)
    {
        var list = await patients.SearchAsync(clinicId, query, take, ct);
        return list.Select(Map).ToList();
    }

    public async Task<PatientDto?> GetForOwnerAsync(Guid userId, CancellationToken ct = default)
    {
        var p = await patients.GetByOwnerUserIdAsync(userId, ct);
        return p is null ? null : Map(p);
    }

    public async Task<OwnerIntakeSnapshotDto?> GetOwnerIntakeSnapshotAsync(Guid userId, CancellationToken ct = default)
    {
        var p = await patients.GetByOwnerUserIdAsync(userId, ct);
        if (p is null) return null;

        string? formStatus = null;
        Guid? formId = null;
        string? formCode = null;
        var clinic = await clinics.GetCurrentAsync(ct);
        if (clinic is not null)
        {
            var formList = await forms.ListByClinicAsync(clinic.Id, ct);
            var published = formList.FirstOrDefault(f => f.Status == FormPublishStatus.Published);
            if (published is not null)
            {
                formId = published.Id;
                formCode = published.Code;
                var response = await forms.GetResponseAsync(p.Id, published.Id, ct);
                formStatus = response?.Status.ToString() ?? "None";
            }
        }

        var docs = await evidence.ListDocumentGroupsByPatientAsync(p.Id, ct);
        var portrait = await evidence.GetLatestPortraitAsync(p.Id, ct);
        var gps = await evidence.ListGpsByPatientAsync(p.Id, 1, ct);

        return new OwnerIntakeSnapshotDto(
            Map(p), formStatus, formId, formCode, docs.Count, portrait is not null, gps.Count);
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
        var gps = gpsEntities
            .Select(g => new GpsPointDto(g.Id, g.PatientId, g.Lat, g.Lon, g.Accuracy, g.CapturedAt, g.Source))
            .ToList();

        return new PatientChartDto(Map(p), formStatus, formId, formCode, docs, portrait?.StorageKey, gps);
    }

    private static PatientDto Map(Patient p) => new(
        p.Id, p.FullName, p.NationalId, p.Phone, p.Age, p.Gender,
        p.IntakeCompleted, p.AssignedPackageTitle, p.OwnerUserId);
}
