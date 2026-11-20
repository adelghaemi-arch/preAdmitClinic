/*
 File: frontend/src/lib/__tests__/uc-own.test.ts
 Description: تست یونیت use caseهای نقش سلامتجو (UC-OWN)
 Parent Dependencies: lib/auth, owner-intake-gate, intake-documents, role-context
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { normalizePhone } from "@/lib/auth";
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
import { getRequestRole, setRequestRole } from "@/lib/role-context";
import { toLatinDigits } from "@/lib/persian";
import type { AppPage } from "@/lib/workspace";
import { minimalPatient, selfCompanionLink } from "./test-fixtures";

/** همان استخراج ارقام OTP که در verifyOtp استفاده می‌شود */
function normalizeOtpDigits(codeRaw: string): string {
  return toLatinDigits(codeRaw).replace(/\D/g, "");
}

function isValidIranMobile(phoneRaw: string): boolean {
  return /^09\d{9}$/.test(normalizePhone(phoneRaw));
}

describe("UC-OWN-01", () => {
  it("normalizePhone: فارسی، 98 و 0098 را به ۰۹… تبدیل می‌کند", () => {
    expect(normalizePhone("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
    expect(normalizePhone("+989123456789")).toBe("09123456789");
    expect(normalizePhone("00989123456789")).toBe("09123456789");
  });

  it("اعتبار موبایل: فقط ۱۱ رقم با پیش‌شماره 09", () => {
    expect(isValidIranMobile("09123456789")).toBe(true);
    expect(isValidIranMobile("0912345678")).toBe(false);
    expect(isValidIranMobile("08123456789")).toBe(false);
  });

  it("normalizeOtpDigits: ارقام فارسی و جداکننده را حذف می‌کند", () => {
    expect(normalizeOtpDigits("۱۲۳۴۵۶")).toBe("123456");
    expect(normalizeOtpDigits("12-34-56")).toBe("123456");
  });
});

describe("UC-OWN-02", () => {
  it("shouldGateOwner: فقط owner با self-link و intake ناقص", () => {
    const patient = minimalPatient({ intakeCompleted: false });
    const link = selfCompanionLink();
    expect(shouldGateOwner({ role: "owner", patient, link })).toBe(true);
    expect(shouldGateOwner({ role: "specialist", patient, link })).toBe(false);
    expect(shouldGateOwner({ role: "owner", patient: minimalPatient({ intakeCompleted: true }), link })).toBe(false);
    expect(shouldGateOwner({ role: "owner", patient, link: selfCompanionLink({ relationship: "child" }) })).toBe(false);
    expect(shouldGateOwner({ role: "owner", patient, link: null })).toBe(false);
  });
});

describe("UC-OWN-03", () => {
  it("resolveGatedPage: قبل از دیدن intro به journey-intro می‌رود", () => {
    const args = {
      role: "owner" as const,
      patient: minimalPatient({ journeyIntroSeen: false }),
      link: selfCompanionLink(),
    };
    expect(resolveGatedPage("dashboard", args)).toBe("journey-intro");
    expect(resolveGatedPage("companion-links", args)).toBe("companion-links");
  });
});

describe("UC-OWN-04", () => {
  it("resolveGatedPage: پس از intro، صفحات مجاز یا companion-intake", () => {
    const args = {
      role: "owner" as const,
      patient: minimalPatient({ journeyIntroSeen: true, intakeCompleted: false }),
      link: selfCompanionLink(),
    };
    expect(resolveGatedPage("companion-intake", args)).toBe("companion-intake");
    expect(resolveGatedPage("dashboard", args)).toBe("companion-intake");
    expect(resolveGatedPage("clinical", args as never)).toBe("companion-intake");
  });

  it("filterNavPagesForGate: فقط GATED_OWNER بدون journey-intro", () => {
    const all: AppPage[] = ["dashboard", "journey-intro", "companion-intake", "clinical"];
    const gated = filterNavPagesForGate(all, true);
    expect(gated).toContain("companion-intake");
    expect(gated).not.toContain("journey-intro");
    expect(gated).not.toContain("clinical");
    expect(gated.every((p) => GATED_OWNER_PAGES.includes(p) && p !== "journey-intro")).toBe(true);
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
  it("intake ناقص + گیت فعال → resolve به companion-intake", () => {
    const args = {
      role: "owner" as const,
      patient: minimalPatient({ journeyIntroSeen: true, intakeCompleted: false }),
      link: selfCompanionLink(),
    };
    expect(resolveGatedPage("companion-map", args)).toBe("companion-intake");
  });
});

describe("UC-OWN-08", () => {
  it("بعد از تکمیل intake گیت خاموش می‌شود", () => {
    const patient = minimalPatient({ intakeCompleted: true, journeyIntroSeen: true });
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