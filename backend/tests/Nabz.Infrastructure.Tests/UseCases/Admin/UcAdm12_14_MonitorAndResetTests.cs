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
            new ImportMemberRequest("عضو۱", "1122334455", "09120002001", 30, "زن", null, null),
            new ImportMemberRequest("عضو۲", "2233445566", "09120002002", 40, "مرد", null, null)
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
        var patients = h.CreatePatientService();

        var dto = await patients.GetAsync(patient.Id);

        Assert.NotNull(dto);
        Assert.False(dto!.IntakeCompleted);
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
