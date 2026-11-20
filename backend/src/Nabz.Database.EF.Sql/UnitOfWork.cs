/*
 File: backend/src/Nabz.Database.EF.Sql/UnitOfWork.cs
 Description: SaveChanges پشت IUnitOfWork
 Parent Dependencies: NabzDbContext, IUnitOfWork
 */

using Nabz.Application.Abstractions;

namespace Nabz.Database.EF.Sql;

public sealed class UnitOfWork(NabzDbContext db) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}
