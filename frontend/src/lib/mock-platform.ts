/*
 File: frontend/src/lib/mock-platform.ts
 Description: seed دمو پلتفرم شامل کاربر ادمین کل برای تست فیلتر کلینیک
 Parent Dependencies: types/clinic, evidence-packages
 */

import { faDayLabel, tehranDayKey } from "@/lib/evidence-packages";
import type {
  AuthSession,
  EvidencePackage,
  FraudCaptureSession,
  MultiSessionAlert,
  PlatformAuditEntry,
  PlatformClinic,
  PlatformHealthMetric,
  PlatformIntegration,
  PlatformSettings,
  PlatformState,
  PlatformUserProfile,
  UserPhotoRecord,
} from "@/types/clinic";

/** Tiny SVG portrait placeholders for seeded fraud/photo history (not real PHI). */
function mockFace(label: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="118" height="157" viewBox="0 0 118 157">
    <rect width="118" height="157" fill="hsl(${hue} 28% 88%)"/>
    <circle cx="59" cy="58" r="28" fill="hsl(${hue} 35% 62%)"/>
    <ellipse cx="59" cy="130" rx="42" ry="36" fill="hsl(${hue} 30% 55%)"/>
    <text x="59" y="150" text-anchor="middle" font-size="9" fill="#334155" font-family="Tahoma">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const now = Date.now();
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();

export const DEFAULT_OSM_LOCAL: PlatformSettings["osmLocal"] = {
  baseUrl: "",
  active: false,
  nominatimOk: false,
  osrmOk: false,
  tileOk: false,
  lastTestedAt: null,
  lastError: null,
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  brandName: "نفس",
  supportPhone: "02191000000",
  otpLength: 5,
  otpTtlSeconds: 120,
  smsSenderId: "NABZCLINIC",
  fraudAutoCaptureSeconds: 7,
  maxPortraitDataUrlChars: 350_000,
  maxFraudFrameDataUrlChars: 120_000,
  featureFlags: {
    fraudWatch: true,
    gpsTracking: true,
    multiClinicRegistry: false,
    corporateContracts: true,
    multiSessionWatch: true,
  },
  osmLocal: { ...DEFAULT_OSM_LOCAL },
};

export function buildSeedPlatformState(): PlatformState {
  /** Single-tenant demo: platform admin is not a multi-clinic registry. */
  const clinics: PlatformClinic[] = [
    {
      id: "clinic-nabz-tehran",
      name: "مرکز نمونه نفس",
      city: "تهران",
      status: "active",
      plan: "سازمانی پلاس",
      adminContact: "دکتر فرهاد سعیدی",
      adminPhone: "09121234501",
      preAdmitSupportPhone: "02191000000",
      patientsToday: 18,
      staffCount: 12,
      contractsCount: 3,
      createdAt: iso(60 * 24 * 120),
      isCurrentTenant: true,
    },
  ];

  const sessionId = "fraud-seed-maryam-1";
  const pkgCameraId = "pkg-maryam-camera-1";
  const pkgDayId = "pkg-maryam-day-older";
  const pkgElhamId = "pkg-elham-day-1";
  const cameraAt = iso(30);
  const dayOlderAt = iso(40);

  const packages: EvidencePackage[] = [
    {
      id: pkgCameraId,
      patientId: 1,
      userId: 4,
      kind: "camera_session",
      startedAt: iso(30),
      endedAt: iso(29.6),
      sessionId,
      dayKey: tehranDayKey(cameraAt),
      label: "جلسه دوربین پیش‌پذیرش",
    },
    {
      id: pkgDayId,
      patientId: 1,
      userId: 4,
      kind: "day",
      startedAt: dayOlderAt,
      endedAt: dayOlderAt,
      sessionId: null,
      dayKey: tehranDayKey(dayOlderAt),
      label: `روز ${faDayLabel(dayOlderAt)}`,
    },
    {
      id: pkgElhamId,
      patientId: 2,
      userId: 5,
      kind: "day",
      startedAt: iso(55),
      endedAt: iso(55),
      sessionId: null,
      dayKey: tehranDayKey(iso(55)),
      label: `روز ${faDayLabel(iso(55))}`,
    },
  ];

  const maryamPortrait = mockFace("پرتره", 168);

  const users: PlatformUserProfile[] = [
    {
      id: "pu-maryam",
      userId: 4,
      patientId: 1,
      fullName: "مریم‌السادات تابش",
      phone: "09123458910",
      nationalId: "0012345679",
      contracts: [{ contractId: "contract-demo-1", title: "قرارداد نمونه سازمانی", relation: "member", status: "Active" }],
      email: "maryam.tabesh@example.com",
      clinicId: "clinic-nabz-tehran",
      roleLabel: "سلامتجو",
      primaryRole: "patient",
      notes: "",
      createdAt: iso(60 * 24 * 40),
      lastLoginAt: iso(12),
      profilePhotoDataUrl: maryamPortrait,
      lastGps: {
        lat: 35.757,
        lon: 51.41,
        accuracy: 18,
        capturedAt: iso(29.7),
        source: "camera_session",
        packageId: pkgCameraId,
      },
      gpsHistory: [
        {
          lat: 35.7565,
          lon: 51.4092,
          accuracy: 22,
          capturedAt: dayOlderAt,
          source: "checkin",
          packageId: pkgDayId,
        },
        {
          lat: 35.7571,
          lon: 51.4101,
          accuracy: 20,
          capturedAt: iso(29.9),
          source: "camera_session",
          packageId: pkgCameraId,
        },
        {
          lat: 35.75705,
          lon: 51.41005,
          accuracy: 19,
          capturedAt: iso(29.85),
          source: "camera_session",
          packageId: pkgCameraId,
        },
        {
          lat: 35.757,
          lon: 51.41,
          accuracy: 18,
          capturedAt: iso(29.7),
          source: "camera_session",
          packageId: pkgCameraId,
        },
      ],
      isActive: true,
    },
    {
      id: "pu-elham",
      userId: 5,
      patientId: 2,
      fullName: "الهام شریفی‌نژاد",
      phone: "09123458911",
      nationalId: "0012345687",
      email: "elham.sharifi@example.com",
      clinicId: "clinic-nabz-tehran",
      roleLabel: "سلامتجو",
      primaryRole: "patient",
      notes: "پرتره پرونده هنوز ثبت نشده؛ پروفایل بدون عکس.",
      createdAt: iso(60 * 24 * 20),
      lastLoginAt: iso(55),
      profilePhotoDataUrl: null,
      lastGps: {
        lat: 35.7238,
        lon: 51.3342,
        accuracy: 25,
        capturedAt: iso(55),
        source: "seed",
        packageId: pkgElhamId,
      },
      gpsHistory: [
        {
          lat: 35.7238,
          lon: 51.3342,
          accuracy: 25,
          capturedAt: iso(55),
          source: "seed",
          packageId: pkgElhamId,
        },
      ],
      isActive: true,
    },
    {
      id: "pu-admin",
      userId: 1,
      patientId: null,
      fullName: "دکتر فرهاد سعیدی",
      phone: "09121234501",
      nationalId: "0087654321",
      email: "farhad.saeedi@nabz.clinic",
      clinicId: "clinic-nabz-tehran",
      roleLabel: "ادمین کلینیک",
      primaryRole: "clinic_admin",
      notes: "",
      createdAt: iso(60 * 24 * 120),
      lastLoginAt: iso(8),
      profilePhotoDataUrl: null,
      lastGps: { lat: 35.7448, lon: 51.3753, accuracy: 12, capturedAt: iso(8), source: "manual", packageId: null },
      gpsHistory: [{ lat: 35.7448, lon: 51.3753, accuracy: 12, capturedAt: iso(8), source: "manual", packageId: null }],
      isActive: true,
    },
    // برای تست فیلتر ادمین کلینیک: این کاربر فقط در scope ادمین کل دیده می‌شود
    {
      id: "pu-platform",
      userId: 99,
      patientId: null,
      fullName: "ادمین کل",
      phone: "09133752696",
      nationalId: "0011111111",
      email: "platform@nabz.clinic",
      clinicId: "clinic-nabz-tehran",
      roleLabel: "ادمین کل",
      primaryRole: "platform",
      notes: "seed ثابت پروژه — مخفی از ادمین کلینیک",
      createdAt: iso(60 * 24 * 365),
      lastLoginAt: iso(2),
      profilePhotoDataUrl: null,
      lastGps: null,
      gpsHistory: [],
      isActive: true,
    },
    {
      id: "pu-aria-patient",
      userId: null,
      patientId: null,
      fullName: "حسین کاظمی",
      phone: "09131112233",
      nationalId: "1270011223",
      email: "",
      clinicId: "clinic-aria-isfahan",
      roleLabel: "سلامتجو",
      primaryRole: "patient",
      notes: "",
      createdAt: iso(60 * 24 * 10),
      lastLoginAt: iso(90),
      profilePhotoDataUrl: null,
      lastGps: { lat: 32.6539, lon: 51.666, accuracy: 30, capturedAt: iso(90), source: "seed", packageId: null },
      gpsHistory: [{ lat: 32.6539, lon: 51.666, accuracy: 30, capturedAt: iso(90), source: "seed", packageId: null }],
      isActive: true,
    },
  ];

  const photos: UserPhotoRecord[] = [
    {
      id: "photo-maryam-portrait",
      patientId: 1,
      userId: 4,
      kind: "portrait",
      dataUrl: maryamPortrait,
      capturedAt: iso(30),
      sessionId,
      packageId: pkgCameraId,
      gps: {
        lat: 35.757,
        lon: 51.41,
        accuracy: 18,
        capturedAt: iso(30),
        source: "camera_session",
        packageId: pkgCameraId,
      },
    },
    {
      id: "photo-maryam-auto-1",
      patientId: 1,
      userId: 4,
      kind: "fraud_auto",
      dataUrl: mockFace("ضدتقلب ۱", 172),
      capturedAt: iso(29.9),
      sessionId,
      packageId: pkgCameraId,
      gps: {
        lat: 35.7571,
        lon: 51.4101,
        accuracy: 20,
        capturedAt: iso(29.9),
        source: "camera_session",
        packageId: pkgCameraId,
      },
    },
    {
      id: "photo-maryam-auto-2",
      patientId: 1,
      userId: 4,
      kind: "fraud_auto",
      dataUrl: mockFace("ضدتقلب ۲", 175),
      capturedAt: iso(29.85),
      sessionId,
      packageId: pkgCameraId,
      gps: {
        lat: 35.75705,
        lon: 51.41005,
        accuracy: 19,
        capturedAt: iso(29.85),
        source: "camera_session",
        packageId: pkgCameraId,
      },
    },
    {
      id: "photo-maryam-confirm",
      patientId: 1,
      userId: 4,
      kind: "fraud_confirm",
      dataUrl: mockFace("تأیید", 170),
      capturedAt: iso(29.7),
      sessionId,
      packageId: pkgCameraId,
      gps: {
        lat: 35.757,
        lon: 51.41,
        accuracy: 18,
        capturedAt: iso(29.7),
        source: "camera_session",
        packageId: pkgCameraId,
      },
    },
  ];

  const fraudSessions: FraudCaptureSession[] = [
    {
      id: sessionId,
      patientId: 1,
      userId: 4,
      startedAt: iso(30),
      endedAt: iso(29.6),
      reviewStatus: "pending",
      reviewNote: "",
      reviewedAt: null,
      reviewedBy: null,
      packageId: pkgCameraId,
    },
  ];

  const health: PlatformHealthMetric[] = [
    { id: "api-latency", label: "میانگین تأخیر API", value: 42, unit: "ms", status: "ok", sparkline: [38, 41, 40, 45, 42, 39, 42] },
    { id: "error-rate", label: "نرخ خطای موتور", value: 0.4, unit: "%", status: "ok", sparkline: [0.6, 0.5, 0.3, 0.4, 0.5, 0.4, 0.4] },
    { id: "sms-queue", label: "صف پیامک", value: 12, unit: "پیام", status: "warn", sparkline: [3, 5, 8, 14, 11, 13, 12] },
    { id: "otp-success", label: "موفقیت OTP", value: 97.2, unit: "%", status: "ok", sparkline: [96, 97, 98, 97, 96, 97, 97.2] },
    { id: "storage", label: "مصرف دیسک سرور", value: 68, unit: "%", status: "warn", sparkline: [40, 48, 55, 60, 64, 66, 68] },
  ];

  const integrations: PlatformIntegration[] = [
    {
      id: "hr-novin",
      name: "API منابع انسانی نوین‌بانک",
      kind: "hr_api",
      endpoint: "https://welfare.novinbank.ir/api/v1/checkup-members",
      apiKeyMasked: "nb_••••••••a91",
      status: "connected",
      lastSyncAt: iso(25),
      notes: "همگام‌سازی mock هر ۱۵ دقیقه",
    },
    {
      id: "sms-gateway",
      name: "درگاه پیامک نفس",
      kind: "sms",
      endpoint: "mock://sms-gateway/send",
      apiKeyMasked: "sms_••••92",
      status: "degraded",
      lastSyncAt: iso(4),
      notes: "تأخیر صف بیش از آستانه هشدار",
    },
    {
      id: "otp-engine",
      name: "موتور OTP",
      kind: "otp",
      endpoint: "mock://otp/verify",
      apiKeyMasked: "otp_••••11",
      status: "connected",
      lastSyncAt: iso(1),
      notes: "کد ۵ رقمی · TTL ۱۲۰ ثانیه",
    },
    {
      id: "osm-maps",
      name: "سرویس OSM محلی",
      kind: "maps",
      endpoint: "",
      apiKeyMasked: "—",
      status: "offline",
      lastSyncAt: null,
      notes: "Base URL استک محلی (Nominatim / OSRM / تایل). تا قبل از تست موفق از سایت عمومی OSM استفاده می‌شود.",
    },
  ];

  const authSessions: AuthSession[] = [
    {
      id: "auth-seed-maryam-phone",
      userId: 4,
      username: "maryam",
      createdAt: iso(180),
      lastSeenAt: iso(8),
      revokedAt: null,
      deviceLabel: "گوشی اندروید",
      system: "Android",
      browser: "Chrome",
      appSurface: "clinic_web",
      ipHint: "تهران · 5.114.x.x",
    },
    {
      id: "auth-seed-maryam-laptop",
      userId: 4,
      username: "maryam",
      createdAt: iso(90),
      lastSeenAt: iso(25),
      revokedAt: null,
      deviceLabel: "لپ‌تاپ / دسکتاپ Windows",
      system: "Windows",
      browser: "Edge",
      appSurface: "clinic_web",
      ipHint: "تهران · 91.98.x.x",
    },
    {
      id: "auth-seed-maryam-kiosk",
      userId: 4,
      username: "maryam",
      createdAt: iso(40),
      lastSeenAt: iso(35),
      revokedAt: null,
      deviceLabel: "کیوسک پذیرش",
      system: "Windows",
      browser: "Chrome",
      appSurface: "patient_kiosk",
      ipHint: "کلینیک · شبکه داخلی",
    },
  ];

  const multiSessionAlerts: MultiSessionAlert[] = [
    {
      id: "msa-seed-maryam",
      userId: 4,
      activeSessionCount: 3,
      openedAt: iso(40),
      reviewStatus: "pending",
      reviewNote: "",
      reviewedAt: null,
      reviewedBy: null,
    },
  ];

  const audit: PlatformAuditEntry[] = [
    {
      id: "aud-1",
      at: iso(20),
      actor: "ادمین کل",
      action: "SEED_PLATFORM",
      target: "پلتفرم",
      detail: "راه‌اندازی داده نمایشی پلتفرم (تک‌مستأجر)",
    },
    {
      id: "aud-2",
      at: iso(18),
      actor: "سیستم",
      action: "FRAUD_SESSION_OPEN",
      target: "مریم‌السادات تابش",
      detail: "شروع جلسه ضدتقلب دوربین برای بیمار ۱",
    },
    {
      id: "aud-3",
      at: iso(40),
      actor: "سیستم",
      action: "MULTI_SESSION_ALERT",
      target: "مریم‌السادات تابش",
      detail: "۳ نشست فعال هم‌زمان روی دستگاه‌ها/سیستم‌های مختلف",
    },
    {
      id: "aud-4",
      at: iso(10),
      actor: "سیستم",
      action: "HEALTH_SAMPLE",
      target: "صف پیامک",
      detail: "صف پیامک به ۱۲ مورد رسید (هشدار)",
    },
  ];

  return {
    clinics,
    users,
    photos,
    packages,
    fraudSessions,
    authSessions,
    multiSessionAlerts,
    health,
    integrations,
    settings: { ...DEFAULT_PLATFORM_SETTINGS },
    audit,
  };
}
