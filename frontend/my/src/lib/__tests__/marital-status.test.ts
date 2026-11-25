/*
 File: frontend/src/lib/__tests__/marital-status.test.ts
 Description: نرمال‌سازی گزینه‌های تأهل هم‌تراز کاتالوگ
 Parent Dependencies: marital-status.ts, form-engine.ts
 */

import { describe, expect, it } from "vitest";
import { buildContext } from "@/lib/form-engine";
import { MARITAL_STATUS_OPTIONS, normalizeMaritalStatus } from "@/lib/marital-status";
import type { FormDefinition } from "@/types/clinic";

describe("normalizeMaritalStatus", () => {
  it("keeps catalog options", () => {
    for (const o of MARITAL_STATUS_OPTIONS) {
      expect(normalizeMaritalStatus(o)).toBe(o);
    }
  });

  it("maps legacy مطلقه/بیوه to ازدواج‌کرده", () => {
    expect(normalizeMaritalStatus("مطلقه")).toBe("ازدواج‌کرده");
    expect(normalizeMaritalStatus("بیوه")).toBe("ازدواج‌کرده");
  });

  it("normalizes common spellings", () => {
    expect(normalizeMaritalStatus("متاهل")).toBe("متأهل");
    expect(normalizeMaritalStatus("ازدواج کرده")).toBe("ازدواج‌کرده");
  });

  it("returns null for unknown", () => {
    expect(normalizeMaritalStatus("نامعلوم")).toBeNull();
    expect(normalizeMaritalStatus("")).toBeNull();
    expect(normalizeMaritalStatus(null)).toBeNull();
  });
});

describe("buildContext marital fallback", () => {
  it("uses normalized patient marital when form answer empty", () => {
    const form = {
      items: [
        {
          code: "CA_F_BASE_maritalStatus",
          selectOptions: [...MARITAL_STATUS_OPTIONS],
        },
      ],
    } as FormDefinition;
    const ctx = buildContext({ gender: "زن", age: 30, maritalStatus: "مطلقه", birthDate: null }, [], form);
    expect(ctx.maritalStatus).toBe("ازدواج‌کرده");
  });
});
