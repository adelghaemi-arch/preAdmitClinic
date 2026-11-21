/*
 File: frontend/src/lib/__tests__/uc-own.test.ts
 Description: تست یونیت use caseهای نقش سلامتجو (UC-OWN)
 Parent Dependencies: lib/auth, owner-intake-gate, intake-documents, role-context
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  normalizePhone,
  shouldShowOtpDemoQuickLogin,
  shouldShowOtpDemoSmsPreview,
} from "@/lib/auth";
import {
  filterNavPagesForGate,
  GATED_OWNER_PAGES,
  resolveGatedPage,
  shouldGateOwner,
} from "@/lib/owner-intake-gate";
import {
  INTAKE_DOCUMENT_MAX_FILES_PER_GROUP,
  INTAKE_DOCUMENT_MAX_GROUPS,
  isAllowedIntakeMime,
} from "@/lib/intake-documents";
import {
  clampMobileInput,
  clampNationalIdInput,
  isValidIranMobile,
  normalizeMobile,
} from "@/lib/person-identity";
import { getRequestRole, setRequestRole } from "@/lib/role-context";
import { toLatinDigits } from "@/lib/persian";
import type { AppPage } from "@/lib/workspace";
import { minimalPatient, selfCompanionLink } from "./test-fixtures";

/** همان استخراج ارقام OTP که در verifyOtp استفاده می‌شود */
function normalizeOtpDigits(codeRaw: string): string {
  return toLatinDigits(codeRaw).replace(/\D/g, "");
}

describe("UC-OWN-01", () => {
  it("normalizePhone / normalizeMobile: فارسی، +98، 0098، 98 و ۹… را به ۰۹… تبدیل می‌کند", () => {
    expect(normalizePhone("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
    expect(normalizePhone("+989123456789")).toBe("09123456789");
    expect(normalizePhone("00989123456789")).toBe("09123456789");
    expect(normalizeMobile("989123456789")).toBe("09123456789");
    expect(normalizeMobile("9123456789")).toBe("09123456789");
    expect(normalizePhone("+989123456789")).toBe(normalizeMobile("+989123456789"));
  });

  it("اعتبار موبایل: فقط ۱۱ رقم با پیش‌شماره 09 پس از نرمال", () => {
    expect(isValidIranMobile("09123456789")).toBe(true);
    expect(isValidIranMobile("+989123456789")).toBe(true);
    expect(isValidIranMobile("0912345678")).toBe(false);
    expect(isValidIranMobile("08123456789")).toBe(false);
  });

  it("clampMobileInput: بیش از حد مجاز را می‌برد و +98 را نرمال می‌کند", () => {
    expect(clampMobileInput("091234567890123")).toBe("09123456789");
    expect(clampMobileInput("+989123456789")).toBe("09123456789");
    expect(clampMobileInput("98").length).toBeLessThanOrEqual(12);
    expect(clampNationalIdInput("001234567890")).toBe("0012345678");
  });

  it("clampIranDigitInput: فاصله و junk پیست را حذف می‌کند", async () => {
    const { clampIranDigitInput, clampPostalInput } = await import("@/lib/person-identity");
    expect(clampIranDigitInput("mobile", "09 12-345 6789")).toBe("09123456789");
    expect(clampIranDigitInput("nationalId", "001-234-5678abc")).toBe("0012345678");
    expect(clampPostalInput("12345 67890xx")).toBe("1234567890");
  });

  it("normalizeOtpDigits: ارقام فارسی و جداکننده را حذف می‌کند", () => {
    expect(normalizeOtpDigits("۱۲۳۴۵۶")).toBe("123456");
    expect(normalizeOtpDigits("12-34-56")).toBe("123456");
  });

  it("بلوک ورود سریع دمو فقط وقتی FixedOtp فعال است دیده می‌شود", () => {
    expect(shouldShowOtpDemoQuickLogin(true)).toBe(true);
    expect(shouldShowOtpDemoQuickLogin(false)).toBe(false);
    expect(shouldShowOtpDemoQuickLogin(null)).toBe(false);
    expect(shouldShowOtpDemoQuickLogin(undefined)).toBe(false);
  });

  it("پیامک نمایشی فقط با FixedOtp و demoCode دیده می‌شود", () => {
    expect(shouldShowOtpDemoSmsPreview(true, "12345")).toBe(true);
    expect(shouldShowOtpDemoSmsPreview(true, "")).toBe(false);
    expect(shouldShowOtpDemoSmsPreview(false, "12345")).toBe(false);
    expect(shouldShowOtpDemoSmsPreview(null, "12345")).toBe(false);
  });
});

describe("UC-OWN-02", () => {
  it("shouldGateOwner: فقط owner با self-link وقتی پروفایل یا عکس ناقص است", () => {
    const incomplete = minimalPatient({
      intakeCompleted: false,
      profileComplete: false,
      hasPortrait: false,
    });
    const complete = minimalPatient({
      intakeCompleted: false,
      profileComplete: true,
      hasPortrait: true,
      intakeGate: "needs_form",
    });
    const link = selfCompanionLink();
    expect(shouldGateOwner({ role: "owner", patient: incomplete, link })).toBe(true);
    expect(shouldGateOwner({ role: "specialist", patient: incomplete, link })).toBe(false);
    // پیش‌پذیرش اختیاری — needs_form alone قفل نمی‌کند
    expect(shouldGateOwner({ role: "owner", patient: complete, link })).toBe(false);
    expect(shouldGateOwner({ role: "owner", patient: incomplete, link: selfCompanionLink({ relationship: "child" }) })).toBe(false);
    expect(shouldGateOwner({ role: "owner", patient: incomplete, link: null })).toBe(false);
  });

  it("mapOwnerSnapshotToPatient: journeyIntroSeen از DTO سرور (نه localStorage)", async () => {
    const { mapOwnerSnapshotToPatient } = await import("@/lib/owner-patient-map");
    const base = {
      formStatus: null,
      formId: null,
      formCode: null,
      documentGroupCount: 0,
      hasPortrait: false,
      gpsPointCount: 0,
      intakeGate: "needs_form",
      intakeGateMessage: null,
      patient: {
        id: "11111111-1111-1111-1111-111111111111",
        firstName: "علی",
        lastName: "تست",
        fullName: "علی تست",
        nationalId: "0012345678",
        phone: "09123456789",
        intakeCompleted: false,
        journeyIntroSeen: false,
      },
    };
    expect(mapOwnerSnapshotToPatient(base).journeyIntroSeen).toBe(false);
    expect(
      mapOwnerSnapshotToPatient({
        ...base,
        patient: { ...base.patient, journeyIntroSeen: true },
      }).journeyIntroSeen
    ).toBe(true);
    expect(
      mapOwnerSnapshotToPatient({
        ...base,
        intakeGate: "already_complete",
        patient: { ...base.patient, intakeCompleted: true, journeyIntroSeen: false },
      }).journeyIntroSeen
    ).toBe(true);
  });
});

describe("UC-OWN-03", () => {
  it("resolveGatedPage: با گیت فعال هم dashboard برای دیدن مسیر مجاز است", () => {
    const args = {
      role: "owner" as const,
      patient: minimalPatient({
        journeyIntroSeen: false,
        profileComplete: false,
        hasPortrait: false,
      }),
      link: selfCompanionLink(),
    };
    expect(resolveGatedPage("dashboard", args)).toBe("dashboard");
    expect(resolveGatedPage("journey-intro", args)).toBe("dashboard");
    expect(resolveGatedPage("companion-links", args)).toBe("companion-links");
  });
});

describe("UC-OWN-04", () => {
  it("resolveGatedPage: خانه مجاز؛ intake مجاز؛ صفحات دیگر به intake", () => {
    const args = {
      role: "owner" as const,
      patient: minimalPatient({
        journeyIntroSeen: true,
        intakeCompleted: false,
        profileComplete: false,
        hasPortrait: false,
      }),
      link: selfCompanionLink(),
    };
    expect(resolveGatedPage("companion-intake", args)).toBe("companion-intake");
    expect(resolveGatedPage("dashboard", args)).toBe("dashboard");
    expect(resolveGatedPage("clinical", args as never)).toBe("companion-intake");
  });

  it("filterNavPagesForGate: dashboard و intake بدون clinical", () => {
    const all: AppPage[] = ["dashboard", "journey-intro", "companion-intake", "clinical"];
    const gated = filterNavPagesForGate(all, true);
    expect(gated).toContain("dashboard");
    expect(gated).toContain("companion-intake");
    expect(gated).not.toContain("journey-intro");
    expect(gated).not.toContain("clinical");
    expect(gated.every((p) => GATED_OWNER_PAGES.includes(p))).toBe(true);
  });
});

describe("UC-OWN-05", () => {
  it("سقف گروه و فایل مدارک پیش‌پذیرش", () => {
    expect(INTAKE_DOCUMENT_MAX_GROUPS).toBe(20);
    expect(INTAKE_DOCUMENT_MAX_FILES_PER_GROUP).toBe(20);
  });
});

describe("UC-OWN-06", () => {
  it("isAllowedIntakeMime: فقط PDF و تصویر", () => {
    expect(isAllowedIntakeMime("application/pdf")).toBe(true);
    expect(isAllowedIntakeMime("image/jpeg")).toBe(true);
    expect(isAllowedIntakeMime("text/plain")).toBe(false);
  });
});

describe("UC-OWN-07", () => {
  it("پروفایل/عکس ناقص: خانه مجاز؛ صفحات غیرمرتبط → companion-intake", () => {
    const args = {
      role: "owner" as const,
      patient: minimalPatient({
        journeyIntroSeen: true,
        intakeCompleted: false,
        profileComplete: false,
        hasPortrait: false,
      }),
      link: selfCompanionLink(),
    };
    expect(resolveGatedPage("dashboard", args)).toBe("dashboard");
    expect(resolveGatedPage("companion-map", args)).toBe("companion-intake");
  });
});

describe("UC-OWN-08", () => {
  it("بعد از تکمیل پروفایل و عکس گیت خاموش می‌شود (پیش‌پذیرش اختیاری)", () => {
    const patient = minimalPatient({
      intakeCompleted: true,
      journeyIntroSeen: true,
      profileComplete: true,
      hasPortrait: true,
    });
    expect(shouldGateOwner({ role: "owner", patient, link: selfCompanionLink() })).toBe(false);
    expect(resolveGatedPage("dashboard", { role: "owner", patient, link: selfCompanionLink() })).toBe("dashboard");
  });
});

describe("UC-OWN-09", () => {
  it("بدون patient گیت اعمال نمی‌شود", () => {
    expect(shouldGateOwner({ role: "owner", patient: null, link: selfCompanionLink() })).toBe(false);
  });
});

describe("UC-OWN-10", () => {
  it("filterNavPagesForGate وقتی gated=false کل لیست را برمی‌گرداند", () => {
    const pages: AppPage[] = ["dashboard", "clinical"];
    expect(filterNavPagesForGate(pages, false)).toEqual(pages);
  });
});

describe("UC-OWN-11", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
    });
  });

  it("setRequestRole / getRequestRole در localStorage", () => {
    setRequestRole("owner");
    expect(getRequestRole()).toBe("owner");
    setRequestRole("admin");
    expect(getRequestRole()).toBe("admin");
  });
});