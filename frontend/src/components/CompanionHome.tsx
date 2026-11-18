import { AppInput, AppTextarea } from "@/components/AppInput";
import { LocationPickerPopup } from "@/components/LocationPickerPopup";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Compass,
  FileText,
  Footprints,
  Link2,
  Lock,
  Map,
  MapPin,
  Navigation,
  Route,
  Sparkles,
  UserCheck,
} from "lucide-react";
import type { ClinicSnapshot, RoomDto } from "@/types/clinic";
import { currentStation, stationLabel, type AppPage } from "@/lib/workspace";
import { formatFaTime, toFaDigits } from "@/lib/persian";
import {
  calculateRoute,
  configureOsmFromSettings,
  estimateTravelModes,
  geocodeAddress,
  openHospitalNavigators,
  openOsmMap,
  osmTileUrlsForRoute,
  reverseGeocode,
  type RouteInfo,
} from "@/lib/osm-routing";
import {
  buildHealthRoadmap,
  findActiveContractMembership,
  roadmapProgress,
  type HealthRoadmapStage,
} from "@/lib/health-roadmap";
import { PrintableEmrReport } from "./PrintableEmrReport";

interface CompanionHomeProps {
  snapshot: ClinicSnapshot;
  selectedPatientId: number;
  onSelectPatient: (id: number) => void;
  onNavigate: (page: AppPage, patientId?: number) => void;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
  isSelf?: boolean;
  canViewReports?: boolean;
  userId?: number;
}

function MiniRouteMap({ room, floorRooms }: { room: RoomDto; floorRooms: RoomDto[] }) {
  return (
    <svg viewBox="0 0 400 230" className="h-full w-full" aria-label="نقشه کوچک مسیر تا ایستگاه">
      <rect x="20" y="98" width="360" height="36" rx="8" fill="#eef2f1" />
      <rect x="175" y="20" width="50" height="190" rx="8" fill="#eef2f1" />
      <rect x="176" y="92" width="48" height="48" rx="10" fill="#20493c" />
      <text x="200" y="112" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">آسانسور</text>
      <text x="200" y="127" textAnchor="middle" fill="#a8ddc2" fontSize="8">طبقه {toFaDigits(room.floor)}</text>
      <path d={`M 200 116 L ${room.mapX} 116 L ${room.mapX} ${room.mapY}`} fill="none" stroke="#2b8c66" strokeWidth="4" strokeDasharray="7 5" strokeLinecap="round" />
      {floorRooms.map((r) => (
        <g key={r.code}>
          <rect x={r.mapX - 44} y={r.mapY - 24} width="88" height="48" rx="9" fill={r.code === room.code ? "#2b8c66" : "#ffffff"} stroke={r.code === room.code ? "#1f6f4f" : "#cfdcd5"} strokeWidth={r.code === room.code ? 2 : 1.2} />
          <text x={r.mapX} y={r.mapY - 2} textAnchor="middle" fill={r.code === room.code ? "#fff" : "#41584c"} fontSize="9.5" fontWeight="bold">اتاق {r.roomNumber}</text>
          <text x={r.mapX} y={r.mapY + 13} textAnchor="middle" fill={r.code === room.code ? "#d6f1e2" : "#8a9c92"} fontSize="8">{stationLabel(r.code)}</text>
        </g>
      ))}
    </svg>
  );
}

function OsmRouteStrip({ route }: { route: RouteInfo }) {
  const tiles = osmTileUrlsForRoute(route.from, route.to, 11);
  return (
    <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      {tiles.slice(0, 4).map((t, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={t.url} alt="نقشه مسیر" className="h-20 w-full object-cover" loading="lazy" />
      ))}
    </div>
  );
}

function stageDotClass(state: HealthRoadmapStage["state"]): string {
  if (state === "done") return "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200/60";
  if (state === "active") return "border-[#20745c] bg-[#20745c] text-white shadow-lg shadow-teal-200 scale-110";
  return "border-slate-200 bg-slate-100 text-slate-400";
}

export function CompanionHome({ snapshot, selectedPatientId, onNavigate, onAction, busy, isSelf = false, canViewReports = false, userId }: CompanionHomeProps) {
  const [notice, setNotice] = useState("");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showReport, setShowReport] = useState(false);
  const patient = snapshot.patients.find((p) => p.id === selectedPatientId) ?? snapshot.patients[0];

  const clinic = snapshot.clinicLocation;
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [addressDraft, setAddressDraft] = useState("");
  const [geoError, setGeoError] = useState("");
  const [locating, setLocating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    configureOsmFromSettings(snapshot.platform?.settings);
  }, [snapshot.platform?.settings]);

  useEffect(() => {
    if (!patient || !clinic) return;
    setAddressDraft(patient.homeAddress ?? "");
    if (typeof patient.homeLat === "number" && typeof patient.homeLon === "number") {
      setRouteLoading(true);
      void calculateRoute({ lat: patient.homeLat, lon: patient.homeLon }, { lat: clinic.lat, lon: clinic.lon })
        .then(setRoute)
        .finally(() => setRouteLoading(false));
    } else {
      setRoute(null);
    }
  }, [patient?.id, patient?.homeLat, patient?.homeLon, patient?.homeAddress, clinic?.lat, clinic?.lon]);

  const travel = useMemo(
    () => (route ? estimateTravelModes(route.drivingMinutes, route.distanceKm) : null),
    [route]
  );

  const saveHomeLocation = async (from: { lat: number; lon: number }, address: string) => {
    if (!clinic || !patient) return;
    setAddressDraft(address);
    setRouteLoading(true);
    const computed = await calculateRoute(from, { lat: clinic.lat, lon: clinic.lon });
    setRoute(computed);
    setRouteLoading(false);
    await onAction({
      action: "UPDATE_PATIENT_HOME",
      patientId: patient.id,
      homeLat: from.lat,
      homeLon: from.lon,
      homeAddress: address,
    });
  };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("مرورگر شما موقعیت مکانی را پشتیبانی نمی‌کند.");
      return;
    }
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const from = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        const resolved = await reverseGeocode(from);
        const address = resolved?.displayName?.trim() || "موقعیت فعلی من";
        setLocating(false);
        await saveHomeLocation(from, address);
      },
      () => {
        setLocating(false);
        setGeoError("دسترسی به موقعیت مکانی داده نشد. آدرس خود را دستی وارد کنید یا روی نقشه انتخاب کنید.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const searchAddress = async () => {
    if (!addressDraft.trim()) return;
    setGeoError("");
    setRouteLoading(true);
    const point = await geocodeAddress(addressDraft);
    if (!point) {
      setGeoError("آدرس پیدا نشد. لطفاً نام محله یا شهر را دقیق‌تر وارد کنید.");
      setRouteLoading(false);
      return;
    }
    const address = point.displayName?.trim() || addressDraft.trim();
    setRouteLoading(false);
    await saveHomeLocation({ lat: point.lat, lon: point.lon }, address);
  };

  if (!patient || snapshot.links.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Link2 className="h-6 w-6" /></span>
        <h2 className="mt-4 text-base font-bold text-slate-700">هنوز پرونده‌ای به حساب شما متصل نیست</h2>
        <p className="mt-2 text-xs leading-7 text-slate-400">اگر خودتان سلامتجو هستید یا همراه سلامتجو هستید، با کد QR پذیرش و کد ملی سلامتجو پرونده را متصل کنید تا نقشه راه سلامتی و مسیر درمان برایتان فعال شود.</p>
        <button onClick={() => onNavigate("companion-links")} className="primary-button mt-6">اتصال پرونده سلامتجو<ArrowLeft className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  const link = snapshot.links.find((l) => l.patientId === patient.id && (userId === undefined || l.userId === userId));
  const canManage = link?.permission !== "follow";
  const current = currentStation(patient);
  const total = patient.stations.length;
  const passed = patient.stations.filter((s) => s.status === "completed" || s.status === "sample_taken").length;
  const done = patient.stations.filter((s) => s.status === "completed").length;
  const allDone = total > 0 && done === total;
  const room = snapshot.rooms.find((r) => r.code === current?.roomCode);
  const floorRooms = room ? snapshot.rooms.filter((r) => r.floor === room.floor) : [];
  const unread = patient.alerts.filter((a) => !a.isRead);
  const nextPending = patient.stations.find((s) => s.status === "pending");
  const nextRoom = snapshot.rooms.find((r) => r.code === nextPending?.roomCode);

  const membership = findActiveContractMembership(snapshot.contracts, patient.nationalId);
  const activeContract = membership?.contract ?? null;
  const contractMember = membership?.member ?? null;
  const stages = buildHealthRoadmap(patient, contractMember);
  const { done: doneStages, total: stageTotal, pct: roadmapPct } = roadmapProgress(stages);
  const activeStage = stages.find((s) => s.state === "active");
  const atStart = activeStage?.id === "pre";
  const preAdmissionDone = patient.intakeCompleted;

  const run = async (payload: Record<string, unknown>, message: string) => {
    try {
      await onAction(payload);
      setNotice(message);
      setTimeout(() => setNotice(""), 3500);
    } catch {
      /* the shell surfaces the error */
    }
  };

  return (
    <div className="space-y-4">
      {notice && <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-medium text-teal-800">{notice}</div>}
      {!isSelf && link && !link.visibility.journey && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-7 text-amber-800">
          سلامتجو نمایش مسیر و فراخوان‌ها را برای همراه خاموش کرده است. فقط بخش‌هایی که سلامتجو اجازه داده باشد نمایش داده می‌شود.
        </div>
      )}

      {/* ================= HEALTH ROADMAP HERO + SPINE ================= */}
      <section className="overflow-hidden rounded-[1.75rem] border border-[#cfe2d7] bg-white shadow-[0_12px_40px_-28px_rgba(32,116,92,0.45)]">
        <div className="relative overflow-hidden border-b border-[#d7e8df] bg-[radial-gradient(circle_at_top_right,_#e8f5ee_0%,_#ffffff_55%,_#f4faf7_100%)] px-5 py-6 sm:px-7">
          <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-[#20745c]/10 blur-2xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#3f7b60] ring-1 ring-[#cfe2d7]">
                <Route className="h-3.5 w-3.5" />
                نقشه راه سلامتی شما
              </div>
              <h2 className="mt-3 text-xl font-extrabold tracking-tight text-[#1d3f32] sm:text-2xl">
                {atStart
                  ? "شما در ابتدای مسیر هستید"
                  : activeStage
                    ? `شما در مرحله «${activeStage.title}» هستید`
                    : "تمام مراحل نقشه راه شما کامل شد"}
              </h2>
              <p className="mt-2 text-xs leading-7 text-slate-500">
                {atStart
                  ? "اول پیش‌پذیرش، بعد نوبت‌دهی، مراجعه به کلینیک‌ها، پرونده الکترونیک، تحلیل اطلاعات و پایش مستمر."
                  : `${toFaDigits(doneStages)} از ${toFaDigits(stageTotal)} مرحله تکمیل شده · ${patient.fullName}`}
                {activeContract && (
                  <>
                    {" "}
                    · قرارداد فعال: <strong className="font-semibold text-[#2f6b52]">{activeContract.organizationName}</strong>
                  </>
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-3 text-center ring-1 ring-[#d7e8df]">
              <div className="text-3xl font-extrabold text-[#20745c] tabular-fa">{toFaDigits(roadmapPct)}٪</div>
              <div className="text-[10px] text-slate-400">پیشرفت کل مسیر</div>
            </div>
          </div>
          <div className="relative mt-5 h-2.5 w-full overflow-hidden rounded-full bg-white/70 ring-1 ring-[#d7e8df]">
            <div className="h-full rounded-full bg-gradient-to-l from-[#1f6f4f] via-[#20745c] to-[#4ca583] transition-all duration-700" style={{ width: `${roadmapPct}%` }} />
          </div>
          {activeStage && (
            <div className="relative mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => onNavigate(activeStage.page)} className="primary-button">
                {atStart ? "ورود به پیش‌پذیرش" : activeStage.cta}
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <p className="text-[11px] text-slate-500">{activeStage.desc}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-5 sm:px-7">
          <div className="relative">
            <div className="absolute top-5 bottom-5 right-[1.15rem] w-px bg-gradient-to-b from-emerald-400 via-teal-300 to-slate-200" />
            <ol className="space-y-2">
              {stages.map((stage, index) => {
                const locked = stage.state === "locked";
                return (
                  <li key={stage.id}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onNavigate(stage.page)}
                      className={`group relative flex w-full items-start gap-3 rounded-2xl px-2 py-3 text-right transition ${
                        stage.state === "active"
                          ? "bg-[#edf7f2] ring-1 ring-[#b7dcc9]"
                          : locked
                            ? "opacity-60"
                            : "hover:bg-slate-50"
                      }`}
                    >
                      <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold transition ${stageDotClass(stage.state)}`}>
                        {stage.state === "done" ? <CheckCircle2 className="h-4 w-4" /> : locked ? <Lock className="h-3.5 w-3.5" /> : stage.n}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-bold ${stage.state === "active" ? "text-[#1d4f3c]" : stage.state === "done" ? "text-emerald-800" : "text-slate-500"}`}>
                            {stage.title}
                          </span>
                          {stage.state === "active" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#20745c] px-2 py-0.5 text-[9px] font-bold text-white">
                              <Sparkles className="h-2.5 w-2.5" />
                              شما اینجا هستید
                            </span>
                          )}
                          {stage.state === "done" && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">انجام شد</span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] leading-6 text-slate-500">{stage.desc}</p>
                        <p className="mt-0.5 text-[10px] leading-5 text-slate-400">{stage.note}</p>
                        {!locked && (
                          <span className="mt-2 inline-flex text-[10px] font-bold text-[#20745c] opacity-80 transition group-hover:opacity-100">
                            {stage.cta} ←
                          </span>
                        )}
                        {index < stages.length - 1 && <span className="sr-only">مرحله بعد</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ================= HOSPITAL NAV (active contract only) ================= */}
      {clinic && activeContract && (
        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Navigation className="h-4 w-4 text-teal-700" />
                مسیریابی تا بیمارستان
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">{clinic.address}</p>
              <p className="mt-1 text-[10px] text-teal-700">
                قرارداد فعال «{activeContract.organizationName}»
                {contractMember?.scheduledLabel ? ` · نوبت: ${contractMember.scheduledLabel}` : ""}
              </p>
            </div>
            <button type="button" onClick={() => openOsmMap({ lat: clinic.lat, lon: clinic.lon })} className="secondary-button">
              <MapPin className="h-3.5 w-3.5" />
              مشاهده روی نقشه
            </button>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-3">
              <label className="app-label text-[11px]">
                آدرس محل زندگی شما (فاصله با OpenStreetMap محاسبه می‌شود)
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <AppInput
                    value={addressDraft}
                    onChange={(e) => setAddressDraft(e.target.value)}
                    placeholder="مثلاً: تهران، سعادت‌آباد، بلوار دریا"
                    className="app-input min-w-56 flex-1 text-xs"
                  />
                  <button type="button" disabled={routeLoading || locating} onClick={() => void searchAddress()} className="primary-button">
                    {routeLoading ? <RefreshInline /> : <Compass className="h-4 w-4" />}
                    محاسبه فاصله
                  </button>
                  <button
                    type="button"
                    disabled={routeLoading || locating}
                    onClick={() => setShowLocationPicker(true)}
                    className="secondary-button"
                  >
                    <Map className="h-3.5 w-3.5" />
                    انتخاب روی نقشه
                  </button>
                  <button type="button" disabled={locating} onClick={useMyLocation} className="secondary-button">
                    <MapPin className="h-3.5 w-3.5" />
                    {locating ? "در حال یافتن…" : "استفاده از موقعیت من"}
                  </button>
                </div>
              </label>

              {geoError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-600">{geoError}</p>}

              {route && (
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3.5 text-center">
                    <div className="text-[10px] text-teal-700">فاصله تا بیمارستان</div>
                    <div className="mt-1 text-2xl font-extrabold text-teal-900 tabular-fa">{toFaDigits(route.distanceKm)}</div>
                    <div className="text-[10px] text-teal-700">کیلومتر {route.source === "osrm" ? "(مسیر واقعی)" : "(مستقیم)"}</div>
                  </div>
                  <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 text-center">
                    <div className="text-[10px] text-sky-700">با خودرو</div>
                    <div className="mt-1 flex items-center justify-center gap-1 text-2xl font-extrabold text-sky-900 tabular-fa">
                      <Car className="h-4 w-4" />
                      {toFaDigits(travel?.carMinutes ?? 0)}
                    </div>
                    <div className="text-[10px] text-sky-700">دقیقه</div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-center">
                    <div className="text-[10px] text-amber-700">پیاده</div>
                    <div className="mt-1 flex items-center justify-center gap-1 text-lg font-extrabold text-amber-900 tabular-fa">
                      <Footprints className="h-4 w-4" />
                      {toFaDigits(travel?.walkMinutes ?? 0)}
                    </div>
                    <div className="text-[10px] text-amber-700">دقیقه</div>
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={() => openHospitalNavigators(route.from, route.to)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#20745c] px-4 py-3.5 text-white transition hover:bg-[#1a634e]"
                    >
                      <Navigation className="h-5 w-5" />
                      <span className="text-sm font-bold">باز کردن مسیریاب‌ها</span>
                      <span className="text-[10px] text-white/70">نشان + گوگل‌مپس</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            {route && <OsmRouteStrip route={route} />}
          </div>
        </section>
      )}

      {/* ================= TODAY'S VISIT TIMELINE (single) ================= */}
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-[#f7faf8]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-bl from-teal-600 to-emerald-600 text-white">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">مسیر درمان امروز</h3>
              <p className="text-[10px] text-slate-400">از پیش‌پذیرش تا تحویل پرونده</p>
            </div>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-800">
            {toFaDigits(passed)} از {toFaDigits(Math.max(total, 1))} ایستگاه
          </span>
        </div>

        {allDone && (
          <div className="mx-5 mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:mx-6">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
              مسیر امروز کامل شد
            </div>
            <p className="mt-1 text-[11px] leading-6 text-emerald-700">
              نتایج و گزارش‌ها در پرونده جمع شده‌اند؛ مراحل تحلیل اطلاعات و پایش مستمر فعال می‌شوند.
            </p>
            {canViewReports && (
              <button type="button" onClick={() => setShowReport(true)} className="primary-button mt-3">
                <FileText className="h-3.5 w-3.5" />
                دریافت گزارش جامع
              </button>
            )}
          </div>
        )}

        {!allDone && current && room && (
          <div className="mx-5 mt-4 grid gap-3 rounded-2xl border border-[#d7e8df] bg-white p-4 sm:mx-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  ایستگاه فعلی
                </span>
                <span className="text-[10px] text-slate-400">مرحله {toFaDigits(current.stepOrder)} از {toFaDigits(total)}</span>
              </div>
              <h4 className="mt-2 text-lg font-extrabold text-slate-800">{current.roomName}</h4>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-teal-600" />طبقه {toFaDigits(room.floor)}، اتاق {room.roomNumber}</span>
                <span>{room.specialistName}</span>
              </div>
              {(current.status === "waiting" || current.status === "checked_in") && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-800">
                  <Clock3 className="h-3.5 w-3.5" />
                  {toFaDigits(current.queueAhead)} نفر جلوتر · حدود {current.estimatedWaitMinutes === 0 ? "نوبت نزدیک است" : `${toFaDigits(current.estimatedWaitMinutes)} دقیقه تا فراخوان`}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {!preAdmissionDone && isSelf && (
                  <button type="button" onClick={() => onNavigate("companion-intake")} className="primary-button py-2.5">
                    <ClipboardList className="h-4 w-4" />
                    تکمیل پیش‌پذیرش
                  </button>
                )}
                {preAdmissionDone && current.status === "waiting" && canManage && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run({ action: "PATIENT_STATION_CHECKIN", patientId: patient.id, stationId: current.id }, "حضور در ایستگاه ثبت شد.")}
                    className="primary-button py-2.5"
                  >
                    <UserCheck className="h-4 w-4" />
                    اعلام حضور
                  </button>
                )}
                <button type="button" onClick={() => onNavigate("companion-map")} className="secondary-button">
                  <Navigation className="h-3.5 w-3.5 text-teal-600" />
                  مسیریابی داخلی
                </button>
              </div>
              {nextRoom && (
                <p className="mt-3 text-[11px] text-slate-500">
                  بعد از این ایستگاه: <strong className="text-slate-700">{nextPending?.roomName}</strong>
                  <span className="text-slate-400"> · طبقه {toFaDigits(nextRoom.floor)}، اتاق {nextRoom.roomNumber}</span>
                </p>
              )}
            </div>
            <button type="button" onClick={() => onNavigate("companion-map")} className="overflow-hidden rounded-xl border border-[#dfe9e2] bg-[#f4f8f5] text-right">
              <div className="h-28"><MiniRouteMap room={room} floorRooms={floorRooms} /></div>
              <div className="border-t border-[#dfe9e2] px-2 py-1.5 text-center text-[10px] font-semibold text-teal-700">نقشه طبقه {toFaDigits(room.floor)}</div>
            </button>
          </div>
        )}

        <div className="px-5 py-5 sm:px-6">
          <div className="relative">
            <div className="absolute top-4 bottom-4 right-4 w-1 rounded-full bg-gradient-to-b from-emerald-300 via-teal-200 to-slate-200 opacity-70" />
            <div className="space-y-1">
              <div className={`relative flex items-start gap-4 rounded-2xl p-3 ${preAdmissionDone ? "hover:bg-emerald-50/40" : "bg-amber-50/40"}`}>
                <button type="button" onClick={() => onNavigate("companion-intake")} className="flex flex-1 items-start gap-4 text-right">
                  <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold ${preAdmissionDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-amber-400 bg-amber-400 text-white animate-pulse"}`}>
                    {preAdmissionDone ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-bold ${preAdmissionDone ? "text-emerald-800" : "text-amber-800"}`}>پیش‌پذیرش و پرسشنامه</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${preAdmissionDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {preAdmissionDone ? "پرسشنامه تکمیل شد" : "نیاز به تکمیل پرسشنامه"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-400">پرسشنامه غربالگری بر اساس جنسیت — قبل از ویزیت الزامی است</p>
                  </div>
                </button>
              </div>

              {patient.stations.map((st) => {
                const stRoom = snapshot.rooms.find((r) => r.code === st.roomCode);
                const isCurrent = st.id === current?.id;
                const isPassed = st.status === "completed" || st.status === "sample_taken";
                const isLocked = !preAdmissionDone && !isPassed;
                const expanded = expandedStep === st.id;
                return (
                  <div
                    key={st.id}
                    className={`relative flex items-start gap-4 rounded-2xl p-3 transition ${
                      isCurrent ? "bg-blue-50/60 ring-1 ring-blue-200" : isPassed ? "hover:bg-emerald-50/30" : isLocked ? "opacity-55" : "hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => setExpandedStep(expanded ? null : st.id)}
                      className="flex flex-1 items-start gap-4 text-right disabled:cursor-not-allowed"
                    >
                      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold ${
                        isPassed
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : isCurrent
                            ? "border-blue-500 bg-blue-500 text-white scale-110"
                            : isLocked
                              ? "border-slate-200 bg-slate-100 text-slate-400"
                              : "border-teal-300 bg-white text-teal-700"
                      }`}>
                        {isPassed ? <CheckCircle2 className="h-4 w-4" /> : st.status === "in_progress" ? <Activity className="h-4 w-4 animate-pulse" /> : toFaDigits(st.stepOrder + 1)}
                      </span>
                      <div className="min-w-0 flex-1 pb-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-bold ${isCurrent ? "text-blue-800" : isPassed ? "text-emerald-800" : "text-slate-700"}`}>{st.roomName}</span>
                          {isCurrent && (
                            <span className="flex items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-[9px] font-bold text-white">
                              <span className="h-1 w-1 animate-ping rounded-full bg-white" />
                              اینجایید
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                          {stRoom && <span>طبقه {toFaDigits(stRoom.floor)} · اتاق {stRoom.roomNumber}</span>}
                          {stRoom && <span>{stRoom.specialistName}</span>}
                          {st.completedAt && <span className="text-emerald-500">✓ {formatFaTime(st.completedAt)}</span>}
                        </div>
                        {isCurrent && st.status === "waiting" && canManage && preAdmissionDone && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              void run({ action: "PATIENT_STATION_CHECKIN", patientId: patient.id, stationId: st.id }, "حضور در ایستگاه ثبت شد.");
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-[11px] font-bold text-white"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            اعلام حضور در ایستگاه
                          </button>
                        )}
                      </div>
                    </button>
                    {expanded && stRoom && (
                      <div className="absolute top-full right-12 left-3 z-20 mt-1 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                        <div className="text-[11px] font-bold text-teal-800">نکات آمادگی:</div>
                        <p className="mt-1 text-[11px] leading-6 text-slate-600">{stRoom.prepInstructions}</p>
                        <div className="mt-2 text-[11px] font-bold text-teal-800">مسیر رفتن:</div>
                        <p className="mt-1 text-[11px] leading-6 text-slate-600">{stRoom.wayfindingSteps}</p>
                        <button type="button" onClick={() => onNavigate("companion-map")} className="mt-2 text-[11px] font-bold text-teal-700 hover:underline">
                          مشاهده روی نقشه ←
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className={`relative flex items-start gap-4 rounded-2xl p-3 ${allDone ? "hover:bg-emerald-50/30" : "opacity-70"}`}>
                <button type="button" disabled={!canViewReports && !allDone} onClick={() => onNavigate("companion-records")} className="flex flex-1 items-start gap-4 text-right disabled:cursor-not-allowed">
                  <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${allDone ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-slate-100 text-slate-400"}`}>
                    {allDone ? <FileText className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1 pb-1">
                    <span className={`text-sm font-bold ${allDone ? "text-teal-900" : "text-slate-500"}`}>پرونده الکترونیک و تحلیل</span>
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-400">
                      {toFaDigits(patient.paraclinicResults.length)} نتیجه · {toFaDigits(patient.clinicalNotes.length)} گزارش پزشک
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Bell className="h-4 w-4 text-teal-600" />
            اعلان‌ها و فراخوان‌ها
            {unread.length > 0 && <span className="rounded-md bg-teal-600 px-1.5 py-0.5 text-[9px] text-white">{toFaDigits(unread.length)}</span>}
          </h3>
          <div className="mt-3 space-y-2">
            {patient.alerts.slice(0, 3).map((a) => (
              <div key={a.id} className={`rounded-xl border p-3 ${a.isRead ? "border-slate-100 bg-slate-50/60" : "border-teal-200 bg-teal-50/50"}`}>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{a.senderRole}</span>
                  <span>{formatFaTime(a.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line text-[11px] leading-6 text-slate-600">{a.message}</p>
                {!a.isRead && (
                  <button disabled={busy} onClick={() => run({ action: "MARK_ALERTS_READ", patientId: patient.id }, "اعلان‌ها خوانده شدند.")} className="mt-1.5 text-[10px] font-semibold text-teal-700">
                    متوجه شدم
                  </button>
                )}
              </div>
            ))}
            {patient.alerts.length === 0 && <p className="text-xs text-slate-400">اعلانی ثبت نشده است.</p>}
          </div>
        </section>

        {(isSelf || link?.visibility.allergies) && patient.allergies.length > 0 && (
          <section className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              حساسیت‌های ثبت‌شده (هشدار برای پزشکان)
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {patient.allergies.map((a) => (
                <span key={a.id} className="rounded-lg border border-red-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-700">{a.substance}</span>
              ))}
            </div>
          </section>
        )}
      </div>

      {showReport && <PrintableEmrReport patient={patient} onClose={() => setShowReport(false)} />}

      {showLocationPicker && (
        <LocationPickerPopup
          initial={{
            lat: typeof patient.homeLat === "number" ? patient.homeLat : undefined,
            lon: typeof patient.homeLon === "number" ? patient.homeLon : undefined,
            address: addressDraft || patient.homeAddress || undefined,
          }}
          fallbackCenter={clinic ? { lat: clinic.lat, lon: clinic.lon } : null}
          onClose={() => setShowLocationPicker(false)}
          onConfirm={(result) => {
            setShowLocationPicker(false);
            void saveHomeLocation({ lat: result.lat, lon: result.lon }, result.address);
          }}
        />
      )}
    </div>
  );
}

function RefreshInline() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
}
