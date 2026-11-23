/*
 File: frontend/src/lib/health-pathway-titles.ts
 Description: نگاشت کد مسیر سازمانی به عنوان فارسی — هم‌تراز HealthPathwayTitles بک‌اند
 Parent Dependencies: —
 */

export const CORP_MEN_LT40 = "CORP_MEN_LT40";
export const CORP_MEN_GE40 = "CORP_MEN_GE40";
export const CORP_WOMEN_LT40 = "CORP_WOMEN_LT40";
export const CORP_WOMEN_GE40 = "CORP_WOMEN_GE40";

/** پیش‌فرض وقتی جنسیت/سن ناقص است */
export const DEFAULT_PATHWAY_CODE = CORP_MEN_LT40;

export const HEALTH_PATHWAY_TITLES: Record<string, string> = {
  [CORP_MEN_LT40]: "چکاپ آقایان زیر ۴۰ سال",
  [CORP_MEN_GE40]: "چکاپ آقایان ۴۰ سال به بالا",
  [CORP_WOMEN_LT40]: "چکاپ بانوان زیر ۴۰ سال",
  [CORP_WOMEN_GE40]: "چکاپ بانوان ۴۰ سال به بالا",
};

export function resolveHealthPathwayTitle(code?: string | null, existingTitle?: string | null): string {
  const c = (code ?? "").trim();
  const t = (existingTitle ?? "").trim();
  if (t && t.toLowerCase() !== c.toLowerCase()) return t;
  if (!c) return HEALTH_PATHWAY_TITLES[DEFAULT_PATHWAY_CODE];
  return HEALTH_PATHWAY_TITLES[c] ?? (t || c);
}
