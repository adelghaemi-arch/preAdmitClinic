/*
 File: backend/src/Nabz.Application/Abstractions/IAsyncQuery.cs
 Description: materialize بدون وابستگی Services به EF
 Parent Dependencies: none
 */

namespace Nabz.Application.Abstractions;

public interface IAsyncQuery
{
    Task<List<T>> ToListAsync<T>(IQueryable<T> query, CancellationToken ct = default);
    Task<T?> FirstOrDefaultAsync<T>(IQueryable<T> query, CancellationToken ct = default);
    Task<int> CountAsync<T>(IQueryable<T> query, CancellationToken ct = default);
    Task<bool> AnyAsync<T>(IQueryable<T> query, CancellationToken ct = default);
}
