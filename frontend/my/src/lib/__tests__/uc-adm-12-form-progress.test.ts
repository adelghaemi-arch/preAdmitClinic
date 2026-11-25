/*
 File: frontend/my/src/lib/__tests__/uc-adm-12-form-progress.test.ts
 Description: UC-ADM-12 — نگاشت formStatus / progress عضو قرارداد از API
 Parent Dependencies: lib/api/contracts
 */

import { describe, expect, it } from "vitest";
import { mapApiMember, type ApiContractMemberDto } from "@/lib/api/contracts";

function baseMember(overrides: Partial<ApiContractMemberDto> = {}): ApiContractMemberDto {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    contractId: "22222222-2222-2222-2222-222222222222",
    fullName: "عضو تست",
    nationalId: "0012345679",
    phone: "09120000000",
    onboardingStage: "LoggedIn",
    inviteToken: "TOK",
    smsInviteCount: 1,
    ...overrides,
  };
}

describe("UC-ADM-12 form progress (UT-FE-ADM-12)", () => {
  it("بدون پیشرفت → formStatus none", () => {
    const m = mapApiMember(baseMember({ formStatus: "None", profileProgressPct: 0 }), 1);
    expect(m.formStatus).toBe("none");
    expect(m.intakeCompleted).toBe(false);
    expect(m.profileProgressPct).toBe(0);
  });

  it("Draft سرور → شروع پرسشنامه + درصد", () => {
    const m = mapApiMember(
      baseMember({
        onboardingStage: "Abandoned",
        formStatus: "Draft",
        profileProgressPct: 40,
        abandonedAtStep: "SEC-1",
      }),
      1
    );
    expect(m.formStatus).toBe("draft");
    expect(m.onboardingStage).toBe("abandoned");
    expect(m.profileProgressPct).toBe(40);
    expect(m.abandonedAtStep).toBe("SEC-1");
    expect(m.intakeCompleted).toBe(false);
  });

  it("Submitted سرور → تکمیل پرسشنامه", () => {
    const m = mapApiMember(
      baseMember({
        onboardingStage: "Completed",
        formStatus: "Submitted",
        profileProgressPct: 100,
        intakeCompleted: true,
        profileCompletedAt: "2026-11-21T10:00:00+03:30",
      }),
      1
    );
    expect(m.formStatus).toBe("submitted");
    expect(m.intakeCompleted).toBe(true);
    expect(m.profileProgressPct).toBe(100);
    expect(m.profileCompletedAt).toContain("2026");
  });

  it("تاریخ مراجعه رستر → نوبت دستی (pinned) در تب نوبت‌دهی", () => {
    const m = mapApiMember(baseMember({ scheduledVisitDate: "2026-11-21" }), 1);
    expect(m.scheduledVisitDate).toBe("2026-11-21");
    expect(m.appointmentStatus).toBe("pinned");
    expect(m.scheduledDate).toBe("2026-11-21");
    expect(m.scheduledLabel).toBeTruthy();
  });

  it("بدون تاریخ مراجعه → بدون نوبت", () => {
    const m = mapApiMember(baseMember({ scheduledVisitDate: null }), 1);
    expect(m.appointmentStatus).toBe("unscheduled");
    expect(m.scheduledDate).toBeNull();
  });
});
