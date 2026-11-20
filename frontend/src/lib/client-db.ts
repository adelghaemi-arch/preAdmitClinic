import { getClinicSnapshot } from "@/lib/clinic-server";
import { scopeSnapshot, type SnapshotViewer } from "@/lib/clinic-scope";
import { handleClinicAction } from "@/lib/clinic-actions";
import { dumpMockStore, hydrateMockStore, mockStore, resetMockStore, type MockStore } from "@/lib/mock-store";
import type { ClinicSnapshot } from "@/types/clinic";

/**
 * Legacy QR/kiosk client DB (`nabz_clinic_db_v8`).
 * دامنهٔ اصلی کلینیک از API+DB می‌آید؛ این لایه فقط مسیر `/patient?token=` را تغذیه می‌کند.
 */

const DB_KEY = "nabz_clinic_db_v8";
let hydrated = false;

export function ensureClientDb(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MockStore>;
      if (parsed && Array.isArray(parsed.patients) && parsed.patients.length) {
        hydrateMockStore(parsed);
        return;
      }
    }
  } catch {
    // ignore corrupt payloads and fall back to the bundled seed
  }
  // First visit: touch the store (this also normalises demo timestamps to "now"),
  // then immediately persist so reloads keep the same demo day.
  void mockStore.patients;
  persistClientDb();
}

export function persistClientDb(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(dumpMockStore()));
  } catch {
    // A full quota must never break the clinical UI.
  }
}

export function resetClientDb(): void {
  resetMockStore();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(DB_KEY);
    } catch {}
  }
  persistClientDb();
}

/** Scoped snapshot for the given role, straight from the browser store. */
export async function readSnapshot(viewer?: SnapshotViewer | null): Promise<ClinicSnapshot> {
  ensureClientDb();
  const snapshot = await getClinicSnapshot();
  return scopeSnapshot(snapshot, viewer);
}

export interface EngineResult {
  ok: boolean;
  error?: string;
  status: number;
  snapshot?: ClinicSnapshot;
  createdPatientId?: number;
  qrToken?: string;
  candidates?: unknown[];
  found?: boolean;
  patient?: unknown;
  visits?: unknown[];
  activeVisitId?: number | null;
  user?: unknown;
  wasCurrent?: boolean;
  revokedCount?: number;
  sessionId?: string;
}

export interface DispatchOptions {
  viewer?: SnapshotViewer | null;
  role?: string;
  /** Skip role scoping (used by the internal hydration call). */
  unscoped?: boolean;
}

/** Runs a clinic action in the browser and persists the result locally. */
export async function dispatchClinicAction(
  payload: Record<string, unknown>,
  { viewer, role, unscoped }: DispatchOptions = {}
): Promise<EngineResult> {
  ensureClientDb();
  const effectiveViewer = viewer ? { ...viewer, role: role ?? viewer.role } : null;
  const response = await handleClinicAction({ role, ...payload }, effectiveViewer);
  const data = (await response.json()) as Record<string, unknown>;
  persistClientDb();

  if (unscoped || data.snapshot == null) {
    return { ...(data as unknown as EngineResult), status: response.status };
  }
  const snapshot = scopeSnapshot(data.snapshot as ClinicSnapshot, effectiveViewer);
  return { ...(data as unknown as EngineResult), snapshot, status: response.status };
}
