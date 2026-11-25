/*
 File: frontend/my/src/lib/api/auth.ts
 Description: OTP، انتخاب هویت چندکدملی، me روی Nabz.Api
 Parent Dependencies: api/http
 */

import { apiFetch, clearApiSession, readApiToken, writeApiSession } from "@/lib/api/http";

export type ApiAppRole = "Owner" | "Specialist" | "Admin" | "Supervisor" | "Platform";

export interface AuthMeDto {
  userId: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  mobile: string;
  roles: ApiAppRole[];
  clinicId: string | null;
  contractId: string | null;
  isActive: boolean;
}

export interface OtpModeResponse {
  fixedOtpEnabled: boolean;
}

export interface OtpRequestResponse {
  ok: boolean;
  demoCode?: string | null;
  error?: string;
}

export interface OtpIdentityCandidate {
  nationalId: string;
  firstName: string;
  lastName: string;
}

export interface OtpVerifyResponse {
  ok: boolean;
  userId?: string;
  sessionId?: string;
  token?: string;
  roles?: ApiAppRole[];
  needsSelection?: boolean;
  candidates?: OtpIdentityCandidate[];
  error?: string;
}

/** آیا سرور در حالت FixedOtp است (بدون افشای کد). */
export async function apiGetOtpMode(): Promise<OtpModeResponse> {
  return apiFetch<OtpModeResponse>("/api/auth/otp/mode", { auth: false });
}

export async function apiRequestOtp(mobile: string): Promise<OtpRequestResponse> {
  return apiFetch<OtpRequestResponse>("/api/auth/otp/request", {
    method: "POST",
    auth: false,
    body: { mobile },
  });
}

export async function apiVerifyOtp(
  mobile: string,
  code: string,
  deviceLabel?: string,
): Promise<OtpVerifyResponse> {
  const r = await apiFetch<OtpVerifyResponse>("/api/auth/otp/verify", {
    method: "POST",
    auth: false,
    body: { mobile, code, deviceLabel: deviceLabel ?? navigator.userAgent.slice(0, 120), appSurface: "clinic_web" },
  });
  // توکن pending یا کامل — برای select لازم است
  if (r.ok && r.token && r.sessionId) {
    writeApiSession(r.token, r.sessionId, r.roles ?? []);
  }
  return r;
}

export async function apiSelectIdentity(nationalId: string): Promise<OtpVerifyResponse> {
  const r = await apiFetch<OtpVerifyResponse>("/api/auth/otp/select", {
    method: "POST",
    body: { nationalId },
  });
  // توکن همان pending است؛ نقش‌ها بعد از select باید در localStorage تازه شوند
  if (r.ok && r.sessionId) {
    const token = readApiToken();
    if (token) writeApiSession(token, r.sessionId, r.roles ?? []);
  }
  return r;
}

export async function apiGetMe(): Promise<AuthMeDto> {
  return apiFetch<AuthMeDto>("/api/auth/me");
}

/** Logout بهترین‌تلاش: پس از wipe (ریست فکتوری) یا انقضای توکن، revoke ممکن است ۴۰۱ بدهد. */
export async function apiRevokeSession(): Promise<void> {
  try {
    await apiFetch("/api/auth/sessions/revoke", { method: "POST" });
  } catch {
    // نشست از قبل باطل/منقضی است — خطا را به UI برنمی‌گردانیم
  } finally {
    clearApiSession();
  }
}
