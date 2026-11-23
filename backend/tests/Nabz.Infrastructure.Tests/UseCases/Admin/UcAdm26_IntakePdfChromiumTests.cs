/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm26_IntakePdfChromiumTests.cs
 Description: UC-ADM-26 — تولید PDF پرسشنامه با fake Chromium renderer
 Parent Dependencies: ServiceHarness, FakeBrowserPdfRenderer, IntakePdfHtmlBuilder
 */

using System.Text;
using Nabz.Application.Interfaces;
using Nabz.Application.Pdf;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm26_IntakePdfChromiumTests
{
    [Fact]
    [Trait("UC", "UC-ADM-26")]
    public async Task UC_ADM_26_Pdf_HappyPath_BuildsHtmlAndPdfBytes()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic("بیمارستان نور");
        var contracts = h.CreateContractService();
        var patients = h.CreatePatientService();
        var (formId, _, itemCode) = h.SeedPublishedForm(clinicId);

        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد PDF", "سازمان عدل", "C-PDF2"));
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

        var (svc, renderer) = h.CreateIntakePdfService();
        var file = await svc.GenerateMemberIntakePdfAsync(created.Id, memberId);

        Assert.Equal(1, renderer.CallCount);
        Assert.NotNull(renderer.LastHtml);
        Assert.Contains("بیمارستان نور", renderer.LastHtml!);
        Assert.Contains("گزارش پرسشنامه پیش‌پذیرش", renderer.LastHtml);
        Assert.DoesNotContain("همکار سازمانی", renderer.LastHtml);
        Assert.Contains("سازمان طرف‌قرارداد", renderer.LastHtml);
        Assert.StartsWith("%PDF", Encoding.ASCII.GetString(file.Content));
        Assert.Equal("application/pdf", file.ContentType);
        Assert.EndsWith(".pdf", file.FileName);
    }

    [Fact]
    [Trait("UC", "UC-ADM-26")]
    public void UC_ADM_26_HtmlBuilder_UsesHospitalNameAndFaDigits()
    {
        var html = IntakePdfHtmlBuilder.Build(new IntakePdfDocumentModel
        {
            HospitalLabel = "بیمارستان آریا",
            OrganizationName = "بانک نمونه",
            FullName = "سارا محمدی",
            NationalId = "0012345678",
            AgeLabel = "۳۶ سال",
            Gender = "زن",
            FormTitle = "پرسشنامه",
            FormCode = "F-1",
            SubmittedLabel = "۱۴۰۴/۰۱/۰۱",
            Sections =
            [
                new IntakePdfSectionModel
                {
                    Title = "سوابق",
                    FlagCount = 1,
                    Rows =
                    [
                        new IntakePdfRowModel
                        {
                            Label = "سابقه؟",
                            Value = "بله",
                            Notes = "توضیح",
                            IsRedFlag = true,
                            HasNotes = true
                        }
                    ]
                }
            ],
            TotalAnswers = 1,
            FlagTotal = 1
        });

        Assert.Contains("بیمارستان آریا", html);
        Assert.Contains("۰۰۱۲۳۴۵۶۷۸", html);
        Assert.Contains("intake-pdf-root", html);
        Assert.DoesNotContain("همکار سازمانی", html);
        Assert.Contains("@page{size:A4", html);
    }

    [Fact]
    [Trait("UC", "UC-ADM-26")]
    public async Task UC_ADM_26_Pdf_2x_NoLinkedPatient_Throws()
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
        var (svc, _) = h.CreateIntakePdfService();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.GenerateMemberIntakePdfAsync(created.Id, memberId));
    }
}
