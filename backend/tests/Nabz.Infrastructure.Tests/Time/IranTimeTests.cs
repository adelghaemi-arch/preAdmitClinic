/*
 File: backend/tests/Nabz.Infrastructure.Tests/Time/IranTimeTests.cs
 Description: Unit تبدیل UTC به وقت ایران و DayKey — مرز API
 Parent Dependencies: IranTime, IranDateTimeJsonConverter
 */

using System.Text.Json;
using Nabz.Application.Time;

namespace Nabz.Infrastructure.Tests.Time;

public sealed class IranTimeTests
{
    [Fact]
    public void ToIran_AddsOffset()
    {
        var utc = new DateTime(2026, 11, 20, 12, 0, 0, DateTimeKind.Utc);
        var iran = IranTime.ToIran(utc);
        Assert.Equal(15, iran.Hour);
        Assert.Equal(30, iran.Minute);
    }

    [Fact]
    public void IranDayKey_UsesIranCalendarDay()
    {
        // 21:00 UTC = 00:30 روز بعد به وقت ایران
        var utc = new DateTime(2026, 11, 20, 21, 0, 0, DateTimeKind.Utc);
        Assert.Equal("2026-11-21", IranTime.IranDayKey(utc));
        Assert.NotEqual("2026-11-20", IranTime.IranDayKey(utc));
    }

    [Fact]
    public void JsonConverter_WritesIranOffset()
    {
        var opts = new JsonSerializerOptions();
        opts.Converters.Add(new IranDateTimeJsonConverter());
        var utc = new DateTime(2026, 11, 20, 12, 0, 0, DateTimeKind.Utc);
        var json = JsonSerializer.Serialize(utc, opts);
        // System.Text.Json ممکن است + را \u002B کند؛ پس از parse باید آفست ایران باشد
        var roundTrip = JsonSerializer.Deserialize<DateTime>(json, opts);
        Assert.Equal(utc, DateTime.SpecifyKind(roundTrip, DateTimeKind.Utc));
        Assert.Contains("15:30:00", json);
    }
}
