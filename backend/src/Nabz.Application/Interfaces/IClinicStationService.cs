/*
 File: backend/src/Nabz.Application/Interfaces/IClinicStationService.cs
 Description: کاتالوگ ایستگاه کلینیک جاری — CRUD و فعال/غیرفعال (UC-ADM-25)
 Parent Dependencies: none
 */

namespace Nabz.Application.Interfaces;

public record ClinicStationDto(
    Guid Id,
    string Code,
    string TitleFa,
    string Category,
    int Floor,
    string RoomNumber,
    string? PrepInstructions,
    string? WayfindingSteps,
    bool IsActive,
    int SortOrder);

public record UpsertClinicStationRequest(
    string? Code = null,
    string? TitleFa = null,
    string? Category = null,
    int? Floor = null,
    string? RoomNumber = null,
    string? PrepInstructions = null,
    string? WayfindingSteps = null,
    int? SortOrder = null,
    bool? IsActive = null);

public interface IClinicStationService
{
    Task<IReadOnlyList<ClinicStationDto>> ListCurrentAsync(bool activeOnly = false, CancellationToken ct = default);
    Task<ClinicStationDto> CreateAsync(UpsertClinicStationRequest body, CancellationToken ct = default);
    Task<ClinicStationDto> UpdateAsync(Guid id, UpsertClinicStationRequest body, CancellationToken ct = default);
    Task<ClinicStationDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default);
}
