/*
 File: backend/src/Nabz.Infrastructure/Pdf/PlaywrightBrowserPdfRenderer.cs
 Description: رندر HTML→PDF با Chromium headless (Playwright)
 Parent Dependencies: IBrowserPdfRenderer, PlaywrightPdfOptions
 */

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Playwright;
using Nabz.Application.Abstractions;
using Nabz.Application.Options;

namespace Nabz.Infrastructure.Pdf;

public sealed class PlaywrightBrowserPdfRenderer : IBrowserPdfRenderer, IAsyncDisposable
{
    private readonly PlaywrightPdfOptions _options;
    private readonly ILogger<PlaywrightBrowserPdfRenderer> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private IPlaywright? _playwright;
    private IBrowser? _browser;

    public PlaywrightBrowserPdfRenderer(
        IOptions<PlaywrightPdfOptions> options,
        ILogger<PlaywrightBrowserPdfRenderer> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<byte[]> RenderHtmlToPdfAsync(string html, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(html);
        await _gate.WaitAsync(ct);
        try
        {
            var browser = await EnsureBrowserAsync(ct);
            await using var context = await browser.NewContextAsync(new BrowserNewContextOptions
            {
                Locale = "fa-IR",
                ViewportSize = new ViewportSize { Width = 794, Height = 1123 }
            });
            var page = await context.NewPageAsync();
            await page.EmulateMediaAsync(new PageEmulateMediaOptions { Media = Media.Print });
            await page.SetContentAsync(html, new PageSetContentOptions
            {
                WaitUntil = WaitUntilState.Load,
                Timeout = 60_000
            });
            // فونت embed شده؛ کمی صبر برای layout پایدار
            await page.EvaluateAsync("() => document.fonts ? document.fonts.ready : Promise.resolve()");
            var bytes = await page.PdfAsync(new PagePdfOptions
            {
                Format = "A4",
                PrintBackground = true,
                PreferCSSPageSize = true,
                Margin = new Margin { Top = "0", Right = "0", Bottom = "0", Left = "0" }
            });
            return bytes;
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<IBrowser> EnsureBrowserAsync(CancellationToken ct)
    {
        if (_browser is { IsConnected: true }) return _browser;
        try
        {
            _playwright ??= await Playwright.CreateAsync();
        }
        catch (Exception ex)
        {
            // معمولاً وقتی درایور/.playwright یا Chromium در image نصب نشده
            throw new InvalidOperationException(
                "موتور PDF (Playwright) راه‌اندازی نشد. روی سرور باید Chromium داخل image نصب باشد (PLAYWRIGHT_BROWSERS_PATH=/ms-playwright).",
                ex);
        }

        var launch = new BrowserTypeLaunchOptions
        {
            Headless = true,
            Args = ["--disable-dev-shm-usage", "--no-sandbox"]
        };
        if (!string.IsNullOrWhiteSpace(_options.ExecutablePath))
            launch.ExecutablePath = _options.ExecutablePath;
        _logger.LogInformation("Launching Chromium for intake PDF (executable={Path}, browsersPath={Browsers})",
            _options.ExecutablePath ?? "(playwright-managed)",
            Environment.GetEnvironmentVariable("PLAYWRIGHT_BROWSERS_PATH") ?? "(default)");
        try
        {
            _browser = await _playwright.Chromium.LaunchAsync(launch);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                "اجرای Chromium برای ساخت PDF ناموفق بود. پوشهٔ /ms-playwright را در کانتینر بررسی کنید.",
                ex);
        }
        return _browser;
    }

    public async ValueTask DisposeAsync()
    {
        if (_browser is not null) await _browser.DisposeAsync();
        _playwright?.Dispose();
        _gate.Dispose();
    }
}
