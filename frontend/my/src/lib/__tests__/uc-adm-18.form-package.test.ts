/*
 File: frontend/my/src/lib/__tests__/uc-adm-18.form-package.test.ts
 Description: UC-ADM-18 — نگاشت ساختار API بسته فرم به FormDefinition
 Parent Dependencies: lib/api/forms
 */

import { describe, expect, it } from "vitest";
import { mapApiFormStructure, type ApiFormStructure } from "@/lib/api/forms";

describe("UC-ADM-18", () => {
  it("mapApiFormStructure: مخاطب و visibilityRules از JSON API", () => {
    const api: ApiFormStructure = {
      id: "f1",
      code: "cancer_screening_male_v02",
      title: "غربالگری آقایان",
      status: "Published",
      version: 2,
      targetAudienceJson: JSON.stringify({ gender: "مرد", ageMin: 18, ageMax: null }),
      warningText: "هشدار",
      sections: [{ id: "s1", code: "SEC", title: "بخش", sortOrder: 1, guideText: null }],
      items: [
        {
          id: "i1",
          sectionId: "s1",
          code: "CA_M_Q68",
          labelFa: "PSA",
          inputType: "yn_unk",
          required: false,
          sortOrder: 1,
          visibilityRulesJson: JSON.stringify([{ field: "age", op: "gte", value: 50 }]),
          helpText: null,
          notesPolicy: "never",
          prefillFromPatient: null,
          readOnlyIfPrefill: false,
          selectOptionsJson: null,
          codingJson: JSON.stringify({
            snomed: [],
            loinc: [],
            icd10: [],
            umls: [],
            conceptKind: "screening",
            aiTags: [],
          }),
        },
      ],
    };

    const form = mapApiFormStructure(api, 1);
    expect(form.code).toBe("cancer_screening_male_v02");
    expect(form.status).toBe("published");
    expect(form.targetAudience.gender).toBe("مرد");
    expect(form.targetAudience.ageMin).toBe(18);
    expect(form.items[0].visibilityRules).toEqual([{ field: "age", op: "gte", value: 50 }]);
  });

  it("mapApiFormStructure: gender همه و archived فیلتر در fetch جداست", () => {
    const api: ApiFormStructure = {
      id: "f2",
      code: "legacy",
      title: "قدیمی",
      status: "archived",
      version: 1,
      targetAudienceJson: JSON.stringify({ gender: "همه" }),
      sections: [],
      items: [],
    };
    const form = mapApiFormStructure(api);
    expect(form.targetAudience.gender).toBe("همه");
    expect(form.status).toBe("archived");
  });
});
