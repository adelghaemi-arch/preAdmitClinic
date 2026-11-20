/*
 File: frontend/src/lib/api/auth.ts
 Description: OTP و me روی Nabz.Api
 Parent Dependencies: api/http
 */

import { apiFetch, clearApiSession, writeApiSession } from "@/lib/api/http";

export type ApiAppRole = "Owner" | "Specialist" | "Admin" | "Supervisor" | "Platform";

export interface AuthMeDto {
  userId: string;
  fullName: string;
  mobile: string;
  roles: ApiAppRole[];
  clinicId: string | null;
  contractId: string | null;
  isActive: boolean;
}

export interface OtpRequestResponse {
  ok: boolean;
  demoCode?: string | null;
  error?: string;
}

export interface OtpVerifyResponse {
  ok: boolean;
  userId?: string;
  sessionId?: string;
  token?: string;
  roles?: ApiAppRole[];
  error?: string;
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
  if (r.ok && r.token && r.sessionId) {
    writeApiSession(r.token, r.sessionId);
  }
  return r;
}

export async function apiGetMe(): Promise<AuthMeDto> {
  return apiFetch<AuthMeDto>("/api/auth/me");
}

export async function apiRevokeSession(): Promise<void> {
  try {
    await apiFetch("/api/auth/sessions/revoke", { method: "POST" });
  } finally {
    clearApiSession();
  }
}
