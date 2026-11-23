/*
 File: backend/src/Nabz.Application/Abstractions/IBrowserPdfRenderer.cs
 Description: رندر HTML به PDF (Chromium)؛ قابل جایگزینی با fake در تست
 Parent Dependencies: none
 */

namespace Nabz.Application.Abstractions;

public interface IBrowserPdfRenderer
{
    Task<byte[]> RenderHtmlToPdfAsync(string html, CancellationToken ct = default);
}
