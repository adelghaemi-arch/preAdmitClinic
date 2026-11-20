/*
 File: backend/src/Nabz.Infrastructure/Services/ClinicService.cs
 Description: سرویس نازک خواندن کلینیک جاری
 Parent Dependencies: IClinicRepository
 */

using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;

namespace Nabz.Infrastructure.Services;

public sealed class ClinicService(IClinicRepository clinics) : IClinicService
{
    public async Task<ClinicDto?> GetCurrentAsync(CancellationToken ct = default)
    {
        var c = await clinics.GetCurrentAsync(ct);
        return c is null ? null : new ClinicDto(c.Id, c.Name, c.City, c.Status.ToString(), c.IsCurrentTenant);
    }
}
