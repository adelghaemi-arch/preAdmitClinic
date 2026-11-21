/*
 File: frontend/src/lib/clinic-sms-test.ts
 Description: گیت حالت‌های تست پیامک نسبت به درگاه ذخیره‌شده (UC-ADM-23)
 Parent Dependencies: api/clinics
 */

import type { ClinicSmsProvider } from "@/lib/api/clinics";

export type ClinicSmsTestMode = "AppTemplate" | "Direct" | "ProviderTemplate";

/** حالت‌های مجاز برای درگاه ذخیره‌شده روی سرور (نه فرم ذخیره‌نشده). */
export function allowedSmsTestModes(provider: ClinicSmsProvider | string | null | undefined): ClinicSmsTestMode[] {
  const p = (provider ?? "None") as string;
  if (p === "Touba") return ["AppTemplate", "Direct"];
  if (p === "Kavenegar") return ["AppTemplate", "ProviderTemplate"];
  return [];
}

export function isSmsTestModeAllowed(
  provider: ClinicSmsProvider | string | null | undefined,
  mode: ClinicSmsTestMode
): boolean {
  return allowedSmsTestModes(provider).includes(mode);
}

export function smsTestModeLabel(mode: ClinicSmsTestMode): string {
  switch (mode) {
    case "AppTemplate":
      return "قالب آمادهٔ سامانه";
    case "Direct":
      return "پیامک مستقیم";
    case "ProviderTemplate":
      return "قالب سامانهٔ پیامکی (درگاه)";
  }
}

export function smsTestUnavailableHint(provider: ClinicSmsProvider | string | null | undefined): string | null {
  const p = (provider ?? "None") as string;
  if (p === "None" || !p) return "ابتدا درگاه را ذخیره کنید (کاوه‌نگار یا طوبی)، سپس تست بزنید.";
  return null;
}
