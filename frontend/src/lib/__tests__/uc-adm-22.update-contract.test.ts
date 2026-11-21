/*
 File: frontend/src/lib/__tests__/uc-adm-22.update-contract.test.ts
 Description: UC-ADM-22 — ویرایش مشخصات پایه قرارداد (mock action)
 Parent Dependencies: contract-actions.ts, mock-store.ts
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runContractAction } from "@/lib/contract-actions";
import { mockStore } from "@/lib/mock-store";

describe("UC-ADM-22", () => {
  let restore: { title: string; organizationName: string; defaultPathwayCode: string } | null = null;

  beforeEach(() => {
    // seed قرارداد دمو باید حداقل یک ردیف داشته باشد
    expect(mockStore.contracts.length).toBeGreaterThan(0);
    const target = mockStore.contracts[0]!;
    restore = {
      title: target.title,
      organizationName: target.organizationName,
      defaultPathwayCode: target.defaultPathwayCode,
    };
  });

  afterEach(() => {
    if (!restore || !mockStore.contracts[0]) return;
    mockStore.contracts[0].title = restore.title;
    mockStore.contracts[0].organizationName = restore.organizationName;
    mockStore.contracts[0].defaultPathwayCode = restore.defaultPathwayCode;
  });

  it("عنوان و سازمان و بسته پایه را به‌روز می‌کند و Code را نگه می‌دارد", () => {
    const target = mockStore.contracts[0]!;
    const codeBefore = target.code;

    const result = runContractAction(
      {
        action: "UPDATE_CONTRACT",
        contractId: target.id,
        title: "عنوان ویرایش‌شده تست",
        organizationName: "سازمان ویرایش‌شده تست",
        defaultPathwayCode: "CARDIO_PULMO",
      },
      "admin"
    );

    expect(result.ok).toBe(true);
    expect(target.code).toBe(codeBefore);
    expect(target.title).toBe("عنوان ویرایش‌شده تست");
    expect(target.organizationName).toBe("سازمان ویرایش‌شده تست");
    expect(target.defaultPathwayCode).toBe("CARDIO_PULMO");
  });

  it("1x عنوان کوتاه را رد می‌کند", () => {
    const target = mockStore.contracts[0]!;
    const result = runContractAction(
      {
        action: "UPDATE_CONTRACT",
        contractId: target.id,
        title: "اب",
        organizationName: "سازمان معتبر",
      },
      "admin"
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it("2x قرارداد ناموجود را 404 می‌دهد", () => {
    const result = runContractAction(
      {
        action: "UPDATE_CONTRACT",
        contractId: 999999,
        title: "عنوان کافی برای تست",
        organizationName: "سازمان",
      },
      "admin"
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });
});
