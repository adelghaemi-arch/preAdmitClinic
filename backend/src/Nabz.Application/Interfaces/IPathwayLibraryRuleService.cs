/*
 File: backend/src/Nabz.Application/Interfaces/IPathwayLibraryRuleService.cs
 Description: کتابخانه مرکزی مسیرهای سلامتی — CRUD، جستجو و آمار استفاده
 Parent Dependencies: Domain PathwayLibraryRule
 */

namespace Nabz.Application.Interfaces;

public record PathwayLibraryRuleDto(
    Guid Id,
    string Code,
    string Title,
    string? Description,
    string Gender,
    int? MinAge,
    int? MaxAge,
    string JobCategory,
    string PathwayCode,
    DateTime CreatedAt,
    int ActiveMatchedCount,
    int PreviouslyUsedCount,
    int AttachedContractCount);

public record UpsertPathwayLibraryRuleRequest(
    string Title,
    string? Description,
    string Gender,
    int? MinAge,
    int? MaxAge,
    string JobCategory,
    string PathwayCode);

public interface IPathwayLibraryRuleService
{
    Task<IReadOnlyList<PathwayLibraryRuleDto>> ListAsync(string? query, int take = 200, CancellationToken ct = default);
    Task<PathwayLibraryRuleDto?> GetAsync(Guid id, CancellationToken ct = default);
    Task<PathwayLibraryRuleDto> CreateAsync(UpsertPathwayLibraryRuleRequest request, CancellationToken ct = default);
    Task<PathwayLibraryRuleDto> UpdateAsync(Guid id, UpsertPathwayLibraryRuleRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
