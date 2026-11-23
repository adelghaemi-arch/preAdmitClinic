/*
 File: backend/src/Nabz.Infrastructure/Forms/FormAudienceEvaluator.cs
 Description: ارزیابی targetAudience و visibilityRules هم‌تراز فرانت (field/op/value)
 Parent Dependencies: FormDefinition, Patient
 */

using System.Text.Json;
using Nabz.Application.Identity;
using Nabz.Domain.Entities;

namespace Nabz.Infrastructure.Forms;

public static class FormAudienceEvaluator
{
    public static bool MatchesFormAudience(FormDefinition form, Patient patient, out string? rejectReason)
    {
        rejectReason = null;
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(form.TargetAudienceJson) ? "{}" : form.TargetAudienceJson);
            var root = doc.RootElement;
            var age = AgeCalculator.FromBirthDate(patient.Person.BirthDate);
            if (root.TryGetProperty("ageMin", out var ageMinEl) && ageMinEl.ValueKind != JsonValueKind.Null && ageMinEl.TryGetInt32(out var ageMin))
            {
                if (age is null || age < ageMin)
                {
                    rejectReason = $"پرسشنامه پیش‌پذیرش برای افراد {ageMin} سال به بالا است.";
                    return false;
                }
            }
            if (root.TryGetProperty("ageMax", out var ageMaxEl) && ageMaxEl.ValueKind != JsonValueKind.Null && ageMaxEl.TryGetInt32(out var ageMax))
            {
                if (age is null || age > ageMax)
                {
                    rejectReason = "سن بیمار خارج از محدوده مخاطب فرم است.";
                    return false;
                }
            }
            if (root.TryGetProperty("gender", out var genderEl))
            {
                var g = genderEl.GetString();
                // «همه» wildcard — مثل resolveFormForPatient فرانت
                if (!string.IsNullOrWhiteSpace(g) &&
                    !string.Equals(g, "همه", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(g, patient.Person.Gender, StringComparison.OrdinalIgnoreCase))
                {
                    rejectReason = "این فرم برای جنسیت بیمار تعریف نشده است.";
                    return false;
                }
            }
        }
        catch (JsonException)
        {
            // JSON خراب = بدون محدودیت مخاطب
        }
        return true;
    }

    public static bool IsItemVisible(FormItem item, Patient patient, IReadOnlyDictionary<string, string?> answersByCode)
    {
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(item.VisibilityRulesJson) ? "[]" : item.VisibilityRulesJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array || doc.RootElement.GetArrayLength() == 0)
                return true;

            var marital = ResolveMarital(patient, answersByCode);
            // مثل فرانت: تولد پاسخ فرم بر Person اولویت دارد تا draft هم‌نشست visibility درست باشد
            var age = ResolveAge(patient, answersByCode);
            var gender = patient.Person.Gender ?? "";

            foreach (var rule in doc.RootElement.EnumerateArray())
            {
                // مدل کاتالوگ فرانت: { field, op, value }
                if (rule.TryGetProperty("field", out var fieldEl))
                {
                    if (!EvalFieldOpRule(rule, fieldEl.GetString(), marital, age, gender))
                        return false;
                    continue;
                }

                // سازگاری با شکل قدیمی: ageMin / maritalStatus مستقیم روی قانون
                if (rule.TryGetProperty("ageMin", out var ageMinEl) && ageMinEl.TryGetInt32(out var ageMin))
                {
                    if (age is null || age < ageMin) return false;
                }
                if (rule.TryGetProperty("maritalStatus", out var msEl))
                {
                    var allowed = msEl.ValueKind == JsonValueKind.Array
                        ? msEl.EnumerateArray().Select(x => x.GetString() ?? "").ToHashSet(StringComparer.OrdinalIgnoreCase)
                        : new HashSet<string>(StringComparer.OrdinalIgnoreCase) { msEl.GetString() ?? "" };
                    if (string.IsNullOrWhiteSpace(marital) || !allowed.Contains(marital))
                        return false;
                }
            }
        }
        catch (JsonException)
        {
            return true;
        }
        return true;
    }

    private static string? ResolveMarital(Patient patient, IReadOnlyDictionary<string, string?> answersByCode)
    {
        // نرمال legacy (مطلقه/بیوه→ازدواج‌کرده) تا visibility با کاتالوگ یکی بماند
        if (!string.IsNullOrWhiteSpace(patient.MaritalStatus))
            return MaritalStatusNormalizer.Normalize(patient.MaritalStatus) ?? patient.MaritalStatus.Trim();
        var fromAnswer = answersByCode
            .FirstOrDefault(kv => kv.Key.EndsWith("_BASE_maritalStatus", StringComparison.OrdinalIgnoreCase))
            .Value;
        return MaritalStatusNormalizer.Normalize(fromAnswer) ?? fromAnswer;
    }

    private static int? ResolveAge(Patient patient, IReadOnlyDictionary<string, string?> answersByCode)
    {
        var fromAnswer = answersByCode
            .FirstOrDefault(kv => kv.Key.EndsWith("_BASE_birthDate", StringComparison.OrdinalIgnoreCase))
            .Value;
        if (!string.IsNullOrWhiteSpace(fromAnswer))
        {
            var raw = fromAnswer.Trim();
            if (DateOnly.TryParse(raw, System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var iso))
                return AgeCalculator.FromBirthDate(iso);
            if (ShamsiBirthDateParser.TryParse(raw, out var shamsi, out _))
                return AgeCalculator.FromBirthDate(shamsi);
        }
        return AgeCalculator.FromBirthDate(patient.Person.BirthDate);
    }

    private static bool EvalFieldOpRule(JsonElement rule, string? field, string? marital, int? age, string gender)
    {
        var op = rule.TryGetProperty("op", out var opEl) ? opEl.GetString() : null;
        if (string.IsNullOrWhiteSpace(field) || string.IsNullOrWhiteSpace(op))
            return true;

        object? raw = field switch
        {
            "maritalStatus" => marital ?? "",
            "age" => age ?? 0,
            "gender" => gender,
            _ => null
        };
        if (raw is null) return true;

        if (!rule.TryGetProperty("value", out var valueEl))
            return true;

        return op switch
        {
            "eq" => string.Equals(Convert.ToString(raw), ValueAsString(valueEl), StringComparison.OrdinalIgnoreCase),
            "in" => ValueAsStringList(valueEl).Contains(Convert.ToString(raw) ?? "", StringComparer.OrdinalIgnoreCase),
            "gte" => ToNumber(raw) >= ToNumber(ValueAsString(valueEl)),
            "lte" => ToNumber(raw) <= ToNumber(ValueAsString(valueEl)),
            _ => true
        };
    }

    private static string ValueAsString(JsonElement el) =>
        el.ValueKind == JsonValueKind.Number ? el.GetRawText() : (el.GetString() ?? "");

    private static List<string> ValueAsStringList(JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.Array)
            return el.EnumerateArray().Select(ValueAsString).ToList();
        return [ValueAsString(el)];
    }

    private static double ToNumber(object? v)
    {
        if (v is int i) return i;
        if (v is double d) return d;
        return double.TryParse(Convert.ToString(v), out var n) ? n : 0;
    }
}
