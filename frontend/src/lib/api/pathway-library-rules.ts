/*
 File: frontend/src/lib/api/pathway-library-rules.ts
 Description: کلاینت API کتابخانه مرکزی مسیرهای سلامتی
 Parent Dependencies: api/http, types/clinic
 */

import { apiFetch } from "@/lib/api/http";
import type { PathwayLibraryRule } from "@/types/clinic";

export interface ApiPathwayLibraryRuleDto {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  gender: string;
  minAge?: number | null;
  maxAge?: number | null;
  jobCategory: string;
  pathwayCode: string;
  createdAt: string;
  activeMatchedCount: number;
  previouslyUsedCount: number;
  attachedContractCount: number;
}

export interface UpsertPathwayLibraryRuleBody {
  title: string;
  description?: string | null;
  gender: string;
  minAge?: number | null;
  maxAge?: number | null;
  jobCategory: string;
  pathwayCode: string;
}

export function mapApiPathwayLibraryRule(r: ApiPathwayLibraryRuleDto): PathwayLibraryRule {
  const gender: PathwayLibraryRule["gender"] =
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
    pathwayCode: r.pathwayCode,
    createdAt: r.createdAt,
    activeMatchedCount: r.activeMatchedCount ?? 0,
    previouslyUsedCount: r.previouslyUsedCount ?? 0,
    attachedContractCount: r.attachedContractCount ?? 0,
  };
}

export async function fetchPathwayLibraryRules(q?: string): Promise<PathwayLibraryRule[]> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  const list = await apiFetch<ApiPathwayLibraryRuleDto[]>(`/api/pathway-library-rules${qs}`);
  return list.map(mapApiPathwayLibraryRule);
}

export async function createPathwayLibraryRule(body: UpsertPathwayLibraryRuleBody): Promise<PathwayLibraryRule> {
  const created = await apiFetch<ApiPathwayLibraryRuleDto>("/api/pathway-library-rules", {
    method: "POST",
    body,
  });
  return mapApiPathwayLibraryRule(created);
}

export async function updatePathwayLibraryRule(
  id: string,
  body: UpsertPathwayLibraryRuleBody
): Promise<PathwayLibraryRule> {
  const updated = await apiFetch<ApiPathwayLibraryRuleDto>(`/api/pathway-library-rules/${id}`, {
    method: "PUT",
    body,
  });
  return mapApiPathwayLibraryRule(updated);
}

export async function deletePathwayLibraryRule(id: string): Promise<void> {
  await apiFetch(`/api/pathway-library-rules/${id}`, { method: "DELETE" });
}
