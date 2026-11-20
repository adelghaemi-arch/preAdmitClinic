/*
 File: backend/src/Nabz.Application/Patients/PatientProfileDiff.cs
 Description: ساخت ردیف‌های از→به برای تغییرات پروفایل بیمار (بدون EF)
 Parent Dependencies: Nabz.Domain.Entities
 */

using Nabz.Domain.Entities;

namespace Nabz.Application.Patients;

public static class PatientProfileDiff
{
    public static IReadOnlyList<PatientProfileRevision> Build(
        Guid patientId,
        Guid changedByUserId,
        string source,
        IReadOnlyDictionary<string, string?> before,
        IReadOnlyDictionary<string, string?> after)
    {
        var list = new List<PatientProfileRevision>();
        foreach (var key in after.Keys.Union(before.Keys))
        {
            before.TryGetValue(key, out var oldVal);
            after.TryGetValue(key, out var newVal);
            oldVal = Normalize(oldVal);
            newVal = Normalize(newVal);
            if (string.Equals(oldVal, newVal, StringComparison.Ordinal)) continue;
            list.Add(new PatientProfileRevision
            {
                PatientId = patientId,
                Field = key,
                OldValue = oldVal,
                NewValue = newVal,
                ChangedByUserId = changedByUserId,
                Source = source,
                At = DateTime.UtcNow
            });
        }
        return list;
    }

    public static Dictionary<string, string?> SnapshotDemographics(Patient p) => new(StringComparer.Ordinal)
    {
        ["FirstName"] = p.Person.FirstName,
        ["LastName"] = p.Person.LastName,
        ["BirthDate"] = p.Person.BirthDate?.ToString("yyyy-MM-dd"),
        ["MaritalStatus"] = p.MaritalStatus,
        ["Gender"] = p.Person.Gender,
        ["HomeAddress"] = p.HomeAddress,
        ["HomePlaque"] = p.HomePlaque,
        ["HomeUnit"] = p.HomeUnit,
        ["HomePostalCode"] = p.HomePostalCode,
        ["HomeLat"] = FormatCoord(p.HomeLat),
        ["HomeLon"] = FormatCoord(p.HomeLon),
    };

    public static Dictionary<string, string?> SnapshotHome(Patient p) => new(StringComparer.Ordinal)
    {
        ["HomeAddress"] = p.HomeAddress,
        ["HomePlaque"] = p.HomePlaque,
        ["HomeUnit"] = p.HomeUnit,
        ["HomePostalCode"] = p.HomePostalCode,
        ["HomeLat"] = FormatCoord(p.HomeLat),
        ["HomeLon"] = FormatCoord(p.HomeLon),
    };

    private static string? Normalize(string? v)
        => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    private static string? FormatCoord(double? v)
        => v is null ? null : v.Value.ToString("G", System.Globalization.CultureInfo.InvariantCulture);
}
