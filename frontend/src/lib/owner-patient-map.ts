/*
 File: frontend/src/lib/owner-patient-map.ts
 Description: نگاشت OwnerIntakeSnapshot API به PatientFullDto برای hydrate
 Parent Dependencies: api/patients, api/roles, types/clinic
 */

import type { OwnerIntakeSnapshotApi } from "@/lib/api/patients";
import { guidToNumericId } from "@/lib/api/roles";
import { normalizeMaritalStatus } from "@/lib/marital-status";
import { defaultCompanionVisibility, type CompanionLinkDto, type PatientFullDto } from "@/types/clinic";

export function mapOwnerSnapshotToPatient(snap: OwnerIntakeSnapshotApi): PatientFullDto {
  const p = snap.patient;
  const gate =
    snap.intakeGate === "already_complete"
      ? "already_complete"
      : snap.intakeGate === "needs_form"
        ? "needs_form"
        : null;
  return {
    id: guidToNumericId(p.id),
    serverId: p.id,
    qrToken: "",
    fullName: p.fullName || `${p.firstName} ${p.lastName}`.trim(),
    firstName: p.firstName,
    lastName: p.lastName,
    fatherName: p.fatherName ?? null,
    nationalId: p.nationalId,
    age: p.age ?? 0,
    birthDate: p.birthDate ?? null,
    gender: p.gender ?? "",
    maritalStatus: normalizeMaritalStatus(p.maritalStatus) ?? p.maritalStatus ?? null,
    phone: p.phone,
    pathwayTitle: p.assignedPathwayTitle ?? "",
    scheduledVisitDate: p.scheduledVisitDate ? String(p.scheduledVisitDate).slice(0, 10) : null,
    checkInTime: new Date().toISOString(),
    completedAt: null,
    intakeCompleted: p.intakeCompleted || gate === "already_complete",
    intakeGate: gate,
    hasPortrait: snap.hasPortrait,
    profileComplete: snap.profileComplete !== false,
    hospitalIntroStatus:
      snap.hospitalIntroStatus === "introduced" ||
      snap.hospitalIntroStatus === "not_introduced" ||
      snap.hospitalIntroStatus === "mobile_mismatch"
        ? snap.hospitalIntroStatus
        : null,
    hospitalName: snap.hospitalName ?? null,
    introducedMobileMasked: snap.introducedMobileMasked ?? null,
    medications: [],
    surgeries: [],
    familyHistory: [],
    allergies: [],
    recentConditions: [],
    intakeAnswers: {},
    formResponses: [],
    autoOpenWayfinding: false,
    // منبع حقیقت سرور؛ تکمیل intake هم intro را پوشش می‌دهد
    journeyIntroSeen: Boolean(p.journeyIntroSeen) || Boolean(p.intakeCompleted) || gate === "already_complete",
    homeLat: p.homeLat ?? null,
    homeLon: p.homeLon ?? null,
    homeAddress: p.homeAddress ?? null,
    homePlaque: p.homePlaque ?? null,
    homeUnit: p.homeUnit ?? null,
    homePostalCode: p.homePostalCode ?? null,
    stations: [],
    clinicalNotes: [],
    paraclinicResults: [],
    alerts: [],
  };
}

export function selfLinkForOwner(userId: number, patientId: number): CompanionLinkDto {
  return {
    id: patientId,
    userId,
    patientId,
    relationship: "self",
    permission: "manage",
    visibility: { ...defaultCompanionVisibility, journey: true, clinicalIntake: true },
  };
}
