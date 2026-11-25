/*
 File: frontend/my/src/components/ClinicDashboard.tsx
 Description: داشبورد کلینیک؛ برای ادمین KPI قرارداد/مراجعه/پیش‌پذیرش امروز
 Parent Dependencies: clinic-admin-dashboard, AppInput, clinic types
 */
import { useEffect, useMemo, useState } from "react";
import { AppInput } from "@/components/AppInput";
import {
  ArrowLeft,
  ArrowUpLeft,
  Building2,
  CalendarCheck,
  Check,
  CheckCheck,
  ClipboardList,
  Clock3,
  FileCheck2,
  FlaskConical,
  HeartPulse,
  Hourglass,
  Layers3,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Sun,
  Users,
  Zap,
} from "lucide-react";
import type { AppUserDto, ClinicSnapshot, ContractMember, WorkspaceRole } from "@/types/clinic";
import type { AppPage } from "@/lib/workspace";
import {
  currentStation,
  matchesPatient,
  patientStatus,
  stationLabel,
  totalVisitMinutes,
} from "@/lib/workspace";
import {
  clinicDashboardTodayIso,
  computeAdminClinicDashboardStats,
} from "@/lib/clinic-admin-dashboard";
import { fetchContractMembersAll } from "@/lib/api/contracts";
import { formatFaDate, formatFaTime, toFaDigits } from "@/lib/persian";
import { PatientTable } from "./PatientTable";

interface Props {
  snapshot: ClinicSnapshot;
  user: AppUserDto;
  role?: WorkspaceRole;
  onNavigate: (page: AppPage, patientId?: number) => void;
}

type WorkTone = "amber" | "sky" | "violet" | "slate" | "red";

function toneDot(tone: WorkTone) {
  return tone === "amber"
    ? "bg-amber-500"
    : tone === "sky"
      ? "bg-sky-500"
      : tone === "violet"
        ? "bg-violet-500"
        : tone === "red"
          ? "bg-red-500"
          : "bg-slate-400";
}

function AdminClinicDashboard({ snapshot, user, onNavigate }: Omit<Props, "role">) {
  const [members, setMembers] = useState<ContractMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const todayIso = clinicDashboardTodayIso(snapshot.serverTime);
  const stats = useMemo(
    () => computeAdminClinicDashboardStats(snapshot.contracts, members, todayIso),
    [snapshot.contracts, members, todayIso]
  );

  useEffect(() => {
    let cancelled = false;
    const ids = snapshot.contracts.map((c) => c.serverId).filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      setMembers([]);
      setLoadingMembers(false);
      return;
    }
    setLoadingMembers(true);
    void Promise.all(
      ids.map((id) =>
        fetchContractMembersAll(id).catch(() => [] as ContractMember[])
      )
    ).then((lists) => {
      if (cancelled) return;
      setMembers(lists.flat());
      setLoadingMembers(false);
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot.contracts]);

  const visitsToday = useMemo(
    () => members.filter((m) => (m.scheduledVisitDate ?? "").slice(0, 10) === todayIso),
    [members, todayIso]
  );

  const shortName = user.fullName.includes("سعیدی") ? "دکتر سعیدی" : user.fullName;
  const kpis = [
    { label: "قرارداد", value: stats.contractsCount, icon: Building2, tone: "teal", page: "contracts" as AppPage },
    { label: "افراد", value: stats.membersCount, icon: Users, tone: "sky", page: "contracts" as AppPage },
    { label: "مراجعه امروز", value: stats.visitsToday, icon: CalendarCheck, tone: "violet", page: "contracts" as AppPage },
    { label: "پیش‌پذیرش امروز", value: stats.preAdmitToday, icon: ClipboardList, tone: "amber", page: "contracts" as AppPage },
    { label: "تکمیل امروز", value: stats.completionsToday, icon: FileCheck2, tone: "emerald", page: "contracts" as AppPage },
    { label: "در انتظار تکمیل", value: stats.pendingPreAdmit, icon: Hourglass, tone: "slate", page: "contracts" as AppPage },
  ];

  const toneClass: Record<string, string> = {
    teal: "bg-[#edf7f1] text-[#5c9e7d]",
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="dashboard-content space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[20px] font-extrabold tracking-tight text-[#203536] sm:text-[22px]">
            داشبورد کلینیک
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            سلام {shortName} · امروز {toFaDigits(formatFaDate(todayIso))}
            {loadingMembers ? " · در حال همگام‌سازی…" : ""}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          {formatFaTime(snapshot.serverTime)}
          {loadingMembers && <Loader2 className="h-3 w-3 animate-spin text-teal-600" />}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(({ label, value, icon: Icon, tone, page }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(page)}
            className="group rounded-2xl border border-[#e8eeeb] bg-white px-3.5 py-3.5 text-right transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_8px_20px_-12px_rgba(32,83,68,0.35)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneClass[tone] ?? toneClass.teal}`}>
                <Icon className="h-4 w-4 stroke-[1.7]" />
              </span>
              <ArrowLeft className="h-3.5 w-3.5 text-slate-200 transition group-hover:text-teal-500" />
            </div>
            <strong className="mt-3 block text-[26px] font-bold leading-none tracking-tight text-[#243f3c] tabular-fa">
              {toFaDigits(value)}
            </strong>
            <span className="mt-1.5 block text-[11px] font-medium text-slate-500">{label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-2xl border border-[#e6ebea] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3 sm:px-5">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold text-[#263e3c]">مراجعات برنامه‌ای امروز</h2>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">
                {toFaDigits(visitsToday.length)} نفر
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("contracts")}
              className="flex items-center gap-1.5 text-[10px] font-medium text-teal-700"
            >
              مدیریت افراد قرارداد
              <ArrowLeft className="h-3 w-3" />
            </button>
          </div>
          {loadingMembers ? (
            <p className="flex items-center justify-center gap-2 px-4 py-10 text-[11px] text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال بارگذاری اعضای قرارداد…
            </p>
          ) : visitsToday.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 mx-4 mb-4 px-4 py-8 text-center text-[11px] text-slate-500">
              برای امروز تاریخ مراجعه‌ای در رستر ثبت نشده است.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 px-2 pb-2">
              {visitsToday.slice(0, 12).map((m) => (
                <li key={m.serverId ?? m.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-slate-700">{m.fullName}</div>
                    <div className="mt-0.5 truncate text-[10px] text-slate-400">
                      {m.department || "—"} · {m.assignedPathwayTitle || m.matchedPathwayTitle || "مسیر نامشخص"}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-semibold ${
                      m.intakeCompleted || m.formStatus === "submitted"
                        ? "bg-teal-50 text-teal-700"
                        : m.formStatus === "draft"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {m.intakeCompleted || m.formStatus === "submitted"
                      ? "تکمیل‌شده"
                      : m.formStatus === "draft"
                        ? "پیش‌پذیرش"
                        : "در انتظار"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[#e6ebea] bg-white p-4 sm:p-5">
          <h2 className="text-[12px] font-bold text-[#263e3c]">میان‌برها</h2>
          <div className="mt-3 space-y-2">
            {(
              [
                ["contracts", "قرارداد"],
                ["forms", "فرم‌های پیش‌پذیرش"],
                ["clinic-users", "مدیریت کاربران"],
              ] as const
            ).map(([page, label]) => (
              <button
                key={page}
                type="button"
                onClick={() => onNavigate(page)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-right text-[11px] font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-white"
              >
                {label}
                <ArrowLeft className="h-3.5 w-3.5 text-teal-600" />
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-200/70 pt-4 text-[9px] text-slate-400 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <span>نفس • مراقبت پیوسته، مدیریت یکپارچه</span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-teal-500" />
          آمار امروز از رستر قرارداد و وضعیت پیش‌پذیرش محاسبه می‌شود.
        </span>
      </div>
    </div>
  );
}

function OpsClinicDashboard({ snapshot, user, role, onNavigate }: Props) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const canManageRooms = false;
  const canRunOps = role === "platform";
  const diagnosticsPage: AppPage = "diagnostics-upload";
  const stationsManagePage: AppPage = canRunOps ? "flow" : "patients";

  const stats = useMemo(() => {
    const active = snapshot.patients.filter((p) => !p.completedAt);
    const completed = snapshot.patients.filter((p) => Boolean(p.completedAt));
    const waiting = active.filter((p) => currentStation(p)?.status === "waiting");
    const duration = snapshot.patients.map((p) => totalVisitMinutes(p, snapshot.serverTime));
    const avgMinutes = duration.length
      ? Math.round(duration.reduce((a, b) => a + b, 0) / duration.length)
      : 0;
    const rooms = snapshot.rooms.map((room) => {
      const entries = snapshot.patients.flatMap((p) =>
        p.stations.filter((s) => s.roomCode === room.code)
      );
      const here = entries.filter((s) =>
        ["waiting", "checked_in", "in_progress"].includes(s.status)
      );
      const visited = entries.filter((s) => s.spentMinutes > 0);
      const avg = visited.length
        ? Math.round(visited.reduce((sum, s) => sum + s.spentMinutes, 0) / visited.length)
        : 0;
      return {
        room,
        count: here.length,
        completed: entries.filter((s) => s.status === "completed").length,
        avg,
        crowded: here.some((s) => s.spentMinutes >= 25) || here.length >= 3,
      };
    });
    const events = snapshot.patients
      .flatMap((p) => [
        ...p.clinicalNotes.map((n) => ({
          id: `n${n.id}`,
          title: `ویزیت ${stationLabel(n.roomCode)} ثبت شد`,
          sub: `${p.fullName} · ${n.doctorName}`,
          time: n.createdAt,
          patientId: p.id,
          type: "visit" as const,
        })),
        ...p.paraclinicResults.map((r) => ({
          id: `r${r.id}`,
          title: `نتیجه ${stationLabel(r.roomCode)} آماده شد`,
          sub: p.fullName,
          time: r.createdAt,
          patientId: p.id,
          type: "result" as const,
        })),
        {
          id: `p${p.id}`,
          title: "پذیرش سلامتجو انجام شد",
          sub: p.fullName,
          time: p.checkInTime,
          patientId: p.id,
          type: "admission" as const,
        },
      ])
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 4);

    const workboard = [
      ...active
        .filter((p) => !p.intakeCompleted)
        .map((p) => ({
          id: `intake-${p.id}`,
          title: "پرسشنامه پیش‌پذیرش ناتمام",
          sub: p.fullName,
          page: "admission" as AppPage,
          patientId: p.id as number | undefined,
          tone: "amber" as WorkTone,
        })),
      ...active
        .filter((p) => p.stations.some((s) => s.status === "waiting" && !s.checkedInAt))
        .map((p) => {
          const st = p.stations.find((s) => s.status === "waiting");
          return {
            id: `wait-${p.id}`,
            title: `در صف بدون اعلام حضور · ${st?.roomName ?? ""}`,
            sub: p.fullName,
            page: "queues" as AppPage,
            patientId: p.id as number | undefined,
            tone: "sky" as WorkTone,
          };
        }),
      ...active
        .filter((p) => p.stations.some((s) => s.status === "sample_taken"))
        .map((p) => {
          const st = p.stations.find((s) => s.status === "sample_taken");
          return {
            id: `sample-${p.id}`,
            title: `نمونه گرفته‌شده، منتظر آپلود · ${st?.roomName ?? ""}`,
            sub: p.fullName,
            page: diagnosticsPage,
            patientId: p.id as number | undefined,
            tone: "violet" as WorkTone,
          };
        }),
      ...snapshot.patients
        .flatMap((p) =>
          p.alerts
            .filter((a) => !a.isRead)
            .map((a) => ({
              id: `alert-${a.id}`,
              title: "اعلان خوانده‌نشده",
              sub: `${p.fullName} · ${a.message.slice(0, 48)}${a.message.length > 48 ? "…" : ""}`,
              page: "alerts" as AppPage,
              patientId: p.id as number | undefined,
              tone: "slate" as WorkTone,
            }))
        )
        .slice(0, 6),
      ...rooms
        .filter((r) => r.crowded)
        .map((r) => ({
          id: `crowd-${r.room.code}`,
          title: `گلوگاه صف · ${r.room.name}`,
          sub: `${toFaDigits(r.count)} نفر در ایستگاه`,
          page: "queues" as AppPage,
          patientId: undefined as number | undefined,
          tone: "red" as WorkTone,
        })),
    ].slice(0, 12);

    return { active, completed, waiting, avgMinutes, rooms, events, workboard };
  }, [snapshot, diagnosticsPage]);

  const filteredPatients = snapshot.patients.filter(
    (p) =>
      matchesPatient(p, query) &&
      (filter === "all" ||
        (filter === "active" && !p.completedAt) ||
        (filter === "waiting" && patientStatus(p).tone === "amber") ||
        (filter === "done" && Boolean(p.completedAt)))
  );
  const congested = stats.rooms.find((r) => r.crowded);
  const shortName = user.fullName.includes("سعیدی") ? "دکتر سعیدی" : user.fullName;
  const kpis = [
    {
      label: "کل مراجعین امروز",
      value: snapshot.patients.length,
      unit: "نفر",
      icon: Users,
      color: "teal",
      sub: `${toFaDigits(stats.active.length)} سلامتجو در کلینیک حضور دارند`,
      detail: "پذیرش‌های ثبت‌شده",
    },
    {
      label: "در حال دریافت خدمت",
      value: stats.active.length,
      unit: "نفر",
      icon: HeartPulse,
      color: "blue",
      sub: `${toFaDigits(stats.waiting.length)} نفر در انتظار نوبت`,
      detail: "جریان درمان فعال",
    },
    {
      label: "میانگین زمان حضور",
      value: stats.avgMinutes,
      unit: "دقیقه",
      icon: Clock3,
      color: "amber",
      sub: "از زمان پذیرش تا آخرین ایستگاه",
      detail: "بر اساس مراجعات امروز",
    },
    {
      label: "مراجعات تکمیل‌شده",
      value: stats.completed.length,
      unit: "نفر",
      icon: CheckCheck,
      color: "violet",
      sub: "پرونده نهایی آماده دریافت است",
      detail: "آماده ترخیص",
    },
  ];

  return (
    <div className="dashboard-content space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[10px] text-slate-400 sm:mb-1.5 sm:text-[11px]">
            <span>فضای کاری</span>
            <span>/</span>
            <span className="text-slate-600">نمای کلی</span>
          </div>
          <h1 className="text-[20px] font-extrabold tracking-tight text-[#203536] sm:text-[23px]">
            داشبورد کلینیک
          </h1>
          <p className="mt-1 text-[11px] text-slate-400 sm:mt-1.5 sm:text-xs">
            وضعیت امروز را یک‌جا ببینید و مدیریت کنید.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            به‌روزرسانی {formatFaTime(snapshot.serverTime)}
          </span>
          {canRunOps && (
            <button
              type="button"
              onClick={() => onNavigate("admission")}
              className="primary-button w-full justify-center sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              پذیرش سلامتجو جدید
            </button>
          )}
        </div>
      </div>

      <section className="welcome-banner relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-[#dcebe6] bg-[#edf6f1] px-4 py-4 sm:min-h-36 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-5 sm:px-6 sm:py-6">
        <div className="relative z-10 min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-[#6b9080] sm:mb-2">
            <Sun className="h-3.5 w-3.5 shrink-0" />
            یک روز تازه، فرصتی برای مراقبت بهتر
          </div>
          <h2 className="text-lg font-bold text-[#244e40] sm:text-xl">
            {role === "reception" ? "هماهنگی امروز پذیرش" : "سلام، " + shortName}
            <span className="mr-2 inline-block text-base sm:text-lg">✦</span>
          </h2>
          <p className="mt-1.5 max-w-xl text-[11px] leading-6 text-[#658276] sm:mt-2">
            {role === "reception" ? (
              <>
                امروز{" "}
                <strong className="font-bold text-[#2d7056]">
                  {toFaDigits(snapshot.patients.length)} سلامتجو
                </strong>{" "}
                در مسیر درمان هستند؛ پذیرش، صف‌ها و اعلان‌ها را از همین صفحه پیگیری کنید.
              </>
            ) : (
              <>
                امروز{" "}
                <strong className="font-bold text-[#2d7056]">
                  {toFaDigits(snapshot.patients.length)} سلامتجو
                </strong>{" "}
                همراه شما هستند. همه مراحل درمان، از پذیرش تا ترخیص، زیر نظر شماست.
              </>
            )}
          </p>
        </div>
        <div className="relative z-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-6 sm:pl-2">
          <div className="hidden items-center gap-2 lg:flex">
            {(
              [
                { Icon: Users, text: "پذیرش", done: true },
                { Icon: Stethoscope, text: "مراقبت", done: true },
                { Icon: ShieldCheck, text: "سلامت", done: false },
              ] as const
            ).map(({ Icon, text, done }, i) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      done
                        ? "border border-[#c5ddcf] bg-white/90 text-[#5b957b]"
                        : "bg-[#207659] text-white shadow-md shadow-teal-900/10"
                    }`}
                  >
                    <Icon className="h-5 w-5 stroke-[1.6]" />
                  </span>
                  <span className="text-[9px] text-[#6b9080]">{text}</span>
                </div>
                {i < 2 && <span className="mb-5 w-4 border-t border-dashed border-[#aacabb]" />}
              </div>
            ))}
          </div>
          {canRunOps ? (
            <button
              type="button"
              onClick={() => onNavigate("flow")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d3e5da] bg-white/80 px-4 py-2.5 text-[11px] font-semibold text-[#3f6e58] transition hover:bg-white sm:w-auto"
            >
              مشاهده جریان سلامتجویان
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate("patients")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d3e5da] bg-white/80 px-4 py-2.5 text-[11px] font-semibold text-[#3f6e58] transition hover:bg-white sm:w-auto"
            >
              فهرست سلامتجویان
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="pointer-events-none absolute -left-16 -top-36 hidden h-96 w-96 rounded-full border-[35px] border-white/25 sm:block" />
      </section>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        {kpis.map(({ label, value, unit, icon: Icon, color, sub, detail }) => (
          <div
            key={label}
            className="metric-card rounded-xl border border-[#e6ebea] bg-white p-3 sm:rounded-2xl sm:p-[18px]"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-medium leading-4 text-slate-500 sm:text-[11px]">
                {label}
              </span>
              <span className={`metric-icon metric-${color} shrink-0 scale-90 sm:scale-100`}>
                <Icon className="h-[18px] w-[18px] stroke-[1.7]" />
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-1 sm:gap-2">
              <strong className="text-[24px] font-bold leading-none tracking-tight text-[#263e3c] tabular-fa sm:text-[32px]">
                {toFaDigits(value)}
              </strong>
              <span className="text-[10px] text-slate-400 sm:text-[11px]">{unit}</span>
              <span className="mr-auto hidden text-[9px] text-slate-300 2xl:block">{detail}</span>
            </div>
            <div className="mt-2.5 flex items-start gap-1.5 border-t border-slate-50 pt-2 text-[9px] leading-4 text-slate-400 sm:mt-4 sm:pt-2.5 sm:text-[10px]">
              <span
                className={`mt-1 h-1 w-1 shrink-0 rounded-full ${
                  color === "amber" ? "bg-amber-400" : "bg-teal-400"
                }`}
              />
              <span className="line-clamp-2">{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {canRunOps && (
        <section className="rounded-2xl border border-[#e6ebea] bg-white p-3.5 sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] font-bold text-[#263e3c]">کارتابل عملیاتی کلینیک</h2>
              <p className="mt-0.5 text-[10px] leading-5 text-slate-400">
                موارد نیازمند اقدام — اقدام از صف‌ها، پذیرش یا تشخیص انجام می‌شود.
              </p>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {toFaDigits(stats.workboard.length)} مورد
            </span>
          </div>
          {stats.workboard.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center text-[11px] text-slate-500 sm:py-6">
              مورد معلقی برای پیگیری نیست.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {stats.workboard.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.page, item.patientId)}
                  className="min-h-14 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-right transition hover:border-teal-200 hover:bg-white active:bg-teal-50/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold leading-5 text-slate-800">
                      {item.title}
                    </span>
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(item.tone)}`}
                    />
                  </div>
                  <span className="mt-1 block truncate text-[10px] text-slate-500">{item.sub}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e6ebea] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 pt-4 pb-3 sm:gap-3 sm:px-5 sm:pt-5 sm:pb-4">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-[13px] font-bold text-[#263e3c]">سلامتجویان امروز</h2>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">
                {toFaDigits(snapshot.patients.length)} نفر
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("patients")}
              className="flex items-center gap-1.5 text-[10px] font-medium text-teal-700"
            >
              مشاهده همه
              <ArrowLeft className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-col gap-2.5 px-3.5 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:px-5">
            <div className="flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-slate-50 p-1 sm:w-auto">
              {(
                [
                  ["all", "همه"],
                  ["active", "فعال"],
                  ["waiting", "در انتظار"],
                  ["done", "تکمیل‌شده"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`shrink-0 rounded-md px-2.5 py-1.5 text-[10px] transition ${
                    filter === id
                      ? "bg-white font-semibold text-teal-700 shadow-sm shadow-slate-200/70"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex w-full items-center gap-1.5 rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-slate-400 sm:w-auto">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <AppInput
                aria-label="جستجو در سلامتجویان امروز"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی سلامتجو..."
                className="min-w-0 flex-1 bg-transparent text-[10px] outline-none sm:w-28 sm:flex-none"
              />
            </label>
          </div>
          <PatientTable
            patients={filteredPatients}
            rooms={snapshot.rooms}
            compact
            onOpen={(id) => onNavigate("records", id)}
          />
        </section>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-1 xl:space-y-0">
          <section className="relative overflow-hidden rounded-2xl bg-[#184e43] p-4 text-white sm:p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-[#91d9b2]" />
                وضعیت جریان درمان
              </span>
              <Zap className="h-4 w-4 text-[#91d9b2]" />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#93d8b5 ${
                    (snapshot.patients.length
                      ? stats.completed.length / snapshot.patients.length
                      : 0) * 360
                  }deg, #ffffff14 0deg)`,
                }}
              >
                <div className="flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full bg-[#184e43]">
                  <strong className="text-lg font-bold">
                    {toFaDigits(
                      snapshot.patients.length
                        ? Math.round((stats.completed.length / snapshot.patients.length) * 100)
                        : 0
                    )}
                    ٪
                  </strong>
                  <span className="text-[8px] text-white/45">تکمیل مسیر</span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold">مراقبت، بدون وقفه</div>
                <p className="mt-1.5 text-[10px] leading-5 text-white/55">
                  {toFaDigits(stats.active.length)} سلامتجو در مسیر درمان
                  <br />
                  {toFaDigits(stats.completed.length)} مراجعه تکمیل شده
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => onNavigate(canRunOps ? "queues" : "patients")}
                className="flex w-full items-center justify-between gap-2 text-right text-[10px] text-white/75"
              >
                <span className="min-w-0 truncate">
                  {congested
                    ? `نیاز به توجه: صف ${stationLabel(congested.room.code)}`
                    : "همه ایستگاه‌ها در وضعیت عادی هستند"}
                </span>
                <ArrowUpLeft className="h-3.5 w-3.5 shrink-0 text-[#a2dfbe]" />
              </button>
            </div>
            <div className="pointer-events-none absolute -left-12 -top-10 h-36 w-36 rounded-full border-[18px] border-white/[0.025]" />
          </section>

          <section className="rounded-2xl border border-[#e6ebea] bg-white px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-bold text-[#263e3c]">آخرین رویدادها</h2>
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            </div>
            <div className="mt-4 space-y-3.5">
              {stats.events.map((event, i) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onNavigate("records", event.patientId)}
                  className="relative flex w-full items-start gap-2.5 text-right"
                >
                  <span
                    className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                      event.type === "result"
                        ? "bg-blue-50 text-blue-500"
                        : "bg-teal-50 text-teal-600"
                    }`}
                  >
                    {event.type === "result" ? (
                      <FlaskConical className="h-3 w-3" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </span>
                  {i < stats.events.length - 1 && (
                    <span className="absolute top-7 right-3 h-6 border-r border-dashed border-slate-200" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate text-[10px] font-medium text-slate-600">
                        {event.title}
                      </span>
                      <span className="shrink-0 text-[9px] text-slate-300">
                        {formatFaTime(event.time)}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[9px] text-slate-400">
                      {event.sub}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Layers3 className="h-4 w-4 shrink-0 text-slate-400" />
            <h2 className="text-[13px] font-bold text-[#263e3c]">ایستگاه‌های کلینیک</h2>
            <span className="text-[10px] text-slate-400">
              {toFaDigits(snapshot.rooms.length)} ایستگاه فعال
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(stationsManagePage)}
            className="flex items-center gap-1.5 text-[10px] font-medium text-teal-700"
          >
            {canRunOps ? "مشاهده جریان" : "فهرست سلامتجویان"}
            <ArrowLeft className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 2xl:grid-cols-6">
          {stats.rooms.map(({ room, count, completed, crowded }) => (
            <button
              key={room.id}
              type="button"
              onClick={() => onNavigate(canRunOps ? "flow" : "patients")}
              className="rounded-xl border border-[#e6ebea] bg-white p-3 text-right transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-sm sm:p-3.5"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                    crowded ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-teal-600"
                  }`}
                >
                  {room.code === "ECG" || room.code === "CARDIO" ? (
                    <HeartPulse className="h-4 w-4 stroke-[1.6]" />
                  ) : room.category === "paraclinic" ? (
                    <FlaskConical className="h-4 w-4 stroke-[1.6]" />
                  ) : (
                    <Stethoscope className="h-4 w-4 stroke-[1.6]" />
                  )}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    crowded ? "bg-amber-400" : "bg-teal-400"
                  }`}
                />
              </div>
              <h3 className="mt-2.5 text-[11px] font-semibold text-slate-600">
                {stationLabel(room.code)}
              </h3>
              <p className="mt-1 text-[9px] text-slate-400">
                طبقه {toFaDigits(room.floor)}، اتاق {room.roomNumber}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2 text-[9px]">
                <span className={crowded ? "text-amber-600" : "text-slate-500"}>
                  {toFaDigits(count)} نفر در صف
                </span>
                <span className="text-slate-400">{toFaDigits(completed)} تکمیل</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-2 border-t border-slate-200/70 pt-4 text-[9px] text-slate-400 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <span>نفس • مراقبت پیوسته، مدیریت یکپارچه</span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-teal-500" />
          اطلاعات سلامتجویان در یک پرونده مشترک نگهداری می‌شود.
        </span>
      </div>
    </div>
  );
}

export function ClinicDashboard({ snapshot, user, role = "admin", onNavigate }: Props) {
  if (role === "admin") {
    return <AdminClinicDashboard snapshot={snapshot} user={user} onNavigate={onNavigate} />;
  }
  return <OpsClinicDashboard snapshot={snapshot} user={user} role={role} onNavigate={onNavigate} />;
}
