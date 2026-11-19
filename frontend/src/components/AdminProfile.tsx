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
import { toFaDigits, toLatinDigits } from "@/lib/persian";
import { roomStaffDisplay, totalVisitMinutes } from "@/lib/workspace";
import { AdminFormsBuilder } from "./AdminFormsBuilder";

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

  // Room Config Editor State
  const [selectedRoomId, setSelectedRoomId] = useState<number>(
    snapshot.rooms[1]?.id ?? snapshot.rooms[0]?.id ?? 1
  );
  const selectedRoomObj =
    snapshot.rooms.find((r) => r.id === selectedRoomId) ?? snapshot.rooms[0];

  const [roomFloor, setRoomFloor] = useState<number>(
    selectedRoomObj?.floor ?? 2
  );
  const [roomNum, setRoomNum] = useState<string>(
    selectedRoomObj?.roomNumber ?? "۲۰۴"
  );
  const [roomPrep, setRoomPrep] = useState<string>(
    selectedRoomObj?.prepInstructions ?? ""
  );
  const [roomSteps, setRoomSteps] = useState<string>(
    selectedRoomObj?.wayfindingSteps ?? ""
  );
  const [roomAvgMins, setRoomAvgMins] = useState<string>(
    String(selectedRoomObj?.avgServiceMinutes ?? 15)
  );

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
    setSelectedRoomId(rm.id);
    setRoomFloor(rm.floor);
    setRoomNum(rm.roomNumber);
    setRoomPrep(rm.prepInstructions);
    setRoomSteps(rm.wayfindingSteps);
    setRoomAvgMins(String(rm.avgServiceMinutes));
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
        pkgDesc.trim() || "مسیر استاندارد هماهنگ یک‌روزه کلینیک نبض",
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
    if (!selectedRoomObj) return;
    const display = roomStaffDisplay(selectedRoomObj, snapshot.staff);
    await onAction({
      action: "UPDATE_ROOM_CONFIG",
      id: selectedRoomObj.id,
      floor: roomFloor,
      roomNumber: roomNum,
      // Staff roster is source of truth for station lead; keep room fields synced.
      specialistName: display.name,
      specialtyTitle: display.specialty,
      prepInstructions: roomPrep,
      wayfindingSteps: roomSteps,
      avgServiceMinutes: Number(roomAvgMins) || 15,
    });
    setSavedNotice(
      `تنظیمات اتاق، طبقه و متن راهنمای آمادگی «${selectedRoomObj.name}» ذخیره شد و در نقشه موبایل سلامتجویان اعمال گردید.`
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
                  {snapshot.rooms.map((rm) => {
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

        {/* ================= 3. ROOMS & WAYFINDING CONFIG ================= */}
        {section === "rooms" && selectedRoomObj && (
          <div className="grid gap-5 lg:grid-cols-12">
            {/* Room Selector List */}
            <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs lg:col-span-5">
              <h2 className="text-sm font-extrabold text-slate-900">
                فهرست اتاق‌ها و ایستگاه‌های کلینیک
              </h2>
              {snapshot.rooms.map((rm) => (
                <button
                  key={rm.id}
                  type="button"
                  onClick={() => selectRoomForEdit(rm)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-right text-xs transition ${
                    rm.id === selectedRoomObj.id
                      ? "border-sky-600 bg-sky-50 font-bold text-sky-950"
                      : "border-slate-200 bg-slate-50/60 hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <div className="font-extrabold">{rm.name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {roomStaffDisplay(rm, snapshot.staff).name}
                    </div>
                  </div>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-200">
                    طبقه {toFaDigits(rm.floor)} • اتاق {rm.roomNumber}
                  </span>
                </button>
              ))}
            </div>

            {/* Room Wayfinding & Prep Form */}
            <form
              onSubmit={handleSaveRoomConfig}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-7"
            >
              <h2 className="text-base font-extrabold text-slate-900">
                ویرایش طبقه، اتاق و نکات آمادگی: {selectedRoomObj.name}
              </h2>
              <p className="text-xs text-slate-500">
                تغییرات این بخش بلافاصله در تب «نقشه و راهنمای کلینیک» موبایل
                تمام سلامتجویان به‌روزرسانی می‌شود.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    طبقه
                  </label>
                  <select
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold"
                  >
                    <option value={1}>طبقه ۱ (همکف)</option>
                    <option value={2}>طبقه ۲</option>
                    <option value={3}>طبقه ۳</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    شماره اتاق
                  </label>
                  <AppInput
                    type="text"
                    value={roomNum}
                    onChange={(e) => setRoomNum(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    زمان استاندارد خدمت (دقیقه)
                  </label>
                  <AppInput
                    type="number"
                    value={roomAvgMins}
                    onChange={(e) => setRoomAvgMins(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    نام پزشک متخصص / اپراتور مستقر
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800">
                    {roomStaffDisplay(selectedRoomObj, snapshot.staff).name}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    از فهرست «کادر درمان» و اتاق تخصیص‌یافته می‌آید؛ اینجا قابل ویرایش نیست.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    عنوان تخصصی
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800">
                    {roomStaffDisplay(selectedRoomObj, snapshot.staff).specialty}
                  </div>
                </div>
              </div>

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
                  متن نکات آمادگی الزامی قبل از ورود به اتاق (نمایش در موبایل
                  سلامتجو)
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
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-xs font-extrabold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                ذخیره پیکربندی اتاق و راهنمای سلامتجو
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

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-500">
                <span>همه اطلاعات این نسخه نمایشی است و در حافظه برنامه نگهداری می‌شود.</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    await onAction({ action: "RESET_MOCK_DATA" });
                    setSavedNotice("داده‌های نمایشی به حالت اولیه بازگردانده شد.");
                    setTimeout(() => setSavedNotice(""), 4000);
                  }}
                  className="secondary-button"
                >
                  بازگردانی داده نمایشی
                </button>
              </div>
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
