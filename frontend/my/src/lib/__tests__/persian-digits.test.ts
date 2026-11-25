/*
 File: frontend/my/src/lib/__tests__/persian-digits.test.ts
 Description: واحد تبدیل ارقام فارسی↔لاتین و نرمال‌سازی ورودی
 Parent Dependencies: lib/persian.ts
 */
import { describe, expect, it } from "vitest";
import { normalizePersianInput, toFaDigits, toLatinDigits } from "@/lib/persian";

describe("persian digits", () => {
  it("toFaDigits converts ASCII digits to Persian", () => {
    expect(toFaDigits("09120000002")).toBe("۰۹۱۲۰۰۰۰۰۰۲");
    expect(toFaDigits(123)).toBe("۱۲۳");
  });

  it("toFaDigits leaves nullish as empty", () => {
    expect(toFaDigits(null)).toBe("");
    expect(toFaDigits(undefined)).toBe("");
  });

  it("toLatinDigits converts Persian and Arabic-Indic digits", () => {
    expect(toLatinDigits("۰۹۱۲۰۰۰۰۰۰۲")).toBe("09120000002");
    expect(toLatinDigits("٠١٢")).toBe("012");
  });

  it("normalizePersianInput stores Latin digits for API state", () => {
    expect(normalizePersianInput("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
  });
});
