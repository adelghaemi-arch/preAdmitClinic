/*
 File: frontend/src/lib/__tests__/uc-adm.test.ts
 Description: تست یونیت use caseهای ادمین کلینیک (UC-ADM)
 Parent Dependencies: lib/workspace
 */

import { describe, expect, it } from "vitest";
import {
  allowedPagesFor,
  PLATFORM_PAGES,
  ROLE_NAV,
  selectableRoles,
  V1_ROLES,
} from "@/lib/workspace";

const ADMIN_EXPECTED = ["contracts", "contract-packages", "contract-funnel", "forms", "clinic-users"] as const;

describe("UC-ADM-01", () => {
  it("خانه ادمین contracts است", () => {
    expect(ROLE_NAV.admin.home).toBe("contracts");
  });
});

describe("UC-ADM-02", () => {
  it("allowedPages شامل contracts", () => {
    expect(allowedPagesFor("admin")).toContain("contracts");
  });
});

describe("UC-ADM-03", () => {
  it("allowedPages شامل contract-packages", () => {
    expect(allowedPagesFor("admin")).toContain("contract-packages");
  });
});

describe("UC-ADM-04", () => {
  it("allowedPages شامل contract-funnel", () => {
    expect(allowedPagesFor("admin")).toContain("contract-funnel");
  });
});

describe("UC-ADM-05", () => {
  it("allowedPages شامل forms", () => {
    expect(allowedPagesFor("admin")).toContain("forms");
  });
});

describe("UC-ADM-06", () => {
  it("allowedPages شامل clinic-users", () => {
    expect(allowedPagesFor("admin")).toContain("clinic-users");
  });
});

describe("UC-ADM-07", () => {
  it("allowedPages شامل dashboard و patients", () => {
    const pages = allowedPagesFor("admin");
    expect(pages).toContain("dashboard");
    expect(pages).toContain("patients");
  });
});

describe("UC-ADM-08", () => {
  it("allowedPages شامل records", () => {
    expect(allowedPagesFor("admin")).toContain("records");
  });
});

describe("UC-ADM-09", () => {
  it("صفحات عملیاتی reception در دسترس ادمین v1 نیست", () => {
    expect(allowedPagesFor("admin")).not.toContain("admission");
    expect(allowedPagesFor("admin")).not.toContain("queues");
  });
});

describe("UC-ADM-10", () => {
  it("هیچ صفحه platform-* در allowedPages ادمین نیست", () => {
    const pages = allowedPagesFor("admin");
    for (const p of PLATFORM_PAGES) {
      expect(pages).not.toContain(p);
    }
  });
});

describe("UC-ADM-11", () => {
  it("ROLE_NAV.admin گروه قرارداد دارد", () => {
    const titles = ROLE_NAV.admin.groups.map((g) => g.title);
    expect(titles.some((t) => t.includes("قرارداد"))).toBe(true);
  });
});

describe("UC-ADM-12", () => {
  it("ROLE_NAV.admin پیکربندی clinic-users و forms", () => {
    const config = ROLE_NAV.admin.groups.find((g) => g.title.includes("پیکربندی"));
    expect(config?.pages).toContain("clinic-users");
    expect(config?.pages).toContain("forms");
  });
});

describe("UC-ADM-13", () => {
  for (const page of ADMIN_EXPECTED) {
    it(`صفحه ${page} در لیست مجاز ادمین`, () => {
      expect(allowedPagesFor("admin")).toContain(page);
    });
  }
});

describe("UC-ADM-14", () => {
  it("platform-dashboard در ROLE_NAV.admin نیست", () => {
    const flat = ROLE_NAV.admin.groups.flatMap((g) => g.pages);
    expect(flat).not.toContain("platform-dashboard");
  });
});

describe("UC-ADM-15", () => {
  it("selectableRoles شامل admin", () => {
    expect(selectableRoles().some((r) => r.id === "admin")).toBe(true);
  });
});

describe("UC-ADM-16", () => {
  it("V1_ROLES شامل admin و نه reception", () => {
    expect(V1_ROLES).toContain("admin");
    expect(V1_ROLES).not.toContain("reception");
  });
});

describe("UC-ADM-17", () => {
  it("selectableRoles در v1 فقط V1_ROLES", () => {
    const ids = selectableRoles().map((r) => r.id);
    for (const id of ids) {
      expect(V1_ROLES).toContain(id);
    }
  });
});