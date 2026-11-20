/*
 File: backend/tests/Nabz.Infrastructure.Tests/Fakes/FakeUnitOfWork.cs
 Description: پیاده‌سازی in-memory IUnitOfWork برای تست سرویس
 Parent Dependencies: Nabz.Application.Abstractions.IUnitOfWork
 */

using Nabz.Application.Abstractions;

namespace Nabz.Infrastructure.Tests.Fakes;

public sealed class FakeUnitOfWork(InMemoryStore? store = null) : IUnitOfWork
{
    public int SaveCount { get; private set; }

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        SaveCount++;
        store?.SyncNavigation();
        return Task.FromResult(1);
    }
}