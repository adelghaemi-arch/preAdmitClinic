/*
 File: frontend/src/lib/contract-pathway-buckets.ts
 Description: سطل‌های مسیر سلامتی قرارداد — پیش‌فرض + قوانین به اولویت؛ توزیع = همین لیست
 Parent Dependencies: types/clinic
 */

import type { ContractMember, ContractPathwayRule, CorporateContract, PathwayDto } from "@/types/clinic";
import { resolvePathwayDisplayTitle } from "@/lib/api/contracts";

/** کلید سطل مسیر پیش‌فرض استاندارد قرارداد */
export const DEFAULT_PATHWAY_BUCKET_ID = "__default__";

export type ContractPathwayBucket = {
  id: string;
  kind: "default" | "rule";
  title: string;
  pathwayCode: string;
  priority: number;
  rule: ContractPathwayRule | null;
  gender?: string;
  minAge?: number | null;
  maxAge?: number | null;
  jobCategory?: string;
  libraryPathwayId?: string | null;
};

/** قوانین قرارداد به ترتیب اولویت (عدد کمتر = بالاتر در لیست). */
export function sortedContractPathwayRules(rules: ContractPathwayRule[]): ContractPathwayRule[] {
  return [...rules].sort((a, b) => (a.priority || 0) - (b.priority || 0));
}

/**
 * سطل‌های تخصیص: همیشه مسیر پیش‌فرض + مسیرهای سفارشی قرارداد.
 * توزیع اعضا فقط بین همین سطل‌هاست — نه کاتالوگ کامل قالب‌های ایستگاهی.
 */
export function buildContractPathwayBuckets(
  contract: Pick<CorporateContract, "pathwayRules" | "defaultPathwayCode">,
  pathways: PathwayDto[]
): ContractPathwayBucket[] {
  const defaultCode = (contract.defaultPathwayCode || "").trim() || "CORP_MEN_LT40";
  const defPathway = pathways.find((p) => p.code === defaultCode);
  const defaultBucket: ContractPathwayBucket = {
    id: DEFAULT_PATHWAY_BUCKET_ID,
    kind: "default",
    title: defPathway?.title ?? resolvePathwayDisplayTitle(defaultCode),
    pathwayCode: defaultCode,
    priority: Number.MAX_SAFE_INTEGER,
    rule: null,
  };

  const rules = sortedContractPathwayRules(contract.pathwayRules ?? []).map((rule, idx) => {
    return {
      id: rule.id,
      kind: "rule" as const,
      title: rule.title,
      pathwayCode: rule.pathwayCode,
      priority: rule.priority || idx + 1,
      rule,
      gender: rule.gender,
      minAge: rule.minAge,
      maxAge: rule.maxAge,
      jobCategory: rule.jobCategory,
      libraryPathwayId: rule.libraryPathwayId ?? null,
    };
  });

  // مسیرهای سفارشی اول (به اولویت)، پیش‌فرض در انتها به‌عنوان fallback نمایشی
  return [...rules, defaultBucket];
}

/** آیا عنوان match به یکی از قوانین سفارشی قرارداد اشاره دارد؟ */
export function matchesCustomPathwayRule(
  matchedTitle: string | null | undefined,
  rules: ContractPathwayRule[]
): boolean {
  const t = (matchedTitle ?? "").trim();
  if (!t || t === "manual_override") return false;
  return rules.some((r) => r.title === t);
}

/** عضو روی پیش‌فرض است اگر به هیچ قانون سفارشی match نشده باشد. */
export function isMemberOnDefaultPathway(
  m: ContractMember,
  rules: ContractPathwayRule[]
): boolean {
  return !matchesCustomPathwayRule(m.matchedPathwayTitle, rules);
}

export function membersForPathwayBucket(
  members: ContractMember[],
  bucket: ContractPathwayBucket,
  rules: ContractPathwayRule[]
): ContractMember[] {
  if (bucket.kind === "default") {
    return members.filter((m) => isMemberOnDefaultPathway(m, rules));
  }
  const title = bucket.rule?.title ?? bucket.title;
  return members.filter((m) => (m.matchedPathwayTitle ?? "").trim() === title);
}

/**
 * گزینه‌های override دستی: پیش‌فرض + هر مسیر سفارشی با عنوان مسیر سلامتی.
 * اگر چند قانون یک pathwayCode داشته باشند، هر کدام یک گزینه با عنوان خودش می‌ماند
 * ولی value همان code است — برای تفکیک سطل، pathwayTitle قانون ارسال می‌شود.
 */
export function contractPathwayOverrideOptions(
  contract: Pick<CorporateContract, "pathwayRules" | "defaultPathwayCode">,
  pathways: PathwayDto[]
): { code: string; title: string; bucketId: string }[] {
  const defaultCode = (contract.defaultPathwayCode || "").trim() || "CORP_MEN_LT40";
  const defPathway = pathways.find((p) => p.code === defaultCode);
  const out: { code: string; title: string; bucketId: string }[] = [
    {
      code: defaultCode,
      title: defPathway?.title ?? resolvePathwayDisplayTitle(defaultCode),
      bucketId: DEFAULT_PATHWAY_BUCKET_ID,
    },
  ];
  for (const r of sortedContractPathwayRules(contract.pathwayRules ?? [])) {
    out.push({ code: r.pathwayCode, title: r.title, bucketId: r.id });
  }
  return out;
}

/** جابه‌جایی اولویت دو همسایه و بازشماره ۱..n */
export function reorderPathwayRulePriorities(
  rules: ContractPathwayRule[],
  ruleId: string,
  direction: "up" | "down"
): ContractPathwayRule[] {
  const sorted = sortedContractPathwayRules(rules);
  const idx = sorted.findIndex((r) => r.id === ruleId);
  if (idx < 0) return sorted;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= sorted.length) return sorted;
  const next = [...sorted];
  const a = next[idx]!;
  const b = next[swapWith]!;
  next[idx] = b;
  next[swapWith] = a;
  return next.map((r, i) => ({ ...r, priority: i + 1 }));
}
