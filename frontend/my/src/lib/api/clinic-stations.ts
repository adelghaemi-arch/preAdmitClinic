/*
 File: frontend/src/lib/api/clinic-stations.ts
 Description: API کاتالوگ ایستگاه کلینیک جاری (UC-ADM-25)
 Parent Dependencies: api/http
 */

import { apiFetch } from "@/lib/api/http";
import type { RoomDto } from "@/types/clinic";
import { guidToNumericId } from "@/lib/api/roles";

export interface ApiClinicStationDto {
  id: string;
  code: string;
  titleFa: string;
  category: string;
  floor: number;
  roomNumber: string;
  prepInstructions?: string | null;
  wayfindingSteps?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface UpsertClinicStationBody {
  code?: string | null;
  titleFa?: string | null;
  category?: string | null;
  floor?: number | null;
  roomNumber?: string | null;
  prepInstructions?: string | null;
  wayfindingSteps?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
}

export async function fetchClinicStations(activeOnly = false) {
  const q = activeOnly ? "?activeOnly=true" : "";
  return apiFetch<ApiClinicStationDto[]>(`/api/clinics/current/stations${q}`);
}

export async function createClinicStation(body: UpsertClinicStationBody) {
  return apiFetch<ApiClinicStationDto>("/api/clinics/current/stations", {
    method: "POST",
    body,
  });
}

export async function updateClinicStation(id: string, body: UpsertClinicStationBody) {
  return apiFetch<ApiClinicStationDto>(`/api/clinics/current/stations/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
  });
}

export async function setClinicStationActive(id: string, isActive: boolean) {
  return apiFetch<ApiClinicStationDto>(
    `/api/clinics/current/stations/${encodeURIComponent(id)}/active`,
    { method: "PUT", body: { isActive } }
  );
}

/** نگاشت DTO سرور به RoomDto فرانت */
export function mapClinicStationToRoom(dto: ApiClinicStationDto): RoomDto {
  return {
    id: guidToNumericId(dto.id),
    serverId: dto.id,
    code: dto.code,
    name: dto.titleFa,
    category: dto.category,
    floor: dto.floor,
    roomNumber: dto.roomNumber || "",
    specialistName: "",
    specialtyTitle: "",
    prepInstructions: dto.prepInstructions ?? "",
    wayfindingSteps: dto.wayfindingSteps ?? "",
    mapX: 0,
    mapY: 0,
    avgServiceMinutes: 15,
    isActive: dto.isActive,
  };
}

/** ایستگاه‌های فعال برای موبایل بیمار و افزودن فوری پزشک */
export function activeClinicRooms(rooms: RoomDto[]): RoomDto[] {
  return rooms.filter((r) => r.isActive !== false);
}
