/*
 File: backend/src/Nabz.Infrastructure/Sms/KavenegarTemplateSmsSender.cs
 Description: ارسال قالبی کاوه‌نگار (verify/lookup) بدون متن آزاد
 Parent Dependencies: HttpClient, KavenegarOptions (از بیرون تزریق می‌شود)
 */

using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nabz.Application.Options;

namespace Nabz.Infrastructure.Sms;

public sealed class KavenegarTemplateSmsSender(
    HttpClient http,
    IOptions<KavenegarOptions> options,
    ILogger<KavenegarTemplateSmsSender> logger)
{
    public Task SendTemplateAsync(string mobile, string templateName, IReadOnlyList<string> tokens, CancellationToken ct = default)
        => SendTemplateAsync(mobile, templateName, tokens, options.Value.ApiKey, options.Value.Sender, ct);

    public async Task SendTemplateAsync(
        string mobile,
        string templateName,
        IReadOnlyList<string> tokens,
        string? apiKeyOverride,
        string? senderOverride,
        CancellationToken ct = default)
    {
        var apiKey = string.IsNullOrWhiteSpace(apiKeyOverride) ? options.Value.ApiKey : apiKeyOverride;
        var sender = string.IsNullOrWhiteSpace(senderOverride) ? options.Value.Sender : senderOverride;

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Kavenegar ApiKey پیکربندی نشده است.");
        if (string.IsNullOrWhiteSpace(templateName))
            throw new InvalidOperationException("نام قالب پیامک خالی است.");

        var receptor = NormalizeReceptor(mobile);
        var qs = new List<string>
        {
            $"receptor={Uri.EscapeDataString(receptor)}",
            $"template={Uri.EscapeDataString(templateName)}"
        };
        if (tokens.Count > 0) qs.Add($"token={Uri.EscapeDataString(tokens[0])}");
        if (tokens.Count > 1) qs.Add($"token2={Uri.EscapeDataString(tokens[1])}");
        if (tokens.Count > 2) qs.Add($"token3={Uri.EscapeDataString(tokens[2])}");
        if (!string.IsNullOrWhiteSpace(sender))
            qs.Add($"sender={Uri.EscapeDataString(sender)}");

        var url = $"https://api.kavenegar.com/v1/{apiKey}/verify/lookup.json?{string.Join("&", qs)}";
        using var response = await http.GetAsync(url, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("کاوه‌نگار HTTP {Status}: {Body}", (int)response.StatusCode, body);
            throw new InvalidOperationException("ارسال پیامک قالبی ناموفق بود.");
        }

        try
        {
            using var doc = JsonDocument.Parse(body);
            var returnStatus = doc.RootElement.GetProperty("return").GetProperty("status").GetInt32();
            if (returnStatus != 200)
            {
                var message = doc.RootElement.GetProperty("return").GetProperty("message").GetString();
                logger.LogError("کاوه‌نگار status={Status} message={Message}", returnStatus, message);
                throw new InvalidOperationException(message ?? "خطای کاوه‌نگار در ارسال قالب.");
            }
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "پاسخ نامعتبر کاوه‌نگار: {Body}", body);
            throw new InvalidOperationException("پاسخ کاوه‌نگار قابل پردازش نیست.");
        }
    }

    private static string NormalizeReceptor(string mobile)
    {
        var m = (mobile ?? string.Empty).Trim().Replace(" ", "");
        if (m.StartsWith("+98", StringComparison.Ordinal)) m = "0" + m[3..];
        if (m.StartsWith("98") && m.Length == 12) m = "0" + m[2..];
        return m;
    }
}
