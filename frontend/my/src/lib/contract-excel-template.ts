/*
 File: frontend/my/src/lib/contract-excel-template.ts
 Description: تمپلیت اکسل ورود اعضا — اجباری/اختیاری، نمونه مرد/زن، مقادیر انتخابی
 Parent Dependencies: contract-member-import, marital-status, xlsx
 */
import * as XLSX from "xlsx";
import {
  IMPORT_FIELD_LABELS,
  REQUIRED_IMPORT_FIELDS,
  type ImportFieldKey,
} from "@/lib/contract-member-import";
import { MARITAL_STATUS_OPTIONS } from "@/lib/marital-status";

/** رده شغلی عضو (بدون «همه» که فقط برای قواعد مسیر است) */
export const IMPORT_JOB_CATEGORY_OPTIONS = [
  "عملیات و فنی",
  "مدیریت",
  "اداری و مالی",
  "فناوری و مهندسی",
  "خدمات و پشتیبانی",
] as const;

export const IMPORT_GENDER_OPTIONS = ["مرد", "زن"] as const;

/** کد مسیرهای سازمانی seed — برچسب آزاد در ستون گروه نادیده گرفته می‌شود */
export const IMPORT_PATHWAY_CODE_OPTIONS = [
  "CORP_MEN_LT40",
  "CORP_MEN_GE40",
  "CORP_WOMEN_LT40",
  "CORP_WOMEN_GE40",
] as const;

export type ContractExcelTemplateColumn = {
  key: ImportFieldKey;
  /** عنوان هدر فایل (با برچسب اجباری/اختیاری برای انسان) */
  header: string;
  required: boolean;
  /** اگر ست باشد سلول انتخابی است */
  selectOptions?: readonly string[];
  sampleMale: string;
  sampleFemale: string;
  hint: string;
};

export const CONTRACT_EXCEL_TEMPLATE_COLUMNS: ContractExcelTemplateColumn[] = [
  {
    key: "firstName",
    header: "نام (اجباری)",
    required: true,
    sampleMale: "امیرحسین",
    sampleFemale: "نازنین",
    hint: "حداقل ۲ حرف",
  },
  {
    key: "lastName",
    header: "نام‌خانوادگی (اجباری)",
    required: true,
    sampleMale: "رستگار",
    sampleFemale: "شریفی",
    hint: "حداقل ۲ حرف",
  },
  {
    key: "nationalId",
    header: "کد ملی (اجباری)",
    required: true,
    sampleMale: "0012345679",
    sampleFemale: "0011223340",
    hint: "۱۰ رقم؛ صفر اول حفظ شود (ستون متنی)",
  },
  {
    key: "phone",
    header: "شماره موبایل (اجباری)",
    required: true,
    sampleMale: "09123456781",
    sampleFemale: "09129876542",
    hint: "۱۱ رقم با ۰۹",
  },
  {
    key: "birthDate",
    header: "تاریخ تولد (اجباری)",
    required: true,
    sampleMale: "1355/02/15",
    sampleFemale: "1369/08/03",
    hint: "شمسی yyyy/mm/dd",
  },
  {
    key: "gender",
    header: "جنسیت (اجباری)",
    required: true,
    selectOptions: IMPORT_GENDER_OPTIONS,
    sampleMale: "مرد",
    sampleFemale: "زن",
    hint: IMPORT_GENDER_OPTIONS.join(" | "),
  },
  {
    key: "maritalStatus",
    header: "تاهل (اختیاری)",
    required: false,
    selectOptions: MARITAL_STATUS_OPTIONS,
    sampleMale: "متأهل",
    sampleFemale: "مجرد",
    hint: MARITAL_STATUS_OPTIONS.join(" | "),
  },
  {
    key: "fatherName",
    header: "نام پدر (اختیاری)",
    required: false,
    sampleMale: "رضا",
    sampleFemale: "علی",
    hint: "متن آزاد",
  },
  {
    key: "scheduledVisitDate",
    header: "تاریخ مراجعه (اختیاری)",
    required: false,
    sampleMale: "1405/09/01",
    sampleFemale: "",
    hint: "شمسی؛ خالی = بدون نوبت",
  },
  {
    key: "pathwayCodeOrGroup",
    header: "گروه / کد مسیر (اختیاری)",
    required: false,
    selectOptions: IMPORT_PATHWAY_CODE_OPTIONS,
    sampleMale: "CORP_MEN_LT40",
    sampleFemale: "CORP_WOMEN_LT40",
    hint: "فقط کد مسیر معتبر مسیر را ست می‌کند",
  },
  {
    key: "department",
    header: "واحد سازمانی (اختیاری)",
    required: false,
    sampleMale: "بهره‌برداری",
    sampleFemale: "امور مالی",
    hint: "متن آزاد",
  },
  {
    key: "jobCategory",
    header: "رده شغلی (اختیاری)",
    required: false,
    selectOptions: IMPORT_JOB_CATEGORY_OPTIONS,
    sampleMale: "عملیات و فنی",
    sampleFemale: "اداری و مالی",
    hint: IMPORT_JOB_CATEGORY_OPTIONS.join(" | "),
  },
  {
    key: "personnelCode",
    header: "کد پرسنلی (اختیاری)",
    required: false,
    sampleMale: "PR-2001",
    sampleFemale: "PR-2002",
    hint: "کد داخلی سازمان",
  },
];

export function contractExcelTemplateHeaders(): string[] {
  return CONTRACT_EXCEL_TEMPLATE_COLUMNS.map((c) => c.header);
}

export function contractExcelTemplateSampleRows(): string[][] {
  return [
    CONTRACT_EXCEL_TEMPLATE_COLUMNS.map((c) => c.sampleMale),
    CONTRACT_EXCEL_TEMPLATE_COLUMNS.map((c) => c.sampleFemale),
  ];
}

/** ردیف راهنمای مقادیر انتخابی زیر هدر — هنگام import به‌عنوان هدر تکراری/دادهٔ نامعتبر skip می‌شود اگر خالی از کدملی باشد */
export function contractExcelTemplateHintRow(): string[] {
  return CONTRACT_EXCEL_TEMPLATE_COLUMNS.map((c) =>
    c.selectOptions ? `مقادیر: ${c.selectOptions.join(" | ")}` : c.required ? "اجباری" : "اختیاری",
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildListsSheetAoA(): string[][] {
  const gender = ["جنسیت", ...IMPORT_GENDER_OPTIONS];
  const marital = ["تاهل", ...MARITAL_STATUS_OPTIONS];
  const job = ["رده شغلی", ...IMPORT_JOB_CATEGORY_OPTIONS];
  const pathway = ["کد مسیر", ...IMPORT_PATHWAY_CODE_OPTIONS];
  const maxLen = Math.max(gender.length, marital.length, job.length, pathway.length);
  const rows: string[][] = [];
  for (let i = 0; i < maxLen; i++) {
    rows.push([gender[i] ?? "", marital[i] ?? "", job[i] ?? "", pathway[i] ?? ""]);
  }
  return rows;
}

function buildGuideSheetAoA(): string[][] {
  const rows: string[][] = [
    ["ستون", "الزام", "مقادیر مجاز / توضیح"],
    ...CONTRACT_EXCEL_TEMPLATE_COLUMNS.map((c) => [
      IMPORT_FIELD_LABELS[c.key],
      c.required ? "اجباری" : "اختیاری",
      c.hint,
    ]),
    [],
    ["یادداشت"],
    ["ترتیب ستون‌ها مهم نیست؛ سامانه از عنوان هدر تشخیص می‌دهد."],
    ["کدملی و موبایل را به‌صورت متن وارد کنید تا صفر اول در Excel حذف نشود."],
    ["ستون «گروه / کد مسیر»: فقط کد مسیر معتبر (شیت مقادیر_مجاز) مسیر را ست می‌کند."],
    ["ردیف‌های نمونه را پاک یا عوض کنید؛ یک نمونه مرد و یک نمونه زن برای الگوست."],
  ];
  // sanity: required list matches columns
  void REQUIRED_IMPORT_FIELDS;
  return rows;
}

/** workbook کامل تمپلیت برای تست یا دانلود */
export function buildContractExcelTemplateWorkbook(): XLSX.WorkBook {
  const headers = contractExcelTemplateHeaders();
  const samples = contractExcelTemplateSampleRows();

  // فقط هدر + دو نمونه؛ راهنمای مقادیر در شیت جداست تا ردیف راهنما import را آلوده نکند
  const peopleAoA = [headers, ...samples];
  const peopleWs = XLSX.utils.aoa_to_sheet(peopleAoA);

  // کدملی و موبایل متنی
  const nidCol = CONTRACT_EXCEL_TEMPLATE_COLUMNS.findIndex((c) => c.key === "nationalId");
  const phoneCol = CONTRACT_EXCEL_TEMPLATE_COLUMNS.findIndex((c) => c.key === "phone");
  for (let r = 1; r <= 2; r++) {
    for (const col of [nidCol, phoneCol]) {
      if (col < 0) continue;
      const addr = XLSX.utils.encode_cell({ r, c: col });
      const cell = peopleWs[addr];
      if (cell) {
        cell.t = "s";
        cell.z = "@";
      }
    }
  }

  peopleWs["!cols"] = headers.map(() => ({ wch: 18 }));

  // اعتبارسنجی لیست برای ستون‌های انتخابی (Excel دسکتاپ)
  const validations: Array<{ sqref: string; type: string; formula1: string; allowBlank: boolean }> = [];
  CONTRACT_EXCEL_TEMPLATE_COLUMNS.forEach((col, idx) => {
    if (!col.selectOptions?.length) return;
    const letter = XLSX.utils.encode_col(idx);
    validations.push({
      sqref: `${letter}2:${letter}1000`,
      type: "list",
      formula1: `"${col.selectOptions.join(",")}"`,
      allowBlank: !col.required,
    });
  });
  if (validations.length > 0) {
    (peopleWs as XLSX.WorkSheet & { "!dataValidation"?: typeof validations })["!dataValidation"] = validations;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, peopleWs, "افراد");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildGuideSheetAoA()), "راهنما");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildListsSheetAoA()), "مقادیر_مجاز");
  return wb;
}

/**
 * دانلود تمپلیت:
 * - xlsx: شیت افراد + راهنما + مقادیر_مجاز (+ تلاش برای dropdown)
 * - csv: فقط هدر و دو ردیف نمونه
 * - xls: HTML Excel سازگار قدیمی
 */
export function downloadContractExcelTemplate(format: "xlsx" | "xls" | "csv" = "xlsx"): void {
  if (typeof window === "undefined") return;
  const headers = contractExcelTemplateHeaders();
  const samples = contractExcelTemplateSampleRows();

  if (format === "csv") {
    const rows = [headers, ...samples];
    const csv =
      "\uFEFF" +
      rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "nabz-contract-template.csv");
    return;
  }

  if (format === "xlsx") {
    const wb = buildContractExcelTemplateWorkbook();
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    triggerDownload(
      new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "nabz-contract-template.xlsx",
    );
    return;
  }

  // .xls HTML — با رنگ‌بندی اجباری/اختیاری
  const headerHtml = CONTRACT_EXCEL_TEMPLATE_COLUMNS.map((c) => {
    const bg = c.required ? "#1d5545" : "#475569";
    return `<th style="background:${bg};color:#ffffff;font-weight:bold;padding:8px 12px;border:1px solid #cbd5e1;">${c.header}</th>`;
  }).join("");
  const hintHtml = `<tr>${CONTRACT_EXCEL_TEMPLATE_COLUMNS.map(
    (c) =>
      `<td style="padding:4px 8px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:11px;">${
        c.selectOptions ? `مقادیر: ${c.selectOptions.join(" | ")}` : c.required ? "اجباری" : "اختیاری"
      }</td>`,
  ).join("")}</tr>`;
  const bodyHtml = samples
    .map(
      (row) =>
        `<tr>${row
          .map((cell, i) => {
            const key = CONTRACT_EXCEL_TEMPLATE_COLUMNS[i]?.key;
            const textStyle = key === "nationalId" || key === "phone" ? "mso-number-format:'\\@';" : "";
            return `<td style="padding:6px 10px;border:1px solid #e2e8f0;${textStyle}">${cell}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  const listsNote = CONTRACT_EXCEL_TEMPLATE_COLUMNS.filter((c) => c.selectOptions)
    .map((c) => `<li><b>${IMPORT_FIELD_LABELS[c.key]}:</b> ${c.selectOptions!.join(" | ")}</li>`)
    .join("");
  const html = `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" dir="rtl"><head><meta charset="UTF-8" /></head><body>
<p style="font-family:Tahoma;font-size:12px;">ستون سبز = اجباری · ستون خاکستری = اختیاری. ردیف دوم راهنمای مقادیر است؛ دو ردیف بعد نمونهٔ مرد و زن.</p>
<ul style="font-family:Tahoma;font-size:11px;">${listsNote}</ul>
<table dir="rtl" border="1"><thead><tr>${headerHtml}</tr></thead><tbody>${hintHtml}${bodyHtml}</tbody></table>
</body></html>`;
  triggerDownload(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" }), "nabz-contract-template.xls");
}
