/*
 File: backend/src/Nabz.Infrastructure/Services/ClinicStationService.cs
 Description: کاتالوگ ایستگاه کلینیک — CRUD، فعال‌سازی، sync عنوان مسیر (UC-ADM-25)
 Parent Dependencies: IClinicStationRepository, IClinicRepository, IUnitOfWork
 */

using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;

namespace Nabz.Infrastructure.Services;

public sealed class ClinicStationService(
    IClinicRepository clinics,
    IClinicStationRepository stations,
    IUnitOfWork uow) : IClinicStationService
{
    public async Task<IReadOnlyList<ClinicStationDto>> ListCurrentAsync(bool activeOnly = false, CancellationToken ct = default)
    {
        var clinic = await RequireCurrentClinic(ct);
        var list = await stations.ListByClinicAsync(clinic.Id, activeOnly, ct);
        return list.Select(Map).ToList();
    }

    public async Task<ClinicStationDto> CreateAsync(UpsertClinicStationRequest body, CancellationToken ct = default)
    {
        var clinic = await RequireCurrentClinic(ct);
        var code = NormalizeCode(body.Code);
        if (string.IsNullOrEmpty(code))
            throw new InvalidOperationException("کد ایستگاه الزامی است.");
        var title = (body.TitleFa ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(title))
            throw new InvalidOperationException("عنوان فارسی ایستگاه الزامی است.");

        var existing = await stations.GetByClinicAndCodeAsync(clinic.Id, code, ct);
        if (existing is not null)
            throw new InvalidOperationException("این کد ایستگاه از قبل ثبت شده است.");

        var maxSort = (await stations.ListByClinicAsync(clinic.Id, activeOnly: false, ct))
            .Select(s => s.SortOrder).DefaultIfEmpty(0).Max();

        var row = new ClinicStation
        {
            ClinicId = clinic.Id,
            Code = code,
            TitleFa = title,
            Category = NormalizeCategory(body.Category),
            Floor = body.Floor is > 0 and <= 20 ? body.Floor.Value : 1,
            RoomNumber = (body.RoomNumber ?? string.Empty).Trim(),
            PrepInstructions = TrimOrNull(body.PrepInstructions, 2000),
            WayfindingSteps = TrimOrNull(body.WayfindingSteps, 2000),
            IsActive = body.IsActive ?? true,
            SortOrder = body.SortOrder ?? maxSort + 1,
        };
        await stations.AddAsync(row, ct);
        await uow.SaveChangesAsync(ct);
        // عنوان جدید روی مسیرهای موجود با همین کد (در صورت وجود)
        await stations.SyncPathwayStationTitlesAsync(row.Code, row.TitleFa, ct);
        await uow.SaveChangesAsync(ct);
        return Map(row);
    }

    public async Task<ClinicStationDto> UpdateAsync(Guid id, UpsertClinicStationRequest body, CancellationToken ct = default)
    {
        var clinic = await RequireCurrentClinic(ct);
        var row = await stations.GetByIdAsync(id, ct)
            ?? throw new InvalidOperationException("ایستگاه یافت نشد.");
        if (row.ClinicId != clinic.Id)
            throw new UnauthorizedAccessException("ایستگاه متعلق به کلینیک جاری نیست.");

        var titleChanged = false;
        if (body.TitleFa is not null)
        {
            var title = body.TitleFa.Trim();
            if (string.IsNullOrEmpty(title))
                throw new InvalidOperationException("عنوان فارسی ایستگاه الزامی است.");
            if (!string.Equals(row.TitleFa, title, StringComparison.Ordinal))
            {
                row.TitleFa = title;
                titleChanged = true;
            }
        }
        if (body.Category is not null)
            row.Category = NormalizeCategory(body.Category);
        if (body.Floor is int floor && floor is > 0 and <= 20)
            row.Floor = floor;
        if (body.RoomNumber is not null)
            row.RoomNumber = body.RoomNumber.Trim();
        if (body.PrepInstructions is not null)
            row.PrepInstructions = TrimOrNull(body.PrepInstructions, 2000);
        if (body.WayfindingSteps is not null)
            row.WayfindingSteps = TrimOrNull(body.WayfindingSteps, 2000);
        if (body.SortOrder is int sort)
            row.SortOrder = sort;
        if (body.IsActive is bool active)
            row.IsActive = active;

        row.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);

        if (titleChanged)
        {
            await stations.SyncPathwayStationTitlesAsync(row.Code, row.TitleFa, ct);
            await uow.SaveChangesAsync(ct);
        }

        return Map(row);
    }

    public async Task<ClinicStationDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default)
    {
        var clinic = await RequireCurrentClinic(ct);
        var row = await stations.GetByIdAsync(id, ct)
            ?? throw new InvalidOperationException("ایستگاه یافت نشد.");
        if (row.ClinicId != clinic.Id)
            throw new UnauthorizedAccessException("ایستگاه متعلق به کلینیک جاری نیست.");
        row.IsActive = isActive;
        row.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return Map(row);
    }

    private async Task<Clinic> RequireCurrentClinic(CancellationToken ct)
        => await clinics.GetCurrentAsync(ct)
           ?? throw new InvalidOperationException("کلینیک جاری یافت نشد.");

    private static ClinicStationDto Map(ClinicStation s) => new(
        s.Id, s.Code, s.TitleFa, s.Category, s.Floor, s.RoomNumber,
        s.PrepInstructions, s.WayfindingSteps, s.IsActive, s.SortOrder);

    private static string NormalizeCode(string? code)
        => (code ?? string.Empty).Trim().ToUpperInvariant();

    private static string NormalizeCategory(string? category)
    {
        var c = (category ?? "other").Trim().ToLowerInvariant();
        return c is "paraclinic" or "specialist" or "hospitality" or "remote" or "other"
            ? c
            : "other";
    }

    private static string? TrimOrNull(string? value, int max)
    {
        var t = (value ?? string.Empty).Trim();
        if (t.Length == 0) return null;
        return t.Length <= max ? t : t[..max];
    }
}
