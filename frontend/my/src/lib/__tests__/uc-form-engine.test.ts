/*
 File: frontend/src/lib/__tests__/uc-form-engine.test.ts
 Description: تست coding/audience (UC-ADM) و answersForSection draft بخش‌محور (UC-OWN-03)
 Parent Dependencies: lib/form-engine, types/clinic
 */

import { describe, expect, it } from "vitest";
import {
  answersForSection,
  buildContext,
  evalVisibilityRule,
  hydrateFormAnswersWithPrefill,
  isItemVisible,
  isPersistableFormItem,
  isProfileIdentityItem,
  isUserFacingFormItem,
  itemCodingIssues,
  overallProgress,
  resolveFormForPatient,
  validateForm,
  validateFormDefinitionCoding,
  type AudienceContext,
} from "@/lib/form-engine";
import type { FormAnswer, FormDefinition, FormItemDefinition, FormTargetAudience } from "@/types/clinic";

const audience: FormTargetAudience = { gender: "همه", ageMin: null, ageMax: null };

function minimalItem(overrides: Partial<FormItemDefinition> = {}): FormItemDefinition {
  return {
    id: "item-1",
    sectionId: "sec-1",
    code: "TEST_Q1",
    labelFa: "سوال آزمایش",
    sortOrder: 1,
    inputType: "yes_no",
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

function minimalForm(items: FormItemDefinition[]): FormDefinition {
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

describe("UC-ADM-09", () => {
  it("validateFormDefinitionCoding: بدون UMLS خطا می‌دهد", () => {
    const form = minimalForm([minimalItem()]);
    const issues = validateFormDefinitionCoding(form);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].problems.some((p) => p.includes("UMLS"))).toBe(true);
  });

  it("itemCodingIssues: UMLS نامعتبر", () => {
    const problems = itemCodingIssues(
      minimalItem({
        coding: { snomed: ["x"], loinc: [], icd10: [], umls: ["BAD"], conceptKind: "symptom", aiTags: [] },
      })
    );
    expect(problems.some((p) => p.includes("UMLS نامعتبر"))).toBe(true);
  });
});

describe("UC-ADM-10", () => {
  it("validateFormDefinitionCoding: UMLS + SNOMED معتبر بدون مشکل", () => {
    const form = minimalForm([
      minimalItem({
        coding: {
          snomed: ["123"],
          loinc: [],
          icd10: [],
          umls: ["C1234567"],
          conceptKind: "symptom",
          aiTags: [],
        },
      }),
    ]);
    expect(validateFormDefinitionCoding(form)).toEqual([]);
  });

  it("resolveFormForPatient: جنسیت و سن مخاطب", () => {
    const forms: FormDefinition[] = [
      minimalForm([
        minimalItem({
          coding: { snomed: ["1"], loinc: [], icd10: [], umls: ["C1234567"], conceptKind: "symptom", aiTags: [] },
        }),
      ]),
    ];
    forms[0].targetAudience = { gender: "مرد", ageMin: 18, ageMax: 65 };
    expect(resolveFormForPatient(forms, "مرد", 30)?.code).toBe("CA_TEST");
    expect(resolveFormForPatient(forms, "مرد", 10)).toBeNull();
  });
});

describe("UC-ADM-19", () => {
  it("evalVisibilityRule: سن gte/lte", () => {
    const ctx: AudienceContext = { gender: "مرد", age: 40, maritalStatus: "متأهل" };
    expect(evalVisibilityRule({ field: "age", op: "gte", value: 18 }, ctx)).toBe(true);
    expect(evalVisibilityRule({ field: "age", op: "lte", value: 30 }, ctx)).toBe(false);
  });

  it("evalVisibilityRule: تاهل in", () => {
    const married: AudienceContext = { gender: "زن", age: 35, maritalStatus: "متأهل" };
    const single: AudienceContext = { gender: "زن", age: 35, maritalStatus: "مجرد" };
    const rule = { field: "maritalStatus" as const, op: "in" as const, value: ["متأهل", "ازدواج‌کرده"] };
    expect(evalVisibilityRule(rule, married)).toBe(true);
    expect(evalVisibilityRule(rule, single)).toBe(false);
  });
});

describe("UC-OWN-03", () => {
  it("resolveFormForPatient: زیر ageMin null", () => {
    const forms: FormDefinition[] = [
      {
        ...minimalForm([
          minimalItem({
            coding: {
              snomed: ["1"],
              loinc: [],
              icd10: [],
              umls: ["C1234567"],
              conceptKind: "symptom",
              aiTags: [],
            },
          }),
        ]),
        targetAudience: { gender: "زن", ageMin: 18, ageMax: null, maritalStatuses: [] },
      },
    ];
    expect(resolveFormForPatient(forms, "زن", 30)?.code).toBe("CA_TEST");
    expect(resolveFormForPatient(forms, "زن", 16)).toBeNull();
  });

  it("evalVisibilityRule: age gte 50 فقط برای ≥۵۰", () => {
    const young: AudienceContext = { gender: "مرد", age: 40, maritalStatus: "مجرد" };
    const older: AudienceContext = { gender: "مرد", age: 55, maritalStatus: "مجرد" };
    const rule = { field: "age" as const, op: "gte" as const, value: 50 };
    expect(evalVisibilityRule(rule, young)).toBe(false);
    expect(evalVisibilityRule(rule, older)).toBe(true);
  });

  it("buildContext: سن از تولد فرم؛ patient.age کهنه را دور می‌زند (UC-OWN-03 visibility ≥۵۰)", () => {
    const form = minimalForm([
      minimalItem({
        id: "b",
        code: "CA_M_BASE_birthDate",
        inputType: "date",
        prefillFromPatient: "birthDate",
      }),
      minimalItem({
        id: "q68",
        code: "CA_M_Q68",
        visibilityRules: [{ field: "age", op: "gte", value: 50 }],
      }),
    ]);
    const answers: FormAnswer[] = [
      { itemCode: "CA_M_BASE_birthDate", valueCode: null, valueRaw: "1970-01-15", notes: "" },
    ];
    // age ذخیره‌شده ۳۵ است ولی تولد فرم ≥۵۰ می‌سازد
    const ctx = buildContext({ gender: "مرد", age: 35, maritalStatus: "مجرد", birthDate: null }, answers, form);
    expect(ctx.age).toBeGreaterThanOrEqual(50);
    expect(isItemVisible(form.items[1], ctx)).toBe(true);
  });

  it("buildContext: بدون پاسخ تولد از birthDate پروفایل سن می‌گیرد", () => {
    const form = minimalForm([
      minimalItem({ id: "b", code: "CA_M_BASE_birthDate", inputType: "date", prefillFromPatient: "birthDate" }),
    ]);
    const ctx = buildContext(
      { gender: "مرد", age: 0, maritalStatus: "مجرد", birthDate: "1968-06-01" },
      [],
      form
    );
    expect(ctx.age).toBeGreaterThanOrEqual(50);
  });

  it("answersForSection: فقط itemCodeهای همان بخش برای draft بخش‌محور", () => {
    const form = minimalForm([
      minimalItem({ id: "i1", sectionId: "sec-1", code: "SEC1_Q1" }),
      minimalItem({ id: "i2", sectionId: "sec-1", code: "SEC1_Q2" }),
      minimalItem({ id: "i3", sectionId: "sec-2", code: "SEC2_Q1" }),
    ]);
    form.sections = [
      { id: "sec-1", formId: "f1", code: "S1", title: "بخش ۱", sortOrder: 1, timeWindowHint: "", guideText: "" },
      { id: "sec-2", formId: "f1", code: "S2", title: "بخش ۲", sortOrder: 2, timeWindowHint: "", guideText: "" },
    ];
    const answers: FormAnswer[] = [
      { itemCode: "SEC1_Q1", valueCode: "yes", valueRaw: "yes", notes: "" },
      { itemCode: "SEC1_Q2", valueCode: "no", valueRaw: "no", notes: "" },
      { itemCode: "SEC2_Q1", valueCode: "yes", valueRaw: "yes", notes: "" },
    ];
    const section1 = answersForSection(form, "sec-1", answers);
    expect(section1.map((a) => a.itemCode).sort()).toEqual(["SEC1_Q1", "SEC1_Q2"]);
    expect(answersForSection(form, "sec-2", answers)).toHaveLength(1);
    expect(answersForSection(form, "sec-2", answers)[0].itemCode).toBe("SEC2_Q1");
  });
});

describe("UC-OWN-03 identity UI", () => {
  it("نام/کدملی/موبایل در UI نیستند ولی در draft قابل persistاند", () => {
    const name = minimalItem({
      id: "n",
      code: "CA_M_BASE_fullName",
      prefillFromPatient: "fullName",
      required: true,
      coding: {
        snomed: ["1"],
        loinc: [],
        icd10: [],
        umls: ["C1234567"],
        conceptKind: "demographics",
        aiTags: ["fullName"],
      },
    });
    const height = minimalItem({
      id: "h",
      code: "CA_M_BASE_heightCm",
      inputType: "number",
      required: true,
      coding: {
        snomed: ["1"],
        loinc: [],
        icd10: [],
        umls: ["C1234567"],
        conceptKind: "demographics",
        aiTags: [],
      },
    });
    expect(isProfileIdentityItem(name)).toBe(true);
    expect(isUserFacingFormItem(name)).toBe(false);
    expect(isPersistableFormItem(name)).toBe(true);
    expect(isUserFacingFormItem(height)).toBe(true);
    const form = minimalForm([name, height]);
    const answers = [
      { itemCode: name.code, valueCode: null, valueRaw: "علی", notes: "" },
      { itemCode: height.code, valueCode: null, valueRaw: "172", notes: "" },
    ];
    expect(answersForSection(form, "sec-1", answers).map((a) => a.itemCode).sort()).toEqual(
      [height.code, name.code].sort()
    );
    expect(
      validateForm(form, [{ itemCode: height.code, valueCode: null, valueRaw: "172", notes: "" }], {
        gender: "مرد",
        age: 30,
        maritalStatus: "",
      }).ok
    ).toBe(true);
  });
});

describe("UC-OWN-04", () => {
  it("formDate: از UI/draft/validate کنار گذاشته می‌شود و prefill امروز ندارد", () => {
    const formDateItem = minimalItem({
      id: "fd",
      code: "CA_M_BASE_formDate",
      labelFa: "تاریخ تکمیل پرسشنامه",
      inputType: "date",
      required: true,
      coding: {
        snomed: [],
        loinc: [],
        icd10: [],
        umls: ["C1301886"],
        conceptKind: "demographics",
        aiTags: ["formDate"],
      },
    });
    const other = minimalItem({
      id: "q1",
      code: "CA_M_Q1",
      required: true,
      inputType: "text",
      coding: {
        snomed: ["1"],
        loinc: [],
        icd10: [],
        umls: ["C1234567"],
        conceptKind: "symptom",
        aiTags: [],
      },
    });
    const form = minimalForm([formDateItem, other]);
    expect(isUserFacingFormItem(formDateItem)).toBe(false);
    expect(isUserFacingFormItem(other)).toBe(true);

    const hydrated = hydrateFormAnswersWithPrefill(
      form,
      {
        fullName: "علی",
        nationalId: "001",
        phone: "0912",
        age: 30,
        gender: "مرد",
        homeLat: null,
        homeLon: null,
        homeAddress: null,
        homePlaque: null,
        homeUnit: null,
        homePostalCode: null,
      },
      null
    );
    expect(hydrated.find((a) => a.itemCode === formDateItem.code)?.valueRaw).toBe("");

    const answers: FormAnswer[] = [
      { itemCode: formDateItem.code, valueCode: null, valueRaw: "2099-01-01", notes: "" },
      { itemCode: other.code, valueCode: null, valueRaw: "ok", notes: "" },
    ];
    expect(answersForSection(form, "sec-1", answers).map((a) => a.itemCode)).toEqual([other.code]);
    expect(validateForm(form, [{ itemCode: other.code, valueCode: null, valueRaw: "ok", notes: "" }], { gender: "مرد", age: 30, maritalStatus: "" }).ok).toBe(true);
    const prog = overallProgress(form, [{ itemCode: other.code, valueCode: null, valueRaw: "ok", notes: "" }], {
      gender: "مرد",
      age: 30,
      maritalStatus: "",
    });
    expect(prog.total).toBe(1);
    expect(prog.done).toBe(1);
  });
});