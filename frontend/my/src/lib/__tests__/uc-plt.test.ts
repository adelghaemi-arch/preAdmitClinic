/*
 File: frontend/src/lib/__tests__/uc-plt.test.ts
 Description: تست یونیت use caseهای ادمین کل پلتفرم (UC-PLT)
 Parent Dependencies: lib/workspace, lib/api/auth
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { PLATFORM_ACTION_NAMES } from "@/lib/platform-actions";
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

describe("UC-PLT-13", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it("اکشن‌های ریست فکتوری در کاتالوگ پلتفرم هستند", () => {
    expect(PLATFORM_ACTION_NAMES.has("PLATFORM_FACTORY_RESET_REQUEST_OTP")).toBe(true);
    expect(PLATFORM_ACTION_NAMES.has("PLATFORM_FACTORY_RESET_CONFIRM")).toBe(true);
  });

  it("پس از wipe، revoke با ۴۰۱ پرتاب نمی‌کند و توکن محلی پاک می‌شود", async () => {
    const { writeApiSession, readApiToken } = await import("@/lib/api/http");
    const { apiRevokeSession } = await import("@/lib/api/auth");
    const { signOut } = await import("@/lib/auth");

    writeApiSession("dead-token", "dead-session", ["Platform"]);
    expect(readApiToken()).toBe("dead-token");

    // شبیه‌سازی نشست باطل‌شده بعد از ریست فکتوری
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: "Unauthorized" }),
      }),
    );

    await expect(apiRevokeSession()).resolves.toBeUndefined();
    expect(readApiToken()).toBeNull();

    writeApiSession("dead-token-2", "dead-session-2", ["Platform"]);
    await expect(signOut()).resolves.toBeUndefined();
    expect(readApiToken()).toBeNull();
  });
});

describe("UC-PLT-15", () => {
  it("ادمین کل در فهرست دمو لاگین UI دیده نمی‌شود", async () => {
    const { listOtpDemoLogins } = await import("@/lib/auth");
    const demos = listOtpDemoLogins();
    expect(demos.some((d) => d.phone === "09133752696")).toBe(false);
    expect(demos.some((d) => d.name === "ادمین کل")).toBe(false);
  });

  it("hint نقش‌های دمو لاگین فقط فارسی است (بدون Admin/Specialist/…)", async () => {
    const { listOtpDemoLogins } = await import("@/lib/auth");
    const demos = listOtpDemoLogins();
    const englishRole = /\b(Admin|Specialist|Supervisor|Platform|Owner|Reception|Paraclinic)\b/;
    for (const d of demos) {
      expect(d.hint).not.toMatch(englishRole);
      expect(d.name).not.toMatch(englishRole);
    }
    expect(demos.find((d) => d.phone === "09120000001")?.hint).toBe("نقش ادمین کلینیک");
    expect(demos.find((d) => d.phone === "09120000002")?.hint).toBe("نقش پزشک متخصص");
    expect(demos.find((d) => d.phone === "09123409876")?.hint).toBe("نقش ناظر سازمان");
  });

  it("با FixedOtp و موبایل ادمین کل، hint پایه+۱ دیده می‌شود؛ با SMS واقعی نه", async () => {
    const {
      PLATFORM_ADMIN_MOBILE,
      shouldShowPlatformFixedOtpPlusOneHint,
    } = await import("@/lib/auth");
    expect(shouldShowPlatformFixedOtpPlusOneHint(true, PLATFORM_ADMIN_MOBILE)).toBe(true);
    expect(shouldShowPlatformFixedOtpPlusOneHint(true, "+989133752696")).toBe(true);
    expect(shouldShowPlatformFixedOtpPlusOneHint(true, "09120000001")).toBe(false);
    expect(shouldShowPlatformFixedOtpPlusOneHint(false, PLATFORM_ADMIN_MOBILE)).toBe(false);
    expect(shouldShowPlatformFixedOtpPlusOneHint(null, PLATFORM_ADMIN_MOBILE)).toBe(false);
  });
});

describe("UC-PLT-17", () => {
  it("صفحه نظارت و اکشن acknowledge سوءاستفاده برای platform موجود است", () => {
    expect(allowedPagesFor("platform")).toContain("platform-fraud");
    expect(PLATFORM_ACTION_NAMES.has("PLATFORM_ACK_API_ABUSE")).toBe(true);
  });

  it("ApiError برای ۴۲۹ پیام فارسی دارد", async () => {
    const { ApiError } = await import("@/lib/api/http");
    const err = new ApiError("درخواست‌های تکراری زیاد است؛ کمی بعد تلاش کنید.", 429);
    expect(err.status).toBe(429);
    expect(err.message).toContain("تکراری");
  });
});
