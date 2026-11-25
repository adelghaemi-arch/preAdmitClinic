/*
 File: frontend/my/src/lib/platform-actions.ts
 Description: اکشن‌های پلتفرم/کاربران دمو؛ گارد ادمین کلینیک برای مخفی‌کردن نقش Platform
 Parent Dependencies: mock-store, auth-sessions
 */

import { revokeAllAuthSessionsForUser } from "@/lib/auth-sessions";
import { randomUUID } from "@/lib/uuid";
import { ensureCameraSessionPackage, resolveOrCreatePackage } from "@/lib/evidence-packages";
import { mockMutations, mockStore } from "@/lib/mock-store";
import { normalizeOsmBaseUrl } from "@/lib/osm-routing";
import { DEFAULT_OSM_LOCAL } from "@/lib/mock-platform";
import type {
  FraudReviewStatus,
  GpsPoint,
  OsmLocalSettings,
  PlatformAuditEntry,
  PlatformClinicStatus,
  PlatformSettings,
  PlatformUserPrimaryRole,
  PlatformUserProfile,
  UserPhotoKind,
  UserPhotoRecord,
} from "@/types/clinic";

export const PLATFORM_ACTION_NAMES = new Set([
  "PLATFORM_UPDATE_CLINIC_STATUS",
  "PLATFORM_UPDATE_SETTINGS",
  "PLATFORM_UPDATE_OSM_LOCAL",
  "PLATFORM_APPLY_OSM_LOCAL_TEST",
  "PLATFORM_REVIEW_FRAUD_SESSION",
  "PLATFORM_REVIEW_MULTI_SESSION",
  "PLATFORM_REVOKE_USER_SESSIONS",
  "PLATFORM_APPEND_AUDIT",
  "PLATFORM_UPSERT_USER",
  "PLATFORM_SET_USER_ACTIVE",
  "PLATFORM_RESET_USER_ACCESS",
  "PLATFORM_FACTORY_RESET_REQUEST_OTP",
  "PLATFORM_FACTORY_RESET_CONFIRM",
  "PLATFORM_ACK_API_ABUSE",
  "START_FRAUD_CAMERA_SESSION",
  "CAPTURE_FRAUD_FRAME",
  "END_FRAUD_CAMERA_SESSION",
  "RECORD_USER_GPS",
]);

function syncOsmMapsIntegration(osm: OsmLocalSettings) {
  const platform = mockStore.platform;
  const item = platform.integrations.find((i) => i.id === "osm-maps");
  if (!item) return;
  item.endpoint = osm.baseUrl || "";
  item.lastSyncAt = osm.lastTestedAt;
  if (osm.active) {
    item.status = osm.osrmOk && osm.tileOk ? "connected" : "degraded";
    item.notes = `محلی فعال${osm.osrmOk ? "" : " · OSRM عمومی"}${osm.tileOk ? "" : " · تایل عمومی"}`;
  } else {
    item.status = "offline";
    item.notes = "تا قبل از تست موفق از سایت عمومی OSM استفاده می‌شود.";
  }
}

const PLATFORM_USER_ROLES: PlatformUserPrimaryRole[] = [
  "platform",
  "clinic_admin",
  "staff",
  "patient",
  "supervisor",
];

const ROLE_LABELS: Record<PlatformUserPrimaryRole, string> = {
  platform: "ادمین کل",
  clinic_admin: "ادمین کلینیک",
  staff: "کادر درمان",
  patient: "سلامتجو",
  supervisor: "ناظر سازمان",
};

/** Patient/owner may emit camera/GPS fraud events; everything else is platform-admin only. */
const PATIENT_PLATFORM_ACTIONS = new Set([
  "START_FRAUD_CAMERA_SESSION",
  "CAPTURE_FRAUD_FRAME",
  "END_FRAUD_CAMERA_SESSION",
  "RECORD_USER_GPS",
]);

/** ادمین کلینیک فقط مدیریت کاربر غیر-Platform را دارد */
const CLINIC_ADMIN_USER_ACTIONS = new Set(["PLATFORM_UPSERT_USER", "PLATFORM_SET_USER_ACTIVE"]);

const CLINIC_ASSIGNABLE_ROLES: PlatformUserPrimaryRole[] = [
  "clinic_admin",
  "staff",
  "patient",
  "supervisor",
];

export interface PlatformActionOutcome {
  ok: boolean;
  status: number;
  error?: string;
  meta?: Record<string, unknown>;
}

function pushAudit(entry: Omit<PlatformAuditEntry, "id" | "at"> & { at?: string }) {
  const platform = mockStore.platform;
  platform.audit.unshift({
    id: randomUUID(),
    at: entry.at ?? new Date().toISOString(),
    actor: entry.actor,
    action: entry.action,
    target: entry.target,
    detail: entry.detail,
  });
  if (platform.audit.length > 200) platform.audit.length = 200;
}

function normalizePlatformUser(profile: PlatformUserProfile): PlatformUserProfile {
  const now = new Date().toISOString();
  if (!profile.email) profile.email = "";
  if (!profile.notes) profile.notes = "";
  if (!profile.createdAt) profile.createdAt = now;
  if (profile.lastLoginAt === undefined) profile.lastLoginAt = null;
  if (profile.profilePhotoDataUrl === undefined) profile.profilePhotoDataUrl = null;
  if (!profile.primaryRole) {
    // «ادمین کلینیک» شامل زیروند «ادمین کل» است؛ اول کلینیک را چک کن
    profile.primaryRole =
      profile.roleLabel.includes("ادمین کلینیک")
        ? "clinic_admin"
        : profile.roleLabel === "ادمین کل" || profile.roleLabel.startsWith("ادمین کل ·")
          ? "platform"
          : profile.roleLabel.includes("ناظر")
            ? "supervisor"
            : profile.roleLabel.includes("کادر")
              ? "staff"
              : "patient";
  }
  if (!profile.roleLabel) profile.roleLabel = ROLE_LABELS[profile.primaryRole];
  return profile;
}

function ensurePlatformUserForPatient(patientId: number, userId: number | null) {
  const platform = mockStore.platform;
  let profile = platform.users.find((u) => u.patientId === patientId);
  if (profile) return normalizePlatformUser(profile);
  const patient = mockStore.patientById(patientId);
  if (!patient) return null;
  const now = new Date().toISOString();
  profile = {
    id: `pu-auto-${patientId}`,
    userId,
    patientId,
    fullName: patient.fullName,
    phone: patient.phone,
    nationalId: patient.nationalId,
    email: "",
    clinicId: platform.clinics.find((c) => c.isCurrentTenant)?.id ?? "clinic-nabz-tehran",
    roleLabel: ROLE_LABELS.patient,
    primaryRole: "patient",
    notes: "",
    createdAt: now,
    lastLoginAt: null,
    profilePhotoDataUrl: patient.photoDataUrl ?? null,
    lastGps: null,
    gpsHistory: [],
    isActive: true,
  };
  platform.users.unshift(profile);
  return profile;
}

/** If profile has no avatar, copy the record portrait once (never overwrite). */
export function ensureProfilePhotoFromRecord(patientId: number, photoDataUrl: string, userId?: number | null): void {
  if (!photoDataUrl.startsWith("data:image/")) return;
  const platform = mockStore.platform;
  let profile =
    platform.users.find((u) => u.patientId === patientId) ??
    (userId != null ? platform.users.find((u) => u.userId === userId) : undefined) ??
    null;
  if (!profile) {
    profile = ensurePlatformUserForPatient(patientId, userId ?? null);
  } else {
    normalizePlatformUser(profile);
  }
  if (!profile) return;
  if (profile.profilePhotoDataUrl) return;
  profile.profilePhotoDataUrl = photoDataUrl;
}

function appendGps(
  patientId: number,
  userId: number | null,
  gps: GpsPoint,
  sessionId?: string | null
): GpsPoint {
  const platform = mockStore.platform;
  const pkg = resolveOrCreatePackage(platform, {
    patientId,
    userId,
    at: gps.capturedAt,
    sessionId: sessionId ?? null,
  });
  gps.packageId = pkg.id;
  const profile = ensurePlatformUserForPatient(patientId, userId);
  if (profile) {
    profile.lastGps = gps;
    profile.gpsHistory.unshift(gps);
    if (profile.gpsHistory.length > 40) profile.gpsHistory.length = 40;
  }
  return gps;
}

function appendPhoto(record: UserPhotoRecord): UserPhotoRecord {
  const platform = mockStore.platform;
  const pkg = resolveOrCreatePackage(platform, {
    patientId: record.patientId,
    userId: record.userId,
    at: record.capturedAt,
    sessionId: record.sessionId,
  });
  record.packageId = pkg.id;
  if (record.gps) record.gps.packageId = pkg.id;
  platform.photos.unshift(record);
  // Cap storage: keep latest 120 frames overall.
  if (platform.photos.length > 120) platform.photos.length = 120;
  // Per patient cap.
  const forPatient = platform.photos.filter((p) => p.patientId === record.patientId);
  if (forPatient.length > 40) {
    const drop = new Set(forPatient.slice(40).map((p) => p.id));
    platform.photos = platform.photos.filter((p) => !drop.has(p.id));
  }
  return record;
}

export function runPlatformAction(body: Record<string, unknown>, viewerRole: string | null): PlatformActionOutcome {
  const action = String(body.action ?? "");
  if (!PLATFORM_ACTION_NAMES.has(action)) {
    return { ok: false, status: 400, error: "اقدام پلتفرم ناشناخته است." };
  }

  const isPatientSide = PATIENT_PLATFORM_ACTIONS.has(action);
  const isClinicAdminUserAction = viewerRole === "admin" && CLINIC_ADMIN_USER_ACTIONS.has(action);
  if (!isPatientSide && viewerRole !== "platform" && !isClinicAdminUserAction) {
    return { ok: false, status: 403, error: "فقط ادمین کل به این بخش دسترسی دارد." };
  }
  if (isPatientSide && viewerRole === "supervisor") {
    return { ok: false, status: 403, error: "ناظر سازمان مجاز به ثبت رویداد ضدتقلب نیست." };
  }

  const platform = mockStore.platform;
  const now = new Date().toISOString();
  const actorLabel = viewerRole === "admin" ? "ادمین کلینیک" : "ادمین کل";

  if (action === "PLATFORM_UPDATE_CLINIC_STATUS") {
    const clinicId = String(body.clinicId ?? "");
    const status = String(body.status ?? "") as PlatformClinicStatus;
    if (!["active", "suspended", "onboarding"].includes(status)) {
      return { ok: false, status: 400, error: "وضعیت کلینیک نامعتبر است." };
    }
    const clinic = platform.clinics.find((c) => c.id === clinicId);
    if (!clinic) return { ok: false, status: 404, error: "کلینیک یافت نشد." };
    if (clinic.isCurrentTenant && status === "suspended") {
      return { ok: false, status: 409, error: "تعلیق tenant جاری دمو مجاز نیست." };
    }
    clinic.status = status;
    pushAudit({
      actor: "ادمین کل",
      action: "PLATFORM_UPDATE_CLINIC_STATUS",
      target: clinic.name,
      detail: `وضعیت به «${status}» تغییر کرد`,
    });
    return { ok: true, status: 200 };
  }

  if (action === "PLATFORM_UPDATE_SETTINGS") {
    const patch = { ...(body.settings ?? {}) } as Partial<PlatformSettings>;
    // OSM local stack is managed only via PLATFORM_UPDATE_OSM_LOCAL / APPLY_OSM_LOCAL_TEST.
    delete patch.osmLocal;
    const next: PlatformSettings = {
      ...platform.settings,
      ...patch,
      featureFlags: {
        ...platform.settings.featureFlags,
        ...(patch.featureFlags ?? {}),
        multiClinicRegistry: false,
      },
      osmLocal: {
        ...DEFAULT_OSM_LOCAL,
        ...(platform.settings.osmLocal ?? {}),
      },
    };
    if (next.otpLength < 4 || next.otpLength > 8) {
      return { ok: false, status: 400, error: "طول OTP باید بین ۴ تا ۸ باشد." };
    }
    if (next.fraudAutoCaptureSeconds < 2 || next.fraudAutoCaptureSeconds > 15) {
      return { ok: false, status: 400, error: "بازه عکس‌برداری ضدتقلب باید بین ۲ تا ۱۵ ثانیه باشد." };
    }
    platform.settings = next;
    pushAudit({
      actor: "ادمین کل",
      action: "PLATFORM_UPDATE_SETTINGS",
      target: "تنظیمات پایه",
      detail: `برند «${next.brandName}» · ضدتقلب هر ${next.fraudAutoCaptureSeconds} ثانیه`,
    });
    return { ok: true, status: 200 };
  }

  if (action === "PLATFORM_UPDATE_OSM_LOCAL") {
    const prev = platform.settings.osmLocal ?? { ...DEFAULT_OSM_LOCAL };
    const baseUrl = normalizeOsmBaseUrl(String(body.baseUrl ?? ""));
    if (String(body.baseUrl ?? "").trim() && !baseUrl) {
      return { ok: false, status: 400, error: "Base URL باید با http یا https شروع شود." };
    }
    const urlChanged = baseUrl !== (prev.baseUrl || "");
    const nextOsm: OsmLocalSettings = {
      ...prev,
      baseUrl,
      // Changing URL requires a fresh successful test before local mode activates.
      active: urlChanged ? false : prev.active && Boolean(baseUrl),
      nominatimOk: urlChanged ? false : prev.nominatimOk,
      osrmOk: urlChanged ? false : prev.osrmOk,
      tileOk: urlChanged ? false : prev.tileOk,
      lastError: urlChanged ? null : prev.lastError,
      lastTestedAt: urlChanged ? null : prev.lastTestedAt,
    };
    if (!baseUrl) {
      nextOsm.active = false;
      nextOsm.nominatimOk = false;
      nextOsm.osrmOk = false;
      nextOsm.tileOk = false;
      nextOsm.lastError = null;
      nextOsm.lastTestedAt = null;
    }
    platform.settings = { ...platform.settings, osmLocal: nextOsm };
    syncOsmMapsIntegration(nextOsm);
    pushAudit({
      actor: "ادمین کل",
      action: "PLATFORM_UPDATE_OSM_LOCAL",
      target: "سرویس OSM محلی",
      detail: baseUrl
        ? `Base URL ذخیره شد: ${baseUrl}${urlChanged ? " · نیاز به تست مجدد" : ""}`
        : "Base URL پاک شد؛ بازگشت به سایت عمومی OSM",
    });
    return { ok: true, status: 200, meta: { osmLocal: nextOsm } };
  }

  if (action === "PLATFORM_APPLY_OSM_LOCAL_TEST") {
    const prev = platform.settings.osmLocal ?? { ...DEFAULT_OSM_LOCAL };
    const baseUrl = normalizeOsmBaseUrl(String(body.baseUrl ?? prev.baseUrl ?? ""));
    if (!baseUrl) {
      return { ok: false, status: 400, error: "ابتدا Base URL معتبر ذخیره کنید." };
    }
    const nominatimOk = Boolean(body.nominatimOk);
    const osrmOk = Boolean(body.osrmOk);
    const tileOk = Boolean(body.tileOk);
    const active = nominatimOk;
    const lastError = body.lastError == null || body.lastError === "" ? null : String(body.lastError);
    const nextOsm: OsmLocalSettings = {
      baseUrl,
      active,
      nominatimOk,
      osrmOk,
      tileOk,
      lastTestedAt: now,
      lastError: active ? (osrmOk && tileOk ? null : lastError) : lastError,
    };
    platform.settings = { ...platform.settings, osmLocal: nextOsm };
    syncOsmMapsIntegration(nextOsm);
    pushAudit({
      actor: "ادمین کل",
      action: "PLATFORM_APPLY_OSM_LOCAL_TEST",
      target: "سرویس OSM محلی",
      detail: active
        ? `تست موفق · محلی فعال (Nominatim${osrmOk ? " · OSRM" : ""}${tileOk ? " · تایل" : ""})`
        : `تست ناموفق · ${lastError ?? "Nominatim در دسترس نیست"}`,
    });
    return { ok: true, status: 200, meta: { osmLocal: nextOsm } };
  }

  if (action === "PLATFORM_ACK_API_ABUSE") {
    const incidentId = String(payload.incidentId ?? "");
    if (!Array.isArray(platform.apiAbuseIncidents)) platform.apiAbuseIncidents = [];
    const row = platform.apiAbuseIncidents.find((i) => i.id === incidentId);
    if (!row) throw new Error("حادثه یافت نشد.");
    row.acknowledged = true;
    mockMutations.appendAudit({
      id: randomUUID(),
      at: new Date().toISOString(),
      actor: "platform",
      action: "PLATFORM_ACK_API_ABUSE",
      target: incidentId,
      detail: "",
    });
    return { ok: true };
  }

  if (action === "PLATFORM_REVIEW_MULTI_SESSION") {
    const alertId = String(body.alertId ?? "");
    const reviewStatus = String(body.reviewStatus ?? "") as FraudReviewStatus;
    if (!["pending", "cleared", "flagged"].includes(reviewStatus)) {
      return { ok: false, status: 400, error: "وضعیت بازبینی نامعتبر است." };
    }
    if (!Array.isArray(platform.multiSessionAlerts)) platform.multiSessionAlerts = [];
    const alert = platform.multiSessionAlerts.find((a) => a.id === alertId);
    if (!alert) return { ok: false, status: 404, error: "هشدار چندسشنی یافت نشد." };
    alert.reviewStatus = reviewStatus;
    alert.reviewNote = String(body.reviewNote ?? "").trim();
    alert.reviewedAt = now;
    alert.reviewedBy = "ادمین کل";
    const user = mockStore.userById(alert.userId);
    pushAudit({
      actor: "ادمین کل",
      action: "PLATFORM_REVIEW_MULTI_SESSION",
      target: user?.fullName ?? `کاربر ${alert.userId}`,
      detail: `بازبینی چندسشنی: ${reviewStatus}${alert.reviewNote ? ` — ${alert.reviewNote}` : ""}`,
    });
    return { ok: true, status: 200 };
  }

  if (action === "PLATFORM_REVOKE_USER_SESSIONS") {
    const userId = Number(body.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return { ok: false, status: 400, error: "شناسه کاربر نامعتبر است." };
    }
    const count = revokeAllAuthSessionsForUser(userId, "ادمین کل");
    return { ok: true, status: 200, meta: { revokedCount: count } };
  }

  if (action === "PLATFORM_REVIEW_FRAUD_SESSION") {
    const sessionId = String(body.sessionId ?? "");
    const reviewStatus = String(body.reviewStatus ?? "") as FraudReviewStatus;
    if (!["pending", "cleared", "flagged"].includes(reviewStatus)) {
      return { ok: false, status: 400, error: "وضعیت بازبینی نامعتبر است." };
    }
    const session = platform.fraudSessions.find((s) => s.id === sessionId);
    if (!session) return { ok: false, status: 404, error: "جلسه ضدتقلب یافت نشد." };
    session.reviewStatus = reviewStatus;
    session.reviewNote = String(body.reviewNote ?? "").trim();
    session.reviewedAt = now;
    session.reviewedBy = "ادمین کل";
    const patient = mockStore.patientById(session.patientId);
    pushAudit({
      actor: "ادمین کل",
      action: "PLATFORM_REVIEW_FRAUD_SESSION",
      target: patient?.fullName ?? `بیمار ${session.patientId}`,
      detail: `بازبینی: ${reviewStatus}${session.reviewNote ? ` — ${session.reviewNote}` : ""}`,
    });
    return { ok: true, status: 200 };
  }

  if (action === "PLATFORM_APPEND_AUDIT") {
    pushAudit({
      actor: String(body.actor ?? "ادمین کل"),
      action: String(body.auditAction ?? "NOTE"),
      target: String(body.target ?? "—"),
      detail: String(body.detail ?? ""),
    });
    return { ok: true, status: 200 };
  }

  if (action === "PLATFORM_UPSERT_USER") {
    const id = String(body.id ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const nationalId = String(body.nationalId ?? "").trim();
    const email = String(body.email ?? "").trim();
    const clinicId = String(body.clinicId ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    const primaryRole = String(body.primaryRole ?? "patient") as PlatformUserPrimaryRole;
    if (fullName.length < 3) return { ok: false, status: 400, error: "نام کاربر را کامل وارد کنید." };
    if (!PLATFORM_USER_ROLES.includes(primaryRole)) {
      return { ok: false, status: 400, error: "نقش کاربر نامعتبر است." };
    }
    // ادمین کلینیک هرگز نقش ادمین کل را منصوب نمی‌کند
    if (viewerRole === "admin" && !CLINIC_ASSIGNABLE_ROLES.includes(primaryRole)) {
      return { ok: false, status: 403, error: "انتصاب این نقش مجاز نیست." };
    }
    if (clinicId && !platform.clinics.some((c) => c.id === clinicId)) {
      return { ok: false, status: 400, error: "کلینیک انتخاب‌شده یافت نشد." };
    }
    const photoRaw = body.profilePhotoDataUrl == null ? undefined : String(body.profilePhotoDataUrl);
    if (photoRaw !== undefined && photoRaw !== "" && !photoRaw.startsWith("data:image/") && photoRaw !== "null") {
      return { ok: false, status: 400, error: "عکس پروفایل نامعتبر است." };
    }

    let profile = id ? platform.users.find((u) => u.id === id) : undefined;
    if (profile) {
      normalizePlatformUser(profile);
      // وجود ادمین کل از دید ادمین کلینیک لو نمی‌رود
      if (viewerRole === "admin" && profile.primaryRole === "platform") {
        return { ok: false, status: 404, error: "کاربر یافت نشد." };
      }
      profile.fullName = fullName;
      profile.phone = phone;
      profile.nationalId = nationalId;
      profile.email = email;
      profile.clinicId = clinicId || profile.clinicId;
      profile.notes = notes;
      profile.primaryRole = primaryRole;
      profile.roleLabel = ROLE_LABELS[primaryRole];
      if (photoRaw === "") profile.profilePhotoDataUrl = null;
      else if (photoRaw && photoRaw !== "null") profile.profilePhotoDataUrl = photoRaw;
      if (typeof body.isActive === "boolean") profile.isActive = body.isActive;
      pushAudit({
        actor: actorLabel,
        action: "PLATFORM_UPSERT_USER",
        target: profile.fullName,
        detail: `ویرایش کاربر · نقش ${ROLE_LABELS[primaryRole]}`,
      });
      return { ok: true, status: 200, meta: { userId: profile.id } };
    }

    const created: PlatformUserProfile = {
      id: randomUUID(),
      userId: null,
      patientId: null,
      fullName,
      phone,
      nationalId,
      email,
      clinicId: clinicId || platform.clinics.find((c) => c.isCurrentTenant)?.id || platform.clinics[0]?.id || "",
      roleLabel: ROLE_LABELS[primaryRole],
      primaryRole,
      notes,
      createdAt: now,
      lastLoginAt: null,
      profilePhotoDataUrl: photoRaw && photoRaw !== "null" && photoRaw !== "" ? photoRaw : null,
      lastGps: null,
      gpsHistory: [],
      isActive: body.isActive === false ? false : true,
    };
    platform.users.unshift(created);
    pushAudit({
      actor: actorLabel,
      action: "PLATFORM_UPSERT_USER",
      target: created.fullName,
      detail: `ایجاد کاربر · نقش ${ROLE_LABELS[primaryRole]}`,
    });
    return { ok: true, status: 200, meta: { userId: created.id } };
  }

  if (action === "PLATFORM_SET_USER_ACTIVE") {
    const id = String(body.id ?? "").trim();
    const profile = platform.users.find((u) => u.id === id);
    if (!profile) return { ok: false, status: 404, error: "کاربر یافت نشد." };
    normalizePlatformUser(profile);
    if (viewerRole === "admin" && profile.primaryRole === "platform") {
      return { ok: false, status: 404, error: "کاربر یافت نشد." };
    }
    const isActive = Boolean(body.isActive);
    profile.isActive = isActive;
    pushAudit({
      actor: actorLabel,
      action: "PLATFORM_SET_USER_ACTIVE",
      target: profile.fullName,
      detail: isActive ? "فعال‌سازی حساب" : "تعلیق حساب",
    });
    return { ok: true, status: 200 };
  }

  if (action === "PLATFORM_RESET_USER_ACCESS") {
    const id = String(body.id ?? "").trim();
    const profile = platform.users.find((u) => u.id === id);
    if (!profile) return { ok: false, status: 404, error: "کاربر یافت نشد." };
    normalizePlatformUser(profile);
    profile.lastLoginAt = null;
    const revoked =
      profile.userId != null ? revokeAllAuthSessionsForUser(profile.userId, "ادمین کل") : 0;
    pushAudit({
      actor: "ادمین کل",
      action: "PLATFORM_RESET_USER_ACCESS",
      target: profile.fullName,
      detail: `ریست دسترسی / OTP و قطع ${revoked} نشست`,
    });
    return { ok: true, status: 200, meta: { revokedCount: revoked } };
  }

  if (action === "START_FRAUD_CAMERA_SESSION") {
    if (!platform.settings.featureFlags.fraudWatch) {
      return { ok: false, status: 403, error: "ضدتقلب دوربین در تنظیمات پلتفرم خاموش است." };
    }
    const patientId = Number(body.patientId);
    const userId = body.userId == null ? null : Number(body.userId);
    if (!mockStore.patientById(patientId)) return { ok: false, status: 404, error: "سلامتجو یافت نشد." };
    const open = platform.fraudSessions.find((s) => s.patientId === patientId && !s.endedAt);
    if (open) {
      if (!open.packageId) {
        const pkg = ensureCameraSessionPackage(platform, {
          sessionId: open.id,
          patientId,
          userId: open.userId,
          at: open.startedAt || now,
        });
        open.packageId = pkg.id;
      }
      return { ok: true, status: 200, meta: { sessionId: open.id, packageId: open.packageId } };
    }
    const id = randomUUID();
    const uid = Number.isFinite(userId as number) ? userId : null;
    const pkg = ensureCameraSessionPackage(platform, {
      sessionId: id,
      patientId,
      userId: uid,
      at: now,
    });
    platform.fraudSessions.unshift({
      id,
      patientId,
      userId: uid,
      startedAt: now,
      endedAt: null,
      reviewStatus: "pending",
      reviewNote: "",
      reviewedAt: null,
      reviewedBy: null,
      packageId: pkg.id,
    });
    ensurePlatformUserForPatient(patientId, uid);
    pushAudit({
      actor: "سیستم",
      action: "START_FRAUD_CAMERA_SESSION",
      target: mockStore.patientById(patientId)?.fullName ?? String(patientId),
      detail: "شروع جلسه ضدتقلب دوربین",
    });
    return { ok: true, status: 200, meta: { sessionId: id, packageId: pkg.id } };
  }

  if (action === "CAPTURE_FRAUD_FRAME") {
    const patientId = Number(body.patientId);
    const userId = body.userId == null ? null : Number(body.userId);
    const sessionId = String(body.sessionId ?? "");
    const kind = (String(body.kind ?? "fraud_auto") as UserPhotoKind);
    if (!["fraud_auto", "fraud_confirm", "portrait"].includes(kind)) {
      return { ok: false, status: 400, error: "نوع عکس نامعتبر است." };
    }
    const dataUrl = String(body.photoDataUrl ?? "").trim();
    if (!dataUrl.startsWith("data:image/") || dataUrl.length < 32) {
      return { ok: false, status: 400, error: "فریم عکس معتبر نیست." };
    }
    const maxChars =
      kind === "portrait"
        ? platform.settings.maxPortraitDataUrlChars
        : platform.settings.maxFraudFrameDataUrlChars;
    if (dataUrl.length > maxChars) {
      return { ok: false, status: 400, error: "حجم فریم بیش از سقف مجاز پلتفرم است." };
    }
    const session = platform.fraudSessions.find((s) => s.id === sessionId);
    if (!session || session.endedAt) {
      return { ok: false, status: 404, error: "جلسه ضدتقلب فعال یافت نشد." };
    }

    const uid = Number.isFinite(userId as number) ? userId : null;
    let gps: GpsPoint | null = null;
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon) && platform.settings.featureFlags.gpsTracking) {
      gps = appendGps(
        patientId,
        uid,
        {
          lat,
          lon,
          accuracy: Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : 0,
          capturedAt: now,
          source: "camera_session",
        },
        sessionId
      );
    }

    const photo = appendPhoto({
      id: randomUUID(),
      patientId,
      userId: uid,
      kind,
      dataUrl,
      capturedAt: now,
      sessionId,
      gps,
      packageId: session.packageId ?? null,
    });
    if (!session.packageId && photo.packageId) session.packageId = photo.packageId;

    if (kind === "portrait" || kind === "fraud_confirm") {
      mockMutations.updatePatient(patientId, { photoDataUrl: dataUrl });
      ensureProfilePhotoFromRecord(patientId, dataUrl, uid);
    }

    return { ok: true, status: 200, meta: { sessionId, packageId: photo.packageId } };
  }

  if (action === "END_FRAUD_CAMERA_SESSION") {
    const sessionId = String(body.sessionId ?? "");
    const session = platform.fraudSessions.find((s) => s.id === sessionId);
    if (!session) return { ok: false, status: 404, error: "جلسه ضدتقلب یافت نشد." };
    if (!session.endedAt) session.endedAt = now;
    return { ok: true, status: 200 };
  }

  if (action === "RECORD_USER_GPS") {
    if (!platform.settings.featureFlags.gpsTracking) {
      return { ok: false, status: 403, error: "ردیابی GPS در تنظیمات پلتفرم خاموش است." };
    }
    const patientId = Number(body.patientId);
    const userId = body.userId == null ? null : Number(body.userId);
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return { ok: false, status: 400, error: "مختصات GPS نامعتبر است." };
    }
    if (!mockStore.patientById(patientId)) return { ok: false, status: 404, error: "سلامتجو یافت نشد." };
    const gps = appendGps(patientId, Number.isFinite(userId as number) ? userId : null, {
      lat,
      lon,
      accuracy: Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : 0,
      capturedAt: now,
      source: (String(body.source ?? "manual") as GpsPoint["source"]) || "manual",
    });
    return { ok: true, status: 200, meta: { packageId: gps.packageId } };
  }

  return { ok: false, status: 400, error: "اقدام پلتفرم پیاده‌سازی نشده است." };
}
