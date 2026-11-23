/*
 File: backend/src/Nabz.Application/Pdf/PersianPdfDigits.cs
 Description: تبدیل ارقام لاتین به فارسی برای قالب PDF
 Parent Dependencies: none
 */

namespace Nabz.Application.Pdf;

public static class PersianPdfDigits
{
    public static string ToFa(object? value)
    {
        if (value is null) return "";
        var s = value.ToString() ?? "";
        return s
            .Replace('0', '۰').Replace('1', '۱').Replace('2', '۲').Replace('3', '۳').Replace('4', '۴')
            .Replace('5', '۵').Replace('6', '۶').Replace('7', '۷').Replace('8', '۸').Replace('9', '۹');
    }
}
