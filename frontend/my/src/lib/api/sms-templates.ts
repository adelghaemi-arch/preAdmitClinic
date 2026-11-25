/*
 File: frontend/src/lib/api/sms-templates.ts
 Description: قالب‌های پیامک گروهی پلتفرم — فهرست برای قیف و upsert ادمین کل
 Parent Dependencies: api/http
 */

import { apiFetch } from "@/lib/api/http";

export interface ApiSmsCampaignTemplateDto {
  id: string;
  code: string;
  title: string;
  bodyPreview: string;
  providerTemplateName: string;
  tokenKeys: string[];
  requiresEmrUrl: boolean;
  isActive: boolean;
  sortOrder: number;
  availableForSend: boolean;
}

export async function fetchSmsTemplates(activeOnly = true) {
  return apiFetch<ApiSmsCampaignTemplateDto[]>(`/api/sms-templates?activeOnly=${activeOnly ? "true" : "false"}`);
}

export async function upsertSmsTemplate(body: {
  id?: string | null;
  code: string;
  title: string;
  bodyPreview: string;
  providerTemplateName: string;
  tokenKeys: string[];
  requiresEmrUrl: boolean;
  isActive: boolean;
  sortOrder: number;
}) {
  return apiFetch<ApiSmsCampaignTemplateDto>("/api/platform/sms-templates", {
    method: "PUT",
    body,
  });
}
