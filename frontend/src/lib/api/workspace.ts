/*
 File: frontend/src/lib/api/workspace.ts
 Description: bootstrap workspace از API؛ متادیتای fraud بدون دانلود فایل؛ GPS سبک
 Parent Dependencies: api/http, api/evidence, mock-platform defaults
 */

import { fetchClinicContracts } from "@/lib/api/contracts";
import type { ApiClinicDto } from "@/lib/api/clinics";
import {
  fetchFraudCaptureConfig,
  getFraudSessionDetail,
  listFraudSessions,
  listGpsByPatient,
  type ApiFraudSessionDto,
  type ApiGpsPointDto,
} from "@/lib/api/evidence";
import { fetchClinicForms } from "@/lib/api/forms";
import { apiFetch } from "@/lib/api/http";
import { fetchPathways } from "@/lib/api/pathways";
import { fetchClinicStations, mapClinicStationToRoom } from "@/lib/api/clinic-stations";
import { mockPathwayDtos } from "@/lib/mock-contracts";
import { guidToNumericId } from "@/lib/api/roles";
import { MOCK_DATASET } from "@/lib/mock-dataset";
import { DEFAULT_OSM_LOCAL, DEFAULT_PLATFORM_SETTINGS } from "@/lib/mock-platform";
import type {
  ClinicSnapshot,
  CorporateContract,
  FormDefinition,
  FraudCaptureSession,
  FraudReviewStatus,
  PathwayDto,
  RoomDto,
  GpsPoint,
  PlatformSettings,
  PlatformState,
  PlatformUserProfile,
  UserPhotoKind,
  UserPhotoRecord,
} from "@/types/clinic";

interface ApiPlatformSettingsDto {
  brandName: string;
  otpLength: number;
  otpTtlSeconds: number;
  intakeDocumentMaxGroups: number;
  intakeDocumentMaxFilesPerGroup: number;
  supportPhone?: string | null;
  smsSenderId?: string | null;
  fraudAutoCaptureSeconds?: number;
  featureFlags?: Partial<PlatformSettings["featureFlags"]> | null;
}

function applyFraudConfigToSettings(
  settings: PlatformSettings,
  cfg: { fraudAutoCaptureSeconds: number; fraudWatchEnabled: boolean }
): PlatformSettings {
  const seconds =
    Number.isFinite(cfg.fraudAutoCaptureSeconds) && cfg.fraudAutoCaptureSeconds >= 2 && cfg.fraudAutoCaptureSeconds <= 15
      ? cfg.fraudAutoCaptureSeconds
      : 7;
  return {
    ...settings,
    fraudAutoCaptureSeconds: seconds,
    featureFlags: {
      ...settings.featureFlags,
      fraudWatch: cfg.fraudWatchEnabled !== false,
    },
  };
}

function mapApiPlatformSettings(dto: ApiPlatformSettingsDto): PlatformSettings {
  const seconds = dto.fraudAutoCaptureSeconds ?? 7;
  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    brandName: dto.brandName || DEFAULT_PLATFORM_SETTINGS.brandName,
    supportPhone: dto.supportPhone ?? DEFAULT_PLATFORM_SETTINGS.supportPhone,
    smsSenderId: dto.smsSenderId ?? DEFAULT_PLATFORM_SETTINGS.smsSenderId,
    otpLength: dto.otpLength || DEFAULT_PLATFORM_SETTINGS.otpLength,
    otpTtlSeconds: dto.otpTtlSeconds || DEFAULT_PLATFORM_SETTINGS.otpTtlSeconds,
    fraudAutoCaptureSeconds: seconds >= 2 && seconds <= 15 ? seconds : 7,
    featureFlags: {
      ...DEFAULT_PLATFORM_SETTINGS.featureFlags,
      ...(dto.featureFlags ?? {}),
      multiClinicRegistry: false,
    },
    osmLocal: { ...DEFAULT_OSM_LOCAL },
  };
}

type ClinicDto = ApiClinicDto;

function mapReviewStatus(raw: string): FraudReviewStatus {
  const s = raw.toLowerCase();
  if (s === "cleared") return "cleared";
  if (s === "flagged") return "flagged";
  return "pending";
}

function mapPhotoKind(raw: string): UserPhotoKind {
  const s = raw.toLowerCase();
  if (s === "fraudconfirm" || s === "fraud_confirm") return "fraud_confirm";
  if (s === "fraudauto" || s === "fraud_auto") return "fraud_auto";
  return "portrait";
}

function mapApiGpsPoint(g: ApiGpsPointDto, packageId?: string | null): GpsPoint {
  const sourceRaw = String(g.source ?? "manual");
  const source = (
    ["camera_session", "checkin", "manual", "seed", "map_open", "distance_btn", "watch"].includes(sourceRaw)
      ? sourceRaw
      : "manual"
  ) as GpsPoint["source"];
  return {
    lat: g.lat,
    lon: g.lon,
    accuracy: g.accuracy ?? 0,
    capturedAt: g.capturedAt,
    source,
    packageId: packageId ?? null,
  };
}

async function hydrateGpsForUsers(users: PlatformUserProfile[]) {
  // فقط Ownerهایی که پرونده لینک دارند؛ سقف برای جلوگیری از طوفان درخواست
  const targets = users.filter((u) => u.linkedPatientId).slice(0, 40);
  await Promise.all(
    targets.map(async (u) => {
      try {
        const points = await listGpsByPatient(u.linkedPatientId!, 40);
        const history = points.map((g) => mapApiGpsPoint(g));
        u.gpsHistory = history;
        u.lastGps = history[0] ?? null;
        // برای join قدیمی mock/عددی در پنل
        if (u.patientId == null) u.patientId = guidToNumericId(u.linkedPatientId!);
      } catch {
        /* GPS این کاربر خالی می‌ماند */
      }
    })
  );
}

/** فقط متادیتای نشست — بدون detail و بدون دانلود /api/files */
async function hydrateFraudForPlatform(platform: PlatformState) {
  const sessions = await listFraudSessions(40);
  platform.fraudSessions = sessions.map((s) => {
    const patientServerId = s.patientId;
    const userServerId = s.userId ?? null;
    return {
      id: s.id,
      patientId: guidToNumericId(patientServerId),
      userId: userServerId ? guidToNumericId(userServerId) : null,
      startedAt: s.startedAt,
      endedAt: s.endedAt ?? null,
      reviewStatus: mapReviewStatus(s.reviewStatus),
      reviewNote: s.reviewNote ?? "",
      reviewedAt: s.reviewedAt ?? null,
      reviewedBy: s.reviewedBy ?? null,
      packageId: s.packageId ?? null,
      patientServerId,
      userServerId,
      patientDisplayName: s.patientFullName?.trim() || null,
      patientNationalId: s.patientNationalId ?? null,
    };
  });
  // فریم‌ها خالی می‌مانند؛ UI پلتفرم با loadFraudSessionPhotoMeta لود تنبل می‌کند
  platform.photos = [];
}

function mapFraudDetailToPhotos(detail: ApiFraudSessionDto): UserPhotoRecord[] {
  const patientServerId = detail.patientId;
  const userServerId = detail.userId ?? null;
  return (detail.frames ?? []).map((frame) => ({
    id: frame.id,
    patientId: guidToNumericId(frame.patientId || patientServerId),
    userId: userServerId ? guidToNumericId(userServerId) : null,
    kind: mapPhotoKind(frame.kind),
    dataUrl: "",
    storageKey: frame.storageKey,
    capturedAt: frame.capturedAt,
    sessionId: frame.sessionId ?? detail.id,
    gps:
      frame.gpsLat != null && frame.gpsLon != null
        ? {
            lat: frame.gpsLat,
            lon: frame.gpsLon,
            accuracy: 0,
            capturedAt: frame.capturedAt,
            source: "camera_session" as const,
          }
        : null,
  }));
}

/** لود متادیتای فریم یک نشست برای UI تقلب — بدون دانلود باینری */
export async function loadFraudSessionPhotoMeta(sessionId: string): Promise<UserPhotoRecord[]> {
  const detail = await getFraudSessionDetail(sessionId);
  return mapFraudDetailToPhotos(detail);
}

function emptyPlatform(clinic: ClinicDto | null): PlatformState {
  return {
    clinics: clinic
      ? [
          {
            id: clinic.id,
            name: clinic.name,
            city: clinic.city ?? "",
            status: (clinic.status?.toLowerCase() as "active") || "active",
            plan: "v1",
            adminContact: "",
            adminPhone: "",
            preAdmitSupportPhone: clinic.preAdmitSupportPhone ?? "",
            smsProvider: clinic.smsProvider ?? "None",
            smsSenderNumber: clinic.smsSenderNumber ?? "",
            kavenegarApiKey: clinic.kavenegarApiKey ?? undefined,
            kavenegarApiKeySet: clinic.kavenegarApiKeySet,
            kavenegarOtpTemplate: clinic.kavenegarOtpTemplate ?? "",
            toubaUsername: clinic.toubaUsername ?? "",
            toubaPassword: clinic.toubaPassword ?? undefined,
            toubaPasswordSet: clinic.toubaPasswordSet,
            toubaSendUrl: clinic.toubaSendUrl ?? "",
            toubaOtpMessageTemplate: clinic.toubaOtpMessageTemplate ?? "",
            logoStorageKey: clinic.logoStorageKey ?? null,
            patientsToday: 0,
            staffCount: 0,
            contractsCount: 0,
            createdAt: new Date().toISOString(),
            isCurrentTenant: clinic.isCurrentTenant,
          },
        ]
      : [],
    users: [],
    photos: [],
    packages: [],
    fraudSessions: [],
    authSessions: [],
    multiSessionAlerts: [],
    apiAbuseIncidents: [],
    health: [],
    integrations: [],
    audit: [],
    settings: {
      ...DEFAULT_PLATFORM_SETTINGS,
      osmLocal: { ...DEFAULT_OSM_LOCAL },
    },
  };
}

interface ApiUserContractDto {
  contractId: string;
  title: string;
  relation: string;
  status?: string;
}

function mapApiUserContracts(contracts: ApiUserContractDto[] | undefined) {
  return (contracts ?? []).map((c) => ({
    contractId: c.contractId,
    title: c.title,
    relation: c.relation,
    status: c.status ?? "Active",
  }));
}

/** بارگذاری مجدد فقط فهرست کاربران (سوییچ قراردادهای غیرفعال). */
function mapApiUserToProfile(u: ApiUserDto, clinicId = ""): PlatformUserProfile {
  const primaryRole = mapApiRoleToPrimary(u.roles ?? []);
  const contracts = mapApiUserContracts(u.contracts);
  const linkedPatientId = u.linkedPatientId ?? null;
  return {
    id: u.id,
    userId: null,
    patientId: linkedPatientId ? guidToNumericId(linkedPatientId) : null,
    linkedPatientId,
    fullName: u.fullName,
    phone: u.mobile,
    nationalId: u.nationalId ?? "",
    email: "",
    clinicId,
    roleLabel: ROLE_LABEL[primaryRole] ?? primaryRole,
    primaryRole,
    notes: "",
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    profilePhotoDataUrl: null,
    lastGps: null,
    gpsHistory: [],
    isActive: u.isActive,
    contracts,
    assignedContractId: contracts.find((c) => c.relation === "supervisor")?.contractId ?? null,
  };
}

export async function fetchPlatformUsers(includeInactiveContracts = false, search?: string | null) {
  const params = new URLSearchParams();
  if (includeInactiveContracts) params.set("includeInactiveContracts", "true");
  const term = (search ?? "").trim();
  if (term) params.set("q", term);
  const qs = params.toString();
  const users = await apiFetch<ApiUserDto[]>(`/api/users${qs ? `?${qs}` : ""}`);
  const mapped = users.map((u) => mapApiUserToProfile(u));
  // وقتی پلتفرم لیست را تازه می‌کند GPS هم برگردد
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("nabz_api_roles");
      const roles = raw ? (JSON.parse(raw) as string[]) : [];
      if (roles.includes("Platform")) await hydrateGpsForUsers(mapped);
    } catch {
      /* بدون GPS */
    }
  }
  return mapped;
}

interface ApiUserDto {
  id: string;
  fullName: string;
  mobile: string;
  nationalId?: string | null;
  isActive: boolean;
  roles: string[];
  contracts?: ApiUserContractDto[];
  linkedPatientId?: string | null;
}

function mapApiRoleToPrimary(roles: string[]): PlatformState["users"][number]["primaryRole"] {
  if (roles.includes("Platform")) return "platform";
  if (roles.includes("Admin")) return "clinic_admin";
  if (roles.includes("Specialist")) return "staff";
  if (roles.includes("Supervisor")) return "supervisor";
  return "patient";
}

const ROLE_LABEL: Record<string, string> = {
  platform: "ادمین کل",
  clinic_admin: "ادمین کلینیک",
  staff: "کادر درمان",
  patient: "سلامتجو",
  supervisor: "ناظر سازمان",
};

/**
 * کاتالوگ ایستگاه برای snapshot.
 * Admin/Platform همه را می‌بینند؛ JWT پزشک در API فقط فعال‌ها را برمی‌گرداند.
 */
async function loadClinicRoomsForSnapshot(): Promise<RoomDto[]> {
  try {
    const rows = await fetchClinicStations(false);
    return rows.map(mapClinicStationToRoom);
  } catch {
    return [];
  }
}

/** بارگذاری اسکلت snapshot از سرور؛ لیست‌های عملیاتی غیر-v1 خالی می‌مانند. */
export async function loadWorkspaceSnapshot(): Promise<ClinicSnapshot> {
  let clinic: ClinicDto | null = null;
  try {
    clinic = await apiFetch<ClinicDto>("/api/clinics/current");
  } catch {
    clinic = null;
  }

  const platform = emptyPlatform(clinic);
  // فقط نقش‌های مجاز به /api/users درخواست می‌زنند تا Console پر از 403 نشود
  const meRoles = (() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("nabz_api_roles") : null;
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [] as string[];
    }
  })();
  const canListUsers = meRoles.includes("Admin") || meRoles.includes("Platform");
  // ادمین کل هم برای دراپ‌داون ناظر در مدیریت کاربران به فهرست قراردادها نیاز دارد
  const canListContracts =
    meRoles.includes("Admin") || meRoles.includes("Supervisor") || meRoles.includes("Platform");

  if (canListUsers) {
    try {
      const users = await apiFetch<ApiUserDto[]>("/api/users");
      platform.users = users.map((u) => mapApiUserToProfile(u, clinic?.id ?? ""));
      if (meRoles.includes("Platform")) {
        await hydrateGpsForUsers(platform.users);
      }
    } catch {
      /* نادیده */
    }
  }

  let contracts: CorporateContract[] = [];
  let forms: FormDefinition[] = [];
  let pathways: PathwayDto[] = [];
  let pathwayLibrary: PathwayDto[] = [];
  if (clinic?.id) {
    if (canListContracts) {
      try {
        contracts = await fetchClinicContracts(clinic.id);
        const current = platform.clinics.find((c) => c.isCurrentTenant);
        if (current) current.contractsCount = contracts.length;
      } catch {
        /* نادیده */
      }
    }
    try {
      forms = await fetchClinicForms(clinic.id);
    } catch {
      /* Owner/Admin/Specialist؛ در صورت 403 خالی */
    }
  }
  try {
    pathways = await fetchPathways();
  } catch {
    pathways = mockPathwayDtos(MOCK_DATASET.pathways ?? []);
  }
  // کتابخانه = همان مسیرهای isInLibrary؛ لیست جدا فقط برای سازگاری snapshot
  if (canListUsers) {
    pathwayLibrary = pathways.filter((p) => p.isInLibrary);
  }

  // بازه/فلگ ضدتقلب برای همه نقش‌ها (Owner هم دوربین را با همین بازه می‌زند)
  try {
    const cfg = await fetchFraudCaptureConfig();
    platform.settings = applyFraudConfigToSettings(platform.settings, cfg);
  } catch {
    /* fallback DEFAULT می‌ماند */
  }

  if (meRoles.includes("Platform")) {
    try {
      const full = await apiFetch<ApiPlatformSettingsDto>("/api/platform/settings");
      platform.settings = {
        ...mapApiPlatformSettings(full),
        // OSM هنوز از API کامل نمی‌آید؛ مقدار قبلی/پیش‌فرض حفظ شود
        osmLocal: platform.settings.osmLocal,
      };
    } catch {
      /* fraud/config کافی است */
    }
    try {
      await hydrateFraudForPlatform(platform);
    } catch {
      /* صف ضدتقلب خالی می‌ماند */
    }
    try {
      const incidents = await apiFetch<
        Array<{
          id: string;
          at: string;
          userId?: string | null;
          userMobile?: string | null;
          userName?: string | null;
          clientIp?: string | null;
          dominantFingerprint: string;
          samePathCount: number;
          totalCount: number;
          severity: string;
          smsNotified: boolean;
          acknowledged: boolean;
          userIsActive: boolean;
          detail?: string | null;
        }>
      >("/api/platform/api-abuse?take=50");
      platform.apiAbuseIncidents = (incidents ?? []).map((i) => ({
        id: i.id,
        at: i.at,
        userId: i.userId ?? null,
        userMobile: i.userMobile ?? null,
        userName: i.userName ?? null,
        clientIp: i.clientIp ?? null,
        dominantFingerprint: i.dominantFingerprint,
        samePathCount: i.samePathCount,
        totalCount: i.totalCount,
        severity: i.severity,
        smsNotified: i.smsNotified,
        acknowledged: i.acknowledged,
        userIsActive: i.userIsActive,
        detail: i.detail ?? null,
      }));
    } catch {
      platform.apiAbuseIncidents = [];
    }
  }

  const clinicLat = clinic?.latitude ?? 35.7219;
  const clinicLon = clinic?.longitude ?? 51.3347;
  const clinicAddress =
    clinic?.address?.trim() ||
    (clinic?.name ? `${clinic.name}${clinic.city ? ` — ${clinic.city}` : ""}` : "کلینیک");

  return {
    clinicLocation: {
      lat: clinicLat,
      lon: clinicLon,
      address: clinicAddress,
      city: clinic?.city ?? "تهران",
    },
    pathwayLibrary,
    // کاتالوگ ایستگاه از API؛ در صورت خطا به mock برنگرد (لیست خالی بهتر از دادهٔ مرده)
    rooms: await loadClinicRoomsForSnapshot(),
    links: [],
    pathways,
    staff: [],
    patients: [],
    contracts,
    forms,
    platform,
    serverTime: new Date().toISOString(),
  };
}
