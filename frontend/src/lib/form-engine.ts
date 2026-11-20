import catalogSeed from "@/lib/form-catalog.seed.json";
import { iranLocalDayOffset } from "@/lib/date-iso";
import { normalizeMaritalStatus } from "@/lib/marital-status";
import { buildResidenceFromPatient, isResidenceAddressComplete } from "@/lib/residence-address";
import type {
  FormAnswer,
  FormAnswerValue,
  FormDefinition,
  FormItemCoding,
  FormItemDefinition,
  FormResponse,
  FormSectionDefinition,
  FormVisibilityRule,
  PatientFullDto,
} from "@/types/clinic";

const UMLS_CUI_RE = /^C\d{7}$/;

export interface FormCodingIssue {
  itemCode: string;
  labelFa: string;
  problems: string[];
}

function normalizeConceptKind(kind: FormItemCoding["conceptKind"] | string | undefined): FormItemCoding["conceptKind"] {
  // Legacy alias: "demo" meant demographics (not product demo).
  if (kind === "demo" || kind === "demographics") return "demographics";
  if (
    kind === "symptom" ||
    kind === "history" ||
    kind === "family" ||
    kind === "lifestyle" ||
    kind === "screening" ||
    kind === "behavior"
  ) {
    return kind;
  }
  return "symptom";
}

function normalizeCoding(coding: FormItemCoding | undefined): FormItemCoding {
  return {
    snomed: coding?.snomed ?? [],
    loinc: coding?.loinc ?? [],
    icd10: coding?.icd10 ?? [],
    umls: coding?.umls ?? [],
    conceptKind: normalizeConceptKind(coding?.conceptKind),
    aiTags: coding?.aiTags ?? [],
    redFlagOnYes: coding?.redFlagOnYes,
  };
}

export function itemCodingIssues(item: FormItemDefinition): string[] {
  const coding = normalizeCoding(item.coding);
  const problems: string[] = [];
  if (!coding.umls.length) problems.push("UMLS CUI الزامی است");
  for (const cui of coding.umls) {
    if (!UMLS_CUI_RE.test(cui)) problems.push(`UMLS نامعتبر: ${cui}`);
  }
  if (!(coding.snomed.length || coding.loinc.length || coding.icd10.length)) {
    problems.push("حداقل یکی از SNOMED / LOINC / ICD-10 الزامی است");
  }
  return problems;
}

/** Admin/publish gate: every item must have UMLS + at least one terminology code. */
export function validateFormDefinitionCoding(form: FormDefinition): FormCodingIssue[] {
  return form.items
    .map((item) => {
      const problems = itemCodingIssues(item);
      return problems.length
        ? { itemCode: item.code, labelFa: item.labelFa, problems }
        : null;
    })
    .filter((row): row is FormCodingIssue => Boolean(row));
}

export interface AudienceContext {
  gender: string;
  age: number;
  maritalStatus: string;
}

export function stripSignatureParts(form: FormDefinition): FormDefinition {
  const next = structuredClone(form);
  next.sections = next.sections.filter((s) => !s.code.includes("SIG") && s.title !== "تأیید و امضا");
  const keep = new Set(next.sections.map((s) => s.id));
  next.items = next.items
    .filter((i) => keep.has(i.sectionId) && !i.code.includes("_SIG_"))
    .map((item) => {
      const coding = normalizeCoding(item.coding);
      const isCity =
        coding.aiTags.includes("city") || /_city$/i.test(item.code) || /شهر/.test(item.labelFa);
      if (isCity && item.inputType === "text") {
        return { ...item, inputType: "province_city" as const, coding };
      }
      return { ...item, coding };
    });
  return next;
}

export function loadSeedForms(): FormDefinition[] {
  return (catalogSeed as { forms: FormDefinition[] }).forms.map((f) => stripSignatureParts(f));
}

export function resolveFormForPatient(
  forms: FormDefinition[],
  gender: string,
  age?: number | null
): FormDefinition | null {
  const g = gender === "زن" ? "زن" : gender === "مرد" ? "مرد" : "";
  if (!g) return null;
  const ageNum = age == null || Number.isNaN(Number(age)) ? null : Number(age);
  const published = forms
    .filter((f) => f.status === "published")
    .filter((f) => f.targetAudience.gender === g || f.targetAudience.gender === "همه")
    .filter((f) => {
      const { ageMin, ageMax } = f.targetAudience ?? { ageMin: null, ageMax: null };
      // Unknown age: do not block; only enforce bounds when age is known.
      if (ageNum == null) return true;
      if (ageMin != null && ageNum < ageMin) return false;
      if (ageMax != null && ageNum > ageMax) return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || b.version - a.version);
  return published[0] ?? null;
}

export function evalVisibilityRule(rule: FormVisibilityRule, ctx: AudienceContext): boolean {
  const raw =
    rule.field === "maritalStatus"
      ? ctx.maritalStatus
      : rule.field === "age"
        ? ctx.age
        : ctx.gender;
  if (rule.op === "eq") return raw === rule.value;
  if (rule.op === "in") return Array.isArray(rule.value) && rule.value.map(String).includes(String(raw));
  if (rule.op === "gte") return Number(raw) >= Number(rule.value);
  if (rule.op === "lte") return Number(raw) <= Number(rule.value);
  return true;
}

export function isItemVisible(item: FormItemDefinition, ctx: AudienceContext): boolean {
  if (!item.visibilityRules?.length) return true;
  return item.visibilityRules.every((rule) => evalVisibilityRule(rule, ctx));
}

export function sectionsOf(form: FormDefinition): FormSectionDefinition[] {
  return [...form.sections].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function itemsOfSection(form: FormDefinition, sectionId: string): FormItemDefinition[] {
  return form.items.filter((i) => i.sectionId === sectionId).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Sections that still have at least one visible non-signature item for this audience. */
export function visibleSections(form: FormDefinition, ctx: AudienceContext): FormSectionDefinition[] {
  return sectionsOf(form).filter((section) =>
    itemsOfSection(form, section.id).some((item) => !item.code.includes("_SIG_") && isItemVisible(item, ctx))
  );
}

export function sectionHasVisibleItems(
  form: FormDefinition,
  sectionId: string,
  ctx: AudienceContext
): boolean {
  return itemsOfSection(form, sectionId).some((item) => !item.code.includes("_SIG_") && isItemVisible(item, ctx));
}

export function visibleItems(form: FormDefinition, ctx: AudienceContext): FormItemDefinition[] {
  return form.items.filter((i) => isItemVisible(i, ctx)).sort((a, b) => {
    const sa = form.sections.find((s) => s.id === a.sectionId)?.sortOrder ?? 0;
    const sb = form.sections.find((s) => s.id === b.sectionId)?.sortOrder ?? 0;
    return sa - sb || a.sortOrder - b.sortOrder;
  });
}

export function answerMap(answers: FormAnswer[]): Map<string, FormAnswer> {
  return new Map(answers.map((a) => [a.itemCode, a]));
}

export function getAnswer(answers: FormAnswer[], itemCode: string): FormAnswer {
  return (
    answers.find((a) => a.itemCode === itemCode) ?? {
      itemCode,
      valueCode: null,
      valueRaw: "",
      notes: "",
    }
  );
}

export function upsertAnswer(answers: FormAnswer[], next: FormAnswer): FormAnswer[] {
  const idx = answers.findIndex((a) => a.itemCode === next.itemCode);
  if (idx < 0) return [...answers, next];
  const copy = [...answers];
  copy[idx] = next;
  return copy;
}

export function deriveMaritalStatus(answers: FormAnswer[], form: FormDefinition): string {
  const maritalItem = form.items.find(
    (i) =>
      i.code.endsWith("_BASE_maritalStatus") ||
      i.code.endsWith("_DEMO_maritalStatus") ||
      i.code.includes("maritalStatus")
  );
  if (!maritalItem) return "";
  const direct = getAnswer(answers, maritalItem.code).valueRaw.trim();
  const raw = direct
    ? direct
    : (() => {
        // Legacy answers keyed with _DEMO_ while catalog now uses _BASE_
        const legacyCode = maritalItem.code.replace("_BASE_", "_DEMO_");
        if (legacyCode !== maritalItem.code) {
          return getAnswer(answers, legacyCode).valueRaw.trim();
        }
        return "";
      })();
  // مطلقه/بیوه و املای رایج → کانونیکال کاتالوگ
  return normalizeMaritalStatus(raw) ?? raw;
}

/** Rewrite legacy demographic item codes DEMO → BASE on persisted answers. */
export function migrateDemoItemCodesInAnswers(answers: FormAnswer[]): FormAnswer[] {
  return answers.map((a) => {
    if (!a?.itemCode?.includes("_DEMO_")) return a;
    return { ...a, itemCode: a.itemCode.replace(/_DEMO_/g, "_BASE_") };
  });
}

export function buildContext(
  patient: Pick<PatientFullDto, "gender" | "age" | "maritalStatus">,
  answers: FormAnswer[],
  form: FormDefinition
): AudienceContext {
  const fromForm = deriveMaritalStatus(answers, form);
  const fromPatient = normalizeMaritalStatus(patient.maritalStatus) ?? patient.maritalStatus?.trim() ?? "";
  return {
    gender: patient.gender,
    age: patient.age,
    // پاسخ فرم اولویت دارد؛ وگرنه پروفایل نرمال‌شده
    maritalStatus: fromForm || fromPatient || "",
  };
}

export function isFormDateItem(item: FormItemDefinition): boolean {
  return item.code.includes("formDate") || Boolean(item.coding?.aiTags?.includes("formDate"));
}

export function prefillValue(
  item: FormItemDefinition,
  patient: Pick<
    PatientFullDto,
    | "fullName"
    | "nationalId"
    | "phone"
    | "age"
    | "gender"
    | "homeLat"
    | "homeLon"
    | "homeAddress"
    | "homePlaque"
    | "homeUnit"
    | "homePostalCode"
  >
): string {
  if (isFormDateItem(item)) return iranLocalDayOffset(0);
  // آدرس سکونت از ستون‌های Patient — حتی بدون prefillFromPatient صریح
  if (item.inputType === "residence_address") {
    return buildResidenceFromPatient(patient);
  }
  const key = item.prefillFromPatient;
  if (!key) return "";
  if (key === "fullName") return patient.fullName ?? "";
  if (key === "nationalId") return patient.nationalId ?? "";
  if (key === "phone") return patient.phone ?? "";
  if (key === "homeAddress" || key === "residence") {
    return buildResidenceFromPatient(patient);
  }
  return "";
}

export function isItemComplete(item: FormItemDefinition, answer: FormAnswer, visible: boolean): boolean {
  if (!visible) return true;
  if (!item.required) return true;
  if (item.inputType === "yn_unk") {
    if (!answer.valueCode) return false;
    if (item.notesPolicy === "required_if_yes" && answer.valueCode === "yes" && !answer.notes.trim()) return false;
    return true;
  }
  if (item.inputType === "residence_address") {
    return isResidenceAddressComplete(answer.valueRaw);
  }
  return Boolean(answer.valueRaw.trim());
}

export function validateForm(
  form: FormDefinition,
  answers: FormAnswer[],
  ctx: AudienceContext
): { ok: boolean; missingCodes: string[]; message: string } {
  const missing: string[] = [];
  for (const item of form.items) {
    if (item.code.includes("_SIG_")) continue;
    const visible = isItemVisible(item, ctx);
    const ans = getAnswer(answers, item.code);
    if (visible && !isItemComplete(item, ans, true)) missing.push(item.code);
  }
  if (!missing.length) return { ok: true, missingCodes: [], message: "" };
  return {
    ok: false,
    missingCodes: missing,
    message: `${missing.length} مورد هنوز تکمیل نشده است.`,
  };
}

export function syncSkippedAnswers(
  form: FormDefinition,
  answers: FormAnswer[],
  ctx: AudienceContext
): FormAnswer[] {
  const next = [...answers];
  for (const item of form.items) {
    const visible = isItemVisible(item, ctx);
    const idx = next.findIndex((a) => a.itemCode === item.code);
    if (!visible) {
      const skipped: FormAnswer = {
        itemCode: item.code,
        valueCode: null,
        valueRaw: "",
        notes: "",
        skippedByRule: true,
      };
      if (idx < 0) next.push(skipped);
      else next[idx] = skipped;
    } else if (idx >= 0 && next[idx].skippedByRule) {
      next[idx] = { ...next[idx], skippedByRule: false };
    }
  }
  return next;
}

export function sectionProgress(
  form: FormDefinition,
  sectionId: string,
  answers: FormAnswer[],
  ctx: AudienceContext
): { total: number; done: number } {
  const items = itemsOfSection(form, sectionId).filter((i) => isItemVisible(i, ctx));
  const done = items.filter((i) => isItemComplete(i, getAnswer(answers, i.code), true)).length;
  return { total: items.length, done };
}

export function overallProgress(
  form: FormDefinition,
  answers: FormAnswer[],
  ctx: AudienceContext
): { total: number; done: number; pct: number } {
  const items = visibleItems(form, ctx);
  const done = items.filter((i) => isItemComplete(i, getAnswer(answers, i.code), true)).length;
  const total = items.length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function latestResponseForForm(
  responses: FormResponse[] | undefined,
  formId: string
): FormResponse | null {
  if (!responses?.length) return null;
  return (
    [...responses]
      .filter((r) => r.formId === formId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null
  );
}

export function submittedResponse(patient: PatientFullDto): FormResponse | null {
  const list = patient.formResponses ?? [];
  return (
    [...list]
      .filter((r) => r.status === "submitted")
      .sort((a, b) => new Date(b.completedAt ?? b.updatedAt).getTime() - new Date(a.completedAt ?? a.updatedAt).getTime())[0] ?? null
  );
}

export function isRedFlagItem(item: FormItemDefinition): boolean {
  const coding = normalizeCoding(item.coding);
  return Boolean(coding.redFlagOnYes) || coding.aiTags.includes("red_flag");
}

export function resolveFormFromResponse(
  forms: FormDefinition[],
  response: FormResponse | null | undefined
): FormDefinition | null {
  if (!response) return null;
  return forms.find((f) => f.id === response.formId) ?? null;
}

export type FormAnswerRow = {
  item: FormItemDefinition;
  answer: FormAnswer;
  isRedFlag: boolean;
  hasNotes: boolean;
  isSpecial: boolean;
};

export function hasAnswerContent(item: FormItemDefinition, answer: FormAnswer): boolean {
  if (answer.skippedByRule) return false;
  if (item.inputType === "yn_unk") return Boolean(answer.valueCode);
  return Boolean(answer.valueRaw.trim());
}

export function isSpecialCaseAnswer(item: FormItemDefinition, answer: FormAnswer): boolean {
  if (answer.skippedByRule) return false;
  const notes = answer.notes.trim();
  if (notes && (item.inputType !== "yn_unk" || answer.valueCode === "yes")) return true;
  if (item.inputType === "yn_unk" && answer.valueCode === "yes") return true;
  return false;
}

export function redFlagAnswers(
  form: FormDefinition,
  response: FormResponse
): Array<{ item: FormItemDefinition; answer: FormAnswer }> {
  const map = answerMap(response.answers);
  return form.items
    .filter((item) => isRedFlagItem(item))
    .map((item) => ({ item, answer: map.get(item.code) ?? getAnswer(response.answers, item.code) }))
    .filter(({ answer }) => answer.valueCode === "yes" && !answer.skippedByRule);
}

export function specialCaseAnswers(form: FormDefinition, response: FormResponse): FormAnswerRow[] {
  const map = answerMap(response.answers);
  return form.items
    .map((item) => {
      const answer = map.get(item.code) ?? getAnswer(response.answers, item.code);
      const isRedFlag = isRedFlagItem(item) && answer.valueCode === "yes" && !answer.skippedByRule;
      const hasNotes =
        Boolean(answer.notes.trim()) &&
        !answer.skippedByRule &&
        (item.inputType !== "yn_unk" || answer.valueCode === "yes");
      const isSpecial = isSpecialCaseAnswer(item, answer) || isRedFlag;
      return { item, answer, isRedFlag, hasNotes, isSpecial };
    })
    .filter((row) => row.isSpecial)
    .sort((a, b) => {
      const sa = form.sections.find((s) => s.id === a.item.sectionId)?.sortOrder ?? 0;
      const sb = form.sections.find((s) => s.id === b.item.sectionId)?.sortOrder ?? 0;
      return sa - sb || a.item.sortOrder - b.item.sortOrder;
    });
}

export type SectionAnswerBundle = {
  section: FormSectionDefinition;
  rows: FormAnswerRow[];
  flagCount: number;
  specialCount: number;
};

export function answersBySection(
  form: FormDefinition,
  response: FormResponse,
  mode: "flags" | "full"
): SectionAnswerBundle[] {
  const map = answerMap(response.answers);
  return sectionsOf(form)
    .map((section) => {
      const rows = itemsOfSection(form, section.id)
        .map((item) => {
          const answer = map.get(item.code) ?? getAnswer(response.answers, item.code);
          const isRedFlag = isRedFlagItem(item) && answer.valueCode === "yes" && !answer.skippedByRule;
          const hasNotes =
            Boolean(answer.notes.trim()) &&
            !answer.skippedByRule &&
            (item.inputType !== "yn_unk" || answer.valueCode === "yes");
          const isSpecial = isSpecialCaseAnswer(item, answer) || isRedFlag;
          return { item, answer, isRedFlag, hasNotes, isSpecial };
        })
        .filter((row) => {
          if (!hasAnswerContent(row.item, row.answer)) return false;
          if (mode === "flags") return row.isSpecial;
          return true;
        });
      return {
        section,
        rows,
        flagCount: rows.filter((r) => r.isRedFlag).length,
        specialCount: rows.filter((r) => r.isSpecial).length,
      };
    })
    .filter((bundle) => bundle.rows.length > 0);
}

export function specialCasesBySection(form: FormDefinition, response: FormResponse): SectionAnswerBundle[] {
  return answersBySection(form, response, "flags");
}

/** Build a complete submitted demo response for physician cartable testing. */
export function buildDemoSubmittedResponse(
  patient: Pick<PatientFullDto, "id" | "gender" | "age" | "fullName" | "nationalId" | "phone">,
  form: FormDefinition,
  highlightCodes: string[] = []
): FormResponse {
  const highlight = new Set(highlightCodes);
  const maritalItem = form.items.find((i) => i.code.includes("maritalStatus"));
  const answers: FormAnswer[] = form.items.map((item) => {
    if (item.code.includes("_SIG_")) {
      return { itemCode: item.code, valueCode: null, valueRaw: "", notes: "", skippedByRule: true };
    }
    if (highlight.has(item.code) && item.inputType === "yn_unk") {
      return {
        itemCode: item.code,
        valueCode: "yes" as const,
        valueRaw: "",
        notes: "توضیح ثبت‌شده توسط سلامتجو برای مرور پزشک",
      };
    }
    if (item.inputType === "yn_unk") {
      return { itemCode: item.code, valueCode: "no" as const, valueRaw: "", notes: "" };
    }
    if (item.inputType === "select" && item.selectOptions?.length) {
      return {
        itemCode: item.code,
        valueCode: null,
        valueRaw: item.code.includes("maritalStatus")
          ? item.selectOptions.find((o) => o.includes("تاهل") || o.includes("تأهل")) ?? item.selectOptions[0]
          : item.selectOptions[0],
        notes: "",
      };
    }
    if (item.inputType === "number") {
      const raw =
        item.code.includes("height") ? "170" : item.code.includes("weight") ? "72" : item.code.includes("waist") ? "90" : "1";
      return { itemCode: item.code, valueCode: null, valueRaw: raw, notes: "" };
    }
    if (item.inputType === "date" || isFormDateItem(item)) {
      return { itemCode: item.code, valueCode: null, valueRaw: iranLocalDayOffset(0), notes: "" };
    }
    if (item.inputType === "province_city") {
      return { itemCode: item.code, valueCode: null, valueRaw: "تهران / تهران", notes: "" };
    }
    const prefilled = prefillValue(item, patient);
    return { itemCode: item.code, valueCode: null, valueRaw: prefilled || "—", notes: "" };
  });
  const ctx = buildContext(patient, answers, form);
  const synced = syncSkippedAnswers(form, answers, ctx);
  const now = new Date().toISOString();
  const maritalRaw = maritalItem ? getAnswer(synced, maritalItem.code).valueRaw : ctx.maritalStatus;
  return {
    id: `demo_resp_${patient.id}_${form.id}`,
    patientId: patient.id,
    formId: form.id,
    formCode: form.code,
    formVersion: form.version,
    formVersionId: formVersionId(form),
    status: "submitted",
    startedAt: now,
    updatedAt: now,
    completedAt: now,
    answers: synced,
    context: {
      gender: patient.gender,
      age: patient.age,
      maritalStatus: maritalRaw || "متأهل",
    },
  };
}

export function buildAiPayload(form: FormDefinition, response: FormResponse) {
  const map = answerMap(response.answers);
  return {
    formCode: form.code,
    formVersion: form.version,
    formVersionId: response.formVersionId,
    audience: {
      gender: response.context.gender,
      age: response.context.age,
      maritalStatus: response.context.maritalStatus,
    },
    status: response.status,
    completedAt: response.completedAt,
    decisionSupportOnly: true,
    items: form.items
      .map((item) => {
        const answer = map.get(item.code) ?? getAnswer(response.answers, item.code);
        const section = form.sections.find((s) => s.id === item.sectionId);
        return {
          itemCode: item.code,
          section: section?.code ?? "",
          sectionTitle: section?.title ?? "",
          label: item.labelFa,
          value: answer.skippedByRule ? "skipped" : answer.valueCode ?? answer.valueRaw,
          notes:
            item.inputType === "yn_unk" && answer.valueCode !== "yes" ? "" : answer.notes,
          skippedByRule: Boolean(answer.skippedByRule),
          coding: (() => {
            const coding = normalizeCoding(item.coding);
            return {
              snomed: coding.snomed,
              loinc: coding.loinc,
              icd10: coding.icd10,
              umls: coding.umls,
              conceptKind: coding.conceptKind,
              aiTags: coding.aiTags,
              redFlagOnYes: Boolean(coding.redFlagOnYes),
            };
          })(),
        };
      })
      .filter((row) => row.value !== "skipped"),
  };
}

export function ynLabel(value: FormAnswerValue): string {
  if (value === "yes") return "بله";
  if (value === "no") return "خیر";
  if (value === "unknown") return "نمی‌دانم";
  return "—";
}

export function formVersionId(form: FormDefinition): string {
  return `${form.id}__v${form.version}`;
}
