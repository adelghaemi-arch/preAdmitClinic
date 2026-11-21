/*
 File: backend/src/Nabz.Infrastructure/Services/SmsCampaignTemplateService.cs
 Description: مدیریت قالب پیامک گروهی پلتفرم
 Parent Dependencies: ISmsCampaignTemplateRepository, IUnitOfWork
 */

using System.Text.Json;
using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Sms;
using Nabz.Domain.Entities;

namespace Nabz.Infrastructure.Services;

public sealed class SmsCampaignTemplateService(
    ISmsCampaignTemplateRepository templates,
    IUnitOfWork uow) : ISmsCampaignTemplateService
{
    // تا وقتی لینک پرونده الکترونیک آماده نشده، قالب‌های RequiresEmrUrl قابل‌ارسال نیستند
    private const bool EmrUrlReady = false;

    public async Task<IReadOnlyList<SmsCampaignTemplateDto>> ListAsync(bool activeOnly, CancellationToken ct = default)
    {
        var rows = await templates.ListAsync(activeOnly, ct);
        return rows.Select(Map).ToList();
    }

    public async Task<SmsCampaignTemplateDto> UpsertAsync(UpsertSmsCampaignTemplateRequest request, string actor, CancellationToken ct = default)
    {
        var code = (request.Code ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(code) || code.Length > 64)
            throw new InvalidOperationException("کد قالب نامعتبر است.");
        var title = (request.Title ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(title) || title.Length > 200)
            throw new InvalidOperationException("عنوان قالب الزامی است.");
        var body = (request.BodyPreview ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(body))
            throw new InvalidOperationException("پیش‌نمایش متن قالب الزامی است.");
        var provider = (request.ProviderTemplateName ?? string.Empty).Trim();
        if (provider.Length > 120)
            throw new InvalidOperationException("نام قالب کاوه‌نگار بیش از حد طولانی است.");

        var keys = NormalizeTokenKeys(request.TokenKeys);
        SmsCampaignTemplate entity;
        if (request.Id is Guid id)
        {
            entity = await templates.GetByIdAsync(id, ct)
                ?? throw new InvalidOperationException("قالب یافت نشد.");
        }
        else
        {
            var byCode = await templates.GetByCodeAsync(code, ct);
            if (byCode is not null)
                throw new InvalidOperationException("کد قالب تکراری است.");
            entity = new SmsCampaignTemplate { Code = code };
            await templates.AddAsync(entity, ct);
        }

        entity.Code = code;
        entity.Title = title;
        entity.BodyPreview = body;
        entity.ProviderTemplateName = provider;
        entity.TokenKeysJson = JsonSerializer.Serialize(keys);
        entity.RequiresEmrUrl = request.RequiresEmrUrl;
        entity.IsActive = request.IsActive;
        entity.SortOrder = request.SortOrder;
        entity.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        _ = actor;
        return Map(entity);
    }

    private SmsCampaignTemplateDto Map(SmsCampaignTemplate t)
    {
        var keys = ParseKeys(t.TokenKeysJson);
        var available = t.IsActive && (!t.RequiresEmrUrl || EmrUrlReady);
        return new SmsCampaignTemplateDto(
            t.Id, t.Code, t.Title, t.BodyPreview, t.ProviderTemplateName,
            keys, t.RequiresEmrUrl, t.IsActive, t.SortOrder, available);
    }

    internal static IReadOnlyList<string> ParseKeys(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            var raw = JsonSerializer.Deserialize<List<string>>(json) ?? [];
            return NormalizeTokenKeys(raw);
        }
        catch
        {
            return [];
        }
    }

    internal static IReadOnlyList<string> NormalizeTokenKeys(IReadOnlyList<string>? keys)
    {
        if (keys is null || keys.Count == 0) return [SmsTemplateTokenKeys.Name, SmsTemplateTokenKeys.InviteUrl];
        var allowed = new HashSet<string>(SmsTemplateTokenKeys.All, StringComparer.OrdinalIgnoreCase);
        var cleaned = keys
            .Select(k => (k ?? string.Empty).Trim().ToLowerInvariant())
            .Where(k => allowed.Contains(k))
            .Take(3)
            .ToList();
        if (cleaned.Count == 0)
            return [SmsTemplateTokenKeys.Name, SmsTemplateTokenKeys.InviteUrl];
        return cleaned;
    }
}
