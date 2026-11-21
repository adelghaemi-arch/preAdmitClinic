/*
 File: backend/src/Nabz.Domain/Entities/SmsCampaignTemplate.cs
 Description: قالب پیامک گروهی تعریف‌شده توسط ادمین کل (نام کاوه‌نگار + توکن‌ها + پیش‌نمایش)
 Parent Dependencies: EntityBase
 */

using Nabz.Domain.Common;

namespace Nabz.Domain.Entities;

/// <summary>
/// قالب کمپین SMS برای قیف قرارداد.
/// ارسال فقط قالبی است؛ <see cref="ProviderTemplateName"/> نام قالب کاوه‌نگار است
/// و <see cref="TokenKeysJson"/> ترتیب توکن‌های verify/lookup را مشخص می‌کند.
/// </summary>
public class SmsCampaignTemplate : EntityBase
{
    /// <summary>کد پایدار برای seed و ارجاع UI (مثلاً invite_register)</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>عنوان نمایشی برای انتخاب ادمین کلینیک</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>متن پیش‌نمایش فارسی با نشانه‌های {"{name}"} / {"{invite_url}"} / …</summary>
    public string BodyPreview { get; set; } = string.Empty;

    /// <summary>نام قالب در کاوه‌نگار؛ خالی = fallback به Kavenegar:InviteTemplate</summary>
    public string ProviderTemplateName { get; set; } = string.Empty;

    /// <summary>JSON آرایهٔ کلید توکن به ترتیب token/token2/token3 — مثلاً ["name","invite_url"]</summary>
    public string TokenKeysJson { get; set; } = "[]";

    /// <summary>اگر true باشد و URL پرونده هنوز آماده نباشد، قالب در لیست فعال ارسال نمی‌آید</summary>
    public bool RequiresEmrUrl { get; set; }

    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
