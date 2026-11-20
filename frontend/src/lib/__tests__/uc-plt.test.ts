/*
 File: frontend/src/lib/__tests__/uc-plt.test.ts
 Description: تست یونیت use caseهای ادمین کل پلتفرم (UC-PLT)
 Parent Dependencies: lib/workspace
 */

import { describe, expect, it } from "vitest";
import {
  allowedPagesFor,
  PLATFORM_PAGES,
  ROLE_NAV,
  ROLES,
  selectableRoles,
  V1_ROLES,
} from "@/lib/workspace";

describe("UC-PLT-01", () => {
  it("همهٔ PLATFORM_PAGES برای نقش platform مجازند", () => {
    const pages = allowedPagesFor("platform");
    for (const p of PLATFORM_PAGES) {
      expect(pages).toContain(p);
    }
  });
});

describe("UC-PLT-02", () => {
  it("V1_ROLES شامل platform", () => {
    expect(V1_ROLES).toContain("platform");
  });
});

describe("UC-PLT-03", () => {
  it("برچسب نقش platform «ادمین کل» است", () => {
    const role = ROLES.find((r) => r.id === "platform");
    expect(role?.label).toBe("ادمین کل");
  });
});

describe("UC-PLT-04", () => {
  it("selectableRoles شامل platform", () => {
    expect(selectableRoles().some((r) => r.id === "platform")).toBe(true);
  });
});

describe("UC-PLT-05", () => {
  it("خانه platform داشبورد پلتفرم است", () => {
    const role = selectableRoles().find((r) => r.id === "platform");
    expect(role?.page).toBe("platform-dashboard");
  });
});

describe("UC-PLT-06", () => {
  it("platform به patients و records هم دسترسی دارد", () => {
    const pages = allowedPagesFor("platform");
    expect(pages).toContain("patients");
    expect(pages).toContain("records");
  });
});

describe("UC-PLT-07", () => {
  it("صفحه بازبینی ضدتقلب در ناوبری platform است", () => {
    expect(allowedPagesFor("platform")).toContain("platform-fraud");
  });
});

describe("UC-PLT-08", () => {
  it("گروه کاربران و نظارت شامل fraud است", () => {
    const group = ROLE_NAV.platform.groups.find((g) => g.title.includes("کاربران"));
    expect(group?.pages).toContain("platform-fraud");
  });
});

describe("UC-PLT-09", () => {
  it("platform-fraud برای مشاهده شواهد GPS در پنل موجود است", () => {
    expect(PLATFORM_PAGES).toContain("platform-fraud");
  });
});

describe("UC-PLT-10", () => {
  it("مدیریت کاربران پلتفرم در allowedPages است", () => {
    expect(allowedPagesFor("platform")).toContain("platform-users");
  });
});

describe("UC-PLT-11", () => {
  it("صفحه ممیزی در ناوبری platform است", () => {
    expect(allowedPagesFor("platform")).toContain("platform-audit");
  });
});

describe("UC-PLT-12", () => {
  it("صفحه سلامت فنی در ناوبری platform است", () => {
    expect(allowedPagesFor("platform")).toContain("platform-health");
  });
});
