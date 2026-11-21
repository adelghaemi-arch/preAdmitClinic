/*
 File: frontend/src/lib/api/patients.ts
 Description: API بیمار — آدرس منزل، پروفایل Owner/Admin، سوابق، snapshot پیش‌پذیرش
 Parent Dependencies: api/http.ts
 */

import { apiFetch } from "@/lib/api/http";

export interface UpdatePatientHomePayload {
  homeLat: number;
  homeLon: number;
  homeAddress: string;
  homePlaque?: string | null;
  homeUnit?: string | null;
  homePostalCode?: string | null;
}

export interface UpdatePatientProfilePayload {
  firstName?: string | null;
  lastName?: string | null;
  fatherName?: string | null;
  birthDate?: string | null;
  clearBirthDate?: boolean;
  maritalStatus?: string | null;
  gender?: string | null;
  homeLat?: number | null;
  homeLon?: number | null;
  homeAddress?: string | null;
  homePlaque?: string | null;
  homeUnit?: string | null;
  homePostalCode?: string | null;
  applyHome?: boolean;
}

export interface PatientProfileRevisionDto {
  id: string;
  at: string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedByUserId: string;
  source: string;
}

export interface OwnerIntakeSnapshotApi {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    nationalId: string;
    phone: string;
    birthDate?: string | null;
    age?: number | null;
    gender?: string | null;
    maritalStatus?: string | null;
    intakeCompleted: boolean;
    assignedPathwayTitle?: string | null;
    ownerUserId?: string | null;
    homeLat?: number | null;
    homeLon?: number | null;
    homeAddress?: string | null;
    homePlaque?: string | null;
    homeUnit?: string | null;
    homePostalCode?: string | null;
    journeyIntroSeen?: boolean;
    fatherName?: string | null;
    scheduledVisitDate?: string | null;
  };
  formStatus?: string | null;
  formId?: string | null;
  formCode?: string | null;
  documentGroupCount: number;
  hasPortrait: boolean;
  gpsPointCount: number;
  intakeGate: string;
  intakeGateMessage?: string | null;
  /** introduced | not_introduced | mobile_mismatch */
  hospitalIntroStatus?: string | null;
  hospitalName?: string | null;
  introducedMobileMasked?: string | null;
  profileComplete?: boolean;
}

export async function updatePatientHome(serverPatientId: string, body: UpdatePatientHomePayload) {
  return apiFetch(`/api/patients/${encodeURIComponent(serverPatientId)}/home`, {
    method: "PUT",
    body: {
      homeLat: body.homeLat,
      homeLon: body.homeLon,
      homeAddress: body.homeAddress,
      homePlaque: body.homePlaque ?? null,
      homeUnit: body.homeUnit ?? null,
      homePostalCode: body.homePostalCode ?? null,
    },
  });
}

export async function fetchOwnerIntakeSnapshot() {
  return apiFetch<OwnerIntakeSnapshotApi>("/api/patients/mine/intake-snapshot");
}

/** مایلستون دیدن مقدمهٔ مسیر — persist سرور. */
export async function dismissJourneyIntro() {
  return apiFetch<{
    id: string;
    journeyIntroSeen: boolean;
    intakeCompleted: boolean;
  }>("/api/patients/mine/journey-intro-seen", { method: "POST" });
}

export async function updateMyPatientProfile(body: UpdatePatientProfilePayload) {
  return apiFetch("/api/patients/mine/profile", { method: "PUT", body });
}

export async function updatePatientProfile(serverPatientId: string, body: UpdatePatientProfilePayload) {
  return apiFetch(`/api/patients/${encodeURIComponent(serverPatientId)}/profile`, {
    method: "PUT",
    body,
  });
}

export async function fetchPatientProfileRevisions(serverPatientId: string, take = 100) {
  return apiFetch<PatientProfileRevisionDto[]>(
    `/api/patients/${encodeURIComponent(serverPatientId)}/profile-revisions?take=${take}`
  );
}

export async function uploadFileBlob(
  blob: Blob,
  fileName: string,
  serverPatientId?: string | null,
  sessionId?: string | null
) {
  const form = new FormData();
  form.append("file", blob, fileName);
  // patientId → شارد مسیر yyyy/NNN روی سرور
  if (serverPatientId) form.append("patientId", serverPatientId);
  // sessionId فقط برای فریم پوشش‌دار ضدتقلب (NBZ1)
  if (sessionId) form.append("sessionId", sessionId);
  return apiFetch<{
    ok: boolean;
    storageKey: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }>("/api/files", { method: "POST", body: form });
}

export async function postPatientPortrait(serverPatientId: string, storageKey: string) {
  return apiFetch("/api/evidence/photos", {
    method: "POST",
    body: { patientId: serverPatientId, storageKey },
  });
}
