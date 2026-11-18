import { iranLocalDayOffset, isIsoDay } from "@/lib/date-iso";

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const DIGIT_MAP = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";

export function toFaDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

/** Persian (۰-۹) and Arabic-Indic (٠-٩) digits → ASCII 0-9. */
export function toLatinDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[۰-۹٠-٩]/g, (d) => String(DIGIT_MAP.indexOf(d) % 10));
}

/** Arabic Yeh/Kaf → Persian Yeh/Kaf (no case folding). */
export function normalizePersianLetters(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/ي/g, "ی").replace(/ك/g, "ک");
}

/**
 * Typed/pasted field normalization for storage and logic:
 * Arabic letters → Persian, all digit scripts → Latin ASCII.
 */
export function normalizePersianInput(value: string | number | null | undefined): string {
  return toLatinDigits(normalizePersianLetters(value));
}

/**
 * Format a Gregorian YYYY-MM-DD civil date as a Persian (Jalali) label.
 * Input is an Iran-local calendar day string — not a UTC timestamp.
 */
export function formatFaDate(isoDate: string | null | undefined): string {
  if (!isoDate || !isIsoDay(isoDate)) return isoDate?.trim() || "—";
  // Noon + Asia/Tehran keeps the civil day stable while Intl renders Jalali.
  const parsed = new Date(`${isoDate}T12:00:00+03:30`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tehran",
  }).format(parsed);
}

/** Relative Persian label for contract scheduling (امروز / فردا / …). */
export function formatFaDateRelative(isoDate: string): string {
  if (!isIsoDay(isoDate)) return isoDate;
  const today = iranLocalDayOffset(0);
  const tomorrow = iranLocalDayOffset(1);
  const dayAfter = iranLocalDayOffset(2);
  const formatted = formatFaDate(isoDate);
  if (isoDate === today) return `امروز (${formatted})`;
  if (isoDate === tomorrow) return `فردا (${formatted})`;
  if (isoDate === dayAfter) return `پس‌فردا (${formatted})`;
  return formatted;
}

export function formatFaTime(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return "—";
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return toFaDigits(`${hh}:${mm}`);
}

export function createMedicineBoxSvgDataUrl(title: string, dose: string, color = "#0284C7"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="170" viewBox="0 0 320 170">
    <rect width="320" height="170" rx="16" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
    <rect x="16" y="16" width="288" height="36" rx="8" fill="${color}"/>
    <text x="160" y="40" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="14" font-weight="bold">داروخانه کلینیک — اسکن جعبه دارو</text>
    <rect x="20" y="66" width="280" height="84" rx="10" fill="#FFFFFF" stroke="#E2E8F0"/>
    <text x="160" y="100" text-anchor="middle" fill="#0F172A" font-family="sans-serif" font-size="17" font-weight="bold">${title}</text>
    <text x="160" y="128" text-anchor="middle" fill="#0369A1" font-family="sans-serif" font-size="14">${dose}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createEcgWaveformSvgDataUrl(patientName: string, hrBpm = "76", note = "Normal Sinus Rhythm"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="240" viewBox="0 0 760 240">
    <defs>
      <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#FECDD3" stroke-width="0.6"/>
      </pattern>
      <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
        <rect width="50" height="50" fill="url(#smallGrid)"/>
        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#FDA4AF" stroke-width="1.2"/>
      </pattern>
    </defs>
    <rect width="760" height="240" rx="12" fill="#FFF1F2"/>
    <rect width="760" height="240" rx="12" fill="url(#grid)"/>
    <rect x="12" y="10" width="736" height="30" rx="6" fill="#FFFFFF" fill-opacity="0.92"/>
    <text x="24" y="30" fill="#0F172A" font-family="monospace" font-size="13" font-weight="bold">12-LEAD ECG | HR: ${hrBpm} bpm | 25mm/s 10mm/mV | ${note}</text>
    <text x="734" y="30" text-anchor="end" fill="#334155" font-family="sans-serif" font-size="13" font-weight="bold">${patientName}</text>
    <path d="M 15 145 L 55 145 Q 65 133 75 145 L 88 145 L 94 156 L 102 72 L 110 175 L 118 145 L 138 145 Q 154 122 170 145 L 215 145 Q 225 133 235 145 L 248 145 L 254 156 L 262 68 L 270 176 L 278 145 L 298 145 Q 314 122 330 145 L 375 145 Q 385 133 395 145 L 408 145 L 414 156 L 422 74 L 430 174 L 438 145 L 458 145 Q 474 122 490 145 L 535 145 Q 545 133 555 145 L 568 145 L 574 156 L 582 70 L 590 176 L 598 145 L 618 145 Q 634 122 650 145 L 700 145 Q 710 133 720 145 L 745 145"
      fill="none" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="24" y="222" fill="#be123c" font-family="monospace" font-size="11">Lead II Rhythm Strip — PR: 162ms | QRS: 88ms | QTc: 412ms</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createChestXraySvgDataUrl(patientName: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="240" viewBox="0 0 520 240">
    <rect width="520" height="240" rx="12" fill="#0F172A"/>
    <rect x="14" y="14" width="492" height="212" rx="8" fill="#1E293B" stroke="#334155"/>
    <ellipse cx="210" cy="128" rx="48" ry="68" fill="#0F172A" stroke="#64748B" stroke-width="2"/>
    <ellipse cx="310" cy="128" rx="48" ry="68" fill="#0F172A" stroke="#64748B" stroke-width="2"/>
    <line x1="260" y1="46" x2="260" y2="195" stroke="#94A3B8" stroke-width="5"/>
    <path d="M 245 125 Q 285 110 292 155 Q 260 170 245 145 Z" fill="#475569" opacity="0.8"/>
    <text x="28" y="36" fill="#38BDF8" font-family="monospace" font-size="12">DIGITAL CHEST X-RAY (PA) | R/L MARKER</text>
    <text x="492" y="36" text-anchor="end" fill="#E2E8F0" font-family="sans-serif" font-size="13">${patientName}</text>
    <text x="28" y="212" fill="#94A3B8" font-family="monospace" font-size="11">Clear costophrenic angles. Normal cardiothoracic ratio (0.46).</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
