/*
 File: backend/tests/Nabz.Api.Tests/Smoke/SeedIdempotentSmokeTests.cs
 Description: دوبار SeedAsync بدون crash؛ یک ناظر برای DEMO-ORG
 Parent Dependencies: NabzApiFactory, IAppDataSeeder, NabzDbContext
 */

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Nabz.Api.Tests.Support;
using Nabz.Application.Interfaces;
using Nabz.Database.EF.Sql;

namespace Nabz.Api.Tests.Smoke;

public sealed class SeedIdempotentSmokeTests : IClassFixture<NabzApiFactory>
{
    private readonly NabzApiFactory _factory;

    public SeedIdempotentSmokeTests(NabzApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    [Trait("SMK", "SMK-API-SEED")]
    public async Task SeedAsync_SecondRun_DoesNotThrow_AndKeepsOneDemoSupervisor()
    {
        // استارت factory یک‌بار seed کرده؛ اجرای دوم باید idempotent باشد
        using (var scope = _factory.Services.CreateScope())
        {
            var seeder = scope.ServiceProvider.GetRequiredService<IAppDataSeeder>();
            var ex = await Record.ExceptionAsync(() => seeder.SeedAsync());
            Assert.Null(ex);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NabzDbContext>();
            var clinic = await db.Clinics.FirstAsync(c => c.IsCurrentTenant);
            var demo = await db.CorporateContracts.FirstAsync(c => c.ClinicId == clinic.Id && c.Code == "DEMO-ORG");
            var supervisorCount = await db.ContractSupervisors.CountAsync(s => s.ContractId == demo.Id);
            Assert.Equal(1, supervisorCount);
        }
    }
}
