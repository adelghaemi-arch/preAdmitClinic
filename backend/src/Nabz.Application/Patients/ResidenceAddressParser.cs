/*
 File: backend/src/Nabz.Application/Patients/ResidenceAddressParser.cs
 Description: پارس و اعتبارسنجی JSON آدرس سکونت فرم دموگرافیک
 Parent Dependencies: System.Text.Json
 */

using System.Text.Json;
using System.Text.RegularExpressions;
using Nabz.Application.Interfaces;
using Nabz.Domain.Entities;

namespace Nabz.Application.Patients;

public static partial class ResidenceAddressParser
{
    private static readonly Regex IranPostal = IranPostalRegex();

    public static bool TryParse(string? raw, out UpdatePatientHomeAddressRequest? value, out string? error)
    {
        value = null;
        error = null;
        var trimmed = (raw ?? "").Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            error = "آدرس محل سکونت تکمیل نشده است.";
            return false;
        }

        try
        {
            using var doc = JsonDocument.Parse(trimmed);
            var root = doc.RootElement;
            if (!root.TryGetProperty("lat", out var latEl) || !root.TryGetProperty("lon", out var lonEl))
            {
                error = "مختصات موقعیت معتبر نیست.";
                return false;
            }

            if (!latEl.TryGetDouble(out var lat) || !lonEl.TryGetDouble(out var lon) ||
                lat is < -90 or > 90 || lon is < -180 or > 180)
            {
                error = "مختصات موقعیت معتبر نیست.";
                return false;
            }

            var address = root.TryGetProperty("address", out var addrEl) ? addrEl.GetString()?.Trim() ?? "" : "";
            var plaque = root.TryGetProperty("plaque", out var plaqueEl) ? plaqueEl.GetString()?.Trim() ?? "" : "";
            var unit = root.TryGetProperty("unit", out var unitEl) ? unitEl.GetString()?.Trim() : null;
            var postalRaw = root.TryGetProperty("postalCode", out var postalEl) ? postalEl.GetString()?.Trim() ?? "" : "";
            var postalDigits = DigitsOnly(postalRaw);

            if (string.IsNullOrWhiteSpace(address))
            {
                error = "متن آدرس را وارد کنید.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(plaque))
            {
                error = "پلاک ساختمان را وارد کنید.";
                return false;
            }

            if (!string.IsNullOrEmpty(postalDigits) && !IranPostal.IsMatch(postalDigits))
            {
                error = "کد پستی باید ۱۰ رقم باشد.";
                return false;
            }

            value = new UpdatePatientHomeAddressRequest(
                lat,
                lon,
                address,
                plaque,
                string.IsNullOrWhiteSpace(unit) ? null : unit,
                string.IsNullOrEmpty(postalDigits) ? null : postalDigits);
            return true; // پلاک اینجا قبلاً اجباری چک شده
        }
        catch (JsonException)
        {
            error = "دادهٔ آدرس نامعتبر است.";
            return false;
        }
    }

    public static void ApplyToPatient(Patient patient, UpdatePatientHomeAddressRequest body)
    {
        patient.HomeLat = body.HomeLat;
        patient.HomeLon = body.HomeLon;
        patient.HomeAddress = body.HomeAddress.Trim();
        // پلاک/واحد/کدپستی فقط وقتی در body آمده بازنویسی می‌شوند تا مسیر نقشه Companion پاکشان نکند
        if (!string.IsNullOrWhiteSpace(body.HomePlaque))
            patient.HomePlaque = body.HomePlaque.Trim();
        if (body.HomeUnit is not null)
            patient.HomeUnit = string.IsNullOrWhiteSpace(body.HomeUnit) ? null : body.HomeUnit.Trim();
        if (body.HomePostalCode is not null)
        {
            var postal = DigitsOnly(body.HomePostalCode);
            patient.HomePostalCode = string.IsNullOrEmpty(postal) ? null : postal;
        }
        patient.UpdatedAt = DateTime.UtcNow;
    }

    public static string? ValidateHomeRequest(UpdatePatientHomeAddressRequest body)
    {
        if (body.HomeLat is < -90 or > 90 || body.HomeLon is < -180 or > 180)
            return "مختصات موقعیت معتبر نیست.";
        if (string.IsNullOrWhiteSpace(body.HomeAddress))
            return "متن آدرس را وارد کنید.";
        var postal = DigitsOnly(body.HomePostalCode);
        if (!string.IsNullOrEmpty(postal) && !IranPostal.IsMatch(postal))
            return "کد پستی باید ۱۰ رقم باشد.";
        return null;
    }

    private static string DigitsOnly(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        return string.Concat(value.Where(char.IsDigit));
    }

    [GeneratedRegex(@"^\d{10}$")]
    private static partial Regex IranPostalRegex();
}
