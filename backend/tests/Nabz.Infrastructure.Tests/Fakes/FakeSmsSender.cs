/*
 File: backend/tests/Nabz.Infrastructure.Tests/Fakes/FakeSmsSender.cs
 Description: ردیابی فراخوانی SendTemplateAsync در تست Auth
 Parent Dependencies: Nabz.Application.Abstractions.ISmsSender
 */

using Nabz.Application.Abstractions;

namespace Nabz.Infrastructure.Tests.Fakes;

public sealed record SmsSentCall(string Mobile, string TemplateName, IReadOnlyList<string> Tokens);

public sealed class FakeSmsSender : ISmsSender
{
    public List<SmsSentCall> SentCalls { get; } = [];

    public bool ThrowOnSend { get; set; }

    public Task SendTemplateAsync(string mobile, string templateName, IReadOnlyList<string> tokens, CancellationToken ct = default)
    {
        if (ThrowOnSend)
            throw new InvalidOperationException("FakeSmsSender.ThrowOnSend is enabled.");

        SentCalls.Add(new SmsSentCall(mobile, templateName, tokens.ToList()));
        return Task.CompletedTask;
    }
}