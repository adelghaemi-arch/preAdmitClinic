/*
 File: frontend/my/src/lib/__tests__/uc-adm-04.excel-header-map.test.ts
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
      ["1", "0012345679", "رضا", "رستگار", "امیر", "09123456781", "مذکر", "1355/02/15", "CORP_MEN_LT40", "1405/09/01"],
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
    expect(ready[0]?.pathwayCodeOrGroup).toBe("CORP_MEN_LT40");
    expect(ready[0]?.scheduledVisitDateIso).toBeTruthy();
    expect(ready[1]?.gender).toBe("زن");
    expect(ready[1]?.pathwayCodeOrGroup).toBe("آقایان 40+");
    expect(parsed.rows.some((r) => r.status === "header" && r.reason?.includes("تکرار"))).toBe(true);
    expect(parsed.rows.some((r) => r.status === "skipped")).toBe(true);
  });

  it("قالب بانک توسعه: تاریخ مراجعه گرفته می‌شود؛ روز مراجعه (نام هفته) نادیده", () => {
    // هم‌تراز docs/sample/بانک توسعه.xlsx
    const grid = [
      [
        "ردیف",
        "نام",
        "نام خانوادگی",
        "جنسیت",
        "تاریخ تولد",
        "وضعیت تاهل",
        "کد ملی",
        "نام پدر",
        "تلفن همراه",
        "تاریخ مراجعه",
        "روز مراجعه",
        "گروه",
      ],
      [
        "1",
        "محمد رضا",
        "قربانی",
        "مذکر",
        "1357/06/12",
        "متاهل",
        "6339720366",
        "هرمز",
        "09122319444",
        "1405/08/30",
        "شنبه",
        "آقایان 40+",
      ],
      [
        "2",
        "میثم",
        "رجبی",
        "مذکر",
        "1360/06/27",
        "متاهل",
        "2162369451",
        "عبدالله",
        "09124254363",
        "1405/08/30",
        "شنبه",
        "آقایان 40+",
      ],
    ];
    const parsed = analyzeImportGrid(grid);
    expect(parsed.needsMapping).toBe(false);
    expect(parsed.suggestedMapping.scheduledVisitDate).toBe(9);
    // ستون ۱۰ = روز هفته؛ نباید به تاریخ مراجعه مپ شود
    expect(parsed.suggestedMapping.scheduledVisitDate).not.toBe(10);
    const ready = parsed.rows.filter((r) => r.status === "ready");
    expect(ready.length).toBe(2);
    expect(ready[0]?.scheduledVisitDateRaw).toBe("1405/08/30");
    expect(ready[0]?.scheduledVisitDateIso).toBeTruthy();
    expect(ready[0]?.scheduledVisitDateIso).not.toContain("شنبه");
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
