/*
 File: backend/src/Nabz.Application/Interfaces/IClinicService.cs
 Description: خواندن و به‌روزرسانی کلینیک جاری بدون افشای Repository به API
 Parent Dependencies: none
 */

namespace Nabz.Application.Interfaces;

public record ClinicDto(
    Guid Id,
    string Name,
    string? City,
    string Status,
    bool IsCurrentTenant,
    string? Address = null,
    double? Latitude = null,
    double? Longitude = null);

public record UpdateClinicRequest(
    string Name,
    string? City,
    string? Address,
    double? Latitude,
    double? Longitude);

public interface IClinicService
{
    Task<ClinicDto?> GetCurrentAsync(CancellationToken ct = default);
    Task<ClinicDto> UpdateCurrentAsync(UpdateClinicRequest request, CancellationToken ct = default);
}
