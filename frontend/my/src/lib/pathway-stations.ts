/*
 File: frontend/src/lib/pathway-stations.ts
 Description: نگاشت ایستگاه‌های مسیر سلامتی بین UI، mock و API
 Parent Dependencies: types/clinic
 */

import type { PathwayDto, PathwayStationDto, RoomDto } from "@/types/clinic";

export type PathwayStationDraft = {
  roomCode: string;
  titleFa: string;
  stepOrder: number;
  isOptional: boolean;
};

export function stationCodesToDrafts(
  stationCodes: string[],
  optionalStationCodes: string[] | undefined,
  rooms: Pick<RoomDto, "code" | "name">[]
): PathwayStationDraft[] {
  return stationCodes.map((roomCode, idx) => ({
    roomCode,
    titleFa: rooms.find((r) => r.code === roomCode)?.name ?? roomCode,
    stepOrder: idx + 1,
    isOptional: optionalStationCodes?.includes(roomCode) ?? false,
  }));
}

export function draftsFromPathway(
  pathway: Pick<PathwayDto, "stations" | "stationCodes" | "optionalStationCodes">,
  rooms: Pick<RoomDto, "code" | "name">[]
): PathwayStationDraft[] {
  if (pathway.stations?.length) {
    return [...pathway.stations]
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((s) => ({
        roomCode: s.roomCode,
        titleFa: s.titleFa,
        stepOrder: s.stepOrder,
        isOptional: s.isOptional,
      }));
  }
  return stationCodesToDrafts(pathway.stationCodes ?? [], pathway.optionalStationCodes, rooms);
}

export function draftsToStationCodes(drafts: PathwayStationDraft[]): {
  stationCodes: string[];
  optionalStationCodes: string[];
} {
  const ordered = [...drafts].sort((a, b) => a.stepOrder - b.stepOrder);
  const stationCodes = ordered.map((s) => s.roomCode);
  const optionalStationCodes = ordered.filter((s) => s.isOptional).map((s) => s.roomCode);
  return { stationCodes, optionalStationCodes };
}

export function draftsToUpsertStations(drafts: PathwayStationDraft[]) {
  return [...drafts]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((s, idx) => ({
      roomCode: s.roomCode,
      titleFa: s.titleFa.trim() || s.roomCode,
      stepOrder: idx + 1,
      isOptional: s.isOptional,
    }));
}

export function reindexStationDrafts(drafts: PathwayStationDraft[]): PathwayStationDraft[] {
  return [...drafts]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((s, idx) => ({ ...s, stepOrder: idx + 1 }));
}

export function mapApiStations(
  stations: Array<{
    id?: string;
    roomCode: string;
    titleFa: string;
    stepOrder: number;
    isOptional: boolean;
  }>
): PathwayStationDto[] {
  return stations.map((s) => ({
    id: s.id,
    roomCode: s.roomCode,
    titleFa: s.titleFa,
    stepOrder: s.stepOrder,
    isOptional: s.isOptional,
  }));
}