/*
 File: backend/src/Nabz.Application/Pdf/IntakePdfDocumentModel.cs
 Description: مدل قالب HTML پرسشنامه برای رندر Chromium
 Parent Dependencies: none
 */

namespace Nabz.Application.Pdf;

public sealed class IntakePdfDocumentModel
{
    public required string HospitalLabel { get; init; }
    public string? HospitalLogoDataUri { get; init; }
    public string? PartnerLogoDataUri { get; init; }
    public required string OrganizationName { get; init; }
    public required string FullName { get; init; }
    public required string NationalId { get; init; }
    public required string AgeLabel { get; init; }
    public required string Gender { get; init; }
    public required string FormTitle { get; init; }
    public required string FormCode { get; init; }
    public required string SubmittedLabel { get; init; }
    public required IReadOnlyList<IntakePdfSectionModel> Sections { get; init; }
    public int TotalAnswers { get; init; }
    public int FlagTotal { get; init; }
    public string? FontRegularDataUri { get; init; }
    public string? FontBoldDataUri { get; init; }
}

public sealed class IntakePdfSectionModel
{
    public required string Title { get; init; }
    public int FlagCount { get; init; }
    public required IReadOnlyList<IntakePdfRowModel> Rows { get; init; }
}

public sealed class IntakePdfRowModel
{
    public required string Label { get; init; }
    public required string Value { get; init; }
    public string Notes { get; init; } = "";
    public bool IsRedFlag { get; init; }
    public bool HasNotes { get; init; }
}
