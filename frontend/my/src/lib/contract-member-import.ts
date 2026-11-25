/*
 File: frontend/my/src/lib/contract-member-import.ts
 Description: پارسر اکسل/CSV اعضا — تشخیص هدر بدون ترتیب ثابت، مپ دستی، skip هدر تکراری/وقفه
 Parent Dependencies: person-identity, marital-status, persian, xlsx
 */

import * as XLSX from "xlsx";
import {
  ageFromBirthIso,
  displayFullName,
  isValidIranMobile,
  isValidIranNationalId,
  looksLikeScientificNotation,
  normalizeMobileForImport,
  normalizeNationalIdForImport,
  parseShamsiBirthToIso,
} from "@/lib/person-identity";
import { jalaliFieldsToGregorianIso } from "@/lib/date-iso";
import { normalizeMaritalStatus } from "@/lib/marital-status";
import { normalizePersianLetters, toLatinDigits } from "@/lib/persian";

const JOB_CATEGORIES = [
  "همه",
  "عملیات و فنی",
  "مدیریت",
  "اداری و مالی",
  "فناوری و مهندسی",
  "خدمات و پشتیبانی",
] as const;

export type ImportPreviewStatus =
  | "ready"
  | "invalid"
  | "header"
  | "imported"
  | "linked"
  | "duplicate"
  | "rejected"
  | "skipped";

export type ImportFieldKey =
  | "firstName"
  | "lastName"
  | "nationalId"
  | "phone"
  | "birthDate"
  | "gender"
  | "maritalStatus"
  | "department"
  | "jobCategory"
  | "personnelCode"
  | "fatherName"
  | "scheduledVisitDate"
  | "pathwayCodeOrGroup";

export const IMPORT_FIELD_LABELS: Record<ImportFieldKey, string> = {
  firstName: "نام",
  lastName: "نام‌خانوادگی",
  nationalId: "کدملی",
  phone: "موبایل",
  birthDate: "تاریخ تولد",
  gender: "جنسیت",
  maritalStatus: "تاهل",
  department: "واحد",
  jobCategory: "رده شغلی",
  personnelCode: "کد پرسنلی",
  fatherName: "نام پدر",
  scheduledVisitDate: "تاریخ مراجعه",
  pathwayCodeOrGroup: "گروه / کد مسیر",
};

export const REQUIRED_IMPORT_FIELDS: ImportFieldKey[] = [
  "firstName",
  "lastName",
  "nationalId",
  "phone",
  "birthDate",
  "gender",
];

/** aliasهای فارسی/انگلیسی برای تشخیص هدر — ترتیب خاص ستون لازم نیست */
const FIELD_ALIASES: Record<ImportFieldKey, string[]> = {
  firstName: ["نام", "اسم", "firstname", "first name", "first_name"],
  lastName: ["نام خانوادگی", "نام‌خانوادگی", "فامیلی", "lastname", "last name", "last_name", "surname"],
  nationalId: ["کدملی", "کد ملی", "کد_ملی", "nationalid", "national id", "nid"],
  phone: ["موبایل", "تلفن همراه", "شماره موبایل", "تلفن", "phone", "mobile", "cellphone"],
  birthDate: ["تاریخ تولد", "تولد", "birthdate", "birth date", "dob"],
  gender: ["جنسیت", "جنس", "gender", "sex"],
  maritalStatus: ["تاهل", "وضعیت تاهل", "وضعیت تأهل", "marital"],
  department: ["واحد", "واحد سازمانی", "department", "dept"],
  jobCategory: ["رده", "رده شغلی", "شغل", "job", "jobcategory"],
  personnelCode: ["کد پرسنلی", "کدپرسنلی", "پرسنلی", "personnel", "personnelcode"],
  fatherName: ["نام پدر", "پدر", "father", "fathername"],
  scheduledVisitDate: ["تاریخ مراجعه", "مراجعه", "visit date", "scheduled visit", "نوبت"],
  pathwayCodeOrGroup: ["گروه", "کد مسیر", "مسیر سلامتی", "pathway", "pathwaycode", "package"],
};

/** «روز مراجعه» در فایل‌های HR معمولاً نام روز هفته است (شنبه/…)، نه تاریخ — نادیده گرفته می‌شود. */
const IGNORE_HEADER_ALIASES = ["ردیف", "row", "ردیف ", "#", "شماره", "روز مراجعه"];

export interface ImportPreviewRow {
  lineNo: number;
  firstName: string;
  lastName: string;
  nationalId: string;
  phone: string;
  birthDateIso: string | null;
  birthDateRaw: string;
  gender: string;
  maritalStatus: string;
  department: string;
  jobCategory: string;
  personnelCode: string;
  fatherName: string;
  scheduledVisitDateIso: string | null;
  scheduledVisitDateRaw: string;
  pathwayCodeOrGroup: string;
  status: ImportPreviewStatus;
  reason: string | null;
}

export type ColumnMapping = Partial<Record<ImportFieldKey, number>>;

export interface ParseImportResult {
  rows: ImportPreviewRow[];
  readyCount: number;
  invalidCount: number;
  skipped: number;
  needsMapping: boolean;
  fileColumns: string[];
  suggestedMapping: ColumnMapping;
  rawRows: string[][];
  headerRowIndex: number;
}

function normHeader(cell: string): string {
  return normalizePersianLetters(toLatinDigits(cell))
    .replace(/\*/g, "")
    .replace(/[()（）]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function matchField(header: string): ImportFieldKey | "ignore" | null {
  const h = normHeader(header);
  if (!h) return null;
  if (IGNORE_HEADER_ALIASES.some((a) => h === normHeader(a) || h.includes(normHeader(a)))) {
    // «روز مراجعه» را نادیده؛ «تاریخ مراجعه» جداست
    if (h.includes("روز") && h.includes("مراجعه")) return "ignore";
    if (h === "ردیف" || h === "row" || h === "#" || h === "شماره") return "ignore";
  }
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [ImportFieldKey, string[]][]) {
    for (const alias of aliases) {
      const a = normHeader(alias);
      if (h === a || h.startsWith(a + " ") || h.includes(a)) {
        // جلوگیری از قاطی «نام» با «نام خانوادگی» / «نام پدر»
        if (field === "firstName") {
          if (h.includes("خانواد") || h.includes("پدر") || h.includes("فامیل")) continue;
        }
        if (field === "scheduledVisitDate" && h.includes("روز")) continue;
        return field;
      }
    }
  }
  return null;
}

function scoreHeaderRow(cols: string[]): { score: number; mapping: ColumnMapping } {
  const mapping: ColumnMapping = {};
  let score = 0;
  cols.forEach((cell, idx) => {
    const field = matchField(cell);
    if (!field || field === "ignore") return;
    if (mapping[field] == null) {
      mapping[field] = idx;
      score += REQUIRED_IMPORT_FIELDS.includes(field) ? 3 : 1;
    }
  });
  return { score, mapping };
}

function findBestHeaderRow(rawRows: string[][]): { headerRowIndex: number; mapping: ColumnMapping; score: number } {
  let best = { headerRowIndex: 0, mapping: {} as ColumnMapping, score: -1 };
  const limit = Math.min(rawRows.length, 30);
  for (let i = 0; i < limit; i++) {
    const { score, mapping } = scoreHeaderRow(rawRows[i] ?? []);
    if (score > best.score) best = { headerRowIndex: i, mapping, score };
  }
  return best;
}

function mappingCoversRequired(mapping: ColumnMapping): boolean {
  return REQUIRED_IMPORT_FIELDS.every((f) => typeof mapping[f] === "number");
}

function cellAt(cols: string[], idx: number | undefined): string {
  if (idx == null || idx < 0) return "";
  return (cols[idx] ?? "").trim();
}

function isBlankRow(cols: string[]): boolean {
  return !cols.some((c) => String(c ?? "").trim().length > 0);
}

function looksLikeHeaderRow(cols: string[], mapping: ColumnMapping): boolean {
  const { score } = scoreHeaderRow(cols);
  if (score < 6) return false;
  // اگر بیشتر سلول‌های مپ‌شده متن هدر باشند نه داده
  let headerish = 0;
  let checked = 0;
  for (const field of Object.keys(mapping) as ImportFieldKey[]) {
    const idx = mapping[field];
    if (idx == null) continue;
    checked++;
    const cell = cellAt(cols, idx);
    if (matchField(cell) != null) headerish++;
    else if (field === "nationalId" && !/\d{5,}/.test(normHeader(cell))) headerish++;
  }
  return checked > 0 && headerish >= Math.ceil(checked * 0.6);
}

function normalizeGender(raw: string): string {
  const g = normalizePersianLetters(raw.trim());
  if (g.includes("زن") || g.includes("مونث") || g.includes("خانم") || g.toLowerCase() === "f") return "زن";
  if (g.includes("مرد") || g.includes("مذكر") || g.includes("مذکر") || g.includes("آقا") || g.toLowerCase() === "m")
    return "مرد";
  return g;
}

/** تاریخ مراجعه می‌تواند آینده باشد — برخلاف تولد، سن چک نمی‌شود. */
function parseShamsiCalendarToIso(raw: string): { ok: true; iso: string } | { ok: false; reason: string } {
  const text = toLatinDigits(raw).trim();
  if (!text) return { ok: false, reason: "خالی" };
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { ok: true, iso: text };
  const parts = text.split(/[/\-. .\u066B\u060C،]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 3) return { ok: false, reason: "تاریخ باید سه جزء داشته باشد." };
  const nums = parts.map((p) => Number(p.replace(/\D/g, "")));
  if (nums.some((n) => !Number.isFinite(n))) return { ok: false, reason: "تاریخ عددی نیست." };
  const [a, b, c] = nums as [number, number, number];
  let jy = 0;
  let jm = 0;
  let jd = 0;
  const isJy = (n: number) => n >= 1270 && n <= 1500;
  if (isJy(a) && b >= 1 && b <= 12 && c >= 1 && c <= 31) {
    jy = a;
    jm = b;
    jd = c;
  } else if (isJy(c) && a >= 1 && a <= 12 && b >= 1 && b <= 31) {
    jy = c;
    jm = a;
    jd = b;
  } else {
    return { ok: false, reason: "تاریخ شمسی قابل تشخیص نیست." };
  }
  const iso = jalaliFieldsToGregorianIso({ year: jy, month: jm, day: jd });
  if (!iso) return { ok: false, reason: "تاریخ شمسی نامعتبر است." };
  return { ok: true, iso };
}

function buildRow(lineNo: number, cols: string[], mapping: ColumnMapping): ImportPreviewRow {
  const firstName = normalizePersianLetters(cellAt(cols, mapping.firstName));
  const lastName = normalizePersianLetters(cellAt(cols, mapping.lastName));
  const nidRaw = cellAt(cols, mapping.nationalId);
  const phoneRaw = cellAt(cols, mapping.phone);
  const birthRaw = cellAt(cols, mapping.birthDate);
  const genderRaw = cellAt(cols, mapping.gender);
  const maritalRaw = cellAt(cols, mapping.maritalStatus);
  const deptRaw = cellAt(cols, mapping.department);
  const catRaw = cellAt(cols, mapping.jobCategory);
  const codeRaw = cellAt(cols, mapping.personnelCode);
  const fatherName = normalizePersianLetters(cellAt(cols, mapping.fatherName));
  const visitRaw = cellAt(cols, mapping.scheduledVisitDate);
  const pathwayCodeOrGroup = normalizePersianLetters(cellAt(cols, mapping.pathwayCodeOrGroup));

  if (looksLikeScientificNotation(nidRaw) || looksLikeScientificNotation(phoneRaw)) {
    return {
      lineNo,
      firstName,
      lastName,
      nationalId: String(nidRaw),
      phone: String(phoneRaw),
      birthDateIso: null,
      birthDateRaw: birthRaw,
      gender: "",
      maritalStatus: "",
      department: "",
      jobCategory: "",
      personnelCode: "",
      fatherName,
      scheduledVisitDateIso: null,
      scheduledVisitDateRaw: visitRaw,
      pathwayCodeOrGroup,
      status: "invalid",
      reason: "کدملی/موبایل شبیه نماد علمی اکسل است",
    };
  }

  const nationalId = normalizeNationalIdForImport(nidRaw);
  const phone = normalizeMobileForImport(phoneRaw);
  const birthParsed = birthRaw
    ? parseShamsiBirthToIso(birthRaw)
    : { ok: false as const, reason: "تاریخ تولد خالی است." };
  const gender = normalizeGender(genderRaw);
  const maritalStatus = normalizeMaritalStatus(maritalRaw) ?? "";
  const department = normalizePersianLetters(deptRaw.trim());
  const rawCat = normalizePersianLetters(catRaw.trim());
  const jobCategory =
    JOB_CATEGORIES.find((c) => c !== "همه" && (c === rawCat || c.includes(rawCat))) ||
    (rawCat.length > 1 ? rawCat : "");
  const personnelCode = toLatinDigits(codeRaw).trim();
  const visitParsed = visitRaw ? parseShamsiCalendarToIso(visitRaw) : null;

  const reasons: string[] = [];
  const notes: string[] = [];
  const nidDigitsRaw = String(nidRaw ?? "").replace(/\D/g, "");
  const phoneDigitsRaw = String(phoneRaw ?? "").replace(/\D/g, "");
  if (nidDigitsRaw.length > 0 && nidDigitsRaw.length < 10 && nationalId.length === 10) {
    notes.push("صفر پیشوند کدملی ترمیم شد");
  }
  if (phoneDigitsRaw.length === 10 && phoneDigitsRaw.startsWith("9") && phone.startsWith("09")) {
    notes.push("صفر پیشوند موبایل ترمیم شد");
  }
  if (firstName.length < 2) reasons.push("نام الزامی است");
  if (lastName.length < 2) reasons.push("نام‌خانوادگی الزامی است");
  if (!isValidIranNationalId(nationalId)) reasons.push("کدملی نامعتبر است");
  if (!isValidIranMobile(phone)) reasons.push("موبایل نامعتبر است");
  if (!birthParsed.ok) reasons.push(birthParsed.reason);
  if (gender !== "مرد" && gender !== "زن") reasons.push("جنسیت باید مرد یا زن باشد");

  return {
    lineNo,
    firstName,
    lastName,
    nationalId,
    phone,
    birthDateIso: birthParsed.ok ? birthParsed.iso : null,
    birthDateRaw: birthRaw,
    gender,
    maritalStatus,
    department,
    jobCategory,
    personnelCode,
    fatherName,
    scheduledVisitDateIso: visitParsed?.ok ? visitParsed.iso : null,
    scheduledVisitDateRaw: visitRaw,
    pathwayCodeOrGroup,
    status: reasons.length ? "invalid" : "ready",
    reason: reasons.length ? reasons.join("؛ ") : notes.length ? notes.join("؛ ") : null,
  };
}

export function parseRowsWithMapping(
  rawRows: string[][],
  mapping: ColumnMapping,
  headerRowIndex: number,
): Omit<ParseImportResult, "needsMapping" | "fileColumns" | "suggestedMapping" | "rawRows" | "headerRowIndex"> & {
  rows: ImportPreviewRow[];
} {
  const rows: ImportPreviewRow[] = [];
  let skipped = 0;

  rawRows.forEach((cols, index) => {
    const lineNo = index + 1;
    if (index === headerRowIndex) {
      rows.push(emptyMetaRow(lineNo, "header", "ردیف عنوان"));
      return;
    }
    if (isBlankRow(cols)) {
      skipped++;
      rows.push(emptyMetaRow(lineNo, "skipped", "وقفه / ردیف خالی"));
      return;
    }
    if (looksLikeHeaderRow(cols, mapping)) {
      skipped++;
      rows.push(emptyMetaRow(lineNo, "header", "تکرار عنوان ستون‌ها"));
      return;
    }
    // فقط شماره ردیف بدون هویت
    const nidIdx = mapping.nationalId;
    const nameIdx = mapping.firstName;
    if (
      (!nidIdx || !cellAt(cols, nidIdx)) &&
      (!nameIdx || cellAt(cols, nameIdx).length < 2) &&
      cols.filter((c) => String(c ?? "").trim()).length <= 1
    ) {
      skipped++;
      rows.push(emptyMetaRow(lineNo, "skipped", "ردیف بدون دادهٔ هویتی"));
      return;
    }
    rows.push(buildRow(lineNo, cols, mapping));
  });

  const readyCount = rows.filter((r) => r.status === "ready").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;
  return { rows, readyCount, invalidCount, skipped };
}

function emptyMetaRow(lineNo: number, status: ImportPreviewStatus, reason: string): ImportPreviewRow {
  return {
    lineNo,
    firstName: "",
    lastName: "",
    nationalId: "",
    phone: "",
    birthDateIso: null,
    birthDateRaw: "",
    gender: "",
    maritalStatus: "",
    department: "",
    jobCategory: "",
    personnelCode: "",
    fatherName: "",
    scheduledVisitDateIso: null,
    scheduledVisitDateRaw: "",
    pathwayCodeOrGroup: "",
    status,
    reason,
  };
}

export function finalizeImportParse(
  rawRows: string[][],
  mapping: ColumnMapping,
  headerRowIndex: number,
  fileColumns: string[],
): ParseImportResult {
  const parsed = parseRowsWithMapping(rawRows, mapping, headerRowIndex);
  return {
    ...parsed,
    needsMapping: false,
    fileColumns,
    suggestedMapping: mapping,
    rawRows,
    headerRowIndex,
  };
}

export function analyzeImportGrid(rawRows: string[][]): ParseImportResult {
  if (!rawRows.length) {
    return {
      rows: [],
      readyCount: 0,
      invalidCount: 0,
      skipped: 0,
      needsMapping: true,
      fileColumns: [],
      suggestedMapping: {},
      rawRows: [],
      headerRowIndex: 0,
    };
  }

  const best = findBestHeaderRow(rawRows);
  const headerCols = rawRows[best.headerRowIndex] ?? [];
  const fileColumns = headerCols.map((c, i) => (String(c ?? "").trim() || `ستون ${i + 1}`));

  if (!mappingCoversRequired(best.mapping)) {
    return {
      rows: [],
      readyCount: 0,
      invalidCount: 0,
      skipped: 0,
      needsMapping: true,
      fileColumns,
      suggestedMapping: best.mapping,
      rawRows,
      headerRowIndex: best.headerRowIndex,
    };
  }

  return finalizeImportParse(rawRows, best.mapping, best.headerRowIndex, fileColumns);
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export function parseTabularText(rawText: string): string[][] {
  const cleaned = rawText.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];

  if (/<table[\s>]/i.test(cleaned) && typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(cleaned, "text/html");
    const rawRows: string[][] = [];
    doc.querySelectorAll("tr").forEach((tr) => {
      const cells = Array.from(tr.querySelectorAll("td,th")).map((c) => (c.textContent ?? "").trim());
      if (cells.some(Boolean)) rawRows.push(cells);
    });
    return rawRows;
  }

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const sample = lines[0] ?? "";
  const delimiter = sample.includes("\t") ? "\t" : sample.includes(";") ? ";" : ",";
  return lines.map((line) => splitCsvLine(line, delimiter));
}

export function parseExcelArrayBuffer(buffer: ArrayBuffer): string[][] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as string[][];
  return aoa.map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? "").trim()) : []));
}

/** سازگاری با فراخوانی‌های قدیمی — فقط متن HTML/CSV */
export function parseExcelOrCsvText(rawText: string): ParseImportResult {
  return analyzeImportGrid(parseTabularText(rawText));
}

export async function parseImportFile(file: File): Promise<ParseImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || file.type.includes("sheet") || file.type.includes("excel")) {
    // .xls قالب HTML تمپلیت ما را هم پوشش می‌دهد؛ اگر باینری نبود به متن برمی‌گردیم
    const buffer = await file.arrayBuffer();
    try {
      const rows = parseExcelArrayBuffer(buffer);
      if (rows.length > 0 && rows.some((r) => r.some(Boolean))) return analyzeImportGrid(rows);
    } catch {
      /* fallthrough */
    }
    const text = new TextDecoder("utf-8").decode(buffer);
    return analyzeImportGrid(parseTabularText(text));
  }
  return analyzeImportGrid(parseTabularText(await file.text()));
}

export function previewRowToExternalPerson(r: ImportPreviewRow): {
  personnelCode: string;
  fullName: string;
  nationalId: string;
  phone: string;
  age: number;
  gender: "مرد" | "زن";
  department: string;
  jobCategory: string;
} {
  return {
    personnelCode: r.personnelCode || `EX-${r.lineNo}`,
    fullName: displayFullName(r.firstName, r.lastName),
    nationalId: r.nationalId,
    phone: r.phone,
    age: ageFromBirthIso(r.birthDateIso) ?? 0,
    gender: r.gender === "زن" ? "زن" : "مرد",
    department: r.department || "عمومی سازمان",
    jobCategory: r.jobCategory || "اداری و مالی",
  };
}
