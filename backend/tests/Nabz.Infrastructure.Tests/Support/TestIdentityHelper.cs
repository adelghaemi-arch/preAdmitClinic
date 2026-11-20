/*
 File: backend/tests/Nabz.Infrastructure.Tests/Support/TestIdentityHelper.cs
 Description: ساخت Person/User/Patient/Member برای تست‌ها — هویت فقط روی Person
 Parent Dependencies: Nabz.Domain.Entities, InMemoryStore
 */

using Nabz.Domain.Entities;
using Nabz.Infrastructure.Tests.Fakes;

namespace Nabz.Infrastructure.Tests.Support;

public static class TestIdentityHelper
{
    public static Person AddPerson(
        InMemoryStore store,
        string mobile,
        string? firstName = null,
        string? lastName = null,
        string? nationalId = null,
        DateOnly? birthDate = null,
        string? gender = null,
        Guid? id = null)
    {
        var person = new Person
        {
            Id = id ?? Guid.NewGuid(),
            Mobile = mobile,
            FirstName = firstName ?? "نام",
            LastName = lastName ?? "خانوادگی",
            NationalId = nationalId,
            BirthDate = birthDate,
            Gender = gender
        };
        store.Persons.Add(person);
        return person;
    }

    public static User AddUser(
        InMemoryStore store,
        Person person,
        bool isActive = true,
        Guid? id = null)
    {
        var user = new User
        {
            Id = id ?? Guid.NewGuid(),
            PersonId = person.Id,
            Person = person,
            IsActive = isActive
        };
        store.Users.Add(user);
        return user;
    }

    public static User AddUser(
        InMemoryStore store,
        string mobile,
        string? firstName = null,
        string? lastName = null,
        string? nationalId = null,
        bool isActive = true,
        Guid? id = null)
    {
        var person = AddPerson(store, mobile, firstName, lastName, nationalId);
        return AddUser(store, person, isActive, id);
    }

    public static Patient AddPatient(
        InMemoryStore store,
        Guid clinicId,
        Person person,
        Guid? ownerUserId = null,
        string? maritalStatus = null,
        Guid? id = null)
    {
        var patient = new Patient
        {
            Id = id ?? Guid.NewGuid(),
            ClinicId = clinicId,
            PersonId = person.Id,
            Person = person,
            OwnerUserId = ownerUserId,
            MaritalStatus = maritalStatus
        };
        store.Patients.Add(patient);
        return patient;
    }

    public static ContractMember AddMember(
        InMemoryStore store,
        Guid contractId,
        Person person,
        string? inviteToken = null)
    {
        var member = new ContractMember
        {
            ContractId = contractId,
            PersonId = person.Id,
            Person = person,
            InviteToken = inviteToken ?? Guid.NewGuid().ToString("N"),
            IntroducedMobile = person.Mobile
        };
        store.Members.Add(member);
        return member;
    }

    public static ContractSupervisor AddSupervisor(
        InMemoryStore store,
        Guid contractId,
        Person person,
        bool isActive = true)
    {
        var sup = new ContractSupervisor
        {
            ContractId = contractId,
            PersonId = person.Id,
            Person = person,
            IsActive = isActive
        };
        store.Supervisors.Add(sup);
        return sup;
    }

    public static Person? FindPersonByMobile(InMemoryStore store, string mobile)
        => store.Persons.FirstOrDefault(p => p.Mobile == mobile);

    public static Person? FindPersonByNationalId(InMemoryStore store, string nationalId)
        => store.Persons.FirstOrDefault(p => p.NationalId == nationalId);

    /// <summary>بیمار فقط برای FormAudienceEvaluator — Person در navigation بدون persist اجباری.</summary>
    public static Patient EvalPatient(DateOnly? birth, string? gender, string? marital = null)
    {
        var person = new Person { BirthDate = birth, Gender = gender };
        return new Patient { Person = person, PersonId = person.Id, MaritalStatus = marital };
    }
}