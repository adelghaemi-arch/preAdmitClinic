/*
 File: frontend/src/lib/api/package-library-rules.ts
 Description: کلاینت API کتابخانه مرکزی قوانین بسته سلامت
 Parent Dependencies: api/http, types/clinic
 */

import { apiFetch } from "@/lib/api/http";
import type { PackageLibraryRule } from "@/types/clinic";

export interface ApiPackageLibraryRuleDto {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  gender: string;
  minAge?: number | null;
  maxAge?: number | null;
  jobCategory: string;
  packageCode: string;
  createdAt: string;
  activeMatchedCount: number;
  previouslyUsedCount: number;
  attachedContractCount: number;
}

export interface UpsertPackageLibraryRuleBody {
  title: string;
  description?: string | null;
  gender: string;
  minAge?: number | null;
  maxAge?: number | null;
  jobCategory: string;
  packageCode: string;
}

export function mapApiPackageLibraryRule(r: ApiPackageLibraryRuleDto): PackageLibraryRule {
  const gender: PackageLibraryRule["gender"] =
    r.gender === "زن" || r.gender === "مرد" ? r.gender : "همه";
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description ?? "",
    gender,
    minAge: r.minAge ?? null,
    maxAge: r.maxAge ?? null,
    jobCategory: r.jobCategory || "همه",
    pathwayCode: r.packageCode,
    createdAt: r.createdAt,
    activeMatchedCount: r.activeMatchedCount ?? 0,
    previouslyUsedCount: r.previouslyUsedCount ?? 0,
    attachedContractCount: r.attachedContractCount ?? 0,
  };
}

export async function fetchPackageLibraryRules(q?: string): Promise<PackageLibraryRule[]> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  const list = await apiFetch<ApiPackageLibraryRuleDto[]>(`/api/package-library-rules${qs}`);
  return list.map(mapApiPackageLibraryRule);
}

export async function createPackageLibraryRule(body: UpsertPackageLibraryRuleBody): Promise<PackageLibraryRule> {
  const created = await apiFetch<ApiPackageLibraryRuleDto>("/api/package-library-rules", {
    method: "POST",
    body,
  });
  return mapApiPackageLibraryRule(created);
}

export async function updatePackageLibraryRule(
  id: string,
  body: UpsertPackageLibraryRuleBody
): Promise<PackageLibraryRule> {
  const updated = await apiFetch<ApiPackageLibraryRuleDto>(`/api/package-library-rules/${id}`, {
    method: "PUT",
    body,
  });
  return mapApiPackageLibraryRule(updated);
}

export async function deletePackageLibraryRule(id: string): Promise<void> {
  await apiFetch(`/api/package-library-rules/${id}`, { method: "DELETE" });
}
