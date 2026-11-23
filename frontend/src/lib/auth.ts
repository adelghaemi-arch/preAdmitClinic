/*
 File: frontend/src/lib/auth.ts
 Description: ورود OTP با انتخاب کدملی؛ دمو لاگین فقط در FixedOtp؛ hint پایه+۱ ادمین کل
 Parent Dependencies: api/auth, api/http, api/roles
 */

import {
  apiGetMe,
  apiGetOtpMode,
  apiRequestOtp,
  apiRevokeSession,
  apiSelectIdentity,
  apiVerifyOtp,
  type AuthMeDto,
  type OtpIdentityCandidate,
} from "@/lib/api/auth";
import { ApiError, clearApiSession, readApiToken } from "@/lib/api/http";
import { guidToNumericId, primaryWorkspaceRole } from "@/lib/api/roles";
import { normalizeMobile } from "@/lib/person-identity";
import { toLatinDigits } from "@/lib/persian";
import type { AppUserDto, WorkspaceRole } from "@/types/clinic";

export const SESSION_COOKIE = "nabz_session";
const SESSION_KEY = "nabz_session_user";

export interface SessionResult {
  user: AppUserDto;
  isDemoSession: boolean;
  me?: AuthMeDto;
}

/** هم‌خروجی با normalizeMobile — ذخیره/OTP همیشه ۰۹… */
export function normalizePhone(value: string): string {
  return normalizeMobile(value);
}

function meToUser(me: AuthMeDto): AppUserDto {
  const primary = primaryWorkspaceRole(me.roles);
  return {
    id: guidToNumericId(me.userId),
    serverId: me.userId,
    username: me.mobile,
    fullName: me.fullName,
    jobTitle: primary === "platform" ? "ادمین کل" : primary === "admin" ? "ادمین کلینیک" : primary === "specialist" ? "پزشک" : primary === "supervisor" ? "ناظر سازمان" : "سلامتجو",
    primaryRole: primary,
    medicalCouncilCode: "—",
    // فقط ادمین کل اجازهٔ ورود به workspace نقش‌های دیگر را دارد
    canAccessAllRoles: me.roles.includes("Platform"),
  };
}

export function readUsername(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionResult | null> {
  if (!readApiToken()) return null;
  try {
    const me = await apiGetMe();
    const user = meToUser(me);
    try {
      window.localStorage.setItem(SESSION_KEY, user.username);
    } catch {
      /* ignore */
    }
    return { user, isDemoSession: false, me };
  } catch (e) {
    // 409 = نشست pending انتخاب کدملی؛ توکن را پاک نکن
    if (e instanceof ApiError && e.status === 409) return null;
    clearApiSession();
    return null;
  }
}

export interface OtpRequestResult {
  ok: boolean;
  error?: string;
  code?: string;
  targetName?: string;
  kind?: "patient" | "supervisor";
  expiresInSec?: number;
}

export async function requestOtp(phoneRaw: string): Promise<OtpRequestResult> {
  const phone = normalizePhone(phoneRaw);
  if (!/^09\d{9}$/.test(phone)) {
    return { ok: false, error: "شماره موبایل معتبر ۱۱ رقمی وارد کنید (مثل ۰۹۱۲۳۴۵۶۷۸۹)." };
  }
  try {
    const r = await apiRequestOtp(phone);
    if (!r.ok) return { ok: false, error: r.error ?? "ارسال کد انجام نشد." };
    return {
      ok: true,
      code: r.demoCode ?? undefined,
      expiresInSec: 120,
      targetName: phone,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ارسال کد انجام نشد." };
  }
}

export interface OtpVerifyResult {
  ok: boolean;
  error?: string;
  user?: AppUserDto;
  role?: WorkspaceRole;
  needsSelection?: boolean;
  candidates?: OtpIdentityCandidate[];
}

async function finishLoginFromMe(): Promise<OtpVerifyResult> {
  const me = await apiGetMe();
  const user = meToUser(me);
  try {
    window.localStorage.setItem(SESSION_KEY, user.username);
  } catch {
    /* ignore */
  }
  return { ok: true, user, role: primaryWorkspaceRole(me.roles) };
}

export async function verifyOtp(phoneRaw: string, codeRaw: string): Promise<OtpVerifyResult> {
  const phone = normalizePhone(phoneRaw);
  const code = toLatinDigits(codeRaw).replace(/\D/g, "");
  try {
    const r = await apiVerifyOtp(phone, code);
    if (!r.ok) return { ok: false, error: r.error ?? "ورود انجام نشد." };
    if (r.needsSelection && r.candidates && r.candidates.length > 0) {
      return { ok: true, needsSelection: true, candidates: r.candidates };
    }
    if (!r.token) return { ok: false, error: r.error ?? "ورود انجام نشد." };
    return await finishLoginFromMe();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ورود انجام نشد." };
  }
}

export async function selectOtpIdentity(nationalId: string): Promise<OtpVerifyResult> {
  try {
    const r = await apiSelectIdentity(toLatinDigits(nationalId).replace(/\D/g, ""));
    if (!r.ok) return { ok: false, error: r.error ?? "انتخاب هویت انجام نشد." };
    return await finishLoginFromMe();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "انتخاب هویت انجام نشد." };
  }
}

/** موبایل قفل seed ادمین کل — هم‌تراز PlatformAdminIdentity.Mobile بک‌اند. */
export const PLATFORM_ADMIN_MOBILE = "09133752696";

/** فقط با FixedOtp فعال؛ در حالت پیامک واقعی بلوک ورود سریع مخفی می‌ماند (fail-closed). */
export function shouldShowOtpDemoQuickLogin(fixedOtpEnabled: boolean | null | undefined): boolean {
  return fixedOtpEnabled === true;
}

/** باکس «پیامک نمایشی» فقط وقتی FixedOtp و کد دمو از سرور آمده باشد. */
export function shouldShowOtpDemoSmsPreview(
  fixedOtpEnabled: boolean | null | undefined,
  demoCode: string | null | undefined
): boolean {
  return shouldShowOtpDemoQuickLogin(fixedOtpEnabled) && Boolean(demoCode?.trim());
}

/**
 * UC-PLT-15: با FixedOtp، UI همان پایه را نشان می‌دهد ولی verify ادمین کل = پایه + ۱.
 * در حالت SMS واقعی این hint نباید بیاید.
 */
export function shouldShowPlatformFixedOtpPlusOneHint(
  fixedOtpEnabled: boolean | null | undefined,
  phoneRaw: string | null | undefined
): boolean {
  if (!shouldShowOtpDemoQuickLogin(fixedOtpEnabled)) return false;
  return normalizePhone(phoneRaw ?? "") === PLATFORM_ADMIN_MOBILE;
}

/** پرچم FixedOtp از API؛ خطا/قطع شبکه → false تا دمو لو نرود. */
export async function fetchOtpFixedModeEnabled(): Promise<boolean> {
  try {
    const r = await apiGetOtpMode();
    return r.fixedOtpEnabled === true;
  } catch {
    return false;
  }
}

/** شماره‌های seed بک‌اند برای ورود سریع دمو (نه mock-store). ادمین کل عمداً اینجا نیست. */
export function listOtpDemoLogins(): Array<{ name: string; phone: string; hint: string; kind: "patient" | "supervisor" }> {
  // hint فقط فارسی — نام نقش API (Admin/…) به کاربر نشان داده نمی‌شود
  return [
    { name: "ادمین کلینیک", phone: "09120000001", hint: "نقش ادمین کلینیک", kind: "supervisor" },
    { name: "پزشک نمونه", phone: "09120000002", hint: "نقش پزشک متخصص", kind: "supervisor" },
    { name: "موبایل مشترک (انتخاب کدملی)", phone: "09123458910", hint: "دو سلامتجو روی یک شماره", kind: "patient" },
    { name: "ناظر سازمانی نمونه", phone: "09123409876", hint: "نقش ناظر سازمان", kind: "supervisor" },
  ];
}

export async function signOut(): Promise<void> {
  await apiRevokeSession();
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem("nabz_tab_role");
    window.localStorage.removeItem("nabz_active_role");
  } catch {
    /* ignore */
  }
}

export async function listDemoAccounts(): Promise<AppUserDto[]> {
  return [];
}
