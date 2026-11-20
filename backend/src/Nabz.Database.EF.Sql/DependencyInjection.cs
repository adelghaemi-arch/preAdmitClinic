/*
 File: backend/src/Nabz.Database.EF.Sql/DependencyInjection.cs
 Description: ثبت DbContext، UnitOfWork، AsyncQuery و Repositoryها
 Parent Dependencies: NabzDbContext, Repositories
 */

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Database.EF.Sql.Repositories;

namespace Nabz.Database.EF.Sql;

public static class DependencyInjection
{
    /// <param name="useSqlite">فقط برای محیط Testing / smoke — یک provider در DI</param>
    public static IServiceCollection AddNabzDatabase(this IServiceCollection services, string connectionString, bool useSqlite = false)
    {
        services.AddDbContext<NabzDbContext>(opt =>
        {
            if (useSqlite)
                opt.UseSqlite(connectionString);
            else
                opt.UseSqlServer(connectionString, sql => sql.MigrationsAssembly(typeof(NabzDbContext).Assembly.FullName));
        });
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IAsyncQuery, EfAsyncQuery>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IClinicRepository, ClinicRepository>();
        services.AddScoped<IContractRepository, ContractRepository>();
        services.AddScoped<IPatientRepository, PatientRepository>();
        services.AddScoped<IFormRepository, FormRepository>();
        services.AddScoped<IEvidenceRepository, EvidenceRepository>();
        services.AddScoped<IPlatformRepository, PlatformRepository>();
        return services;
    }
}
