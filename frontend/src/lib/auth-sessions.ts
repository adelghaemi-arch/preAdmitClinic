import { randomUUID } from "@/lib/uuid";
import { mockStore } from "@/lib/mock-store";
import type { AuthAppSurface, AuthSession, MultiSessionAlert } from "@/types/clinic";

export const SESSION_ID_KEY = "nabz_session_id";

const MULTI_SESSION_THRESHOLD = 2;

export function readSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_ID_KEY);
  } catch {
    return null;
  }
}

export function writeSessionId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_ID_KEY, id);
  } catch {}
}

export function clearSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_ID_KEY);
  } catch {}
}

function pushAudit(actor: string, action: string, target: string, detail: string) {
  const platform = mockStore.platform;
  platform.audit.unshift({
    id: randomUUID(),
    at: new Date().toISOString(),
    actor,
    action,
    target,
    detail,
  });
  if (platform.audit.length > 200) platform.audit.length = 200;
}

export function parseUserAgent(uaRaw?: string): {
  deviceLabel: string;
  system: string;
  browser: string;
} {
  const ua = uaRaw ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  let system = "نامشخص";
  if (/Windows NT/i.test(ua)) system = "Windows";
  else if (/Android/i.test(ua)) system = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) system = "iOS";
  else if (/Mac OS X/i.test(ua)) system = "macOS";
  else if (/Linux/i.test(ua)) system = "Linux";

  let browser = "مرورگر";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const deviceLabel =
    system === "iOS"
      ? "آیفون / آیپد"
      : system === "Android"
        ? "گوشی اندروید"
        : mobile
          ? `دستگاه ${system}`
          : `لپ‌تاپ / دسکتاپ ${system}`;

  return { deviceLabel, system, browser };
}

function ensureAuthCollections() {
  const platform = mockStore.platform;
  if (!Array.isArray(platform.authSessions)) platform.authSessions = [];
  if (!Array.isArray(platform.multiSessionAlerts)) platform.multiSessionAlerts = [];
}

export function activeSessionsOf(userId: number): AuthSession[] {
  ensureAuthCollections();
  return mockStore.platform.authSessions.filter((s) => s.userId === userId && !s.revokedAt);
}

export function evaluateMultiSession(userId: number): MultiSessionAlert | null {
  ensureAuthCollections();
  const platform = mockStore.platform;
  const watch = platform.settings.featureFlags.multiSessionWatch !== false;
  const active = activeSessionsOf(userId);
  const count = active.length;
  const pending = platform.multiSessionAlerts.find(
    (a) => a.userId === userId && a.reviewStatus === "pending"
  );

  if (!watch) {
    if (pending) {
      pending.reviewStatus = "cleared";
      pending.reviewNote = "مانیتورینگ چندسشنی خاموش شد";
      pending.reviewedAt = new Date().toISOString();
      pending.reviewedBy = "سیستم";
      pending.activeSessionCount = count;
    }
    return null;
  }

  if (count >= MULTI_SESSION_THRESHOLD) {
    if (pending) {
      pending.activeSessionCount = count;
      return pending;
    }
    const alert: MultiSessionAlert = {
      id: randomUUID(),
      userId,
      activeSessionCount: count,
      openedAt: new Date().toISOString(),
      reviewStatus: "pending",
      reviewNote: "",
      reviewedAt: null,
      reviewedBy: null,
    };
    platform.multiSessionAlerts.unshift(alert);
    const user = mockStore.userById(userId);
    pushAudit(
      "سیستم",
      "MULTI_SESSION_ALERT",
      user?.fullName ?? `کاربر ${userId}`,
      `${count} نشست فعال هم‌زمان روی دستگاه‌ها/سیستم‌های مختلف`
    );
    return alert;
  }

  if (pending) {
    pending.reviewStatus = "cleared";
    pending.activeSessionCount = count;
    pending.reviewNote = "کاهش به کمتر از دو نشست فعال";
    pending.reviewedAt = new Date().toISOString();
    pending.reviewedBy = "سیستم";
  }
  return null;
}

export function createAuthSession(input: {
  userId: number;
  username: string;
  appSurface?: AuthAppSurface;
  actor?: string;
}): AuthSession {
  ensureAuthCollections();
  const now = new Date().toISOString();
  const ua = parseUserAgent();
  const session: AuthSession = {
    id: randomUUID(),
    userId: input.userId,
    username: input.username,
    createdAt: now,
    lastSeenAt: now,
    revokedAt: null,
    deviceLabel: ua.deviceLabel,
    system: ua.system,
    browser: ua.browser,
    appSurface: input.appSurface ?? "clinic_web",
    ipHint: "تهران · نمایشی",
  };
  mockStore.platform.authSessions.unshift(session);
  writeSessionId(session.id);
  const user = mockStore.userById(input.userId);
  pushAudit(
    input.actor ?? user?.fullName ?? input.username,
    "AUTH_SESSION_OPEN",
    user?.fullName ?? input.username,
    `${session.deviceLabel} · ${session.system} · ${session.browser}`
  );
  evaluateMultiSession(input.userId);
  return session;
}

export function touchAuthSession(sessionId: string): void {
  ensureAuthCollections();
  const session = mockStore.platform.authSessions.find((s) => s.id === sessionId);
  if (!session || session.revokedAt) return;
  session.lastSeenAt = new Date().toISOString();
}

export function revokeAuthSession(
  sessionId: string,
  opts?: { actor?: string; clearLocalIfCurrent?: boolean }
): { ok: boolean; wasCurrent: boolean; userId?: number; error?: string } {
  ensureAuthCollections();
  const session = mockStore.platform.authSessions.find((s) => s.id === sessionId);
  if (!session) return { ok: false, wasCurrent: false, error: "نشست یافت نشد." };
  if (session.revokedAt) return { ok: true, wasCurrent: false, userId: session.userId };

  const currentId = readSessionId();
  const wasCurrent = currentId === session.id;
  session.revokedAt = new Date().toISOString();
  const user = mockStore.userById(session.userId);
  pushAudit(
    opts?.actor ?? user?.fullName ?? session.username,
    "AUTH_SESSION_REVOKE",
    user?.fullName ?? session.username,
    `${session.deviceLabel} · ${session.system}`
  );
  evaluateMultiSession(session.userId);

  if (wasCurrent && opts?.clearLocalIfCurrent !== false) {
    clearSessionId();
  }
  return { ok: true, wasCurrent, userId: session.userId };
}

export function revokeOtherAuthSessions(
  userId: number,
  keepSessionId: string | null,
  actor?: string
): number {
  ensureAuthCollections();
  let count = 0;
  for (const session of mockStore.platform.authSessions) {
    if (session.userId !== userId || session.revokedAt) continue;
    if (keepSessionId && session.id === keepSessionId) continue;
    session.revokedAt = new Date().toISOString();
    count += 1;
  }
  if (count > 0) {
    const user = mockStore.userById(userId);
    pushAudit(
      actor ?? user?.fullName ?? `کاربر ${userId}`,
      "AUTH_SESSION_REVOKE_OTHERS",
      user?.fullName ?? `کاربر ${userId}`,
      `${count} نشست دیگر قطع شد`
    );
    evaluateMultiSession(userId);
  }
  return count;
}

export function revokeAllAuthSessionsForUser(userId: number, actor?: string): number {
  ensureAuthCollections();
  let count = 0;
  const currentId = readSessionId();
  for (const session of mockStore.platform.authSessions) {
    if (session.userId !== userId || session.revokedAt) continue;
    session.revokedAt = new Date().toISOString();
    count += 1;
    if (currentId === session.id) clearSessionId();
  }
  if (count > 0) {
    const user = mockStore.userById(userId);
    pushAudit(
      actor ?? "ادمین کل",
      "PLATFORM_REVOKE_USER_SESSIONS",
      user?.fullName ?? `کاربر ${userId}`,
      `${count} نشست فعال قطع شد`
    );
    evaluateMultiSession(userId);
  }
  return count;
}

/** Returns false when the stored session id is missing or already revoked. */
export function assertLocalSessionValid(): boolean {
  ensureAuthCollections();
  const id = readSessionId();
  if (!id) return true;
  const session = mockStore.platform.authSessions.find((s) => s.id === id);
  if (!session || session.revokedAt) {
    clearSessionId();
    return false;
  }
  touchAuthSession(id);
  return true;
}
