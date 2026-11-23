/*
 File: backend/src/Nabz.Infrastructure/Services/FormService.cs
 Description: تعریف/انتشار/ساختار فرم؛ upsert پاسخ؛ مهر formDate سمت سرور هنگام submit
 Parent Dependencies: IFormRepository, IContractRepository, FormAudienceEvaluator, IranTime
 */

using System.Globalization;
using System.Text.Json;
using Nabz.Application.Abstractions;
using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Patients;
using Nabz.Application.Time;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Forms;

namespace Nabz.Infrastructure.Services;

public sealed class FormService(
    IFormRepository forms,
    IPatientRepository patients,
    IPatientProfileRevisionRepository profileRevisions,
    IUserRepository users,
    IContractRepository contracts,
    IUnitOfWork uow) : IFormService
{
    public async Task<FormSummaryDto> UpsertFormAsync(Guid clinicId, Guid? formId, string code, string title, string? warningText, string targetAudienceJson, CancellationToken ct = default)
    {
        FormDefinition form;
        if (formId is Guid id)
        {
            form = await forms.GetByIdAsync(id, includeStructure: false, ct)
                ?? throw new InvalidOperationException("فرم یافت نشد.");
            form.Title = title;
            form.WarningText = warningText;
            form.TargetAudienceJson = targetAudienceJson ?? "{}";
            form.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            form = new FormDefinition
            {
                ClinicId = clinicId,
                Code = code,
                Title = title,
                WarningText = warningText,
                TargetAudienceJson = targetAudienceJson ?? "{}",
                Status = FormPublishStatus.Draft
            };
            await forms.AddAsync(form, ct);
        }
        await uow.SaveChangesAsync(ct);
        return new FormSummaryDto(form.Id, form.Code, form.Title, form.Status.ToString(), form.Version);
    }

    public async Task PublishFormAsync(Guid formId, CancellationToken ct = default)
    {
        var form = await forms.GetByIdAsync(formId, includeStructure: false, ct)
            ?? throw new InvalidOperationException("فرم یافت نشد.");
        form.Status = FormPublishStatus.Published;
        form.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task ReorderItemsAsync(Guid formId, IReadOnlyList<(Guid ItemId, int SortOrder)> orders, CancellationToken ct = default)
    {
        var form = await forms.GetByIdAsync(formId, includeStructure: true, ct)
            ?? throw new InvalidOperationException("فرم یافت نشد.");
        foreach (var (itemId, sort) in orders)
        {
            var item = form.Items.FirstOrDefault(i => i.Id == itemId);
            if (item is null) continue;
            item.SortOrder = sort;
            item.UpdatedAt = DateTime.UtcNow;
        }
        form.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task UpsertStructureAsync(Guid formId, IReadOnlyList<FormSectionUpsert> sections, IReadOnlyList<FormItemUpsert> items, CancellationToken ct = default)
    {
        var form = await forms.GetByIdAsync(formId, includeStructure: true, ct)
            ?? throw new InvalidOperationException("فرم یافت نشد.");

        // Guid سمت کلاینت است — یک SaveChanges کافی است؛ save میانی + reload باعث concurrency می‌شود
        var sectionByCode = form.Sections.ToDictionary(s => s.Code, StringComparer.OrdinalIgnoreCase);
        foreach (var s in sections.OrderBy(x => x.SortOrder))
        {
            if (s.Id is Guid sid && form.Sections.FirstOrDefault(x => x.Id == sid) is { } existing)
            {
                existing.Code = s.Code;
                existing.Title = s.Title;
                existing.SortOrder = s.SortOrder;
                existing.GuideText = s.GuideText;
                existing.UpdatedAt = DateTime.UtcNow;
                sectionByCode[s.Code] = existing;
            }
            else if (sectionByCode.TryGetValue(s.Code, out var byCode))
            {
                byCode.Title = s.Title;
                byCode.SortOrder = s.SortOrder;
                byCode.GuideText = s.GuideText;
                byCode.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var created = new FormSection
                {
                    FormId = form.Id,
                    Code = s.Code,
                    Title = s.Title,
                    SortOrder = s.SortOrder,
                    GuideText = s.GuideText
                };
                form.Sections.Add(created);
                sectionByCode[s.Code] = created;
            }
        }

        foreach (var it in items.OrderBy(x => x.SortOrder))
        {
            if (!sectionByCode.TryGetValue(it.SectionCode, out var section))
                throw new InvalidOperationException($"بخش {it.SectionCode} یافت نشد.");

            FormItem? item = it.Id is Guid iid
                ? form.Items.FirstOrDefault(x => x.Id == iid)
                : form.Items.FirstOrDefault(x => x.Code == it.Code);

            if (item is null)
            {
                form.Items.Add(new FormItem
                {
                    FormId = form.Id,
                    SectionId = section.Id,
                    Code = it.Code,
                    LabelFa = it.LabelFa,
                    InputType = it.InputType,
                    Required = it.Required,
                    SortOrder = it.SortOrder,
                    VisibilityRulesJson = it.VisibilityRulesJson ?? "[]",
                    HelpText = it.HelpText,
                    SelectOptionsJson = it.SelectOptionsJson,
                    CodingJson = it.CodingJson ?? "{}"
                });
            }
            else
            {
                item.SectionId = section.Id;
                item.Code = it.Code;
                item.LabelFa = it.LabelFa;
                item.InputType = it.InputType;
                item.Required = it.Required;
                item.SortOrder = it.SortOrder;
                item.VisibilityRulesJson = it.VisibilityRulesJson ?? "[]";
                item.HelpText = it.HelpText;
                item.SelectOptionsJson = it.SelectOptionsJson;
                item.CodingJson = it.CodingJson ?? "{}";
                item.UpdatedAt = DateTime.UtcNow;
            }
        }

        form.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<FormSummaryDto>> ListFormsAsync(Guid clinicId, CancellationToken ct = default)
    {
        var list = await forms.ListByClinicAsync(clinicId, ct);
        return list.Select(f => new FormSummaryDto(f.Id, f.Code, f.Title, f.Status.ToString(), f.Version)).ToList();
    }

    public async Task<FormStructureDto?> GetStructureAsync(Guid formId, CancellationToken ct = default)
    {
        var form = await forms.GetByIdAsync(formId, includeStructure: true, ct);
        return form is null ? null : MapStructure(form);
    }

    public async Task<IReadOnlyList<FormStructureDto>> ListStructuresAsync(Guid clinicId, CancellationToken ct = default)
    {
        var list = await forms.ListByClinicWithStructureAsync(clinicId, ct);
        return list.Select(MapStructure).ToList();
    }

    public async Task<FormPackageDto> ExportPackageAsync(Guid clinicId, CancellationToken ct = default)
    {
        var list = await forms.ListByClinicWithStructureAsync(clinicId, ct);
        var mapped = list.Select(MapPackageForm).ToList();
        return new FormPackageDto(2, mapped);
    }

    public async Task<FormPackageImportResult> ImportPackageAsync(Guid clinicId, FormPackageDto package, CancellationToken ct = default)
    {
        if (package.Forms is null || package.Forms.Count == 0)
            throw new InvalidOperationException("بسته خالی است.");

        var codes = new List<string>();
        foreach (var pf in package.Forms)
        {
            ValidatePackageForm(pf);
            var existing = await forms.GetByClinicAndCodeAsync(clinicId, pf.Code, includeStructure: true, ct);
            FormDefinition form;
            if (existing is null)
            {
                // گراف کامل در یک SaveChanges — جلوگیری از concurrency پس از insert تهی
                form = new FormDefinition
                {
                    ClinicId = clinicId,
                    Code = pf.Code.Trim(),
                    Title = pf.Title.Trim(),
                    Version = pf.Version > 0 ? pf.Version : 1,
                    SortOrder = pf.SortOrder,
                    WarningText = pf.WarningText,
                    TargetAudienceJson = string.IsNullOrWhiteSpace(pf.TargetAudienceJson) ? "{}" : pf.TargetAudienceJson,
                    Status = string.Equals(pf.Status, "published", StringComparison.OrdinalIgnoreCase)
                        ? FormPublishStatus.Published
                        : FormPublishStatus.Draft
                };
                AttachPackageStructure(form, pf);
                await forms.AddAsync(form, ct);
                await uow.SaveChangesAsync(ct);
            }
            else
            {
                form = existing;
                form.Title = pf.Title.Trim();
                form.Version = pf.Version > 0 ? pf.Version : form.Version;
                form.SortOrder = pf.SortOrder;
                form.WarningText = pf.WarningText;
                form.TargetAudienceJson = string.IsNullOrWhiteSpace(pf.TargetAudienceJson) ? "{}" : pf.TargetAudienceJson;
                form.UpdatedAt = DateTime.UtcNow;
                if (string.Equals(pf.Status, "published", StringComparison.OrdinalIgnoreCase))
                    form.Status = FormPublishStatus.Published;

                var sectionUpserts = pf.Sections
                    .Select(s => new FormSectionUpsert(null, s.Code, s.Title, s.SortOrder, s.GuideText))
                    .ToList();
                var itemUpserts = pf.Items
                    .Select(i => new FormItemUpsert(
                        null, i.SectionCode, i.Code, i.LabelFa, i.InputType, i.Required, i.SortOrder,
                        i.VisibilityRulesJson, i.HelpText, i.SelectOptionsJson, i.CodingJson))
                    .ToList();
                await UpsertStructureAsync(form.Id, sectionUpserts, itemUpserts, ct);

                form = await forms.GetByClinicAndCodeAsync(clinicId, pf.Code, includeStructure: true, ct)
                    ?? throw new InvalidOperationException("فرم پس از import یافت نشد.");
                ApplyPackageItemMeta(form, pf);
                await uow.SaveChangesAsync(ct);
            }

            codes.Add(form.Code);
        }

        return new FormPackageImportResult(codes.Count, codes);
    }

    public async Task<byte[]> ExportPackageExcelAsync(Guid clinicId, CancellationToken ct = default)
    {
        var package = await ExportPackageAsync(clinicId, ct);
        return FormPackageExcel.ToExcel(package);
    }

    public async Task<FormPackageImportResult> ImportPackageExcelAsync(Guid clinicId, Stream excelStream, CancellationToken ct = default)
    {
        var package = FormPackageExcel.FromExcel(excelStream);
        return await ImportPackageAsync(clinicId, package, ct);
    }

    /// <summary>اتصال بخش/آیتم بسته به فرم تازه (قبل از اولین SaveChanges).</summary>
    private static void AttachPackageStructure(FormDefinition form, FormPackageFormDto pf)
    {
        var sectionByCode = new Dictionary<string, FormSection>(StringComparer.OrdinalIgnoreCase);
        foreach (var s in pf.Sections.OrderBy(x => x.SortOrder))
        {
            var sec = new FormSection
            {
                FormId = form.Id,
                Code = s.Code,
                Title = s.Title,
                SortOrder = s.SortOrder,
                GuideText = s.GuideText,
                TimeWindowHint = s.TimeWindowHint
            };
            form.Sections.Add(sec);
            sectionByCode[s.Code] = sec;
        }

        foreach (var i in pf.Items.OrderBy(x => x.SortOrder))
        {
            if (!sectionByCode.TryGetValue(i.SectionCode, out var section))
                throw new InvalidOperationException($"بخش {i.SectionCode} یافت نشد.");
            form.Items.Add(new FormItem
            {
                FormId = form.Id,
                SectionId = section.Id,
                Code = i.Code,
                LabelFa = i.LabelFa,
                InputType = i.InputType,
                Required = i.Required,
                SortOrder = i.SortOrder,
                VisibilityRulesJson = i.VisibilityRulesJson ?? "[]",
                HelpText = i.HelpText,
                SelectOptionsJson = i.SelectOptionsJson,
                CodingJson = i.CodingJson ?? "{}",
                NotesPolicy = string.IsNullOrWhiteSpace(i.NotesPolicy) ? "never" : i.NotesPolicy,
                PrefillFromPatient = i.PrefillFromPatient,
                ReadOnlyIfPrefill = i.ReadOnlyIfPrefill
            });
        }
    }

    private static void ApplyPackageItemMeta(FormDefinition form, FormPackageFormDto pf)
    {
        foreach (var i in pf.Items)
        {
            var entity = form.Items.FirstOrDefault(x => x.Code == i.Code);
            if (entity is null) continue;
            entity.NotesPolicy = string.IsNullOrWhiteSpace(i.NotesPolicy) ? "never" : i.NotesPolicy;
            entity.PrefillFromPatient = i.PrefillFromPatient;
            entity.ReadOnlyIfPrefill = i.ReadOnlyIfPrefill;
            entity.UpdatedAt = DateTime.UtcNow;
        }
        foreach (var s in pf.Sections)
        {
            var sec = form.Sections.FirstOrDefault(x => x.Code == s.Code);
            if (sec is null) continue;
            sec.TimeWindowHint = s.TimeWindowHint;
            sec.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static void ValidatePackageForm(FormPackageFormDto pf)
    {
        if (string.IsNullOrWhiteSpace(pf.Code) || string.IsNullOrWhiteSpace(pf.Title))
            throw new InvalidOperationException("کد و عنوان فرم الزامی است.");
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(pf.TargetAudienceJson) ? "{}" : pf.TargetAudienceJson);
            if (doc.RootElement.TryGetProperty("gender", out var g))
            {
                var gender = g.GetString();
                if (!string.IsNullOrWhiteSpace(gender) &&
                    gender is not ("مرد" or "زن" or "همه"))
                    throw new InvalidOperationException($"جنسیت مخاطب نامعتبر: {gender}");
            }
        }
        catch (JsonException)
        {
            throw new InvalidOperationException($"TargetAudienceJson نامعتبر برای فرم {pf.Code}");
        }

        foreach (var item in pf.Items)
        {
            try
            {
                using var rules = JsonDocument.Parse(string.IsNullOrWhiteSpace(item.VisibilityRulesJson) ? "[]" : item.VisibilityRulesJson);
                if (rules.RootElement.ValueKind != JsonValueKind.Array)
                    throw new InvalidOperationException($"visibilityRules باید آرایه باشد: {item.Code}");
                foreach (var rule in rules.RootElement.EnumerateArray())
                {
                    if (!rule.TryGetProperty("field", out var fieldEl)) continue;
                    var field = fieldEl.GetString();
                    if (field is not ("maritalStatus" or "age" or "gender"))
                        throw new InvalidOperationException($"field ناشناخته در {item.Code}: {field}");
                    var op = rule.TryGetProperty("op", out var opEl) ? opEl.GetString() : null;
                    if (op is not ("eq" or "in" or "gte" or "lte"))
                        throw new InvalidOperationException($"op ناشناخته در {item.Code}: {op}");
                }
            }
            catch (JsonException)
            {
                throw new InvalidOperationException($"VisibilityRulesJson نامعتبر: {item.Code}");
            }
        }
    }

    private static FormPackageFormDto MapPackageForm(FormDefinition form)
    {
        var sectionCodeById = form.Sections.ToDictionary(s => s.Id, s => s.Code);
        return new FormPackageFormDto(
            form.Code, form.Title, form.Version, form.Status.ToString().ToLowerInvariant(), form.SortOrder, form.WarningText,
            form.TargetAudienceJson,
            form.Sections.OrderBy(s => s.SortOrder)
                .Select(s => new FormPackageSectionDto(s.Code, s.Title, s.SortOrder, s.TimeWindowHint, s.GuideText)).ToList(),
            form.Items.OrderBy(i => i.SortOrder).Select(i => new FormPackageItemDto(
                sectionCodeById.GetValueOrDefault(i.SectionId, ""),
                i.Code, i.LabelFa, i.InputType, i.Required, i.SortOrder,
                i.VisibilityRulesJson, i.HelpText, i.NotesPolicy, i.PrefillFromPatient,
                i.ReadOnlyIfPrefill, i.SelectOptionsJson, i.CodingJson)).ToList());
    }

    public async Task<ResolvedFormDto> ResolveForPatientAsync(Guid formId, Guid patientId, CancellationToken ct = default)
    {
        var form = await forms.GetByIdAsync(formId, includeStructure: true, ct)
            ?? throw new InvalidOperationException("فرم یافت نشد.");
        var patient = await patients.GetByIdAsync(patientId, ct)
            ?? throw new InvalidOperationException("بیمار یافت نشد.");

        if (!FormAudienceEvaluator.MatchesFormAudience(form, patient, out var reason))
            return new ResolvedFormDto(MapStructure(form), reason, Array.Empty<string>());

        var answers = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        var existing = await forms.GetResponseAsync(patientId, formId, ct);
        if (existing is not null)
        {
            foreach (var a in existing.Answers)
                answers[a.ItemCode] = a.ValueCode ?? a.ValueRaw;
        }

        var visible = form.Items
            .Where(i => FormAudienceEvaluator.IsItemVisible(i, patient, answers))
            .Select(i => i.Code)
            .ToList();
        return new ResolvedFormDto(MapStructure(form), null, visible);
    }

    public async Task<FormResponseDto> SaveResponseAsync(Guid patientId, Guid formId, FormResponseStatus status, IReadOnlyList<FormAnswerInput> answers, Guid actingUserId, CancellationToken ct = default)
    {
        answers ??= Array.Empty<FormAnswerInput>();
        var patient = await patients.GetByIdAsync(patientId, ct)
            ?? throw new InvalidOperationException("بیمار یافت نشد.");
        // فقط مالک مستقیم پرونده می‌تواند پاسخ بنویسد
        if (patient.OwnerUserId != actingUserId)
            throw new UnauthorizedAccessException("فقط خود سلامتجو مجاز به ذخیره پرسشنامه است.");

        // پروندهٔ نشست Owner باید همان patientId باشد — جلوگیری از ذخیره روی Guid اشتباه کلاینت
        var owned = await patients.GetByOwnerUserIdAsync(actingUserId, ct);
        if (owned is not null && owned.Id != patientId)
            throw new UnauthorizedAccessException("شناسه پرونده با مالک نشست هم‌خوان نیست؛ صفحه را تازه کنید.");

        var form = await forms.GetByIdAsync(formId, includeStructure: true, ct)
            ?? throw new InvalidOperationException("فرم یافت نشد.");
        if (form.Status != FormPublishStatus.Published && status == FormResponseStatus.Submitted)
            throw new InvalidOperationException("فرم منتشر نشده است.");

        // تاریخ تکمیل پرسشنامه فقط سرور؛ مقدار کلاینت دور ریخته می‌شود و فقط روی submit مهر می‌خورد
        answers = ApplyServerManagedFormDates(form, answers, stamp: status == FormResponseStatus.Submitted);

        if (status == FormResponseStatus.Submitted)
        {
            if (!FormAudienceEvaluator.MatchesFormAudience(form, patient, out var reason))
                throw new InvalidOperationException(reason ?? "فرم برای این بیمار مجاز نیست.");

            var answerMap = answers.ToDictionary(a => a.ItemCode, a => a.ValueCode ?? a.ValueRaw, StringComparer.OrdinalIgnoreCase);
            foreach (var item in form.Items)
            {
                if (IsFormDateItem(item)) continue;
                if (!FormAudienceEvaluator.IsItemVisible(item, patient, answerMap)) continue;
                if (!item.Required) continue;
                if (!answerMap.TryGetValue(item.Code, out var val) || string.IsNullOrWhiteSpace(val))
                    throw new InvalidOperationException($"پاسخ الزامی برای «{item.LabelFa}» تکمیل نشده است.");
                // JSON آدرس سکونت نباید فقط با trim قبول شود
                if (string.Equals(item.InputType, "residence_address", StringComparison.OrdinalIgnoreCase) &&
                    !ResidenceAddressParser.TryParse(val, out _, out var residenceErr))
                    throw new InvalidOperationException(residenceErr ?? $"پاسخ الزامی برای «{item.LabelFa}» تکمیل نشده است.");
            }
        }

        var response = await forms.GetResponseAsync(patientId, formId, ct);
        if (response is null)
        {
            response = new FormResponse
            {
                PatientId = patientId,
                FormId = formId,
                FormCode = form.Code,
                Status = FormResponseStatus.Draft
            };
            await forms.AddResponseAsync(response, ct);
        }

        // draft و submit: هر ItemCode موجود → update؛ جدید → insert (مخلوط در یک درخواست مجاز)
        await UpsertAnswersAsync(response, answers, ct);

        if (status == FormResponseStatus.Submitted)
        {
            // فقط کدهای غایب از payload کامل prune — نه wipe+reinsert
            var keep = new HashSet<string>(answers.Select(a => a.ItemCode), StringComparer.OrdinalIgnoreCase);
            var extras = response.Answers.Where(a => !keep.Contains(a.ItemCode)).ToList();
            if (extras.Count > 0)
            {
                forms.RemoveAnswers(extras);
                foreach (var x in extras)
                    response.Answers.Remove(x);
            }
        }

        response.Status = status;
        response.UpdatedAt = DateTime.UtcNow;
        if (status == FormResponseStatus.Submitted)
            response.SubmittedAt = DateTime.UtcNow;

        // اول answers تا پوستهٔ خالی / شکست دموگرافیک Answers را خالی نگذارد
        await uow.SaveChangesAsync(ct);

        var needsSecondSave = false;
        var hasBaseDemographics = answers.Any(a =>
            a.ItemCode.EndsWith("_BASE_birthDate", StringComparison.OrdinalIgnoreCase)
            || a.ItemCode.EndsWith("_BASE_maritalStatus", StringComparison.OrdinalIgnoreCase)
            || a.ItemCode.EndsWith("_BASE_residence", StringComparison.OrdinalIgnoreCase));
        if (hasBaseDemographics)
        {
            var before = PatientProfileDiff.SnapshotDemographics(patient);
            ApplyDemographicsFromAnswers(patient, answers);
            var after = PatientProfileDiff.SnapshotDemographics(patient);
            var revSource = status == FormResponseStatus.Submitted ? "form_submit" : "form_draft";
            var revs = PatientProfileDiff.Build(patient.Id, actingUserId, revSource, before, after);
            if (revs.Count > 0)
                await profileRevisions.AddRangeAsync(revs, ct);
            patient.UpdatedAt = DateTime.UtcNow;
            if (patient.OwnerUserId is Guid ownerId && patient.Person.BirthDate is not null)
            {
                var owner = await users.GetByIdAsync(ownerId, ct);
                // تولد روی Person مشترک است؛ فقط زمان به‌روزرسانی User
                if (owner is not null && owner.PersonId == patient.PersonId)
                    owner.UpdatedAt = DateTime.UtcNow;
            }
            needsSecondSave = true;
        }

        if (status == FormResponseStatus.Submitted)
        {
            // Intake کامل فقط وقتی همهٔ فرم‌های Published مخاطب Submitted باشند
            var allForms = await forms.ListByClinicAsync(patient.ClinicId, ct);
            var pendingOther = false;
            foreach (var f in allForms.Where(x => x.Status == FormPublishStatus.Published))
            {
                if (!FormAudienceEvaluator.MatchesFormAudience(f, patient, out _)) continue;
                if (f.Id == formId) continue;
                var other = await forms.GetResponseAsync(patientId, f.Id, ct);
                if (other is null || other.Status != FormResponseStatus.Submitted)
                {
                    pendingOther = true;
                    break;
                }
            }
            if (!pendingOther)
            {
                patient.IntakeCompleted = true;
                patient.IntakeCompletedAt = DateTime.UtcNow;
                patient.JourneyIntroSeen = true;
            }
            else
            {
                patient.IntakeCompleted = false;
                patient.IntakeCompletedAt = null;
            }
            needsSecondSave = true;
        }

        // پیشرفت رستر قرارداد از FormResponse — قبل از Save دوم تا یک تراکنش بماند
        if (await TrySyncLinkedMemberProgressAsync(patient, form, response, status, answers, ct))
            needsSecondSave = true;

        if (needsSecondSave)
            await uow.SaveChangesAsync(ct);

        return Map(response);
    }

    /// <summary>
    /// عضو لینک‌شده: درصد پیشرفت، Abandoned هنگام شروع draft، Completed با intake کامل.
    /// </summary>
    private async Task<bool> TrySyncLinkedMemberProgressAsync(
        Patient patient,
        FormDefinition form,
        FormResponse response,
        FormResponseStatus status,
        IReadOnlyList<FormAnswerInput> payloadAnswers,
        CancellationToken ct)
    {
        if (patient.LinkedContractMemberId is not Guid memberId)
            return false;
        var member = await contracts.GetMemberByIdAsync(memberId, ct);
        if (member is null)
            return false;

        var answerMap = response.Answers
            .GroupBy(a => a.ItemCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.Last().ValueCode ?? g.Last().ValueRaw,
                StringComparer.OrdinalIgnoreCase);

        var pct = ComputeFormProgressPct(form, patient, answerMap);
        var hasContent = response.Answers.Any(HasAnswerContent)
            || payloadAnswers.Any(a =>
                !string.IsNullOrWhiteSpace(a.ValueCode) || !string.IsNullOrWhiteSpace(a.ValueRaw));

        member.LastActivityAt = DateTime.UtcNow;
        member.UpdatedAt = DateTime.UtcNow;

        if (status == FormResponseStatus.Submitted && patient.IntakeCompleted)
        {
            member.OnboardingStage = OnboardingStage.Completed;
            member.ProfileProgressPct = 100;
            member.ProfileCompletedAt ??= DateTime.UtcNow;
            member.AbandonedAtStep = null;
            return true;
        }

        if (!hasContent && pct <= 0)
            return true;

        // شروع/ادامهٔ پر کردن — Completed را پایین نیاور
        if (member.OnboardingStage != OnboardingStage.Completed)
        {
            if (member.OnboardingStage is OnboardingStage.LoggedIn or OnboardingStage.LinkOpened
                or OnboardingStage.SmsSent or OnboardingStage.NotSent)
                member.OnboardingStage = OnboardingStage.Abandoned;

            member.ProfileProgressPct = Math.Clamp(pct, 0, 99);
            member.AbandonedAtStep = ResolveAbandonedStep(form, payloadAnswers) ?? member.AbandonedAtStep;
            member.ProfileCompletedAt = null;
        }

        return true;
    }

    private static bool HasAnswerContent(FormAnswer a)
    {
        if (a.SkippedByRule) return false;
        return !string.IsNullOrWhiteSpace(a.ValueCode) || !string.IsNullOrWhiteSpace(a.ValueRaw);
    }

    /// <summary>هم‌تراز overallProgress فرانت: آیتم‌های visible تکمیل‌شده.</summary>
    internal static int ComputeFormProgressPct(
        FormDefinition form,
        Patient patient,
        IReadOnlyDictionary<string, string?> answerMap)
    {
        var visible = form.Items
            .Where(i => FormAudienceEvaluator.IsItemVisible(i, patient, answerMap))
            .ToList();
        if (visible.Count == 0) return 0;
        var done = 0;
        foreach (var item in visible)
        {
            if (!answerMap.TryGetValue(item.Code, out var val) || string.IsNullOrWhiteSpace(val))
                continue;
            if (string.Equals(item.InputType, "residence_address", StringComparison.OrdinalIgnoreCase) &&
                !ResidenceAddressParser.TryParse(val, out _, out _))
                continue;
            done++;
        }
        return (int)Math.Round(100.0 * done / visible.Count);
    }

    private static string? ResolveAbandonedStep(FormDefinition form, IReadOnlyList<FormAnswerInput> answers)
    {
        if (answers.Count == 0) return null;
        var byCode = form.Items.ToDictionary(i => i.Code, StringComparer.OrdinalIgnoreCase);
        FormSection? lastSection = null;
        var lastOrder = -1;
        foreach (var a in answers)
        {
            if (string.IsNullOrWhiteSpace(a.ValueCode) && string.IsNullOrWhiteSpace(a.ValueRaw))
                continue;
            if (!byCode.TryGetValue(a.ItemCode, out var item)) continue;
            if (item.SortOrder < lastOrder) continue;
            lastOrder = item.SortOrder;
            lastSection = form.Sections.FirstOrDefault(s => s.Id == item.SectionId);
        }
        return lastSection?.Code ?? lastSection?.Title;
    }

    private static bool IsFormDateItem(FormItem item) =>
        item.Code.Contains("formDate", StringComparison.OrdinalIgnoreCase)
        // هم‌تراز FE: aiTags شامل formDate در CodingJson
        || (!string.IsNullOrEmpty(item.CodingJson)
            && item.CodingJson.Contains("\"formDate\"", StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// formDate را از payload کلاینت حذف می‌کند؛ روی submit با روز مدنی ایران مهر می‌زند.
    /// </summary>
    private static IReadOnlyList<FormAnswerInput> ApplyServerManagedFormDates(
        FormDefinition form,
        IReadOnlyList<FormAnswerInput> answers,
        bool stamp)
    {
        var formDateCodes = form.Items
            .Where(IsFormDateItem)
            .Select(i => i.Code)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (formDateCodes.Count == 0)
            return answers;

        var cleaned = answers
            .Where(a => !formDateCodes.Contains(a.ItemCode))
            .ToList();
        if (!stamp)
            return cleaned;

        var dayKey = IranTime.IranDayKey(DateTime.UtcNow);
        foreach (var code in formDateCodes)
            cleaned.Add(new FormAnswerInput(code, null, dayKey, null, false));
        return cleaned;
    }

    /// <summary>بر اساس ItemCode: موجود → به‌روزرسانی؛ نبود → درج با AddAnswer صریح.</summary>
    private async Task UpsertAnswersAsync(
        FormResponse response,
        IReadOnlyList<FormAnswerInput> answers,
        CancellationToken ct)
    {
        var byCode = response.Answers
            .GroupBy(a => a.ItemCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        foreach (var a in answers)
        {
            if (string.IsNullOrWhiteSpace(a.ItemCode)) continue;
            var code = a.ItemCode.Trim();
            if (code.Length > 128)
                throw new InvalidOperationException($"کد آیتم بیش از حد طولانی است: {code[..32]}…");

            if (byCode.TryGetValue(code, out var existing))
            {
                existing.ValueCode = a.ValueCode;
                existing.ValueRaw = a.ValueRaw;
                existing.Notes = a.Notes;
                existing.SkippedByRule = a.SkippedByRule;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var created = new FormAnswer
                {
                    ResponseId = response.Id,
                    ItemCode = code,
                    ValueCode = a.ValueCode,
                    ValueRaw = a.ValueRaw,
                    Notes = a.Notes,
                    SkippedByRule = a.SkippedByRule
                };
                await forms.AddAnswerAsync(created, ct);
                if (!response.Answers.Contains(created))
                    response.Answers.Add(created);
                byCode[code] = created;
            }
        }
    }

    /// <summary>از کدهای BASE تولد/تاهل/آدرس سکونت روی موجودیت بیمار می‌نویسد.</summary>
    private static void ApplyDemographicsFromAnswers(Patient patient, IReadOnlyList<FormAnswerInput> answers)
    {
        var birth = answers.FirstOrDefault(a =>
            a.ItemCode.EndsWith("_BASE_birthDate", StringComparison.OrdinalIgnoreCase));
        if (birth is not null)
        {
            var raw = (birth.ValueRaw ?? birth.ValueCode ?? "").Trim();
            if (DateOnly.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.None, out var iso))
                patient.Person.BirthDate = iso;
            else if (ShamsiBirthDateParser.TryParse(raw, out var shamsi, out _))
                patient.Person.BirthDate = shamsi;
        }

        var marital = answers.FirstOrDefault(a =>
            a.ItemCode.EndsWith("_BASE_maritalStatus", StringComparison.OrdinalIgnoreCase));
        if (marital is not null)
        {
            var val = (marital.ValueCode ?? marital.ValueRaw ?? "").Trim();
            if (val.Length > 0)
                patient.MaritalStatus = MaritalStatusNormalizer.Normalize(val) ?? val;
        }

        var residence = answers.FirstOrDefault(a =>
            a.ItemCode.EndsWith("_BASE_residence", StringComparison.OrdinalIgnoreCase));
        if (residence is not null &&
            ResidenceAddressParser.TryParse(residence.ValueRaw ?? residence.ValueCode, out var home, out _) &&
            home is not null)
        {
            ResidenceAddressParser.ApplyToPatient(patient, home);
        }
    }

    public async Task<FormResponseDto?> GetResponseForSpecialistAsync(Guid patientId, Guid formId, CancellationToken ct = default)
    {
        var response = await forms.GetResponseAsync(patientId, formId, ct);
        if (response is null) return null;
        // پزشک فقط submitted می‌بیند
        if (response.Status != FormResponseStatus.Submitted) return null;
        return Map(response);
    }

    public async Task<FormResponseDto?> GetResponseForOwnerAsync(Guid patientId, Guid formId, Guid actingUserId, CancellationToken ct = default)
    {
        var patient = await patients.GetByIdAsync(patientId, ct)
            ?? throw new InvalidOperationException("بیمار یافت نشد.");
        if (patient.OwnerUserId != actingUserId)
            throw new UnauthorizedAccessException("فقط مالک پرونده مجاز است.");
        var response = await forms.GetResponseAsync(patientId, formId, ct);
        return response is null ? null : Map(response);
    }

    private static FormStructureDto MapStructure(FormDefinition form) => new(
        form.Id, form.Code, form.Title, form.Status.ToString(), form.Version, form.TargetAudienceJson, form.WarningText,
        form.Sections.OrderBy(s => s.SortOrder).Select(s => new FormSectionDto(s.Id, s.Code, s.Title, s.SortOrder, s.GuideText)).ToList(),
        form.Items.OrderBy(i => i.SortOrder).Select(i => new FormItemDto(
            i.Id, i.SectionId, i.Code, i.LabelFa, i.InputType, i.Required, i.SortOrder,
            i.VisibilityRulesJson, i.HelpText, i.NotesPolicy, i.PrefillFromPatient, i.ReadOnlyIfPrefill,
            i.SelectOptionsJson, i.CodingJson)).ToList());

    private static FormResponseDto Map(FormResponse r) => new(
        r.Id, r.PatientId, r.FormId, r.FormCode, r.Status.ToString(), r.SubmittedAt,
        r.Answers.Select(a => new FormAnswerInput(a.ItemCode, a.ValueCode, a.ValueRaw, a.Notes, a.SkippedByRule)).ToList());
}
