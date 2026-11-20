/*
 File: backend/src/Nabz.Application/Interfaces/IClinicService.cs
 Description: خواندن کلینیک جاری بدون افشای Repository به API
 Parent Dependencies: none
 */

namespace Nabz.Application.Interfaces;

public record ClinicDto(Guid Id, string Name, string? City, string Status, bool IsCurrentTenant);

public interface IClinicService
{
    Task<ClinicDto?> GetCurrentAsync(CancellationToken ct = default);
}
