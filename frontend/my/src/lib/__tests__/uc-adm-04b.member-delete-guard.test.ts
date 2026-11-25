/*
 File: frontend/my/src/lib/__tests__/uc-adm-04b.member-delete-guard.test.ts
 Description: UC-ADM-04b — گارد حذف عضو قبل از پیش‌پذیرش
 Parent Dependencies: contract-member-guards.ts
 */
import { describe, expect, it } from "vitest";
import { canDeleteContractMember } from "@/lib/contract-member-guards";

describe("UC-ADM-04b", () => {
  it("not_sent بدون فرم و بدون پذیرش قابل حذف است", () => {
    expect(
      canDeleteContractMember({ onboardingStage: "not_sent", formStatus: "none", linkedPatientId: null })
    ).toBe(true);
  });

  it("sms_sent هنوز قابل حذف است", () => {
    expect(
      canDeleteContractMember({ onboardingStage: "sms_sent", formStatus: "none", linkedPatientId: null })
    ).toBe(true);
  });

  it("2y پس از باز کردن لینک حذف ممنوع است", () => {
    expect(
      canDeleteContractMember({ onboardingStage: "link_opened", formStatus: "none", linkedPatientId: null })
    ).toBe(false);
  });

  it("2y با draft پرسشنامه حذف ممنوع است", () => {
    expect(
      canDeleteContractMember({ onboardingStage: "not_sent", formStatus: "draft", linkedPatientId: null })
    ).toBe(false);
  });

  it("2y پس از پذیرش (linkedPatientId) حذف ممنوع است", () => {
    expect(
      canDeleteContractMember({ onboardingStage: "not_sent", formStatus: "none", linkedPatientId: 12 })
    ).toBe(false);
  });
});
