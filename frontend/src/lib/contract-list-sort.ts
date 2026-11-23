/*
 File: frontend/src/lib/contract-list-sort.ts
 Description: سورت/فیلتر لیست قرارداد برای کمبو — جدیدترین بالا، نمونه پایین، فیلتر غیرفعال
 Parent Dependencies: types/clinic
 */

import type { CorporateContract } from "@/types/clinic";

/** قرارداد seed دمو (DEMO-ORG) باید انتهای لیست باشد. */
export function isSampleContract(c: Pick<CorporateContract, "code" | "organizationName" | "title">): boolean {
  const code = (c.code ?? "").trim().toUpperCase();
  if (code === "DEMO-ORG" || code.startsWith("DEMO")) return true;
  const org = (c.organizationName ?? "").trim();
  const title = (c.title ?? "").trim();
  return org.includes("نمونه") || title.includes("نمونه");
}

export function isContractActiveStatus(status: CorporateContract["status"]): boolean {
  return status === "active";
}

/** پیش‌فرض فقط Active؛ با showInactive همهٔ وضعیت‌ها. */
export function filterContractsForPicker(
  contracts: CorporateContract[],
  showInactive: boolean
): CorporateContract[] {
  if (showInactive) return contracts;
  return contracts.filter((c) => isContractActiveStatus(c.status));
}

export function contractStatusBadgeLabel(status: CorporateContract["status"]): string | null {
  if (status === "active") return null;
  if (status === "inactive") return "غیرفعال";
  if (status === "draft") return "پیش‌نویس";
  if (status === "completed") return "پایان‌یافته";
  return "غیرفعال";
}

/**
 * جدیدترین‌ها اول؛ قرارداد نمونه همیشه آخر.
 * اولویت با code (مثل C-20261121192306) چون createdAt در مپ API اغلب لحظهٔ hydrate است.
 */
export function sortContractsForPicker(contracts: CorporateContract[]): CorporateContract[] {
  return [...contracts].sort((a, b) => {
    const aSample = isSampleContract(a) ? 1 : 0;
    const bSample = isSampleContract(b) ? 1 : 0;
    if (aSample !== bSample) return aSample - bSample;

    const codeCmp = String(b.code ?? "").localeCompare(String(a.code ?? ""), "en", { numeric: true });
    if (codeCmp !== 0) return codeCmp;

    const aAt = Date.parse(a.createdAt || "") || 0;
    const bAt = Date.parse(b.createdAt || "") || 0;
    return bAt - aAt;
  });
}
