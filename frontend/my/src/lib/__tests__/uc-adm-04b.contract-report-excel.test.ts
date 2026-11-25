/*
 File: frontend/my/src/lib/__tests__/uc-adm-04b.contract-report-excel.test.ts
 Description: UC-ADM-04b — خروجی گزارش .xlsx واقعی؛ تاریخ نوبت شمسی؛ کدملی/موبایل متن
 Parent Dependencies: mock-contracts, xlsx, person-identity
 */
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { ContractMember, CorporateContract } from "@/types/clinic";
import {
  buildContractReportExcelRows,
  buildContractReportExcelWorkbook,
  contractReportVisitJalali,
} from "@/lib/mock-contracts";
import { birthIsoToFaLabel } from "@/lib/person-identity";

function member(partial: Partial<ContractMember> = {}): ContractMember {
  return {
    id: 1,
    contractId: 1,
    inviteToken: "t",
    personnelCode: "P-1",
    firstName: "علی",
    lastName: "رضایی",
    fullName: "علی رضایی",
    nationalId: "0012345678",
    phone: "09121234567",
    birthDate: "1990-01-01",
    age: 35,
    gender: "مرد",
    maritalStatus: null,
    department: "مالی",
    jobCategory: "اداری",
    source: "manual",
    assignedPathwayCode: "CORP_MEN_LT40",
    assignedPathwayTitle: "چکاپ آقایان زیر ۴۰ سال",
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
    appointmentStatus: "pinned",
    scheduledDate: "2026-11-21",
    scheduledVisitDate: "2026-11-21",
    scheduledLabel: "امروز",
    callSentAt: null,
    linkedPatientId: null,
    ...partial,
  };
}

function contract(members: ContractMember[]): CorporateContract {
  return {
    id: 1,
    code: "C-TEST",
    title: "تست",
    organizationName: "سازمان",
    status: "active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    apiEndpoint: "",
    apiKey: "",
    lastApiSyncAt: null,
    defaultPathwayCode: "CORP_MEN_LT40",
    pathwayRules: [],
    dayQuotas: [],
    supervisor: {
      fullName: "ناظر",
      title: "ناظر سازمان",
      phone: "09120000000",
      nationalId: "0011111111",
      isActive: true,
      canSendReminders: true,
      assignedAt: "2026-01-01",
      lastSeenAt: null,
    },
    smsLogs: [],
    members,
    createdAt: "2026-01-01",
  };
}

describe("UC-ADM-04b contract report excel", () => {
  it("تاریخ نوبت را شمسی ثابت برمی‌گرداند نه برچسب نسبی", () => {
    const iso = "2026-11-21";
    expect(contractReportVisitJalali(member({ scheduledDate: iso, scheduledLabel: "امروز" }))).toBe(
      birthIsoToFaLabel(iso)
    );
    expect(contractReportVisitJalali(member({ scheduledDate: null, scheduledVisitDate: null }))).toBe(
      "نوبت‌دهی نشده"
    );
  });

  it("کدملی و موبایل در ردیف به‌صورت رشته با صفر اول می‌مانند", () => {
    const rows = buildContractReportExcelRows(
      contract([member({ nationalId: "0012345678", phone: "09121234567" })])
    );
    expect(rows[0]![2]).toBe("0012345678");
    expect(rows[0]![3]).toBe("09121234567");
    expect(rows[0]![11]).toBe(birthIsoToFaLabel("2026-11-21"));
  });

  it("workbook .xlsx سلول‌های کدملی/موبایل/تاریخ را متن (@) می‌نویسد", () => {
    const wb = buildContractReportExcelWorkbook(contract([member()]));
    expect(wb.SheetNames).toContain("گزارش");
    const ws = wb.Sheets["گزارش"]!;
    for (const c of [2, 3, 11]) {
      const cell = ws[XLSX.utils.encode_cell({ r: 1, c })];
      expect(cell).toBeTruthy();
      expect(cell!.t).toBe("s");
      expect(cell!.z).toBe("@");
      expect(typeof cell!.v).toBe("string");
    }
    expect(String(ws[XLSX.utils.encode_cell({ r: 1, c: 2 })]!.v)).toBe("0012345678");
    expect(String(ws[XLSX.utils.encode_cell({ r: 1, c: 3 })]!.v)).toBe("09121234567");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
    expect(Buffer.isBuffer(out) || out instanceof Uint8Array).toBe(true);
    expect(out.length).toBeGreaterThan(100);
    expect(out[0]).toBe(0x50); // P
    expect(out[1]).toBe(0x4b); // K
  });
});
