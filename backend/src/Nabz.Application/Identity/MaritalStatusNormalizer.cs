/*
 File: backend/src/Nabz.Application/Identity/MaritalStatusNormalizer.cs
 Description: گزینه‌های کانونیکال تأهل + نرمال‌سازی اکسل/legacy (هم‌تراز کاتالوگ فرم)
 Parent Dependencies: —
 */

using System.Text;

namespace Nabz.Application.Identity;

/// <summary>هم‌تراز selectOptions فیلد BASE_maritalStatus در کاتالوگ فرم.</summary>
public static class MaritalStatusNormalizer
{
    public static readonly string[] CanonicalOptions = ["مجرد", "متأهل", "ازدواج‌کرده", "سایر"];

    private static readonly HashSet<string> Canonical = new(CanonicalOptions, StringComparer.Ordinal);

    /// <summary>
    /// مقدار خام را به یکی از ۴ گزینه می‌رساند؛ ناشناخته → null.
    /// مطلقه/بیوه (اکسل قدیمی) → ازدواج‌کرده تا سوالات مشروط متأهل باز بمانند.
    /// </summary>
    public static string? Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var s = NormalizePersianLetters(raw.Trim());
        if (s.Length == 0) return null;

        if (s is "مطلقه" or "بیوه") return "ازدواج‌کرده";
        if (Canonical.Contains(s)) return s;

        var key = CollapseForCompare(s);
        return key switch
        {
            "متاهل" or "متأهل" => "متأهل",
            "ازدواجکرده" => "ازدواج‌کرده",
            "مجرد" => "مجرد",
            "سایر" => "سایر",
            "مطلقه" or "بیوه" => "ازدواج‌کرده",
            _ => null
        };
    }

    private static string NormalizePersianLetters(string input)
    {
        var sb = new StringBuilder(input.Length);
        foreach (var ch in input)
        {
            // ي عربی → ی؛ ك عربی → ک
            if (ch == '\u064A') sb.Append('\u06CC');
            else if (ch == '\u0643') sb.Append('\u06A9');
            else sb.Append(ch);
        }
        return sb.ToString();
    }

    private static string CollapseForCompare(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (var ch in s)
        {
            if (ch is '\u200c' or '\u200f' or '\u200e' or ' ' or '\t') continue;
            sb.Append(ch);
        }
        return sb.ToString();
    }
}
