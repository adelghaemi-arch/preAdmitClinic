/*
 File: frontend/my/src/lib/__tests__/uc-own-03-hydrate.test.ts
 Description: UC-OWN-03 — نگاشت mine + hydrate answers سرور بر prefill
 Parent Dependencies: lib/api/forms, lib/form-engine, types/clinic
 */

import { describe, expect, it } from "vitest";
import { mapMyFormResponse, mapMyFormResponseAnswers } from "@/lib/api/forms";
import { hydrateFormAnswersWithPrefill } from "@/lib/form-engine";
import type { FormAnswer, FormDefinition, FormItemDefinition, FormTargetAudience } from "@/types/clinic";

const audience: FormTargetAudience = { gender: "همه", ageMin: null, ageMax: null };

function item(overrides: Partial<FormItemDefinition> & { code: string }): FormItemDefinition {
  return {
    id: overrides.code,
    sectionId: "sec-1",
    labelFa: overrides.code,
    sortOrder: 1,
    inputType: "text",
    required: false,
    visibilityRules: [],
    helpText: "",
    notesPolicy: "optional",
    coding: {
      snomed: ["1"],
      loinc: [],
      icd10: [],
      umls: ["C1234567"],
      conceptKind: "symptom",
      aiTags: [],
    },
    ...overrides,
  };
}

function form(items: FormItemDefinition[]): FormDefinition {
  return {
    id: "f1",
    code: "CA_TEST",
    title: "فرم تست",
    version: 1,
    status: "published",
    sortOrder: 1,
    warningText: "",
    targetAudience: audience,
    sections: [
      { id: "sec-1", formId: "f1", code: "SEC1", title: "بخش", sortOrder: 1, timeWindowHint: "", guideText: "" },
    ],
    items,
  };
}

const patient = {
  fullName: "علی تست",
  nationalId: "0012345678",
  phone: "09120000000",
  age: 40,
  gender: "مرد",
  birthDate: "1991-07-31" as string | null,
  maritalStatus: "متأهل" as string | null,
  homeLat: 35.7,
  homeLon: 51.4,
  homeAddress: "تهران خیابان تست",
  homePlaque: "12",
  homeUnit: null as string | null,
  homePostalCode: null as string | null,
};

describe("UC-OWN-03 hydrate (UT-FE-OWN-03)", () => {
  it("mapMyFormResponseAnswers: DTO سرور → FormAnswer", () => {
    const mapped = mapMyFormResponseAnswers([
      { itemCode: "CA_M_BASE_birthDate", valueCode: null, valueRaw: "1370-01-01", notes: null },
      { itemCode: "CA_M_Q_height", valueCode: null, valueRaw: "178", notes: "" },
      { itemCode: "CA_M_Q1", valueCode: "yes", valueRaw: "yes", notes: "یادداشت", skippedByRule: false },
    ]);
    expect(mapped).toHaveLength(3);
    expect(mapped[0]).toMatchObject({
      itemCode: "CA_M_BASE_birthDate",
      valueCode: null,
      valueRaw: "1370-01-01",
      notes: "",
    });
    expect(mapped[2].valueCode).toBe("yes");
    expect(mapped[2].notes).toBe("یادداشت");
  });

  it("mapMyFormResponse: status draft/submitted", () => {
    const draft = mapMyFormResponse({
      id: "r1",
      patientId: "p1",
      formId: "f1",
      formCode: "CA_TEST",
      status: "Draft",
      answers: [],
    });
    expect(draft.status).toBe("draft");
    const submitted = mapMyFormResponse({
      id: "r2",
      patientId: "p1",
      formId: "f1",
      formCode: "CA_TEST",
      status: "submitted",
      submittedAt: "2026-01-01T00:00:00+03:30",
      answers: [{ itemCode: "X", valueRaw: "1" }],
    });
    expect(submitted.status).toBe("submitted");
    expect(submitted.answers[0].valueRaw).toBe("1");
  });

  it("بدون draft → prefill Patient (نام/سکونت/تولد/تاهل)", () => {
    const f = form([
      item({ code: "CA_M_BASE_fullName", prefillFromPatient: "fullName", inputType: "text" }),
      item({ code: "CA_M_BASE_residence", inputType: "residence_address" }),
      item({ code: "CA_M_BASE_birthDate", inputType: "date" }),
      item({
        code: "CA_M_BASE_maritalStatus",
        inputType: "select",
        selectOptions: ["مجرد", "متأهل", "ازدواج‌کرده", "سایر"],
      }),
      item({ code: "CA_M_Q_height", inputType: "number" }),
    ]);
    const hydrated = hydrateFormAnswersWithPrefill(f, patient, null);
    expect(hydrated.find((a) => a.itemCode === "CA_M_BASE_fullName")?.valueRaw).toBe("علی تست");
    expect(hydrated.find((a) => a.itemCode === "CA_M_BASE_residence")?.valueRaw).toContain("12");
    expect(hydrated.find((a) => a.itemCode === "CA_M_BASE_birthDate")?.valueRaw).toBe("1991-07-31");
    expect(hydrated.find((a) => a.itemCode === "CA_M_BASE_maritalStatus")?.valueRaw).toBe("متأهل");
    expect(hydrated.find((a) => a.itemCode === "CA_M_Q_height")?.valueRaw).toBe("");
  });

  it("answers سرور بر prefill اولویت دارند؛ آیتم خالی/غایب از Patient پر می‌شود", () => {
    const f = form([
      item({ code: "CA_M_BASE_fullName", prefillFromPatient: "fullName", inputType: "text" }),
      item({ code: "CA_M_BASE_birthDate", inputType: "date" }),
      item({
        code: "CA_M_BASE_maritalStatus",
        inputType: "select",
        selectOptions: ["مجرد", "متأهل", "ازدواج‌کرده", "سایر"],
      }),
      item({ code: "CA_M_Q_height", inputType: "number" }),
      item({ code: "CA_M_Q_waist", inputType: "number" }),
    ]);
    const server: FormAnswer[] = [
      { itemCode: "CA_M_BASE_birthDate", valueCode: null, valueRaw: "1990-05-10", notes: "" },
      { itemCode: "CA_M_BASE_maritalStatus", valueCode: null, valueRaw: "", notes: "" },
      { itemCode: "CA_M_Q_height", valueCode: null, valueRaw: "180", notes: "" },
      { itemCode: "CA_M_Q_waist", valueCode: null, valueRaw: "90", notes: "" },
    ];
    const hydrated = hydrateFormAnswersWithPrefill(f, patient, server);
    expect(hydrated.find((a) => a.itemCode === "CA_M_BASE_fullName")?.valueRaw).toBe("علی تست");
    expect(hydrated.find((a) => a.itemCode === "CA_M_BASE_birthDate")?.valueRaw).toBe("1990-05-10");
    expect(hydrated.find((a) => a.itemCode === "CA_M_BASE_maritalStatus")?.valueRaw).toBe("متأهل");
    expect(hydrated.find((a) => a.itemCode === "CA_M_Q_height")?.valueRaw).toBe("180");
    expect(hydrated.find((a) => a.itemCode === "CA_M_Q_waist")?.valueRaw).toBe("90");
  });
});
