/*
 File: frontend/my/src/lib/__tests__/test-fixtures.ts
 Description: دادهٔ حداقلی برای تست‌های lib
 Parent Dependencies: types/clinic
 */

import type { CompanionLinkDto, PatientFullDto } from "@/types/clinic";
import { defaultCompanionVisibility } from "@/types/clinic";

export function minimalPatient(overrides: Partial<PatientFullDto> = {}): PatientFullDto {
  return {
    id: 1,
    qrToken: "QR-TEST",
    fullName: "مریم تست",
    nationalId: "0012345678",
    age: 35,
    gender: "زن",
    phone: "09123456789",
    pathwayTitle: "چکاپ",
    checkInTime: "2025-06-01T08:00:00.000Z",
    completedAt: null,
    intakeCompleted: false,
    medications: [],
    surgeries: [],
    familyHistory: [],
    allergies: [],
    recentConditions: [],
    intakeAnswers: {
      currentSymptoms: "",
      lastMeal: "",
      smoking: "",
      breathlessness: "",
      chestPain: "",
      dentalBleeding: "",
      pregnancyStatus: "",
      medicationChanges: "",
      supplements: "",
      anticoagulantUse: "",
      fastingStatus: "",
      diabetesStatus: "",
    },
    formResponses: [],
    autoOpenWayfinding: false,
    journeyIntroSeen: false,
    stations: [],
    clinicalNotes: [],
    paraclinicResults: [],
    alerts: [],
    ...overrides,
  };
}

export function selfCompanionLink(overrides: Partial<CompanionLinkDto> = {}): CompanionLinkDto {
  return {
    id: 10,
    userId: 100,
    patientId: 1,
    relationship: "self",
    permission: "manage",
    visibility: defaultCompanionVisibility,
    ...overrides,
  };
}