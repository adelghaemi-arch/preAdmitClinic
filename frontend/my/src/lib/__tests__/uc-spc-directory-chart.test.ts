/*
 File: frontend/my/src/lib/__tests__/uc-spc-directory-chart.test.ts
 Description: UC-SPC — نگاشت فهرست/chart پزشک و اولویت بالینی
 Parent Dependencies: specialist-patient-map, form-engine, test-fixtures
 */

import { describe, expect, it } from "vitest";
import {
  isClinicalPriorityAnswer,
  mapApiPatientToDirectoryRow,
  mergeSpecialistChart,
} from "@/lib/specialist-patient-map";
import { answersBySection } from "@/lib/form-engine";
import { minimalPatient } from "./test-fixtures";
import type { FormDefinition, FormItemDefinition, FormResponse, FormTargetAudience } from "@/types/clinic";
import type { ApiPatientDto, PatientChartApi } from "@/lib/api/patients";

const samplePatient: ApiPatientDto = {
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  firstName: "علی",
  lastName: "رضایی",
  fullName: "علی رضایی",
  nationalId: "0012345678",
  phone: "09121112222",
  age: 40,
  gender: "مرد",
  intakeCompleted: true,
  assignedPathwayTitle: "چکاپ",
};

const audience: FormTargetAudience = { gender: "همه", ageMin: null, ageMax: null };

function item(overrides: Partial<FormItemDefinition> = {}): FormItemDefinition {
  return {
    id: "item-1",
    sectionId: "sec-1",
    code: "TEST_Q1",
    labelFa: "سوال",
    sortOrder: 1,
    inputType: "yn_unk",
    required: true,
    visibilityRules: [],
    helpText: "",
    notesPolicy: "optional",
    coding: {
      snomed: [],
      loinc: [],
      icd10: [],
      umls: [],
      conceptKind: "symptom",
      aiTags: [],
    },
    ...overrides,
  };
}

describe("UC-SPC-01 / UC-SPC-02", () => {
  it("mapApiPatientToDirectoryRow: نام، کدملی، موبایل برای ردیف فهرست", () => {
    const row = mapApiPatientToDirectoryRow(samplePatient);
    expect(row.fullName).toBe("علی رضایی");
    expect(row.nationalId).toBe("0012345678");
    expect(row.phone).toBe("09121112222");
    expect(row.intakeCompleted).toBe(true);
    expect(row.localId).toBeGreaterThan(0);
    expect(row.serverId).toBe(samplePatient.id);
  });
});

describe("UC-SPC-04 / UC-SPC-06", () => {
  it("mergeSpecialistChart: پاسخ و مدارک را روی پرونده می‌نشاند", () => {
    const chart: PatientChartApi = {
      patient: samplePatient,
      formStatus: "Submitted",
      formId: "form-1",
      formCode: "F1",
      documents: [],
      portraitStorageKey: "p/key",
    };
    const fr: FormResponse = {
      id: "r1",
      patientId: 1,
      formId: "form-1",
      formCode: "F1",
      formVersion: 1,
      formVersionId: "form-1",
      status: "submitted",
      startedAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:00:00Z",
      answers: [{ itemCode: "q1", valueCode: "yes", valueRaw: "", notes: "درد", skippedByRule: false }],
      context: { gender: "مرد", age: 40, maritalStatus: "" },
    };
    const docs = [
      {
        id: "g1",
        documentType: "lab_blood" as const,
        typeLabelFa: "آزمایش خون / بیوشیمی",
        note: null,
        documentDate: null,
        files: [
          {
            id: "f1",
            fileName: "cbc.pdf",
            mimeType: "application/pdf",
            dataUrl: "blob:x",
            storageKey: "k",
            documentDate: null,
          },
        ],
        uploadedAt: "2026-01-01T00:00:00Z",
      },
    ];
    const merged = mergeSpecialistChart(chart, fr, docs);
    expect(merged.intakeCompleted).toBe(true);
    expect(merged.hasPortrait).toBe(true);
    expect(merged.formResponses).toHaveLength(1);
    expect(merged.intakeDocuments).toHaveLength(1);
    expect(merged.intakeDocuments?.[0].files[0].fileName).toBe("cbc.pdf");
  });
});

describe("UC-SPC-05", () => {
  it("isClinicalPriorityAnswer: مثبت/توضیح/هشدار اولویت دارند", () => {
    expect(isClinicalPriorityAnswer({ isRedFlag: true, isSpecial: false, hasNotes: false })).toBe(true);
    expect(isClinicalPriorityAnswer({ isRedFlag: false, isSpecial: true, hasNotes: false })).toBe(true);
    expect(isClinicalPriorityAnswer({ isRedFlag: false, isSpecial: false, hasNotes: true })).toBe(true);
    expect(isClinicalPriorityAnswer({ isRedFlag: false, isSpecial: false, hasNotes: false })).toBe(false);
  });

  it("answersBySection flags فقط موارد خاص را نگه می‌دارد", () => {
    const form: FormDefinition = {
      id: "f",
      code: "F",
      title: "تست",
      version: 1,
      status: "published",
      sortOrder: 1,
      warningText: "",
      targetAudience: audience,
      sections: [
        { id: "sec-1", formId: "f", code: "s1", title: "بخش", sortOrder: 1, timeWindowHint: "", guideText: "" },
      ],
      items: [
        item({
          id: "i1",
          code: "yes_item",
          labelFa: "درد قفسه؟",
          coding: {
            snomed: [],
            loinc: [],
            icd10: [],
            umls: [],
            conceptKind: "symptom",
            aiTags: ["red_flag"],
            redFlagOnYes: true,
          },
        }),
        item({
          id: "i2",
          code: "no_item",
          labelFa: "سرفه؟",
          sortOrder: 2,
          required: false,
        }),
      ],
    };
    const patient = minimalPatient({
      intakeCompleted: true,
      formResponses: [
        {
          id: "r",
          patientId: 1,
          formId: "f",
          formCode: "F",
          formVersion: 1,
          formVersionId: "f",
          status: "submitted",
          startedAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          completedAt: "2026-01-01T00:00:00Z",
          answers: [
            { itemCode: "yes_item", valueCode: "yes", valueRaw: "", notes: "شدید", skippedByRule: false },
            { itemCode: "no_item", valueCode: "no", valueRaw: "", notes: "", skippedByRule: false },
          ],
          context: { gender: "مرد", age: 40, maritalStatus: "" },
        },
      ],
    });
    const response = patient.formResponses[0];
    const flags = answersBySection(form, response, "flags");
    const full = answersBySection(form, response, "full");
    expect(flags.flatMap((b) => b.rows).map((r) => r.item.code)).toEqual(["yes_item"]);
    expect(full.flatMap((b) => b.rows).map((r) => r.item.code)).toEqual(["yes_item", "no_item"]);
  });
});
