/*
 File: backend/src/Nabz.Application/Interfaces/ISmsCampaignTemplateService.cs
 Description: قالب‌های پیامک گروهی — تعریف ادمین کل، انتخاب ادمین کلینیک
 Parent Dependencies: none
 */

namespace Nabz.Application.Interfaces;

public record SmsCampaignTemplateDto(
    Guid Id,
    string Code,
    string Title,
    string BodyPreview,
    string ProviderTemplateName,
    IReadOnlyList<string> TokenKeys,
    bool RequiresEmrUrl,
    bool IsActive,
    int SortOrder,
    /// <summary>اگر RequiresEmrUrl و هنوز لینک پرونده نداریم، برای ارسال غیرفعال است</summary>
    bool AvailableForSend);

public record UpsertSmsCampaignTemplateRequest(
    Guid? Id,
    string Code,
    string Title,
    string BodyPreview,
    string ProviderTemplateName,
    IReadOnlyList<string> TokenKeys,
    bool RequiresEmrUrl,
    bool IsActive,
    int SortOrder);

public interface ISmsCampaignTemplateService
{
    Task<IReadOnlyList<SmsCampaignTemplateDto>> ListAsync(bool activeOnly, CancellationToken ct = default);
    Task<SmsCampaignTemplateDto> UpsertAsync(UpsertSmsCampaignTemplateRequest request, string actor, CancellationToken ct = default);
}
