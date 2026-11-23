/*
 File: frontend/src/lib/__tests__/uc-adm-04.excel-template.test.ts
 Description: UC-ADM-04 — تمپلیت اکسل کامل با اجباری/اختیاری و نمونه مرد/زن
 Parent Dependencies: contract-excel-template, contract-member-import
 */
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  CONTRACT_EXCEL_TEMPLATE_COLUMNS,
  IMPORT_GENDER_OPTIONS,
  IMPORT_JOB_CATEGORY_OPTIONS,
  IMPORT_PATHWAY_CODE_OPTIONS,
  buildContractExcelTemplateWorkbook,
  contractExcelTemplateSampleRows,
} from "@/lib/contract-excel-template";
import { analyzeImportGrid, REQUIRED_IMPORT_FIELDS } from "@/lib/contract-member-import";
import { MARITAL_STATUS_OPTIONS } from "@/lib/marital-status";

describe("UC-ADM-04 excel template", () => {
  it("همهٔ فیلدهای اجباری import در تمپلیت با برچسب اجباری هستند", () => {
    for (const key of REQUIRED_IMPORT_FIELDS) {
      const col = CONTRACT_EXCEL_TEMPLATE_COLUMNS.find((c) => c.key === key);
      expect(col, key).toBeTruthy();
      expect(col!.required).toBe(true);
      expect(col!.header).toContain("اجباری");
    }
    const optional = CONTRACT_EXCEL_TEMPLATE_COLUMNS.filter((c) => !c.required);
    expect(optional.length).toBeGreaterThan(0);
    expect(optional.every((c) => c.header.includes("اختیاری"))).toBe(true);
  });

  it("دقیقاً یک نمونه مرد و یک نمونه زن با مقادیر انتخابی معتبر دارد", () => {
    const [male, female] = contractExcelTemplateSampleRows();
    expect(male).toBeTruthy();
    expect(female).toBeTruthy();
    const genderIdx = CONTRACT_EXCEL_TEMPLATE_COLUMNS.findIndex((c) => c.key === "gender");
    const maritalIdx = CONTRACT_EXCEL_TEMPLATE_COLUMNS.findIndex((c) => c.key === "maritalStatus");
    const jobIdx = CONTRACT_EXCEL_TEMPLATE_COLUMNS.findIndex((c) => c.key === "jobCategory");
    const pathIdx = CONTRACT_EXCEL_TEMPLATE_COLUMNS.findIndex((c) => c.key === "pathwayCodeOrGroup");
    expect(male![genderIdx]).toBe("مرد");
    expect(female![genderIdx]).toBe("زن");
    expect(IMPORT_GENDER_OPTIONS).toContain(male![genderIdx]);
    expect(IMPORT_GENDER_OPTIONS).toContain(female![genderIdx]);
    expect(MARITAL_STATUS_OPTIONS as readonly string[]).toContain(male![maritalIdx]);
    expect(MARITAL_STATUS_OPTIONS as readonly string[]).toContain(female![maritalIdx]);
    expect(IMPORT_JOB_CATEGORY_OPTIONS as readonly string[]).toContain(male![jobIdx]);
    expect(IMPORT_JOB_CATEGORY_OPTIONS as readonly string[]).toContain(female![jobIdx]);
    expect(IMPORT_PATHWAY_CODE_OPTIONS as readonly string[]).toContain(male![pathIdx]);
    expect(IMPORT_PATHWAY_CODE_OPTIONS as readonly string[]).toContain(female![pathIdx]);
  });

  it("workbook تمپلیت قابل import است (۲ ردیف آماده)", () => {
    const wb = buildContractExcelTemplateWorkbook();
    expect(wb.SheetNames).toEqual(expect.arrayContaining(["افراد", "راهنما", "مقادیر_مجاز"]));
    const sheet = wb.Sheets["افراد"];
    const grid = XLSX.utils.sheet_to_json<string[]>(sheet!, { header: 1, defval: "" }) as string[][];
    const parsed = analyzeImportGrid(grid.map((r) => r.map((c) => String(c ?? ""))));
    expect(parsed.needsMapping).toBe(false);
    expect(parsed.readyCount).toBe(2);
    const ready = parsed.rows.filter((r) => r.status === "ready");
    expect(ready.map((r) => r.gender).sort()).toEqual(["زن", "مرد"]);
  });
});
