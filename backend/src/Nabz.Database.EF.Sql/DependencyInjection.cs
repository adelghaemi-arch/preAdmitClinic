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
// IDatabaseFactoryReset در Abstractions؛ پیاده‌سازی همین اسمبلی

namespace Nabz.Database.EF.Sql;

public static class DependencyInjection
{
    public static IServiceCollection AddNabzDatabase(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<NabzDbContext>(opt =>
            opt.UseSqlServer(connectionString, sql => sql.MigrationsAssembly(typeof(NabzDbContext).Assembly.FullName)));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IAsyncQuery, EfAsyncQuery>();
        services.AddScoped<IPersonRepository, PersonRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IClinicRepository, ClinicRepository>();
        services.AddScoped<IContractRepository, ContractRepository>();
        services.AddScoped<IPathwayLibraryRuleRepository, PathwayLibraryRuleRepository>();
        services.AddScoped<IPatientRepository, PatientRepository>();
        services.AddScoped<IPatientProfileRevisionRepository, PatientProfileRevisionRepository>();
        services.AddScoped<IFormRepository, FormRepository>();
        services.AddScoped<IEvidenceRepository, EvidenceRepository>();
        services.AddScoped<IPlatformRepository, PlatformRepository>();
        services.AddScoped<ISmsCampaignTemplateRepository, SmsCampaignTemplateRepository>();
        services.AddScoped<IDatabaseFactoryReset, DatabaseFactoryReset>();
        return services;
    }
}
