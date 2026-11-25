/*
 File: frontend/my/src/lib/__tests__/uc-adm-24.contract-status.test.ts
 Description: UC-ADM-24 — فعال/غیرفعال قرارداد (mock) + فیلتر لیست کمبو
 Parent Dependencies: contract-actions, contract-list-sort, mock-store
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runContractAction } from "@/lib/contract-actions";
import {
  contractStatusBadgeLabel,
  filterContractsForPicker,
} from "@/lib/contract-list-sort";
import { mockStore } from "@/lib/mock-store";
import type { CorporateContract } from "@/types/clinic";

describe("UC-ADM-24", () => {
  let restoreStatus: CorporateContract["status"] | null = null;
  let targetId = 0;

  beforeEach(() => {
    expect(mockStore.contracts.length).toBeGreaterThan(0);
    const target = mockStore.contracts[0]!;
    targetId = target.id;
    restoreStatus = target.status;
    target.status = "active";
  });

  afterEach(() => {
    const target = mockStore.contracts.find((c) => c.id === targetId);
    if (target && restoreStatus) target.status = restoreStatus;
  });

  it("قرارداد Active را به Inactive می‌برد و دوباره Active می‌کند", () => {
    const target = mockStore.contracts.find((c) => c.id === targetId)!;

    const off = runContractAction(
      { action: "SET_CONTRACT_STATUS", contractId: target.id, isActive: false },
      "admin"
    );
    expect(off.ok).toBe(true);
    expect(target.status).toBe("inactive");

    const on = runContractAction(
      { action: "SET_CONTRACT_STATUS", contractId: target.id, isActive: true },
      "admin"
    );
    expect(on.ok).toBe(true);
    expect(target.status).toBe("active");
  });

  it("از Draft فعال می‌کند", () => {
    const target = mockStore.contracts.find((c) => c.id === targetId)!;
    target.status = "draft";
    const result = runContractAction(
      { action: "SET_CONTRACT_STATUS", contractId: target.id, isActive: true },
      "admin"
    );
    expect(result.ok).toBe(true);
    expect(target.status).toBe("active");
  });

  it("1x قرارداد ناموجود را 404 می‌دهد", () => {
    const result = runContractAction(
      { action: "SET_CONTRACT_STATUS", contractId: 999999, isActive: false },
      "admin"
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });

  it("2x غیرفعال روی Inactive را رد می‌کند", () => {
    const target = mockStore.contracts.find((c) => c.id === targetId)!;
    target.status = "inactive";
    const result = runContractAction(
      { action: "SET_CONTRACT_STATUS", contractId: target.id, isActive: false },
      "admin"
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it("فیلتر کمبو بدون تیک فقط Active را نگه می‌دارد", () => {
    const rows: CorporateContract[] = [
      { ...mockStore.contracts[0]!, id: 1, status: "active", code: "A" },
      { ...mockStore.contracts[0]!, id: 2, status: "inactive", code: "B" },
      { ...mockStore.contracts[0]!, id: 3, status: "draft", code: "C" },
      { ...mockStore.contracts[0]!, id: 4, status: "completed", code: "D" },
    ];
    expect(filterContractsForPicker(rows, false).map((c) => c.id)).toEqual([1]);
    expect(filterContractsForPicker(rows, true).map((c) => c.id)).toEqual([1, 2, 3, 4]);
  });

  it("برچسب وضعیت غیرفعال/پیش‌نویس را برمی‌گرداند", () => {
    expect(contractStatusBadgeLabel("active")).toBeNull();
    expect(contractStatusBadgeLabel("inactive")).toBe("غیرفعال");
    expect(contractStatusBadgeLabel("draft")).toBe("پیش‌نویس");
    expect(contractStatusBadgeLabel("completed")).toBe("پایان‌یافته");
  });
});
