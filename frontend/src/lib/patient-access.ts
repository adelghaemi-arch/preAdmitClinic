import { mockStore } from "@/lib/mock-store";
import { getClinicSnapshot } from "@/lib/clinic-server";
import type { ClinicSnapshot } from "@/types/clinic";

/** Scope for the anonymous QR access of one specific patient. */
export function scopePatientSnapshot(snapshot: ClinicSnapshot, patientId: number): ClinicSnapshot {
  return { ...snapshot, links: [], staff: [], pathways: [], patients: snapshot.patients.filter((p) => p.id === patientId) };
}

export function getPatientByToken(token: string) {
  return mockStore.patientByToken(token);
}

export async function getPatientSnapshot(token: string) {
  const patient = mockStore.patientByToken(token);
  if (!patient) return null;
  return scopePatientSnapshot(await getClinicSnapshot(), patient.id);
}
