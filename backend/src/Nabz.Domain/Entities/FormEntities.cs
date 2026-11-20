/*
 File: backend/src/Nabz.Domain/Entities/FormEntities.cs
 Description: تعریف فرم پیش‌پذیرش و پاسخ draft/submitted
 Parent Dependencies: FormPublishStatus, FormResponseStatus
 */

using Nabz.Domain.Common;
using Nabz.Domain.Enums;

namespace Nabz.Domain.Entities;

public class FormDefinition : EntityBase
{
    public Guid ClinicId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int Version { get; set; } = 1;
    public FormPublishStatus Status { get; set; } = FormPublishStatus.Draft;
    public int SortOrder { get; set; }
    public string? WarningText { get; set; }
    /// <summary>JSON مخاطب هدف (جنسیت/سن/وضعیت تأهل).</summary>
    public string TargetAudienceJson { get; set; } = "{}";

    public ICollection<FormSection> Sections { get; set; } = new List<FormSection>();
    public ICollection<FormItem> Items { get; set; } = new List<FormItem>();
}

public class FormSection : EntityBase
{
    public Guid FormId { get; set; }
    public FormDefinition Form { get; set; } = null!;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string? TimeWindowHint { get; set; }
    public string? GuideText { get; set; }
}

public class FormItem : EntityBase
{
    public Guid FormId { get; set; }
    public FormDefinition Form { get; set; } = null!;
    public Guid SectionId { get; set; }
    public FormSection Section { get; set; } = null!;
    public string Code { get; set; } = string.Empty;
    public string LabelFa { get; set; } = string.Empty;
    public string InputType { get; set; } = "yn_unk";
    public bool Required { get; set; }
    public int SortOrder { get; set; }
    public string VisibilityRulesJson { get; set; } = "[]";
    public string? HelpText { get; set; }
    public string NotesPolicy { get; set; } = "never";
    public string? PrefillFromPatient { get; set; }
    public bool ReadOnlyIfPrefill { get; set; }
    public string? SelectOptionsJson { get; set; }
    public string CodingJson { get; set; } = "{}";
}

public class FormResponse : EntityBase
{
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public Guid FormId { get; set; }
    public FormDefinition Form { get; set; } = null!;
    public string FormCode { get; set; } = string.Empty;
    public FormResponseStatus Status { get; set; } = FormResponseStatus.Draft;
    public DateTime? SubmittedAt { get; set; }

    public ICollection<FormAnswer> Answers { get; set; } = new List<FormAnswer>();
}

public class FormAnswer : EntityBase
{
    public Guid ResponseId { get; set; }
    public FormResponse Response { get; set; } = null!;
    public string ItemCode { get; set; } = string.Empty;
    public string? ValueCode { get; set; }
    public string? ValueRaw { get; set; }
    public string? Notes { get; set; }
    public bool SkippedByRule { get; set; }
}
