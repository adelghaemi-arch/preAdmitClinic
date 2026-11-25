/*
 File: frontend/src/components/AdminProfile.tsx
 Description: پنل ادمین کلینیک — بسته‌ها، کاتالوگ ایستگاه (UC-ADM-25) و فرم‌ساز
 Parent Dependencies: AppInput, clinic-actions, clinic-stations
 */
import React, { useMemo, useState } from "react";
import { AppInput, AppTextarea } from "@/components/AppInput";
import {
  AlertOctagon,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  GitBranch,
  Plus,
  Save,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";
import type { ClinicSnapshot, PathwayDto, RoomDto } from "@/types/clinic";
import { activeClinicRooms } from "@/lib/api/clinic-stations";
import { toFaDigits, toLatinDigits } from "@/lib/persian";
import { roomStaffDisplay, totalVisitMinutes } from "@/lib/workspace";
import { AdminFormsBuilder } from "./AdminFormsBuilder";

const STATION_CATEGORIES = [
  { value: "paraclinic", label: "پاراکلینیک" },
  { value: "specialist", label: "مطب تخصصی" },
  { value: "hospitality", label: "پذیرش / رفاهی" },
  { value: "remote", label: "از راه دور" },
  { value: "other", label: "سایر" },
] as const;

type AdminSection = "kpi" | "pathways" | "rooms" | "staff" | "forms";

interface AdminProfileProps {
  snapshot: ClinicSnapshot;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  initialSection?: AdminSection;
  onSectionChange?: (section: AdminSection) => void;
}

const ALL_PERMISSIONS = [
  "مشاهده پرسشنامه و آلرژی",
  "مشاهده نتایج پاراکلینیک",
  "مشاهده نظر سایر متخصصین",
  "ثبت تشخیص و نسخه",
  "ارجاع به ایستگاه جدید",
  "آپلود جواب آزمایش / تصویر",
  "مدیریت پویا صف‌ها",
];

export function AdminProfile({ snapshot, onAction, busy, initialSection = "kpi", onSectionChange }: AdminProfileProps) {
  const [section, setLocalSection] = useState<AdminSection>(initialSection);
  const setSection = (next: AdminSection) => { setLocalSection(next); onSectionChange?.(next); };
  const [savedNotice, setSavedNotice] = useState("");

  // Pathway Builder State
  const [editingPathwayId, setEditingPathwayId] = useState<number | null>(null);
  const [pkgTitle, setPkgTitle] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [pkgMinutes, setPkgMinutes] = useState("۹۵");
  const [pkgStations, setPkgStations] = useState<string[]>([
    "LAB",
    "ECG",
    "CARDIO",
    "DENTAL",
  ]);

  // Room Config Editor State — کاتالوگ ایستگاه (بدون صف)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(
    snapshot.rooms[0]?.id ?? 0
  );
  const selectedRoomObj = isCreatingRoom
    ? null
    : snapshot.rooms.find((r) => r.id === selectedRoomId) ?? snapshot.rooms[0] ?? null;

  const [roomCode, setRoomCode] = useState("");
  const [roomTitle, setRoomTitle] = useState(selectedRoomObj?.name ?? "");
  const [roomCategory, setRoomCategory] = useState(selectedRoomObj?.category ?? "other");
  const [roomFloor, setRoomFloor] = useState<number>(selectedRoomObj?.floor ?? 1);
  const [roomNum, setRoomNum] = useState<string>(selectedRoomObj?.roomNumber ?? "");
  const [roomPrep, setRoomPrep] = useState<string>(selectedRoomObj?.prepInstructions ?? "");
  const [roomSteps, setRoomSteps] = useState<string>(selectedRoomObj?.wayfindingSteps ?? "");
  const [roomActive, setRoomActive] = useState(selectedRoomObj?.isActive !== false);

  // Staff Form State
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [staffActive, setStaffActive] = useState(true);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("specialist");
  const [newStaffDept, setNewStaffDept] = useState("متخصص داخلی و غدد");
  const [newStaffRoom, setNewStaffRoom] = useState("CARDIO");
  const [newStaffCode, setNewStaffCode] = useState("۱۱۵۴۲۰");
  const [newStaffPerms, setNewStaffPerms] = useState<string[]>([
    "مشاهده پرسشنامه و آلرژی",
    "مشاهده نتایج پاراکلینیک",
    "ثبت تشخیص و نسخه",
  ]);

  // KPI & Bottleneck Analytics Computation
  const analytics = useMemo(() => {
    const totalPatients = snapshot.patients.length;
    const intakeDone = snapshot.patients.filter((p) => p.intakeCompleted).length;

    // Total minutes spent across stations per patient
    const dwellPerPatient = snapshot.patients.map((p) => totalVisitMinutes(p, snapshot.serverTime));
    const avgTotalDwell =
      dwellPerPatient.length > 0
        ? Math.round(
            dwellPerPatient.reduce((a, b) => a + b, 0) / dwellPerPatient.length
          )
        : 0;

    // Room-level bottleneck calculation
    const roomStats = snapshot.rooms.map((rm) => {
      const relevantStations = snapshot.patients.flatMap((p) =>
        p.stations.filter(
          (s) => s.roomCode === rm.code && s.spentMinutes > 0
        )
      );
      const activeQueueCount = snapshot.patients.filter((p) =>
        p.stations.some(
          (s) =>
            s.roomCode === rm.code &&
            (s.status === "waiting" ||
              s.status === "checked_in" ||
              s.status === "in_progress")
        )
      ).length;

      const avgSpent =
        relevantStations.length > 0
          ? Math.round(
              relevantStations.reduce((sum, s) => sum + s.spentMinutes, 0) /
                relevantStations.length
            )
          : rm.avgServiceMinutes;

      const delayRatio = avgSpent / Math.max(rm.avgServiceMinutes, 1);

      return {
        room: rm,
        avgSpent,
        activeQueueCount,
        delayRatio,
        isBottleneck: avgSpent > rm.avgServiceMinutes + 6 || activeQueueCount >= 2,
      };
    });

    const worstBottleneck = [...roomStats].sort(
      (a, b) => b.avgSpent - a.avgSpent
    )[0];

    return {
      totalPatients,
      intakeRate:
        totalPatients > 0 ? Math.round((intakeDone / totalPatients) * 100) : 0,
      avgTotalDwell,
      roomStats,
      worstBottleneck,
    };
  }, [snapshot]);

  const selectRoomForEdit = (rm: RoomDto) => {
    setIsCreatingRoom(false);
    setSelectedRoomId(rm.id);
    setRoomCode(rm.code);
    setRoomTitle(rm.name);
    setRoomCategory(rm.category || "other");
    setRoomFloor(rm.floor);
    setRoomNum(rm.roomNumber);
    setRoomPrep(rm.prepInstructions);
    setRoomSteps(rm.wayfindingSteps);
    setRoomActive(rm.isActive !== false);
  };

  const startCreateRoom = () => {
    setIsCreatingRoom(true);
    setSelectedRoomId(0);
    setRoomCode("");
    setRoomTitle("");
    setRoomCategory("paraclinic");
    setRoomFloor(1);
    setRoomNum("");
    setRoomPrep("");
    setRoomSteps("");
    setRoomActive(true);
  };

  const loadPathwayForEdit = (pkg: PathwayDto) => {
    setEditingPathwayId(pkg.id);
    setPkgTitle(pkg.title);
    setPkgDesc(pkg.description);
    setPkgMinutes(String(pkg.estimatedTotalMinutes));
    setPkgStations([...pkg.stationCodes]);
  };

  const toggleStationInPkg = (code: string) => {
    setPkgStations((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const handleSavePathway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgTitle.trim() || pkgStations.length === 0) return;

    const mins = Number(toLatinDigits(pkgMinutes)) || 90;

    await onAction({
      action: "UPSERT_PATHWAY",
      id: editingPathwayId,
      title: pkgTitle.trim(),
      description:
        pkgDesc.trim() || "مسیر استاندارد هماهنگ یک‌روزه نفس",
      stationCodes: pkgStations,
      estimatedTotalMinutes: mins,
    });

    setSavedNotice(
      editingPathwayId
        ? "پکیج درمانی با موفقیت ویرایش شد و در پنل پذیرش به‌روز گردید."
        : "پکیج درمانی جدید ایجاد شد و هم‌اکنون در پنل پذیرش قابل انتخاب است."
    );
    setEditingPathwayId(null);
    setPkgTitle("");
    setPkgDesc("");
    setTimeout(() => setSavedNotice(""), 4500);
  };

  const handleSaveRoomConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = roomTitle.trim();
    if (!title) return;

    if (isCreatingRoom) {
      const code = roomCode.trim().toUpperCase();
      if (!code) return;
      await onAction({
        action: "CREATE_CLINIC_STATION",
        code,
        titleFa: title,
        category: roomCategory,
        floor: roomFloor,
        roomNumber: roomNum,
        prepInstructions: roomPrep,
        wayfindingSteps: roomSteps,
        isActive: roomActive,
      });
      setIsCreatingRoom(false);
      setSavedNotice(`ایستگاه «${title}» به کاتالوگ کلینیک اضافه شد.`);
      setTimeout(() => setSavedNotice(""), 4500);
      return;
    }

    if (!selectedRoomObj?.serverId) {
      setSavedNotice("شناسه سرور ایستگاه موجود نیست؛ صفحه را تازه کنید.");
      setTimeout(() => setSavedNotice(""), 4500);
      return;
    }
    await onAction({
      action: "UPDATE_ROOM_CONFIG",
      serverId: selectedRoomObj.serverId,
      id: selectedRoomObj.id,
      titleFa: title,
      category: roomCategory,
      floor: roomFloor,
      roomNumber: roomNum,
      prepInstructions: roomPrep,
      wayfindingSteps: roomSteps,
      isActive: roomActive,
    });
    setSavedNotice(
      `تنظیمات ایستگاه «${title}» ذخیره شد؛ عنوان در مسیرهای دارای همین کد همگام می‌شود.`
    );
    setTimeout(() => setSavedNotice(""), 4500);
  };

  const handleToggleRoomActive = async (rm: RoomDto, next: boolean) => {
    if (!rm.serverId) return;
    await onAction({
      action: "SET_CLINIC_STATION_ACTIVE",
      serverId: rm.serverId,
      isActive: next,
    });
    if (selectedRoomObj?.id === rm.id) setRoomActive(next);
    setSavedNotice(
      next
        ? `ایستگاه «${rm.name}» فعال شد.`
        : `ایستگاه «${rm.name}» غیرفعال شد و از فهرست افزودن فوری پزشک حذف گردید.`
    );
    setTimeout(() => setSavedNotice(""), 4500);
  };

  const togglePermission = (perm: string) => {
    setNewStaffPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    await onAction({
      action: "UPSERT_STAFF_MEMBER",
      id: editingStaffId,
      fullName: newStaffName.trim(),
      role: newStaffRole,
      specialtyOrDept: newStaffDept.trim(),
      roomCode:
        newStaffRole === "specialist" || newStaffRole === "paraclinic"
          ? newStaffRoom
          : null,
      medicalCouncilCode: newStaffCode.trim() || "۱۲۰۹۸۷",
      permissions: newStaffPerms,
      isActive: staffActive,
    });
    setEditingStaffId(null); setStaffActive(true);
    setNewStaffName("");
    setSavedNotice("اطلاعات عضو کادر درمان و مجوزهای دسترسی ذخیره شد.");
    setTimeout(() => setSavedNotice(""), 4500);
  };

  return (
    <div className="module-content space-y-5">
      {/* Right-hand RTL Admin Sidebar */}
      

      {/* Main Admin Workspace */}
      <section className="min-w-0 space-y-5">
        {savedNotice && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900">
            {savedNotice}
          </div>
        )}

        {/* ================= 1. KPI & BOTTLENECK ANALYTICS ================= */}
        {section === "kpi" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h1 className="text-lg font-extrabold text-slate-900">
                داشبورد کلان بهره‌وری و شناسایی گلوگاه‌های زمانی (KPI & Bottlenecks)
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                تحلیل زنده زمان کل حضور سلامتجویان از ورود تا خروج و پایش صف بخش‌های
                تشخیصی و تخصصی
              </p>

              {/* Top 4 KPI Cards */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>میانگین زمان کل حضور سلامتجو</span>
                    <Clock className="h-4 w-4 text-sky-600" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-fa">
                    {toFaDigits(analytics.avgTotalDwell)} دقیقه
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                    بر اساس مدت زمان ثبت‌شده مراحل درمانی
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>تعداد سلامتجویان فعال امروز</span>
                    <Users className="h-4 w-4 text-teal-600" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-fa">
                    {toFaDigits(analytics.totalPatients)} سلامتجو
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    ۱۰۰٪ پذیرش بدون کاغذ با QR کد
                  </div>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-red-700">
                    <span>بیشترین گلوگاه زمانی امروز</span>
                    <AlertOctagon className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="mt-2 text-base font-extrabold text-red-950">
                    {analytics.worstBottleneck?.room.name}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-red-700">
                    میانگین توقف:{" "}
                    {toFaDigits(analytics.worstBottleneck?.avgSpent ?? 0)} دقیقه
                    (استاندارد:{" "}
                    {toFaDigits(
                      analytics.worstBottleneck?.room.avgServiceMinutes ?? 20
                    )}{" "}
                    دقیقه)
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>نرخ تکمیل پرسشنامه پیش‌پذیرش</span>
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-fa">
                    {toFaDigits(analytics.intakeRate)}٪
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    تکمیل‌شده توسط سلامتجو در سالن انتظار
                  </div>
                </div>
              </div>
            </div>

            {/* Department Dwell Time vs Target Bottleneck Chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">
                  نمودار مقایسه‌ای زمان انتظار و ویزیت در هر ایستگاه در برابر زمان
                  استاندارد
                </h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-red-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    گلوگاه دارای صف
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-sky-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
                    گردش روان و بهینه
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3.5">
                {analytics.roomStats.map((stat) => {
                  const pct = Math.min(Math.round((stat.avgSpent / 45) * 100), 100);
                  const targetPct = Math.min(
                    Math.round((stat.room.avgServiceMinutes / 45) * 100),
                    100
                  );
                  return (
                    <div key={stat.room.code} className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">
                            {stat.room.name} (طبقه{" "}
                            {toFaDigits(stat.room.floor)}، اتاق{" "}
                            {stat.room.roomNumber})
                          </span>
                          {stat.isBottleneck && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                              گلوگاه شناسایی‌شده
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600 tabular-fa">
                          عملکرد واقعی:{" "}
                          <strong className="text-slate-900">
                            {toFaDigits(stat.avgSpent)} دقیقه
                          </strong>{" "}
                          | هدف استاندارد:{" "}
                          {toFaDigits(stat.room.avgServiceMinutes)} دقیقه | صف
                          فعال: {toFaDigits(stat.activeQueueCount)} نفر
                        </div>
                      </div>

                      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            stat.isBottleneck ? "bg-red-500" : "bg-sky-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                        <div
                          title="زمان استاندارد"
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-900"
                          style={{ right: `${targetPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. CLINICAL PATHWAYS BUILDER ================= */}
        {section === "pathways" && (
          <div className="grid gap-5 lg:grid-cols-12">
            {/* Existing Pathways List */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900">
                  پکیج‌ها و مسیرهای درمانی یک‌روزه فعال
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPathwayId(null);
                    setPkgTitle("");
                    setPkgDesc("");
                    setPkgStations(["LAB", "ECG", "CARDIO"]);
                  }}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  + پکیج جدید
                </button>
              </div>

              {snapshot.pathways.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-slate-900">
                      {pkg.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => loadPathwayForEdit(pkg)}
                      className="rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50"
                    >
                      ویرایش مسیر
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {pkg.description}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {pkg.stationCodes.map((code, idx) => {
                      const rm = snapshot.rooms.find((r) => r.code === code);
                      return (
                        <span
                          key={`${code}-${idx}`}
                          className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 border border-slate-200"
                        >
                          {toFaDigits(idx + 1)}. {rm ? rm.name : code}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Create / Edit Pathway Form */}
            <form
              onSubmit={handleSavePathway}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-6"
            >
              <h2 className="text-base font-extrabold text-slate-900">
                {editingPathwayId
                  ? "ویرایش پکیج مسیر درمانی"
                  : "طراحی بسته چکاپ یک‌روزه جدید"}
              </h2>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  عنوان بسته درمانی
                </label>
                <AppInput
                  type="text"
                  required
                  value={pkgTitle}
                  onChange={(e) => setPkgTitle(e.target.value)}
                  placeholder="مثلاً: چکاپ جامع سلامت مدیران"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  شرح خدمات پکیج
                </label>
                <AppTextarea
                  rows={2}
                  value={pkgDesc}
                  onChange={(e) => setPkgDesc(e.target.value)}
                  placeholder="توضیح کوتاه جهت نمایش در پنل پذیرش..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  تخمین زمان کل مسیر (دقیقه)
                </label>
                <AppInput
                  type="text"
                  value={pkgMinutes}
                  onChange={(e) => setPkgMinutes(e.target.value)}
                  className="w-40 rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold text-slate-800">
                  انتخاب و تعیین ترتیب پیش‌فرض ایستگاه‌ها:
                </label>
                <div className="flex flex-wrap gap-2">
                  {activeClinicRooms(snapshot.rooms).map((rm) => {
                    const idx = pkgStations.indexOf(rm.code);
                    const active = idx !== -1;
                    return (
                      <button
                        key={rm.code}
                        type="button"
                        onClick={() => toggleStationInPkg(rm.code)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {active && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-400 text-[10px] text-slate-950">
                            {toFaDigits(idx + 1)}
                          </span>
                        )}
                        {rm.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {editingPathwayId
                  ? "ذخیره تغییرات پکیج درمانی"
                  : "ثبت و انتشار پکیج جدید"}
              </button>
            </form>
          </div>
        )}

        {/* ================= 3. ROOMS / STATION CATALOG (UC-ADM-25) ================= */}
        {section === "rooms" && (
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs lg:col-span-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">
                  کاتالوگ ایستگاه‌ها و اتاق‌ها
                </h2>
                <button
                  type="button"
                  onClick={startCreateRoom}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-extrabold text-sky-800 hover:bg-sky-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  ایستگاه جدید
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                فقط ایستگاه‌های فعال در «افزودن فوری» پزشک و نقشه موبایل دیده می‌شوند؛ صف و نوبت در این نسخه نیست.
              </p>
              {snapshot.rooms.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                  هنوز ایستگاهی ثبت نشده است.
                </div>
              )}
              {snapshot.rooms.map((rm) => {
                const selected = !isCreatingRoom && selectedRoomObj?.id === rm.id;
                const active = rm.isActive !== false;
                return (
                  <div
                    key={rm.serverId ?? rm.id}
                    className={`rounded-xl border p-3 text-xs transition ${
                      selected
                        ? "border-sky-600 bg-sky-50 font-bold text-sky-950"
                        : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectRoomForEdit(rm)}
                      className="flex w-full items-center justify-between text-right"
                    >
                      <div>
                        <div className="font-extrabold">{rm.name}</div>
                        <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                          {rm.code} · {STATION_CATEGORIES.find((c) => c.value === rm.category)?.label ?? rm.category}
                        </div>
                      </div>
                      <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        طبقه {toFaDigits(rm.floor)}
                        {rm.roomNumber ? ` • اتاق ${rm.roomNumber}` : ""}
                      </span>
                    </button>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                          active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {active ? "فعال" : "غیرفعال"}
                      </span>
                      <button
                        type="button"
                        disabled={busy || !rm.serverId}
                        onClick={() => void handleToggleRoomActive(rm, !active)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {active ? "غیرفعال کردن" : "فعال کردن"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleSaveRoomConfig}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-7"
            >
              <h2 className="text-base font-extrabold text-slate-900">
                {isCreatingRoom
                  ? "ثبت ایستگاه جدید در کاتالوگ"
                  : `ویرایش ایستگاه: ${selectedRoomObj?.name ?? "—"}`}
              </h2>
              <p className="text-xs text-slate-500">
                عنوان فارسی روی مراحل مسیر با همین کد اتاق همگام می‌شود؛ غیرفعال‌ها از فهرست افزودن فوری پزشک حذف می‌شوند.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">کد پایدار ایستگاه</label>
                  <AppInput
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    disabled={!isCreatingRoom}
                    placeholder="مثلاً LAB یا ECG"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase disabled:bg-slate-50"
                  />
                  {!isCreatingRoom && (
                    <p className="mt-1 text-[10px] text-slate-500">کد پس از ایجاد تغییر نمی‌کند.</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">عنوان فارسی</label>
                  <AppInput
                    type="text"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">دسته</label>
                  <select
                    value={roomCategory}
                    onChange={(e) => setRoomCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold"
                  >
                    {STATION_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">طبقه</label>
                  <select
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold"
                  >
                    <option value={1}>طبقه ۱ (همکف)</option>
                    <option value={2}>طبقه ۲</option>
                    <option value={3}>طبقه ۳</option>
                    <option value={4}>طبقه ۴</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">شماره اتاق</label>
                  <AppInput
                    type="text"
                    value={roomNum}
                    onChange={(e) => setRoomNum(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={roomActive}
                  onChange={(e) => setRoomActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                ایستگاه فعال است (نمایش در افزودن فوری و نقشه)
              </label>

              {!isCreatingRoom && selectedRoomObj && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      نام پزشک / اپراتور مستقر
                    </label>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800">
                      {roomStaffDisplay(selectedRoomObj, snapshot.staff).name}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      از کادر درمان می‌آید؛ در این نسخه صف اتاق نداریم.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">عنوان تخصصی</label>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800">
                      {roomStaffDisplay(selectedRoomObj, snapshot.staff).specialty}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  راهنمای متنی مسیر حرکت تا اتاق
                </label>
                <AppTextarea
                  rows={2}
                  value={roomSteps}
                  onChange={(e) => setRoomSteps(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-amber-800">
                  نکات آمادگی قبل از ورود (نمایش در موبایل سلامتجو)
                </label>
                <AppTextarea
                  rows={3}
                  value={roomPrep}
                  onChange={(e) => setRoomPrep(e.target.value)}
                  className="w-full rounded-xl border border-amber-300 bg-amber-50/40 p-3 text-xs leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={busy || !roomTitle.trim() || (isCreatingRoom && !roomCode.trim())}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-xs font-extrabold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isCreatingRoom ? "ثبت ایستگاه جدید" : "ذخیره پیکربندی ایستگاه"}
              </button>
            </form>
          </div>
        )}

        {/* ================= 4. STAFF & ROLE MANAGEMENT ================= */}
        {section === "forms" && (
          <AdminFormsBuilder snapshot={snapshot} onAction={onAction} busy={busy} />
        )}

        {section === "staff" && (
          <div className="grid gap-5 lg:grid-cols-12">
            {/* Existing Staff Directory */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-7">
              <h2 className="text-base font-extrabold text-slate-900">
                فهرست پزشکان، اپراتورهای پاراکلینیک و پرسنل پذیرش
              </h2>

              <div className="space-y-2.5">
                {snapshot.staff.map((st) => (
                  <div
                    key={st.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-extrabold text-slate-900">
                          {st.fullName}
                        </span>{" "}
                        <span className="text-slate-600">
                          — {st.specialtyOrDept}
                        </span>
                      </div>
                      <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-800">
                        کد: {st.medicalCouncilCode}
                      </span>
                      <div className="flex items-center gap-2"><span className={`status-badge ${st.isActive ? 'status-green' : 'status-red'}`}>{st.isActive ? 'فعال' : 'غیرفعال'}</span><button type="button" className="secondary-button" onClick={() => { setEditingStaffId(st.id); setStaffActive(st.isActive); setNewStaffName(st.fullName); setNewStaffRole(st.role); setNewStaffDept(st.specialtyOrDept); setNewStaffRoom(st.roomCode || 'CARDIO'); setNewStaffCode(st.medicalCouncilCode); setNewStaffPerms([...st.permissions]); }}>ویرایش دسترسی</button></div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {st.permissions.map((perm, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                        >
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Staff Member & Role Permissions */}
            <form
              onSubmit={handleCreateStaff}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-5"
            >
              <h2 className="text-base font-extrabold text-slate-900">
                {editingStaffId ? "ویرایش عضو کادر درمان" : "افزودن عضو کادر درمان"}
              </h2>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  نام و نام خانوادگی
                </label>
                <AppInput
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="مثلاً: دکتر مهرداد سلیمانی"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    نقش سازمانی
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold"
                  >
                    <option value="specialist">پزشک متخصص</option>
                    <option value="paraclinic">اپراتور پاراکلینیک</option>
                    <option value="reception">مسئول پذیرش</option>
                    <option value="admin">مدیر سیستم</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    ایستگاه مرتبط
                  </label>
                  <select
                    value={newStaffRoom}
                    onChange={(e) => setNewStaffRoom(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold"
                  >
                    {snapshot.rooms.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    تخصص یا واحد
                  </label>
                  <AppInput
                    type="text"
                    value={newStaffDept}
                    onChange={(e) => setNewStaffDept(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    کد نظام پزشکی / پرسنلی
                  </label>
                  <AppInput
                    type="text"
                    value={newStaffCode}
                    onChange={(e) => setNewStaffCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold text-slate-800">
                  سطح دسترسی به پرونده الکترونیک سلامتجویان:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_PERMISSIONS.map((perm) => {
                    const checked = newStaffPerms.includes(perm);
                    return (
                      <button
                        key={perm}
                        type="button"
                        onClick={() => togglePermission(perm)}
                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                          checked
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {checked ? "✓ " : "+ "}
                        {perm}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={staffActive} onChange={(e) => setStaffActive(e.target.checked)} />عضو کادر درمان فعال باشد</label>
              {editingStaffId && <button type="button" onClick={() => { setEditingStaffId(null); setNewStaffName(''); setStaffActive(true); }} className="secondary-button">انصراف از ویرایش / عضو جدید</button>}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {editingStaffId ? "ذخیره تغییرات و دسترسی‌ها" : "ثبت عضو و مجوزهای دسترسی"}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
