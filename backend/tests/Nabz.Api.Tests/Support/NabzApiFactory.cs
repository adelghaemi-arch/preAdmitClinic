/*
 File: backend/tests/Nabz.Api.Tests/Support/NabzApiFactory.cs
 Description: WebApplicationFactory با MSSQL لوکال ephemeral، FixedOtp و FrontendUrls برای smoke CORS
 Parent Dependencies: Nabz.Api
 */

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;

namespace Nabz.Api.Tests.Support;

public class NabzApiFactory : WebApplicationFactory<Program>
{
    // دیتابیس جدا از NabzClinic dev تا موازی‌سازی کلاس‌ها و ایندکس‌های واقعی پوشش داده شود
    private readonly string _dbName = $"NabzClinic_ApiSmoke_{Guid.NewGuid():N}";
    private readonly string _connectionString;
    private readonly string? _fixedOtp;

    /// <summary>پیش‌فرض smoke: FixedOtp=12345 (سازنده بدون آرگومان برای IClassFixture).</summary>
    public NabzApiFactory() : this("12345")
    {
    }

    protected NabzApiFactory(string? fixedOtp)
    {
        _fixedOtp = fixedOtp;
        _connectionString =
            $"Server=localhost;Database={_dbName};Trusted_Connection=True;TrustServerCertificate=True;Encrypt=True;";
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Auth:FixedOtp", _fixedOtp ?? "");
        builder.UseSetting("ConnectionStrings:NabzClinic", _connectionString);
        // origins واقعی تا smoke OPTIONS با WithOrigins بشکند اگر CORS حذف شود
        builder.UseSetting("FrontendUrls:My", "https://my.nafasmed.ir");
        builder.UseSetting("FrontendUrls:News", "https://liveteb.ir");
    }

    protected override void Dispose(bool disposing)
    {
        // اول host بسته شود تا اتصال‌های باز آزاد شوند؛ بعد DROP
        base.Dispose(disposing);
        if (!disposing) return;
        DropSmokeDatabase();
    }

    private void DropSmokeDatabase()
    {
        try
        {
            const string masterCs =
                "Server=localhost;Database=master;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=True;";
            using var conn = new SqlConnection(masterCs);
            conn.Open();
            using var cmd = conn.CreateCommand();
            // نام از Guid ساخته شده؛ bracket برای شناسهٔ امن
            cmd.CommandText = $"""
                IF DB_ID(N'{_dbName}') IS NOT NULL
                BEGIN
                  ALTER DATABASE [{_dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                  DROP DATABASE [{_dbName}];
                END
                """;
            cmd.ExecuteNonQuery();
        }
        catch
        {
            // پاکسازی best-effort؛ شکست drop تست را fail نکند
        }
    }
}

/// <summary>همان factory بدون FixedOtp — شبیه‌سازی حالت پیامک واقعی.</summary>
public sealed class NabzApiSmsFactory : NabzApiFactory
{
    public NabzApiSmsFactory() : base(null)
    {
    }
}
