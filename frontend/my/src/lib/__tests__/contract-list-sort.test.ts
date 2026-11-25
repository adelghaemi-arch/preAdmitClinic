/*
 File: frontend/src/lib/__tests__/contract-list-sort.test.ts
 Description: سورت کمبوی قرارداد — جدیدترین اول، DEMO-ORG آخر
 Parent Dependencies: contract-list-sort.ts
 */

import { describe, expect, it } from "vitest";
import { isSampleContract, sortContractsForPicker } from "@/lib/contract-list-sort";
import type { CorporateContract } from "@/types/clinic";

function stub(partial: Partial<CorporateContract> & Pick<CorporateContract, "id" | "code">): CorporateContract {
  return {
    id: partial.id,
    code: partial.code,
    title: partial.title ?? "عنوان",
    organizationName: partial.organizationName ?? "سازمان",
    status: "active",
    startDate: "2026-11-21",
    endDate: "2026-12-21",
    apiEndpoint: "",
    apiKey: "",
    lastApiSyncAt: null,
    defaultPathwayCode: "CORP_MEN_LT40",
    pathwayRules: [],
    dayQuotas: [],
    supervisor: {
      fullName: "",
      title: "",
      phone: "",
      nationalId: "",
      isActive: false,
      canSendReminders: true,
      assignedAt: "",
      lastSeenAt: null,
    },
    smsLogs: [],
    members: [],
    createdAt: partial.createdAt ?? "2026-11-21T10:00:00.000Z",
    ...partial,
  };
}

describe("contract-list-sort", () => {
  it("DEMO-ORG و سازمان نمونه را sample می‌شناسد", () => {
    expect(isSampleContract(stub({ id: 1, code: "DEMO-ORG" }))).toBe(true);
    expect(isSampleContract(stub({ id: 2, code: "C-1", organizationName: "سازمان نمونه" }))).toBe(true);
    expect(isSampleContract(stub({ id: 3, code: "C-20261121192306" }))).toBe(false);
  });

  it("جدیدترین را اول و نمونه را آخر می‌گذارد", () => {
    const sorted = sortContractsForPicker([
      stub({ id: 1, code: "DEMO-ORG", createdAt: "2026-01-01T00:00:00.000Z", organizationName: "سازمان نمونه" }),
      stub({ id: 2, code: "C-20261121190000", createdAt: "2026-11-21T19:00:00.000Z" }),
      stub({ id: 3, code: "C-20261121192306", createdAt: "2026-11-21T19:23:06.000Z" }),
    ]);
    expect(sorted.map((c) => c.id)).toEqual([3, 2, 1]);
  });
});
