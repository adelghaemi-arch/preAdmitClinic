/*
 File: frontend/src/lib/api/forms.ts
 Description: نگاشت ساختار فرم API به FormDefinition فرانت + package IO
 Parent Dependencies: api/http, types/clinic
 */

import { apiFetch, getApiBaseUrl, readApiToken } from "@/lib/api/http";
import type {
  FormDefinition,
  FormItemDefinition,
  FormPublishStatus,
  FormSectionDefinition,
  FormVisibilityRule,
} from "@/types/clinic";

export interface ApiFormStructure {
  id: string;
  code: string;
  title: string;
  status: string;
  version: number;
  targetAudienceJson: string;
  warningText?: string | null;
  sections: Array<{ id: string; code: string; title: string; sortOrder: number; guideText?: string | null }>;
  items: Array<{
    id: string;
    sectionId: string;
    code: string;
    labelFa: string;
    inputType: string;
    required: boolean;
    sortOrder: number;
    visibilityRulesJson: string;
    helpText?: string | null;
    notesPolicy?: string;
    prefillFromPatient?: string | null;
    readOnlyIfPrefill?: boolean;
    selectOptionsJson?: string | null;
    codingJson: string;
  }>;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapApiFormStructure(s: ApiFormStructure, sortOrder = 0): FormDefinition {
  const audience = parseJson<{
    gender?: string;
    ageMin?: number | null;
    ageMax?: number | null;
    maritalStatuses?: string[];
  }>(s.targetAudienceJson, {});
  const gender =
    audience.gender === "مرد" || audience.gender === "زن" || audience.gender === "همه"
      ? audience.gender
      : "همه";
  const statusRaw = (s.status ?? "draft").toLowerCase();
  const status: FormPublishStatus =
    statusRaw === "published" ? "published" : statusRaw === "archived" ? "archived" : "draft";

  const sections: FormSectionDefinition[] = (s.sections ?? []).map((sec) => ({
    id: sec.id,
    formId: s.id,
    code: sec.code,
    title: sec.title,
    sortOrder: sec.sortOrder,
    timeWindowHint: "",
    guideText: sec.guideText ?? "",
  }));

  const items: FormItemDefinition[] = (s.items ?? []).map((it) => {
    const coding = parseJson<FormItemDefinition["coding"]>(it.codingJson, {
      snomed: [],
      loinc: [],
      icd10: [],
      umls: [],
      conceptKind: "symptom",
      aiTags: [],
    });
    return {
      id: it.id,
      sectionId: it.sectionId,
      code: it.code,
      labelFa: it.labelFa,
      inputType: (it.inputType as FormItemDefinition["inputType"]) || "yn_unk",
      required: it.required,
      sortOrder: it.sortOrder,
      visibilityRules: parseJson<FormVisibilityRule[]>(it.visibilityRulesJson, []),
      helpText: it.helpText ?? "",
      notesPolicy: (it.notesPolicy as FormItemDefinition["notesPolicy"]) || "never",
      prefillFromPatient: it.prefillFromPatient ?? null,
      readOnlyIfPrefill: Boolean(it.readOnlyIfPrefill),
      selectOptions: parseJson<string[] | null>(it.selectOptionsJson, null),
      coding: {
        snomed: coding.snomed ?? [],
        loinc: coding.loinc ?? [],
        icd10: coding.icd10 ?? [],
        umls: coding.umls ?? [],
        conceptKind: coding.conceptKind ?? "symptom",
        aiTags: coding.aiTags ?? [],
        redFlagOnYes: coding.redFlagOnYes,
      },
    };
  });

  return {
    id: s.id,
    code: s.code,
    title: s.title,
    version: s.version,
    status,
    sortOrder,
    warningText: s.warningText ?? "",
    targetAudience: {
      gender,
      ageMin: audience.ageMin ?? null,
      ageMax: audience.ageMax ?? null,
      maritalStatuses: audience.maritalStatuses ?? [],
    },
    sections,
    items,
  };
}

export async function fetchClinicForms(clinicId: string): Promise<FormDefinition[]> {
  const structures = await apiFetch<ApiFormStructure[]>(
    `/api/forms/structures?clinicId=${encodeURIComponent(clinicId)}`,
  );
  return structures
    .map((s, idx) => mapApiFormStructure(s, idx + 1))
    .filter((f) => f.status !== "archived")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
}

export async function downloadFormPackageJson(clinicId: string): Promise<void> {
  const data = await apiFetch<unknown>(`/api/forms/package?clinicId=${encodeURIComponent(clinicId)}`);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "form-package.json";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadFormPackageExcel(clinicId: string): Promise<void> {
  const token = readApiToken();
  const res = await fetch(
    `${getApiBaseUrl()}/api/forms/package.xlsx?clinicId=${encodeURIComponent(clinicId)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) throw new Error("دانلود Excel انجام نشد.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "form-package.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export async function uploadFormPackageJson(clinicId: string, file: File): Promise<{ importedForms: number }> {
  const text = await file.text();
  const body = JSON.parse(text) as unknown;
  return apiFetch(`/api/forms/package?clinicId=${encodeURIComponent(clinicId)}`, {
    method: "POST",
    body,
  });
}

export async function uploadFormPackageExcel(clinicId: string, file: File): Promise<{ importedForms: number }> {
  const token = readApiToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${getApiBaseUrl()}/api/forms/package.xlsx?clinicId=${encodeURIComponent(clinicId)}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "آپلود Excel انجام نشد.");
  }
  return (await res.json()) as { importedForms: number };
}

export interface SaveFormAnswerPayload {
  itemCode: string;
  valueCode?: string | null;
  valueRaw?: string | null;
  notes?: string | null;
  skippedByRule?: boolean;
}

/** draft/submit پاسخ پرسشنامه — مالک پرونده */
export async function saveFormResponse(body: {
  patientId: string;
  formId: string;
  submit: boolean;
  answers: SaveFormAnswerPayload[];
}) {
  return apiFetch(`/api/forms/responses`, {
    method: "POST",
    body: {
      patientId: body.patientId,
      formId: body.formId,
      submit: body.submit,
      answers: body.answers.map((a) => ({
        itemCode: a.itemCode,
        valueCode: a.valueCode ?? null,
        valueRaw: a.valueRaw ?? null,
        notes: a.notes ?? null,
        skippedByRule: Boolean(a.skippedByRule),
      })),
    },
  });
}
