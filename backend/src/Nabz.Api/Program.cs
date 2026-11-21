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
using Nabz.Api.Seed;
using Nabz.Application.Interfaces;
using Nabz.Application.Time;
using Nabz.Database.EF.Sql;
using Nabz.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

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

// FrontendUrls باید واقعاً policy بسازد؛ خالی = AllowAnyOrigin فقط برای dev بدون env
var frontendOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
void AddOrigin(string? raw)
{
    var o = raw?.Trim().TrimEnd('/');
    if (!string.IsNullOrEmpty(o))
        frontendOrigins.Add(o);
}
AddOrigin(builder.Configuration["FrontendUrls:My"]);
AddOrigin(builder.Configuration["FrontendUrls:News"]);
// Vite لوکال فقط در Development تا WithOrigins روی سرور شل نشود
if (builder.Environment.IsDevelopment())
{
    AddOrigin("http://localhost:5173");
    AddOrigin("http://127.0.0.1:5173");
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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

// برای WebApplicationFactory در تست‌های smoke
public partial class Program;
