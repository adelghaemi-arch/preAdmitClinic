/*
 File: backend/src/Nabz.Database.EF.Sql/DatabaseFactoryReset.cs
 Description: EnsureDeleted + MigrateAsync برای ریست فکتوری
 Parent Dependencies: NabzDbContext, IDatabaseFactoryReset
 */

using Microsoft.EntityFrameworkCore;
using Nabz.Application.Abstractions;

namespace Nabz.Database.EF.Sql;

public sealed class DatabaseFactoryReset(NabzDbContext db) : IDatabaseFactoryReset
{
    public async Task WipeAndMigrateAsync(CancellationToken ct = default)
    {
        await db.Database.EnsureDeletedAsync(ct);
        await db.Database.MigrateAsync(ct);
        // tracker قبلی بعد از drop نامعتبر است؛ seed روی همین scope تمیز بماند
        db.ChangeTracker.Clear();
    }
}
