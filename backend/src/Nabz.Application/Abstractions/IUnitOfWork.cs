/*
 File: backend/src/Nabz.Application/Abstractions/IUnitOfWork.cs
 Description: ذخیره تغییرات بدون افشای DbContext به Services
 Parent Dependencies: none
 */

namespace Nabz.Application.Abstractions;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
