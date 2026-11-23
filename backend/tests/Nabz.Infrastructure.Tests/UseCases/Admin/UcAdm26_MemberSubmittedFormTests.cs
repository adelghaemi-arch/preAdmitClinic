/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm26_MemberSubmittedFormTests.cs
 Description: UC-ADM-26 — پاسخ submitted پرسشنامه عضو قرارداد برای PDF قیف
 Parent Dependencies: ServiceHarness
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm26_MemberSubmittedFormTests
{
    [Fact]
    [Trait("UC", "UC-ADM-26")]
    public async Task UC_ADM_26_HappyPath_ReturnsSubmittedAnswers()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var patients = h.CreatePatientService();
        var (formId, _, itemCode) = h.SeedPublishedForm(clinicId);

        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد PDF", "سازمان عدل", "C-PDF"));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("علی", "رضایی", "0123456789", "09121112233", new DateOnly(1990, 5, 1), "مرد", null, null, null, null)
        ]);
        var memberId = h.Store.Members[0].Id;
        var patient = await patients.AdmitContractMemberAsync(memberId);

        var response = new FormResponse
        {
            PatientId = patient.Id,
            FormId = formId,
            FormCode = "INTAKE-01",
            Status = FormResponseStatus.Submitted,
            SubmittedAt = DateTime.UtcNow
        };
        h.Store.Responses.Add(response);
        h.Store.FormAnswers.Add(new FormAnswer
        {
            ResponseId = response.Id,
            ItemCode = itemCode,
            ValueRaw = "بله",
            ValueCode = "yes"
        });

        var dto = await contracts.GetMemberSubmittedFormAsync(created.Id, memberId);

        Assert.NotNull(dto);
        Assert.Equal(memberId, dto!.MemberId);
        Assert.Equal(patient.Id, dto.PatientId);
        Assert.Equal(formId, dto.FormId);
        Assert.Equal("سازمان عدل", dto.OrganizationName);
        Assert.Contains("علی", dto.FullName);
        Assert.Single(dto.Answers);
        Assert.Equal(itemCode, dto.Answers[0].ItemCode);
    }

    [Fact]
    [Trait("UC", "UC-ADM-26")]
    public async Task UC_ADM_26_1x_UnknownMember_ReturnsNull()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));

        var dto = await contracts.GetMemberSubmittedFormAsync(created.Id, Guid.NewGuid());

        Assert.Null(dto);
    }

    [Fact]
    [Trait("UC", "UC-ADM-26")]
    public async Task UC_ADM_26_2x_NoLinkedPatient_Throws()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        h.SeedPublishedForm(clinicId);
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "بدون‌پذیرش", "0076543218", "09123334455", new DateOnly(1992, 1, 1), "زن", null, null, null, null)
        ]);
        var memberId = h.Store.Members[0].Id;

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            contracts.GetMemberSubmittedFormAsync(created.Id, memberId));

        Assert.Contains("لینک", ex.Message);
    }

    [Fact]
    [Trait("UC", "UC-ADM-26")]
    public async Task UC_ADM_26_3x_DraftOnly_ReturnsNull()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var patients = h.CreatePatientService();
        var (formId, _, itemCode) = h.SeedPublishedForm(clinicId);
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "پیش‌نویس", "0499370899", "09124445566", new DateOnly(1988, 3, 3), "مرد", null, null, null, null)
        ]);
        var memberId = h.Store.Members[0].Id;
        var patient = await patients.AdmitContractMemberAsync(memberId);

        var response = new FormResponse
        {
            PatientId = patient.Id,
            FormId = formId,
            FormCode = "INTAKE-01",
            Status = FormResponseStatus.Draft
        };
        h.Store.Responses.Add(response);
        h.Store.FormAnswers.Add(new FormAnswer
        {
            ResponseId = response.Id,
            ItemCode = itemCode,
            ValueRaw = "نیمه‌کاره"
        });

        var dto = await contracts.GetMemberSubmittedFormAsync(created.Id, memberId);

        Assert.Null(dto);
    }
}
