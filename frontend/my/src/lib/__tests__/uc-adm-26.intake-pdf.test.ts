/*
 File: frontend/src/lib/__tests__/uc-adm-26.intake-pdf.test.ts
 Description: UC-ADM-26 — گیت PDF قیف، برند دینامیک، HTML پیش‌نمایش بدون همکار سازمانی
 Parent Dependencies: intake-pdf, intake-pdf-render, api/contracts
 */

import { describe, expect, it } from "vitest";
import { mapApiMember, type ApiContractMemberDto } from "@/lib/api/contracts";
import {
  buildPatientForIntakePdf,
  canShowIntakePdfButton,
  type IntakePdfBrandInput,
} from "@/lib/intake-pdf";
import {
  buildIntakePdfHtml,
  buildIntakePdfModel,
  INTAKE_PDF_PAGE_MARGIN_MM,
  type IntakePdfModel,
} from "@/lib/intake-pdf-render";
import type { FormDefinition } from "@/types/clinic";

function baseMember(
  overrides: Partial<Parameters<typeof canShowIntakePdfButton>[0]> = {}
): Parameters<typeof canShowIntakePdfButton>[0] {
  return {
    formStatus: "none",
    onboardingStage: "not_sent",
    linkedPatientServerId: null,
    serverId: "11111111-1111-1111-1111-111111111111",
    ...overrides,
  };
}

const brand: IntakePdfBrandInput = {
  hospitalName: "بیمارستان نور",
  hospitalLogoUrl: "blob:hospital",
  partnerLogoUrl: "blob:partner",
  organizationName: "بانک نمونه",
};

describe("UC-ADM-26", () => {
  it("دکمه فقط برای submitted/completed با بیمار لینک‌شده دیده می‌شود", () => {
    expect(canShowIntakePdfButton(baseMember())).toBe(false);
    expect(
      canShowIntakePdfButton(
        baseMember({
          formStatus: "submitted",
          linkedPatientServerId: "22222222-2222-2222-2222-222222222222",
        })
      )
    ).toBe(true);
  });

  it("mapApiMember شناسه Guid بیمار را در linkedPatientServerId نگه می‌دارد", () => {
    const patientGuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const dto: ApiContractMemberDto = {
      id: "11111111-1111-1111-1111-111111111111",
      contractId: "99999999-9999-9999-9999-999999999999",
      fullName: "علی رضایی",
      nationalId: "0123456789",
      phone: "09121112233",
      onboardingStage: "Completed",
      inviteToken: "TOK",
      linkedPatientId: patientGuid,
      formStatus: "Submitted",
    };
    const mapped = mapApiMember(dto, 1);
    expect(mapped.linkedPatientServerId).toBe(patientGuid);
  });

  it("buildIntakePdfModel عنوان بیمارستان را از brand می‌گیرد", () => {
    const model = buildIntakePdfModel(
      {
        memberId: "m1",
        contractId: "c1",
        patientId: "33333333-3333-3333-3333-333333333333",
        formId: "44444444-4444-4444-4444-444444444444",
        formCode: "INTAKE-01",
        formTitle: "پرسشنامه پیش‌پذیرش",
        submittedAt: "2026-11-22T10:00:00Z",
        fullName: "علی رضایی",
        nationalId: "0123456789",
        age: 36,
        gender: "مرد",
        organizationName: "سازمان تست",
        answers: [],
      },
      [] as FormDefinition[],
      brand
    );
    expect(model.hospitalLabel).toBe("بیمارستان نور");
    expect(model.ageLabel).toContain("۳۶");
  });

  it("buildPatientForIntakePdf پاسخ submitted را می‌سازد", () => {
    const patient = buildPatientForIntakePdf({
      memberId: "m1",
      contractId: "c1",
      patientId: "33333333-3333-3333-3333-333333333333",
      formId: "44444444-4444-4444-4444-444444444444",
      formCode: "INTAKE-01",
      formTitle: "پرسشنامه پیش‌پذیرش",
      submittedAt: "2026-11-22T10:00:00Z",
      fullName: "علی رضایی",
      nationalId: "0123456789",
      age: 36,
      gender: "مرد",
      organizationName: "سازمان تست",
      answers: [{ itemCode: "Q1", valueCode: "yes", valueRaw: "بله", notes: "" }],
    });
    expect(patient.formResponses[0].status).toBe("submitted");
  });

  it("buildIntakePdfHtml بدون همکار سازمانی است", () => {
    const model: IntakePdfModel = {
      fullName: "علی رضایی",
      nationalId: "0123456789",
      ageLabel: "۳۶ سال",
      gender: "مرد",
      organizationName: "بانک توسعه تعاون",
      formTitle: "پرسشنامه پیش‌پذیرش",
      formCode: "INTAKE-01",
      submittedLabel: "۱۴۰۴/۰۹/۰۱ ۱۲:۰۰",
      hospitalLabel: "بیمارستان نور",
      hospitalLogoSrc: null,
      partnerLogoSrc: null,
      totalAnswers: 1,
      flagTotal: 0,
      sections: [],
    };
    const html = buildIntakePdfHtml(model);
    expect(html).toContain("بیمارستان نور");
    expect(html).toContain("سازمان طرف‌قرارداد");
    expect(html).not.toContain("همکار سازمانی");
    expect(html).toContain("۰۱۲۳۴۵۶۷۸۹");
    expect(INTAKE_PDF_PAGE_MARGIN_MM).toBe(12);
  });
});
