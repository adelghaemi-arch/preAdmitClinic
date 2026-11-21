import { MOCK_DATASET, type MockDataset } from "@/lib/mock-dataset";
import { buildSeededContracts, buildSeededPathwayLibrary } from "@/lib/mock-contracts";
import {
  buildDemoSubmittedResponse,
  loadSeedForms,
  migrateDemoItemCodesInAnswers,
  resolveFormForPatient,
  stripSignatureParts,
} from "@/lib/form-engine";
import { rebuildPackagesFromFlat } from "@/lib/evidence-packages";
import { buildSeedPlatformState, DEFAULT_OSM_LOCAL } from "@/lib/mock-platform";
import {
  defaultCompanionVisibility,
  emptyIntakeAnswers,
  type CorporateContract,
  type FormDefinition,
  type PathwayLibraryRule,
  type PlatformState,
  type MockAlertRow,
  type MockLinkRow,
  type MockNoteRow,
  type MockPatientRow,
  type MockResultRow,
  type MockRoomRow,
  type MockStationRow,
  type MockUserRow,
} from "@/types/clinic";

/**
 * In-memory store برای مسیر legacy QR/kiosk و helperهای seed کلاینت.
 * دامنهٔ اصلی روی API+SQL Server است؛ این store جایگزین دیتابیس محصول نیست.
 */

export interface MockStore {
  clinicLocation: { lat: number; lon: number; address: string; city: string };
  appUsers: MockUserRow[];
  rooms: MockRoomRow[];
  pathways: MockDataset["pathways"];
  staff: MockDataset["staff"];
  patients: MockPatientRow[];
  stations: MockStationRow[];
  notes: MockNoteRow[];
  results: MockResultRow[];
  links: MockLinkRow[];
  alerts: MockAlertRow[];
  contracts: CorporateContract[];
  pathwayLibrary: PathwayLibraryRule[];
  forms: FormDefinition[];
  platform: PlatformState;
}

type DateField =
  | "checkInTime"
  | "completedAt"
  | "enteredQueueAt"
  | "checkedInAt"
  | "startedAt"
  | "createdAt"
  | "lastLoginAt";

function shiftTimestamps(dataset: MockDataset): MockDataset {
  const stamps: string[] = [];
  const collect = (value: unknown) => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) stamps.push(value);
  };
  dataset.patients.forEach((p) => { collect(p.checkInTime); collect(p.completedAt); });
  dataset.stations.forEach((s) => { collect(s.enteredQueueAt); collect(s.checkedInAt); collect(s.startedAt); collect(s.completedAt); });
  dataset.notes.forEach((n) => collect(n.createdAt));
  dataset.results.forEach((r) => collect(r.createdAt));
  dataset.alerts.forEach((a) => collect(a.createdAt));
  dataset.links.forEach((l) => collect(l.createdAt));
  dataset.appUsers.forEach((u) => collect(u.lastLoginAt));

  const times = stamps.map((s) => new Date(s).getTime()).filter((t) => Number.isFinite(t));
  if (!times.length) return dataset;
  // Keep the seeded relative spacing but anchor it to "now" so the demo always looks current.
  const delta = Date.now() - Math.max(...times);
  const shift = (value: string | null) => {
    if (!value) return value;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? new Date(time + delta).toISOString() : value;
  };
  dataset.patients.forEach((p) => {
    p.checkInTime = shift(p.checkInTime)!;
    p.completedAt = shift(p.completedAt);
  });
  dataset.stations.forEach((s) => {
    s.enteredQueueAt = shift(s.enteredQueueAt);
    s.checkedInAt = shift(s.checkedInAt);
    s.startedAt = shift(s.startedAt);
    s.completedAt = shift(s.completedAt);
  });
  dataset.notes.forEach((n) => { n.createdAt = shift(n.createdAt)!; });
  dataset.results.forEach((r) => { r.createdAt = shift(r.createdAt)!; });
  dataset.alerts.forEach((a) => { a.createdAt = shift(a.createdAt)!; });
  dataset.links.forEach((l) => { l.createdAt = shift(l.createdAt)!; });
  dataset.appUsers.forEach((u) => { u.lastLoginAt = shift(u.lastLoginAt); });
  return dataset;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Seed submitted formResponses for a few waiting-list patients so physician brief is demoable. */
function ensureDemoFormResponses(
  patients: MockPatientRow[],
  forms: FormDefinition[]
): MockPatientRow[] {
  const highlightsById: Record<number, string[]> = {
    1: ["CA_F_Q25", "CA_F_Q41"],
    2: ["CA_M_Q33", "CA_M_Q1"],
    3: ["CA_M_Q33"],
  };
  return patients.map((patient) => {
    const existing = patient.formResponses ?? [];
    const hasSubmitted = existing.some((r) => r.status === "submitted");
    if (hasSubmitted) {
      return { ...patient, formResponses: existing, intakeCompleted: true };
    }
    // Do not overwrite in-progress drafts; only seed when the patient has no responses at all.
    if (existing.length > 0) {
      return { ...patient, formResponses: existing, intakeCompleted: false };
    }
    const codes = highlightsById[patient.id];
    if (!codes) {
      return { ...patient, formResponses: existing, intakeCompleted: false };
    }
    const form = resolveFormForPatient(forms, patient.gender, patient.age);
    if (!form) {
      return { ...patient, formResponses: existing, intakeCompleted: false };
    }
    return {
      ...patient,
      formResponses: [buildDemoSubmittedResponse(patient, form, codes)],
      intakeCompleted: true,
    };
  });
}

function buildStore(): MockStore {
  const dataset = shiftTimestamps(clone(MOCK_DATASET));
  // Demo accounts share one simple mock password; nothing secret is stored or signed.
  dataset.appUsers = dataset.appUsers.map((user) => ({ ...user, canAccessAllRoles: true }));
  dataset.links = dataset.links.map((link) => ({
    ...link,
    visibility: { ...defaultCompanionVisibility, ...(link.visibility ?? {}) },
  }));
  const seedForms = loadSeedForms();
  dataset.patients = ensureDemoFormResponses(
    dataset.patients.map((patient) => ({
      ...patient,
      intakeAnswers: { ...emptyIntakeAnswers, ...(patient.intakeAnswers ?? {}) },
      formResponses: patient.formResponses ?? [],
    })),
    seedForms
  );
  if (!dataset.appUsers.some((u) => u.username === "supervisor")) {
    dataset.appUsers.push({
      id: dataset.appUsers.reduce((m, u) => Math.max(m, u.id), 0) + 1,
      username: "supervisor",
      fullName: "مهندس کامران بهشتی",
      jobTitle: "ناظر سلامت سازمان (هلدینگ پارس‌نفت · ۰۹۱۲۳۴۰۹۸۷۶)",
      primaryRole: "supervisor",
      medicalCouncilCode: "09123409876",
      canAccessAllRoles: true,
      isActive: true,
      lastLoginAt: new Date().toISOString(),
    });
  }
  const contracts = buildSeededContracts(dataset.pathways);
  if (!dataset.patients.some((p) => typeof p.homeLat === "number")) {
    // Demo home coordinates (Tehran districts) so the OSM routing demo works instantly.
    const homes: Array<[number, number, string]> = [
      [35.757, 51.41, "تهران، خیابان ولیعصر، نرسیده به میدان ونک"],
      [35.7238, 51.3342, "تهران، سعادت‌آباد، بلوار دریا"],
      [35.6892, 51.3891, "تهران، خیابان انقلاب، روبه‌روی دانشگاه تهران"],
      [35.7975, 51.4362, "تهران، تجریش، بلوار اندیشه"],
      [35.7089, 51.4377, "تهران، نارمک، میدان هلال احمر"],
    ];
    dataset.patients.forEach((p, i) => {
      const h = homes[i % homes.length];
      p.homeLat = h[0];
      p.homeLon = h[1];
      p.homeAddress = h[2];
    });
  }
  const seededContracts = buildSeededContracts(dataset.pathways);
  const platform = buildSeedPlatformState();
  // Mirror seeded portraits onto patient rows so the EMR and photo gate stay consistent.
  for (const photo of platform.photos) {
    if (photo.kind !== "portrait" && photo.kind !== "fraud_confirm") continue;
    const patient = dataset.patients.find((p) => p.id === photo.patientId);
    if (patient && !patient.photoDataUrl) patient.photoDataUrl = photo.dataUrl;
  }

  return {
    ...(dataset as Omit<MockStore, "contracts" | "pathwayLibrary" | "clinicLocation" | "forms" | "platform">),
    clinicLocation: { lat: 35.7448, lon: 51.3753, address: "تهران، خیابان کارگر شمالی، بین بهشتی و مجیدیه، پلاک ۱۲۰", city: "تهران" },
    contracts: seededContracts,
    pathwayLibrary: buildSeededPathwayLibrary(),
    forms: seedForms,
    platform,
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __nabzMockStore: MockStore | undefined;
}

function store(): MockStore {
  if (!globalThis.__nabzMockStore) {
    globalThis.__nabzMockStore = buildStore();
  }
  return globalThis.__nabzMockStore;
}

/* ----------------------------- read helpers ----------------------------- */
export const mockStore = {
  get users() { return store().appUsers; },
  get clinicLocation() { return store().clinicLocation; },
  updateClinicLocation(patch: Partial<MockStore["clinicLocation"]>) { Object.assign(store().clinicLocation, patch); },
  updatePatientHome(
    patientId: number,
    patch: {
      homeLat?: number | null;
      homeLon?: number | null;
      homeAddress?: string | null;
      homePlaque?: string | null;
      homeUnit?: string | null;
      homePostalCode?: string | null;
    }
  ) {
    const p = store().patients.find((x) => x.id === patientId);
    if (p) Object.assign(p, patch);
  },
  get rooms() { return store().rooms; },
  get pathways() { return store().pathways; },
  get staff() { return store().staff; },
  get patients() { return store().patients; },
  get stations() { return store().stations; },
  get notes() { return store().notes; },
  get results() { return store().results; },
  get links() { return store().links; },
  get alerts() { return store().alerts; },
  get contracts() { return store().contracts; },
  get pathwayLibrary() { return store().pathwayLibrary; },
  get forms() { return store().forms; },
  get platform() { return store().platform; },
  formById(id: string) { return store().forms.find((f) => f.id === id) ?? null; },
  libraryRuleById(id: string) { return store().pathwayLibrary.find((r) => r.id === id) ?? null; },
  contractById(id: number) { return store().contracts.find((c) => c.id === id) ?? null; },

  userById(id: number) { return store().appUsers.find((u) => u.id === id) ?? null; },
  userByUsername(username: string) {
    const key = username.trim().toLowerCase();
    return store().appUsers.find((u) => u.username.toLowerCase() === key) ?? null;
  },
  patientById(id: number) { return store().patients.find((p) => p.id === id) ?? null; },
  patientByToken(token: string) {
    const key = token.trim().toUpperCase();
    return store().patients.find((p) => p.qrToken.toUpperCase() === key) ?? null;
  },
  patientByNationalId(nationalId: string) {
    const key = nationalId.replace(/\D/g, "");
    return store().patients.filter((p) => p.nationalId.replace(/\D/g, "") === key);
  },
  stationsOf(patientId: number) {
    return store().stations
      .filter((s) => s.patientId === patientId)
      .sort((a, b) => a.stepOrder - b.stepOrder);
  },
  stationById(id: number) { return store().stations.find((s) => s.id === id) ?? null; },
  notesOf(patientId: number) { return store().notes.filter((n) => n.patientId === patientId); },
  resultsOf(patientId: number) { return store().results.filter((r) => r.patientId === patientId); },
  alertsOf(patientId: number) { return store().alerts.filter((a) => a.patientId === patientId); },
  alertsOfPatient(patientId: number) { return store().alerts.filter((a) => a.patientId === patientId); },
  linksOfPatient(patientId: number) { return store().links.filter((l) => l.patientId === patientId); },
  linksOfUser(userId: number) { return store().links.filter((l) => l.userId === userId); },
  roomByCode(code: string) { return store().rooms.find((r) => r.code === code) ?? null; },
};

/* ----------------------------- write helpers ----------------------------- */
function nextId(rows: { id: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

export const mockMutations = {
  insertPatient(values: Omit<MockPatientRow, "id">): MockPatientRow {
    const patient: MockPatientRow = { ...values, id: nextId(store().patients) };
    store().patients.push(patient);
    return patient;
  },
  updatePatient(id: number, patch: Partial<MockPatientRow>): MockPatientRow | null {
    const patient = mockStore.patientById(id);
    if (!patient) return null;
    Object.assign(patient, patch);
    return patient;
  },
  insertStation(values: Omit<MockStationRow, "id">): MockStationRow {
    const station: MockStationRow = { ...values, id: nextId(store().stations) };
    store().stations.push(station);
    return station;
  },
  updateStation(id: number, patch: Partial<MockStationRow>): MockStationRow | null {
    const station = mockStore.stationById(id);
    if (!station) return null;
    Object.assign(station, patch);
    return station;
  },
  insertNote(values: Omit<MockNoteRow, "id">): MockNoteRow {
    const note: MockNoteRow = { ...values, id: nextId(store().notes) };
    store().notes.push(note);
    return note;
  },
  insertResult(values: Omit<MockResultRow, "id">): MockResultRow {
    const result: MockResultRow = { ...values, id: nextId(store().results) };
    store().results.push(result);
    return result;
  },
  insertAlert(values: Omit<MockAlertRow, "id">): MockAlertRow {
    const alert: MockAlertRow = { ...values, id: nextId(store().alerts) };
    store().alerts.push(alert);
    return alert;
  },
  insertLink(values: Omit<MockLinkRow, "id">): MockLinkRow {
    const link: MockLinkRow = { ...values, id: nextId(store().links) };
    store().links.push(link);
    return link;
  },
  updateLink(id: number, patch: Partial<MockLinkRow>): MockLinkRow | null {
    const link = store().links.find((l) => l.id === id);
    if (!link) return null;
    Object.assign(link, patch);
    return link;
  },
  removeLink(id: number) {
    const index = store().links.findIndex((l) => l.id === id);
    if (index >= 0) store().links.splice(index, 1);
  },
  removePatient(id: number) {
    const index = store().patients.findIndex((p) => p.id === id);
    if (index >= 0) store().patients.splice(index, 1);
    store().stations = store().stations.filter((s) => s.patientId !== id);
    store().notes = store().notes.filter((n) => n.patientId !== id);
    store().results = store().results.filter((r) => r.patientId !== id);
    store().alerts = store().alerts.filter((a) => a.patientId !== id);
    store().links = store().links.filter((l) => l.patientId !== id);
  },
  touchUserLogin(id: number, at: string) {
    const user = mockStore.userById(id);
    if (user) user.lastLoginAt = at;
  },
  upsertForm(form: FormDefinition): FormDefinition {
    const list = store().forms;
    const idx = list.findIndex((f) => f.id === form.id);
    if (idx < 0) list.push(form);
    else list[idx] = form;
    return form;
  },
  replaceForms(forms: FormDefinition[]) {
    store().forms = forms;
  },
};

/** Serialisable copy of the whole store (used for the browser-local mirror). */
export function dumpMockStore(): MockStore {
  const current = store();
  return JSON.parse(JSON.stringify(current)) as MockStore;
}

/** Replaces the store contents with a previously dumped copy (browser reload). */
export function hydrateMockStore(data: Partial<MockStore>): void {
  const current = store();
  current.appUsers = data.appUsers ?? current.appUsers;
  current.rooms = data.rooms ?? current.rooms;
  current.pathways = data.pathways ?? current.pathways;
  current.staff = data.staff ?? current.staff;
  current.patients = data.patients ?? current.patients;
  current.stations = data.stations ?? current.stations;
  current.notes = data.notes ?? current.notes;
  current.results = data.results ?? current.results;
  current.links = data.links ?? current.links;
  current.alerts = data.alerts ?? current.alerts;
  current.contracts =
    Array.isArray(data.contracts) && data.contracts.length > 0
      ? data.contracts
      : buildSeededContracts(current.pathways);
  current.pathwayLibrary =
    Array.isArray(data.pathwayLibrary) && data.pathwayLibrary.length > 0
      ? data.pathwayLibrary
      : buildSeededPathwayLibrary();
  if (!current.clinicLocation) current.clinicLocation = { lat: 35.7448, lon: 51.3753, address: "تهران، خیابان کارگر شمالی، پلاک ۱۲۰", city: "تهران" };
  // Catalog forms always refresh from the bundled seed (titles/structure); keep any extra admin forms.
  {
    const seedForms = loadSeedForms();
    const seedIds = new Set(seedForms.map((f) => f.id));
    const extras = Array.isArray(data.forms)
      ? data.forms
          .filter((f) => f?.id && !seedIds.has(f.id))
          .map((f) => migrateFormDemoIdentifiers(stripSignatureParts(f)))
      : [];
    current.forms = [...seedForms, ...extras];
  }
  current.patients = ensureDemoFormResponses(
    (current.patients ?? []).map((p) => {
      const formResponses = (p.formResponses ?? []).map((response) => ({
        ...response,
        answers: migrateDemoItemCodesInAnswers(response.answers ?? []),
      }));
      return {
        ...p,
        formResponses,
        intakeAnswers: { ...emptyIntakeAnswers, ...(p.intakeAnswers ?? {}) },
        intakeCompleted: formResponses.some((r) => r.status === "submitted"),
      };
    }),
    current.forms
  );
  if (!current.appUsers.some((u) => u.username === "supervisor")) {
    current.appUsers.push({
      id: current.appUsers.reduce((m, u) => Math.max(m, u.id), 0) + 1,
      username: "supervisor",
      fullName: "مهندس کامران بهشتی",
      jobTitle: "ناظر سلامت سازمان (هلدینگ پارس‌نفت · ۰۹۱۲۳۴۰۹۸۷۶)",
      primaryRole: "supervisor",
      medicalCouncilCode: "09123409876",
      canAccessAllRoles: true,
      isActive: true,
      lastLoginAt: new Date().toISOString(),
    });
  }
  if (data.platform && Array.isArray(data.platform.clinics) && data.platform.clinics.length > 0) {
    const platform = data.platform as PlatformState;
    if (!Array.isArray(platform.packages) || platform.packages.length === 0) {
      rebuildPackagesFromFlat(platform);
    }
    platform.users = (platform.users ?? []).map((u) => ({
      ...u,
      email: u.email ?? "",
      notes: u.notes ?? "",
      createdAt: u.createdAt ?? new Date().toISOString(),
      lastLoginAt: u.lastLoginAt ?? null,
      profilePhotoDataUrl: u.profilePhotoDataUrl ?? null,
      primaryRole: u.primaryRole ?? "patient",
      roleLabel: u.roleLabel || "سلامتجو",
      gpsHistory: u.gpsHistory ?? [],
      isActive: u.isActive !== false,
    }));
    platform.authSessions = Array.isArray(platform.authSessions) ? platform.authSessions : [];
    platform.multiSessionAlerts = Array.isArray(platform.multiSessionAlerts)
      ? platform.multiSessionAlerts
      : [];
    platform.settings = {
      ...platform.settings,
      featureFlags: {
        ...platform.settings.featureFlags,
        multiClinicRegistry: false,
        multiSessionWatch: platform.settings.featureFlags?.multiSessionWatch ?? true,
      },
      osmLocal: {
        ...DEFAULT_OSM_LOCAL,
        ...(platform.settings.osmLocal ?? {}),
      },
    };
    // Keep only the current tenant clinic in the admin surface (single-tenant).
    if (Array.isArray(platform.clinics) && platform.clinics.length > 1) {
      const currentTenant = platform.clinics.find((c) => c.isCurrentTenant) ?? platform.clinics[0];
      platform.clinics = currentTenant ? [{ ...currentTenant, isCurrentTenant: true }] : platform.clinics.slice(0, 1);
    }
    current.platform = platform;
  } else {
    current.platform = buildSeedPlatformState();
  }
}

/** Rename legacy demographics DEMO tokens to BASE on admin-extra forms. */
function migrateFormDemoIdentifiers(form: FormDefinition): FormDefinition {
  const next = structuredClone(form);
  next.sections = next.sections.map((s) => ({
    ...s,
    code: s.code.replace(/_SEC_DEMO\b/g, "_SEC_BASE"),
  }));
  next.items = next.items.map((item) => ({
    ...item,
    id: item.id.replace(/_DEMO_/g, "_BASE_"),
    code: item.code.replace(/_DEMO_/g, "_BASE_"),
  }));
  return next;
}

/** Restores the bundled demo dataset (used by the "reset demo data" action). */
export function resetMockStore(): void {
  globalThis.__nabzMockStore = buildStore();
}
