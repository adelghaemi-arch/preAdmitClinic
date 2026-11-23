/*
 File: frontend/src/lib/api/pathways.ts
 Description: کلاینت API مسیرهای سلامتی واحد (کتابخانه + ایستگاه‌ها)
 Parent Dependencies: api/http, pathway-stations, types/clinic
 */

import { apiFetch } from "@/lib/api/http";
import { draftsToStationCodes, mapApiStations } from "@/lib/pathway-stations";
import type { PathwayDto } from "@/types/clinic";

export interface ApiPathwayDto {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  gender: string;
  minAge?: number | null;
  maxAge?: number | null;
  jobCategory: string;
  estimatedTotalMinutes: number;
  isActive: boolean;
  isInLibrary: boolean;
  stations: Array<{
    id: string;
    roomCode: string;
    titleFa: string;
    stepOrder: number;
    isOptional: boolean;
  }>;
  createdAt: string;
  activeMatchedCount: number;
  previouslyUsedCount: number;
  attachedContractCount: number;
}

export interface UpsertPathwayBody {
  title: string;
  description?: string | null;
  gender: string;
  minAge?: number | null;
  maxAge?: number | null;
  jobCategory: string;
  isInLibrary: boolean;
  estimatedTotalMinutes?: number | null;
  stations: Array<{
    roomCode: string;
    titleFa: string;
    stepOrder: number;
    isOptional?: boolean;
  }>;
}

export function mapApiPathway(r: ApiPathwayDto): PathwayDto {
  const gender: PathwayDto["gender"] =
    r.gender === "زن" || r.gender === "مرد" ? r.gender : "همه";
  const stations = mapApiStations(r.stations ?? []);
  const { stationCodes, optionalStationCodes } = draftsToStationCodes(
    stations.map((s) => ({
      roomCode: s.roomCode,
      titleFa: s.titleFa,
      stepOrder: s.stepOrder,
      isOptional: s.isOptional,
    }))
  );
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description ?? "",
    gender,
    minAge: r.minAge ?? null,
    maxAge: r.maxAge ?? null,
    jobCategory: r.jobCategory || "همه",
    stationCodes,
    optionalStationCodes,
    stations,
    estimatedTotalMinutes: r.estimatedTotalMinutes ?? 0,
    isActive: r.isActive,
    isInLibrary: r.isInLibrary,
    createdAt: r.createdAt,
    activeMatchedCount: r.activeMatchedCount ?? 0,
    previouslyUsedCount: r.previouslyUsedCount ?? 0,
    attachedContractCount: r.attachedContractCount ?? 0,
  };
}

export async function fetchPathways(q?: string, libraryOnly = false): Promise<PathwayDto[]> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  if (libraryOnly) params.set("libraryOnly", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  const list = await apiFetch<ApiPathwayDto[]>(`/api/pathways${qs}`);
  return list.map(mapApiPathway);
}

export async function createPathway(body: UpsertPathwayBody): Promise<PathwayDto> {
  const created = await apiFetch<ApiPathwayDto>("/api/pathways", { method: "POST", body });
  return mapApiPathway(created);
}

export async function updatePathway(id: string, body: UpsertPathwayBody): Promise<PathwayDto> {
  const updated = await apiFetch<ApiPathwayDto>(`/api/pathways/${id}`, { method: "PUT", body });
  return mapApiPathway(updated);
}

export async function deletePathway(id: string): Promise<void> {
  await apiFetch(`/api/pathways/${id}`, { method: "DELETE" });
}