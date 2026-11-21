/*
 File: frontend/src/lib/__tests__/uc-adm-23.sms-test-gates.test.ts
 Description: UC-ADM-23 — گیت حالت تست پیامک نسبت به درگاه ذخیره‌شده
 Parent Dependencies: clinic-sms-test.ts
 */

import { describe, expect, it } from "vitest";
import {
  allowedSmsTestModes,
  isSmsTestModeAllowed,
  smsTestUnavailableHint,
} from "@/lib/clinic-sms-test";

describe("UC-ADM-23", () => {
  it("طوبی فقط AppTemplate و Direct را مجاز می‌کند", () => {
    expect(allowedSmsTestModes("Touba")).toEqual(["AppTemplate", "Direct"]);
    expect(isSmsTestModeAllowed("Touba", "Direct")).toBe(true);
    expect(isSmsTestModeAllowed("Touba", "ProviderTemplate")).toBe(false);
  });

  it("کاوه‌نگار فقط AppTemplate و ProviderTemplate را مجاز می‌کند", () => {
    expect(allowedSmsTestModes("Kavenegar")).toEqual(["AppTemplate", "ProviderTemplate"]);
    expect(isSmsTestModeAllowed("Kavenegar", "ProviderTemplate")).toBe(true);
    expect(isSmsTestModeAllowed("Kavenegar", "Direct")).toBe(false);
  });

  it("1x — None هیچ حالتی ندارد و hint نشان می‌دهد", () => {
    expect(allowedSmsTestModes("None")).toEqual([]);
    expect(smsTestUnavailableHint("None")).toMatch(/درگاه/);
  });
});
