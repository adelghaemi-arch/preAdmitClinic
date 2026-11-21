import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/mock-platform";
import {
  defaultCompanionVisibility,
  type ClinicSnapshot,
  type CompanionVisibility,
  type PatientFullDto,
  type PlatformState,
} from "@/types/clinic";

export interface SnapshotViewer {
  userId: number;
  role: string;
}

function redactPlatform(snapshot: ClinicSnapshot, viewerUserId?: number): PlatformState {
  const settings = snapshot.platform?.settings ?? { ...DEFAULT_PLATFORM_SETTINGS };
  const ownSessions =
    viewerUserId != null
      ? (snapshot.platform?.authSessions ?? []).filter((s) => s.userId === viewerUserId)
      : [];
  return {
    clinics: [],
    users: [],
    photos: [],
    packages: [],
    fraudSessions: [],
    authSessions: ownSessions,
    multiSessionAlerts: [],
    apiAbuseIncidents: [],
    health: [],
    integrations: [],
    settings: {
      ...settings,
      featureFlags: {
        ...settings.featureFlags,
        multiClinicRegistry: false,
        multiSessionWatch: settings.featureFlags?.multiSessionWatch ?? true,
      },
      osmLocal: {
        ...DEFAULT_PLATFORM_SETTINGS.osmLocal,
        ...(settings.osmLocal ?? {}),
      },
    },
    audit: [],
  };
}

/** Removes the fields a companion is not allowed to see. The patient keeps everything. */
export function filterPatientForCompanion(patient: PatientFullDto, visibility: CompanionVisibility = defaultCompanionVisibility): PatientFullDto {
  return {
    ...patient,
    nationalId: "",
    phone: "",
    medications: visibility.medications ? patient.medications : [],
    allergies: visibility.allergies ? patient.allergies : [],
    surgeries: [],
    familyHistory: visibility.familyHistory ? patient.familyHistory : [],
    recentConditions: [],
    intakeAnswers: {
      ...patient.intakeAnswers,
      currentSymptoms: "",
      medicationChanges: "",
      lastMeal: "",
      chestPain: "",
      breathlessness: "",
      dentalBleeding: "",
      pregnancyStatus: "",
      anticoagulantUse: "",
      fastingStatus: "",
      diabetesStatus: "",
      smoking: "",
      supplements: "",
    },
    formResponses: visibility.clinicalIntake === true ? patient.formResponses ?? [] : [],
    paraclinicResults: visibility.results ? patient.paraclinicResults : [],
    clinicalNotes: visibility.diagnoses
      ? patient.clinicalNotes.map((note) => ({
          ...note,
          examFindings: visibility.results ? note.examFindings : "",
        }))
      : [],
    stations: visibility.journey ? patient.stations : [],
    alerts: visibility.journey
      ? patient.alerts.map((alert) => ({
          ...alert,
          message:
            alert.alertType === "result_ready"
              ? "پرونده به‌روزرسانی شد."
              : alert.alertType === "general"
                ? "اطلاع‌رسانی پذیرش کلینیک ثبت شد."
                : alert.message,
        }))
      : [],
  };
}

/** Limits the snapshot to what the viewer may see, based on the active role. */
export function scopeSnapshot(snapshot: ClinicSnapshot, viewer?: SnapshotViewer | null): ClinicSnapshot {
  if (!viewer) return snapshot;
  const ownLinks = snapshot.links.filter((link) => link.userId === viewer.userId);
  if (viewer.role === "platform") {
    return {
      ...snapshot,
      // Platform admin focuses on control-plane data; clinical PHI stays out of this pane.
      patients: snapshot.patients.map((p) => ({
        ...p,
        medications: [],
        surgeries: [],
        familyHistory: [],
        allergies: [],
        recentConditions: [],
        clinicalNotes: [],
        paraclinicResults: [],
        alerts: [],
        formResponses: [],
        stations: [],
      })),
      links: [],
      staff: [],
      pathways: [],
      pathwayLibrary: [],
      contracts: [],
      forms: [],
    };
  }
  if (viewer.role === "supervisor") {
    // External corporate supervisor sees contract progress, funnel & appointments — never private clinical notes/allergies.
    return {
      ...snapshot,
      pathwayLibrary: [],
      links: [],
      staff: [],
      patients: [],
      platform: redactPlatform(snapshot, viewer.userId),
      clinicLocation: snapshot.clinicLocation,
      contracts: snapshot.contracts.map((contract) => ({
        ...contract,
        apiKey: "••••••••",
        members: contract.members.map((m) => ({
          ...m,
          draftAllergies: "",
          draftMedications: "",
          draftSymptoms: "",
        })),
      })),
    };
  }
  if (viewer.role !== "patient" && viewer.role !== "owner") {
    return { ...snapshot, links: ownLinks, platform: redactPlatform(snapshot, viewer.userId) };
  }

  const roleLinks = ownLinks.filter((link) =>
    viewer.role === "owner" ? link.relationship === "self" : link.relationship !== "self"
  );
  const selfPatientIds = new Set(
    ownLinks.filter((link) => link.relationship === "self").map((link) => link.patientId)
  );
  const links =
    viewer.role === "owner"
      ? snapshot.links.filter((link) => link.userId === viewer.userId || selfPatientIds.has(link.patientId))
      : roleLinks;
  const linksByPatient = new Map(roleLinks.map((link) => [link.patientId, link]));
  const visiblePatients = snapshot.patients.filter((patient) => linksByPatient.has(patient.id));
  const visibleNationalIds = new Set(
    visiblePatients
      .filter((patient) => linksByPatient.get(patient.id)?.relationship === "self" || viewer.role === "patient")
      .map((patient) => patient.nationalId)
      .filter(Boolean)
  );

  // Patients only see their own contract membership (for roadmap scheduling + hospital navigation gate).
  const membershipContracts = snapshot.contracts
    .filter((contract) => contract.status === "active" && contract.members.some((m) => visibleNationalIds.has(m.nationalId)))
    .map((contract) => ({
      ...contract,
      apiKey: "••••••••",
      apiEndpoint: "",
      pathwayRules: [],
      dayQuotas: [],
      smsLogs: [],
      supervisor: {
        ...contract.supervisor,
        phone: "",
        nationalId: "",
      },
      members: contract.members
        .filter((m) => visibleNationalIds.has(m.nationalId))
        .map((m) => ({
          ...m,
          draftAllergies: "",
          draftMedications: "",
          draftSymptoms: "",
          inviteToken: "",
        })),
    }));

  return {
    ...snapshot,
    links,
    staff: [],
    pathways: [],
    contracts: membershipContracts,
    pathwayLibrary: [],
    platform: redactPlatform(snapshot, viewer.userId),
    clinicLocation: snapshot.clinicLocation,
    patients: visiblePatients.map((patient) => {
      const link = linksByPatient.get(patient.id)!;
      return link.relationship === "self" ? patient : filterPatientForCompanion(patient, link.visibility);
    }),
  };
}
