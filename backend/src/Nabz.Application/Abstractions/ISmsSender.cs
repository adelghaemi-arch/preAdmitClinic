/*
 File: backend/src/Nabz.Application/Abstractions/ISmsSender.cs
 Description: ارسال پیامک قالبی (کاوه‌نگار) یا متنی (طوبی)
 Parent Dependencies: none
 */

namespace Nabz.Application.Abstractions;

public interface ISmsSender
{
    /// <summary>ارسال قالب کاوه‌نگار؛ tokens به ترتیب token، token2، …</summary>
    Task SendTemplateAsync(string mobile, string templateName, IReadOnlyList<string> tokens, CancellationToken ct = default);

    /// <summary>ارسال متن آزاد (طوبی URL API)</summary>
    Task SendPlainAsync(string mobile, string content, CancellationToken ct = default);
}
