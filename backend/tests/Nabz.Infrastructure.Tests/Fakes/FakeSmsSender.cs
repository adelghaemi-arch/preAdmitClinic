/*
 File: backend/tests/Nabz.Infrastructure.Tests/Fakes/FakeSmsSender.cs
 Description: ردیابی فراخوانی SendTemplate / SendPlain و IClinicSmsDispatch در تست
 Parent Dependencies: ISmsSender, IClinicSmsDispatch
 */

using Nabz.Application.Abstractions;

namespace Nabz.Infrastructure.Tests.Fakes;

public sealed record SmsSentCall(string Mobile, string TemplateName, IReadOnlyList<string> Tokens);
public sealed record SmsPlainCall(string Mobile, string Content);

public sealed class FakeSmsSender : ISmsSender, IClinicSmsDispatch
{
    public List<SmsSentCall> SentCalls { get; } = [];
    public List<SmsPlainCall> PlainCalls { get; } = [];

    public bool ThrowOnSend { get; set; }

    public Task SendTemplateAsync(string mobile, string templateName, IReadOnlyList<string> tokens, CancellationToken ct = default)
    {
        if (ThrowOnSend)
            throw new InvalidOperationException("FakeSmsSender.ThrowOnSend is enabled.");

        SentCalls.Add(new SmsSentCall(mobile, templateName, tokens.ToList()));
        return Task.CompletedTask;
    }

    public Task SendPlainAsync(string mobile, string content, CancellationToken ct = default)
    {
        if (ThrowOnSend)
            throw new InvalidOperationException("FakeSmsSender.ThrowOnSend is enabled.");

        PlainCalls.Add(new SmsPlainCall(mobile, content));
        return Task.CompletedTask;
    }

    public Task SendToubaPlainAsync(
        string mobile,
        string content,
        string fromNum,
        string username,
        string password,
        string? sendUrl,
        CancellationToken ct = default)
        => SendPlainAsync(mobile, content, ct);

    public Task SendKavenegarTemplateAsync(
        string mobile,
        string templateName,
        IReadOnlyList<string> tokens,
        string? apiKey,
        string? sender,
        CancellationToken ct = default)
        => SendTemplateAsync(mobile, templateName, tokens, ct);

    public int ToubaCredit { get; set; } = 12_000;
    public IReadOnlyList<string> ToubaSenderNumbers { get; set; } = ["10001234", "30001234"];
    public List<(string Username, string Password, string? ServiceUrl)> ToubaAccountCalls { get; } = [];

    public Task<ToubaAccountInfoResult> GetToubaAccountInfoAsync(
        string username,
        string password,
        string? serviceUrl,
        CancellationToken ct = default)
    {
        ToubaAccountCalls.Add((username, password, serviceUrl));
        if (ThrowOnSend)
            throw new InvalidOperationException("FakeSmsSender.ThrowOnSend is enabled.");
        return Task.FromResult(new ToubaAccountInfoResult(ToubaCredit, ToubaSenderNumbers));
    }
}
