/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm12_14_MonitorAndResetTests.cs
 Description: مانیتور قیف؛ پیشرفت پرسشنامه روی عضو؛ ریست دمو فقط فرانت
 Parent Dependencies: ServiceHarness
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Enums;
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
        Assert.Equal(0, funnel.FormDraft);
        Assert.Equal(0, funnel.FormSubmitted);
    }

    /// <summary>draft پرسشنامه → Abandoned + FormDraft؛ submit کامل → Completed + FormSubmitted.</summary>
    [Fact]
    [Trait("UC", "UC-ADM-12")]
    public async Task UC_ADM_12_FormDraftThenSubmit_UpdatesMemberProgressAndFunnel()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (patient, owner) = h.SeedPatient(clinicId, phone: "09120002111");
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد پیشرفت", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest(
                patient.Person.FirstName, patient.Person.LastName,
                patient.Person.NationalId!, patient.Person.Mobile,
                patient.Person.BirthDate ?? new DateOnly(1996, 1, 1),
                patient.Person.Gender ?? "مرد", null, null, null, null)
        ]);

        var member = h.Store.Members.Single(m => m.ContractId == created.Id);
        Assert.Equal(patient.Id, member.LinkedPatientId);
        Assert.Equal(member.Id, patient.LinkedContractMemberId);
        member.OnboardingStage = OnboardingStage.LoggedIn;

        var (formId, _, itemCode) = h.SeedPublishedForm(clinicId);
        var forms = h.CreateFormService();

        await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Draft,
            [new FormAnswerInput(itemCode, null, "پاسخ پیش‌نویس", null, false)], owner.Id);

        Assert.Equal(OnboardingStage.Abandoned, member.OnboardingStage);
        Assert.True(member.ProfileProgressPct > 0);

        var funnelDraft = await contracts.GetFunnelStatsAsync(created.Id);
        Assert.Equal(1, funnelDraft.FormDraft);
        Assert.Equal(0, funnelDraft.FormSubmitted);

        var listed = await contracts.ListMembersAsync(created.Id);
        Assert.Equal("Draft", listed[0].FormStatus);
        Assert.False(listed[0].IntakeCompleted);

        await forms.SaveResponseAsync(
            patient.Id, formId, FormResponseStatus.Submitted,
            [new FormAnswerInput(itemCode, null, "پاسخ نهایی", null, false)], owner.Id);

        Assert.Equal(OnboardingStage.Completed, member.OnboardingStage);
        Assert.Equal(100, member.ProfileProgressPct);
        Assert.NotNull(member.ProfileCompletedAt);

        var funnelDone = await contracts.GetFunnelStatsAsync(created.Id);
        Assert.Equal(0, funnelDone.FormDraft);
        Assert.Equal(1, funnelDone.FormSubmitted);
        listed = await contracts.ListMembersAsync(created.Id);
        Assert.Equal("Submitted", listed[0].FormStatus);
        Assert.True(listed[0].IntakeCompleted);
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
