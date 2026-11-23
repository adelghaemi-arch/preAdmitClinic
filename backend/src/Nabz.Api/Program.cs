/*
 File: backend/src/Nabz.Api/Program.cs
 Description: هاست API؛ Auth نشست، CORS از FrontendUrls، MigrateAsync و seed اولیه
 Parent Dependencies: Nabz.Infrastructure, Nabz.Database.EF.Sql, AppDataSeeder, SessionAuthenticationHandler
 */

using System.Text.Encodings.Web;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Nabz.Api.Auth;
using Nabz.Api.Middleware;
using Nabz.Api.Seed;
using Nabz.Application.Interfaces;
using Nabz.Application.Options;
using Nabz.Application.Time;
using Nabz.Database.EF.Sql;
using Nabz.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Production: FixedOtp ممنوع — وگرنه SMS قطع و کد نمایشی ثابت گمراه‌کننده می‌شود
AuthProductionGuards.EnsureFixedOtpAllowed(
    builder.Environment.IsProduction(),
    builder.Configuration["Auth:FixedOtp"]);

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    // DateTime API → وقت ایران؛ DB همچنان UTC
    o.JsonSerializerOptions.Converters.Add(new IranDateTimeJsonConverter());
    o.JsonSerializerOptions.Converters.Add(new IranNullableDateTimeJsonConverter());
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    // تا +03:30 و متن فارسی در JSON به‌صورت \uXXXX دیده نشوند
    o.JsonSerializerOptions.Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
});
builder.Services.AddOpenApi();

// FrontendUrls: هر origin فرانت این هاست (یک یا چند تا با ,/؛)؛ خالی = AllowAnyOrigin فقط برای dev بدون env
var frontendOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
foreach (var o in FrontendUrlsOptions.ParseOrigins(builder.Configuration["FrontendUrls:My"]))
    frontendOrigins.Add(o);
foreach (var o in FrontendUrlsOptions.ParseOrigins(builder.Configuration["FrontendUrls:News"]))
    frontendOrigins.Add(o);
// Vite لوکال فقط در Development تا WithOrigins روی سرور شل نشود
if (builder.Environment.IsDevelopment())
{
    frontendOrigins.Add("http://localhost:5173");
    frontendOrigins.Add("http://127.0.0.1:5173");
}

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
{
    p.AllowAnyHeader().AllowAnyMethod();
    if (frontendOrigins.Count > 0)
        p.WithOrigins(frontendOrigins.ToArray());
    else
        p.AllowAnyOrigin();
}));

builder.Services.AddAuthentication(SessionAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(
        SessionAuthenticationHandler.SchemeName, _ => { });
builder.Services.AddAuthorization();

var cs = builder.Configuration.GetConnectionString("NabzClinic")
    ?? "Server=localhost;Database=NabzClinic;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=True;";
// Testing و غیرTesting هر دو SQL Server + Migrate — smoke ایندکس/FK واقعی را می‌بیند
builder.Services.AddNabzDatabase(cs);
builder.Services.AddNabzInfrastructure(builder.Configuration);
builder.Services.AddScoped<IAppDataSeeder, AppDataSeeder>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NabzDbContext>();
    await db.Database.MigrateAsync();
    var seeder = scope.ServiceProvider.GetRequiredService<IAppDataSeeder>();
    await seeder.SeedAsync();
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors();
// Early: deny-set + محدودیت OTP بر اساس IP — قبل از Auth تا DB داغ نشود
app.UseMiddleware<ApiAbuseEarlyMiddleware>();
app.UseAuthentication();
// PostAuth: soft/hard برای غیر Platform؛ hard → تعلیق
app.UseMiddleware<ApiAbusePostAuthMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.Run();

// برای WebApplicationFactory در تست‌های smoke
public partial class Program;
