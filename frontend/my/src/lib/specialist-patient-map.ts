/*
 File: frontend/src/lib/specialist-patient-map.ts
 Description: نگاشت Patient/Chart API پزشک به PatientFullDto و ردیف فهرست
 Parent Dependencies: api/patients, api/roles, types/clinic
 */

import type { ApiPatientDto, PatientChartApi } from "@/lib/api/patients";
import { guidToNumericId } from "@/lib/api/roles";
import type { FormResponse, PatientFullDto, PatientIntakeDocumentGroup } from "@/types/clinic";

export interface SpecialistDirectoryRow {
  serverId: string;
  localId: number;
  fullName: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  phone: string;
  age: number;
  gender: string;
  pathwayTitle: string;
  intakeCompleted: boolean;
}

/** اسکلت پرونده از DTO جستجو — بدون فرم/مدارک تا OPEN_SPECIALIST_CHART */
export function mapApiPatientToDirectoryRow(dto: ApiPatientDto): SpecialistDirectoryRow {
  return {
    serverId: dto.id,
    localId: guidToNumericId(dto.id),
    fullName: dto.fullName || `${dto.firstName} ${dto.lastName}`.trim(),
    firstName: dto.firstName ?? "",
    lastName: dto.lastName ?? "",
    nationalId: dto.nationalId ?? "",
    phone: dto.phone ?? "",
    age: dto.age ?? 0,
    gender: dto.gender ?? "",
    pathwayTitle: dto.assignedPathwayTitle ?? "",
    intakeCompleted: Boolean(dto.intakeCompleted),
  };
}

export function mapApiPatientToStub(dto: ApiPatientDto): PatientFullDto {
  const row = mapApiPatientToDirectoryRow(dto);
  return {
    id: row.localId,
    serverId: row.serverId,
    qrToken: "",
    fullName: row.fullName,
    firstName: row.firstName,
    lastName: row.lastName,
    nationalId: row.nationalId,
    age: row.age,
    birthDate: dto.birthDate ? String(dto.birthDate).slice(0, 10) : null,
    gender: row.gender,
    maritalStatus: dto.maritalStatus ?? null,
    phone: row.phone,
    pathwayTitle: row.pathwayTitle,
    checkInTime: new Date().toISOString(),
    completedAt: null,
    intakeCompleted: row.intakeCompleted,
    medications: [],
    surgeries: [],
    familyHistory: [],
    allergies: [],
    recentConditions: [],
    intakeAnswers: {},
    formResponses: [],
    autoOpenWayfinding: false,
    journeyIntroSeen: row.intakeCompleted,
    stations: [],
    clinicalNotes: [],
    paraclinicResults: [],
    alerts: [],
    intakeDocuments: [],
  };
}

/** ادغام chart + پاسخ submitted + مدارک در PatientFullDto */
export function mergeSpecialistChart(
  chart: PatientChartApi,
  formResponse: FormResponse | null,
  documents: PatientIntakeDocumentGroup[]
): PatientFullDto {
  const base = mapApiPatientToStub(chart.patient);
  const formStatus = (chart.formStatus ?? "").toLowerCase();
  const intakeCompleted =
    base.intakeCompleted || formStatus === "submitted" || Boolean(formResponse);
  return {
    ...base,
    intakeCompleted,
    hasPortrait: Boolean(chart.portraitStorageKey),
    portraitStorageKey: chart.portraitStorageKey ?? null,
    formResponses: formResponse ? [formResponse] : [],
    intakeDocuments: documents,
  };
}

/** اولویت بالینی = پرچم قرمز یا مثبت با توضیح یا مورد خاص (flags mode) */
export function isClinicalPriorityAnswer(row: {
  isRedFlag: boolean;
  isSpecial: boolean;
  hasNotes: boolean;
}): boolean {
  return row.isRedFlag || row.isSpecial || row.hasNotes;
}
