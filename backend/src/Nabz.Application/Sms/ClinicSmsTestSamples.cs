/*
 File: backend/src/Nabz.Application/Sms/ClinicSmsTestSamples.cs
 Description: توکن و پر کردن BodyPreview برای ارسال تستی پیامک (بدون عضو قرارداد)
 Parent Dependencies: SmsTemplateTokenKeys
 */

using System.Text.Json;

namespace Nabz.Application.Sms;

/// <summary>مقادیر نمونه امن برای تست درگاه — نه دادهٔ واقعی بیمار.</summary>
public static class ClinicSmsTestSamples
{
    public static IReadOnlyDictionary<string, string> BuildSampleTokenMap(string mobile)
    {
        var m = (mobile ?? string.Empty).Trim();
        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [SmsTemplateTokenKeys.Name] = "کاربر تست",
            [SmsTemplateTokenKeys.InviteToken] = "test-invite",
            [SmsTemplateTokenKeys.InviteUrl] = "https://example.local/invite/test",
            [SmsTemplateTokenKeys.EmrUrl] = string.Empty,
            ["mobile"] = m,
            ["code"] = "12345",
        };
    }

    public static IReadOnlyList<string> ParseTokenKeys(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [SmsTemplateTokenKeys.InviteToken, SmsTemplateTokenKeys.Name];
        try
        {
            var raw = JsonSerializer.Deserialize<List<string>>(json) ?? [];
            if (raw.Count == 0)
                return [SmsTemplateTokenKeys.InviteToken, SmsTemplateTokenKeys.Name];
            return raw.Select(x => (x ?? string.Empty).Trim())
                .Where(x => x.Length > 0)
                .Take(3)
                .ToList();
        }
        catch
        {
            return [SmsTemplateTokenKeys.InviteToken, SmsTemplateTokenKeys.Name];
        }
    }

    public static IReadOnlyList<string> ResolveTokens(IReadOnlyList<string> keys, string mobile)
    {
        var map = BuildSampleTokenMap(mobile);
        return keys.Select(k => map.TryGetValue(k, out var v) ? v : "تست").ToList();
    }

    public static string FillBodyPreview(string? bodyPreview, IReadOnlyList<string> keys, string mobile)
    {
        var body = bodyPreview ?? string.Empty;
        var map = BuildSampleTokenMap(mobile);
        foreach (var key in keys.Concat(SmsTemplateTokenKeys.All).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var val = map.TryGetValue(key, out var v) ? v : string.Empty;
            body = body.Replace("{" + key + "}", val, StringComparison.OrdinalIgnoreCase);
        }
        return body.Trim();
    }
}
