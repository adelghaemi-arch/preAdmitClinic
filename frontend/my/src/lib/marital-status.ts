/*
 File: frontend/src/lib/marital-status.ts
 Description: گزینه‌های کانونیکال وضعیت تأهل + نرمال‌سازی اکسل/legacy
 Parent Dependencies: persian.ts, form-catalog selectOptions
 */

import { normalizePersianLetters } from "@/lib/persian";

/** هم‌تراز با selectOptions فیلد BASE_maritalStatus در کاتالوگ فرم */
export const MARITAL_STATUS_OPTIONS = ["مجرد", "متأهل", "ازدواج‌کرده", "سایر"] as const;

export type MaritalStatusOption = (typeof MARITAL_STATUS_OPTIONS)[number];

const CANONICAL = new Set<string>(MARITAL_STATUS_OPTIONS);

/** مطلقه/بیوه در اکسل قدیمی → ازدواج‌کرده تا سوالات مشروط متأهل باز بمانند */
const LEGACY_TO_CANONICAL: Record<string, MaritalStatusOption> = {
  مطلقه: "ازدواج‌کرده",
  بیوه: "ازدواج‌کرده",
};

function collapseForCompare(s: string): string {
  // ZWNJ و فاصله را حذف می‌کنیم تا «ازدواج کرده» و «ازدواج‌کرده» یکی شوند
  return s.replace(/[\u200c\u200f\u200e\s]+/g, "").trim();
}

/**
 * مقدار خام تاهل را به یکی از ۴ گزینهٔ کاتالوگ می‌رساند؛ ناشناخته → null.
 */
export function normalizeMaritalStatus(raw: string | null | undefined): MaritalStatusOption | null {
  if (raw == null) return null;
  const s = normalizePersianLetters(String(raw)).trim();
  if (!s) return null;

  if (LEGACY_TO_CANONICAL[s]) return LEGACY_TO_CANONICAL[s];
  if (CANONICAL.has(s)) return s as MaritalStatusOption;

  const key = collapseForCompare(s);
  if (key === "متاهل" || key === "متأهل") return "متأهل";
  if (key === "ازدواجکرده") return "ازدواج‌کرده";
  if (key === "مجرد") return "مجرد";
  if (key === "سایر") return "سایر";
  if (key === "مطلقه" || key === "بیوه") return "ازدواج‌کرده";

  return null;
}
