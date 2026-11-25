/*
 File: frontend/my/src/lib/intake-pdf-render.ts
 Description: مدل و HTML پیش‌نمایش پرسشنامه؛ دانلود PDF از API Chromium است
 Parent Dependencies: form-engine, intake-pdf, persian
 */

import type { ApiMemberSubmittedFormDto } from "@/lib/api/contracts";
import {
  answersBySection,
  resolveFormFromResponse,
  submittedResponse,
  ynLabel,
  type SectionAnswerBundle,
} from "@/lib/form-engine";
import {
  buildPatientForIntakePdf,
  type IntakePdfBrandInput,
} from "@/lib/intake-pdf";
import { isIsoDay } from "@/lib/date-iso";
import { formatFaDate, formatFaDateTime, toFaDigits } from "@/lib/persian";
import type { FormAnswerValue, FormDefinition } from "@/types/clinic";

/** حاشیهٔ صفحهٔ A4 به میلی‌متر — هم‌تراز قالب سرور */
export const INTAKE_PDF_PAGE_MARGIN_MM = 12;

export type IntakePdfRow = {
  label: string;
  value: string;
  notes: string;
  isRedFlag: boolean;
  hasNotes: boolean;
};

export type IntakePdfSection = {
  title: string;
  rows: IntakePdfRow[];
  flagCount: number;
};

export type IntakePdfModel = {
  fullName: string;
  nationalId: string;
  ageLabel: string;
  gender: string;
  organizationName: string;
  formTitle: string;
  formCode: string;
  submittedLabel: string;
  hospitalLabel: string;
  hospitalLogoSrc: string | null;
  partnerLogoSrc: string | null;
  sections: IntakePdfSection[];
  totalAnswers: number;
  flagTotal: number;
};

function formatRowValue(
  inputType: string,
  valueCode: string | null,
  valueRaw: string
): string {
  if (inputType === "yn_unk") return ynLabel((valueCode as FormAnswerValue) ?? null);
  if (inputType === "date" && isIsoDay(valueRaw)) return formatFaDate(valueRaw);
  return valueRaw.trim() || "—";
}

export function buildIntakePdfModel(
  dto: ApiMemberSubmittedFormDto,
  forms: FormDefinition[],
  brand: IntakePdfBrandInput
): IntakePdfModel {
  const patient = buildPatientForIntakePdf(dto);
  const response = submittedResponse(patient);
  const form = resolveFormFromResponse(forms, response);
  const bundles: SectionAnswerBundle[] =
    form && response ? answersBySection(form, response, "full") : [];

  const sections: IntakePdfSection[] = bundles.map((b) => ({
    title: b.section.title,
    flagCount: b.flagCount,
    rows: b.rows.map((row) => ({
      label: row.item.labelFa,
      value: formatRowValue(row.item.inputType, row.answer.valueCode, row.answer.valueRaw),
      notes: row.hasNotes || row.answer.notes.trim() ? row.answer.notes.trim() : "",
      isRedFlag: row.isRedFlag,
      hasNotes: row.hasNotes || Boolean(row.answer.notes.trim()),
    })),
  }));

  const totalAnswers = sections.reduce((n, s) => n + s.rows.length, 0);
  const flagTotal = sections.reduce((n, s) => n + s.flagCount, 0);
  const hospitalName = (brand.hospitalName || "").trim() || "بیمارستان";

  return {
    fullName: dto.fullName,
    nationalId: dto.nationalId,
    ageLabel: dto.age != null ? `${toFaDigits(dto.age)} سال` : "—",
    gender: dto.gender ?? "—",
    organizationName: (brand.organizationName || dto.organizationName || "").trim() || "—",
    formTitle: dto.formTitle || dto.formCode || "پرسشنامه پیش‌پذیرش",
    formCode: dto.formCode || "—",
    submittedLabel: dto.submittedAt ? formatFaDateTime(dto.submittedAt) : "—",
    hospitalLabel: hospitalName,
    hospitalLogoSrc: brand.hospitalLogoUrl?.trim() || null,
    partnerLogoSrc: brand.partnerLogoUrl?.trim() || null,
    sections,
    totalAnswers,
    flagTotal,
  };
}

/** HTML سبک برای تست واحد پیش‌نمایش (دانلود واقعی از API است). */
export function buildIntakePdfHtml(model: IntakePdfModel): string {
  const hasOrg = model.organizationName && model.organizationName !== "—";
  return `<!doctype html><html lang="fa" dir="rtl"><body>
<div id="intake-pdf-root" style="padding:52px">
  <div class="clinic">${escapeHtml(model.hospitalLabel)}</div>
  <h1>گزارش پرسشنامه پیش‌پذیرش</h1>
  <div>سازمان طرف‌قرارداد: ${escapeHtml(model.organizationName)}</div>
  <div dir="ltr">${toFaDigits(model.nationalId)}</div>
  ${hasOrg ? "" : ""}
  <style>.sec-num{line-height:28px}</style>
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
