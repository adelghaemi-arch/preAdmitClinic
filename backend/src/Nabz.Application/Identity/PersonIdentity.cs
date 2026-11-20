/*
 File: backend/src/Nabz.Application/Identity/PersonIdentity.cs
 Description: نام نمایشی، سن از تاریخ تولد، نرمال ارقام، اعتبارسنجی کدملی و موبایل (+98→09)
 Parent Dependencies: —
 */

using System.Globalization;
using System.Text;

namespace Nabz.Application.Identity;

public static class PersonName
{
    public static string Display(string? firstName, string? lastName)
    {
        var first = (firstName ?? "").Trim();
        var last = (lastName ?? "").Trim();
        if (first.Length == 0) return last;
        if (last.Length == 0) return first;
        return $"{first} {last}";
    }

    /// <summary>تفکیک نام یکپارچهٔ قدیمی برای backfill.</summary>
    public static (string First, string Last) SplitLegacy(string? fullName)
    {
        var raw = (fullName ?? "").Trim();
        if (raw.Length == 0) return ("", "");
        var i = raw.IndexOf(' ');
        if (i < 0) return (raw, "");
        return (raw[..i].Trim(), raw[(i + 1)..].Trim());
    }
}

public static class AgeCalculator
{
    public static int? FromBirthDate(DateOnly? birthDate, DateOnly? asOf = null)
    {
        if (birthDate is null) return null;
        var today = asOf ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - birthDate.Value.Year;
        if (birthDate.Value > today.AddYears(-age)) age--;
        return age < 0 ? null : age;
    }
}

public static class DigitNormalizer
{
    public static string ToAsciiDigits(string? input)
    {
        if (string.IsNullOrEmpty(input)) return "";
        var sb = new StringBuilder(input.Length);
        foreach (var ch in input)
        {
            // فارسی ۰-۹
            if (ch is >= '\u06F0' and <= '\u06F9') { sb.Append((char)('0' + (ch - '\u06F0'))); continue; }
            // عربی ٠-٩
            if (ch is >= '\u0660' and <= '\u0669') { sb.Append((char)('0' + (ch - '\u0660'))); continue; }
            sb.Append(ch);
        }
        return sb.ToString();
    }

    public static string DigitsOnly(string? input)
        => new string(ToAsciiDigits(input).Where(char.IsDigit).ToArray());
}

public static class IranNationalId
{
    public static bool IsValid(string? raw)
    {
        var nid = DigitNormalizer.DigitsOnly(raw);
        if (nid.Length != 10) return false;
        // همه ارقام یکسان نامعتبر
        if (nid.Distinct().Count() == 1) return false;
        var sum = 0;
        for (var i = 0; i < 9; i++)
            sum += (nid[i] - '0') * (10 - i);
        var rem = sum % 11;
        var check = nid[9] - '0';
        return rem < 2 ? check == rem : check == 11 - rem;
    }

    public static string Normalize(string? raw)
    {
        // هم‌تراز فرانت: بیش از ۱۰ رقم → ۱۰ رقم آخر؛ کمتر → صفر پیشوند (ترمیم اکسل)
        var nid = DigitNormalizer.DigitsOnly(raw);
        if (nid.Length == 0) return "";
        if (nid.Length > 10) nid = nid[^10..];
        return nid.PadLeft(10, '0');
    }

    /// <summary>true اگر ورودی شبیه نماد علمی اکسل باشد (غیرقابل ترمیم امن).</summary>
    public static bool LooksLikeScientificNotation(string? raw)
        => !string.IsNullOrWhiteSpace(raw) && raw.IndexOfAny(['e', 'E']) >= 0;
}

public static class IranMobile
{
    public static bool IsValid(string? raw)
    {
        var phone = Normalize(raw);
        return phone.Length == 11 && phone.StartsWith("09", StringComparison.Ordinal);
    }

    public static string Normalize(string? raw)
    {
        var d = DigitNormalizer.DigitsOnly(raw);
        // پیشوند کشور ایران: +98 / 0098 / 98xxxxxxxxxx → 09…
        if (d.StartsWith("0098", StringComparison.Ordinal)) d = "0" + d[4..];
        else if (d.StartsWith("98", StringComparison.Ordinal) && d.Length >= 12) d = "0" + d[2..];
        else if (d.Length == 10 && d.StartsWith('9')) d = "0" + d;
        if (d.Length > 11) d = d[^11..];
        return d;
    }
}

/// <summary>پارس تاریخ تولد شمسی آزاد از اکسل (ترتیب مبهم با سال ۴رقمی).</summary>
public static class ShamsiBirthDateParser
{
    // بازهٔ معقول سال شمسی برای تولد انسان زنده
    private const int MinJy = 1270;
    private const int MaxJy = 1410;

    public static bool TryParse(string? raw, out DateOnly gregorian, out string? error)
    {
        gregorian = default;
        error = null;
        var text = DigitNormalizer.ToAsciiDigits(raw).Trim();
        if (text.Length == 0)
        {
            error = "تاریخ تولد خالی است.";
            return false;
        }

        var parts = text
            .Split(['/', '-', '.', ' ', '٫', '،'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(p => p.Trim())
            .Where(p => p.Length > 0)
            .ToArray();

        if (parts.Length != 3)
        {
            error = "تاریخ تولد باید سه جزء داشته باشد.";
            return false;
        }

        if (!int.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var a) ||
            !int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var b) ||
            !int.TryParse(parts[2], NumberStyles.Integer, CultureInfo.InvariantCulture, out var c))
        {
            error = "تاریخ تولد عددی نیست.";
            return false;
        }

        int jy, jm, jd;
        if (IsJalaliYear(a)) { jy = a; AssignMonthDay(b, c, out jm, out jd, out error); }
        else if (IsJalaliYear(c)) { jy = c; AssignMonthDay(a, b, out jm, out jd, out error); }
        else if (IsJalaliYear(b)) { jy = b; AssignMonthDay(a, c, out jm, out jd, out error); }
        else
        {
            error = "سال شمسی ۴رقمی در تاریخ تولد یافت نشد.";
            return false;
        }

        if (error is not null) return false;
        if (jm is < 1 or > 12)
        {
            error = "ماه تاریخ تولد نامعتبر است.";
            return false;
        }

        if (!JalaliToGregorian(jy, jm, jd, out gregorian))
        {
            error = "تاریخ تولد شمسی نامعتبر است.";
            return false;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (gregorian > today)
        {
            error = "تاریخ تولد نمی‌تواند در آینده باشد.";
            return false;
        }
        if (AgeCalculator.FromBirthDate(gregorian) is null or > 120)
        {
            error = "تاریخ تولد خارج از بازهٔ منطقی است.";
            return false;
        }

        return true;
    }

    private static bool IsJalaliYear(int n) => n is >= MinJy and <= MaxJy;

    private static void AssignMonthDay(int x, int y, out int month, out int day, out string? error)
    {
        error = null;
        // اگر یکی ۱–۱۲ باشد ماه است؛ اگر هر دو ماه‌مانند، فرض اول ماه (yyyy/MM/dd یا dd/MM)
        if (x is >= 1 and <= 12 && y is >= 1 and <= 31)
        {
            month = x; day = y; return;
        }
        if (y is >= 1 and <= 12 && x is >= 1 and <= 31)
        {
            month = y; day = x; return;
        }
        month = 0; day = 0;
        error = "ماه/روز تاریخ تولد قابل تشخیص نیست.";
    }

    /// <summary>تبدیل جلالی→میلادی (الگوریتم رایج بدون وابستگی خارجی).</summary>
    public static bool JalaliToGregorian(int jy, int jm, int jd, out DateOnly date)
    {
        date = default;
        if (jm is < 1 or > 12 || jd < 1) return false;
        var jy0 = jy - 979;
        var days = 365 * jy0 + (jy0 / 33) * 8 + ((jy0 % 33) + 3) / 4;
        for (var i = 1; i < jm; i++)
            days += i <= 6 ? 31 : 30;
        days += jd - 1;
        var gDays = days + 79;

        var gy = 1600 + 400 * (gDays / 146097);
        gDays %= 146097;
        var leap = true;
        if (gDays >= 36525)
        {
            gDays--;
            gy += 100 * (gDays / 36524);
            gDays %= 36524;
            if (gDays >= 365) gDays++;
            else leap = false;
        }
        gy += 4 * (gDays / 1461);
        gDays %= 1461;
        if (gDays >= 366)
        {
            leap = false;
            gDays--;
            gy += gDays / 365;
            gDays %= 365;
        }

        var gd = gDays + 1;
        int[] salA = leap
            ? [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
            : [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var gm = 0;
        for (gm = 1; gm <= 12 && gd > salA[gm]; gm++)
            gd -= salA[gm];
        try
        {
            date = new DateOnly(gy, gm, gd);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
