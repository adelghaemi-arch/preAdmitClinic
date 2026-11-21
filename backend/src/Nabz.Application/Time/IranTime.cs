/*
 File: backend/src/Nabz.Application/Time/IranTime.cs
 Description: تبدیل UTC ↔ وقت ایران برای مرز API و DayKey تقویمی
 Parent Dependencies: none
 */

namespace Nabz.Application.Time;

/// <summary>
/// ذخیره همیشه UTC؛ نمایش/روز تقویمی محصول = Asia/Tehran (بدون DST فعلی).
/// </summary>
public static class IranTime
{
    private static readonly TimeZoneInfo Tz = ResolveTz();

    public static TimeZoneInfo TimeZone => Tz;

    public static DateTime ToIran(DateTime utc)
    {
        var u = EnsureUtc(utc);
        return TimeZoneInfo.ConvertTimeFromUtc(u, Tz);
    }

    public static DateTimeOffset ToIranOffset(DateTime utc)
    {
        var iran = ToIran(utc);
        var offset = Tz.GetUtcOffset(EnsureUtc(utc));
        return new DateTimeOffset(DateTime.SpecifyKind(iran, DateTimeKind.Unspecified), offset);
    }

    /// <summary>کلید روز مدنی ایران به‌صورت yyyy-MM-dd از یک instant UTC.</summary>
    public static string IranDayKey(DateTime utc)
        => ToIran(utc).ToString("yyyy-MM-dd");

    public static DateTime EnsureUtc(DateTime value)
        => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

    private static TimeZoneInfo ResolveTz()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Tehran");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Iran Standard Time");
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Iran Standard Time");
        }
    }
}
