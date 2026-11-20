/*
 File: backend/src/Nabz.Database.EF.Sql/UnitOfWork.cs
 Description: SaveChanges پشت IUnitOfWork؛ نقض یکتای کدملی → پیام دامنه
 Parent Dependencies: NabzDbContext, IUnitOfWork
 */

using Microsoft.EntityFrameworkCore;
using Nabz.Application.Abstractions;

namespace Nabz.Database.EF.Sql;

public sealed class UnitOfWork(NabzDbContext db) : IUnitOfWork
{
    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        try
        {
            return await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (LooksLikeNationalIdUnique(ex))
        {
            // Service لایهٔ EF ندارد؛ پیام فارسی برای Conflict کنترلر
            throw new InvalidOperationException("این کد ملی قبلاً ثبت شده است.", ex);
        }
    }

    private static bool LooksLikeNationalIdUnique(DbUpdateException ex)
    {
        var msg = ex.InnerException?.Message ?? ex.Message;
        if (string.IsNullOrEmpty(msg)) return false;
        // ایندکس فیلترشدهٔ Persons.NationalId (+ تطبیق عمومی unique)
        return msg.Contains("IX_Persons_NationalId", StringComparison.OrdinalIgnoreCase)
               || (msg.Contains("NationalId", StringComparison.OrdinalIgnoreCase)
                   && (msg.Contains("unique", StringComparison.OrdinalIgnoreCase)
                       || msg.Contains("UNIQUE", StringComparison.Ordinal)
                       || msg.Contains("duplicate", StringComparison.OrdinalIgnoreCase)));
    }
}
