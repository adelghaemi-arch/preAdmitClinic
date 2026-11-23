/*
 File: backend/src/Nabz.Infrastructure/Sms/ToubaSoapSmsSender.cs
 Description: ارسال متنی و UserInfo طوبی از طریق SOAP نمونه TSMS (soapWSDL)
 Parent Dependencies: ToubaSoapContracts, Microsoft.Extensions.Logging
 */

using System.ServiceModel;
using Microsoft.Extensions.Logging;
using Nabz.Infrastructure.Sms.ToubaSoap;

namespace Nabz.Infrastructure.Sms;

public sealed class ToubaSoapSmsSender(ILogger<ToubaSoapSmsSender> logger)
{
    /// <summary>آدرس SOAP نمونه رسمی TSMS — جایگزین URL قدیمی tsms.php</summary>
    public const string DefaultSoapUrl = "http://www.tsms.ir/soapWSDL/";

    public async Task<ToubaAccountInfo> GetAccountInfoAsync(
        string username,
        string password,
        string? serviceUrl,
        CancellationToken ct = default)
    {
        EnsureCreds(username, password);
        var endpoint = ResolveSoapEndpoint(serviceUrl);

        return await Task.Run(() =>
        {
            ct.ThrowIfCancellationRequested();
            var client = CreateClient(endpoint);
            try
            {
                var rows = client.UserInfo(username.Trim(), password.Trim());
                if (rows is null || rows.Length == 0)
                    throw new InvalidOperationException("سامانه طوبی اطلاعات حساب برنگرداند.");

                var first = rows[0];
                var numbers = (first.sms_numebrs ?? Array.Empty<string>())
                    .Where(n => !string.IsNullOrWhiteSpace(n))
                    .Select(n => n.Trim())
                    .Distinct(StringComparer.Ordinal)
                    .ToArray();

                return new ToubaAccountInfo(first.credit, numbers);
            }
            catch (InvalidOperationException)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "طوبی UserInfo ناموفق بود.");
                throw new InvalidOperationException(
                    string.IsNullOrWhiteSpace(ex.Message)
                        ? "ارتباط با وب‌سرویس طوبی برقرار نشد."
                        : $"ارتباط با طوبی ناموفق: {Truncate(ex.Message)}",
                    ex);
            }
            finally
            {
                CloseQuietly(client);
            }
        }, ct);
    }

    public async Task SendAsync(
        string mobile,
        string content,
        string fromNum,
        string username,
        string password,
        string? serviceUrl,
        CancellationToken ct = default)
    {
        EnsureCreds(username, password);
        if (string.IsNullOrWhiteSpace(fromNum))
            throw new InvalidOperationException("شماره ارسال‌کننده طوبی خالی است.");
        if (string.IsNullOrWhiteSpace(content))
            throw new InvalidOperationException("متن پیامک طوبی خالی است.");

        var endpoint = ResolveSoapEndpoint(serviceUrl);
        var to = NormalizeTo09(mobile);

        await Task.Run(() =>
        {
            ct.ThrowIfCancellationRequested();
            var client = CreateClient(endpoint);
            try
            {
                // امضای sendSms عین نمونه WinForms: آرایهٔ خطوط، موبایل‌ها، متن‌ها، mclass خالی، messageid خالی
                var result = client.sendSms(
                    username.Trim(),
                    password.Trim(),
                    new[] { fromNum.Trim() },
                    new[] { to },
                    new[] { content },
                    Array.Empty<string>(),
                    "");

                if (result is null || result.Length == 0)
                    throw new InvalidOperationException("سامانه طوبی شناسه ارسال برنگرداند.");

                // شناسه‌های منفی معمولاً خطای پنل هستند
                if (result.All(id => id < 0))
                {
                    logger.LogError("طوبی sendSms رد شد: {Ids}", string.Join(",", result));
                    throw new InvalidOperationException(
                        $"خطای طوبی در ارسال (کد: {string.Join(",", result)}).");
                }
            }
            catch (InvalidOperationException)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "طوبی sendSms ناموفق بود.");
                throw new InvalidOperationException(
                    string.IsNullOrWhiteSpace(ex.Message)
                        ? "ارسال پیامک طوبی ناموفق بود."
                        : $"خطای طوبی: {Truncate(ex.Message)}",
                    ex);
            }
            finally
            {
                CloseQuietly(client);
            }
        }, ct);
    }

    /// <summary>
    /// اگر URL قدیمی tsms.php ذخیره شده باشد، به SOAP نمونه برمی‌گردیم.
    /// </summary>
    public static string ResolveSoapEndpoint(string? configured)
    {
        var url = (configured ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(url))
            return DefaultSoapUrl;

        if (url.Contains("tsms.php", StringComparison.OrdinalIgnoreCase)
            || url.Contains("tsms.aspx", StringComparison.OrdinalIgnoreCase)
            || url.Contains("/url/", StringComparison.OrdinalIgnoreCase))
            return DefaultSoapUrl;

        return url.EndsWith('/') ? url : url + "/";
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

    private static ToubaTsmsServiceClient CreateClient(string endpoint)
    {
        var binding = new BasicHttpBinding(BasicHttpSecurityMode.None)
        {
            MaxReceivedMessageSize = 4 * 1024 * 1024,
            SendTimeout = TimeSpan.FromSeconds(60),
            ReceiveTimeout = TimeSpan.FromSeconds(60)
        };
        if (endpoint.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            binding.Security.Mode = BasicHttpSecurityMode.Transport;

        return new ToubaTsmsServiceClient(binding, new EndpointAddress(endpoint));
    }

    private static void EnsureCreds(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("اعتبار وب‌سرویس طوبی پیکربندی نشده است.");
    }

    private static void CloseQuietly(ICommunicationObject client)
    {
        try
        {
            if (client.State == CommunicationState.Faulted)
                client.Abort();
            else
                client.Close();
        }
        catch
        {
            try { client.Abort(); } catch { /* ignore */ }
        }
    }

    private static string Truncate(string s) => s.Length <= 300 ? s : s[..300] + "…";
}

public sealed record ToubaAccountInfo(int Credit, IReadOnlyList<string> SenderNumbers);
