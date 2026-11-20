/*
 File: frontend/src/components/PlatformAdminPanel.tsx
 Description: پنل ادمین کل و مدیریت کاربران؛ تب خزانه فایل با تامنیل (Platform-only)
 Parent Dependencies: types/clinic, VaultFileThumbGrid, api/evidence vault, platform-actions via onAction
 */

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Flag,
  Laptop,
  Loader2,
  MapPin,
  MonitorSmartphone,
  Package,
  Plug,
  ScrollText,
  Settings2,
  ShieldAlert,
  Smartphone,
  Trash2,
  Users,
} from "lucide-react";
import { AppInput } from "@/components/AppInput";
import { GpsMapPopup, type GpsMapPoint } from "@/components/GpsMapPopup";
import { ListPager, slicePage, type ListPageSize } from "@/components/ListPager";
import { VaultFileThumbGrid } from "@/components/VaultFileThumbGrid";
import { gpsInPackage, photosInPackage, tehranDayKey } from "@/lib/evidence-packages";
import {
  hardDeleteVaultFiles,
  listVaultFiles,
  softDeleteVaultFiles,
  type ApiVaultFileDto,
} from "@/lib/api/evidence";
import { fetchPlatformUsers, loadFraudSessionPhotoMeta } from "@/lib/api/workspace";
import { useStorageObjectUrl } from "@/hooks/useStorageObjectUrl";
import { DEFAULT_OSM_LOCAL } from "@/lib/mock-platform";
import { probeOsmLocal } from "@/lib/osm-routing";
import type {
  AuthSession,
  ClinicSnapshot,
  EvidencePackage,
  FraudCaptureSession,
  MultiSessionAlert,
  PlatformSettings,
  PlatformUserPrimaryRole,
  PlatformUserProfile,
  UserPhotoRecord,
  GpsPoint,
} from "@/types/clinic";
import { IranDigitField } from "@/components/IranDigitField";
import { normalizeMobile, clampNationalIdInput } from "@/lib/person-identity";
import { toFaDigits } from "@/lib/persian";

export type PlatformSection =
  | "dashboard"
  | "users"
  | "fraud"
  | "health"
  | "settings"
  | "integrations"
  | "audit";

type FraudQueueTab = "camera" | "sessions" | "vault";

const FLAG_LABELS: Record<keyof PlatformSettings["featureFlags"], string> = {
  fraudWatch: "ضدتقلب دوربین",
  gpsTracking: "ردیابی GPS",
  multiClinicRegistry: "رجیستری چندکلینیک (غیرفعال)",
  corporateContracts: "قراردادهای سازمانی",
  multiSessionWatch: "مانیتورینگ چندسشنی",
};

const SURFACE_FA: Record<AuthSession["appSurface"], string> = {
  clinic_web: "وب کلینیک",
  patient_kiosk: "کیوسک پذیرش",
};

interface Props {
  snapshot: ClinicSnapshot;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  busy?: boolean;
  initialSection?: PlatformSection;
  /** کلینیک: بدون نقش/کاربران ادمین کل؛ full: ادمین کل */
  userScope?: "full" | "clinic";
}

const REVIEW_FA = {
  pending: "در انتظار بازبینی",
  cleared: "تأیید هویت",
  flagged: "مشکوک",
} as const;

/** عنوان نشست ضدتقلب — هرگز hash Guid به‌عنوان «بیمار N» نشان داده نشود */
function fraudSessionDisplayName(s: FraudCaptureSession, users: PlatformUserProfile[]) {
  const fromDto = s.patientDisplayName?.trim();
  if (fromDto) return fromDto;
  if (s.userServerId) {
    const byUser = users.find((u) => u.id === s.userServerId);
    if (byUser?.fullName?.trim()) return byUser.fullName.trim();
  }
  if (s.patientServerId) {
    const byPatient = users.find((u) => u.linkedPatientId === s.patientServerId);
    if (byPatient?.fullName?.trim()) return byPatient.fullName.trim();
  }
  if (s.patientNationalId?.trim()) return `بیمار ${toFaDigits(s.patientNationalId.trim())}`;
  return "بیمار بدون نام";
}

function resolveUserForFraudSession(s: FraudCaptureSession, users: PlatformUserProfile[]) {
  return (
    users.find((u) => s.userServerId && u.id === s.userServerId) ??
    users.find((u) => s.patientServerId && u.linkedPatientId === s.patientServerId) ??
    users.find((u) => u.patientId === s.patientId) ??
    null
  );
}

const KIND_FA: Record<EvidencePackage["kind"], string> = {
  camera_session: "جلسه دوربین",
  burst: "پشت‌سرهم",
  day: "روز",
};

type PackageFilter = "all" | "today" | "camera";
type UserDetailTab = "profile" | "access" | "case";

const PRIMARY_ROLE_OPTIONS: { id: PlatformUserPrimaryRole; label: string }[] = [
  { id: "platform", label: "ادمین کل" },
  { id: "clinic_admin", label: "ادمین کلینیک" },
  { id: "staff", label: "کادر درمان" },
  { id: "patient", label: "سلامتجو" },
  { id: "supervisor", label: "ناظر سازمان" },
];

/** ادمین کلینیک نباید نقش ادمین کل را در select ببیند */
const CLINIC_ROLE_OPTIONS = PRIMARY_ROLE_OPTIONS.filter((r) => r.id !== "platform");

function emptyUserDraft(clinicId: string): PlatformUserProfile {
  const now = new Date().toISOString();
  return {
    id: "",
    userId: null,
    patientId: null,
    fullName: "",
    phone: "",
    nationalId: "",
    email: "",
    clinicId,
    roleLabel: "سلامتجو",
    primaryRole: "patient",
    notes: "",
    createdAt: now,
    lastLoginAt: null,
    profilePhotoDataUrl: null,
    lastGps: null,
    gpsHistory: [],
    isActive: true,
    contracts: [],
    assignedContractId: null,
  };
}

function formatContractLabel(title: string, status?: string): string {
  const inactive = status && status !== "Active";
  return inactive ? `${title} · غیرفعال` : title;
}

function formatUserContractsLine(u: PlatformUserProfile): string {
  const titles = (u.contracts ?? []).map((c) => formatContractLabel(c.title, c.status)).filter(Boolean);
  if (titles.length === 0) return "بدون قرارداد";
  if (titles.length <= 2) return titles.join(" · ");
  return `${titles.slice(0, 2).join(" · ")} +${titles.length - 2}`;
}

function latestPortrait(photos: UserPhotoRecord[], patientId: number): UserPhotoRecord | null {
  return (
    photos.find((p) => p.patientId === patientId && (p.kind === "portrait" || p.kind === "fraud_confirm")) ??
    null
  );
}

function sessionFrames(photos: UserPhotoRecord[], sessionId: string): UserPhotoRecord[] {
  return photos
    .filter((p) => p.sessionId === sessionId && p.kind === "fraud_auto")
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
}

function formatRange(start: string, end: string): string {
  const a = new Date(start).toLocaleString("fa-IR");
  const b = new Date(end).toLocaleString("fa-IR");
  return a === b ? a : `${a} ← ${b}`;
}

/** Approximate decoded byte size of a data URL (base64 payload). */
/** تامنیل فقط وقتی در DOM است دانلود می‌شود (نه در bootstrap) */
function LazyPhotoImg({
  photo,
  alt,
  className,
}: {
  photo: UserPhotoRecord;
  alt: string;
  className?: string;
}) {
  const needFetch = !photo.dataUrl && !!photo.storageKey;
  const { url, failed } = useStorageObjectUrl(needFetch ? photo.storageKey : null);
  const src = photo.dataUrl || url;
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-[9px] text-slate-400 ${className ?? ""}`}>
        {failed ? "بارگذاری ناموفق" : "…"}
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} />;
}

function dataUrlBytes(dataUrl: string): number {
  if (!dataUrl) return 0;
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

function formatFileSizeFa(bytes: number): string {
  if (bytes < 1024) return `${toFaDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    const rounded = kb >= 10 ? Math.round(kb) : Math.round(kb * 10) / 10;
    return `${toFaDigits(String(rounded))} کیلوبایت`;
  }
  const mb = Math.round((bytes / (1024 * 1024)) * 100) / 100;
  return `${toFaDigits(String(mb))} مگابایت`;
}

export function PlatformAdminPanel({
  snapshot,
  onAction,
  busy = false,
  initialSection = "dashboard",
  userScope = "full",
}: Props) {
  const platform = snapshot.platform;
  const section = initialSection;
  const isClinicScope = userScope === "clinic";
  const [includeInactiveContracts, setIncludeInactiveContracts] = useState(false);
  const [usersOverride, setUsersOverride] = useState<PlatformUserProfile[] | null>(null);
  const [usersReloadBusy, setUsersReloadBusy] = useState(false);
  const roleOptions = isClinicScope ? CLINIC_ROLE_OPTIONS : PRIMARY_ROLE_OPTIONS;
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(platform.fraudSessions[0]?.id ?? "");
  const [selectedAlertId, setSelectedAlertId] = useState(platform.multiSessionAlerts?.[0]?.id ?? "");
  const [fraudTab, setFraudTab] = useState<FraudQueueTab>("sessions");
  /** فریم‌های لود‌شده فقط برای نشست انتخاب‌شده — نه در bootstrap کل اپ */
  const [lazySessionPhotos, setLazySessionPhotos] = useState<UserPhotoRecord[]>([]);
  const [lazyPhotosBusy, setLazyPhotosBusy] = useState(false);
  const [vaultTrash, setVaultTrash] = useState(false);
  const [vaultRows, setVaultRows] = useState<ApiVaultFileDto[]>([]);
  const [vaultSelected, setVaultSelected] = useState<Set<string>>(new Set());
  const [vaultBusy, setVaultBusy] = useState(false);
  const [vaultError, setVaultError] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [sessionReviewNote, setSessionReviewNote] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<PlatformSettings>(platform.settings);
  const [factoryOtp, setFactoryOtp] = useState("");
  const [factoryDemoCode, setFactoryDemoCode] = useState<string | null>(null);
  const [factoryBusy, setFactoryBusy] = useState(false);
  const [packageFilter, setPackageFilter] = useState<PackageFilter>("all");
  const [mapPoint, setMapPoint] = useState<GpsMapPoint | null>(null);
  const [userTab, setUserTab] = useState<UserDetailTab>("profile");
  const [creatingUser, setCreatingUser] = useState(false);
  const osmStored = platform.settings.osmLocal ?? DEFAULT_OSM_LOCAL;
  const [osmBaseDraft, setOsmBaseDraft] = useState(osmStored.baseUrl);
  const [osmTesting, setOsmTesting] = useState(false);
  const [osmFlash, setOsmFlash] = useState<{ text: string; error?: boolean } | null>(null);
  const defaultClinicId = platform.clinics.find((c) => c.isCurrentTenant)?.id ?? platform.clinics[0]?.id ?? "";
  const [userDraft, setUserDraft] = useState<PlatformUserProfile>(() => emptyUserDraft(defaultClinicId));
  const authSessions = platform.authSessions ?? [];
  const multiSessionAlerts = platform.multiSessionAlerts ?? [];

  useEffect(() => {
    if (!includeInactiveContracts) {
      setUsersOverride(null);
      return;
    }
    let cancelled = false;
    setUsersReloadBusy(true);
    void fetchPlatformUsers(true)
      .then((rows) => {
        if (cancelled) return;
        setUsersOverride(
          rows.map((u) => ({
            ...u,
            clinicId: u.clinicId || defaultClinicId,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setUsersOverride(null);
      })
      .finally(() => {
        if (!cancelled) setUsersReloadBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [includeInactiveContracts, platform.users, defaultClinicId]);

  // فریم نشست فقط وقتی تب دوربین باز است و نشست انتخاب شده
  useEffect(() => {
    if (section !== "fraud" || fraudTab !== "camera" || isClinicScope || !selectedSessionId) {
      setLazySessionPhotos([]);
      return;
    }
    let cancelled = false;
    setLazyPhotosBusy(true);
    void loadFraudSessionPhotoMeta(selectedSessionId)
      .then((rows) => {
        if (!cancelled) setLazySessionPhotos(rows);
      })
      .catch(() => {
        if (!cancelled) setLazySessionPhotos([]);
      })
      .finally(() => {
        if (!cancelled) setLazyPhotosBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [section, fraudTab, selectedSessionId, isClinicScope]);

  // خزانه فقط برای ادمین کل؛ با تعویض تب یا سطل زباله دوباره لود می‌شود
  useEffect(() => {
    if (section !== "fraud" || fraudTab !== "vault" || isClinicScope) return;
    let cancelled = false;
    setVaultBusy(true);
    setVaultError("");
    void listVaultFiles(vaultTrash, 100)
      .then((rows) => {
        if (cancelled) return;
        setVaultRows(rows);
        setVaultSelected(new Set());
      })
      .catch((err) => {
        if (!cancelled) setVaultError(err instanceof Error ? err.message : "بارگذاری خزانه ناموفق بود.");
      })
      .finally(() => {
        if (!cancelled) setVaultBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [section, fraudTab, vaultTrash, isClinicScope]);

  const usersSource = usersOverride ?? platform.users;
  // ادمین کلینیک اصلاً نباید کاربران ادمین کل را در فهرست ببیند
  const visibleUsers = useMemo(
    () => (isClinicScope ? usersSource.filter((u) => u.primaryRole !== "platform") : usersSource),
    [isClinicScope, usersSource],
  );
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState<ListPageSize>(20);
  const pagedUsers = useMemo(
    () => slicePage(visibleUsers, usersPage, usersPageSize),
    [visibleUsers, usersPage, usersPageSize]
  );

  useEffect(() => {
    setUsersPage(1);
  }, [includeInactiveContracts, isClinicScope, usersSource.length]);

  useEffect(() => {
    if (!selectedUserId && visibleUsers[0]) setSelectedUserId(visibleUsers[0].id);
  }, [selectedUserId, visibleUsers]);

  useEffect(() => {
    setOsmBaseDraft(platform.settings.osmLocal?.baseUrl ?? "");
  }, [platform.settings.osmLocal?.baseUrl]);

  const openGpsMap = (g: GpsPoint, label?: string) => {
    setMapPoint({
      lat: g.lat,
      lon: g.lon,
      accuracy: g.accuracy,
      capturedAt: g.capturedAt,
      source: g.source,
      label: label ?? "موقعیت GPS",
    });
  };

  const selectedUser = creatingUser
    ? null
    : visibleUsers.find((u) => u.id === selectedUserId) ?? visibleUsers[0] ?? null;

  useEffect(() => {
    if (creatingUser) return;
    if (!selectedUser) return;
    setUserDraft({
      ...selectedUser,
      email: selectedUser.email ?? "",
      notes: selectedUser.notes ?? "",
      primaryRole: selectedUser.primaryRole ?? "patient",
      profilePhotoDataUrl: selectedUser.profilePhotoDataUrl ?? null,
      createdAt: selectedUser.createdAt ?? new Date().toISOString(),
      lastLoginAt: selectedUser.lastLoginAt ?? null,
      contracts: selectedUser.contracts ?? [],
      assignedContractId:
        selectedUser.assignedContractId
        ?? selectedUser.contracts?.find((c) => c.relation === "supervisor")?.contractId
        ?? null,
    });
  }, [selectedUser, creatingUser]);

  const contractChoices = useMemo(
    () =>
      (snapshot.contracts ?? []).map((c) => ({
        id: c.serverId ?? String(c.id),
        title: c.title || c.organizationName || c.code || String(c.id),
      })),
    [snapshot.contracts],
  );
  const selectedSession =
    platform.fraudSessions.find((s) => s.id === selectedSessionId) ?? platform.fraudSessions[0] ?? null;
  const selectedAlert =
    multiSessionAlerts.find((a) => a.id === selectedAlertId) ?? multiSessionAlerts[0] ?? null;
  const selectedAlertSessions = selectedAlert
    ? authSessions
        .filter((s) => s.userId === selectedAlert.userId && !s.revokedAt)
        .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
    : [];
  const selectedUserSessions =
    selectedUser?.userId != null
      ? authSessions
          .filter((s) => s.userId === selectedUser.userId && !s.revokedAt)
          .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
      : [];

  const userPackages = useMemo(() => {
    if (!selectedUser?.patientId) return [] as EvidencePackage[];
    const todayKey = tehranDayKey(new Date().toISOString());
    return (platform.packages ?? [])
      .filter((p) => p.patientId === selectedUser.patientId)
      .filter((p) => {
        if (packageFilter === "today") return p.dayKey === todayKey;
        if (packageFilter === "camera") return p.kind === "camera_session";
        return true;
      })
      .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  }, [platform.packages, selectedUser, packageFilter]);

  const kpi = useMemo(() => {
    const pendingFraud = platform.fraudSessions.filter((s) => s.reviewStatus === "pending").length;
    const flaggedCamera = platform.fraudSessions.filter((s) => s.reviewStatus === "flagged").length;
    const pendingMulti = (platform.multiSessionAlerts ?? []).filter((s) => s.reviewStatus === "pending").length;
    const flaggedMulti = (platform.multiSessionAlerts ?? []).filter((s) => s.reviewStatus === "flagged").length;
    const patientsToday = platform.clinics.reduce((sum, c) => sum + c.patientsToday, 0);
    return {
      pendingFraud,
      pendingMulti,
      flagged: flaggedCamera + flaggedMulti,
      patientsToday,
      users: platform.users.length,
    };
  }, [platform]);

  const reviewSession = async (session: FraudCaptureSession, reviewStatus: "cleared" | "flagged") => {
    await onAction({
      action: "PLATFORM_REVIEW_FRAUD_SESSION",
      sessionId: session.id,
      reviewStatus,
      reviewNote,
    });
    setReviewNote("");
  };

  const reviewMultiSession = async (alert: MultiSessionAlert, reviewStatus: "cleared" | "flagged") => {
    await onAction({
      action: "PLATFORM_REVIEW_MULTI_SESSION",
      alertId: alert.id,
      reviewStatus,
      reviewNote: sessionReviewNote,
    });
    setSessionReviewNote("");
  };

  const revokeUserSessions = async (userId: number) => {
    await onAction({ action: "PLATFORM_REVOKE_USER_SESSIONS", userId });
  };

  const saveSettings = async () => {
    await onAction({ action: "PLATFORM_UPDATE_SETTINGS", settings: settingsDraft });
  };

  const saveOsmLocal = async () => {
    setOsmFlash(null);
    await onAction({ action: "PLATFORM_UPDATE_OSM_LOCAL", baseUrl: osmBaseDraft });
    setOsmFlash({ text: "Base URL ذخیره شد. برای فعال‌سازی محلی، تست اتصال را اجرا کنید." });
  };

  const testOsmLocal = async () => {
    setOsmFlash(null);
    setOsmTesting(true);
    try {
      await onAction({ action: "PLATFORM_UPDATE_OSM_LOCAL", baseUrl: osmBaseDraft });
      const result = await probeOsmLocal(osmBaseDraft);
      await onAction({
        action: "PLATFORM_APPLY_OSM_LOCAL_TEST",
        baseUrl: osmBaseDraft,
        nominatimOk: result.nominatimOk,
        osrmOk: result.osrmOk,
        tileOk: result.tileOk,
        lastError: result.lastError,
      });
      if (result.active) {
        const parts = ["Nominatim ✓"];
        parts.push(result.osrmOk ? "OSRM ✓" : "OSRM ✗ (عمومی)");
        parts.push(result.tileOk ? "تایل ✓" : "تایل ✗ (عمومی)");
        setOsmFlash({ text: `محلی فعال شد · ${parts.join(" · ")}` });
      } else {
        setOsmFlash({
          text: result.lastError || "تست ناموفق؛ همچنان از سایت عمومی OSM استفاده می‌شود.",
          error: true,
        });
      }
    } catch (e) {
      setOsmFlash({
        text: e instanceof Error ? e.message : "خطا در تست اتصال OSM",
        error: true,
      });
    } finally {
      setOsmTesting(false);
    }
  };

  const startCreateUser = () => {
    setCreatingUser(true);
    setSelectedUserId("");
    setUserTab("profile");
    setUserDraft(emptyUserDraft(defaultClinicId));
  };

  const saveUserDraft = async () => {
    if (userDraft.primaryRole === "supervisor" && !userDraft.assignedContractId) {
      window.alert("برای نقش ناظر انتخاب قرارداد الزامی است.");
      return;
    }
    const res = (await onAction({
      action: "PLATFORM_UPSERT_USER",
      // شناسه Guid سرور برای ویرایش؛ در ایجاد خالی است
      serverUserId: creatingUser ? undefined : userDraft.id,
      id: creatingUser ? undefined : userDraft.id,
      // نام کامل هنوز برای نمایش لیست؛ API از first/last پر می‌شود (split امن)
      fullName: userDraft.fullName,
      firstName: userDraft.fullName.trim().split(/\s+/)[0] || "",
      lastName: userDraft.fullName.trim().split(/\s+/).slice(1).join(" ") || "",
      phone: normalizeMobile(userDraft.phone),
      nationalId: clampNationalIdInput(userDraft.nationalId),
      email: userDraft.email,
      clinicId: userDraft.clinicId,
      // فقط برای نقش ناظر معنی‌دار است
      contractId: userDraft.primaryRole === "supervisor" ? userDraft.assignedContractId ?? null : null,
      notes: userDraft.notes,
      primaryRole: userDraft.primaryRole,
      isActive: userDraft.isActive,
      profilePhotoDataUrl: userDraft.profilePhotoDataUrl,
    })) as { userId?: string } | null;
    if (creatingUser && res?.userId) {
      setCreatingUser(false);
      setSelectedUserId(res.userId);
    }
  };

  const setUserActive = async (isActive: boolean) => {
    if (!userDraft.id) return;
    await onAction({ action: "PLATFORM_SET_USER_ACTIVE", id: userDraft.id, serverUserId: userDraft.id, isActive });
  };

  const resetUserAccess = async () => {
    if (!userDraft.id) return;
    await onAction({ action: "PLATFORM_RESET_USER_ACCESS", id: userDraft.id });
  };

  // عکس‌های bootstrap + فریم تنبل نشست انتخاب‌شده
  const reviewPhotos = useMemo(() => {
    const byId = new Map<string, UserPhotoRecord>();
    for (const p of platform.photos) byId.set(p.id, p);
    for (const p of lazySessionPhotos) byId.set(p.id, p);
    return [...byId.values()];
  }, [platform.photos, lazySessionPhotos]);

  const casePortraitFallback =
    selectedUser?.patientId != null
      ? reviewPhotos.find(
          (p) =>
            p.patientId === selectedUser.patientId &&
            (p.kind === "portrait" || p.kind === "fraud_confirm")
        )?.dataUrl ?? null
      : null;
  const avatarUrl = userDraft.profilePhotoDataUrl || casePortraitFallback;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-l from-slate-50 to-white p-5">
        <p className="text-[10px] font-medium text-teal-700">کنترل پلتفرم</p>
        <h1 className="mt-1 text-base font-semibold text-slate-900">
          {section === "dashboard" && "داشبورد پلتفرم"}
          {section === "users" && "مدیریت کاربران"}
          {section === "fraud" && "بازبینی ضدتقلب"}
          {section === "health" && "نظارت فنی سیستم"}
          {section === "settings" && "تنظیمات پایه پلتفرم"}
          {section === "integrations" && "یکپارچه‌سازی‌ها"}
          {section === "audit" && "ممیزی و ردپای اقدامات"}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[11px] leading-6 text-slate-500">
          {section === "users"
            ? "مدیریت حساب‌ها: مشخصات، نشست‌های فعال و در صورت نیاز بررسی موردی GPS و ضدتقلب."
            : section === "fraud"
              ? "صف بازبینی هویت دوربین و هشدار حساب‌هایی با دو یا چند نشست هم‌زمان."
              : "این پنل جدا از ادمین کلینیک است: کاربران، ضدتقلب و سلامت فنی سامانه."}
        </p>
      </header>

      {section === "dashboard" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "مراجعه‌کننده امروز", value: kpi.patientsToday, icon: Activity },
              { label: "کاربران پلتفرم", value: kpi.users, icon: Users },
              { label: "ضدتقلب دوربین", value: kpi.pendingFraud, icon: ShieldAlert },
              { label: "چندسشنی در انتظار", value: kpi.pendingMulti, icon: MonitorSmartphone },
              { label: "پرچم مشکوک", value: kpi.flagged, icon: Flag },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-500">{card.label}</p>
                  <card.icon className="h-4 w-4 text-teal-700" />
                </div>
                <p className="mt-2 text-xl font-semibold text-slate-900">{toFaDigits(card.value)}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-xs font-semibold text-slate-800">وضعیت سرویس‌ها</h2>
              <ul className="mt-3 space-y-2">
                {platform.health.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[11px]">
                    <span className="text-slate-600">{m.label}</span>
                    <span className={m.status === "ok" ? "text-teal-700" : m.status === "warn" ? "text-amber-700" : "text-rose-700"}>
                      {toFaDigits(m.value)} {m.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-xs font-semibold text-slate-800">آخرین ممیزی</h2>
              <ul className="mt-3 space-y-2">
                {platform.audit.slice(0, 6).map((a) => (
                  <li key={a.id} className="rounded-xl border border-slate-100 px-3 py-2 text-[11px] leading-5 text-slate-600">
                    <span className="font-medium text-slate-800">{a.action}</span> · {a.target}
                    <div className="text-[10px] text-slate-400">{a.detail}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {section === "users" && (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-[10px] font-medium text-slate-500">فهرست کاربران</p>
              <button
                type="button"
                onClick={startCreateUser}
                className="rounded-lg bg-teal-700 px-2 py-1 text-[10px] font-medium text-white"
              >
                کاربر جدید
              </button>
            </div>
            <label className="mb-2 flex cursor-pointer items-center gap-1.5 px-1 text-[10px] text-slate-500">
              <input
                type="checkbox"
                checked={includeInactiveContracts}
                disabled={usersReloadBusy || busy}
                onChange={(e) => setIncludeInactiveContracts(e.target.checked)}
                className="rounded border-slate-300"
              />
              نمایش قراردادهای غیرفعال
              {usersReloadBusy ? <Loader2 className="h-3 w-3 animate-spin text-slate-400" /> : null}
            </label>
            <ul className="space-y-1">
              {pagedUsers.map((u) => {
                const thumb = u.profilePhotoDataUrl;
                const active = !creatingUser && selectedUser?.id === u.id;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingUser(false);
                        setSelectedUserId(u.id);
                        setUserTab("profile");
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-right text-[11px] ${
                        active ? "bg-teal-50 text-teal-800" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                        {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : u.fullName.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{u.fullName}</span>
                        <span className="block truncate text-[10px] text-slate-400">
                          {u.roleLabel || roleOptions.find((r) => r.id === u.primaryRole)?.label} ·{" "}
                          {u.isActive === false ? "تعلیق" : "فعال"}
                        </span>
                        <span className="block truncate text-[9px] text-slate-400">
                          {u.nationalId ? toFaDigits(u.nationalId) : "بدون کدملی"} · {formatUserContractsLine(u)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <ListPager
              page={usersPage}
              pageSize={usersPageSize}
              totalCount={visibleUsers.length}
              onPageChange={setUsersPage}
              onPageSizeChange={setUsersPageSize}
              itemLabel="کاربر"
              className="mt-2 border-t-0 px-0"
              disabled={usersReloadBusy || busy}
            />
          </div>

          {(selectedUser || creatingUser) && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-14 w-14 overflow-hidden rounded-2xl bg-slate-100 text-sm font-semibold text-slate-500">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">{userDraft.fullName.slice(0, 1) || "؟"}</span>
                      )}
                    </span>
                    <div>
                      <h2 className="text-xs font-semibold text-slate-800">
                        {creatingUser ? "کاربر جدید" : userDraft.fullName || "بدون نام"}
                      </h2>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {creatingUser ? "فرم ایجاد حساب پلتفرم" : `${userDraft.roleLabel} · ${userDraft.isActive ? "فعال" : "تعلیق‌شده"}`}
                      </p>
                      {!userDraft.profilePhotoDataUrl && casePortraitFallback && (
                        <p className="mt-1 text-[10px] text-teal-700">آواتار از پرتره پرونده نمایش داده می‌شود (هنوز روی پروفایل ذخیره نشده مگر با ذخیره عکس پرونده).</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        ["profile", "مشخصات"],
                        ["access", "دسترسی"],
                        ...(!isClinicScope ? ([["case", "بررسی موردی"]] as const) : []),
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        disabled={creatingUser && id === "case"}
                        onClick={() => setUserTab(id)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] disabled:opacity-40 ${
                          userTab === id ? "bg-teal-700 text-white" : "border border-slate-200 text-slate-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(userTab === "profile" || creatingUser) && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[11px] text-slate-600">
                      نام
                      <input
                        value={userDraft.fullName.trim().split(/\s+/)[0] || ""}
                        onChange={(e) => {
                          const last = userDraft.fullName.trim().split(/\s+/).slice(1).join(" ");
                          setUserDraft((d) => ({
                            ...d,
                            fullName: `${e.target.value.trim()} ${last}`.trim(),
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px]"
                      />
                    </label>
                    <label className="block text-[11px] text-slate-600">
                      نام‌خانوادگی
                      <input
                        value={userDraft.fullName.trim().split(/\s+/).slice(1).join(" ") || ""}
                        onChange={(e) => {
                          const first = userDraft.fullName.trim().split(/\s+/)[0] || "";
                          setUserDraft((d) => ({
                            ...d,
                            fullName: `${first} ${e.target.value.trim()}`.trim(),
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px]"
                      />
                    </label>
                    <label className="block text-[11px] text-slate-600">
                      تلفن
                      <IranDigitField
                        kind="mobile"
                        value={userDraft.phone}
                        onValueChange={(phone) => setUserDraft((d) => ({ ...d, phone }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-left font-mono text-[11px]"
                      />
                    </label>
                    <label className="block text-[11px] text-slate-600">
                      کد ملی
                      <IranDigitField
                        kind="nationalId"
                        value={userDraft.nationalId}
                        onValueChange={(nationalId) => setUserDraft((d) => ({ ...d, nationalId }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-left font-mono text-[11px]"
                      />
                    </label>
                    <label className="block text-[11px] text-slate-600">
                      ایمیل
                      <input
                        value={String(userDraft.email ?? "")}
                        onChange={(e) => setUserDraft((d) => ({ ...d, email: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px]"
                      />
                    </label>
                    <label className="block text-[11px] text-slate-600">
                      نقش
                      <select
                        value={userDraft.primaryRole}
                        onChange={(e) => {
                          const primaryRole = e.target.value as PlatformUserPrimaryRole;
                          const roleLabel = roleOptions.find((r) => r.id === primaryRole)?.label ?? primaryRole;
                          setUserDraft((d) => ({
                            ...d,
                            primaryRole,
                            roleLabel,
                            assignedContractId: primaryRole === "supervisor" ? d.assignedContractId : null,
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px]"
                      >
                        {roleOptions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {userDraft.primaryRole === "supervisor" && (
                      <label className="block text-[11px] text-slate-600 sm:col-span-2">
                        قرارداد ناظر
                        <select
                          value={userDraft.assignedContractId ?? ""}
                          onChange={(e) =>
                            setUserDraft((d) => ({ ...d, assignedContractId: e.target.value || null }))
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px]"
                        >
                          <option value="">انتخاب قرارداد…</option>
                          {contractChoices.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  {!creatingUser && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-600">
                      <p className="font-medium text-slate-700">قراردادها</p>
                      {(userDraft.contracts ?? []).length === 0 ? (
                        <p className="mt-1 text-slate-400">بدون قرارداد مرتبط</p>
                      ) : (
                        <ul className="mt-1 space-y-0.5">
                          {(userDraft.contracts ?? []).map((c) => (
                            <li key={`${c.contractId}-${c.relation}`}>
                              {formatContractLabel(c.title, c.status)}
                              <span className="text-slate-400">
                                {" "}
                                · {c.relation === "supervisor" ? "ناظر" : "عضو"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <label className="block text-[11px] text-slate-600">
                    یادداشت
                    <textarea
                      value={userDraft.notes}
                      onChange={(e) => setUserDraft((d) => ({ ...d, notes: e.target.value }))}
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px]"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveUserDraft()}
                      className="rounded-xl bg-teal-700 px-4 py-2 text-[11px] font-medium text-white disabled:opacity-50"
                    >
                      {creatingUser ? "ایجاد کاربر" : "ذخیره مشخصات"}
                    </button>
                    {creatingUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setCreatingUser(false);
                          if (platform.users[0]) setSelectedUserId(platform.users[0].id);
                        }}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-[11px] text-slate-600"
                      >
                        انصراف
                      </button>
                    )}
                  </div>
                </div>
              )}

              {userTab === "access" && !creatingUser && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-[11px]">
                  <p className="text-slate-600">
                    وضعیت:{" "}
                    <span className={userDraft.isActive ? "text-teal-700" : "text-rose-700"}>
                      {userDraft.isActive ? "فعال" : "تعلیق"}
                    </span>
                  </p>
                  <p className="text-slate-600">
                    آخرین ورود: {userDraft.lastLoginAt ? new Date(userDraft.lastLoginAt).toLocaleString("fa-IR") : "—"}
                  </p>
                  <p className="text-slate-600">
                    ایجاد: {userDraft.createdAt ? new Date(userDraft.createdAt).toLocaleString("fa-IR") : "—"}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busy || userDraft.isActive}
                      onClick={() => void setUserActive(true)}
                      className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-teal-800 disabled:opacity-40"
                    >
                      فعال‌سازی
                    </button>
                    <button
                      type="button"
                      disabled={busy || !userDraft.isActive}
                      onClick={() => void setUserActive(false)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 disabled:opacity-40"
                    >
                      تعلیق
                    </button>
                    {!isClinicScope && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void resetUserAccess()}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 disabled:opacity-40"
                      >
                        ریست دسترسی / قطع نشست‌ها
                      </button>
                    )}
                    {!isClinicScope && selectedUser?.userId != null && selectedUserSessions.length > 0 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void revokeUserSessions(selectedUser.userId!)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 disabled:opacity-40"
                      >
                        قطع همه نشست‌های فعال
                      </button>
                    )}
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-2 text-[10px] font-medium text-slate-500">
                      نشست‌های فعال · {toFaDigits(selectedUserSessions.length)}
                    </p>
                    {!selectedUserSessions.length && (
                      <p className="text-[11px] text-slate-400">نشست فعالی برای این کاربر نیست.</p>
                    )}
                    <ul className="space-y-2">
                      {selectedUserSessions.map((s) => (
                        <li key={s.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="flex items-center gap-2 font-medium text-slate-800">
                            {/Android|iOS/i.test(s.system) ? (
                              <Smartphone className="h-3.5 w-3.5 text-teal-700" />
                            ) : s.appSurface === "patient_kiosk" ? (
                              <MonitorSmartphone className="h-3.5 w-3.5 text-teal-700" />
                            ) : (
                              <Laptop className="h-3.5 w-3.5 text-teal-700" />
                            )}
                            {s.deviceLabel}
                          </div>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {s.system} · {s.browser} · {SURFACE_FA[s.appSurface]} · {s.ipHint}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            آخرین فعالیت: {toFaDigits(new Date(s.lastSeenAt).toLocaleString("fa-IR"))}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {userTab === "case" && selectedUser && !creatingUser && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-medium text-slate-500">بررسی موردی · GPS و شواهد هویت</p>
                    {selectedUser.lastGps ? (
                      <button
                        type="button"
                        onClick={() => openGpsMap(selectedUser.lastGps!, "آخرین موقعیت")}
                        className="mt-2 flex w-full items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-right text-[11px] text-slate-600 transition hover:bg-teal-50 hover:text-teal-900"
                      >
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" />
                        <span>
                          آخرین موقعیت: {toFaDigits(selectedUser.lastGps.lat.toFixed(5))} ، {toFaDigits(selectedUser.lastGps.lon.toFixed(5))}
                          <span className="mt-0.5 block text-[10px] text-teal-700">نقشه OSM</span>
                        </span>
                      </button>
                    ) : (
                      <p className="mt-2 text-[11px] text-slate-400">موقعیت GPS ثبت نشده.</p>
                    )}
                    {(selectedUser.linkedPatientId || selectedUser.patientId != null) && (
                      <div className="mt-3 space-y-1">
                        {platform.fraudSessions
                          .filter(
                            (s) =>
                              (selectedUser.linkedPatientId &&
                                s.patientServerId === selectedUser.linkedPatientId) ||
                              (selectedUser.patientId != null && s.patientId === selectedUser.patientId)
                          )
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedSessionId(s.id);
                                setReviewNote(s.reviewNote);
                              }}
                              className="block w-full rounded-xl border border-slate-100 px-3 py-2 text-right text-[10px] text-slate-600 hover:bg-slate-50"
                            >
                              جلسه ضدتقلب · {REVIEW_FA[s.reviewStatus]} · {new Date(s.startedAt).toLocaleString("fa-IR")}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <Package className="h-3.5 w-3.5 text-teal-700" />
                        پکیج‌های شواهد
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {(
                          [
                            ["all", "همه"],
                            ["today", "امروز"],
                            ["camera", "جلسات دوربین"],
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setPackageFilter(id)}
                            className={`rounded-lg px-2.5 py-1 text-[10px] ${
                              packageFilter === id ? "bg-teal-700 text-white" : "border border-slate-200 text-slate-600"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 space-y-3">
                      {userPackages.map((pkg) => {
                        const photos = photosInPackage(reviewPhotos, pkg.id);
                        const points = gpsInPackage(selectedUser.gpsHistory, pkg.id);
                        return (
                          <article key={pkg.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-[11px] font-semibold text-slate-800">{pkg.label}</p>
                                <p className="mt-0.5 text-[10px] text-slate-500">{formatRange(pkg.startedAt, pkg.endedAt)}</p>
                              </div>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[9px] text-teal-800 ring-1 ring-teal-100">
                                {KIND_FA[pkg.kind]} · {toFaDigits(photos.length)} عکس · {toFaDigits(points.length)} GPS
                              </span>
                            </div>
                            {photos.length > 0 && (
                              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                                {photos.map((p) => (
                                  <figure key={p.id} className="overflow-hidden rounded-xl border border-white bg-white">
                                    <LazyPhotoImg photo={p} alt={p.kind} className="aspect-[3/4] w-full object-cover" />
                                    <figcaption className="px-2 py-1.5 text-[9px] leading-4 text-slate-500">
                                      {p.kind === "portrait" ? "پرتره" : p.kind === "fraud_confirm" ? "تأیید کاربر" : "فریم ضدتقلب"}
                                      <br />
                                      {new Date(p.capturedAt).toLocaleString("fa-IR")}
                                      {p.dataUrl ? (
                                        <>
                                          <br />
                                          حجم: {formatFileSizeFa(dataUrlBytes(p.dataUrl))}
                                        </>
                                      ) : null}
                                    </figcaption>
                                  </figure>
                                ))}
                              </div>
                            )}
                            <ul className="mt-3 max-h-36 space-y-1 overflow-auto text-[10px] text-slate-600">
                              {points.map((g, i) => (
                                <li key={`${pkg.id}-gps-${i}`}>
                                  <button
                                    type="button"
                                    onClick={() => openGpsMap(g, pkg.label)}
                                    className="w-full rounded-lg bg-white px-2 py-1.5 text-right transition hover:bg-teal-50 hover:text-teal-900"
                                  >
                                    <MapPin className="ml-1 inline h-3 w-3 text-teal-700" />
                                    {toFaDigits(g.lat.toFixed(5))} ، {toFaDigits(g.lon.toFixed(5))}
                                    {" · "}
                                    {new Date(g.capturedAt).toLocaleString("fa-IR")} · {g.source}
                                  </button>
                                </li>
                              ))}
                              {!points.length && !photos.length && (
                                <li className="text-slate-400">در این پکیج هنوز شواهدی نیست.</li>
                              )}
                            </ul>
                          </article>
                        );
                      })}
                      {!userPackages.length && (
                        <p className="text-[11px] text-slate-400">پکیج شواهدی برای این کاربر نیست.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {section === "fraud" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["sessions", "نشست‌های هم‌زمان", multiSessionAlerts.filter((a) => a.reviewStatus === "pending").length],
                ["camera", "دوربین هویت", platform.fraudSessions.filter((s) => s.reviewStatus === "pending").length],
                // خزانه شواهد فقط ادمین کل — ادمین کلینیک حتی لیست ندارد
                ...(!isClinicScope ? ([["vault", "خزانه فایل", 0]] as const) : []),
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFraudTab(id)}
                className={`rounded-xl px-3 py-2 text-[11px] ${
                  fraudTab === id ? "bg-teal-700 text-white" : "border border-slate-200 text-slate-600"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[9px] ${fraudTab === id ? "bg-white/20" : "bg-amber-50 text-amber-700"}`}>
                    {toFaDigits(count)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {fraudTab === "sessions" && (
            <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="mb-2 px-1 text-[10px] font-medium text-slate-500">هشدار حساب با ≥۲ نشست</p>
                <ul className="space-y-1">
                  {multiSessionAlerts.map((a) => {
                    const name =
                      platform.users.find((u) => u.userId === a.userId)?.fullName ??
                      `کاربر ${a.userId}`;
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAlertId(a.id);
                            setSessionReviewNote(a.reviewNote);
                          }}
                          className={`w-full rounded-xl px-3 py-2 text-right text-[11px] ${
                            selectedAlert?.id === a.id ? "bg-teal-50 text-teal-800" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="font-medium">{name}</div>
                          <div className="text-[10px] text-slate-400">
                            {toFaDigits(a.activeSessionCount)} نشست · {REVIEW_FA[a.reviewStatus]}
                          </div>
                          <div className="mt-0.5 text-[9px] text-slate-400">
                            {toFaDigits(new Date(a.openedAt).toLocaleString("fa-IR"))}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  {!multiSessionAlerts.length && (
                    <li className="px-2 text-[11px] text-slate-400">هشدار چندسشنی نیست.</li>
                  )}
                </ul>
              </div>
              {selectedAlert ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h2 className="text-xs font-semibold text-slate-800">
                      دسترسی چندنشستی ·{" "}
                      {platform.users.find((u) => u.userId === selectedAlert.userId)?.fullName ??
                        `کاربر ${selectedAlert.userId}`}
                    </h2>
                    <p className="mt-1 text-[10px] text-slate-500">
                      یک حساب به {toFaDigits(selectedAlert.activeSessionCount)} نشست فعال روی دستگاه‌ها/سیستم‌های مختلف دسترسی دارد.
                    </p>
                    <ul className="mt-3 space-y-2">
                      {selectedAlertSessions.map((s) => (
                        <li key={s.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px]">
                          <div className="font-medium text-slate-800">{s.deviceLabel}</div>
                          <p className="text-[10px] text-slate-500">
                            {s.system} · {s.browser} · {SURFACE_FA[s.appSurface]} · {s.ipHint}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            آخرین فعالیت: {toFaDigits(new Date(s.lastSeenAt).toLocaleString("fa-IR"))}
                          </p>
                        </li>
                      ))}
                      {!selectedAlertSessions.length && (
                        <li className="text-[11px] text-slate-400">نشست فعالی باقی نمانده است.</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <label className="block text-[11px] text-slate-600">
                      یادداشت بازبینی
                      <textarea
                        value={sessionReviewNote}
                        onChange={(e) => setSessionReviewNote(e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px]"
                        placeholder="مثلاً ورود از دو شهر / دستگاه ناشناس / تأیید کاربر"
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void reviewMultiSession(selectedAlert, "cleared")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-[11px] font-medium text-white disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        بی‌خطر
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void reviewMultiSession(selectedAlert, "flagged")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700 disabled:opacity-50"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        پرچم مشکوک
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void revokeUserSessions(selectedAlert.userId)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-700 disabled:opacity-50"
                      >
                        قطع همه نشست‌ها
                      </button>
                      <span className="self-center text-[10px] text-slate-400">
                        وضعیت فعلی: {REVIEW_FA[selectedAlert.reviewStatus]}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-[11px] text-slate-400">
                  یک هشدار را از فهرست انتخاب کنید.
                </div>
              )}
            </div>
          )}

          {fraudTab === "camera" && (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="mb-2 px-1 text-[10px] font-medium text-slate-500">جلسات ضدتقلب دوربین</p>
            <ul className="space-y-1">
              {platform.fraudSessions.map((s) => {
                const name = fraudSessionDisplayName(s, platform.users);
                const pkg =
                  (s.packageId ? platform.packages.find((p) => p.id === s.packageId) : null) ??
                  platform.packages.find((p) => p.sessionId === s.id) ??
                  null;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSessionId(s.id);
                        setReviewNote(s.reviewNote);
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-right text-[11px] ${
                        selectedSession?.id === s.id ? "bg-teal-50 text-teal-800" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="font-medium">{name}</div>
                      <div className="text-[10px] text-slate-400">{REVIEW_FA[s.reviewStatus]}</div>
                      {pkg && (
                        <div className="mt-0.5 text-[9px] text-slate-400">
                          {pkg.label} · {formatRange(pkg.startedAt, pkg.endedAt)}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
              {!platform.fraudSessions.length && <li className="px-2 text-[11px] text-slate-400">جلسه‌ای نیست.</li>}
            </ul>
          </div>
          {selectedSession && (
            <div className="space-y-4">
              {(() => {
                const portrait = latestPortrait(reviewPhotos, selectedSession.patientId);
                const frames = sessionFrames(reviewPhotos, selectedSession.id);
                const name = fraudSessionDisplayName(selectedSession, platform.users);
                const pkg =
                  (selectedSession.packageId
                    ? platform.packages.find((p) => p.id === selectedSession.packageId)
                    : null) ??
                  platform.packages.find((p) => p.sessionId === selectedSession.id) ??
                  null;
                const user = resolveUserForFraudSession(selectedSession, platform.users);
                // اگر پکیج فیلتر ندهد، کل تاریخچهٔ GPS همان کاربر/پرونده را نشان بده
                const pkgGps =
                  user == null
                    ? []
                    : pkg
                      ? gpsInPackage(user.gpsHistory, pkg.id).length
                        ? gpsInPackage(user.gpsHistory, pkg.id)
                        : user.gpsHistory
                      : user.gpsHistory;
                const pkgPhotos = pkg ? photosInPackage(reviewPhotos, pkg.id) : [];
                return (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h2 className="text-xs font-semibold text-slate-800">مقایسه هویت · {name}</h2>
                      <p className="mt-1 text-[10px] text-slate-500">
                        عکس آخر کاربر در برابر فریم‌های خودکار هر {toFaDigits(platform.settings.fraudAutoCaptureSeconds)} ثانیه هنگام روشن بودن دوربین.
                      </p>
                      {pkg && (
                        <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
                          <span className="font-medium text-slate-800">پکیج شواهد:</span> {pkg.label}
                          {" · "}
                          {formatRange(pkg.startedAt, pkg.endedAt)}
                          {" · "}
                          {toFaDigits(pkgPhotos.length)} عکس · {toFaDigits(pkgGps.length)} GPS
                        </div>
                      )}
                      {lazyPhotosBusy && (
                        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Loader2 className="h-3 w-3 animate-spin" /> در حال بارگذاری فریم‌ها…
                        </p>
                      )}
                      <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
                        <figure className="rounded-xl border border-teal-200 bg-teal-50/40 p-2">
                          <p className="mb-1 text-center text-[10px] font-medium text-teal-800">عکس آخر کاربر</p>
                          {portrait ? (
                            <LazyPhotoImg
                              photo={portrait}
                              alt="پرتره"
                              className="mx-auto aspect-[3/4] w-full max-w-[160px] rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-white text-[10px] text-slate-400">بدون پرتره</div>
                          )}
                          {portrait && (
                            <p className="mt-1 text-center text-[9px] text-slate-500">
                              ثبت: {new Date(portrait.capturedAt).toLocaleString("fa-IR")}
                            </p>
                          )}
                        </figure>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {frames.map((f, idx) => (
                            <figure key={f.id} className="rounded-xl border border-slate-100 bg-slate-50 p-1.5">
                              <LazyPhotoImg
                                photo={f}
                                alt={`فریم ${idx + 1}`}
                                className="aspect-[3/4] w-full rounded-lg object-cover"
                              />
                              <figcaption className="mt-1 text-center text-[9px] text-slate-500">
                                فریم {toFaDigits(idx + 1)} · {new Date(f.capturedAt).toLocaleTimeString("fa-IR")}
                                {f.gps ? (
                                  <>
                                    <br />
                                    <button
                                      type="button"
                                      onClick={() => openGpsMap(f.gps!, `فریم ضدتقلب ${idx + 1}`)}
                                      className="text-teal-700 underline-offset-2 hover:underline"
                                    >
                                      GPS {toFaDigits(f.gps.lat.toFixed(3))}
                                    </button>
                                  </>
                                ) : null}
                              </figcaption>
                            </figure>
                          ))}
                          {!frames.length && !lazyPhotosBusy && (
                            <p className="col-span-full text-[11px] text-slate-400">فریم خودکاری ثبت نشده.</p>
                          )}
                        </div>
                      </div>
                      {pkgGps.length > 0 && (
                        <ul className="mt-4 space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[10px] text-slate-600">
                          <li className="mb-1 font-medium text-slate-800">مسیر GPS همین پکیج · کلیک برای نقشه</li>
                          {pkgGps.map((g, i) => (
                            <li key={`fraud-gps-${i}`}>
                              <button
                                type="button"
                                onClick={() => openGpsMap(g, pkg?.label ?? "مسیر ضدتقلب")}
                                className="w-full rounded-lg px-1.5 py-1 text-right transition hover:bg-white hover:text-teal-900"
                              >
                                <MapPin className="ml-1 inline h-3 w-3 text-teal-700" />
                                {toFaDigits(g.lat.toFixed(5))} ، {toFaDigits(g.lon.toFixed(5))} ·{" "}
                                {new Date(g.capturedAt).toLocaleString("fa-IR")}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <label className="block text-[11px] text-slate-600">
                        یادداشت بازبینی
                        <textarea
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          rows={2}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px]"
                          placeholder="مثلاً چهره با پرتره هم‌خوان است / مشکوک به تعویض نفر"
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void reviewSession(selectedSession, "cleared")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-[11px] font-medium text-white disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          تأیید هویت
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void reviewSession(selectedSession, "flagged")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700 disabled:opacity-50"
                        >
                          <Flag className="h-3.5 w-3.5" />
                          پرچم مشکوک
                        </button>
                        <span className="self-center text-[10px] text-slate-400">وضعیت فعلی: {REVIEW_FA[selectedSession.reviewStatus]}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
          )}

          {fraudTab === "vault" && !isClinicScope && (
            <VaultFilesPanel
              trash={vaultTrash}
              rows={vaultRows}
              selected={vaultSelected}
              busy={vaultBusy || Boolean(busy)}
              error={vaultError}
              onTrashChange={(t) => {
                setVaultTrash(t);
                setVaultSelected(new Set());
              }}
              onReload={async () => {
                setVaultBusy(true);
                setVaultError("");
                try {
                  const rows = await listVaultFiles(vaultTrash, 100);
                  setVaultRows(rows);
                  setVaultSelected(new Set());
                } catch (err) {
                  setVaultError(err instanceof Error ? err.message : "بارگذاری خزانه ناموفق بود.");
                } finally {
                  setVaultBusy(false);
                }
              }}
              onToggle={(id) => {
                setVaultSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              onSelectAll={() => setVaultSelected(new Set(vaultRows.map((r) => r.id)))}
              onSelectNone={() => setVaultSelected(new Set())}
              onInvert={() =>
                setVaultSelected((prev) => {
                  const next = new Set<string>();
                  for (const r of vaultRows) if (!prev.has(r.id)) next.add(r.id);
                  return next;
                })
              }
              onSoftDelete={async () => {
                const docs = vaultRows.filter((r) => vaultSelected.has(r.id) && r.kind === "document").map((r) => r.id);
                const photos = vaultRows.filter((r) => vaultSelected.has(r.id) && r.kind !== "document").map((r) => r.id);
                if (!docs.length && !photos.length) return;
                setVaultBusy(true);
                setVaultError("");
                try {
                  await softDeleteVaultFiles(docs, photos);
                  const rows = await listVaultFiles(vaultTrash, 100);
                  setVaultRows(rows);
                  setVaultSelected(new Set());
                } catch (err) {
                  setVaultError(err instanceof Error ? err.message : "حذف منطقی ناموفق بود.");
                } finally {
                  setVaultBusy(false);
                }
              }}
              onHardDelete={async () => {
                const docs = vaultRows.filter((r) => vaultSelected.has(r.id) && r.kind === "document").map((r) => r.id);
                const photos = vaultRows.filter((r) => vaultSelected.has(r.id) && r.kind !== "document").map((r) => r.id);
                if (!docs.length && !photos.length) return;
                if (!window.confirm(`حذف فیزیکی ${toFaDigits(docs.length + photos.length)} فایل؟ این عمل برگشت‌پذیر نیست.`)) return;
                setVaultBusy(true);
                setVaultError("");
                try {
                  await hardDeleteVaultFiles(docs, photos);
                  const rows = await listVaultFiles(vaultTrash, 100);
                  setVaultRows(rows);
                  setVaultSelected(new Set());
                } catch (err) {
                  setVaultError(err instanceof Error ? err.message : "حذف فیزیکی ناموفق بود.");
                } finally {
                  setVaultBusy(false);
                }
              }}
            />
          )}
        </div>
      )}

      {section === "health" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {platform.health.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500">{m.label}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] ${
                    m.status === "ok" ? "bg-teal-50 text-teal-700" : m.status === "warn" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {m.status === "ok" ? "سالم" : m.status === "warn" ? "هشدار" : "بحرانی"}
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {toFaDigits(m.value)} <span className="text-xs font-normal text-slate-400">{m.unit}</span>
              </p>
              <div className="mt-3 flex h-8 items-end gap-0.5">
                {m.sparkline.map((v, i) => {
                  const max = Math.max(...m.sparkline, 1);
                  return <div key={i} className="flex-1 rounded-sm bg-teal-600/70" style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {section === "settings" && (
        <div className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Settings2 className="h-4 w-4 text-teal-700" />
            تنظیمات پایه
          </div>
          {(
            [
              ["brandName", "نام برند", "text"],
              ["supportPhone", "تلفن پشتیبانی", "text"],
              ["smsSenderId", "شناسه فرستنده پیامک", "text"],
              ["otpLength", "طول OTP", "number"],
              ["otpTtlSeconds", "TTL OTP (ثانیه)", "number"],
              ["fraudAutoCaptureSeconds", "بازه عکس ضدتقلب (ثانیه)", "number"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="block text-[11px] text-slate-600">
              {label}
              <input
                type={type}
                value={String(settingsDraft[key])}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    [key]: type === "number" ? Number(e.target.value) : e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px]"
              />
            </label>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(settingsDraft.featureFlags) as (keyof PlatformSettings["featureFlags"])[])
              .filter((flag) => flag !== "multiClinicRegistry")
              .map((flag) => (
              <label key={flag} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={settingsDraft.featureFlags[flag]}
                  onChange={(e) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      featureFlags: { ...prev.featureFlags, [flag]: e.target.checked, multiClinicRegistry: false },
                    }))
                  }
                />
                {FLAG_LABELS[flag] ?? flag}
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveSettings()}
            className="rounded-xl bg-teal-700 px-4 py-2.5 text-[11px] font-medium text-white disabled:opacity-50"
          >
            ذخیره تنظیمات
          </button>

          {userScope === "full" && (
            <div className="mt-8 space-y-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
                <ShieldAlert className="h-4 w-4" />
                منطقه خطر — ریست فکتوری
              </div>
              <p className="text-[11px] leading-5 text-rose-700/90">
                همهٔ داده‌های دیتابیس و فایل‌های آپلود پاک می‌شوند و seed اولیه دوباره اعمال می‌گردد.
                تأیید با OTP روی موبایل ادمین کل نشست فعلی الزامی است؛ پس از موفقیت باید دوباره وارد شوید.
              </p>
              <button
                type="button"
                disabled={busy || factoryBusy}
                onClick={() => {
                  void (async () => {
                    setFactoryBusy(true);
                    try {
                      const res = (await onAction({
                        action: "PLATFORM_FACTORY_RESET_REQUEST_OTP",
                      })) as { demoCode?: string | null };
                      setFactoryDemoCode(res?.demoCode ?? null);
                      if (res?.demoCode) setFactoryOtp(String(res.demoCode));
                    } finally {
                      setFactoryBusy(false);
                    }
                  })();
                }}
                className="rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-[11px] font-medium text-rose-700 disabled:opacity-50"
              >
                {factoryBusy ? "در حال ارسال…" : "درخواست کد تأیید OTP"}
              </button>
              {factoryDemoCode && (
                <p className="text-[11px] text-rose-600" dir="ltr">
                  demo OTP: {factoryDemoCode}
                </p>
              )}
              <label className="block text-[11px] text-rose-800">
                کد تأیید
                <AppInput
                  type="tel"
                  inputMode="numeric"
                  value={factoryOtp}
                  onChange={(e) => setFactoryOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-left font-mono text-[11px]"
                  placeholder="کد پیامک"
                />
              </label>
              <button
                type="button"
                disabled={busy || factoryBusy || factoryOtp.trim().length < 4}
                onClick={() => {
                  if (
                    !window.confirm(
                      "آیا مطمئنید؟ این عمل غیرقابل بازگشت است و همهٔ داده‌ها پاک می‌شوند.",
                    )
                  ) {
                    return;
                  }
                  void (async () => {
                    setFactoryBusy(true);
                    try {
                      await onAction({
                        action: "PLATFORM_FACTORY_RESET_CONFIRM",
                        code: factoryOtp.trim(),
                      });
                    } finally {
                      setFactoryBusy(false);
                    }
                  })();
                }}
                className="rounded-xl bg-rose-700 px-4 py-2.5 text-[11px] font-medium text-white disabled:opacity-50"
              >
                تأیید نهایی و ریست فکتوری
              </button>
            </div>
          )}
        </div>
      )}

      {section === "integrations" && (
        <div className="grid gap-3 md:grid-cols-2">
          {platform.integrations.map((item) => {
            if (item.id === "osm-maps") {
              const osm = platform.settings.osmLocal ?? DEFAULT_OSM_LOCAL;
              return (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <MapPin className="h-3.5 w-3.5 text-teal-700" />
                        {item.name}
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        Base URL استک محلی OSM (دانلود PBF ایران → Nominatim / OSRM / تایل روی همین ریشه).
                        مسیرها: <span dir="ltr" className="font-mono text-[10px]">/search</span>،{" "}
                        <span dir="ltr" className="font-mono text-[10px]">/route/v1/...</span>،{" "}
                        <span dir="ltr" className="font-mono text-[10px]">/tile/{"{z}/{x}/{y}"}.png</span>
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] ${
                        osm.active
                          ? osm.osrmOk && osm.tileOk
                            ? "bg-teal-50 text-teal-700"
                            : "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {osm.active ? "محلی فعال" : "سایت عمومی OSM"}
                    </span>
                  </div>

                  <label className="app-label mt-4 block text-[11px]">
                    Base URL سرویس محلی
                    <AppInput
                      dir="ltr"
                      value={osmBaseDraft}
                      onChange={(e) => setOsmBaseDraft(e.target.value)}
                      placeholder="http://127.0.0.1:8080"
                      className="app-input mt-1.5 font-mono text-left text-xs"
                    />
                  </label>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || osmTesting}
                      onClick={() => void saveOsmLocal()}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-700 disabled:opacity-50"
                    >
                      ذخیره
                    </button>
                    <button
                      type="button"
                      disabled={busy || osmTesting || !osmBaseDraft.trim()}
                      onClick={() => void testOsmLocal()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-[11px] font-medium text-white disabled:opacity-50"
                    >
                      {osmTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      تست اتصال
                    </button>
                  </div>

                  {osmFlash && (
                    <p
                      role="status"
                      className={`mt-3 rounded-xl border p-2.5 text-[11px] ${
                        osmFlash.error
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-teal-200 bg-teal-50 text-teal-800"
                      }`}
                    >
                      {osmFlash.text}
                    </p>
                  )}

                  <div className="mt-3 grid gap-1.5 text-[10px] text-slate-500 sm:grid-cols-3">
                    <span>Nominatim: {osm.nominatimOk ? "✓" : "—"}</span>
                    <span>OSRM: {osm.osrmOk ? "✓" : "—"}</span>
                    <span>تایل: {osm.tileOk ? "✓" : "—"}</span>
                  </div>
                  {osm.lastTestedAt && (
                    <p className="mt-2 text-[10px] text-slate-400">
                      آخرین تست: {new Date(osm.lastTestedAt).toLocaleString("fa-IR")}
                      {osm.lastError ? ` · ${osm.lastError}` : ""}
                    </p>
                  )}
                </div>
              );
            }

            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <Plug className="h-3.5 w-3.5 text-teal-700" />
                      {item.name}
                    </div>
                    <p className="mt-1 break-all text-[10px] text-slate-400">{item.endpoint}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] ${
                      item.status === "connected"
                        ? "bg-teal-50 text-teal-700"
                        : item.status === "degraded"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {item.status === "connected" ? "متصل" : item.status === "degraded" ? "افت کیفیت" : "قطع"}
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-slate-600">{item.notes}</p>
                <p className="mt-2 text-[10px] text-slate-400">
                  کلید: {item.apiKeyMasked}
                  {item.lastSyncAt ? ` · آخرین sync ${new Date(item.lastSyncAt).toLocaleString("fa-IR")}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {section === "audit" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-800">
            <ScrollText className="h-4 w-4 text-teal-700" />
            لاگ ممیزی پلتفرم
          </div>
          <ul className="divide-y divide-slate-100">
            {platform.audit.map((a) => (
              <li key={a.id} className="px-4 py-3 text-[11px]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-800">{a.action}</span>
                  <span className="text-[10px] text-slate-400">{new Date(a.at).toLocaleString("fa-IR")}</span>
                </div>
                <p className="mt-0.5 text-slate-600">
                  {a.actor} → {a.target}
                </p>
                <p className="text-[10px] text-slate-400">{a.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mapPoint && <GpsMapPopup point={mapPoint} onClose={() => setMapPoint(null)} />}
    </div>
  );
}

function VaultFilesPanel(props: {
  trash: boolean;
  rows: ApiVaultFileDto[];
  selected: Set<string>;
  busy: boolean;
  error: string;
  onTrashChange: (trash: boolean) => void;
  onReload: () => void | Promise<void>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onInvert: () => void;
  onSoftDelete: () => void | Promise<void>;
  onHardDelete: () => void | Promise<void>;
}) {
  const {
    trash,
    rows,
    selected,
    busy,
    error,
    onTrashChange,
    onReload,
    onToggle,
    onSelectAll,
    onSelectNone,
    onInvert,
    onSoftDelete,
    onHardDelete,
  } = props;
  const selectedCount = selected.size;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold text-slate-800">خزانه فایل شواهد</h2>
          <p className="mt-0.5 text-[10px] text-slate-500">
            مسیر دیسک <span className="font-mono">yyyy/NNN/…</span> · فقط ادمین کل
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onTrashChange(false)}
            className={`rounded-xl px-3 py-1.5 text-[11px] ${!trash ? "bg-teal-700 text-white" : "border border-slate-200 text-slate-600"}`}
          >
            فعال
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onTrashChange(true)}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] ${trash ? "bg-amber-700 text-white" : "border border-slate-200 text-slate-600"}`}
          >
            <Trash2 className="h-3 w-3" />
            سطل زباله
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onReload()}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600 disabled:opacity-50"
          >
            {busy ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "بروزرسانی"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={busy || !rows.length} onClick={onSelectAll} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] text-slate-600 disabled:opacity-50">
          انتخاب همه
        </button>
        <button type="button" disabled={busy || !selectedCount} onClick={onSelectNone} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] text-slate-600 disabled:opacity-50">
          هیچ‌کدام
        </button>
        <button type="button" disabled={busy || !rows.length} onClick={onInvert} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] text-slate-600 disabled:opacity-50">
          معکوس
        </button>
        <span className="self-center text-[10px] text-slate-400">
          {toFaDigits(selectedCount)} از {toFaDigits(rows.length)} انتخاب
        </span>
        <div className="ms-auto flex flex-wrap gap-1.5">
          {!trash && (
            <button
              type="button"
              disabled={busy || !selectedCount}
              onClick={() => void onSoftDelete()}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800 disabled:opacity-50"
            >
              حذف منطقی
            </button>
          )}
          <button
            type="button"
            disabled={busy || !selectedCount}
            onClick={() => void onHardDelete()}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-700 disabled:opacity-50"
          >
            حذف فیزیکی
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</p>}

      {busy && !rows.length ? (
        <div className="flex justify-center rounded-xl border border-slate-100 px-3 py-8 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <VaultFileThumbGrid
          rows={rows}
          selected={selected}
          busy={busy}
          onToggle={onToggle}
          emptyLabel={trash ? "سطل زباله خالی است." : "فایل فعالی در خزانه نیست."}
        />
      )}
    </div>
  );
}
