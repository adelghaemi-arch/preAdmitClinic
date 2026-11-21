/*
 File: backend/src/Nabz.Infrastructure/Sms/ToubaUrlSmsSender.cs
 Description: ارسال متنی طوبی (TSMS) از طریق URL API روی sms.tsms.ir
 Parent Dependencies: HttpClient
 */

using Microsoft.Extensions.Logging;

namespace Nabz.Infrastructure.Sms;

public sealed class ToubaUrlSmsSender(HttpClient http, ILogger<ToubaUrlSmsSender> logger)
{
    public const string DefaultSendUrl = "https://sms.tsms.ir/url/tsms.php";

    public async Task SendAsync(
        string mobile,
        string content,
        string fromNum,
        string username,
        string password,
        string? sendUrl,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("اعتبار وب‌سرویس طوبی پیکربندی نشده است.");
        if (string.IsNullOrWhiteSpace(fromNum))
            throw new InvalidOperationException("شماره ارسال‌کننده طوبی خالی است.");
        if (string.IsNullOrWhiteSpace(content))
            throw new InvalidOperationException("متن پیامک طوبی خالی است.");

        var endpoint = string.IsNullOrWhiteSpace(sendUrl) ? DefaultSendUrl : sendUrl.Trim();
        var to = NormalizeTo09(mobile);
        var qs = new Dictionary<string, string>
        {
            ["username"] = username.Trim(),
            ["password"] = password.Trim(),
            ["from"] = fromNum.Trim(),
            ["to"] = to,
            ["message"] = content
        };
        var url = endpoint + (endpoint.Contains('?', StringComparison.Ordinal) ? "&" : "?")
            + string.Join("&", qs.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));

        using var response = await http.GetAsync(url, ct);
        var body = (await response.Content.ReadAsStringAsync(ct)).Trim();
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("طوبی HTTP {Status}: {Body}", (int)response.StatusCode, Truncate(body));
            throw new InvalidOperationException("ارسال پیامک طوبی ناموفق بود.");
        }

        if (LooksLikeFailure(body))
        {
            logger.LogError("طوبی پاسخ خطا: {Body}", Truncate(body));
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(body)
                ? "سامانه طوبی ارسال را رد کرد."
                : $"خطای طوبی: {Truncate(body)}");
        }
    }

    private static bool LooksLikeFailure(string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return true;
        var b = body.ToLowerInvariant();
        if (b.Contains("incorrect") || b.Contains("error") || b.Contains("invalid")) return true;
        if (b.Contains("نام کاربری") || b.Contains("رمز")) return true;
        // پاسخ خیلی کوتاه که فقط مسیر را echo کند (بدون شناسه ارسال)
        if (b is "/tsms.php" or "/tsms.aspx" || b.StartsWith("/tsms.php?", StringComparison.Ordinal) || b.StartsWith("/tsms.aspx?", StringComparison.Ordinal))
            return true;
        return false;
    }

    public static string NormalizeTo09(string mobile)
    {
        var m = (mobile ?? string.Empty).Trim().Replace(" ", "");
        if (m.StartsWith("+98", StringComparison.Ordinal)) m = "0" + m[3..];
        if (m.StartsWith("0098", StringComparison.Ordinal)) m = "0" + m[4..];
        if (m.StartsWith("98") && m.Length == 12) m = "0" + m[2..];
        if (m.Length == 10 && m.StartsWith('9')) m = "0" + m;
        return m;
    }

    private static string Truncate(string s) => s.Length <= 300 ? s : s[..300] + "…";
}
