/*
 File: backend/tests/Nabz.Infrastructure.Tests/Fakes/FakeBrowserPdfRenderer.cs
 Description: رندر ساختگی PDF برای Unit بدون Chromium
 Parent Dependencies: IBrowserPdfRenderer
 */

using System.Text;
using Nabz.Application.Abstractions;

namespace Nabz.Infrastructure.Tests.Fakes;

public sealed class FakeBrowserPdfRenderer : IBrowserPdfRenderer
{
    public string? LastHtml { get; private set; }
    public int CallCount { get; private set; }

    public Task<byte[]> RenderHtmlToPdfAsync(string html, CancellationToken ct = default)
    {
        CallCount++;
        LastHtml = html;
        // هدر حداقل PDF معتبر برای assert سرویس
        var payload = Encoding.ASCII.GetBytes("%PDF-1.4\n%fake-intake-pdf\n");
        return Task.FromResult(payload);
    }
}
