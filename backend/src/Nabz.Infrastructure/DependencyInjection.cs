/*
 File: backend/src/Nabz.Infrastructure/DependencyInjection.cs
 Description: ثبت سرویس‌های دامنه، SMS چندسامانه‌ای و Options
 Parent Dependencies: ClinicRoutingSmsSender, ClinicSmsDispatch, KavenegarTemplateSmsSender, ToubaUrlSmsSender
 */

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Options;
using Nabz.Infrastructure.Abuse;
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
        services.Configure<FrontendUrlsOptions>(configuration.GetSection(FrontendUrlsOptions.SectionName));
        services.Configure<ApiAbuseOptions>(configuration.GetSection(ApiAbuseOptions.SectionName));

        services.AddHttpClient<KavenegarTemplateSmsSender>();
        services.AddHttpClient<ToubaUrlSmsSender>();
        services.AddScoped<ISmsSender, ClinicRoutingSmsSender>();
        services.AddScoped<IClinicSmsDispatch, ClinicSmsDispatch>();

        services.AddSingleton<IApiAbuseMemoryStore, ApiAbuseMemoryStore>();
        services.AddScoped<IApiAbuseGuardService, ApiAbuseGuardService>();
        services.AddScoped<IClinicService, ClinicService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IContractService, ContractService>();
        services.AddScoped<IPathwayLibraryRuleService, PathwayLibraryRuleService>();
        services.AddScoped<IPatientService, PatientService>();
        services.AddScoped<IFormService, FormService>();
        services.AddScoped<IEvidenceService, EvidenceService>();
        services.AddScoped<IPlatformService, PlatformService>();
        services.AddScoped<ISmsCampaignTemplateService, SmsCampaignTemplateService>();
        services.AddScoped<IUserAdminService, UserAdminService>();
        services.AddSingleton<IFileStorage, LocalFileStorage>();
        return services;
    }
}
