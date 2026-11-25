/*
 File: frontend/src/lib/__tests__/uc-adm-12-dashboard.test.ts
 Description: UC-ADM-12 — KPI داشبورد ادمین و اولویت ناوبری dashboard
 Parent Dependencies: clinic-admin-dashboard, workspace
 */

import { describe, expect, it } from "vitest";
import {
  computeAdminClinicDashboardStats,
  isoDayFromApiTimestamp,
} from "@/lib/clinic-admin-dashboard";
import { ROLE_NAV } from "@/lib/workspace";
import type { ContractMember, CorporateContract } from "@/types/clinic";

function member(partial: Partial<ContractMember> & Pick<ContractMember, "id" | "fullName">): ContractMember {
  return {
    contractId: 1,
    inviteToken: "t",
    personnelCode: "",
    firstName: "",
    lastName: "",
    nationalId: "001",
    phone: "09120000000",
    birthDate: null,
    age: 30,
    gender: "مرد",
    department: "",
    jobCategory: "همه",
    source: "manual",
    assignedPathwayCode: "",
    assignedPathwayTitle: "",
    matchedPathwayTitle: "",
    manualPathwayOverride: false,
    onboardingStage: "not_sent",
    profileProgressPct: 0,
    abandonedAtStep: null,
    formStatus: "none",
    intakeCompleted: false,
    smsInviteCount: 0,
    lastSmsAt: null,
    linkOpenedAt: null,
    loggedInAt: null,
    lastActivityAt: null,
    profileCompletedAt: null,
    draftSymptoms: "",
    draftAllergies: "",
    draftMedications: "",
    appointmentStatus: "unscheduled",
    scheduledDate: null,
    scheduledLabel: null,
    callSentAt: null,
    linkedPatientId: null,
    ...partial,
  };
}

describe("UC-ADM-12", () => {
  it("خانه و ترتیب ناوبری: داشبورد سپس قرارداد", () => {
    expect(ROLE_NAV.admin.home).toBe("dashboard");
    expect(ROLE_NAV.admin.groups[0]?.pages[0]).toBe("dashboard");
    expect(ROLE_NAV.admin.groups[0]?.pages[1]).toBe("contracts");
    expect(ROLE_NAV.admin.labels?.contracts).toBe("قرارداد");
    expect(ROLE_NAV.admin.mobile?.[0]).toBe("dashboard");
    expect(ROLE_NAV.admin.mobile?.[1]).toBe("contracts");
    expect(ROLE_NAV.admin.groups.flatMap((g) => g.pages)).not.toContain("contract-funnel");
  });

  it("isoDayFromApiTimestamp روز ایران را از timestamp استخراج می‌کند", () => {
    expect(isoDayFromApiTimestamp("2026-11-21T22:03:00+03:30")).toBe("2026-11-21");
    expect(isoDayFromApiTimestamp("2026-11-21")).toBe("2026-11-21");
    expect(isoDayFromApiTimestamp(null)).toBeNull();
  });

  it("KPI قرارداد، اعضا، مراجعه/پیش‌پذیرش/تکمیل امروز را محاسبه می‌کند", () => {
    const today = "2026-11-21";
    const contracts = [
      { id: 1, memberCount: 10, members: [] },
      { id: 2, memberCount: 5, members: [] },
    ] as CorporateContract[];
    const members = [
      member({
        id: 1,
        fullName: "الف",
        scheduledVisitDate: today,
        formStatus: "draft",
      }),
      member({
        id: 2,
        fullName: "ب",
        scheduledVisitDate: today,
        intakeCompleted: true,
        formStatus: "submitted",
        onboardingStage: "completed",
        profileCompletedAt: `${today}T10:00:00+03:30`,
      }),
      member({
        id: 3,
        fullName: "ج",
        scheduledVisitDate: "2026-11-20",
        lastActivityAt: `${today}T09:00:00+03:30`,
        onboardingStage: "logged_in",
      }),
      member({
        id: 4,
        fullName: "د",
        scheduledVisitDate: "2026-11-22",
        formStatus: "none",
      }),
    ];

    const stats = computeAdminClinicDashboardStats(contracts, members, today);
    expect(stats.contractsCount).toBe(2);
    expect(stats.membersCount).toBe(15);
    expect(stats.visitsToday).toBe(2);
    expect(stats.completionsToday).toBe(1);
    expect(stats.preAdmitToday).toBe(2); // draft + activity today without complete
    expect(stats.pendingPreAdmit).toBe(3); // همه به‌جز تکمیل‌شده
  });
});
