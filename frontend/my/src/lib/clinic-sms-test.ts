/*
 File: frontend/my/src/lib/clinic-sms-test.ts
 Description: گیت حالت‌های تست پیامک نسبت به درگاه تست انتخاب‌شده (UC-ADM-23)
 Parent Dependencies: api/clinics
 */

import type { ClinicSmsProvider } from "@/lib/api/clinics";

export type ClinicSmsTestMode = "AppTemplate" | "Direct" | "ProviderTemplate";

export type ClinicSmsTestTarget = "Touba" | "Kavenegar";

/** حالت‌های مجاز برای درگاه تست (فعال یا انتخاب‌شده برای تست قبل از فعال‌سازی). */
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

/**
 * وقتی درگاه فعال None است، تست با انتخاب Provider مجاز است.
 * hint فقط اگر target تست خالی/نامعتبر باشد.
 */
export function smsTestUnavailableHint(
  activeProvider: ClinicSmsProvider | string | null | undefined,
  testTarget?: ClinicSmsTestTarget | string | null
): string | null {
  const active = (activeProvider ?? "None") as string;
  if (active === "Touba" || active === "Kavenegar") return null;
  const t = (testTarget ?? "") as string;
  if (t === "Touba" || t === "Kavenegar") return null;
  return "برای تست، درگاه ارسال تست را انتخاب کنید (طوبی یا کاوه‌نگار). اعتبار را می‌توانید با درگاه فعال=غیرفعال ذخیره کنید.";
}

/** Provider ارسالی به API: اگر فعال است همان؛ وگرنه target تست. */
export function resolveSmsTestProviderParam(
  activeProvider: ClinicSmsProvider | string | null | undefined,
  testTarget: ClinicSmsTestTarget | string | null | undefined
): "Touba" | "Kavenegar" | undefined {
  const active = (activeProvider ?? "None") as string;
  if (active === "Touba" || active === "Kavenegar") return active;
  if (testTarget === "Touba" || testTarget === "Kavenegar") return testTarget;
  return undefined;
}
