/*
 File: backend/src/Nabz.Application/Interfaces/IFormService.cs
 Description: فرم پیش‌پذیرش، ساختار، resolve، draft/submit
 Parent Dependencies: FormResponseStatus
 */

using Nabz.Domain.Enums;

namespace Nabz.Application.Interfaces;

public record FormAnswerInput(string ItemCode, string? ValueCode, string? ValueRaw, string? Notes, bool SkippedByRule);
public record FormSummaryDto(Guid Id, string Code, string Title, string Status, int Version);
public record FormResponseDto(Guid Id, Guid PatientId, Guid FormId, string FormCode, string Status, DateTime? SubmittedAt, IReadOnlyList<FormAnswerInput> Answers);

public record FormSectionDto(Guid Id, string Code, string Title, int SortOrder, string? GuideText);
public record FormItemDto(
    Guid Id, Guid SectionId, string Code, string LabelFa, string InputType, bool Required, int SortOrder,
    string VisibilityRulesJson, string? HelpText, string NotesPolicy, string? PrefillFromPatient, bool ReadOnlyIfPrefill,
    string? SelectOptionsJson, string CodingJson);
public record FormStructureDto(
    Guid Id, string Code, string Title, string Status, int Version, string TargetAudienceJson, string? WarningText,
    IReadOnlyList<FormSectionDto> Sections, IReadOnlyList<FormItemDto> Items);
public record ResolvedFormDto(FormStructureDto Form, string? RejectReason, IReadOnlyList<string> VisibleItemCodes);

/// <summary>بسته JSON هم‌تراز form-catalog.seed.json (schemaVersion 2).</summary>
public record FormPackageDto(int SchemaVersion, IReadOnlyList<FormPackageFormDto> Forms);
public record FormPackageFormDto(
    string Code, string Title, int Version, string Status, int SortOrder, string? WarningText,
    string TargetAudienceJson,
    IReadOnlyList<FormPackageSectionDto> Sections,
    IReadOnlyList<FormPackageItemDto> Items);
public record FormPackageSectionDto(string Code, string Title, int SortOrder, string? TimeWindowHint, string? GuideText);
public record FormPackageItemDto(
    string SectionCode, string Code, string LabelFa, string InputType, bool Required, int SortOrder,
    string VisibilityRulesJson, string? HelpText, string NotesPolicy, string? PrefillFromPatient,
    bool ReadOnlyIfPrefill, string? SelectOptionsJson, string CodingJson);

public record FormPackageImportResult(int ImportedForms, IReadOnlyList<string> Codes);

public interface IFormService
{
    Task<FormSummaryDto> UpsertFormAsync(Guid clinicId, Guid? formId, string code, string title, string? warningText, string targetAudienceJson, CancellationToken ct = default);
    Task PublishFormAsync(Guid formId, CancellationToken ct = default);
    Task ReorderItemsAsync(Guid formId, IReadOnlyList<(Guid ItemId, int SortOrder)> orders, CancellationToken ct = default);
    Task UpsertStructureAsync(Guid formId, IReadOnlyList<FormSectionUpsert> sections, IReadOnlyList<FormItemUpsert> items, CancellationToken ct = default);
    Task<IReadOnlyList<FormSummaryDto>> ListFormsAsync(Guid clinicId, CancellationToken ct = default);
    Task<FormStructureDto?> GetStructureAsync(Guid formId, CancellationToken ct = default);
    Task<IReadOnlyList<FormStructureDto>> ListStructuresAsync(Guid clinicId, CancellationToken ct = default);
    Task<ResolvedFormDto> ResolveForPatientAsync(Guid formId, Guid patientId, CancellationToken ct = default);
    Task<FormResponseDto> SaveResponseAsync(Guid patientId, Guid formId, FormResponseStatus status, IReadOnlyList<FormAnswerInput> answers, Guid actingUserId, CancellationToken ct = default);
    Task<FormResponseDto?> GetResponseForSpecialistAsync(Guid patientId, Guid formId, CancellationToken ct = default);
    Task<FormResponseDto?> GetResponseForOwnerAsync(Guid patientId, Guid formId, Guid actingUserId, CancellationToken ct = default);
    Task<FormPackageDto> ExportPackageAsync(Guid clinicId, CancellationToken ct = default);
    Task<FormPackageImportResult> ImportPackageAsync(Guid clinicId, FormPackageDto package, CancellationToken ct = default);
    Task<byte[]> ExportPackageExcelAsync(Guid clinicId, CancellationToken ct = default);
    Task<FormPackageImportResult> ImportPackageExcelAsync(Guid clinicId, Stream excelStream, CancellationToken ct = default);
}

public record FormSectionUpsert(Guid? Id, string Code, string Title, int SortOrder, string? GuideText);
public record FormItemUpsert(
    Guid? Id, string SectionCode, string Code, string LabelFa, string InputType, bool Required, int SortOrder,
    string? VisibilityRulesJson, string? HelpText, string? SelectOptionsJson, string? CodingJson);
