/*
 File: frontend/src/lib/__tests__/uc-adm-21.touba-account.test.ts
 Description: گیت‌های UI حساب طوبی — merge خطوط ارسال (UC-ADM-21)
 Parent Dependencies: lib/api/clinics
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_TOUBA_SOAP_URL, mergeToubaSenderOptions } from "@/lib/api/clinics";

describe("UC-ADM-21", () => {
  it("mergeToubaSenderOptions keeps current when not in account list", () => {
    expect(mergeToubaSenderOptions("9999", ["1000", "2000"])).toEqual(["1000", "2000", "9999"]);
  });

  it("mergeToubaSenderOptions dedupes and trims", () => {
    expect(mergeToubaSenderOptions(" 1000 ", ["1000", " 2000 ", ""])).toEqual(["1000", "2000"]);
  });

  it("default SOAP url matches sample endpoint", () => {
    expect(DEFAULT_TOUBA_SOAP_URL).toBe("http://www.tsms.ir/soapWSDL/");
  });
});
