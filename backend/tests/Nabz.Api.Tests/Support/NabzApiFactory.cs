/*
 File: backend/tests/Nabz.Api.Tests/Support/NabzApiFactory.cs
 Description: WebApplicationFactory با SQLite و Auth:FixedOtp برای smoke
 Parent Dependencies: Nabz.Api
 */

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Nabz.Api.Tests.Support;

public sealed class NabzApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"nabz-api-tests-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // UseSetting روی appsettings اولویت دارد و از Server= SQL جلوگیری می‌کند
        builder.UseEnvironment("Testing");
        builder.UseSetting("Auth:FixedOtp", "12345");
        builder.UseSetting("ConnectionStrings:NabzClinic", $"Data Source={_dbPath}");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing) return;
        try
        {
            if (File.Exists(_dbPath)) File.Delete(_dbPath);
        }
        catch
        {
            // فایل موقت تست
        }
    }
}
