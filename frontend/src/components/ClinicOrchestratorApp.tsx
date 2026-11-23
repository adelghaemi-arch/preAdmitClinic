/*
 File: frontend/src/components/ClinicOrchestratorApp.tsx
 Description: ارکستراتور کلینیک — نشست پیش‌پذیرش Owner، آواتار پرترهٔ بیضی در تاپ‌بار
 Parent Dependencies: lib/api/*, CorporateContractsHub, workspace, owner-intake-gate, usePatientPortraitUrl
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AppInput } from "@/components/AppInput";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeft,
  Bell,
  BellRing,
  BookOpen,
  Building2,
  CalendarCheck,
  ChartNoAxesCombined,
  MessageSquareText,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Compass,
  FileHeart,
  FileText,
  FlaskConical,
  GitBranch,
  Hospital,
  LayoutDashboard,
  Link2,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  Upload,
  UserPlus,
  UserRound,
  Users,
  Workflow,
  X,
  MapPinned,
  Plug,
  ScrollText,
  Server,
  Settings2,
} from "lucide-react";
import { PlatformAdminPanel, type PlatformSection } from "./PlatformAdminPanel";
import type {
  AppUserDto,
  ClinicSnapshot,
  FormResponse,
  IntakeDocumentType,
  PatientIntakeDocumentGroup,
  WorkspaceRole,
} from "@/types/clinic";
import {
  allowedPagesFor,
  COMPANION_FEATURE_ENABLED,
  COMPANION_FEATURE_PAGES,
  initials,
  labelFor,
  PAGE_TITLES,
  permissionLabel,
  relationLabel,
  roleNavFor,
  ROLES,
  selectableRoles,
  shortLabelFor,
  type AppPage,
} from "@/lib/workspace";
import { filterNavPagesForGate, resolveGatedPage, shouldGateOwner } from "@/lib/owner-intake-gate";
import {
  ageFromBirthIso,
  isValidIranMobile,
  isValidIranNationalId,
  normalizeMobile,
} from "@/lib/person-identity";
import { mapOwnerSnapshotToPatient, selfLinkForOwner } from "@/lib/owner-patient-map";
import {
  fetchOwnerIntakeSnapshot,
  fetchPatientChart,
  lookupPatientByNationalId,
  postPatientPortrait,
  searchPatients,
  uploadFileBlob,
} from "@/lib/api/patients";
import { fetchSpecialistFormResponse } from "@/lib/api/forms";
import {
  mapApiPatientToDirectoryRow,
  mergeSpecialistChart,
} from "@/lib/specialist-patient-map";
import { toFaDigits } from "@/lib/persian";
import { OwnerProfileForm } from "@/components/OwnerProfileForm";
import { usePatientPortraitUrl } from "@/hooks/usePatientPortraitUrl";
import { ClinicDashboard } from "./ClinicDashboard";
import { CompanionHome } from "./CompanionHome";
import { CompanionLinks } from "./CompanionLinks";
import { JourneyIntroPage } from "./JourneyIntroPage";
import { PatientPrivacySettings } from "./PatientPrivacySettings";
import { CycleReport } from "./CycleReport";
import { PatientRegistry } from "./PatientRegistry";
import { PatientWorkspace } from "./PatientWorkspace";
import { PatientMobileProfile } from "./PatientMobileProfile";
import { ReceptionProfile } from "./ReceptionProfile";
import { SpecialistProfile } from "./SpecialistProfile";
import { ParaclinicProfile } from "./ParaclinicProfile";
import { AdminProfile } from "./AdminProfile";
import { CorporateContractsHub } from "./CorporateContractsHub";
import { CorporateSupervisorPanel } from "./CorporateSupervisorPanel";
import { AdminRuleLibrary } from "./AdminRuleLibrary";
import { ClinicSettingsPanel } from "./ClinicSettingsPanel";
import { setRequestRole } from "@/lib/role-context";
import { ActiveSessionsPanel } from "@/components/ActiveSessionsPanel";
import { signOut } from "@/lib/auth";
import { loadWorkspaceSnapshot } from "@/lib/api/workspace";
import {
  createPathway,
  deletePathway,
  updatePathway,
  type UpsertPathwayBody,
} from "@/lib/api/pathways";
import {
  addEvidenceDocumentFiles,
  captureFraudFrame,
  createEvidenceDocumentGroup,
  endFraudSession,
  fetchMappedIntakeDocuments,
  listPatientDocuments,
  recordGpsPoint,
  removeEvidenceDocumentFile,
  removeEvidenceDocumentGroup,
  reviewFraudSession,
  startFraudSession,
  uploadDataUrlAsFile,
  uploadOpaqueFraudFrame,
} from "@/lib/api/evidence";
import { intakeDocumentLabelFa, isIntakeDocumentType } from "@/lib/intake-documents";
import { updateCurrentClinic } from "@/lib/api/clinics";
import {
  createClinicStation,
  setClinicStationActive,
  updateClinicStation,
} from "@/lib/api/clinic-stations";
import { apiFetch } from "@/lib/api/http";
import { hasApiRole } from "@/lib/api/roles";
import { draftsToUpsertStations, stationCodesToDrafts, type PathwayStationDraft } from "@/lib/pathway-stations";
import { allowedRolesFor, writeStoredRole } from "@/lib/viewer";
import { configureOsmFromSettings } from "@/lib/osm-routing";
import { stopOwnerGpsWatch } from "@/lib/owner-gps-watch";
import { normalizePersianLetters } from "@/lib/persian";

interface Props {
  initialSnapshot: ClinicSnapshot;
  user: AppUserDto;
  isDemoSession?: boolean;
  initialRole?: WorkspaceRole;
  initialPage?: AppPage;
  initialPatientId?: number;
}

const PAGE_ICONS: Record<AppPage, LucideIcon> = {
  dashboard: LayoutDashboard,
  patients: Users,
  admission: UserPlus,
  flow: Activity,
  queues: SlidersHorizontal,
  alerts: BellRing,
  clinical: Stethoscope,
  "clinical-notes": ClipboardList,
  "clinical-complete": CheckCheck,
  diagnostics: FlaskConical,
  "diagnostics-tracker": ListChecks,
  "diagnostics-upload": Upload,
  records: FileHeart,
  "journey-intro": Workflow,
  "companion-intake": ClipboardList,
  "companion-map": Compass,
  "companion-records": FileText,
  "companion-links": Link2,
  "patient-privacy": ShieldCheck,
  contracts: Building2,
  "contract-packages": BookOpen,
  "contract-schedule": CalendarCheck,
  "contract-funnel": MessageSquareText,
  "rule-library": BookOpen,
  "clinic-settings": Hospital,
  "supervisor-roster": Users,
  reports: ChartNoAxesCombined,
  pathways: GitBranch,
  rooms: Hospital,
  team: ShieldCheck,
  "clinic-users": Users,
  forms: ClipboardList,
  "platform-dashboard": LayoutDashboard,
  "platform-users": MapPinned,
  "platform-fraud": ShieldAlert,
  "platform-health": Server,
  "platform-settings": Settings2,
  "platform-integrations": Plug,
  "platform-audit": ScrollText,
};

export function ClinicOrchestratorApp({ initialSnapshot, user: initialUser, initialRole = "owner", initialPage = "dashboard", initialPatientId }: Props) {
  const navigateTo = useNavigate();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [user, setUser] = useState(initialUser);
  const [role, setRole] = useState<WorkspaceRole>(initialRole);
  const [page, setPage] = useState<AppPage>(initialPage);
  // از هاب قرارداد: باز کردن رستر همان قرارداد در پنل ناظر
  const [supervisorFocusContractId, setSupervisorFocusContractId] = useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(initialPatientId ?? initialSnapshot.patients[0]?.id ?? 0);
  const [busy, setBusy] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(initialUser.fullName);
  const [profileTitle, setProfileTitle] = useState(initialUser.jobTitle);
  const [listQuery] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [recordTip, setRecordTip] = useState<string | null>(null);
  // فقط حافظهٔ نشست — رفرش/بستن دوباره خانهٔ مسیر را نشان می‌دهد
  const [preAdmitOpen, setPreAdmitOpen] = useState(false);
  const hydrated = useRef(false);
  const lastRecordTipKey = useRef<string | null>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  // HomePage قبلاً loadWorkspaceSnapshot کرده؛ دوباره کامل hydrate نکن (جلوگیری از ۲× fraud/GPS)
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (initialRole !== "owner" && role !== "owner") return;
    void (async () => {
      try {
        const ownerSnap = await fetchOwnerIntakeSnapshot();
        const mapped = mapOwnerSnapshotToPatient(ownerSnap);
        // مدارک پیش‌پذیرش جدا از snapshot؛ برای ادامه بعد از رفرش
        if (mapped.serverId) {
          try {
            mapped.intakeDocuments = await fetchMappedIntakeDocuments(mapped.serverId);
          } catch {
            mapped.intakeDocuments = [];
          }
        }
        const link = selfLinkForOwner(user.id, mapped.id);
        const base = snapshotRef.current;
        setSnapshot({
          ...base,
          patients: [mapped],
          links: [link, ...base.links.filter((l) => l.patientId !== mapped.id)],
        });
        setSelectedPatientId(mapped.id);
      } catch {
        /* Owner بدون پرونده هنوز */
      }
    })();
  }, []);

  // Keep this tab's role on every clinic request (see lib/role-context).
  useEffect(() => { setRequestRole(role); }, [role]);

  // Point OSM helpers at local stack when platform admin has activated it.
  useEffect(() => {
    configureOsmFromSettings(snapshot.platform?.settings);
  }, [snapshot.platform?.settings]);

  const navConfig = roleNavFor(role);
  const switchableRoles = selectableRoles().filter((r) => allowedRolesFor(user).includes(r.id));
  // دراپ‌داون فقط وقتی بیش از یک نقش مجاز است؛ تک‌نقش نیازی به سوئیچر ندارد
  const canSwitchRole = switchableRoles.length > 1;
  const activeRole = selectableRoles().find((r) => r.id === role) ?? selectableRoles()[0] ?? ROLES[0];
  const activePatient = snapshot.patients.find((p) => p.id === selectedPatientId) ?? snapshot.patients[0];
  const activeId = activePatient?.id ?? 0;
  const activeLink = snapshot.links.find((l) => l.patientId === activeId && l.userId === user.id);
  // آواتار تاپ‌بار: پرترهٔ پروندهٔ Owner (همان قاب بیضی) به‌جای حروف اول
  const topbarPortrait = usePatientPortraitUrl(role === "owner" ? activePatient : null);
  const topbarAvatarUrl = topbarPortrait.url;
  const gateArgs = {
    role,
    link: activeLink,
    patient: activePatient,
    intakeGate: activePatient?.intakeGate ?? null,
  };
  const ownerGated = shouldGateOwner(gateArgs);
  const roleAllowsPage = (p: AppPage) => p === "journey-intro" || allowedPagesFor(role).includes(p);
  const requestedPage: AppPage = roleAllowsPage(page) ? page : navConfig.home;
  const current: AppPage = resolveGatedPage(requestedPage, gateArgs);
  const isSelf = role === "owner";
  const canManage = (patientId: number) => snapshot.links.find((l) => l.patientId === patientId && l.userId === user.id)?.permission !== "follow";
  const unread = snapshot.patients.flatMap((p) => p.alerts.filter((a) => !a.isRead).map((a) => ({ ...a, patient: p.fullName })));
  const date = new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Tehran" }).format(new Date(snapshot.serverTime));
  const companionTab = current === "companion-intake" ? "intake" : current === "companion-map" ? "wayfinding" : "emr";
  // روی پیش‌پذیرش مسیر/هیرو نباشد؛ با preAdmitOpen تب‌های دیگر هم قفل می‌مانند
  const lockNonIntakeTabs = isSelf && (preAdmitOpen || current === "companion-intake" || ownerGated);

  const navigate = useCallback(
    (next: AppPage, patientId?: number) => {
      const pid = patientId ?? selectedPatientId;
      const patient = snapshot.patients.find((p) => p.id === pid) ?? snapshot.patients[0];
      const link = snapshot.links.find((l) => l.patientId === (patient?.id ?? 0) && l.userId === user.id);
      const coerced = resolveGatedPage(next, {
        role,
        link,
        patient,
        intakeGate: patient?.intakeGate ?? null,
      });
      setPage(coerced);
      if (patientId) setSelectedPatientId(patientId);
      setMobileMenu(false);
      setAccountOpen(false);
      setNotificationsOpen(false);
      const params = new URLSearchParams({ view: coerced });
      if (pid) params.set("patient", String(pid));
      window.history.pushState(null, "", `/?${params}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [selectedPatientId, snapshot.patients, snapshot.links, user.id, role]
  );

  const openPatient = (id: number) => navigate(role === "patient" || role === "owner" ? "dashboard" : "records", id);

  useEffect(() => {
    if (page === current) return;
    setPage(current);
    const params = new URLSearchParams({ view: current });
    if (activeId) params.set("patient", String(activeId));
    window.history.replaceState(null, "", `/?${params}`);
  }, [current, page, activeId]);

  useEffect(() => {
    const back = () => {
      const q = new URLSearchParams(window.location.search);
      const target = (q.get("view") as AppPage) || "dashboard";
      const pid = q.get("patient") ? Number(q.get("patient")) : selectedPatientId;
      if (q.get("patient")) setSelectedPatientId(pid);
      const patient = snapshot.patients.find((p) => p.id === pid) ?? snapshot.patients[0];
      const link = snapshot.links.find((l) => l.patientId === (patient?.id ?? 0) && l.userId === user.id);
      setPage(
        resolveGatedPage(target, {
          role,
          link,
          patient,
          intakeGate: patient?.intakeGate ?? null,
        })
      );
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [selectedPatientId, snapshot.patients, snapshot.links, user.id, role]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!recordTip) return;
    const timer = setTimeout(() => setRecordTip(null), 4500);
    return () => clearTimeout(timer);
  }, [recordTip]);

  useEffect(() => {
    const onCompanion = ["companion-intake", "companion-map", "companion-records"].includes(current);
    if (!onCompanion || !activePatient || !activeLink) return;
    const key = String(activePatient.id);
    if (lastRecordTipKey.current === key) return;
    lastRecordTipKey.current = key;
    setRecordTip(
      `پرونده فعال: ${activePatient.fullName} · ${relationLabel(activeLink.relationship)} · ${permissionLabel(activeLink.permission)}`
    );
  }, [current, activePatient, activeLink]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".popover-container")) {
        setRoleOpen(false);
        setAccountOpen(false);
        setNotificationsOpen(false);
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRoleOpen(false);
        setAccountOpen(false);
        setNotificationsOpen(false);
        setHelpOpen(false);
        setProfileOpen(false);
        setMobileMenu(false);
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", key);
    };
  }, []);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setBusy(true);
    try {
      setSnapshot(await loadWorkspaceSnapshot());
    } catch (e) {
      if (!silent) setToast({ text: e instanceof Error ? e.message : "بارگذاری داده ممکن نشد.", error: true });
    } finally {
      if (!silent) setBusy(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && false) void refresh(true);
    }, 20000);
    return () => clearInterval(timer);
  }, [refresh]);

  const execute = useCallback(async (payload: Record<string, unknown>) => {
    const action = String(payload.action ?? "");
    const quiet = payload.silent === true;
    // silent مانع busy است؛ notifyError اجازه می‌دهد نقطهٔ اول GPS بدون قفل UI toast خطا بگیرد
    const notifyError = payload.notifyError === true;
    const blockUi = !quiet;
    if (blockUi) setBusy(true);
    try {
      // سوئیچ UI نقش ≠ JWT؛ mutate ادمین کلینیک نیاز به Admin یا Platform در nabz_api_roles دارد
      const adminClinicMutations = new Set([
        "CREATE_CONTRACT",
        "UPDATE_CONTRACT",
        "SET_CONTRACT_STATUS",
        "IMPORT_CONTRACT_MEMBERS",
        "UPDATE_CONTRACT_SUPERVISOR",
        "UPDATE_CONTRACT_MEMBER",
        "DELETE_CONTRACT_MEMBER",
        "OVERRIDE_MEMBER_PATHWAY",
        "ADMIT_CONTRACT_MEMBER_TO_CLINIC",
        "SAVE_CONTRACT_PATHWAY_RULES",
        "PREVIEW_PATHWAY_RECHECK",
        "APPLY_PATHWAY_RECHECK",
        "ATTACH_PATHWAY_LIBRARY",
        "DETACH_CONTRACT_PATHWAY",
        "UPDATE_PATIENT_DETAILS",
        "UPDATE_PATIENT_PROFILE",
        "UPSERT_PATHWAY_LIBRARY_ITEM",
        "DELETE_PATHWAY_LIBRARY_ITEM",
        "UPDATE_CLINIC_PROFILE",
        "SET_CLINIC_LOGO",
        "SET_CONTRACT_PARTNER_LOGO",
        // کاتالوگ ایستگاه کلینیک (UC-ADM-25)
        "UPDATE_ROOM_CONFIG",
        "CREATE_CLINIC_STATION",
        "SET_CLINIC_STATION_ACTIVE",
      ]);
      if (adminClinicMutations.has(action) && !hasApiRole("Admin", "Platform")) {
        throw new Error(
          "این عملیات به نقش ادمین کلینیک یا ادمین کل در نشست فعلی نیاز دارد؛ سوئیچ نمایش نقش کافی نیست."
        );
      }

      // مسیرهای وصل‌شده به API؛ بقیه تا موج D خطا می‌دهند (بدون mock)
      if (action === "PLATFORM_UPSERT_USER") {
        const roleMap: Record<string, string> = {
          platform: "Platform",
          clinic_admin: "Admin",
          staff: "Specialist",
          patient: "Owner",
          supervisor: "Supervisor",
        };
        const primaryRole = roleMap[String(payload.primaryRole ?? "patient")] ?? "Owner";
        const rawName = String(payload.fullName ?? "").trim();
        const firstName = String(payload.firstName ?? "").trim() || rawName.split(/\s+/)[0] || "";
        const lastName =
          String(payload.lastName ?? "").trim() || rawName.split(/\s+/).slice(1).join(" ") || "";
        const clinicId = payload.clinicId ? String(payload.clinicId) : null;
        // ناظر باید به قرارداد مشخص لینک شود؛ بقیه نقش‌ها contractId ندارند
        const contractId =
          primaryRole === "Supervisor" && payload.contractId
            ? String(payload.contractId)
            : null;
        await apiFetch("/api/users", {
          method: "POST",
          body: {
            userId: payload.serverUserId ?? null,
            firstName,
            lastName,
            mobile: normalizeMobile(String(payload.phone ?? "")),
            nationalId: payload.nationalId ?? null,
            primaryRole,
            clinicId,
            contractId,
          },
        });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "کاربر در سرور ذخیره شد." });
        return { ok: true, snapshot: snap };
      }
      if (action === "IMPORT_CONTRACT_MEMBERS") {
        const serverId = String(payload.contractServerId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور قرارداد یافت نشد؛ صفحه را تازه کنید.");
        const membersRaw = Array.isArray(payload.members) ? payload.members : [];
        const body = membersRaw.map((m) => {
          const row = m as Record<string, unknown>;
          return {
            firstName: String(row.firstName ?? "").trim(),
            lastName: String(row.lastName ?? "").trim(),
            nationalId: String(row.nationalId ?? "").trim(),
            phone: normalizeMobile(String(row.phone ?? "")),
            birthDate: String(row.birthDate ?? row.birthDateIso ?? "").slice(0, 10),
            gender: String(row.gender ?? "").trim(),
            maritalStatus: row.maritalStatus ? String(row.maritalStatus).trim() : null,
            department: row.department ? String(row.department).trim() : null,
            jobCategory: row.jobCategory ? String(row.jobCategory).trim() : null,
            personnelCode: row.personnelCode ? String(row.personnelCode).trim() : null,
            fatherName: row.fatherName ? String(row.fatherName).trim() : null,
            scheduledVisitDate: row.scheduledVisitDate
              ? String(row.scheduledVisitDate).slice(0, 10)
              : null,
            pathwayCodeOrGroup: row.pathwayCodeOrGroup ? String(row.pathwayCodeOrGroup).trim() : null,
          };
        });
        const result = await apiFetch<{
          imported: number;
          duplicates: number;
          rejected: number;
          results: Array<{ firstName: string; lastName: string; nationalId: string; status: string; reason?: string | null }>;
        }>(`/api/contracts/${serverId}/members/import`, { method: "POST", body });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) {
          setToast({
            text: `${result.imported} نفر ثبت شد${result.duplicates ? `؛ ${result.duplicates} تکراری` : ""}${result.rejected ? `؛ ${result.rejected} رد` : ""}.`,
          });
        }
        return {
          ok: true,
          snapshot: snap,
          added: result.imported,
          duplicates: result.duplicates,
          rejected: result.rejected,
          results: result.results,
        };
      }
      if (action === "PLATFORM_SET_USER_ACTIVE") {
        const id = String(payload.serverUserId ?? payload.id ?? "");
        if (!id) throw new Error("شناسه کاربر نامعتبر است.");
        await apiFetch(`/api/users/${id}/active`, { method: "POST", body: { isActive: Boolean(payload.isActive) } });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "وضعیت کاربر به‌روز شد." });
        return { ok: true, snapshot: snap };
      }
      if (action === "PLATFORM_ACK_API_ABUSE") {
        const incidentId = String(payload.incidentId ?? "");
        if (!incidentId) throw new Error("شناسه حادثه نامعتبر است.");
        await apiFetch(`/api/platform/api-abuse/${incidentId}/acknowledge`, { method: "POST" });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "حادثه سوءاستفاده بررسی شد." });
        return { ok: true, snapshot: snap };
      }
      if (action === "PLATFORM_FACTORY_RESET_REQUEST_OTP") {
        const res = await apiFetch<{ ok: boolean; demoCode?: string | null; error?: string }>(
          "/api/platform/factory-reset/request-otp",
          { method: "POST" },
        );
        if (!quiet) {
          setToast({
            text: res.demoCode
              ? `کد تأیید ریست: ${res.demoCode}`
              : "کد تأیید به موبایل ادمین کل ارسال شد.",
          });
        }
        return { ok: true, demoCode: res.demoCode ?? null };
      }
      if (action === "PLATFORM_FACTORY_RESET_CONFIRM") {
        const code = String(payload.code ?? "").trim();
        if (!code) throw new Error("کد تأیید را وارد کنید.");
        await apiFetch("/api/platform/factory-reset/confirm", {
          method: "POST",
          body: { code },
        });
        // بعد از wipe همه نشست‌ها از بین رفته‌اند
        await signOut();
        navigateTo("/login", { replace: true });
        if (!quiet) setToast({ text: "ریست فکتوری انجام شد؛ دوباره وارد شوید." });
        return { ok: true, factoryReset: true };
      }
      if (action === "REFRESH_WORKSPACE") {
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        return { ok: true, snapshot: snap };
      }
      if (action === "CREATE_CONTRACT") {
        const clinic = await apiFetch<{ id: string }>("/api/clinics/current");
        const title = String(payload.title ?? "").trim();
        const organizationName = String(payload.organizationName ?? "").trim();
        if (title.length < 3 || organizationName.length < 2) {
          throw new Error("عنوان قرارداد و نام سازمان را وارد کنید.");
        }
        const defaultPathwayCode = String(payload.defaultPathwayCode ?? "").trim() || "CORP_MEN_LT40";
        const created = await apiFetch<{ id: string }>(`/api/contracts?clinicId=${encodeURIComponent(clinic.id)}`, {
          method: "POST",
          body: { title, organizationName, code: null, defaultPathwayCode: defaultPathwayCode },
        });
        const firstName =
          String(payload.supervisorFirstName ?? "").trim() ||
          String(payload.supervisorName ?? "").trim().split(/\s+/).filter(Boolean)[0] ||
          "";
        const lastName =
          String(payload.supervisorLastName ?? "").trim() ||
          String(payload.supervisorName ?? "").trim().split(/\s+/).filter(Boolean).slice(1).join(" ") ||
          "";
        const supPhone = normalizeMobile(String(payload.supervisorPhone ?? "").trim());
        const nationalId = String(payload.supervisorNationalId ?? payload.nationalId ?? "").trim();
        // اگر هر فیلد ناظر پر باشد، همهٔ فیلدهای اجباری باید کامل باشند
        if (firstName || lastName || supPhone || nationalId) {
          if (firstName.length < 2 || lastName.length < 2) {
            throw new Error("نام و نام‌خانوادگی ناظر را جدا وارد کنید.");
          }
          if (!supPhone || !isValidIranMobile(supPhone)) {
            throw new Error("شماره موبایل ناظر نامعتبر است.");
          }
          if (!nationalId) {
            throw new Error("کدملی ناظر الزامی است.");
          }
          if (!isValidIranNationalId(nationalId)) {
            throw new Error("کدملی ناظر نامعتبر است.");
          }
          await apiFetch(`/api/contracts/${created.id}/supervisor`, {
            method: "PUT",
            body: {
              firstName,
              lastName,
              phone: supPhone,
              title: null,
              nationalId,
              canSendReminders: true,
            },
          });
        }
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        // برای انتخاب خودکار در کمبو؛ fallback روی جدیدترین قرارداد
        const createdContractId =
          snap.contracts.find((c) => c.serverId === created.id)?.id ??
          [...snap.contracts].sort((a, b) => String(b.code).localeCompare(String(a.code), "en", { numeric: true }))[0]
            ?.id;
        if (!quiet) setToast({ text: "قرارداد سازمانی ثبت شد." });
        return { ok: true, snapshot: snap, createdContractId };
      }
      if (action === "UPDATE_CONTRACT") {
        const serverId = String(payload.contractServerId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور قرارداد یافت نشد؛ صفحه را تازه کنید.");
        const title = String(payload.title ?? "").trim();
        const organizationName = String(payload.organizationName ?? "").trim();
        if (title.length < 3 || organizationName.length < 2) {
          throw new Error("عنوان قرارداد و نام سازمان را وارد کنید.");
        }
        const defaultPathwayCode = String(payload.defaultPathwayCode ?? "").trim() || undefined;
        await apiFetch(`/api/contracts/${serverId}`, {
          method: "PUT",
          body: { title, organizationName, defaultPathwayCode: defaultPathwayCode ?? null },
        });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "قرارداد به‌روزرسانی شد." });
        return { ok: true, snapshot: snap };
      }
      if (action === "SET_CONTRACT_STATUS") {
        // UC-ADM-24 — تأیید تاکیدی در UI؛ اینجا فقط وضعیت را می‌نویسد
        const serverId = String(payload.contractServerId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور قرارداد یافت نشد؛ صفحه را تازه کنید.");
        const isActive = payload.isActive === true;
        const updated = await apiFetch<{ status?: string }>(`/api/contracts/${serverId}/status`, {
          method: "PUT",
          body: { isActive },
        });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) {
          setToast({
            text: isActive ? "قرارداد فعال شد." : "قرارداد غیرفعال شد.",
          });
        }
        return { ok: true, snapshot: snap, status: updated.status ?? (isActive ? "Active" : "Inactive") };
      }
      if (action === "UPDATE_CONTRACT_SUPERVISOR") {
        // API فقط FirstName/LastName می‌پذیرد؛ fullName تک‌فیلد برای سازگاری UI قدیمی split می‌شود
        const serverId = String(payload.contractServerId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور قرارداد یافت نشد؛ صفحه را تازه کنید.");
        const rawName = String(payload.fullName ?? "").trim();
        const firstName =
          String(payload.firstName ?? "").trim() || rawName.split(/\s+/)[0] || "";
        const lastName =
          String(payload.lastName ?? "").trim() || rawName.split(/\s+/).slice(1).join(" ") || "";
        if (firstName.length < 2 || lastName.length < 2) {
          throw new Error("نام و نام‌خانوادگی ناظر را جدا وارد کنید.");
        }
        const nationalId = String(payload.nationalId ?? "").trim();
        if (!nationalId) {
          throw new Error("کدملی ناظر الزامی است.");
        }
        // هم‌تراز بک‌اند: چک‌سام کدملی/موبایل قبل از PUT تا ۴۰۰ به‌جای پیام مبهم
        if (!isValidIranNationalId(nationalId)) {
          throw new Error("کدملی ناظر نامعتبر است.");
        }
        const phone = normalizeMobile(String(payload.phone ?? ""));
        if (!isValidIranMobile(phone)) {
          throw new Error("شماره موبایل ناظر نامعتبر است.");
        }
        await apiFetch(`/api/contracts/${serverId}/supervisor`, {
          method: "PUT",
          body: {
            firstName,
            lastName,
            phone,
            title: null,
            nationalId,
            canSendReminders: Boolean(payload.canSendReminders ?? true),
          },
        });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "ناظر قرارداد به‌روز شد." });
        return { ok: true, snapshot: snap };
      }
      if (action === "UPDATE_PATIENT_DETAILS") {
        // موبایل ادمین؛ پچ محلی تا patients:[] از workspace لیست را پاک نکند
        const serverId = String(payload.serverPatientId ?? payload.patientServerId ?? "").trim();
        const phone = normalizeMobile(String(payload.phone ?? ""));
        if (!serverId) {
          throw new Error("شناسه سرور بیمار یافت نشد؛ فهرست بیماران هنوز کامل به API وصل نشده است.");
        }
        if (!phone) throw new Error("شماره موبایل را وارد کنید.");
        await apiFetch(`/api/patients/${serverId}/phone`, { method: "PUT", body: { phone } });
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) => (p.serverId === serverId ? { ...p, phone } : p)),
        }));
        if (!quiet) setToast({ text: "شماره موبایل بیمار به‌روز شد." });
        return { ok: true };
      }
      if (action === "UPDATE_PATIENT_PROFILE") {
        const serverId = String(payload.serverPatientId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور بیمار یافت نشد.");
        const { updatePatientProfile } = await import("@/lib/api/patients");
        const firstName = String(payload.firstName ?? "").trim();
        const lastName = String(payload.lastName ?? "").trim();
        const birthDate = payload.birthDate ? String(payload.birthDate).slice(0, 10) : null;
        const maritalStatus = payload.maritalStatus != null ? String(payload.maritalStatus) : null;
        const gender = payload.gender != null ? String(payload.gender) : null;
        await updatePatientProfile(serverId, {
          firstName: firstName || null,
          lastName: lastName || null,
          birthDate,
          maritalStatus,
          gender,
        });
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) => {
            if (p.serverId !== serverId) return p;
            const nextBirth = birthDate ?? p.birthDate;
            // سن از تولد تازه تا visibility ≥۵۰ در همان نشست کهنه نماند
            const nextAge = ageFromBirthIso(nextBirth?.slice(0, 10) ?? null) ?? p.age;
            return {
              ...p,
              firstName: firstName || p.firstName,
              lastName: lastName || p.lastName,
              fullName: `${firstName} ${lastName}`.trim() || p.fullName,
              birthDate: nextBirth,
              age: nextAge,
              maritalStatus: maritalStatus ?? p.maritalStatus,
              gender: gender || p.gender,
            };
          }),
        }));
        if (!quiet) setToast({ text: "پروفایل بیمار به‌روز شد." });
        return { ok: true };
      }
      // فقط patch محلی از GET responses/mine — بدون POST
      if (action === "HYDRATE_FORM_RESPONSE") {
        const patientGuid = String(payload.serverPatientId ?? "").trim();
        const formGuid = String(payload.formId ?? "").trim();
        const localId = Number(payload.patientId);
        const answersRaw = Array.isArray(payload.answers) ? payload.answers : [];
        const status = payload.status === "submitted" ? "submitted" : "draft";
        const completedAt =
          payload.completedAt != null ? String(payload.completedAt) : status === "submitted" ? new Date().toISOString() : null;
        const formCode = String(payload.formCode ?? "");
        const nowIso = new Date().toISOString();
        const incoming = answersRaw.map((row) => {
          const a = row as Record<string, unknown>;
          return {
            itemCode: String(a.itemCode ?? ""),
            valueCode: (a.valueCode as "yes" | "no" | "unknown" | null) ?? null,
            valueRaw: a.valueRaw != null ? String(a.valueRaw) : "",
            notes: a.notes != null ? String(a.notes) : "",
            skippedByRule: Boolean(a.skippedByRule),
          };
        });
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) => {
            if (p.serverId !== patientGuid && p.id !== localId) return p;
            const existing = p.formResponses?.find((r) => r.formId === formGuid);
            const other = (p.formResponses ?? []).filter((r) => r.formId !== formGuid);
            return {
              ...p,
              formResponses: [
                ...other,
                {
                  id: existing?.id ?? `fr_api_${formGuid}`,
                  patientId: p.id,
                  formId: formGuid,
                  formCode: formCode || existing?.formCode || "",
                  formVersion: existing?.formVersion ?? 1,
                  formVersionId: existing?.formVersionId ?? formGuid,
                  status: status as "draft" | "submitted",
                  startedAt: existing?.startedAt ?? nowIso,
                  updatedAt: nowIso,
                  completedAt,
                  answers: incoming,
                  context: {
                    gender: p.gender,
                    age: p.age,
                    maritalStatus: p.maritalStatus ?? "",
                  },
                },
              ],
              intakeCompleted: status === "submitted" ? true : p.intakeCompleted,
            };
          }),
        }));
        return { ok: true };
      }
      if (action === "SAVE_FORM_RESPONSE") {
        const { saveFormResponse } = await import("@/lib/api/forms");
        const { parseResidenceAddress } = await import("@/lib/residence-address");
        const patientGuid = String(payload.serverPatientId ?? "").trim();
        const formGuid = String(payload.serverFormId ?? payload.formId ?? "").trim();
        if (!patientGuid || !formGuid) {
          throw new Error("شناسه سرور پرونده یا فرم یافت نشد؛ صفحه را تازه کنید.");
        }
        const mode = payload.mode === "submit" ? "submit" : "draft";
        const answersRaw = Array.isArray(payload.answers) ? payload.answers : [];
        const mappedAnswers = answersRaw.map((row) => {
          const a = row as Record<string, unknown>;
          return {
            itemCode: String(a.itemCode ?? ""),
            valueCode: a.valueCode != null ? String(a.valueCode) : null,
            valueRaw: a.valueRaw != null ? String(a.valueRaw) : null,
            notes: a.notes != null ? String(a.notes) : null,
            skippedByRule: Boolean(a.skippedByRule),
          };
        });
        await saveFormResponse({
          patientId: patientGuid,
          formId: formGuid,
          submit: mode === "submit",
          answers: mappedAnswers,
        });
        // workspace هنوز patients را hydrate نمی‌کند — فقط همین پرونده را محلی به‌روز کن
        const localId = Number(payload.patientId);
        // دموگرافیک BASE روی ترک بخش draft هم روی Patient می‌نشیند (هم‌تراز بک‌اند)
        const birthRaw = mappedAnswers.find((a) => /_BASE_birthDate$/i.test(a.itemCode))?.valueRaw?.trim() || null;
        const maritalRaw =
          mappedAnswers.find((a) => /_BASE_maritalStatus$/i.test(a.itemCode))?.valueRaw?.trim() ||
          mappedAnswers.find((a) => /_BASE_maritalStatus$/i.test(a.itemCode))?.valueCode?.trim() ||
          null;
        const residenceRaw = mappedAnswers.find((a) => /_BASE_residence$/i.test(a.itemCode))?.valueRaw;
        const home = residenceRaw ? parseResidenceAddress(residenceRaw) : null;
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) => {
            if (p.serverId !== patientGuid && p.id !== localId) return p;
            const formIdLocal = String(payload.formId ?? formGuid);
            const existing = p.formResponses?.find((r) => r.formId === formIdLocal);
            const other = (p.formResponses ?? []).filter((r) => r.formId !== formIdLocal);
            const nowIso = new Date().toISOString();
            const incoming = mappedAnswers.map((a) => ({
              itemCode: a.itemCode,
              valueCode: (a.valueCode as "yes" | "no" | "unknown" | null) ?? null,
              valueRaw: a.valueRaw ?? "",
              notes: a.notes ?? "",
              skippedByRule: a.skippedByRule,
            }));
            // draft بخش‌محور: با answers قبلی merge؛ submit کل را جایگزین می‌کند
            let nextAnswers = incoming;
            if (mode === "draft" && existing?.answers?.length) {
              const byCode = new Map(existing.answers.map((a) => [a.itemCode, a]));
              for (const a of incoming) byCode.set(a.itemCode, a);
              nextAnswers = [...byCode.values()];
            }
            const nextResponse = {
              id: existing?.id ?? `fr_api_${formGuid}`,
              patientId: p.id,
              formId: formIdLocal,
              formCode: existing?.formCode ?? "",
              formVersion: existing?.formVersion ?? 1,
              formVersionId: existing?.formVersionId ?? formGuid,
              status: (mode === "submit" ? "submitted" : "draft") as "draft" | "submitted",
              startedAt: existing?.startedAt ?? nowIso,
              updatedAt: nowIso,
              completedAt: mode === "submit" ? nowIso : null,
              answers: nextAnswers,
              context: { gender: p.gender, age: p.age, maritalStatus: maritalRaw ?? null },
            };
            const progressRaw = Number(payload.progressPct);
            const nextProgressPct =
              mode === "submit"
                ? 100
                : Number.isFinite(progressRaw)
                  ? Math.min(99, Math.max(0, Math.round(progressRaw)))
                  : p.formProgressPct;
            return {
              ...p,
              formResponses: [...other, nextResponse],
              formProgressPct: nextProgressPct,
              intakeCompleted: mode === "submit" ? true : p.intakeCompleted,
              // سرور در submit نهایی JourneyIntroSeen را هم ست می‌کند
              journeyIntroSeen: mode === "submit" ? true : p.journeyIntroSeen,
              ...(birthRaw
                ? {
                    birthDate: birthRaw,
                    // draft تولد age ذخیره‌شده را عوض نمی‌کرد و سوالات ≥۵۰ مخفی می‌ماندند
                    age: ageFromBirthIso(birthRaw.slice(0, 10)) ?? p.age,
                  }
                : {}),
              ...(maritalRaw ? { maritalStatus: maritalRaw } : {}),
              ...(home
                ? {
                    homeLat: home.lat,
                    homeLon: home.lon,
                    homeAddress: home.address,
                    homePlaque: home.plaque,
                    homeUnit: home.unit ?? null,
                    homePostalCode: home.postalCode ?? null,
                  }
                : {}),
            };
          }),
        }));
        if (!quiet && mode === "submit") setToast({ text: "پرسشنامه ثبت شد." });
        return { ok: true };
      }
      if (action === "UPDATE_PATIENT_HOME") {
        const { updatePatientHome } = await import("@/lib/api/patients");
        const localId = Number(payload.patientId);
        const guid = String(payload.serverPatientId ?? "").trim();
        if (!guid) throw new Error("شناسه سرور پرونده یافت نشد؛ صفحه را تازه کنید.");
        const lat = Number(payload.homeLat);
        const lon = Number(payload.homeLon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("مختصات موقعیت معتبر نیست.");
        const address = String(payload.homeAddress ?? "").trim();
        if (!address) throw new Error("متن آدرس را وارد کنید.");
        await updatePatientHome(guid, {
          homeLat: lat,
          homeLon: lon,
          homeAddress: address,
          homePlaque: payload.homePlaque != null ? String(payload.homePlaque) : null,
          homeUnit: payload.homeUnit != null ? String(payload.homeUnit) : null,
          homePostalCode: payload.homePostalCode != null ? String(payload.homePostalCode) : null,
        });
        // به‌روزرسانی محلی تا UI مسیریابی بلافاصله مختصات جدید را ببیند
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) =>
            p.serverId === guid || p.id === localId
              ? {
                  ...p,
                  homeLat: lat,
                  homeLon: lon,
                  homeAddress: address,
                  homePlaque:
                    payload.homePlaque != null ? String(payload.homePlaque) || null : p.homePlaque,
                  homeUnit: payload.homeUnit != null ? String(payload.homeUnit) || null : p.homeUnit,
                  homePostalCode:
                    payload.homePostalCode != null
                      ? String(payload.homePostalCode) || null
                      : p.homePostalCode,
                }
              : p
          ),
        }));
        if (!quiet) setToast({ text: "آدرس محل سکونت ذخیره شد." });
        return { ok: true };
      }
      if (action === "UPDATE_PATIENT_PHOTO") {
        let serverId = String(payload.serverPatientId ?? "").trim();
        const localId = Number(payload.patientId);
        // اگر payload خالی بود از snapshot فعلی با id عددی resolve کن
        if (!serverId && Number.isFinite(localId)) {
          serverId = String(snapshotRef.current.patients.find((p) => p.id === localId)?.serverId ?? "").trim();
        }
        const dataUrl = String(payload.photoDataUrl ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور بیمار برای عکس یافت نشد؛ صفحه را تازه کنید.");
        if (!dataUrl.startsWith("data:")) throw new Error("دادهٔ عکس نامعتبر است.");
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const uploaded = await uploadFileBlob(blob, "portrait.jpg", serverId);
        await postPatientPortrait(serverId, uploaded.storageKey);
        // بستن نشست ضدتقلب — کلید پرتره را با fraud_confirm شریک نکن (گیت دانلود Owner را می‌شکست)
        const fraudSessionId = String(payload.fraudSessionId ?? "").trim();
        if (fraudSessionId) {
          try {
            await endFraudSession(fraudSessionId);
          } catch {
            /* پرتره ذخیره شده؛ شکست بستن نشست نباید کل جریان را بشکند */
          }
        }
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) =>
            p.serverId === serverId || p.id === localId
              ? { ...p, photoDataUrl: dataUrl, hasPortrait: true, portraitStorageKey: uploaded.storageKey }
              : p
          ),
        }));
        if (!quiet) setToast({ text: "عکس پرونده ذخیره شد." });
        return { ok: true };
      }
      if (action === "START_FRAUD_CAMERA_SESSION") {
        if (snapshotRef.current.platform?.settings?.featureFlags?.fraudWatch === false) {
          return { ok: false, sessionId: null };
        }
        let serverId = String(payload.serverPatientId ?? "").trim();
        const localId = Number(payload.patientId);
        if (!serverId && Number.isFinite(localId)) {
          serverId = String(snapshotRef.current.patients.find((p) => p.id === localId)?.serverId ?? "").trim();
        }
        if (!serverId) throw new Error("شناسه سرور بیمار برای ضدتقلب یافت نشد.");
        const started = await startFraudSession(serverId);
        return { ok: true, sessionId: started.sessionId, wrapKey: started.wrapKey };
      }
      if (action === "CAPTURE_FRAUD_FRAME") {
        const sessionId = String(payload.sessionId ?? "").trim();
        const wrapKey = String(payload.wrapKey ?? "").trim();
        const dataUrl = String(payload.photoDataUrl ?? "").trim();
        if (!sessionId || !dataUrl.startsWith("data:")) return { ok: false };
        if (!wrapKey) throw new Error("کلید پوشش نشست ضدتقلب یافت نشد.");
        const fraudPatientId = String(payload.serverPatientId ?? "").trim() || undefined;
        // نام/پسوند/هدر مبهم؛ سرور unwrap و JPEG واقعی نگه می‌دارد
        const uploaded = await uploadOpaqueFraudFrame(dataUrl, sessionId, wrapKey, fraudPatientId);
        const kind = String(payload.kind ?? "fraud_auto") === "fraud_confirm" ? "fraud_confirm" : "fraud_auto";
        await captureFraudFrame({
          sessionId,
          storageKey: uploaded.storageKey,
          kind,
          lat: payload.lat != null ? Number(payload.lat) : undefined,
          lon: payload.lon != null ? Number(payload.lon) : undefined,
          accuracy: payload.accuracy != null ? Number(payload.accuracy) : undefined,
        });
        return { ok: true };
      }
      if (action === "END_FRAUD_CAMERA_SESSION") {
        const sessionId = String(payload.sessionId ?? "").trim();
        if (sessionId) await endFraudSession(sessionId);
        return { ok: true };
      }
      if (action === "RECORD_USER_GPS") {
        if (snapshotRef.current.platform?.settings?.featureFlags?.gpsTracking === false) {
          throw new Error("ردیابی GPS در تنظیمات پلتفرم خاموش است.");
        }
        let serverId = String(payload.serverPatientId ?? "").trim();
        const localId = Number(payload.patientId);
        if (!serverId && Number.isFinite(localId)) {
          serverId = String(snapshotRef.current.patients.find((p) => p.id === localId)?.serverId ?? "").trim();
        }
        const lat = Number(payload.lat);
        const lon = Number(payload.lon);
        // بدون serverId یا مختصات معتبر، silent-fail ممنوع تا نقطهٔ اول گم نشود
        if (!serverId) throw new Error("شناسه سرور پرونده برای ثبت موقعیت یافت نشد؛ صفحه را تازه کنید.");
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("مختصات موقعیت معتبر نیست.");
        await recordGpsPoint({
          serverPatientId: serverId,
          lat,
          lon,
          accuracy: Number.isFinite(Number(payload.accuracy)) ? Number(payload.accuracy) : 0,
          source: String(payload.source ?? "manual"),
        });
        return { ok: true };
      }
      // UC-ADM-25 — ایجاد ایستگاه کاتالوگ
      if (action === "CREATE_CLINIC_STATION") {
        await createClinicStation({
          code: String(payload.code ?? "").trim() || null,
          titleFa: String(payload.titleFa ?? payload.name ?? "").trim() || null,
          category: payload.category != null ? String(payload.category) : null,
          floor: payload.floor != null ? Number(payload.floor) : null,
          roomNumber: payload.roomNumber != null ? String(payload.roomNumber) : null,
          prepInstructions: payload.prepInstructions != null ? String(payload.prepInstructions) : null,
          wayfindingSteps: payload.wayfindingSteps != null ? String(payload.wayfindingSteps) : null,
          isActive: payload.isActive !== false,
        });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "ایستگاه جدید در کاتالوگ کلینیک ثبت شد." });
        return { ok: true, snapshot: snap };
      }
      // UC-ADM-25 — ویرایش ایستگاه / راهنمای مسیر
      if (action === "UPDATE_ROOM_CONFIG") {
        const serverId = String(payload.serverId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور ایستگاه یافت نشد؛ صفحه را تازه کنید.");
        await updateClinicStation(serverId, {
          titleFa: payload.titleFa != null || payload.name != null
            ? String(payload.titleFa ?? payload.name ?? "").trim()
            : null,
          category: payload.category != null ? String(payload.category) : null,
          floor: payload.floor != null ? Number(payload.floor) : null,
          roomNumber: payload.roomNumber != null ? String(payload.roomNumber) : null,
          prepInstructions: payload.prepInstructions != null ? String(payload.prepInstructions) : null,
          wayfindingSteps: payload.wayfindingSteps != null ? String(payload.wayfindingSteps) : null,
          isActive: typeof payload.isActive === "boolean" ? payload.isActive : null,
        });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "پیکربندی ایستگاه ذخیره شد." });
        return { ok: true, snapshot: snap };
      }
      // UC-ADM-25 — فعال/غیرفعال ایستگاه (فهرست افزودن فوری پزشک)
      if (action === "SET_CLINIC_STATION_ACTIVE") {
        const serverId = String(payload.serverId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور ایستگاه یافت نشد؛ صفحه را تازه کنید.");
        const isActive = payload.isActive === true;
        await setClinicStationActive(serverId, isActive);
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) {
          setToast({
            text: isActive ? "ایستگاه فعال شد." : "ایستگاه غیرفعال شد و از فهرست افزودن فوری حذف گردید.",
          });
        }
        return { ok: true, snapshot: snap };
      }
      if (action === "UPDATE_CLINIC_PROFILE") {
        const updated = await updateCurrentClinic({
          name: String(payload.name ?? "").trim(),
          city: payload.city != null ? String(payload.city) : null,
          address: payload.address != null ? String(payload.address) : null,
          latitude: payload.latitude != null ? Number(payload.latitude) : null,
          longitude: payload.longitude != null ? Number(payload.longitude) : null,
          preAdmitSupportPhone: payload.preAdmitSupportPhone != null ? String(payload.preAdmitSupportPhone) : null,
          smsProvider: payload.smsProvider != null ? String(payload.smsProvider) : null,
          smsSenderNumber: payload.smsSenderNumber != null ? String(payload.smsSenderNumber) : null,
          kavenegarApiKey: payload.kavenegarApiKey != null ? String(payload.kavenegarApiKey) : null,
          kavenegarOtpTemplate: payload.kavenegarOtpTemplate != null ? String(payload.kavenegarOtpTemplate) : null,
          toubaUsername: payload.toubaUsername != null ? String(payload.toubaUsername) : null,
          toubaPassword: payload.toubaPassword != null ? String(payload.toubaPassword) : null,
          toubaSendUrl: payload.toubaSendUrl != null ? String(payload.toubaSendUrl) : null,
          toubaOtpMessageTemplate: payload.toubaOtpMessageTemplate != null ? String(payload.toubaOtpMessageTemplate) : null,
        });
        setSnapshot((prev) => ({
          ...prev,
          clinicLocation: {
            lat: updated.latitude ?? prev.clinicLocation.lat,
            lon: updated.longitude ?? prev.clinicLocation.lon,
            address: updated.address || `${updated.name}${updated.city ? ` — ${updated.city}` : ""}`,
            city: updated.city ?? prev.clinicLocation.city,
          },
          platform: {
            ...prev.platform,
            clinics: prev.platform.clinics.map((c) =>
              c.isCurrentTenant
                ? {
                    ...c,
                    name: updated.name,
                    city: updated.city ?? c.city,
                    preAdmitSupportPhone: updated.preAdmitSupportPhone ?? "",
                    smsProvider: updated.smsProvider ?? c.smsProvider,
                    smsSenderNumber: updated.smsSenderNumber ?? "",
                    kavenegarApiKey: updated.kavenegarApiKey ?? undefined,
                    kavenegarApiKeySet: updated.kavenegarApiKeySet,
                    kavenegarOtpTemplate: updated.kavenegarOtpTemplate ?? "",
                    toubaUsername: updated.toubaUsername ?? "",
                    toubaPassword: updated.toubaPassword ?? undefined,
                    toubaPasswordSet: updated.toubaPasswordSet,
                    toubaSendUrl: updated.toubaSendUrl ?? "",
                    toubaOtpMessageTemplate: updated.toubaOtpMessageTemplate ?? "",
                    logoStorageKey: updated.logoStorageKey ?? c.logoStorageKey ?? null,
                  }
                : c
            ),
          },
        }));
        if (!quiet) setToast({ text: "مشخصات بیمارستان ذخیره شد." });
        return { ok: true, clinic: updated };
      }
      if (action === "SET_CLINIC_LOGO") {
        const key = String(payload.logoStorageKey ?? "").trim();
        if (!key) throw new Error("کلید لوگو خالی است.");
        setSnapshot((prev) => ({
          ...prev,
          platform: {
            ...prev.platform,
            clinics: prev.platform.clinics.map((c) =>
              c.isCurrentTenant ? { ...c, logoStorageKey: key } : c
            ),
          },
        }));
        if (!quiet) setToast({ text: "لوگوی بیمارستان ذخیره شد." });
        return { ok: true, logoStorageKey: key };
      }
      if (action === "SET_CONTRACT_PARTNER_LOGO") {
        const contractId = Number(payload.contractId);
        const key = String(payload.partnerLogoStorageKey ?? "").trim();
        if (!Number.isFinite(contractId) || !key) throw new Error("لوگوی قرارداد نامعتبر است.");
        setSnapshot((prev) => ({
          ...prev,
          contracts: prev.contracts.map((c) =>
            c.id === contractId ? { ...c, partnerLogoStorageKey: key } : c
          ),
        }));
        if (!quiet) setToast({ text: "لوگوی سازمان قرارداد ذخیره شد." });
        return { ok: true, partnerLogoStorageKey: key };
      }
      if (action === "PLATFORM_UPDATE_SETTINGS") {
        const patch = (payload.settings ?? {}) as Record<string, unknown>;
        const flags = (patch.featureFlags ?? {}) as Record<string, unknown>;
        const seconds = Number(patch.fraudAutoCaptureSeconds ?? 7);
        if (seconds < 2 || seconds > 15) {
          throw new Error("بازه عکس‌برداری ضدتقلب باید بین ۲ تا ۱۵ ثانیه باشد.");
        }
        const otpLength = Number(patch.otpLength ?? 5);
        if (otpLength < 4 || otpLength > 8) {
          throw new Error("طول OTP باید بین ۴ تا ۸ باشد.");
        }
        // سقف مدرک در پنل نیست — از GET فعلی حفظ می‌شود
        const current = await apiFetch<{
          intakeDocumentMaxGroups: number;
          intakeDocumentMaxFilesPerGroup: number;
        }>("/api/platform/settings");
        await apiFetch("/api/platform/settings", {
          method: "PUT",
          body: {
            brandName: String(patch.brandName ?? "نفس"),
            otpLength,
            otpTtlSeconds: Number(patch.otpTtlSeconds ?? 120),
            intakeDocumentMaxGroups: current.intakeDocumentMaxGroups ?? 20,
            intakeDocumentMaxFilesPerGroup: current.intakeDocumentMaxFilesPerGroup ?? 20,
            supportPhone: patch.supportPhone != null ? String(patch.supportPhone) : null,
            smsSenderId: patch.smsSenderId != null ? String(patch.smsSenderId) : null,
            fraudAutoCaptureSeconds: seconds,
            featureFlags: {
              fraudWatch: flags.fraudWatch !== false,
              gpsTracking: flags.gpsTracking !== false,
              multiClinicRegistry: false,
              corporateContracts: flags.corporateContracts !== false,
              multiSessionWatch: flags.multiSessionWatch !== false,
            },
          },
        });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "تنظیمات پایه ذخیره شد." });
        return { ok: true, snapshot: snap };
      }
      if (action === "PLATFORM_REVIEW_FRAUD_SESSION") {
        const sessionId = String(payload.sessionId ?? "").trim();
        const status = String(payload.reviewStatus ?? payload.status ?? "pending");
        const note =
          payload.reviewNote != null
            ? String(payload.reviewNote)
            : payload.note != null
              ? String(payload.note)
              : undefined;
        const reviewer = String(payload.reviewer ?? "platform");
        if (!sessionId) throw new Error("شناسه نشست ضدتقلب یافت نشد.");
        await reviewFraudSession({ sessionId, status: status as "pending" | "cleared" | "flagged", note, reviewer });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "بازبینی ضدتقلب ثبت شد." });
        return { ok: true, snapshot: snap };
      }
      if (action === "DISMISS_JOURNEY_INTRO") {
        const { dismissJourneyIntro } = await import("@/lib/api/patients");
        const localId = Number(payload.patientId);
        const guidHint = String(
          payload.serverPatientId ??
            snapshotRef.current.patients.find((p) => p.id === localId)?.serverId ??
            ""
        ).trim();
        await dismissJourneyIntro();
        // فقط پچ React بعد از موفقیت API — بدون localStorage
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) =>
            p.id === localId || (guidHint && p.serverId === guidHint)
              ? { ...p, journeyIntroSeen: true }
              : p
          ),
        }));
        return { ok: true };
      }
      if (action === "CONFIRM_PATHWAY_STATION") {
        const { confirmPathwayStation } = await import("@/lib/api/patients");
        const stationDefId = String(payload.stationDefId ?? "").trim();
        if (!stationDefId) throw new Error("شناسه ایستگاه مسیر یافت نشد.");
        const localPatientId = Number(payload.patientId ?? 0);
        const row = await confirmPathwayStation(stationDefId);
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) => {
            // فقط پروندهٔ همان سلامتجو را پچ کن — نه همهٔ بیماران snapshot
            if (localPatientId && p.id !== localPatientId) return p;
            if (!p.pathwayItinerary?.length) return p;
            return {
              ...p,
              pathwayItinerary: p.pathwayItinerary.map((s) =>
                s.stationDefId === row.stationDefId
                  ? {
                      ...s,
                      confirmed: row.confirmed,
                      confirmedAt: row.confirmedAt ?? new Date().toISOString(),
                    }
                  : s,
              ),
            };
          }),
        }));
        if (!quiet) setToast({ text: "ایستگاه تأیید شد." });
        return { ok: true, station: row };
      }
      if (action === "ENSURE_OWNER_PATIENT") {
        const snap = await fetchOwnerIntakeSnapshot();
        const mapped = mapOwnerSnapshotToPatient(snap);
        if (mapped.serverId) {
          try {
            mapped.intakeDocuments = await fetchMappedIntakeDocuments(mapped.serverId);
          } catch {
            mapped.intakeDocuments = [];
          }
        }
        setSnapshot((prev) => {
          const exists = prev.patients.some(
            (p) => p.serverId === mapped.serverId || p.id === mapped.id
          );
          return {
            ...prev,
            patients: exists
              ? prev.patients.map((p) =>
                  p.serverId === mapped.serverId || p.id === mapped.id ? { ...p, ...mapped } : p
                )
              : [...prev.patients, mapped],
          };
        });
        return { ok: true, patient: mapped };
      }
      if (action === "ADD_INTAKE_DOCUMENT_GROUP") {
        const localId = Number(payload.patientId);
        const patient =
          snapshotRef.current.patients.find((p) => p.id === localId) ??
          snapshotRef.current.patients.find((p) => p.serverId === String(payload.serverPatientId ?? ""));
        const serverId = String(patient?.serverId ?? payload.serverPatientId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور پرونده برای مدرک یافت نشد؛ صفحه را تازه کنید.");
        if (patient?.intakeCompleted) throw new Error("پس از ثبت نهایی پیش‌پذیرش، افزودن مدرک مجاز نیست.");
        const documentTypeRaw = String(payload.documentType ?? "").trim();
        if (!isIntakeDocumentType(documentTypeRaw)) throw new Error("نوع مدرک را از فهرست انتخاب کنید.");
        const noteRaw = String(payload.note ?? "").trim();
        const typeLabelFa =
          documentTypeRaw === "other"
            ? noteRaw || "سایر مدارک پزشکی"
            : intakeDocumentLabelFa(documentTypeRaw);
        const rawFiles = Array.isArray(payload.files) ? payload.files : [];
        if (!rawFiles.length) throw new Error("حداقل یک فایل انتخاب کنید.");
        const created = await createEvidenceDocumentGroup({
          patientId: serverId,
          documentType: documentTypeRaw,
          typeLabelFa,
          note: documentTypeRaw === "other" ? noteRaw || null : null,
          documentDate: payload.documentDate != null ? String(payload.documentDate) : null,
        });
        const uploadedMeta: Array<{
          fileName: string;
          mimeType: string;
          storageKey: string;
          sizeBytes: number;
          documentDate: string | null;
          dataUrl: string;
        }> = [];
        for (const raw of rawFiles) {
          const row = raw as Record<string, unknown>;
          const dataUrl = String(row.dataUrl ?? "");
          const fileName = String(row.fileName ?? "file.bin");
          const mimeType = String(row.mimeType ?? "application/octet-stream");
          const uploaded = await uploadDataUrlAsFile(dataUrl, fileName, serverId);
          uploadedMeta.push({
            fileName,
            mimeType,
            storageKey: uploaded.storageKey,
            sizeBytes: Number(uploaded.sizeBytes ?? 0),
            documentDate: row.documentDate != null ? String(row.documentDate) : null,
            dataUrl,
          });
        }
        await addEvidenceDocumentFiles(
          created.id,
          uploadedMeta.map((f) => ({
            fileName: f.fileName,
            mimeType: f.mimeType,
            storageKey: f.storageKey,
            sizeBytes: f.sizeBytes,
            documentDate: f.documentDate,
          }))
        );
        // id واقعی فایل‌ها از لیست سرور
        const listed = await listPatientDocuments(serverId);
        const serverGroup = listed.find((g) => g.id === created.id);
        const group: PatientIntakeDocumentGroup = {
          id: created.id,
          documentType: documentTypeRaw as IntakeDocumentType,
          typeLabelFa,
          note: documentTypeRaw === "other" ? noteRaw || null : null,
          documentDate: payload.documentDate != null ? String(payload.documentDate) : null,
          uploadedAt: new Date().toISOString(),
          files: (serverGroup?.files ?? []).map((f, idx) => ({
            id: f.id,
            fileName: f.fileName,
            mimeType: f.mimeType,
            storageKey: f.storageKey,
            dataUrl: uploadedMeta[idx]?.dataUrl || "",
            documentDate: f.documentDate ?? null,
          })),
        };
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) =>
            p.serverId === serverId || p.id === localId
              ? { ...p, intakeDocuments: [...(p.intakeDocuments ?? []), group] }
              : p
          ),
        }));
        return { ok: true, group };
      }
      if (action === "ADD_INTAKE_DOCUMENT_FILES") {
        const localId = Number(payload.patientId);
        const groupId = String(payload.groupId ?? "").trim();
        const patient = snapshotRef.current.patients.find((p) => p.id === localId);
        const serverId = String(patient?.serverId ?? "").trim();
        if (!serverId || !groupId) throw new Error("شناسه پرونده یا گروه مدرک یافت نشد.");
        if (patient?.intakeCompleted) throw new Error("پس از ثبت نهایی پیش‌پذیرش، افزودن فایل مجاز نیست.");
        const rawFiles = Array.isArray(payload.files) ? payload.files : [];
        if (!rawFiles.length) throw new Error("حداقل یک فایل انتخاب کنید.");
        const uploadedMeta: Array<{
          fileName: string;
          mimeType: string;
          storageKey: string;
          sizeBytes: number;
          documentDate: string | null;
          dataUrl: string;
        }> = [];
        for (const raw of rawFiles) {
          const row = raw as Record<string, unknown>;
          const dataUrl = String(row.dataUrl ?? "");
          const fileName = String(row.fileName ?? "file.bin");
          const mimeType = String(row.mimeType ?? "application/octet-stream");
          const uploaded = await uploadDataUrlAsFile(dataUrl, fileName, serverId);
          uploadedMeta.push({
            fileName,
            mimeType,
            storageKey: uploaded.storageKey,
            sizeBytes: Number(uploaded.sizeBytes ?? 0),
            documentDate:
              row.documentDate != null
                ? String(row.documentDate)
                : payload.documentDate != null
                  ? String(payload.documentDate)
                  : null,
            dataUrl,
          });
        }
        await addEvidenceDocumentFiles(
          groupId,
          uploadedMeta.map((f) => ({
            fileName: f.fileName,
            mimeType: f.mimeType,
            storageKey: f.storageKey,
            sizeBytes: f.sizeBytes,
            documentDate: f.documentDate,
          }))
        );
        const listed = await listPatientDocuments(serverId);
        const serverGroup = listed.find((g) => g.id === groupId);
        const existingGroup = patient?.intakeDocuments?.find((g) => g.id === groupId);
        const byKey = new Map((existingGroup?.files ?? []).map((f) => [f.storageKey || f.fileName, f.dataUrl]));
        for (const m of uploadedMeta) byKey.set(m.storageKey, m.dataUrl);
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) => {
            if (p.serverId !== serverId && p.id !== localId) return p;
            return {
              ...p,
              intakeDocuments: (p.intakeDocuments ?? []).map((g) =>
                g.id !== groupId
                  ? g
                  : {
                      ...g,
                      files: (serverGroup?.files ?? []).map((f) => ({
                        id: f.id,
                        fileName: f.fileName,
                        mimeType: f.mimeType,
                        storageKey: f.storageKey,
                        dataUrl: byKey.get(f.storageKey) || byKey.get(f.fileName) || "",
                        documentDate: f.documentDate ?? null,
                      })),
                    }
              ),
            };
          }),
        }));
        return { ok: true };
      }
      if (action === "REMOVE_INTAKE_DOCUMENT_GROUP") {
        const localId = Number(payload.patientId);
        const groupId = String(payload.groupId ?? "").trim();
        if (!groupId) throw new Error("شناسه مدرک نامعتبر است.");
        await removeEvidenceDocumentGroup(groupId);
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) =>
            p.id === localId
              ? { ...p, intakeDocuments: (p.intakeDocuments ?? []).filter((g) => g.id !== groupId) }
              : p
          ),
        }));
        return { ok: true };
      }
      if (action === "REMOVE_INTAKE_DOCUMENT_FILE") {
        const localId = Number(payload.patientId);
        const groupId = String(payload.groupId ?? "").trim();
        const fileId = String(payload.fileId ?? "").trim();
        if (!fileId) throw new Error("شناسه فایل نامعتبر است.");
        await removeEvidenceDocumentFile(fileId);
        setSnapshot((prev) => ({
          ...prev,
          patients: prev.patients.map((p) =>
            p.id !== localId
              ? p
              : {
                  ...p,
                  intakeDocuments: (p.intakeDocuments ?? []).map((g) =>
                    g.id !== groupId ? g : { ...g, files: g.files.filter((f) => f.id !== fileId) }
                  ),
                }
          ),
        }));
        return { ok: true };
      }
      if (action === "UPSERT_PATHWAY_LIBRARY_ITEM") {
        const rule = (payload.rule ?? {}) as Record<string, unknown>;
        const title = String(rule.title ?? "").trim();
        // AdminRuleLibrary ایستگاه می‌فرستد؛ فرم قدیمی قرارداد فقط pathwayCode قالب دارد
        const stationsRaw = Array.isArray(rule.stations) ? rule.stations : [];
        let stationDrafts: PathwayStationDraft[] = stationsRaw.map((s, idx) => {
          const row = s as Record<string, unknown>;
          return {
            roomCode: String(row.roomCode ?? "").trim(),
            titleFa: String(row.titleFa ?? row.roomCode ?? "").trim(),
            stepOrder: Number(row.stepOrder ?? idx + 1),
            isOptional: Boolean(row.isOptional),
          };
        }).filter((s) => s.roomCode);
        const templateCode = String(rule.pathwayCode ?? "").trim();
        if (stationDrafts.length === 0 && templateCode) {
          const template =
            snapshot.pathways.find((p) => p.code === templateCode) ??
            snapshot.pathwayLibrary.find((p) => p.code === templateCode || p.id === templateCode);
          if (template) {
            stationDrafts = template.stations?.length
              ? template.stations.map((s) => ({
                  roomCode: s.roomCode,
                  titleFa: s.titleFa,
                  stepOrder: s.stepOrder,
                  isOptional: s.isOptional,
                }))
              : stationCodesToDrafts(template.stationCodes ?? [], template.optionalStationCodes, snapshot.rooms ?? []);
          }
        }
        if (!title || stationDrafts.length === 0) {
          throw new Error("عنوان مسیر و حداقل یک ایستگاه را کامل وارد کنید.");
        }
        const body: UpsertPathwayBody = {
          title,
          description: String(rule.description ?? "").trim() || null,
          gender: String(rule.gender ?? "همه"),
          minAge: rule.minAge === "" || rule.minAge == null ? null : Number(rule.minAge),
          maxAge: rule.maxAge === "" || rule.maxAge == null ? null : Number(rule.maxAge),
          jobCategory: String(rule.jobCategory ?? "همه"),
          isInLibrary: rule.isInLibrary === false ? false : true,
          estimatedTotalMinutes:
            rule.estimatedTotalMinutes === "" || rule.estimatedTotalMinutes == null
              ? null
              : Number(rule.estimatedTotalMinutes),
          stations: draftsToUpsertStations(stationDrafts),
        };
        const id = rule.id ? String(rule.id) : "";
        const saved = id ? await updatePathway(id, body) : await createPathway(body);
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: id ? "مسیر کتابخانه به‌روزرسانی شد." : "مسیر در کتابخانه ثبت شد." });
        return { ok: true, snapshot: snap, libraryRuleId: saved.id };
      }
      if (action === "DELETE_PATHWAY_LIBRARY_ITEM") {
        const id = String(payload.id ?? "").trim();
        if (!id) throw new Error("شناسه مسیر نامعتبر است.");
        try {
          await deletePathway(id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "حذف مسیر ممکن نیست.";
          throw new Error(msg);
        }
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "مسیر از کتابخانه حذف شد." });
        return { ok: true, snapshot: snap };
      }
      if (action === "ATTACH_PATHWAY_LIBRARY") {
        const serverId = String(payload.contractServerId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور قرارداد یافت نشد؛ صفحه را تازه کنید.");
        const libraryPathwayIds = (Array.isArray(payload.libraryRuleIds) ? payload.libraryRuleIds : [])
          .map((x) => String(x))
          .filter(Boolean);
        if (libraryPathwayIds.length === 0) throw new Error("هیچ مسیری برای اتصال انتخاب نشده است.");
        // بک‌اند LibraryPathwayIds می‌خواهد؛ نام قدیمی libraryRuleIds فقط از UI می‌آید
        const result = await apiFetch<{ recalculated?: number; needsManual?: number }>(
          `/api/contracts/${serverId}/pathway-rules/attach`,
          { method: "POST", body: { libraryPathwayIds } }
        );
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) {
          const bits = ["مسیر به قرارداد متصل شد"];
          if (result.needsManual)
            bits.push(`${result.needsManual} نفر پذیرش‌شده — بسته را در نوبت‌دهی دستی عوض کنید`);
          setToast({ text: `${bits.join("؛ ")}.` });
        }
        return { ok: true, snapshot: snap, ...result };
      }
      if (action === "DETACH_CONTRACT_PATHWAY") {
        const serverId = String(payload.contractServerId ?? "").trim();
        const ruleId = String(payload.ruleId ?? "").trim();
        if (!serverId || !ruleId) throw new Error("شناسه قرارداد یا قانون نامعتبر است.");
        const result = await apiFetch<{ recalculated?: number; needsManual?: number }>(
          `/api/contracts/${serverId}/pathway-rules/${ruleId}`,
          { method: "DELETE" }
        );
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) {
          const bits = ["مسیر از قرارداد جدا شد"];
          if (result.recalculated)
            bits.push(`${result.recalculated} نفر قبل از پذیرش → بدون مسیر / مسیر پیش‌فرض`);
          if (result.needsManual)
            bits.push(`${result.needsManual} نفر پذیرش‌شده — بسته را در نوبت‌دهی دستی عوض کنید`);
          setToast({ text: `${bits.join("؛ ")}.` });
        }
        return { ok: true, snapshot: snap, ...result };
      }
      if (action === "SAVE_CONTRACT_PATHWAY_RULES") {
        const serverId = String(payload.contractServerId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور قرارداد یافت نشد؛ صفحه را تازه کنید.");
        const rulesRaw = Array.isArray(payload.pathwayRules) ? payload.pathwayRules : [];
        const body = rulesRaw.map((r, idx) => {
          const row = r as Record<string, unknown>;
          const libraryPathwayId = row.libraryPathwayId ?? row.libraryRuleId;
          return {
            title: String(row.title ?? "").trim(),
            gender: String(row.gender ?? "همه"),
            minAge: row.minAge == null || row.minAge === "" ? null : Number(row.minAge),
            maxAge: row.maxAge == null || row.maxAge === "" ? null : Number(row.maxAge),
            jobCategory: String(row.jobCategory ?? "همه"),
            pathwayCode: String(row.pathwayCode ?? "").trim(),
            priority: Number(row.priority ?? idx + 1),
            libraryPathwayId: libraryPathwayId ? String(libraryPathwayId) : null,
          };
        });
        // skipMemberReapply فقط اولویت را ذخیره می‌کند؛ جابه‌جایی اعضا با بررسی مجدد
        const reapply = payload.skipMemberReapply === true ? "false" : "true";
        const result = await apiFetch<{ recalculated?: number; needsManual?: number }>(
          `/api/contracts/${serverId}/pathway-rules?reapplyMembers=${reapply}`,
          { method: "PUT", body }
        );
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) {
          const bits = ["قوانین مسیر قرارداد ذخیره شد"];
          if (result.needsManual)
            bits.push(`${result.needsManual} نفر پذیرش‌شده نیاز به تعیین دستی در نوبت‌دهی دارند`);
          setToast({ text: `${bits.join("؛ ")}.` });
        }
        return { ok: true, snapshot: snap, ...result };
      }
      if (action === "PREVIEW_PATHWAY_RECHECK") {
        const serverId = String(payload.contractServerId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور قرارداد یافت نشد؛ صفحه را تازه کنید.");
        const preview = await apiFetch<{ rows?: Array<Record<string, unknown>> }>(
          `/api/contracts/${serverId}/pathway-rules/recheck-preview`,
          { method: "POST", body: {} }
        );
        const rows = (Array.isArray(preview.rows) ? preview.rows : []).map((row) => ({
          memberId: String(row.memberId ?? ""),
          fullName: String(row.fullName ?? ""),
          currentPathwayTitle: row.currentPathwayTitle != null ? String(row.currentPathwayTitle) : null,
          proposedPathwayTitle: row.proposedPathwayTitle != null ? String(row.proposedPathwayTitle) : null,
          proposedMatchedTitle: row.proposedMatchedTitle != null ? String(row.proposedMatchedTitle) : null,
          wouldChange: Boolean(row.wouldChange),
          manualOverride: Boolean(row.manualOverride),
          admitted: Boolean(row.admitted),
          canApply: Boolean(row.canApply),
        }));
        return { ok: true, rows };
      }
      if (action === "APPLY_PATHWAY_RECHECK") {
        const serverId = String(payload.contractServerId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور قرارداد یافت نشد؛ صفحه را تازه کنید.");
        const memberIds = (Array.isArray(payload.memberIds) ? payload.memberIds : [])
          .map((x) => String(x).trim())
          .filter(Boolean);
        const result = await apiFetch<{ applied?: number; skipped?: number }>(
          `/api/contracts/${serverId}/pathway-rules/recheck-apply`,
          { method: "POST", body: { memberIds } }
        );
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: `مسیر برای ${result.applied ?? 0} نفر به‌روز شد.` });
        return { ok: true, snapshot: snap, applied: result.applied ?? 0, skipped: result.skipped ?? 0 };
      }
      if (action === "UPDATE_CONTRACT_MEMBER") {
        const memberServerId = String(payload.memberServerId ?? "").trim();
        if (!memberServerId) throw new Error("شناسه سرور عضو یافت نشد.");
        await apiFetch(`/api/contracts/members/${memberServerId}`, {
          method: "PUT",
          body: {
            firstName: String(payload.firstName ?? "").trim(),
            lastName: String(payload.lastName ?? "").trim(),
            nationalId: String(payload.nationalId ?? "").trim(),
            phone: normalizeMobile(String(payload.phone ?? "")),
            birthDate: String(payload.birthDate ?? "").slice(0, 10),
            gender: String(payload.gender ?? "").trim(),
            maritalStatus: payload.maritalStatus ? String(payload.maritalStatus).trim() : null,
            department: payload.department ? String(payload.department).trim() : null,
            jobCategory: payload.jobCategory ? String(payload.jobCategory).trim() : null,
            personnelCode: payload.personnelCode ? String(payload.personnelCode).trim() : null,
          },
        });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "مشخصات عضو به‌روز شد." });
        return { ok: true, snapshot: snap };
      }
      if (action === "DELETE_CONTRACT_MEMBER") {
        const memberServerId = String(payload.memberServerId ?? "").trim();
        if (!memberServerId) throw new Error("شناسه سرور عضو یافت نشد.");
        await apiFetch(`/api/contracts/members/${memberServerId}`, { method: "DELETE" });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "عضو از قرارداد حذف شد." });
        return { ok: true, snapshot: snap };
      }
      if (action === "OVERRIDE_MEMBER_PATHWAY") {
        const memberServerId = String(payload.memberServerId ?? "").trim();
        const pathwayCode = String(payload.pathwayCode ?? "").trim();
        if (!memberServerId || !pathwayCode) throw new Error("شناسه عضو یا کد مسیر نامعتبر است.");
        const pathwayTitle =
          String(payload.pathwayTitle ?? "").trim() ||
          snapshotRef.current.pathways.find((p) => p.code === pathwayCode)?.title ||
          pathwayCode;
        await apiFetch(`/api/contracts/members/${memberServerId}/pathway`, {
          method: "PUT",
          body: { pathwayCode, pathwayTitle },
        });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "مسیر سلامتی عضو به‌صورت دستی تنظیم شد." });
        return { ok: true, snapshot: snap };
      }
      if (action === "ADMIT_CONTRACT_MEMBER_TO_CLINIC") {
        const memberServerId = String(payload.memberServerId ?? "").trim();
        if (!memberServerId) throw new Error("شناسه سرور عضو یافت نشد.");
        const admitted = await apiFetch<{ id: string }>(`/api/contracts/members/${memberServerId}/admit`, {
          method: "POST",
        });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        if (!quiet) setToast({ text: "عضو در سیستم کلینیک پذیرش شد." });
        return { ok: true, snapshot: snap, createdPatientId: admitted.id };
      }
      if (action === "SEND_CONTRACT_BULK_SMS") {
        // قالب پلتفرم (templateId) + memberServerIds از UI (Guid)
        const contractServerId = String(payload.contractServerId ?? "").trim();
        if (!contractServerId) throw new Error("شناسه سرور قرارداد یافت نشد؛ صفحه را تازه کنید.");
        const templateId = String(payload.templateId ?? "").trim();
        if (!templateId) throw new Error("انتخاب قالب پیامک الزامی است.");
        const campaignTitle = String(payload.campaignTitle ?? "").trim() || undefined;
        let memberServerIds = (Array.isArray(payload.memberServerIds) ? payload.memberServerIds : [])
          .map((x) => String(x).trim())
          .filter(Boolean);
        if (memberServerIds.length === 0 && Array.isArray(payload.memberIds)) {
          const numericIds = new Set(
            payload.memberIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
          );
          const contract = snapshotRef.current.contracts.find((c) => c.serverId === contractServerId)
            ?? snapshotRef.current.contracts.find((c) => c.id === Number(payload.contractId));
          memberServerIds = (contract?.members ?? [])
            .filter((m) => numericIds.has(m.id) && m.serverId)
            .map((m) => String(m.serverId));
        }
        if (memberServerIds.length === 0) throw new Error("هیچ گیرنده‌ای برای پیامک انتخاب نشده است.");
        const result = await apiFetch<{ ok?: boolean; sent?: number }>(`/api/contracts/${contractServerId}/sms`, {
          method: "POST",
          body: { templateId, campaignTitle, memberIds: memberServerIds },
        });
        const snap = await loadWorkspaceSnapshot();
        setSnapshot(snap);
        const sent = Number(result.sent ?? memberServerIds.length);
        if (!quiet) setToast({ text: `پیامک دعوت برای ${sent} نفر ارسال شد.` });
        return { ok: true, snapshot: snap, sent };
      }
      // UC-SPC-01/02 — فهرست/جستجوی همهٔ بیماران کلینیک برای پزشک
      if (action === "SEARCH_SPECIALIST_PATIENTS" || action === "SEARCH_PATIENT_DIRECTORY") {
        if (!hasApiRole("Specialist", "Admin", "Platform")) {
          throw new Error("جستجوی بیماران فقط برای نقش پزشک (یا ادمین) در نشست فعلی مجاز است.");
        }
        const clinicId =
          String(payload.clinicId ?? "").trim() ||
          snapshotRef.current.platform.clinics.find((c) => c.isCurrentTenant)?.id ||
          snapshotRef.current.platform.clinics[0]?.id ||
          "";
        if (!clinicId) throw new Error("کلینیک جاری یافت نشد.");
        const q = payload.query != null ? String(payload.query) : "";
        const take = Math.min(100, Math.max(1, Number(payload.take ?? 50) || 50));
        const rows = await searchPatients(clinicId, q, take);
        const candidates = rows.map(mapApiPatientToDirectoryRow);
        return { ok: true, candidates };
      }
      // UC-SPC-03 — استعلام کدملی
      if (action === "LOOKUP_PATIENT_BY_NATIONAL_ID") {
        if (!hasApiRole("Specialist", "Admin", "Platform")) {
          throw new Error("استعلام کدملی برای نقش فعلی نشست مجاز نیست.");
        }
        const clinicId =
          String(payload.clinicId ?? "").trim() ||
          snapshotRef.current.platform.clinics.find((c) => c.isCurrentTenant)?.id ||
          snapshotRef.current.platform.clinics[0]?.id ||
          "";
        if (!clinicId) throw new Error("کلینیک جاری یافت نشد.");
        const nationalId = String(payload.nationalId ?? "").trim();
        if (!nationalId) throw new Error("کد ملی را وارد کنید.");
        const result = await lookupPatientByNationalId(clinicId, nationalId);
        const candidate = result.patient ? mapApiPatientToDirectoryRow(result.patient) : null;
        return {
          ok: true,
          found: Boolean(result.found && result.patient),
          blocked: Boolean(result.blocked),
          error: result.error ?? null,
          candidate,
        };
      }
      // UC-SPC-04/05/06 — hydrate chart + پاسخ submitted + مدارک
      if (action === "OPEN_SPECIALIST_CHART") {
        if (!hasApiRole("Specialist")) {
          // chart فقط نقش Specialist در API؛ سوئیچ UI کافی نیست
          throw new Error("باز کردن پرونده پزشکی به نقش پزشک در نشست فعلی نیاز دارد.");
        }
        const serverId = String(payload.serverPatientId ?? payload.patientServerId ?? "").trim();
        if (!serverId) throw new Error("شناسه سرور بیمار یافت نشد.");
        const chart = await fetchPatientChart(serverId);
        let formResponse: FormResponse | null = null;
        const formId = chart.formId ? String(chart.formId) : "";
        if (formId) {
          const mapped = await fetchSpecialistFormResponse(serverId, formId);
          if (mapped) {
            const localId = mapApiPatientToDirectoryRow(chart.patient).localId;
            formResponse = {
              id: mapped.id,
              patientId: localId,
              formId: mapped.formId,
              formCode: mapped.formCode,
              formVersion: 1,
              formVersionId: mapped.formId,
              status: mapped.status,
              startedAt: mapped.submittedAt ?? new Date().toISOString(),
              updatedAt: mapped.submittedAt ?? new Date().toISOString(),
              completedAt: mapped.submittedAt,
              answers: mapped.answers,
              context: {
                gender: chart.patient.gender ?? "",
                age: chart.patient.age ?? 0,
                maritalStatus: chart.patient.maritalStatus ?? "",
              },
            };
          }
        }
        let documents: PatientIntakeDocumentGroup[] = [];
        try {
          documents = await fetchMappedIntakeDocuments(serverId);
        } catch {
          // نبود مدرک نباید باز شدن chart را بشکند
          documents = [];
        }
        const merged = mergeSpecialistChart(chart, formResponse, documents);
        setSnapshot((prev) => {
          const others = prev.patients.filter(
            (p) => p.serverId !== serverId && p.id !== merged.id
          );
          return { ...prev, patients: [...others, merged] };
        });
        if (!quiet) setToast({ text: `پرونده «${merged.fullName}» بارگذاری شد.` });
        return { ok: true, patientId: merged.id, serverId, patient: merged };
      }
      if (action === "RESET_MOCK_DATA") {
        throw new Error(
          "بازنشانی دادهٔ نمایشی از این بخش پشتیبانی نمی‌شود. از ریست فکتوری پلتفرم (محیط غیر production) استفاده کنید."
        );
      }
      // برچسب فارسی برای toast — کد انگلیسی اکشن به کاربر نشان داده نمی‌شود
      const unwiredActionFa: Record<string, string> = {
        PIN_MEMBER_DATE: "ثبت نوبت دستی",
        UPSERT_DAY_QUOTA: "تعیین سقف روزانه",
        AUTO_FILL_DAY: "توزیع خودکار نوبت",
        SEND_DAY_CALLS: "فراخوان روزانه",
        UPDATE_CONTRACT_API: "تنظیم API قرارداد",
        SYNC_CONTRACT_FROM_API: "همگام‌سازی از API",
      };
      const actionFa = unwiredActionFa[action];
      throw new Error(
        actionFa
          ? `عملیات «${actionFa}» هنوز به سامانه وصل نشده است.`
          : "این عملیات هنوز به سامانه وصل نشده است."
      );
    } catch (e) {
      // فریم‌های silent ضدتقلب UI را با toast پر نکنند؛ مگر notifyError (مثلاً نقطهٔ اول GPS)
      if (!quiet || notifyError) setToast({ text: e instanceof Error ? e.message : "خطا در انجام عملیات", error: true });
      throw e;
    } finally {
      if (blockUi) setBusy(false);
    }
  }, []);

  // نتیجهٔ execute (مثلاً createdContractId) باید به Hub برگردد
  const act = async (payload: Record<string, unknown>) => execute(payload);

  const switchRole = async (next: WorkspaceRole, opts?: { page?: AppPage; contractId?: number }) => {
    setRoleOpen(false);
    // جلوگیری از سوئیچ به نقش خارج از سلسله‌مراتب (مثلاً ادمین کلینیک → ادمین کل)
    if (!allowedRolesFor(user).includes(next)) {
      setToast({ text: "این نقش برای حساب شما مجاز نیست.", error: true });
      return;
    }
    setRequestRole(next);
    writeStoredRole(next);
    setRole(next);
    if (typeof opts?.contractId === "number") setSupervisorFocusContractId(opts.contractId);
    const target = selectableRoles().find((r) => r.id === next) ?? selectableRoles()[0] ?? ROLES[0];
    // از قرارداد: مستقیم به رستر ناظر همان قرارداد
    navigate(opts?.page ?? target.page);
    setSnapshot(await loadWorkspaceSnapshot());
    setToast({ text: `نقش «${target.label}» فعال شد؛ حساب شما تغییری نکرده است.` });
  };

  const logout = async () => {
    stopOwnerGpsWatch();
    await signOut();
    navigateTo("/login", { replace: true });
  };

  useEffect(() => {
    return () => stopOwnerGpsWatch();
  }, []);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    // Owner پروفایل پرونده را از OwnerProfileForm ذخیره می‌کند
    if (role === "owner" && activePatient?.serverId) return;
    setBusy(true);
    try {
      const fullName = normalizePersianLetters(profileName.trim());
      const jobTitle = normalizePersianLetters(profileTitle.trim());
      setUser({ ...user, fullName, jobTitle });
      setProfileOpen(false);
      setToast({ text: "نام نمایشی در این نشست به‌روز شد." });
    } catch {
      setToast({ text: "ذخیره حساب انجام نشد.", error: true });
    } finally {
      setBusy(false);
    }
  };

  const receptionSection = current === "admission" ? "checkin" : current === "queues" ? "queue" : current === "alerts" ? "alerts" : "flow";
  const specialistSection = current === "clinical-notes" ? "notes" : current === "clinical-complete" ? "complete" : "brief";
  const paraclinicSection = current === "diagnostics-tracker" ? "tracker" : current === "diagnostics-upload" ? "upload" : "queue";
  const adminSection = current === "pathways" ? "pathways" : current === "rooms" ? "rooms" : current === "team" ? "staff" : current === "forms" ? "forms" : "kpi";
  const platformSection: PlatformSection =
    current === "platform-users"
      ? "users"
      : current === "platform-fraud"
        ? "fraud"
        : current === "platform-health"
          ? "health"
          : current === "platform-settings"
            ? "settings"
            : current === "platform-integrations"
              ? "integrations"
              : current === "platform-audit"
                ? "audit"
                : "dashboard";

  const revokeOwnSession = async (_sessionId: string) => {
    await signOut();
    navigateTo("/login", { replace: true });
  };

  const revokeOtherOwnSessions = async () => {
    await apiFetch("/api/auth/sessions/revoke-others", { method: "POST" });
    setToast({ text: "سایر نشست‌ها قطع شد." });
  };

  const dismissJourneyIntro = async () => {
    if (!activePatient) return;
    await act({
      action: "DISMISS_JOURNEY_INTRO",
      patientId: activePatient.id,
      serverPatientId: activePatient.serverId ?? null,
    });
    setPreAdmitOpen(true);
    navigate("companion-intake");
  };

  /** ورود به پیش‌پذیرش در همین نشست — مسیر خانه مخفی می‌شود تا رفرش. */
  const enterPreAdmit = async () => {
    if (activePatient && !activePatient.journeyIntroSeen) {
      await act({
        action: "DISMISS_JOURNEY_INTRO",
        patientId: activePatient.id,
        serverPatientId: activePatient.serverId ?? null,
        silent: true,
      });
    }
    setPreAdmitOpen(true);
    navigate("companion-intake");
  };

  const renderHome = () => {
    if (role === "patient" || role === "owner") {
      return (
        <CompanionHome
          snapshot={snapshot}
          selectedPatientId={activeId}
          onSelectPatient={setSelectedPatientId}
          onNavigate={navigate}
          onEnterPreAdmit={() => void enterPreAdmit()}
          onAction={act}
          busy={busy}
          isSelf={isSelf}
          canViewReports={isSelf || Boolean(activeLink?.visibility.reports)}
          userId={user.id}
        />
      );
    }
    if (role === "specialist") {
      return <SpecialistProfile key="home-waiting" snapshot={snapshot} initialPatientId={activeId || undefined} onSwitchToPatientMobile={openPatient} onAction={act} busy={busy} initialSection="waiting" embedded sessionUserId={user.id} />;
    }
    if (role === "supervisor") {
      return (
        <CorporateSupervisorPanel
          snapshot={snapshot}
          user={user}
          initialView="overview"
          initialContractId={supervisorFocusContractId ?? undefined}
          onAction={execute}
          busy={busy}
        />
      );
    }
    return <ClinicDashboard snapshot={snapshot} user={user} role={role} onNavigate={navigate} />;
  };

  const groups = navConfig.groups
    .map((group) => ({ ...group, pages: filterNavPagesForGate(group.pages, ownerGated) }))
    .filter((group) => group.pages.length > 0);
  const mobileItems = filterNavPagesForGate(navConfig.mobile, ownerGated);
  const mobileColumns = mobileItems.length + (mobileItems.length < 5 ? 1 : 0);

  return (
    <div className="app-shell min-h-screen bg-[#f7f9fa] text-[#344844]">
      {mobileMenu && <button onClick={() => setMobileMenu(false)} aria-label="بستن منو" className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] lg:hidden" />}

      <aside className={`app-sidebar fixed inset-y-0 right-0 z-50 flex w-[238px] flex-col border-l border-[#e8eeeb] bg-white transition-transform duration-300 lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "translate-x-full"}`}>
        <button onClick={() => navigate(navConfig.home)} className="flex h-[87px] shrink-0 items-center gap-3 px-6 text-right">
          {/* آیکن محصول از icons/web — برند نمایشی نفس */}
          <span className="brand-mark flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] shadow-lg shadow-teal-800/10">
            <img src="/icon-64x64.png" alt="نفس" className="h-11 w-11 object-cover" />
          </span>
          <span>
            <strong className="block text-[18px] font-extrabold tracking-tight text-[#234e40]">سامانه نفس</strong>
            <span className="mt-1 block text-[9px] tracking-wide text-slate-400">مدیریت هوشمند، مراقبت یکپارچه</span>
          </span>
        </button>

        {canSwitchRole && (
          <div className="popover-container relative z-30 mx-4 mb-4 shrink-0">
            <button
              aria-label="تغییر نقش کاربری"
              aria-expanded={roleOpen}
              onClick={() => {
                setRoleOpen(!roleOpen);
                setAccountOpen(false);
                setNotificationsOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-3 text-right transition ${roleOpen ? "border-teal-300 bg-teal-50" : "border-[#e4eee8] bg-[#f5f9f6] hover:border-teal-200"}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#dce8e0] bg-white text-[#5a836d]">
                <Workflow className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-[9px] text-[#8aa092]">نقش فعال شما</span>
                <strong className="mt-0.5 block text-[12px] font-semibold text-[#355b45]">{activeRole.label}</strong>
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-[#789080] transition ${roleOpen ? "rotate-180" : ""}`} />
            </button>
            {roleOpen && (
              <div className="absolute top-full right-0 left-0 mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-800/10">
                <div className="px-2 py-2 text-[10px] text-slate-400">تغییر نقش، بدون تغییر حساب کاربری</div>
                {switchableRoles.map((r) => (
                  <button key={r.id} onClick={() => void switchRole(r.id)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2.5 text-right hover:bg-slate-50 ${role === r.id ? "bg-teal-50/70" : ""}`}>
                    <span>
                      <strong className="block text-[11px] font-semibold text-slate-600">{r.label}</strong>
                      <span className="mt-1 block text-[9px] text-slate-400">{r.description}</span>
                    </span>
                    {role === r.id && <Check className="h-3.5 w-3.5 text-teal-600" />}
                  </button>
                ))}
                <div className="m-1 flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-2 text-[9px] text-slate-500">
                  <ShieldCheck className="h-3 w-3 text-teal-600" />
                  فقط ادمین کل می‌تواند وارد فضای کاری نقش‌های دیگر شود؛ حساب واقعی شما ثابت می‌ماند.
                </div>
              </div>
            )}
          </div>
        )}

        <nav aria-label="منوی اصلی" className="flex-1 overflow-y-auto px-4 pb-3">
          {groups.map((group) => (
            <div key={group.title} className="mb-4">
              <div className="mb-2 px-3 text-[9px] font-medium text-[#a4b1ac]">{group.title}</div>
              <div className="space-y-0.5">
                {group.pages.map((target) => {
                  const Icon = PAGE_ICONS[target];
                  const active = current === target;
                  const badge = target === "alerts" && role !== "patient" ? unread.length : 0;
                  return (
                    <button
                      key={target}
                      onClick={() => navigate(target)}
                      aria-current={active ? "page" : undefined}
                      className={`sidebar-link group flex w-full items-center gap-3 rounded-lg px-3 py-[10px] text-right text-[11px] transition ${active ? "active bg-[#eaf5ef] font-semibold text-[#217353]" : "text-[#7e8d87] hover:bg-[#f6f8f7] hover:text-[#3f6854]"}`}
                    >
                      <Icon className={`h-[17px] w-[17px] shrink-0 stroke-[1.65] ${active ? "text-[#29825b]" : "text-[#90a098]"}`} />
                      <span className="flex-1">{labelFor(role, target)}</span>
                      {badge > 0 && <span className="min-w-5 rounded-md bg-[#fff3e8] px-1 py-0.5 text-center text-[9px] text-[#c08d57]">{toFaDigits(badge)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-100 px-4 py-3">
          <p className="px-1 text-center text-[10px] text-slate-400">
            نسخه {toFaDigits(import.meta.env.VITE_APP_VERSION || "2.5.1")}
          </p>
        </div>
      </aside>

      <div className="min-w-0 lg:mr-[238px]">
        <header className="app-topbar sticky top-0 z-30 flex h-[77px] items-center justify-between gap-4 border-b border-[#e7edeb] bg-white/95 px-5 backdrop-blur-lg lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded-lg p-1 text-slate-500 lg:hidden" onClick={() => setMobileMenu(true)} aria-label="باز کردن منوی اصلی">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-1.5 whitespace-nowrap text-[10px] text-slate-400 xl:flex">
              <Hospital className="h-3.5 w-3.5" />
              <span>نفس</span>
              <ChevronLeft className="h-3 w-3 text-slate-300" />
              <span className="text-slate-600">{role === "patient" && isSelf ? "سلامتجو" : activeRole.label}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-[10px] text-slate-400 2xl:block">{date}</div>
            <div className="popover-container relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setAccountOpen(false);
                  setRoleOpen(false);
                }}
                aria-label="اعلان‌ها"
                className="relative rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"
              >
                <Bell className="h-[19px] w-[19px] stroke-[1.5]" />
                {unread.length > 0 && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full border border-white bg-[#ec9476]" />}
              </button>
              {notificationsOpen && (
                <div className="absolute top-full left-0 z-50 mt-4 w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold">مرکز اعلان‌ها</h3>
                    <span className="text-[10px] text-slate-400">{toFaDigits(unread.length)} خوانده‌نشده</span>
                  </div>
                  <div className="max-h-72 space-y-1 overflow-y-auto">
                    {unread.slice(0, 8).map((a) => (
                      <button key={a.id} onClick={() => openPatient(a.patientId)} className="w-full rounded-xl bg-slate-50 p-2.5 text-right hover:bg-teal-50">
                        <span className="text-[10px] font-semibold text-slate-600">{a.patient}</span>
                        <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-slate-400">{a.message}</p>
                      </button>
                    ))}
                    {unread.length === 0 && <p className="py-8 text-center text-[11px] text-slate-400">اعلان جدیدی ندارید.</p>}
                  </div>
                </div>
              )}
            </div>
            <span className="h-7 w-px bg-slate-100" />
            <div className="popover-container relative">
              <button
                onClick={() => {
                  setAccountOpen(!accountOpen);
                  setRoleOpen(false);
                  setNotificationsOpen(false);
                }}
                aria-label="حساب کاربری"
                className="flex items-center gap-2.5"
              >
                {topbarAvatarUrl ? (
                  <span className="flex h-9 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[50%] border border-[#e4ebdf] bg-[#eef2e9] shadow-sm">
                    <img src={topbarAvatarUrl} alt="" className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4ebdf] bg-[#eef2e9] text-[11px] font-semibold text-[#70845f]">
                    {initials(user.fullName)}
                  </span>
                )}
                <span className="hidden text-right md:block">
                  <strong className="block text-[11px] font-semibold text-slate-600">{user.fullName}</strong>
                  <span className="mt-1 flex items-center gap-1 text-[9px] text-slate-400">
                    <ShieldCheck className="h-2.5 w-2.5 text-teal-600" />
                    {user.primaryRole === "platform" ? "ادمین کل" : role === "supervisor" ? "ناظر سازمان" : activeRole.label}
                  </span>
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>
              {accountOpen && (
                <div className="absolute top-full left-0 mt-4 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <span className="block text-xs font-semibold">{user.fullName}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{user.username} · {role === "owner" ? "داشبورد سلامتجو" : role === "patient" ? "داشبورد همراه سلامتجو" : "حساب کادر کلینیک"}</span>
                  </div>
                  {(role === "patient" || role === "owner") && <div className="border-b border-slate-100 px-3 py-2"><div className="mb-1 text-[10px] font-semibold text-slate-500">پرونده فعال</div>{snapshot.patients.map((patient) => { const linked = snapshot.links.find((l) => l.userId === user.id && l.patientId === patient.id); return <button key={patient.id} onClick={() => { navigate("dashboard", patient.id); setAccountOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-right text-[11px] ${activeId === patient.id ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"}`}><span>{patient.fullName}<span className="mr-1 text-[9px] opacity-70">· {relationLabel(linked?.relationship)}</span></span>{activeId === patient.id && <Check className="h-3 w-3" />}</button>; })}{COMPANION_FEATURE_ENABLED && isSelf && <button onClick={() => navigate("patient-privacy")} className="mt-1 w-full rounded-lg px-2 py-2 text-right text-[11px] text-teal-700 hover:bg-teal-50">تنظیم نمایش اطلاعات برای همراه‌ها</button>}</div>}
                  <button onClick={() => { setProfileOpen(true); setAccountOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] text-slate-500 hover:bg-slate-50">
                    <UserRound className="h-3.5 w-3.5" />
                    تنظیمات حساب کاربری
                  </button>
                  <button onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] text-rose-500 hover:bg-rose-50">
                    <LogOut className="h-3.5 w-3.5" />
                    خروج از حساب
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1700px] px-4 pt-6 pb-24 md:px-6 lg:px-8 lg:pt-7 lg:pb-8">
          {current !== "dashboard" && (
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                <button onClick={() => navigate(navConfig.home)} className="hover:text-teal-700">
                  داشبورد
                </button>
                <ChevronLeft className="h-3 w-3" />
                <span>{PAGE_TITLES[current]}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-[22px] font-extrabold text-[#263e3c]">{labelFor(role, current)}</h1>
                <span className="flex items-center gap-1.5 rounded-lg border border-[#e4eee7] bg-white px-3 py-1.5 text-[10px] text-[#82978b]">
                  <ShieldCheck className="h-3 w-3 text-teal-600" />
                  نقش فعال: {activeRole.label}
                </span>
              </div>
            </div>
          )}

          {current === "dashboard" && renderHome()}

          {current === "journey-intro" && activePatient && (
            <JourneyIntroPage
              snapshot={snapshot}
              patientId={activePatient.id}
              onContinue={() => void dismissJourneyIntro()}
              onAction={act}
              busy={busy}
            />
          )}

          {current === "patients" && (
            <PatientRegistry key={`patients-${listQuery}`} snapshot={snapshot} initialQuery={listQuery} onNavigate={navigate} />
          )}

          {current === "records" && (
            <PatientWorkspace key={`record-${activeId}`} snapshot={snapshot} selectedPatientId={activeId} onSelectPatient={(id) => navigate("records", id)} onNavigate={navigate} onAction={act} busy={busy} />
          )}

          {["admission", "flow", "queues", "alerts"].includes(current) && role === "platform" && (
            <ReceptionProfile
              key={current}
              snapshot={snapshot}
              selectedPatientId={activeId}
              onSelectPatient={setSelectedPatientId}
              onSwitchToPatientMobile={openPatient}
              onAction={async (p) => { await execute(p); }}
              busy={busy}
              initialSection={receptionSection}
            />
          )}

          {["clinical", "clinical-notes", "clinical-complete"].includes(current) && (
            <SpecialistProfile
              key={`${current}-${activeId}`}
              snapshot={snapshot}
              initialPatientId={activeId || undefined}
              onSwitchToPatientMobile={openPatient}
              onAction={act}
              busy={busy}
              initialSection={specialistSection}
              embedded={role !== "admin"}
              sessionUserId={user.id}
            />
          )}

          {["diagnostics", "diagnostics-tracker", "diagnostics-upload"].includes(current) && role === "platform" && (
            <ParaclinicProfile
              key={current}
              snapshot={snapshot}
              onSwitchToPatientMobile={openPatient}
              onAction={act}
              busy={busy}
              initialSection={paraclinicSection}
              embedded
            />
          )}

          {["companion-intake", "companion-map", "companion-records"].includes(current) &&
            (activePatient && activeLink ? (
              current === "companion-records" ? <CycleReport patient={activePatient} canDownload={isSelf || Boolean(activeLink.visibility.reports)} /> : !isSelf && current === "companion-intake" ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-xs text-amber-900">پرسشنامه پیش‌پذیرش فقط در داشبورد خود سلامتجو تکمیل و نمایش داده می‌شود. شما می‌توانید مسیر را پیگیری کنید.</div> : !isSelf && current === "companion-map" && !activeLink.visibility.journey ? <div className="rounded-xl bg-white p-6 text-xs text-slate-600">سلامتجو اجازه نمایش نقشه و مسیر را به همراه فعال نکرده است.</div> :               <PatientMobileProfile
                  key={`${current}-${activePatient.id}`}
                  snapshot={snapshot}
                  selectedPatientId={activePatient.id}
                  onSelectPatient={setSelectedPatientId}
                  onAction={execute}
                  busy={busy}
                  userId={user.id}
                  desktop
                  hidePatientSwitch
                  hideTabBar
                  initialTab={companionTab}
                  readOnly={!isSelf}
                  lockNonIntakeTabs={lockNonIntakeTabs}
                />
            ) : (
              <div className="mx-auto max-w-xl rounded-2xl border border-slate-200/80 bg-white p-10 text-center">
                <p className="text-xs text-slate-400">
                  {COMPANION_FEATURE_ENABLED
                    ? "برای مشاهده این بخش ابتدا یک پرونده سلامتجو را به حساب خود متصل کنید."
                    : "پرونده‌ای برای این حساب یافت نشد. بخش اتصال همراه موقتاً غیرفعال است؛ با حساب سلامتجو وارد شوید."}
                </p>
                {COMPANION_FEATURE_ENABLED ? (
                  <button onClick={() => navigate("companion-links")} className="primary-button mt-5">
                    اتصال پرونده سلامتجو
                  </button>
                ) : (
                  <button type="button" onClick={() => navigate("dashboard")} className="primary-button mt-5">
                    بازگشت به داشبورد
                  </button>
                )}
              </div>
            ))}

          {COMPANION_FEATURE_PAGES.includes(current) && !COMPANION_FEATURE_ENABLED && (
            <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
              <p className="text-sm font-bold text-amber-950">بخش همراه موقتاً غیرفعال است</p>
              <p className="mt-2 text-xs leading-6 text-amber-900/80">
                اتصال همراه و تنظیم دسترسی همراه‌ها در فاز بعدی فعال می‌شود. مسیر خود سلامتجو (پرسشنامه، نقشه و گزارش) همچنان در دسترس است.
              </p>
              <button type="button" onClick={() => navigate("dashboard")} className="primary-button mt-5">
                بازگشت به داشبورد
              </button>
            </div>
          )}
          {COMPANION_FEATURE_ENABLED && current === "companion-links" && <CompanionLinks snapshot={snapshot} userId={user.id} onNavigate={navigate} onAction={act} busy={busy} />}
          {COMPANION_FEATURE_ENABLED && current === "patient-privacy" && (isSelf && activePatient ? <PatientPrivacySettings snapshot={snapshot} userId={user.id} patientId={activePatient.id} onAction={act} busy={busy} /> : <div className="rounded-xl bg-white p-6 text-xs text-slate-600">این تنظیمات فقط توسط خود سلامتجو قابل تغییر است.</div>)}

          {["contracts", "contract-packages", "contract-schedule", "contract-funnel"].includes(current) && (
            <CorporateContractsHub
              key={current}
              snapshot={snapshot}
              initialTab={
                current === "contract-schedule"
                  ? "schedule"
                  : current === "contract-funnel"
                    ? "funnel"
                    : current === "contract-packages"
                      ? "packages"
                      : // سایدبار «قرارداد» با داده → افراد؛ ایجاد جدید همچنان setTab(packages) می‌زند
                        "people"
              }
              onAction={async (p) => (await execute(p)) as unknown as Record<string, unknown>}
              onOpenPatientRecord={(pid) => navigate("records", pid)}
              onSwitchToSupervisor={(contractId) =>
                void switchRole("supervisor", { page: "supervisor-roster", contractId })
              }
              busy={busy}
            />
          )}

          {current === "rule-library" && (
            <AdminRuleLibrary
              snapshot={snapshot}
              onAction={async (p) => (await execute(p)) as unknown as Record<string, unknown>}
              busy={busy}
            />
          )}

          {current === "clinic-settings" && (
            <ClinicSettingsPanel snapshot={snapshot} onAction={execute} busy={busy} />
          )}

          {current === "supervisor-roster" && (
            <CorporateSupervisorPanel
              snapshot={snapshot}
              user={user}
              initialView="roster"
              initialContractId={supervisorFocusContractId ?? undefined}
              onAction={execute}
              busy={busy}
            />
          )}

          {["reports", "pathways", "rooms", "team", "forms"].includes(current) && <AdminProfile key={current} snapshot={snapshot} onAction={act} busy={busy} initialSection={adminSection} />}

          {current === "clinic-users" && (
            <PlatformAdminPanel
              key="clinic-users"
              snapshot={snapshot}
              onAction={execute}
              busy={busy}
              initialSection="users"
              userScope="clinic"
            />
          )}

          {current.startsWith("platform-") && (
            <PlatformAdminPanel
              key={current}
              snapshot={snapshot}
              onAction={execute}
              busy={busy}
              initialSection={platformSection}
              userScope="full"
            />
          )}
        </main>
      </div>

      <nav aria-label="ناوبری پایین" className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white/95 px-1 py-1.5 backdrop-blur-lg lg:hidden" style={{ gridTemplateColumns: `repeat(${mobileColumns}, minmax(0, 1fr))` }}>
        {mobileItems.map((item) => {
          const Icon = PAGE_ICONS[item];
          const active = current === item;
          return (
            <button key={item} onClick={() => navigate(item)} aria-current={active ? "page" : undefined} className={`relative flex flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] font-semibold transition ${active ? "text-teal-700" : "text-slate-400"}`}>
              <Icon className="h-[18px] w-[18px] stroke-[1.7]" />
              <span className="max-w-full truncate px-0.5">{shortLabelFor(role, item)}</span>
              {item === "alerts" && unread.length > 0 && <span className="absolute top-1 right-3 h-1.5 w-1.5 rounded-full bg-[#ec9476]" />}
            </button>
          );
        })}
        {mobileItems.length < 5 && (
          <button onClick={() => setMobileMenu(true)} className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] font-semibold text-slate-400">
            <Menu className="h-[18px] w-[18px] stroke-[1.7]" />
            <span>بیشتر</span>
          </button>
        )}
      </nav>

      {(toast || recordTip) && (
        <div className={`fixed right-4 bottom-24 left-4 z-[100] flex max-w-md flex-col gap-2 lg:right-auto lg:bottom-6 lg:left-6`}>
          {recordTip && (
            <div role="status" className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-600 shadow-xl">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-50">
                <UserRound className="h-3.5 w-3.5 text-slate-500" />
              </span>
              <span className="flex-1 text-[11px] leading-6">{recordTip}</span>
              <button type="button" onClick={() => setRecordTip(null)} aria-label="بستن پیام">
                <X className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          )}
          {toast && (
            <div role="status" className={`flex items-center gap-2.5 rounded-xl border bg-white px-4 py-3 shadow-xl ${toast.error ? "border-rose-200 text-rose-700" : "border-teal-200 text-teal-700"}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${toast.error ? "bg-rose-50" : "bg-teal-50"}`}>
                {toast.error ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="flex-1 text-[11px] leading-6">{toast.text}</span>
              <button type="button" onClick={() => setToast(null)} aria-label="بستن پیام">
                <X className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          )}
        </div>
      )}

      {(helpOpen || profileOpen) && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm" onClick={() => { setHelpOpen(false); setProfileOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label={profileOpen ? "تنظیمات حساب" : "راهنمای سامانه"} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold">{profileOpen ? "تنظیمات حساب کاربری" : "راهنمای استفاده از نفس"}</h2>
              <button onClick={() => { setHelpOpen(false); setProfileOpen(false); }} aria-label="بستن">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            {profileOpen ? (
              <div className="max-h-[80vh] space-y-4 overflow-y-auto">
                {role === "owner" && activePatient?.serverId ? (
                  <OwnerProfileForm
                    patient={activePatient}
                    busy={busy}
                    onSaved={(patch) => {
                      setSnapshot((prev) => ({
                        ...prev,
                        patients: prev.patients.map((p) =>
                          p.id === activePatient.id ? { ...p, ...patch } : p
                        ),
                      }));
                      if (patch.fullName) {
                        setUser((u) => ({ ...u, fullName: String(patch.fullName) }));
                        setProfileName(String(patch.fullName));
                      }
                      setToast({ text: "پروفایل پرونده به‌روز شد." });
                    }}
                    onError={(message) => setToast({ text: message, error: true })}
                  />
                ) : (
                  <form onSubmit={saveProfile} className="space-y-4">
                    <p className="rounded-xl bg-teal-50 p-3 text-[11px] leading-6 text-teal-800">
                      {canSwitchRole
                        ? "به‌عنوان ادمین کل می‌توانید از سایدبار وارد فضای کاری نقش‌های دیگر شوید؛ حساب واقعی شما تغییر نمی‌کند."
                        : "هر نقش فضای کاری مستقل دارد؛ نقش فعال شما از حساب ورود می‌آید و سوئیچ به نقش‌های دیگر فقط برای ادمین کل فعال است."}
                    </p>
                    <label className="app-label">
                      نام و نام خانوادگی
                      <AppInput required className="app-input mt-2" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                    </label>
                    <label className="app-label">
                      سمت سازمانی
                      <AppInput required className="app-input mt-2" value={profileTitle} onChange={(e) => setProfileTitle(e.target.value)} />
                    </label>
                    <button disabled={busy} className="primary-button w-full justify-center">
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      ذخیره تغییرات
                    </button>
                  </form>
                )}
                <ActiveSessionsPanel
                  sessions={snapshot.platform.authSessions ?? []}
                  busy={busy}
                  onRevoke={revokeOwnSession}
                  onRevokeOthers={revokeOtherOwnSessions}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { n: "۱", title: "از داشبورد سلامتجو شروع کنید", text: "در نقش سلامتجو، پرسشنامه پیش‌پذیرش را تکمیل کنید، مسیر درمان و نقشه را ببینید و گزارش پایانی را دریافت کنید." },
                  ...(COMPANION_FEATURE_ENABLED
                    ? [{ n: "۲", title: "سلامتجویان خود را متصل کنید", text: "از بخش سلامتجویان من، با کد QR و کد ملی سلامتجو پرونده را متصل کنید و سطح دسترسی را مشخص کنید." }]
                    : []),
                  // فقط وقتی سوئیچر سایدبار واقعاً دیده می‌شود این گام راهنما را نشان بده
                  ...(canSwitchRole
                    ? [{ n: COMPANION_FEATURE_ENABLED ? "۳" : "۲", title: "نقش کاری را تغییر دهید", text: "فقط ادمین کل می‌تواند از بالای منوی کناری وارد فضای کاری نقش‌های دیگر شود؛ سایر نقش‌ها مستقل‌اند." }]
                    : []),
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-xs text-teal-700">{s.n}</span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-700">{s.title}</h3>
                      <p className="mt-1 text-[11px] leading-6 text-slate-400">{s.text}</p>
                    </div>
                  </div>
                ))}
                <button onClick={() => setHelpOpen(false)} className="primary-button w-full justify-center">
                  متوجه شدم
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

