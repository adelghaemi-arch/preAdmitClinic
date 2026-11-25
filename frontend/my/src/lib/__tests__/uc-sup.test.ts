/*
 File: frontend/src/lib/__tests__/uc-sup.test.ts
 Description: تست یونیت use caseهای ناظر سازمان (UC-SUP)
 Parent Dependencies: lib/workspace
 */

import { describe, expect, it } from "vitest";
import { allowedPagesFor, PLATFORM_PAGES, ROLE_NAV } from "@/lib/workspace";

describe("UC-SUP-01", () => {
  it("allowedPages ناظر فقط داشبورد و supervisor-roster", () => {
    const pages = allowedPagesFor("supervisor");
    expect(pages).toEqual(expect.arrayContaining(["dashboard", "supervisor-roster"]));
    expect(pages.length).toBe(2);
  });
});

describe("UC-SUP-02", () => {
  it("forms در صفحات مجاز ناظر نیست", () => {
    expect(allowedPagesFor("supervisor")).not.toContain("forms");
  });
});

describe("UC-SUP-03", () => {
  it("clinic-users در صفحات مجاز ناظر نیست", () => {
    expect(allowedPagesFor("supervisor")).not.toContain("clinic-users");
  });
});

describe("UC-SUP-04", () => {
  it("هیچ صفحه platform در ناظر نیست", () => {
    const pages = allowedPagesFor("supervisor");
    for (const p of PLATFORM_PAGES) {
      expect(pages).not.toContain(p);
    }
  });
});

describe("UC-SUP-05", () => {
  it("ROLE_NAV ناظر پنل پایش است نه سازنده فرم", () => {
    const flat = ROLE_NAV.supervisor.groups.flatMap((g) => g.pages);
    expect(flat).not.toContain("forms");
    expect(flat).not.toContain("platform-settings");
    expect(flat).toContain("supervisor-roster");
  });
});