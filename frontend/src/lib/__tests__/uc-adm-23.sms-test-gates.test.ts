/*
 File: frontend/src/lib/__tests__/uc-adm-23.sms-test-gates.test.ts
 Description: UC-ADM-23 — گیت حالت تست پیامک و تست قبل از فعال‌سازی
 Parent Dependencies: clinic-sms-test.ts
 */

import { describe, expect, it } from "vitest";
import {
  allowedSmsTestModes,
  isSmsTestModeAllowed,
  resolveSmsTestProviderParam,
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

  it("None با انتخاب target تست مجاز است و hint ندارد", () => {
    expect(smsTestUnavailableHint("None", "Touba")).toBeNull();
    expect(smsTestUnavailableHint("None", "Kavenegar")).toBeNull();
    expect(resolveSmsTestProviderParam("None", "Touba")).toBe("Touba");
  });

  it("1x — None بدون target تست hint می‌دهد", () => {
    expect(allowedSmsTestModes("None")).toEqual([]);
    expect(smsTestUnavailableHint("None", null)).toMatch(/تست/);
    expect(resolveSmsTestProviderParam("None", null)).toBeUndefined();
  });
});
