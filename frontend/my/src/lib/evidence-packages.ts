import { randomUUID } from "@/lib/uuid";
import type { EvidencePackage, EvidencePackageKind, GpsPoint, PlatformState, UserPhotoRecord } from "@/types/clinic";

/** Consecutive events within this window join the same burst package. */
export const BURST_GAP_MS = 15 * 60 * 1000;

const TEHRAN_TZ = "Asia/Tehran";

export function tehranDayKey(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "unknown";
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TEHRAN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function faDayLabel(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: TEHRAN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function kindLabel(kind: EvidencePackageKind, at: string): string {
  if (kind === "camera_session") return "جلسه دوربین پیش‌پذیرش";
  if (kind === "burst") return "ثبت پشت‌سرهم";
  return `روز ${faDayLabel(at)}`;
}

function packagesOfPatient(state: PlatformState, patientId: number): EvidencePackage[] {
  return state.packages
    .filter((p) => p.patientId === patientId)
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
}

/** Find or create the evidence package for a new photo/GPS event. */
export function resolveOrCreatePackage(
  state: PlatformState,
  opts: {
    patientId: number;
    userId: number | null;
    at: string;
    sessionId?: string | null;
  }
): EvidencePackage {
  if (!Array.isArray(state.packages)) state.packages = [];

  const sessionId = opts.sessionId?.trim() || null;
  if (sessionId) {
    const bySession = state.packages.find((p) => p.sessionId === sessionId);
    if (bySession) {
      bySession.endedAt = opts.at;
      if (new Date(opts.at).getTime() < new Date(bySession.startedAt).getTime()) {
        bySession.startedAt = opts.at;
      }
      return bySession;
    }
    const created: EvidencePackage = {
      id: randomUUID(),
      patientId: opts.patientId,
      userId: opts.userId,
      kind: "camera_session",
      startedAt: opts.at,
      endedAt: opts.at,
      sessionId,
      dayKey: tehranDayKey(opts.at),
      label: kindLabel("camera_session", opts.at),
    };
    state.packages.unshift(created);
    return created;
  }

  const recent = packagesOfPatient(state, opts.patientId)[0];
  const atMs = new Date(opts.at).getTime();
  if (recent) {
    const gap = atMs - new Date(recent.endedAt).getTime();
    if (gap >= 0 && gap <= BURST_GAP_MS) {
      recent.endedAt = opts.at;
      if (recent.kind === "day") {
        recent.kind = "burst";
        recent.label = kindLabel("burst", opts.at);
      }
      return recent;
    }
    // Also allow attaching when event is slightly earlier than endedAt (clock skew / out-of-order).
    const gapBack = new Date(recent.endedAt).getTime() - atMs;
    if (gapBack >= 0 && gapBack <= BURST_GAP_MS) {
      if (atMs < new Date(recent.startedAt).getTime()) recent.startedAt = opts.at;
      return recent;
    }
  }

  const dayKey = tehranDayKey(opts.at);
  const sameDay = packagesOfPatient(state, opts.patientId).find(
    (p) => p.kind === "day" && p.dayKey === dayKey && !p.sessionId
  );
  if (sameDay) {
    sameDay.endedAt = opts.at;
    if (atMs < new Date(sameDay.startedAt).getTime()) sameDay.startedAt = opts.at;
    return sameDay;
  }

  const created: EvidencePackage = {
    id: randomUUID(),
    patientId: opts.patientId,
    userId: opts.userId,
    kind: "day",
    startedAt: opts.at,
    endedAt: opts.at,
    sessionId: null,
    dayKey,
    label: kindLabel("day", opts.at),
  };
  state.packages.unshift(created);
  return created;
}

/** Ensure camera session has a linked package; create if missing. */
export function ensureCameraSessionPackage(
  state: PlatformState,
  opts: { sessionId: string; patientId: number; userId: number | null; at: string }
): EvidencePackage {
  const existing = state.packages.find((p) => p.sessionId === opts.sessionId);
  if (existing) return existing;
  return resolveOrCreatePackage(state, {
    patientId: opts.patientId,
    userId: opts.userId,
    at: opts.at,
    sessionId: opts.sessionId,
  });
}

export function photosInPackage(photos: UserPhotoRecord[], packageId: string): UserPhotoRecord[] {
  return photos
    .filter((p) => p.packageId === packageId)
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
}

export function gpsInPackage(points: GpsPoint[], packageId: string): GpsPoint[] {
  return points
    .filter((p) => p.packageId === packageId)
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
}

/** Rebuild packages from flat photos/gps when hydrating older stores. */
export function rebuildPackagesFromFlat(state: PlatformState): EvidencePackage[] {
  type Event = { at: string; patientId: number; userId: number | null; sessionId: string | null; apply: (pkgId: string) => void };
  const events: Event[] = [];

  for (const photo of state.photos ?? []) {
    events.push({
      at: photo.capturedAt,
      patientId: photo.patientId,
      userId: photo.userId,
      sessionId: photo.sessionId,
      apply: (pkgId) => {
        photo.packageId = pkgId;
        if (photo.gps) photo.gps.packageId = pkgId;
      },
    });
  }
  for (const user of state.users ?? []) {
    if (user.patientId == null) continue;
    for (const g of user.gpsHistory ?? []) {
      events.push({
        at: g.capturedAt,
        patientId: user.patientId,
        userId: user.userId,
        sessionId: g.source === "camera_session" ? null : null,
        apply: (pkgId) => {
          g.packageId = pkgId;
        },
      });
    }
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  state.packages = [];
  for (const ev of events) {
    // Prefer linking camera frames via sessionId when present.
    const pkg = resolveOrCreatePackage(state, {
      patientId: ev.patientId,
      userId: ev.userId,
      at: ev.at,
      sessionId: ev.sessionId,
    });
    ev.apply(pkg.id);
  }

  for (const session of state.fraudSessions ?? []) {
    const pkg = state.packages.find((p) => p.sessionId === session.id);
    if (pkg) session.packageId = pkg.id;
  }

  return state.packages;
}
