/*
 File: frontend/src/lib/__tests__/uc-own-05-photo-gate-hydrate.test.tsx
 Description: UC-OWN-05 — تا settle شدن mine، photo gate/گالری mount نشود
 Parent Dependencies: PreAdmitFormRenderer, api/forms, test-fixtures
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { PreAdmitFormRenderer } from "@/components/PreAdmitFormRenderer";
import { fetchMyFormResponse } from "@/lib/api/forms";
import { minimalPatient } from "@/lib/__tests__/test-fixtures";
import type { FormDefinition, FormItemDefinition, FormTargetAudience } from "@/types/clinic";

vi.mock("@/lib/api/forms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/forms")>();
  return {
    ...actual,
    fetchMyFormResponse: vi.fn(),
  };
});

const audience: FormTargetAudience = { gender: "زن", ageMin: null, ageMax: null };

function item(code: string): FormItemDefinition {
  return {
    id: code,
    sectionId: "sec-1",
    code,
    labelFa: code,
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
  };
}

function publishedForm(): FormDefinition {
  return {
    id: "form-photo-gate",
    code: "CA_F_TEST",
    title: "فرم تست عکس",
    version: 1,
    status: "published",
    sortOrder: 1,
    warningText: "",
    targetAudience: audience,
    sections: [
      {
        id: "sec-1",
        formId: "form-photo-gate",
        code: "SEC1",
        title: "بخش",
        sortOrder: 1,
        timeWindowHint: "",
        guideText: "",
      },
    ],
    items: [item("CA_F_Q1")],
  };
}

describe("UC-OWN-05 photo gate hydrate", () => {
  beforeEach(() => {
    vi.stubGlobal("isSecureContext", false);
    vi.mocked(fetchMyFormResponse).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("قبل از settle شدن mine، input گالری در DOM نیست", async () => {
    let resolveMine: (v: null) => void = () => undefined;
    vi.mocked(fetchMyFormResponse).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMine = resolve;
        })
    );

    const patient = minimalPatient({
      gender: "زن",
      age: 35,
      serverId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      hasPortrait: false,
      photoDataUrl: null,
    });

    render(
      <PreAdmitFormRenderer
        patient={patient}
        forms={[publishedForm()]}
        onAction={async () => ({ ok: true })}
        busy={false}
      />
    );

    expect(screen.getByText(/در حال بارگذاری پیش‌نویس پرسشنامه/)).toBeTruthy();
    expect(document.querySelector('[data-testid="portrait-gallery-input"]')).toBeNull();

    resolveMine(null);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="portrait-gallery-input"]')).toBeTruthy();
    });
  });
});
