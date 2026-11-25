/*
 File: frontend/my/src/lib/person-identity.ts
 Description: نام نمایشی، سن از تولد، اعتبارسنجی/نرمال کدملی و موبایل (+98→09)، clamp ورودی
 Parent Dependencies: persian, date-iso
 */

import { gregorianIsoToJalaliDate, jalaliFieldsToGregorianIso } from "@/lib/date-iso";
import { toLatinDigits } from "@/lib/persian";

export function displayFullName(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  if (!first) return last;
  if (!last) return first;
  return `${first} ${last}`;
}

export function ageFromBirthIso(birthIso?: string | null, asOf = new Date()): number | null {
  if (!birthIso || !/^\d{4}-\d{2}-\d{2}$/.test(birthIso)) return null;
  const [y, m, d] = birthIso.split("-").map(Number);
  let age = asOf.getFullYear() - y;
  const beforeBirthday =
    asOf.getMonth() + 1 < m || (asOf.getMonth() + 1 === m && asOf.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age < 0 || age > 120 ? null : age;
}

export function digitsOnly(raw?: string | null): string {
  return toLatinDigits(raw ?? "").replace(/\D/g, "");
}

/** نماد علمی اکسل (مثل 1.23E+9) برای کدملی/موبایل قابل ترمیم نیست. */
export function looksLikeScientificNotation(raw?: string | null): boolean {
  return /[eE]/.test(String(raw ?? "").trim());
}

function checksumIranNationalId(nid: string): boolean {
  if (nid.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(nid)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(nid[i]) * (10 - i);
  const rem = sum % 11;
  const check = Number(nid[9]);
  return rem < 2 ? check === rem : check === 11 - rem;
}

/** ترمیم صفر پیشوند برای اکسل/CSV؛ بیش از ۱۰ رقم → ۱۰ رقم آخر. */
export function normalizeNationalIdForImport(raw?: string | null): string {
  if (looksLikeScientificNotation(raw)) return "";
  const d = digitsOnly(raw);
  if (!d) return "";
  if (d.length > 10) return d.slice(-10);
  return d.padStart(10, "0");
}

export function normalizeNationalId(raw?: string | null): string {
  return normalizeNationalIdForImport(raw);
}

/** اعتبارسنجی پس از ترمیم import (یا مقدار از قبل نرمال). */
export function isValidIranNationalId(raw?: string | null): boolean {
  if (looksLikeScientificNotation(raw)) return false;
  return checksumIranNationalId(normalizeNationalIdForImport(raw));
}

/** ثبت دستی: بدون pad مخفی — دقیقاً ۱۰ رقم + checksum. */
export function isExactIranNationalId(raw?: string | null): boolean {
  if (looksLikeScientificNotation(raw)) return false;
  const d = digitsOnly(raw);
  return d.length === 10 && checksumIranNationalId(d);
}

export function exactNationalIdDigits(raw?: string | null): string {
  return digitsOnly(raw);
}

/** ترمیم موبایل: +98 / 0098 / 98… / ۹xxxxxxxxx → 09… */
export function normalizeMobileForImport(raw?: string | null): string {
  if (looksLikeScientificNotation(raw)) return "";
  let d = digitsOnly(raw);
  // پیشوند کشور قبل از cap تا ۱۱ رقم آخر اشتباه نشود (۸۹۱۲…)
  if (d.startsWith("0098")) d = `0${d.slice(4)}`;
  else if (d.startsWith("98") && d.length >= 12) d = `0${d.slice(2)}`;
  else if (d.length === 10 && d.startsWith("9")) d = `0${d}`;
  if (d.length > 11) d = d.slice(-11);
  return d;
}

export function normalizeMobile(raw?: string | null): string {
  return normalizeMobileForImport(raw);
}

export function isValidIranMobile(raw?: string | null): boolean {
  if (looksLikeScientificNotation(raw)) return false;
  const phone = normalizeMobileForImport(raw);
  return phone.length === 11 && phone.startsWith("09");
}

/** ثبت دستی: بدون اختراع صفر — دقیقاً ۱۱ رقم و شروع با ۰۹. */
export function isExactIranMobile(raw?: string | null): boolean {
  if (looksLikeScientificNotation(raw)) return false;
  const d = digitsOnly(raw);
  return d.length === 11 && d.startsWith("09");
}

export function exactMobileDigits(raw?: string | null): string {
  return digitsOnly(raw);
}

/** محدودیت تایپ کدملی: فقط رقم، حداکثر ۱۰. */
export function clampNationalIdInput(raw: string): string {
  return digitsOnly(raw).slice(0, 10);
}

/**
 * محدودیت تایپ موبایل: رقم + نرمال کشور وقتی کامل شد؛
 * بافر موقت ۱۲ رقم برای تایپ/پیست ۹۸… قبل از تبدیل به ۰۹.
 */
export function clampMobileInput(raw: string): string {
  let d = digitsOnly(raw);
  if (d.startsWith("0098")) d = `0${d.slice(4)}`;
  else if (d.startsWith("98") && d.length >= 12) d = `0${d.slice(2)}`;
  // هنوز در حال تایپ پیشوند ۹۸ — تا ۱۲ رقم نگه دار تا نرمال شود
  if (d.startsWith("98")) return d.slice(0, 12);
  return d.slice(0, 11);
}

/** کد پستی ایران: فقط رقم، حداکثر ۱۰. */
export function clampPostalInput(raw: string): string {
  return digitsOnly(raw).slice(0, 10);
}

export type IranDigitKind = "mobile" | "nationalId" | "postal";

export function clampIranDigitInput(kind: IranDigitKind, raw: string): string {
  if (kind === "mobile") return clampMobileInput(raw);
  if (kind === "nationalId") return clampNationalIdInput(raw);
  return clampPostalInput(raw);
}

export function iranDigitMaxLength(kind: IranDigitKind): number {
  // موبایل: بافر پیست +۹۸ قبل از sanitize در onPaste
  if (kind === "mobile") return 14;
  return 10;
}

const MIN_JY = 1270;
const MAX_JY = 1410;

function isJalaliYear(n: number) {
  return n >= MIN_JY && n <= MAX_JY;
}

/** پارس تاریخ تولد شمسی آزاد؛ خروجی ISO میلادی yyyy-MM-dd */
export function parseShamsiBirthToIso(raw?: string | null): { ok: true; iso: string } | { ok: false; reason: string } {
  const text = toLatinDigits(raw ?? "").trim();
  if (!text) return { ok: false, reason: "تاریخ تولد خالی است." };
  const parts = text.split(/[/\-. .\u066B\u060C،]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 3) return { ok: false, reason: "تاریخ تولد باید سه جزء داشته باشد." };
  const nums = parts.map((p) => Number(p.replace(/\D/g, "")));
  if (nums.some((n) => !Number.isFinite(n))) return { ok: false, reason: "تاریخ تولد عددی نیست." };
  const [a, b, c] = nums;
  let jy = 0;
  let jm = 0;
  let jd = 0;
  if (isJalaliYear(a)) {
    jy = a;
    if (b >= 1 && b <= 12 && c >= 1 && c <= 31) {
      jm = b;
      jd = c;
    } else if (c >= 1 && c <= 12 && b >= 1 && b <= 31) {
      jm = c;
      jd = b;
    } else return { ok: false, reason: "ماه/روز تاریخ تولد قابل تشخیص نیست." };
  } else if (isJalaliYear(c)) {
    jy = c;
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      jm = a;
      jd = b;
    } else if (b >= 1 && b <= 12 && a >= 1 && a <= 31) {
      jm = b;
      jd = a;
    } else return { ok: false, reason: "ماه/روز تاریخ تولد قابل تشخیص نیست." };
  } else if (isJalaliYear(b)) {
    jy = b;
    if (a >= 1 && a <= 12 && c >= 1 && c <= 31) {
      jm = a;
      jd = c;
    } else if (c >= 1 && c <= 12 && a >= 1 && a <= 31) {
      jm = c;
      jd = a;
    } else return { ok: false, reason: "ماه/روز تاریخ تولد قابل تشخیص نیست." };
  } else {
    return { ok: false, reason: "سال شمسی ۴رقمی در تاریخ تولد یافت نشد." };
  }
  const iso = jalaliFieldsToGregorianIso({ year: jy, month: jm, day: jd });
  if (!iso) return { ok: false, reason: "تاریخ تولد شمسی نامعتبر است." };
  const age = ageFromBirthIso(iso);
  if (age === null) return { ok: false, reason: "تاریخ تولد خارج از بازهٔ منطقی است." };
  return { ok: true, iso };
}

export function birthIsoToFaLabel(iso?: string | null): string {
  if (!iso) return "—";
  const j = gregorianIsoToJalaliDate(iso);
  if (!j) return iso;
  return `${j.year}/${String(j.month).padStart(2, "0")}/${String(j.day).padStart(2, "0")}`;
}
