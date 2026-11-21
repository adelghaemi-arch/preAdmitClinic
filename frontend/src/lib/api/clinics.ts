/*
 File: frontend/src/lib/api/clinics.ts
 Description: API کلینیک جاری — لوکیشن، پشتیبانی، سامانه پیامک، تست ارسال (UC-ADM-23)
 Parent Dependencies: api/http
 */

import { apiFetch } from "@/lib/api/http";

export type ClinicSmsProvider = "None" | "Kavenegar" | "Touba";

export interface ApiClinicDto {
  id: string;
  name: string;
  city?: string | null;
  status: string;
  isCurrentTenant: boolean;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  preAdmitSupportPhone?: string | null;
  smsProvider?: ClinicSmsProvider | string;
  smsSenderNumber?: string | null;
  kavenegarApiKey?: string | null;
  kavenegarApiKeySet?: boolean;
  kavenegarOtpTemplate?: string | null;
  toubaUsername?: string | null;
  toubaPassword?: string | null;
  toubaPasswordSet?: boolean;
  toubaSendUrl?: string | null;
  toubaOtpMessageTemplate?: string | null;
}

export async function fetchCurrentClinic() {
  return apiFetch<ApiClinicDto>("/api/clinics/current");
}

export async function updateCurrentClinic(body: {
  name: string;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  preAdmitSupportPhone?: string | null;
  smsProvider?: ClinicSmsProvider | string | null;
  smsSenderNumber?: string | null;
  kavenegarApiKey?: string | null;
  kavenegarOtpTemplate?: string | null;
  toubaUsername?: string | null;
  toubaPassword?: string | null;
  toubaSendUrl?: string | null;
  toubaOtpMessageTemplate?: string | null;
}) {
  return apiFetch<ApiClinicDto>("/api/clinics/current", {
    method: "PUT",
    body,
  });
}

export type ClinicSmsTestModeApi = "AppTemplate" | "Direct" | "ProviderTemplate";

export interface ClinicSmsTestResultDto {
  ok: boolean;
  mode: string;
  simulated: boolean;
  detail?: string | null;
}

/** UC-ADM-23 — از تنظیمات ذخیره‌شدهٔ سرور؛ مستقل از FixedOtp و درگاه فعال. */
export async function testClinicSms(body: {
  mode: ClinicSmsTestModeApi;
  mobile: string;
  templateId?: string | null;
  plainBody?: string | null;
  providerTemplateName?: string | null;
  tokens?: string[] | null;
  /** وقتی SmsProvider فعال None است الزامی است */
  provider?: "Touba" | "Kavenegar" | null;
}) {
  return apiFetch<ClinicSmsTestResultDto>("/api/clinics/current/sms/test", {
    method: "POST",
    body,
  });
}
