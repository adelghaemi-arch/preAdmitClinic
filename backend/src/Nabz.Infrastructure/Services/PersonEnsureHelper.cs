/*
 File: backend/src/Nabz.Infrastructure/Services/PersonEnsureHelper.cs
 Description: ایجاد/به‌روزرسانی Person واحد برای اعضا، بیمار و User
 Parent Dependencies: IPersonRepository, PersonIdentity
 */

using Nabz.Application.Identity;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;

namespace Nabz.Infrastructure.Services;

public static class PersonEnsureHelper
{
    public sealed record IdentityInput(
        string Mobile,
        string? NationalId,
        string FirstName,
        string LastName,
        string? Gender,
        DateOnly? BirthDate,
        string? FatherName = null);

    /// <summary>کدملی وقتی معتبر است کلید جستجو؛ وگرنه Person جدید با موبایل.</summary>
    public static async Task<Person> EnsurePersonAsync(
        IPersonRepository persons,
        IdentityInput input,
        CancellationToken ct)
    {
        var mobile = IranMobile.Normalize(input.Mobile);
        string? nid = null;
        if (!string.IsNullOrWhiteSpace(input.NationalId))
        {
            var normalized = IranNationalId.Normalize(input.NationalId);
            if (IranNationalId.IsValid(normalized))
                nid = normalized;
        }

        Person? person = null;
        if (nid is not null)
            person = await persons.GetByNationalIdAsync(nid, ct);

        // ناظر بدون کدملی: همان موبایل را دوباره Person جدید نکن
        if (person is null)
        {
            var byMobile = await persons.ListByMobileAsync(mobile, ct);
            person = nid is null
                ? byMobile.FirstOrDefault(p => string.IsNullOrWhiteSpace(p.NationalId))
                    ?? byMobile.FirstOrDefault()
                : byMobile.FirstOrDefault(p => p.NationalId == nid);
        }

        if (person is null)
        {
            person = new Person
            {
                Mobile = mobile,
                NationalId = nid,
                FirstName = input.FirstName.Trim(),
                LastName = input.LastName.Trim(),
                FatherName = string.IsNullOrWhiteSpace(input.FatherName) ? null : input.FatherName.Trim(),
                Gender = input.Gender,
                BirthDate = input.BirthDate
            };
            await persons.AddAsync(person, ct);
            return person;
        }

        ApplyRosterToPerson(person, input with { Mobile = mobile, NationalId = nid });
        return person;
    }

    /// <summary>همگام‌سازی رoster قرارداد؛ موبایل منبع OTP است.</summary>
    public static void ApplyRosterToPerson(Person person, IdentityInput input)
    {
        var mobile = IranMobile.Normalize(input.Mobile);
        if (IranMobile.IsValid(mobile))
            person.Mobile = mobile;

        if (input.NationalId is not null && IranNationalId.IsValid(input.NationalId))
            person.NationalId = input.NationalId;

        var first = input.FirstName.Trim();
        var last = input.LastName.Trim();
        if (first.Length >= 2) person.FirstName = first;
        if (last.Length >= 2) person.LastName = last;

        if (!string.IsNullOrWhiteSpace(input.Gender))
            person.Gender = input.Gender.Trim();
        if (input.FatherName is not null)
            person.FatherName = string.IsNullOrWhiteSpace(input.FatherName) ? null : input.FatherName.Trim();
        person.BirthDate ??= input.BirthDate;
        person.UpdatedAt = DateTime.UtcNow;
    }

    public static void ApplyDemographicsToPerson(
        Person person,
        string? firstName,
        string? lastName,
        DateOnly? birthDate,
        bool clearBirthDate,
        string? gender,
        bool allowGender,
        string? fatherName = null)
    {
        if (firstName is not null)
        {
            var fn = firstName.Trim();
            if (fn.Length >= 2) person.FirstName = fn;
        }
        if (lastName is not null)
        {
            var ln = lastName.Trim();
            if (ln.Length >= 2) person.LastName = ln;
        }
        if (fatherName is not null)
            person.FatherName = string.IsNullOrWhiteSpace(fatherName) ? null : fatherName.Trim();
        if (clearBirthDate) person.BirthDate = null;
        else if (birthDate is not null) person.BirthDate = birthDate;
        if (allowGender && gender is not null)
        {
            var g = gender.Trim();
            if (g is "مرد" or "زن") person.Gender = g;
        }
        person.UpdatedAt = DateTime.UtcNow;
    }

    public static IdentityInput FromPerson(Person person) => new(
        person.Mobile,
        person.NationalId,
        person.FirstName,
        person.LastName,
        person.Gender,
        person.BirthDate,
        person.FatherName);
}