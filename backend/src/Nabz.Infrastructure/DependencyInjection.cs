/*
 File: backend/src/Nabz.Infrastructure/DependencyInjection.cs
 Description: ثبت سرویس‌های دامنه، SMS قالبی و Options
 Parent Dependencies: Nabz.Application Interfaces, KavenegarTemplateSmsSender
 */

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Options;
using Nabz.Infrastructure.Services;
using Nabz.Infrastructure.Sms;
using Nabz.Infrastructure.Storage;

namespace Nabz.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddNabzInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));
        services.Configure<KavenegarOptions>(configuration.GetSection(KavenegarOptions.SectionName));
        services.AddHttpClient<ISmsSender, KavenegarTemplateSmsSender>();

        services.AddScoped<IClinicService, ClinicService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IContractService, ContractService>();
        services.AddScoped<IPackageLibraryRuleService, PackageLibraryRuleService>();
        services.AddScoped<IPatientService, PatientService>();
        services.AddScoped<IFormService, FormService>();
        services.AddScoped<IEvidenceService, EvidenceService>();
        services.AddScoped<IPlatformService, PlatformService>();
        services.AddScoped<IUserAdminService, UserAdminService>();
        services.AddSingleton<IFileStorage, LocalFileStorage>();
        return services;
    }
}
