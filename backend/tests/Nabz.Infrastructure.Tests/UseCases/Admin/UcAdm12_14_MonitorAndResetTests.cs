/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm12_14_MonitorAndResetTests.cs
 Description: مانیتور قیف/پرونده ادمین؛ ریست دمو فقط فرانت است
 Parent Dependencies: ServiceHarness
 */

using Nabz.Application.Interfaces;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm12_14_MonitorAndResetTests
{
    [Fact]
    [Trait("UC", "UC-ADM-12")]
    public async Task UC_ADM_12_HappyPath_FunnelOverview()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد مانیتور", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو۱", "تست", "0499370899", "09120002001", new DateOnly(1996, 1, 1), "زن", null, null, null, null),
            new ImportMemberRequest("عضو۲", "تست", "0011223340", "09120002002", new DateOnly(1986, 1, 1), "مرد", null, null, null, null)
        ]);

        var funnel = await contracts.GetFunnelStatsAsync(created.Id);

        Assert.Equal(2, funnel.MemberCount);
    }

    [Fact]
    [Trait("UC", "UC-ADM-13")]
    public async Task UC_ADM_13_HappyPath_ViewPatientIntakeStatus()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, _) = h.SeedPatient(clinicId, phone: "09120003001");
        patient.IntakeCompleted = false;
        patient.Description = "شرح کوتاه ادمین";
        var patients = h.CreatePatientService();

        // ادمین وضعیت + شرح می‌بیند؛ نه متن پاسخ پزشکی
        var dto = await patients.GetIntakeStatusAsync(patient.Id);

        Assert.NotNull(dto);
        Assert.False(dto!.Patient.IntakeCompleted);
        Assert.Equal("شرح کوتاه ادمین", dto.Description);
    }

    [Fact]
    [Trait("UC", "UC-ADM-20")]
    public async Task UC_ADM_20_UpdatePatientPhone_SyncsOwnerAndMember()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId, phone: "09120003001");
        h.Store.SyncNavigation();
        var member = TestIdentityHelper.AddMember(h.Store, Guid.NewGuid(), patient.Person, inviteToken: "TOK20");
        patient.LinkedContractMemberId = member.Id;
        var patients = h.CreatePatientService();

        var updated = await patients.UpdatePhoneAsync(patient.Id, "09121112233");

        Assert.Equal("09121112233", updated.Phone);
        h.Store.SyncNavigation();
        Assert.Equal("09121112233", owner.Person.Mobile);
        Assert.Equal("09121112233", member.Person.Mobile);
    }

    /// <summary>
    /// UC-ADM-14 ریست دمو فقط در لایهٔ mock فرانت است؛ بک‌اند API ندارد.
    /// این Fact تضمین می‌کند سرویس‌های دامنه پس از seed پایدار می‌مانند (بدون wipe).
    /// </summary>
    [Fact]
    [Trait("UC", "UC-ADM-14")]
    public async Task UC_ADM_14_BackendHasNoWipe_ClinicPersists()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var current = await h.Clinics.GetCurrentAsync();
        Assert.NotNull(current);
        Assert.Equal(clinicId, current!.Id);
    }
}
