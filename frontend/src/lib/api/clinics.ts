/*
 File: frontend/src/lib/api/clinics.ts
 Description: API کلینیک جاری — خواندن و به‌روزرسانی نام/لوکیشن توسط ادمین
 Parent Dependencies: api/http
 */

import { apiFetch } from "@/lib/api/http";

export interface ApiClinicDto {
  id: string;
  name: string;
  city?: string | null;
  status: string;
  isCurrentTenant: boolean;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
}) {
  return apiFetch<ApiClinicDto>("/api/clinics/current", {
    method: "PUT",
    body,
  });
}
