/*
 File: frontend/src/lib/api/evidence.ts
 Description: API شواهد — fraud/config، نشست/فریم ضدتقلب مبهم، GPS، بازبینی؛ دانلود storage
 Parent Dependencies: api/http, api/patients uploadFileBlob, fraud-wire
 */

import { apiFetch, getApiBaseUrl, readApiToken } from "@/lib/api/http";
import { uploadFileBlob } from "@/lib/api/patients";
import { randomOpaqueBinName, wrapFraudJpeg } from "@/lib/fraud-wire";

export type FraudFrameKind = "fraud_auto" | "fraud_confirm";

export interface ApiFraudPhotoDto {
  id: string;
  patientId: string;
  kind: string;
  storageKey: string;
  capturedAt: string;
  sessionId?: string | null;
  gpsLat?: number | null;
  gpsLon?: number | null;
}

export interface ApiFraudSessionDto {
  id: string;
  patientId: string;
  userId?: string | null;
  packageId?: string | null;
  patientFullName?: string;
  patientNationalId?: string | null;
  reviewStatus: string;
  startedAt: string;
  endedAt?: string | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  frames: ApiFraudPhotoDto[];
}

export interface ApiGpsPointDto {
  id: string;
  patientId: string;
  userId?: string | null;
  lat: number;
  lon: number;
  accuracy: number;
  capturedAt: string;
  source: string;
  patientFullName?: string | null;
  patientNationalId?: string | null;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const [, b64] = dataUrl.split(",");
  const binary = atob(b64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(meta)?.[1] ?? "image/jpeg";
  const binary = atob(b64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function uploadDataUrlAsFile(dataUrl: string, fileName: string, serverPatientId?: string | null) {
  const blob = dataUrl.startsWith("data:") ? dataUrlToBlob(dataUrl) : await (await fetch(dataUrl)).blob();
  return uploadFileBlob(blob, fileName, serverPatientId);
}

/** فریم ضدتقلب: JPEG → پوشش NBZ1 با نام .bin و octet-stream */
export async function uploadOpaqueFraudFrame(
  dataUrl: string,
  sessionId: string,
  wrapKey: string,
  serverPatientId?: string | null
) {
  const jpeg = dataUrl.startsWith("data:")
    ? dataUrlToBytes(dataUrl)
    : new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
  const wrapped = await wrapFraudJpeg(jpeg, wrapKey);
  const blob = new Blob([wrapped], { type: "application/octet-stream" });
  return uploadFileBlob(blob, randomOpaqueBinName(), serverPatientId, sessionId);
}

export async function fetchFraudCaptureConfig() {
  return apiFetch<{ fraudAutoCaptureSeconds: number; fraudWatchEnabled: boolean }>(
    "/api/evidence/fraud/config"
  );
}

export async function startFraudSession(serverPatientId: string) {
  return apiFetch<{ ok: boolean; sessionId: string; wrapKey: string }>("/api/evidence/fraud/start", {
    method: "POST",
    body: { patientId: serverPatientId },
  });
}

export async function captureFraudFrame(input: {
  sessionId: string;
  storageKey: string;
  lat?: number;
  lon?: number;
  accuracy?: number;
  kind?: FraudFrameKind;
}) {
  return apiFetch<{ ok: boolean }>("/api/evidence/fraud/capture", {
    method: "POST",
    body: {
      sessionId: input.sessionId,
      storageKey: input.storageKey,
      lat: input.lat,
      lon: input.lon,
      accuracy: input.accuracy,
      kind: input.kind ?? "fraud_auto",
    },
  });
}

export async function endFraudSession(sessionId: string) {
  return apiFetch<{ ok: boolean }>("/api/evidence/fraud/end", {
    method: "POST",
    body: { sessionId },
  });
}

export async function recordGpsPoint(input: {
  serverPatientId: string;
  lat: number;
  lon: number;
  accuracy?: number;
  source?: string;
}) {
  return apiFetch<{ ok: boolean }>("/api/evidence/gps", {
    method: "POST",
    body: {
      patientId: input.serverPatientId,
      lat: input.lat,
      lon: input.lon,
      accuracy: input.accuracy ?? 0,
      source: input.source ?? "manual",
    },
  });
}

export async function listFraudSessions(take = 50) {
  return apiFetch<ApiFraudSessionDto[]>(`/api/evidence/fraud/sessions?take=${take}`);
}

export interface ApiVaultFileDto {
  id: string;
  kind: string;
  patientId: string;
  storageKey: string;
  fileName: string;
  sizeBytes: number;
  patientFullName: string;
  nationalId?: string | null;
  capturedAt: string;
  deletedAt?: string | null;
}

export async function listVaultFiles(trash = false, take = 100) {
  const q = new URLSearchParams({ trash: String(trash), take: String(take) });
  return apiFetch<ApiVaultFileDto[]>(`/api/evidence/vault?${q}`);
}

export async function softDeleteVaultFiles(documentFileIds: string[], photoIds: string[]) {
  return apiFetch<{ ok: boolean }>("/api/evidence/vault/soft-delete", {
    method: "POST",
    body: { documentFileIds, photoIds },
  });
}

export async function hardDeleteVaultFiles(documentFileIds: string[], photoIds: string[]) {
  return apiFetch<{ ok: boolean }>("/api/evidence/vault/hard-delete", {
    method: "POST",
    body: { documentFileIds, photoIds },
  });
}

export async function listGpsByPatient(serverPatientId: string, take = 40) {
  const q = new URLSearchParams({ patientId: serverPatientId, take: String(take) });
  return apiFetch<ApiGpsPointDto[]>(`/api/evidence/gps?${q}`);
}

export async function getFraudSessionDetail(sessionId: string) {
  return apiFetch<ApiFraudSessionDto>(`/api/evidence/fraud/sessions/${encodeURIComponent(sessionId)}`);
}

export async function reviewFraudSession(input: {
  sessionId: string;
  status: "Pending" | "Cleared" | "Flagged" | "pending" | "cleared" | "flagged";
  note?: string;
  reviewer: string;
}) {
  const status =
    input.status.toLowerCase() === "cleared"
      ? "Cleared"
      : input.status.toLowerCase() === "flagged"
        ? "Flagged"
        : "Pending";
  return apiFetch<{ ok: boolean }>("/api/evidence/fraud/review", {
    method: "POST",
    body: {
      sessionId: input.sessionId,
      status,
      note: input.note ?? null,
      reviewer: input.reviewer,
    },
  });
}

/** دانلود فایل با Bearer و ساخت object URL برای نمایش در <img> */
export async function fetchStorageAsObjectUrl(storageKey: string): Promise<string> {
  const token = readApiToken();
  // اسلش مسیر را encode نکن — فقط هر segment (سازگار با {*storageKey})
  const path = storageKey
    .replace(/^\/+/, "")
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const res = await fetch(`${getApiBaseUrl()}/api/files/${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return "";
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
