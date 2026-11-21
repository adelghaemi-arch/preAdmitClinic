/*
 File: frontend/src/lib/__tests__/uc-adm-04.excel-header-map.test.ts
 Description: UC-ADM-04 — تشخیص هدر بدون ترتیب ثابت، مپ دستی، skip هدر تکراری/وقفه
 Parent Dependencies: contract-member-import
 */

import { describe, expect, it } from "vitest";
import {
  analyzeImportGrid,
  finalizeImportParse,
  type ColumnMapping,
} from "@/lib/contract-member-import";

describe("UC-ADM-04 excel header map", () => {
  it("مپ خودکار وقتی هدر فارسی با ترتیب غیرقالب باشد", () => {
    const grid = [
      ["ردیف", "کد ملی", "نام پدر", "نام خانوادگی", "نام", "تلفن همراه", "جنسیت", "تاریخ تولد", "گروه", "تاریخ مراجعه"],
      ["1", "0012345679", "رضا", "رستگار", "امیر", "09123456781", "مذکر", "1355/02/15", "FULL_CHECKUP", "1405/09/01"],
      ["", "", "", "", "", "", "", "", "", ""],
      ["ردیف", "کد ملی", "نام پدر", "نام خانوادگی", "نام", "تلفن همراه", "جنسیت", "تاریخ تولد", "گروه", "تاریخ مراجعه"],
      ["2", "0011223340", "علی", "شریفی", "نازنین", "09129876542", "مونث", "1369/08/03", "آقایان 40+", ""],
    ];
    const parsed = analyzeImportGrid(grid);
    expect(parsed.needsMapping).toBe(false);
    expect(parsed.readyCount).toBe(2);
    const ready = parsed.rows.filter((r) => r.status === "ready");
    expect(ready[0]?.firstName).toBe("امیر");
    expect(ready[0]?.gender).toBe("مرد");
    expect(ready[0]?.fatherName).toBe("رضا");
    expect(ready[0]?.pathwayCodeOrGroup).toBe("FULL_CHECKUP");
    expect(ready[0]?.scheduledVisitDateIso).toBeTruthy();
    expect(ready[1]?.gender).toBe("زن");
    expect(ready[1]?.pathwayCodeOrGroup).toBe("آقایان 40+");
    expect(parsed.rows.some((r) => r.status === "header" && r.reason?.includes("تکرار"))).toBe(true);
    expect(parsed.rows.some((r) => r.status === "skipped")).toBe(true);
  });

  it("اگر اجباری‌ها پیدا نشد needsMapping می‌شود و finalize با مپ دستی کار می‌کند", () => {
    const grid = [
      ["ستون‌آ", "ستون‌ب", "ستون‌ج", "ستون‌د", "ستون‌ه", "ستون‌و"],
      ["امیر", "رستگار", "0012345679", "09123456781", "1355/02/15", "مرد"],
    ];
    const analyzed = analyzeImportGrid(grid);
    expect(analyzed.needsMapping).toBe(true);
    const mapping: ColumnMapping = {
      firstName: 0,
      lastName: 1,
      nationalId: 2,
      phone: 3,
      birthDate: 4,
      gender: 5,
    };
    const finalized = finalizeImportParse(analyzed.rawRows, mapping, 0, analyzed.fileColumns);
    expect(finalized.needsMapping).toBe(false);
    expect(finalized.readyCount).toBe(1);
    expect(finalized.rows.find((r) => r.status === "ready")?.nationalId).toBe("0012345679");
  });
});
