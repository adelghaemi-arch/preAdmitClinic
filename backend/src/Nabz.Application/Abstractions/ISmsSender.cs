/*
 File: backend/src/Nabz.Application/Abstractions/ISmsSender.cs
 Description: ارسال پیامک فقط قالبی (بدون متن آزاد)
 Parent Dependencies: none
 */

namespace Nabz.Application.Abstractions;

public interface ISmsSender
{
    /// <summary>ارسال قالب کاوه‌نگار؛ tokens به ترتیب token، token2، …</summary>
    Task SendTemplateAsync(string mobile, string templateName, IReadOnlyList<string> tokens, CancellationToken ct = default);
}
