import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
  CircleHelp,
  ClipboardList,
  Compass,
  FileHeart,
  FileText,
  FlaskConical,
  GitBranch,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  Link2,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  Upload,
  UserPlus,
  UserRound,
  Users,
  Workflow,
  X,
} from "lucide-react";
import type { AppUserDto, ClinicSnapshot, WorkspaceRole } from "@/types/clinic";
import {
  allowedPagesFor,
  initials,
  labelFor,
  matchesPatient,
  PAGE_TITLES,
  permissionLabel,
  relationLabel,
  ROLE_NAV,
  ROLES,
  shortLabelFor,
  type AppPage,
} from "@/lib/workspace";
import { toFaDigits } from "@/lib/persian";
import { ClinicDashboard } from "./ClinicDashboard";
import { CompanionHome } from "./CompanionHome";
import { CompanionLinks } from "./CompanionLinks";
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
import { setRequestRole } from "@/lib/role-context";
import { dispatchClinicAction, readSnapshot, resetClientDb } from "@/lib/client-db";
import { mockStore } from "@/lib/mock-store";
import { signOut } from "@/lib/auth";
import { allowedRolesFor, writeStoredRole } from "@/lib/viewer";

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
  "companion-intake": ClipboardList,
  "companion-map": Compass,
  "companion-records": FileText,
  "companion-links": Link2,
  "patient-privacy": ShieldCheck,
  contracts: Building2,
  "contract-packages": BookOpen,
  "contract-schedule": CalendarCheck,
  "contract-funnel": MessageSquareText,
  "supervisor-roster": Users,
  reports: ChartNoAxesCombined,
  pathways: GitBranch,
  rooms: Hospital,
  team: ShieldCheck,
};

export function ClinicOrchestratorApp({ initialSnapshot, user: initialUser, initialRole = "owner", initialPage = "dashboard", initialPatientId }: Props) {
  const navigateTo = useNavigate();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [user, setUser] = useState(initialUser);
  const [role, setRole] = useState<WorkspaceRole>(initialRole);
  const [page, setPage] = useState<AppPage>(initialPage);
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
  const [search, setSearch] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const hydrated = useRef(false);

  // The page already bootstrapped the browser database; refresh once on mount so a
  // deep link (?view=...) or a previously saved session is reflected immediately.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void (async () => {
      const next = await readSnapshot({ userId: user.id, role });
      setSnapshot(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep this tab's role on every clinic request (see lib/role-context).
  useEffect(() => { setRequestRole(role); }, [role]);

  const navConfig = ROLE_NAV[role];
  const activeRole = ROLES.find((r) => r.id === role) ?? ROLES[0];
  const current: AppPage = allowedPagesFor(role).includes(page) ? page : navConfig.home;
  const activePatient = snapshot.patients.find((p) => p.id === selectedPatientId) ?? snapshot.patients[0];
  const activeId = activePatient?.id ?? 0;
  const activeLink = snapshot.links.find((l) => l.patientId === activeId && l.userId === user.id);
  const isSelf = role === "owner";
  const canManage = (patientId: number) => snapshot.links.find((l) => l.patientId === patientId && l.userId === user.id)?.permission !== "follow";
  const unread = snapshot.patients.flatMap((p) => p.alerts.filter((a) => !a.isRead).map((a) => ({ ...a, patient: p.fullName })));
  const suggestions = search.trim() ? snapshot.patients.filter((p) => matchesPatient(p, search)).slice(0, 5) : [];
  const date = new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Tehran" }).format(new Date(snapshot.serverTime));
  const companionTab = current === "companion-intake" ? "intake" : current === "companion-map" ? "wayfinding" : "emr";

  const navigate = useCallback(
    (next: AppPage, patientId?: number) => {
      setPage(next);
      if (patientId) setSelectedPatientId(patientId);
      setMobileMenu(false);
      setSearch("");
      setAccountOpen(false);
      setNotificationsOpen(false);
      const params = new URLSearchParams({ view: next });
      const pid = patientId ?? selectedPatientId;
      if (pid) params.set("patient", String(pid));
      window.history.pushState(null, "", `/?${params}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [selectedPatientId]
  );

  const openPatient = (id: number) => navigate(role === "patient" || role === "owner" ? "dashboard" : "records", id);

  useEffect(() => {
    const back = () => {
      const q = new URLSearchParams(window.location.search);
      const target = q.get("view");
      setPage((target as AppPage) || "dashboard");
      if (q.get("patient")) setSelectedPatientId(Number(q.get("patient")));
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

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
        setSearch("");
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
      // Everything lives in the browser: re-read the local mock database.
      setSnapshot(await readSnapshot({ userId: user.id, role }));
    } catch (e) {
      if (!silent) setToast({ text: e instanceof Error ? e.message : "بارگذاری داده ممکن نشد.", error: true });
    } finally {
      if (!silent) setBusy(false);
    }
  }, [role, user.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && false) void refresh(true);
    }, 20000);
    return () => clearInterval(timer);
  }, [refresh]);

  const execute = useCallback(async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      if (payload.action === "RESET_MOCK_DATA") resetClientDb();
      const data = await dispatchClinicAction(payload, { viewer: { userId: user.id, role }, role });
      if (!data.ok) throw new Error(data.error ?? "ذخیره اطلاعات انجام نشد.");
      if (data.snapshot) setSnapshot(data.snapshot);
      setToast({ text: "تغییرات در این مرورگر ذخیره شد." });
      return data as { createdPatientId?: number; qrToken?: string; snapshot: ClinicSnapshot };
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "خطا در انجام عملیات", error: true });
      throw e;
    } finally {
      setBusy(false);
    }
  }, [role, user.id]);

  const act = async (payload: Record<string, unknown>) => {
    await execute(payload);
  };

  const switchRole = async (next: WorkspaceRole) => {
    setRoleOpen(false);
    setRequestRole(next);
    writeStoredRole(next);
    setRole(next);
    const target = ROLES.find((r) => r.id === next) ?? ROLES[0];
    navigate(target.page);
    setSnapshot(await readSnapshot({ userId: user.id, role: next }));
    setToast({ text: `نقش «${target.label}» فعال شد؛ حساب شما تغییری نکرده است.` });
  };

  const logout = async () => {
    signOut();
    navigateTo("/login", { replace: true });
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const row = mockStore.userById(user.id);
      if (!row) throw new Error("حساب کاربری پیدا نشد.");
      row.fullName = profileName.trim();
      row.jobTitle = profileTitle.trim();
      setUser({ ...user, fullName: row.fullName, jobTitle: row.jobTitle });
      setProfileOpen(false);
      setToast({ text: "اطلاعات حساب کاربری به‌روز شد." });
    } catch {
      setToast({ text: "ذخیره حساب انجام نشد.", error: true });
    } finally {
      setBusy(false);
    }
  };

  const receptionSection = current === "admission" ? "checkin" : current === "queues" ? "queue" : current === "alerts" ? "alerts" : "flow";
  const specialistSection = current === "clinical-notes" ? "notes" : current === "clinical-complete" ? "complete" : "brief";
  const paraclinicSection = current === "diagnostics-tracker" ? "tracker" : current === "diagnostics-upload" ? "upload" : "queue";
  const adminSection = current === "pathways" ? "pathways" : current === "rooms" ? "rooms" : current === "team" ? "staff" : "kpi";

  const renderHome = () => {
    if (role === "patient" || role === "owner") {
      return <CompanionHome snapshot={snapshot} selectedPatientId={activeId} onSelectPatient={setSelectedPatientId} onNavigate={navigate} onAction={act} busy={busy} isSelf={isSelf} canViewReports={isSelf || Boolean(activeLink?.visibility.reports)} userId={user.id} />;
    }
    if (role === "specialist") {
      return <SpecialistProfile key="home-waiting" snapshot={snapshot} initialPatientId={activeId || undefined} onSwitchToPatientMobile={openPatient} onAction={act} busy={busy} initialSection="waiting" embedded />;
    }
    if (role === "paraclinic") {
      return <ParaclinicProfile key="home-queue" snapshot={snapshot} onSwitchToPatientMobile={openPatient} onAction={act} busy={busy} initialSection="queue" embedded />;
    }
    if (role === "supervisor") {
      return <CorporateSupervisorPanel snapshot={snapshot} user={user} initialView="overview" onAction={execute} busy={busy} />;
    }
    return <ClinicDashboard snapshot={snapshot} user={user} role={role} onNavigate={navigate} />;
  };

  const groups = navConfig.groups;
  const mobileItems = navConfig.mobile;
  const mobileColumns = mobileItems.length + (mobileItems.length < 5 ? 1 : 0);

  return (
    <div className="app-shell min-h-screen bg-[#f7f9fa] text-[#344844]">
      {mobileMenu && <button onClick={() => setMobileMenu(false)} aria-label="بستن منو" className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] lg:hidden" />}

      <aside className={`app-sidebar fixed inset-y-0 right-0 z-50 flex w-[238px] flex-col border-l border-[#e8eeeb] bg-white transition-transform duration-300 lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "translate-x-full"}`}>
        <button onClick={() => navigate(navConfig.home)} className="flex h-[87px] shrink-0 items-center gap-3 px-6 text-right">
          <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#20745c] text-white shadow-lg shadow-teal-800/10">
            <HeartPulse className="h-6 w-6 stroke-[1.8]" />
          </span>
          <span>
            <strong className="block text-[21px] font-extrabold tracking-tight text-[#234e40]">
              نبض<span className="mr-1.5 text-[15px] font-medium text-[#415c50]">کلینیک</span>
            </strong>
            <span className="mt-1 block text-[9px] tracking-wide text-slate-400">مدیریت هوشمند، مراقبت یکپارچه</span>
          </span>
        </button>

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
              {ROLES.filter((r) => allowedRolesFor(user).includes(r.id)).map((r) => (
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
                تمام نقش‌ها برای حساب شما فعال است.
              </div>
            </div>
          )}
        </div>

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
          <button onClick={() => setHelpOpen(true)} className="flex w-full items-center gap-2.5 rounded-xl bg-[#f8faf8] px-3 py-2.5 text-right">
            <CircleHelp className="h-4 w-4 text-[#84a28c]" />
            <span className="flex-1 text-[10px] text-[#829188]">راهنما و پشتیبانی</span>
            <ArrowLeft className="h-3 w-3 text-[#a0afa5]" />
          </button>
          <div className="mt-3 flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[9px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              حافظه مرورگر (بدون بک‌اند)
            </span>
            <button
              type="button"
              onClick={async () => {
                resetClientDb();
                setSnapshot(await readSnapshot({ userId: user.id, role }));
                setToast({ text: "داده‌های اولیه فارسی بازنشانی شد." });
              }}
              className="text-[9px] text-slate-400 hover:text-teal-700"
            >
              بازنشانی
            </button>
          </div>
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
              <span>کلینیک تخصصی نبض</span>
              <ChevronLeft className="h-3 w-3 text-slate-300" />
              <span className="text-slate-600">{role === "patient" && isSelf ? "بیمار" : activeRole.label}</span>
            </div>
            <div className="relative hidden sm:block">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setListQuery(search);
                  navigate(role === "patient" || role === "owner" ? "dashboard" : "patients");
                }}
                className="flex items-center gap-2 rounded-lg border border-[#edf1ef] bg-[#f8faf9] px-3 py-2"
              >
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  aria-label="جستجوی سراسری بیمار"
                  placeholder={role === "patient" || role === "owner" ? "جستجو در پرونده‌های من..." : "جستجوی بیمار، کد ملی یا شماره پرونده..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-44 bg-transparent text-[10px] text-slate-600 outline-none 2xl:w-60"
                />
              </form>
              {search.trim() && (
                <div className="absolute top-full right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {suggestions.map((p) => (
                    <button key={p.id} onClick={() => openPatient(p.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-right hover:bg-teal-50">
                      <span className="text-[11px] font-medium text-slate-600">{p.fullName}</span>
                      <span className="text-[9px] text-slate-400">{toFaDigits(p.nationalId)}</span>
                    </button>
                  ))}
                  {suggestions.length === 0 && <p className="p-3 text-[11px] text-slate-400">پرونده‌ای پیدا نشد.</p>}
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {(role === "patient" || role === "owner") && activePatient && <button onClick={() => { setAccountOpen(true); setNotificationsOpen(false); }} className="hidden max-w-44 truncate rounded-lg bg-teal-50 px-2.5 py-1.5 text-[10px] font-semibold text-teal-800 sm:block" title="برای تغییر پرونده، منوی پروفایل را باز کنید">{isSelf ? `پرونده من: ${activePatient.fullName}` : `همراه: ${activePatient.fullName}`}</button>}
            <div className="hidden text-[10px] text-slate-400 2xl:block">{date}</div>
            <button aria-label="به‌روزرسانی اطلاعات" title="به‌روزرسانی اطلاعات" onClick={() => void refresh()} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-teal-600">
              <RefreshCw className={`h-4 w-4 stroke-[1.6] ${busy ? "animate-spin" : ""}`} />
            </button>
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
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4ebdf] bg-[#eef2e9] text-[11px] font-semibold text-[#70845f]">{initials(user.fullName)}</span>
                <span className="hidden text-right md:block">
                  <strong className="block text-[11px] font-semibold text-slate-600">{user.fullName}</strong>
                  <span className="mt-1 flex items-center gap-1 text-[9px] text-slate-400">
                    <ShieldCheck className="h-2.5 w-2.5 text-teal-600" />
                    {user.canAccessAllRoles ? "دسترسی کامل" : role === "supervisor" ? "ناظر سازمان" : activeRole.label}
                  </span>
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>
              {accountOpen && (
                <div className="absolute top-full left-0 mt-4 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <span className="block text-xs font-semibold">{user.fullName}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{user.username} · {role === "owner" ? "داشبورد بیمار" : role === "patient" ? "داشبورد همراه بیمار" : "حساب کادر کلینیک"}</span>
                  </div>
                  {(role === "patient" || role === "owner") && <div className="border-b border-slate-100 px-3 py-2"><div className="mb-1 text-[10px] font-semibold text-slate-500">پرونده فعال</div>{snapshot.patients.map((patient) => { const linked = snapshot.links.find((l) => l.userId === user.id && l.patientId === patient.id); return <button key={patient.id} onClick={() => { navigate("dashboard", patient.id); setAccountOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-right text-[11px] ${activeId === patient.id ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"}`}><span>{patient.fullName}<span className="mr-1 text-[9px] opacity-70">· {relationLabel(linked?.relationship)}</span></span>{activeId === patient.id && <Check className="h-3 w-3" />}</button>; })}{isSelf && <button onClick={() => navigate("patient-privacy")} className="mt-1 w-full rounded-lg px-2 py-2 text-right text-[11px] text-teal-700 hover:bg-teal-50">تنظیم نمایش اطلاعات برای همراه‌ها</button>}</div>}
                  <button onClick={() => { setProfileOpen(true); setAccountOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] text-slate-500 hover:bg-slate-50">
                    <UserRound className="h-3.5 w-3.5" />
                    تنظیمات حساب کاربری
                  </button>
                  <button onClick={() => { setAccountOpen(false); setRoleOpen(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] text-slate-500 hover:bg-slate-50">
                    <Workflow className="h-3.5 w-3.5" />
                    تغییر نقش فعال
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

          {current === "patients" && (
            <PatientRegistry key={`patients-${listQuery}`} snapshot={snapshot} initialQuery={listQuery} onNavigate={navigate} />
          )}

          {current === "records" && (
            <PatientWorkspace key={`record-${activeId}`} snapshot={snapshot} selectedPatientId={activeId} onSelectPatient={(id) => navigate("records", id)} onNavigate={navigate} onAction={act} busy={busy} />
          )}

          {["admission", "flow", "queues", "alerts"].includes(current) && (
            <ReceptionProfile
              key={current}
              snapshot={snapshot}
              selectedPatientId={activeId}
              onSelectPatient={setSelectedPatientId}
              onSwitchToPatientMobile={openPatient}
              onAction={execute}
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
            />
          )}

          {["diagnostics", "diagnostics-tracker", "diagnostics-upload"].includes(current) && (
            <ParaclinicProfile
              key={current}
              snapshot={snapshot}
              onSwitchToPatientMobile={openPatient}
              onAction={act}
              busy={busy}
              initialSection={paraclinicSection}
              embedded={role !== "admin"}
            />
          )}

          {["companion-intake", "companion-map", "companion-records"].includes(current) &&
            (activePatient && activeLink ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3">
                  <div className="text-[11px] text-slate-500">
                    پرونده فعال: <strong className="font-semibold text-slate-700">{activePatient.fullName}</strong> · {relationLabel(activeLink.relationship)} · {permissionLabel(activeLink.permission)}
                  </div>

                </div>
                {current === "companion-records" ? <CycleReport patient={activePatient} canDownload={isSelf || Boolean(activeLink.visibility.reports)} /> : !isSelf && current === "companion-intake" ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-xs text-amber-900">شرح حال بالینی فقط در داشبورد خود بیمار تکمیل و نمایش داده می‌شود. شما می‌توانید مسیر را پیگیری کنید.</div> : !isSelf && current === "companion-map" && !activeLink.visibility.journey ? <div className="rounded-xl bg-white p-6 text-xs text-slate-600">بیمار اجازه نمایش نقشه و مسیر را به همراه فعال نکرده است.</div> : <PatientMobileProfile
                  key={`${current}-${activePatient.id}`}
                  snapshot={snapshot}
                  selectedPatientId={activePatient.id}
                  onSelectPatient={setSelectedPatientId}
                  onAction={act}
                  busy={busy}
                  desktop
                  hidePatientSwitch
                  hideTabBar
                  initialTab={companionTab}
                  readOnly={!isSelf}
                />}
              </div>
            ) : (
              <div className="mx-auto max-w-xl rounded-2xl border border-slate-200/80 bg-white p-10 text-center">
                <p className="text-xs text-slate-400">برای مشاهده این بخش ابتدا یک پرونده بیمار را به حساب خود متصل کنید.</p>
                <button onClick={() => navigate("companion-links")} className="primary-button mt-5">
                  اتصال پرونده بیمار
                </button>
              </div>
            ))}

          {current === "companion-links" && <CompanionLinks snapshot={snapshot} userId={user.id} onNavigate={navigate} onAction={act} busy={busy} />}
          {current === "patient-privacy" && (isSelf && activePatient ? <PatientPrivacySettings snapshot={snapshot} userId={user.id} patientId={activePatient.id} onAction={act} busy={busy} /> : <div className="rounded-xl bg-white p-6 text-xs text-slate-600">این تنظیمات فقط توسط خود بیمار قابل تغییر است.</div>)}

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
                      : "people"
              }
              onAction={async (p) => (await execute(p)) as unknown as Record<string, unknown>}
              onOpenPatientRecord={(pid) => navigate("records", pid)}
              onSwitchToSupervisor={() => void switchRole("supervisor")}
              busy={busy}
            />
          )}

          {current === "supervisor-roster" && (
            <CorporateSupervisorPanel
              snapshot={snapshot}
              user={user}
              initialView="roster"
              onAction={execute}
              busy={busy}
            />
          )}

          {["reports", "pathways", "rooms", "team"].includes(current) && <AdminProfile key={current} snapshot={snapshot} onAction={act} busy={busy} initialSection={adminSection} />}
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

      {toast && (
        <div role="status" className={`fixed right-4 bottom-24 left-4 z-[100] flex max-w-md items-center gap-2.5 rounded-xl border bg-white px-4 py-3 shadow-xl lg:right-auto lg:bottom-6 lg:left-6 ${toast.error ? "border-rose-200 text-rose-700" : "border-teal-200 text-teal-700"}`}>
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${toast.error ? "bg-rose-50" : "bg-teal-50"}`}>
            {toast.error ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </span>
          <span className="text-[11px] leading-6">{toast.text}</span>
          <button onClick={() => setToast(null)} aria-label="بستن پیام">
            <X className="h-3 w-3 text-slate-400" />
          </button>
        </div>
      )}

      {(helpOpen || profileOpen) && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm" onClick={() => { setHelpOpen(false); setProfileOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label={profileOpen ? "تنظیمات حساب" : "راهنمای سامانه"} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold">{profileOpen ? "تنظیمات حساب کاربری" : "راهنمای استفاده از نبض کلینیک"}</h2>
              <button onClick={() => { setHelpOpen(false); setProfileOpen(false); }} aria-label="بستن">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            {profileOpen ? (
              <form onSubmit={saveProfile} className="space-y-4">
                <p className="rounded-xl bg-teal-50 p-3 text-[11px] leading-6 text-teal-800">همه نقش‌ها به همین حساب متصل‌اند. تغییر نقش نیازی به ورود مجدد ندارد.</p>
                <label className="app-label">
                  نام و نام خانوادگی
                  <input required className="app-input mt-2" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                </label>
                <label className="app-label">
                  سمت سازمانی
                  <input required className="app-input mt-2" value={profileTitle} onChange={(e) => setProfileTitle(e.target.value)} />
                </label>
                <button disabled={busy} className="primary-button w-full justify-center">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  ذخیره تغییرات
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {[
                  { n: "۱", title: "از همراه بیمار شروع کنید", text: "در نقش پیش‌فرض، پرونده بیماری را که با آن نسبت دارید ببینید، شرح حال را تکمیل کنید یا پیگیری کنید." },
                  { n: "۲", title: "بیماران خود را متصل کنید", text: "از بخش بیماران من، با کد QR و کد ملی بیمار پرونده را متصل کنید و سطح دسترسی را مشخص کنید." },
                  { n: "۳", title: "نقش کاری را تغییر دهید", text: "برای پذیرش، پزشک، پاراکلینیک یا مدیریت، نقش فعال را از بالای منوی کناری انتخاب کنید." },
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

