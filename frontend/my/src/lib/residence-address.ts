/*
 File: frontend/src/lib/residence-address.ts
 Description: پارس و اعتبارسنجی JSON آدرس سکونت؛ draft بدون پلاک برای UI بعد از نقشه
 Parent Dependencies: none
 */

export interface ResidenceAddressValue {
  lat: number;
  lon: number;
  address: string;
  plaque: string;
  unit?: string;
  postalCode?: string;
}

const IRAN_POSTAL = /^\d{10}$/;

function readResidenceFields(raw: string): {
  lat: number;
  lon: number;
  address: string;
  plaque: string;
  unit?: string;
  postalCode?: string;
} | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ResidenceAddressValue> & {
      lat?: unknown;
      lon?: unknown;
    };
    // Number(null)===0 است؛ lat/lon تهی را مختصات معتبر نگیر
    if (parsed.lat == null || parsed.lon == null || parsed.lat === "" || parsed.lon === "") {
      return null;
    }
    const lat = Number(parsed.lat);
    const lon = Number(parsed.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return null;
    }
    const address = String(parsed.address ?? "").trim();
    const plaque = String(parsed.plaque ?? "").trim();
    const unit = String(parsed.unit ?? "").trim() || undefined;
    const postalRaw = String(parsed.postalCode ?? "").replace(/\D/g, "");
    const postalCode = postalRaw || undefined;
    return { lat, lon, address, plaque, unit, postalCode };
  } catch {
    return null;
  }
}

/** پارس کامل برای submit — مختصات + آدرس + پلاک الزامی */
export function parseResidenceAddress(raw: string | null | undefined): ResidenceAddressValue | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const fields = readResidenceFields(trimmed);
  if (!fields || !fields.address || !fields.plaque) return null;
  return fields;
}

/**
 * پارس جزئی برای ویرایش UI بعد از انتخاب نقشه.
 * پلاک می‌تواند خالی باشد تا مختصات/آدرس از دست نرود.
 */
export function parseResidenceAddressDraft(raw: string | null | undefined): ResidenceAddressValue | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const fields = readResidenceFields(trimmed);
  // حداقل یکی از مختصات معتبر یا متن جزئی لازم است تا draft از NaN ساخته نشود
  if (!fields) return null;
  return fields;
}

export function serializeResidenceAddress(value: ResidenceAddressValue): string {
  return JSON.stringify({
    lat: value.lat,
    lon: value.lon,
    address: value.address.trim(),
    plaque: value.plaque.trim(),
    unit: value.unit?.trim() || undefined,
    postalCode: value.postalCode?.replace(/\D/g, "") || undefined,
  });
}

/** کامل بودن فیلد اجباری آدرس سکونت برای فرم */
export function isResidenceAddressComplete(raw: string | null | undefined): boolean {
  const v = parseResidenceAddress(raw);
  if (!v) return false;
  if (v.postalCode && !IRAN_POSTAL.test(v.postalCode)) return false;
  return true;
}

export function residenceAddressValidationMessage(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "آدرس محل سکونت، موقعیت روی نقشه و پلاک را تکمیل کنید.";
  let parsed: Partial<ResidenceAddressValue>;
  try {
    parsed = JSON.parse(trimmed) as Partial<ResidenceAddressValue>;
  } catch {
    return "دادهٔ آدرس نامعتبر است؛ دوباره روی نقشه انتخاب کنید.";
  }
  if (parsed.lat == null || parsed.lon == null || parsed.lat === "" || parsed.lon === "") {
    return "مختصات موقعیت معتبر نیست؛ نقطه را روی نقشه انتخاب کنید.";
  }
  const lat = Number(parsed.lat);
  const lon = Number(parsed.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return "مختصات موقعیت معتبر نیست؛ نقطه را روی نقشه انتخاب کنید.";
  }
  if (!String(parsed.address ?? "").trim()) return "متن آدرس را وارد کنید یا از نقشه تکمیل کنید.";
  if (!String(parsed.plaque ?? "").trim()) return "پلاک ساختمان را وارد کنید.";
  const postal = String(parsed.postalCode ?? "").replace(/\D/g, "");
  if (postal && !IRAN_POSTAL.test(postal)) return "کد پستی باید ۱۰ رقم باشد (اختیاری برای ارسال جواب/آزمایش).";
  return null;
}

export function buildResidenceFromPatient(patient: {
  homeLat?: number | null;
  homeLon?: number | null;
  homeAddress?: string | null;
  homePlaque?: string | null;
  homeUnit?: string | null;
  homePostalCode?: string | null;
}): string {
  if (typeof patient.homeLat !== "number" || typeof patient.homeLon !== "number") return "";
  if (!patient.homeAddress?.trim() || !patient.homePlaque?.trim()) return "";
  return serializeResidenceAddress({
    lat: patient.homeLat,
    lon: patient.homeLon,
    address: patient.homeAddress.trim(),
    plaque: patient.homePlaque.trim(),
    unit: patient.homeUnit?.trim() || undefined,
    postalCode: patient.homePostalCode?.replace(/\D/g, "") || undefined,
  });
}
