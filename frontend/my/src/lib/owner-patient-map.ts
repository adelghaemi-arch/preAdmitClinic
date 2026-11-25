/*
 File: frontend/my/src/lib/owner-patient-map.ts
 Description: نگاشت OwnerIntakeSnapshot API به PatientFullDto برای hydrate
 Parent Dependencies: api/patients, api/roles, types/clinic, person-identity
 */

import type { OwnerIntakeSnapshotApi } from "@/lib/api/patients";
import { guidToNumericId } from "@/lib/api/roles";
import { normalizeMaritalStatus } from "@/lib/marital-status";
import { ageFromBirthIso } from "@/lib/person-identity";
import {
  defaultCompanionVisibility,
  type CompanionLinkDto,
  type PathwayItineraryStationDto,
  type PatientFullDto,
} from "@/types/clinic";

export function mapOwnerSnapshotToPatient(snap: OwnerIntakeSnapshotApi): PatientFullDto {
  const p = snap.patient;
  const gate =
    snap.intakeGate === "already_complete"
      ? "already_complete"
      : snap.intakeGate === "needs_form"
        ? "needs_form"
        : null;
  const birthDate = p.birthDate ? String(p.birthDate).slice(0, 10) : null;
  return {
    id: guidToNumericId(p.id),
    serverId: p.id,
    qrToken: "",
    fullName: p.fullName || `${p.firstName} ${p.lastName}`.trim(),
    firstName: p.firstName,
    lastName: p.lastName,
    fatherName: p.fatherName ?? null,
    nationalId: p.nationalId,
    // اگر age از API نیاید از تولد حساب کن تا visibility ≥۵۰ نشکند
    age: p.age ?? ageFromBirthIso(birthDate) ?? 0,
    // DateOnly API گاهی با زمان می‌آید؛ برای PersianDateField فقط YYYY-MM-DD
    birthDate,
    gender: p.gender ?? "",
    maritalStatus: normalizeMaritalStatus(p.maritalStatus) ?? p.maritalStatus ?? null,
    phone: p.phone,
    pathwayTitle: p.assignedPathwayTitle ?? "",
    scheduledVisitDate: p.scheduledVisitDate ? String(p.scheduledVisitDate).slice(0, 10) : null,
    checkInTime: new Date().toISOString(),
    completedAt: null,
    intakeCompleted: p.intakeCompleted || gate === "already_complete",
    intakeGate: gate,
    // درصد پیش‌نویس از سرور تا نقشه راه بعد از بستن/باز کردن صفر نماند
    formProgressPct: Math.min(100, Math.max(0, Number(snap.formProgressPct ?? 0))),
    hasPortrait: snap.hasPortrait,
    portraitStorageKey: snap.portraitStorageKey ?? null,
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
    // itinerary از کاتالوگ بک‌اند — جدا از VisitStation صف
    pathwayItinerary: (snap.pathwayItinerary ?? []).map(
      (s): PathwayItineraryStationDto => ({
        stationDefId: s.stationDefId,
        roomCode: s.roomCode,
        titleFa: s.titleFa,
        stepOrder: s.stepOrder,
        isOptional: s.isOptional,
        confirmed: s.confirmed,
        confirmedAt: s.confirmedAt ?? null,
      }),
    ),
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
