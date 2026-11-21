/*
 File: backend/src/Nabz.Application/Sms/ClinicSmsSecrets.cs
 Description: ماسک و تشخیص «بدون تغییر» برای ApiKey/Password تنظیمات پیامک کلینیک
 Parent Dependencies: none
 */

namespace Nabz.Application.Sms;

public static class ClinicSmsSecrets
{
    public const string Mask = "••••••••";

    public static bool IsUnchanged(string? incoming) =>
        string.IsNullOrWhiteSpace(incoming) ||
        incoming.Trim() == Mask ||
        incoming.All(c => c == '•' || c == '*');

    public static string? MaskIfSet(string? stored) =>
        string.IsNullOrWhiteSpace(stored) ? null : Mask;
}
