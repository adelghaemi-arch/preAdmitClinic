/*
 File: backend/src/Nabz.Application/Interfaces/IPathwayService.cs
 Description: CRUD مسیر سلامتی واحد (کتابخانه + ایستگاه‌ها + آمار اتصال)
 Parent Dependencies: Domain PathwayDefinition
 */

namespace Nabz.Application.Interfaces;

public record PathwayStationInput(string RoomCode, string TitleFa, int StepOrder, bool IsOptional = false);

public record PathwayStationDto(Guid Id, string RoomCode, string TitleFa, int StepOrder, bool IsOptional);

public record PathwayDto(
    Guid Id,
    string Code,
    string Title,
    string? Description,
    string Gender,
    int? MinAge,
    int? MaxAge,
    string JobCategory,
    int EstimatedTotalMinutes,
    bool IsActive,
    bool IsInLibrary,
    IReadOnlyList<PathwayStationDto> Stations,
    DateTime CreatedAt,
    int ActiveMatchedCount,
    int PreviouslyUsedCount,
    int AttachedContractCount);

public record UpsertPathwayRequest(
    string Title,
    string? Description,
    string Gender,
    int? MinAge,
    int? MaxAge,
    string JobCategory,
    bool IsInLibrary,
    int? EstimatedTotalMinutes,
    IReadOnlyList<PathwayStationInput> Stations);

public interface IPathwayService
{
    Task<IReadOnlyList<PathwayDto>> ListAsync(string? query, bool libraryOnly = false, int take = 200, CancellationToken ct = default);
    Task<PathwayDto?> GetAsync(Guid id, CancellationToken ct = default);
    Task<PathwayDto> CreateAsync(UpsertPathwayRequest request, CancellationToken ct = default);
    Task<PathwayDto> UpdateAsync(Guid id, UpsertPathwayRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
