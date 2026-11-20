/*
 File: backend/src/Nabz.Application/Abstractions/IDatabaseFactoryReset.cs
 Description: قرارداد wipe اسکیما + Migrate برای ریست فکتوری (بدون افشای EF به Services)
 Parent Dependencies: none
 */

namespace Nabz.Application.Abstractions;

public interface IDatabaseFactoryReset
{
    /// <summary>حذف کامل دیتابیس و اعمال مجدد زنجیرهٔ مایگریشن.</summary>
    Task WipeAndMigrateAsync(CancellationToken ct = default);
}
