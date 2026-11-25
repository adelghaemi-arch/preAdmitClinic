/*
 File: frontend/my/src/lib/__tests__/residence-address.test.ts
 Description: پارس draft/کامل آدرس سکونت و حفظ مختصات بعد از نقشه→پلاک
 Parent Dependencies: residence-address.ts
 */

import { describe, expect, it } from "vitest";
import {
  isResidenceAddressComplete,
  parseResidenceAddress,
  parseResidenceAddressDraft,
  serializeResidenceAddress,
  type ResidenceAddressValue,
} from "@/lib/residence-address";

/** شبیه‌سازی منطق patch در ResidenceAddressField با draft parse */
function patchFromRaw(raw: string, partial: Partial<ResidenceAddressValue>): string {
  const draft = parseResidenceAddressDraft(raw) ?? {
    lat: NaN,
    lon: NaN,
    address: "",
    plaque: "",
    unit: "",
    postalCode: "",
  };
  const next: ResidenceAddressValue = {
    lat: partial.lat ?? draft.lat,
    lon: partial.lon ?? draft.lon,
    address: partial.address ?? draft.address,
    plaque: partial.plaque ?? draft.plaque,
    unit: partial.unit ?? draft.unit,
    postalCode: partial.postalCode ?? draft.postalCode,
  };
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lon) || !next.address.trim()) {
    return JSON.stringify({
      lat: Number.isFinite(next.lat) ? next.lat : null,
      lon: Number.isFinite(next.lon) ? next.lon : null,
      address: next.address,
      plaque: next.plaque,
      unit: next.unit || undefined,
      postalCode: next.postalCode || undefined,
    });
  }
  return serializeResidenceAddress(next);
}

describe("parseResidenceAddressDraft", () => {
  it("keeps coords when plaque is empty after map confirm", () => {
    const raw = serializeResidenceAddress({
      lat: 35.7219,
      lon: 51.3347,
      address: "تهران، خیابان نمونه",
      plaque: "",
    });
    const draft = parseResidenceAddressDraft(raw);
    expect(draft).not.toBeNull();
    expect(draft!.lat).toBeCloseTo(35.7219);
    expect(draft!.lon).toBeCloseTo(51.3347);
    expect(draft!.address).toBe("تهران، خیابان نمونه");
    expect(draft!.plaque).toBe("");
  });

  it("returns null for invalid coords", () => {
    expect(parseResidenceAddressDraft(JSON.stringify({ lat: null, lon: null, address: "x", plaque: "" }))).toBeNull();
    expect(parseResidenceAddressDraft("")).toBeNull();
    expect(parseResidenceAddressDraft("{")).toBeNull();
  });
});

describe("parseResidenceAddress (complete)", () => {
  it("returns null without plaque", () => {
    const raw = serializeResidenceAddress({
      lat: 35.7,
      lon: 51.4,
      address: "آدرس",
      plaque: "",
    });
    expect(parseResidenceAddress(raw)).toBeNull();
    expect(isResidenceAddressComplete(raw)).toBe(false);
  });

  it("accepts full value with plaque", () => {
    const raw = serializeResidenceAddress({
      lat: 35.7,
      lon: 51.4,
      address: "آدرس کامل",
      plaque: "۱۲",
      unit: "۳",
    });
    const parsed = parseResidenceAddress(raw);
    expect(parsed?.plaque).toBe("۱۲");
    expect(isResidenceAddressComplete(raw)).toBe(true);
  });
});

describe("map then plaque keeps coordinates", () => {
  it("typing plaque after map does not wipe lat/lon", () => {
    const afterMap = serializeResidenceAddress({
      lat: 35.6892,
      lon: 51.389,
      address: "تهران",
      plaque: "",
    });
    const afterPlaque = patchFromRaw(afterMap, { plaque: "15" });
    const draft = parseResidenceAddressDraft(afterPlaque);
    expect(draft?.lat).toBeCloseTo(35.6892);
    expect(draft?.lon).toBeCloseTo(51.389);
    expect(draft?.plaque).toBe("15");
    expect(parseResidenceAddress(afterPlaque)).not.toBeNull();
    expect(isResidenceAddressComplete(afterPlaque)).toBe(true);
  });
});
