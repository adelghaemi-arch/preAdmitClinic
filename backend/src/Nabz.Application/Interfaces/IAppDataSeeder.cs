/*
 File: backend/src/Nabz.Application/Interfaces/IAppDataSeeder.cs
 Description: seed اولیه دامنه + کاتالوگ فرم — startup و ریست فکتوری
 Parent Dependencies: none
 */

namespace Nabz.Application.Interfaces;

public interface IAppDataSeeder
{
    Task SeedAsync(CancellationToken ct = default);
}
