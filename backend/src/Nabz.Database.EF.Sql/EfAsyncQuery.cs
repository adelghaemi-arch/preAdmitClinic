/*
 File: backend/src/Nabz.Database.EF.Sql/EfAsyncQuery.cs
 Description: پیاده‌سازی IAsyncQuery با EF — فقط در لایه Database
 Parent Dependencies: IAsyncQuery
 */

using Microsoft.EntityFrameworkCore;
using Nabz.Application.Abstractions;

namespace Nabz.Database.EF.Sql;

public sealed class EfAsyncQuery : IAsyncQuery
{
    public Task<List<T>> ToListAsync<T>(IQueryable<T> query, CancellationToken ct = default)
        => EntityFrameworkQueryableExtensions.ToListAsync(query, ct);

    public Task<T?> FirstOrDefaultAsync<T>(IQueryable<T> query, CancellationToken ct = default)
        => EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(query, ct);

    public Task<int> CountAsync<T>(IQueryable<T> query, CancellationToken ct = default)
        => EntityFrameworkQueryableExtensions.CountAsync(query, ct);

    public Task<bool> AnyAsync<T>(IQueryable<T> query, CancellationToken ct = default)
        => EntityFrameworkQueryableExtensions.AnyAsync(query, ct);
}
