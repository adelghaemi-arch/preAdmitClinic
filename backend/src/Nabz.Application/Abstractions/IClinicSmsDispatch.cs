/*
 File: backend/src/Nabz.Application/Abstractions/IClinicSmsDispatch.cs
 Description: ارسال مستقیم طوبی/کاوه‌نگار برای تست تنظیمات — بدون وابستگی به SmsProvider فعال
 Parent Dependencies: none
 */

namespace Nabz.Application.Abstractions;

/// <summary>
/// کانال تست/پیکربندی؛ برخلاف <see cref="ISmsSender"/> به درگاه فعال کلینیک وابسته نیست.
/// </summary>
public interface IClinicSmsDispatch
{
    Task SendToubaPlainAsync(
        string mobile,
        string content,
        string fromNum,
        string username,
        string password,
        string? sendUrl,
        CancellationToken ct = default);

    Task SendKavenegarTemplateAsync(
        string mobile,
        string templateName,
        IReadOnlyList<string> tokens,
        string? apiKey,
        string? sender,
        CancellationToken ct = default);
}
