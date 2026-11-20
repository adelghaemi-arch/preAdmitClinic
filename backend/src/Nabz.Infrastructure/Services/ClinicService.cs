/*
 File: backend/src/Nabz.Infrastructure/Services/ClinicService.cs
 Description: سرویس خواندن و به‌روزرسانی کلینیک جاری
 Parent Dependencies: IClinicRepository, IUnitOfWork
 */

using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;

namespace Nabz.Infrastructure.Services;

public sealed class ClinicService(IClinicRepository clinics, IUnitOfWork uow) : IClinicService
{
    public async Task<ClinicDto?> GetCurrentAsync(CancellationToken ct = default)
    {
        var c = await clinics.GetCurrentAsync(ct);
        return c is null ? null : Map(c);
    }

    public async Task<ClinicDto> UpdateCurrentAsync(UpdateClinicRequest request, CancellationToken ct = default)
    {
        var name = (request.Name ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("نام بیمارستان/کلینیک الزامی است.");
        if (name.Length > 200)
            throw new InvalidOperationException("نام بیش از حد طولانی است.");

        var c = await clinics.GetCurrentAsync(ct)
            ?? throw new InvalidOperationException("کلینیک جاری یافت نشد.");

        // مختصات فقط با هم معتبرند تا فاصله/مسیریابی ناقص نشود
        if (request.Latitude is null != request.Longitude is null)
            throw new InvalidOperationException("عرض و طول جغرافیایی باید هر دو ست شوند.");
        if (request.Latitude is double lat && (lat < -90 || lat > 90))
            throw new InvalidOperationException("عرض جغرافیایی نامعتبر است.");
        if (request.Longitude is double lon && (lon < -180 || lon > 180))
            throw new InvalidOperationException("طول جغرافیایی نامعتبر است.");

        c.Name = name;
        c.City = string.IsNullOrWhiteSpace(request.City) ? null : request.City.Trim();
        c.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        c.Latitude = request.Latitude;
        c.Longitude = request.Longitude;
        c.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return Map(c);
    }

    private static ClinicDto Map(Clinic c)
        => new(c.Id, c.Name, c.City, c.Status.ToString(), c.IsCurrentTenant, c.Address, c.Latitude, c.Longitude);
}
