/*
 File: frontend/src/lib/auth.ts
 Description: ورود OTP از Nabz.Api؛ بدون mock-store
 Parent Dependencies: api/auth, api/http, api/roles
 */

import {
  apiGetMe,
  apiRequestOtp,
  apiRevokeSession,
  apiVerifyOtp,
  type AuthMeDto,
} from "@/lib/api/auth";
import { clearApiSession, readApiToken } from "@/lib/api/http";
import { guidToNumericId, primaryWorkspaceRole } from "@/lib/api/roles";
import { toLatinDigits } from "@/lib/persian";
import type { AppUserDto, WorkspaceRole } from "@/types/clinic";

export const SESSION_COOKIE = "nabz_session";
const SESSION_KEY = "nabz_session_user";

export interface SessionResult {
  user: AppUserDto;
  isDemoSession: boolean;
  me?: AuthMeDto;
}

export function normalizePhone(value: string): string {
  let digits = toLatinDigits(value).replace(/\D/g, "");
  if (digits.startsWith("0098")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("98") && digits.length === 12) digits = `0${digits.slice(2)}`;
  return digits;
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
    canAccessAllRoles: me.roles.includes("Platform") || me.roles.includes("Admin"),
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
  } catch {
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
}

export async function verifyOtp(phoneRaw: string, codeRaw: string): Promise<OtpVerifyResult> {
  const phone = normalizePhone(phoneRaw);
  const code = toLatinDigits(codeRaw).replace(/\D/g, "");
  try {
    const r = await apiVerifyOtp(phone, code);
    if (!r.ok || !r.token) return { ok: false, error: r.error ?? "ورود انجام نشد." };
    const me = await apiGetMe();
    const user = meToUser(me);
    try {
      window.localStorage.setItem(SESSION_KEY, user.username);
    } catch {
      /* ignore */
    }
    return { ok: true, user, role: primaryWorkspaceRole(me.roles) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ورود انجام نشد." };
  }
}

/** شماره‌های seed بک‌اند برای ورود سریع دمو (نه mock-store). */
export function listOtpDemoLogins(): Array<{ name: string; phone: string; hint: string; kind: "patient" | "supervisor" }> {
  return [
    { name: "ادمین کلینیک", phone: "09120000001", hint: "نقش Admin", kind: "supervisor" },
    { name: "پزشک نمونه", phone: "09120000002", hint: "نقش Specialist", kind: "supervisor" },
    { name: "مریم‌السادات تابش", phone: "09123458910", hint: "سلامتجو / Owner", kind: "patient" },
    { name: "ناظر سازمانی نمونه", phone: "09123409876", hint: "نقش Supervisor", kind: "supervisor" },
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
