/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Owner/UcOwn13_PatientProfileTests.cs
 Description: UC-OWN-13 — ویرایش پروفایل Owner و ثبت سوابق از→به
 Parent Dependencies: ServiceHarness
 */

using Nabz.Application.Interfaces;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Owner;

[Trait("UC", "UC-OWN-13")]
public sealed class UcOwn13_PatientProfileTests
{
    [Fact]
    public async Task UpdateMyProfile_WritesRevisions_AndUpdatesFields()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId, phone: "09133751113");
        patient.Person.FirstName = "علی";
        patient.Person.LastName = "تستی";
        patient.MaritalStatus = "مجرد";

        var svc = h.CreatePatientService();
        var updated = await svc.UpdateMyProfileAsync(owner.Id, new UpdatePatientProfileRequest(
            FirstName: "سامان",
            LastName: "نوری",
            MaritalStatus: "متأهل",
            ApplyHome: true,
            HomeLat: 35.7,
            HomeLon: 51.4,
            HomeAddress: "تهران، خیابان تست",
            HomePlaque: "12",
            HomePostalCode: "1234567890"));

        Assert.Equal("سامان", updated.FirstName);
        Assert.Equal("نوری", updated.LastName);
        Assert.Equal("متأهل", updated.MaritalStatus);
        Assert.Equal("تهران، خیابان تست", updated.HomeAddress);
        Assert.Equal("1234567890", updated.HomePostalCode);

        var revs = await svc.ListProfileRevisionsAsync(patient.Id);
        Assert.Contains(revs, r => r.Field == "FirstName" && r.OldValue == "علی" && r.NewValue == "سامان");
        Assert.Contains(revs, r => r.Field == "HomePostalCode" && r.NewValue == "1234567890");
        Assert.All(revs, r => Assert.Equal("owner_profile", r.Source));
    }

    [Fact]
    public async Task UpdateMyProfile_NormalizesLegacyMarital_AndRejectsUnknown()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId, phone: "09133751115");
        patient.MaritalStatus = "مطلقه";

        var svc = h.CreatePatientService();
        var updated = await svc.UpdateMyProfileAsync(owner.Id, new UpdatePatientProfileRequest(
            MaritalStatus: "بیوه"));
        Assert.Equal("ازدواج‌کرده", updated.MaritalStatus);

        // Map باید مقدار قدیمی DB را هم نرمال برگرداند
        var mapped = await svc.UpdateMyProfileAsync(owner.Id, new UpdatePatientProfileRequest());
        Assert.Equal("ازدواج‌کرده", mapped.MaritalStatus);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.UpdateMyProfileAsync(owner.Id, new UpdatePatientProfileRequest(MaritalStatus: "نامعلوم")));
    }

    [Fact]
    public async Task UpdateHome_WritesCompanionMapRevisions()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId, phone: "09133751114");
        var svc = h.CreatePatientService();

        await svc.UpdateHomeAddressAsync(patient.Id, owner.Id, new UpdatePatientHomeAddressRequest(
            35.68, 51.38, "آدرس نقشه", "8", null, null));

        var revs = await svc.ListProfileRevisionsAsync(patient.Id);
        Assert.Contains(revs, r => r.Source == "companion_map" && r.Field == "HomeAddress");
    }

    [Fact]
    public async Task DismissJourneyIntro_PersistsOnPatient()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId, phone: "09133751116");
        Assert.False(patient.JourneyIntroSeen);

        var svc = h.CreatePatientService();
        var dto = await svc.DismissJourneyIntroAsync(owner.Id);
        Assert.True(dto.JourneyIntroSeen);
        Assert.True(patient.JourneyIntroSeen);

        // idempotent
        var again = await svc.DismissJourneyIntroAsync(owner.Id);
        Assert.True(again.JourneyIntroSeen);
    }

    [Fact]
    public async Task Map_TreatsIntakeCompleted_AsJourneyIntroSeen()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId, phone: "09133751117");
        patient.IntakeCompleted = true;
        patient.JourneyIntroSeen = false;

        var svc = h.CreatePatientService();
        var mine = await svc.GetForOwnerAsync(owner.Id);
        Assert.NotNull(mine);
        Assert.True(mine!.JourneyIntroSeen);
    }
}
