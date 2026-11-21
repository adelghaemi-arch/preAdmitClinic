/*
 File: frontend/src/lib/__tests__/uc-own-09-fraud-wire.test.ts
 Description: UC-OWN-09 — پوشش سیم فریم ضدتقلب و نمایش وقت ایران بدون تبدیل مرورگر
 Parent Dependencies: fraud-wire, persian
 */

import { describe, expect, it } from "vitest";
import { randomOpaqueBinName, wrapFraudJpeg } from "@/lib/fraud-wire";
import { formatFaDateTime, formatFaTime, parseIranApiWallClock } from "@/lib/persian";

const TINY_JPEG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0xff, 0xd9,
]);

describe("UC-OWN-09", () => {
  it("wrapFraudJpeg produces NBZ1 envelope and opaque .bin name", async () => {
    // کلید ساختگی ۴۳ کاراکتر base64url (~32 بایت)
    const wrapKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const wrapped = await wrapFraudJpeg(TINY_JPEG, wrapKey);
    expect(new TextDecoder().decode(wrapped.slice(0, 4))).toBe("NBZ1");
    expect(wrapped[0]).not.toBe(0xff);
    const name = randomOpaqueBinName();
    expect(name.endsWith(".bin")).toBe(true);
    expect(name.includes("fraud")).toBe(false);
    expect(name.includes(".jpg")).toBe(false);
  });

  it("formatFaTime reads Iran wall clock from API string without browser TZ", () => {
    const iso = "2026-11-20T22:03:00+03:30";
    expect(parseIranApiWallClock(iso)).toEqual({ ymd: "2026-11-20", hh: "22", mm: "03", ss: "00" });
    expect(formatFaTime(iso)).toBe("۲۲:۰۳");
    expect(formatFaDateTime(iso)).toContain("۲۲:۰۳");
  });
});
