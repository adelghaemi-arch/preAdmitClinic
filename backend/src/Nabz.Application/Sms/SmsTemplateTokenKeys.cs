/*
 File: backend/src/Nabz.Application/Sms/SmsTemplateTokenKeys.cs
 Description: کلیدهای توکن مجاز قالب پیامک گروهی
 Parent Dependencies: none
 */

namespace Nabz.Application.Sms;

/// <summary>کلیدهای شناخته‌شده برای جایگذاری در قالب کاوه‌نگار / پیش‌نمایش.</summary>
public static class SmsTemplateTokenKeys
{
    public const string Name = "name";
    public const string InviteToken = "invite_token";
    public const string InviteUrl = "invite_url";
    /// <summary>لینک مشاهده پرونده الکترونیک — فعلاً آماده نیست.</summary>
    public const string EmrUrl = "emr_url";

    public static readonly IReadOnlyList<string> All =
        [Name, InviteToken, InviteUrl, EmrUrl];
}
