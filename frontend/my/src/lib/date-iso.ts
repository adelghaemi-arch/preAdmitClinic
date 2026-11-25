/**
 * Calendar-day helpers for the Iranian product surface.
 *
 * Rule: the frontend only deals with Iran-local civil dates as Gregorian
 * `YYYY-MM-DD` strings (what the user picked in the Shamsi picker). These are
 * NOT UTC instants. If a real backend later needs UTC timestamps, it converts.
 */
import { addDays, fromGregorian, toGregorian, type CalendarDate, type CalendarDateFields } from "jalali-js";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(value: string | null | undefined): value is string {
  return typeof value === "string" && ISO_DAY.test(value);
}

/** Today's Iran-local civil date as Gregorian Y/M/D fields. */
export function iranLocalTodayFields(): CalendarDateFields {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

/** Iran-local today ± whole days → Gregorian YYYY-MM-DD (calendar string, not an instant). */
export function iranLocalDayOffset(daysFromToday = 0): string {
  const today = iranLocalTodayFields();
  const shifted = daysFromToday === 0 ? today : addDays(today, daysFromToday, "gregorian");
  return formatIsoDay(shifted);
}

/** @deprecated Use iranLocalDayOffset — same Iran-local calendar day semantics. */
export const tehranIsoDayOffset = iranLocalDayOffset;

export function parseIsoDay(iso: string): CalendarDateFields | null {
  if (!isIsoDay(iso)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

export function formatIsoDay(fields: CalendarDateFields): string {
  const y = String(fields.year).padStart(4, "0");
  const m = String(fields.month).padStart(2, "0");
  const d = String(fields.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Stored Gregorian YYYY-MM-DD → Jalali CalendarDate for picker seed. */
export function gregorianIsoToJalaliDate(iso: string): CalendarDate | null {
  const g = parseIsoDay(iso);
  if (!g) return null;
  const j = fromGregorian(g, "jalali");
  return { precision: "date", system: "jalali", year: j.year, month: j.month, day: j.day };
}

/** Jalali fields → Gregorian YYYY-MM-DD storage string. */
export function jalaliFieldsToGregorianIso(fields: CalendarDateFields): string {
  return formatIsoDay(toGregorian(fields, "jalali"));
}

export function storageValueToIsoDay(value: unknown): string {
  if (typeof value === "string" && isIsoDay(value.slice(0, 10))) return value.slice(0, 10);
  return "";
}
