/*
 File: frontend/src/lib/__tests__/uc-role-switch.test.ts
 Description: سوئیچ نقش — فقط ادمین کل؛ بقیه نقش‌ها قفل روی حساب خود
 Parent Dependencies: lib/viewer, types/clinic
 */

import { describe, expect, it } from "vitest";
import { allowedRolesFor, pickAllowedRole } from "@/lib/viewer";
import type { AppUserDto } from "@/types/clinic";

function user(partial: Partial<AppUserDto> & Pick<AppUserDto, "primaryRole" | "canAccessAllRoles">): AppUserDto {
  return {
    id: 1,
    username: "09120000000",
    fullName: "کاربر تست",
    jobTitle: "—",
    medicalCouncilCode: "—",
    ...partial,
  };
}

describe("UC-ADM-16", () => {
  it("ادمین کلینیک حتی با canAccessAllRoles فقط نقش admin را می‌بیند", () => {
    const roles = allowedRolesFor(user({ primaryRole: "admin", canAccessAllRoles: true }));
    expect(roles).toEqual(["admin"]);
  });

  it("نقش ذخیره‌شدهٔ غیرمجاز برای ادمین کلینیک sanitize می‌شود", () => {
    const admin = user({ primaryRole: "admin", canAccessAllRoles: false });
    const picked = pickAllowedRole(admin, null, "owner");
    expect(picked.role).toBe("admin");
    expect(picked.roleAllowed).toBe(false);
    expect(picked.sanitized).toBe(true);
  });
});

describe("UC-PLT-04", () => {
  it("ادمین کل می‌تواند به همه نقش‌های قابل‌انتخاب از جمله ادمین کلینیک سوئیچ کند", () => {
    const roles = allowedRolesFor(user({ primaryRole: "platform", canAccessAllRoles: true }));
    expect(roles).toContain("platform");
    expect(roles).toContain("admin");
    expect(roles).toContain("owner");
    expect(roles).toContain("specialist");
    expect(roles).toContain("supervisor");
  });
});

describe("UC-OWN-01", () => {
  it("کاربر تک‌نقش فقط همان نقش را دارد", () => {
    const roles = allowedRolesFor(user({ primaryRole: "specialist", canAccessAllRoles: false }));
    expect(roles).toEqual(["specialist"]);
  });
});
