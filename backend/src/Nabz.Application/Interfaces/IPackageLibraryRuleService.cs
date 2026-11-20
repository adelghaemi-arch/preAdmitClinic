/*
 File: backend/src/Nabz.Application/Interfaces/IPackageLibraryRuleService.cs
 Description: کتابخانه مرکزی قوانین بسته سلامت — CRUD، جستجو و آمار استفاده
 Parent Dependencies: Domain PackageLibraryRule
 */

namespace Nabz.Application.Interfaces;

public record PackageLibraryRuleDto(
    Guid Id,
    string Code,
    string Title,
    string? Description,
    string Gender,
    int? MinAge,
    int? MaxAge,
    string JobCategory,
    string PackageCode,
    DateTime CreatedAt,
    int ActiveMatchedCount,
    int PreviouslyUsedCount,
    int AttachedContractCount);

public record UpsertPackageLibraryRuleRequest(
    string Title,
    string? Description,
    string Gender,
    int? MinAge,
    int? MaxAge,
    string JobCategory,
    string PackageCode);

public interface IPackageLibraryRuleService
{
    Task<IReadOnlyList<PackageLibraryRuleDto>> ListAsync(string? query, int take = 200, CancellationToken ct = default);
    Task<PackageLibraryRuleDto?> GetAsync(Guid id, CancellationToken ct = default);
    Task<PackageLibraryRuleDto> CreateAsync(UpsertPackageLibraryRuleRequest request, CancellationToken ct = default);
    Task<PackageLibraryRuleDto> UpdateAsync(Guid id, UpsertPackageLibraryRuleRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
