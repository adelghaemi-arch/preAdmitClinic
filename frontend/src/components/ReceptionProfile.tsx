import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BellRing,
  CheckCircle2,
  Clock,
  Kanban,
  QrCode,
  Send,
  Shuffle,
  Smartphone,
  Sparkles,
  Table2,
  UserPlus,
  Users,
  Search,
  History,
  LayoutGrid,
  ListOrdered,
} from "lucide-react";
import type { ClinicSnapshot, PatientFullDto } from "@/types/clinic";
import { formatFaTime, toFaDigits } from "@/lib/persian";
import { QrCodeVisual } from "./QrCodeVisual";
import { RoomQueueBoard, sortRoomQueue, type RoomQueueEntry } from "./RoomQueueBoard";
import { PatientDirectoryDialog, type DirectoryResult } from "./PatientDirectoryDialog";
import { normalizeNationalId, normalizeText } from "@/lib/workspace";
import { dispatchClinicAction } from "@/lib/client-db";

type ReceptionSection = "flow" | "checkin" | "queue" | "alerts";

interface ReceptionProfileProps {
  snapshot: ClinicSnapshot;
  selectedPatientId: number;
  onSelectPatient: (id: number) => void;
  onSwitchToPatientMobile: (patientId: number) => void;
  onAction: (
    payload: Record<string, unknown>
  ) => Promise<{ createdPatientId?: number; qrToken?: string } | void>;
  busy: boolean;
  initialSection?: ReceptionSection;
  onSectionChange?: (section: ReceptionSection) => void;
}

export function ReceptionProfile({
  snapshot,
  selectedPatientId,
  onSelectPatient,
  onSwitchToPatientMobile,
  onAction,
  busy,
  initialSection = "flow",
  onSectionChange,
}: ReceptionProfileProps) {
  const [section, setLocalSection] = useState<ReceptionSection>(initialSection);
  const setSection = (next: ReceptionSection) => { setLocalSection(next); onSectionChange?.(next); };
  const [flowViewMode, setFlowViewMode] = useState<"kanban" | "table">("kanban");

  // Check-in form state
  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [age, setAge] = useState("۴۵");
  const [gender, setGender] = useState("مرد");
  const [phone, setPhone] = useState("");
  const [selectedPathwayId, setSelectedPathwayId] = useState<number>(
    snapshot.pathways[0]?.id ?? 1
  );
  const [customStations, setCustomStations] = useState<string[]>(
    snapshot.pathways[0]?.stationCodes ?? [
      "LAB",
      "ECG",
      "CARDIO",
      "PULMO",
      "DENTAL",
    ]
  );
  // Step-1 national id lookup state
  type LookupResult = { found: boolean; patient?: { id: number; fullName: string; nationalId: string; age: number; gender: string; phone: string; pathwayTitle: string; allergies: { substance: string }[]; medications: { name: string }[]; intakeCompleted: boolean }; activeVisitId?: number | null; visits?: { id: number; checkInTime: string; completedAt: string | null; pathwayTitle: string }[] };
  const [lookupId, setLookupId] = useState("");
  const lookupVersion = useRef(0);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [openRoomCode, setOpenRoomCode] = useState<string | null>(null);
  const [issuedQrPatient, setIssuedQrPatient] = useState<{
    id: number;
    name: string;
    qrToken: string;
    pathway: string;
  } | null>(null);

  // Queue management state
  const [queuePatientId, setQueuePatientId] = useState<number>(
    snapshot.patients.find((p) =>
      p.stations.some((s) => s.roomCode === "CARDIO" && s.status === "waiting")
    )?.id ??
      selectedPatientId
  );
  const [queueSavedBanner, setQueueSavedBanner] = useState("");

  // Patient Alerts state
  const [alertPatientId, setAlertPatientId] = useState<number>(selectedPatientId);
  const [alertType, setAlertType] = useState("move_to_room");
  const [alertMessage, setAlertMessage] = useState(
    "مراجعه‌کننده گرامی، نوبت شما در ایستگاه بعدی آماده است. لطفاً طبق نقشه همراه بیمار به اتاق مربوطه مراجعه فرمایید."
  );
  const [alertSentBanner, setAlertSentBanner] = useState("");

  const roomCongestion = useMemo(() => {
    const map = new Map<
      string,
      { activePatients: PatientFullDto[]; totalWaitMins: number }
    >();
    for (const rm of snapshot.rooms) {
      map.set(rm.code, { activePatients: [], totalWaitMins: 0 });
    }
    for (const p of snapshot.patients) {
      for (const s of p.stations) {
        if (
          s.status === "waiting" ||
          s.status === "checked_in" ||
          s.status === "in_progress"
        ) {
          const entry = map.get(s.roomCode);
          if (entry) {
            entry.activePatients.push(p);
            entry.totalWaitMins += s.spentMinutes;
          }
        }
      }
    }
    return map;
  }, [snapshot.rooms, snapshot.patients]);

  const handleSelectPathway = (pathwayId: number) => {
    setSelectedPathwayId(pathwayId);
    const pkg = snapshot.pathways.find((p) => p.id === pathwayId);
    if (pkg) {
      setCustomStations([...pkg.stationCodes]);
    }
  };

  const toggleStationInCheckin = (code: string) => {
    setCustomStations((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const applyDirectorySelection = (result: DirectoryResult) => {
    setDirectoryOpen(false);
    lookupVersion.current++;
    const id = normalizeNationalId(result.nationalId);
    setLookupId(id);
    setNationalId(id);
    setFullName(result.patient.fullName);
    setAge(String(result.patient.age));
    setGender(result.patient.gender);
    setPhone(result.patient.phone);
    setLookupError("");
    setIssuedQrPatient(null);
    void handleLookup(undefined, id);
  };

  const handleLookup = async (e?: React.FormEvent, explicitId?: string) => {
    e?.preventDefault();
    const id = normalizeNationalId(explicitId ?? lookupId);
    const requestVersion = ++lookupVersion.current;
    setLookupError("");
    if (!/^\d{10}$/.test(id)) { setLookupError("کد ملی باید ۱۰ رقم باشد."); return; }
    setLookupBusy(true);
    try {
      const data = await dispatchClinicAction(
        { action: "LOOKUP_PATIENT_BY_NATIONAL_ID", nationalId: id },
        { role: "reception" }
      );
      if (!data.ok) throw new Error(data.error ?? "جست‌وجو انجام نشد.");
      if (requestVersion !== lookupVersion.current) return;
      setLookup(data as unknown as LookupResult);
      setNationalId(id);
      const foundPatient = (data as unknown as LookupResult).patient;
      if (data.found && foundPatient) {
        setFullName(foundPatient.fullName);
        setAge(String(foundPatient.age));
        setGender(foundPatient.gender);
        setPhone(foundPatient.phone);
      } else {
        setFullName(""); setAge("۴۵"); setGender("مرد"); setPhone("");
      }
      setIssuedQrPatient(null);
    } catch (err) {
      if (requestVersion === lookupVersion.current) setLookupError(err instanceof Error ? err.message : "جست‌وجو انجام نشد.");
    } finally { setLookupBusy(false); }
  };

  useEffect(() => {
    const id = normalizeNationalId(lookupId);
    if (id.length !== 10 || lookup) return;
    const timer = setTimeout(() => { void handleLookup(); }, 650);
    return () => clearTimeout(timer);
    // handleLookup reads the current input; rerun only when the typed code changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupId]);

  const resetAdmission = () => { lookupVersion.current++; setLookup(null); setLookupId(""); setNationalId(""); setFullName(""); setPhone(""); setAge("۴۵"); setGender("مرد"); setLookupError(""); };

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pkg = snapshot.pathways.find((p) => p.id === selectedPathwayId);
    const numericAge =
      Number(
        age.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      ) || 42;

    const cleanName = fullName.trim();
    const result = await onAction({
      action: "CHECKIN_NEW_PATIENT",
      fullName: cleanName,
      nationalId: nationalId.trim(),
      age: numericAge,
      gender,
      phone: phone.trim(),
      pathwayTitle: pkg ? pkg.title : "مسیر اختصاصی روزانه",
      stationCodes:
        customStations.length > 0
          ? customStations
          : ["LAB", "ECG", "CARDIO", "PULMO", "DENTAL"],
    });

    if (result && result.createdPatientId && result.qrToken) {
      onSelectPatient(result.createdPatientId);
      setIssuedQrPatient({
        id: result.createdPatientId,
        name: cleanName,
        qrToken: result.qrToken,
        pathway: pkg ? pkg.title : "مسیر اختصاصی روزانه",
      });
      setFullName("");
      setNationalId("");
      setLookup(null);
      setLookupId("");
    }
  };

  const queueTargetPatient =
    snapshot.patients.find((p) => p.id === queuePatientId) ??
    snapshot.patients[0];

  const handleMoveStationOrder = async (
    patient: PatientFullDto,
    index: number,
    direction: -1 | 1
  ) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= patient.stations.length) return;
    const current = patient.stations[index];
    const neighbor = patient.stations[targetIdx];
    if (current.status === "completed" || neighbor.status === "completed") {
      return;
    }

    const reordered = [...patient.stations];
    reordered[index] = neighbor;
    reordered[targetIdx] = current;

    await onAction({
      action: "REORDER_PATIENT_QUEUE",
      patientId: patient.id,
      orderedStationIds: reordered.map((s) => s.id),
    });

    setQueueSavedBanner(
      `ترتیب ایستگاه‌های «${patient.fullName}» جابه‌جا شد و اعلان هدایت جدید روی پرونده بیمار ارسال گردید.`
    );
    setTimeout(() => setQueueSavedBanner(""), 4500);
  };

  const handleSmartBypassCrowdedRoom = async (patient: PatientFullDto) => {
    const activeIdx = patient.stations.findIndex(
      (s) => s.status === "waiting"
    );
    if (activeIdx === -1) return;

    // Find a pending station whose room has 0 active patients
    const quietPendingIdx = patient.stations.findIndex(
      (s, idx) =>
        idx > activeIdx &&
        s.status === "pending" &&
        (roomCongestion.get(s.roomCode)?.activePatients.length ?? 0) === 0
    );

    const swapIdx =
      quietPendingIdx !== -1
        ? quietPendingIdx
        : patient.stations.findIndex(
            (s, idx) => idx > activeIdx && s.status === "pending"
          );

    if (swapIdx === -1) return;

    const reordered = [...patient.stations];
    const [promoted] = reordered.splice(swapIdx, 1);
    reordered.splice(activeIdx, 0, promoted);

    await onAction({
      action: "REORDER_PATIENT_QUEUE",
      patientId: patient.id,
      orderedStationIds: reordered.map((s) => s.id),
    });

    setQueueSavedBanner(
      `پیشنهاد هوشمند اجرا شد: «${patient.fullName}» به دلیل شلوغی صف فعلی به «${promoted.roomName}» هدایت شد.`
    );
    setTimeout(() => setQueueSavedBanner(""), 5000);
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertMessage.trim()) return;
    await onAction({
      action: "SEND_PATIENT_ALERT",
      patientId: alertPatientId,
      senderRole: "پذیرش و هماهنگ‌کننده جریان بیمار",
      alertType,
      message: alertMessage.trim(),
    });
    setAlertSentBanner("اعلان با موفقیت در همراه بیمار منتشر شد.");
    setTimeout(() => setAlertSentBanner(""), 4000);
  };

  return (
    <div className="module-content space-y-5">
      {/* Right-hand RTL Desktop Sidebar */}
      

      {/* Main Desktop Workspace */}
      <section className="min-w-0 space-y-5">
        {/* ================= 1. LIVE FLOW BOARD ================= */}
        {section === "flow" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div>
                <h1 className="text-lg font-extrabold text-slate-900">
                  داشبورد جریان لحظه‌ای بیماران در کلینیک (Live Flow Board)
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  مشاهده زنده موقعیت هر بیمار، وضعیت حضور پشت درب و زمان صرف‌شده در
                  هر ایستگاه
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setFlowViewMode("kanban")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                      flowViewMode === "kanban"
                        ? "bg-white text-sky-700 shadow-2xs"
                        : "text-slate-600"
                    }`}
                  >
                    <Kanban className="h-3.5 w-3.5" />
                    تابلوی کانبان اتاق‌ها
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowViewMode("table")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                      flowViewMode === "table"
                        ? "bg-white text-sky-700 shadow-2xs"
                        : "text-slate-600"
                    }`}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    جدول زنده بیماران
                  </button>
                </div>
              </div>
            </div>

            {flowViewMode === "kanban" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {snapshot.rooms.map((rm) => {
                  const patientsHere = snapshot.patients
                    .map((p) => {
                      const activeSt = p.stations.find(
                        (s) =>
                          s.roomCode === rm.code &&
                          (s.status === "waiting" ||
                            s.status === "checked_in" ||
                            s.status === "in_progress")
                      );
                      const sampleSt = p.stations.find(
                        (s) =>
                          s.roomCode === rm.code && s.status === "sample_taken"
                      );
                      return { patient: p, activeSt, sampleSt };
                    })
                    .filter((item) => item.activeSt || item.sampleSt);
                  const orderedHere = (() => {
                    const q: RoomQueueEntry[] = patientsHere.filter((x) => x.activeSt && x.activeSt.status !== "in_progress").map((x) => ({ patient: x.patient, station: x.activeSt! }));
                    const sortedIds = sortRoomQueue(q).map((e) => e.patient.id);
                    return [...patientsHere].sort((a, b) => {
                      const rank = (x: typeof a) => x.activeSt?.status === "in_progress" ? -1 : x.activeSt ? sortedIds.indexOf(x.patient.id) : 999;
                      return rank(a) - rank(b);
                    });
                  })();

                  const isCrowded =
                    patientsHere.some(
                      (x) => (x.activeSt?.spentMinutes ?? 0) >= 25
                    ) || patientsHere.filter((x) => x.activeSt).length >= 2;

                  return (
                    <div
                      key={rm.code}
                      className={`flex flex-col rounded-2xl border bg-white p-4 shadow-2xs ${
                        isCrowded ? "border-amber-300" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900">
                              {rm.name}
                            </span>
                            {isCrowded && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                صف شلوغ
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            طبقه {toFaDigits(rm.floor)}، اتاق {rm.roomNumber} •{" "}
                            {rm.specialistName}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-800">{toFaDigits(patientsHere.length)} نفر</span>
                          <button type="button" onClick={() => setOpenRoomCode(rm.code)} className="inline-flex items-center gap-1 rounded-xl border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-100"><ListOrdered className="h-3.5 w-3.5" />تابلو و صف</button>
                        </div>
                      </div>

                      <div className="mt-3 flex-1 space-y-2.5">
                        {patientsHere.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                            اتاق خلوت و آماده پذیرش فوری
                          </div>
                        ) : (
                          orderedHere.map(({ patient: p, activeSt, sampleSt }, position) => {
                            const st = activeSt ?? sampleSt!;
                            const longWait = st.spentMinutes >= 25;
                            return (
                              <div
                                key={p.id}
                                className={`rounded-xl border p-3 ${
                                  longWait
                                    ? "border-red-200 bg-red-50/50"
                                    : st.status === "sample_taken"
                                      ? "border-amber-200 bg-amber-50/50"
                                      : "border-slate-200 bg-slate-50/70"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                                    {activeSt && activeSt.status !== "in_progress" && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">{toFaDigits(position + 1 - (orderedHere.filter((x) => x.activeSt?.status === "in_progress").length))}</span>}
                                    {p.fullName}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      longWait
                                        ? "bg-red-600 text-white"
                                        : "bg-white text-slate-700"
                                    }`}
                                  >
                                    <Clock className="h-3 w-3" />
                                    {toFaDigits(st.spentMinutes)} دقیقه
                                  </span>
                                </div>

                                {activeSt && (activeSt.status === "waiting" || activeSt.status === "checked_in") && (
                                  <div className="mt-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-semibold text-blue-800">
                                    {toFaDigits(activeSt.queueAhead)} نفر جلوتر · حدود {toFaDigits(activeSt.estimatedWaitMinutes)} دقیقه تا فراخوان
                                    <span className="font-normal text-blue-600"> (میانگین خدمت {rm.specialistName}: {toFaDigits(rm.avgServiceMinutes)} دقیقه)</span>
                                  </div>
                                )}
                                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                  <span
                                    className={`font-bold ${
                                      st.status === "checked_in"
                                        ? "text-emerald-700"
                                        : st.status === "sample_taken"
                                          ? "text-amber-800"
                                          : "text-sky-700"
                                    }`}
                                  >
                                    {st.status === "checked_in"
                                      ? "✓ پشت درب اتاق (اعلام حضور)"
                                      : st.status === "in_progress"
                                        ? "● داخل اتاق در حال ویزیت"
                                        : st.status === "sample_taken"
                                          ? "⧗ نمونه‌گیری انجام شد (تهیه جواب)"
                                          : "در مسیر / صف انتظار"}
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    {longWait && (
                                      <button
                                        type="button"
                                        onClick={() => setOpenRoomCode(rm.code)}
                                        className="rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-amber-700"
                                      >
                                        مدیریت صف اتاق
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onSwitchToPatientMobile(p.id)
                                      }
                                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-sky-700 hover:bg-sky-50"
                                    >
                                      <Smartphone className="h-3 w-3" />
                                      پرونده بیمار
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Live Patient Matrix Table */
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-bold">نام بیمار / QR</th>
                        <th className="px-4 py-3 font-bold">پکیج درمانی</th>
                        <th className="px-4 py-3 font-bold">ایستگاه فعلی</th>
                        <th className="px-4 py-3 font-bold">زمان در ایستگاه</th>
                        <th className="px-4 py-3 font-bold">مسیر کامل امروز</th>
                        <th className="px-4 py-3 font-bold">عملیات سریع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {snapshot.patients.map((p) => {
                        const curr = p.stations.find(
                          (s) =>
                            s.status === "in_progress" ||
                            s.status === "checked_in" ||
                            s.status === "waiting"
                        );
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3">
                              <div className="font-extrabold text-slate-900">
                                {p.fullName}
                              </div>
                              <div
                                dir="ltr"
                                className="inline-block font-mono text-[11px] text-sky-700"
                              >
                                {p.qrToken}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {p.pathwayTitle}
                            </td>
                            <td className="px-4 py-3">
                              {curr ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 font-bold text-sky-800">
                                  {curr.roomName}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">
                                  تکمیل تمامی ایستگاه‌ها
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold tabular-fa">
                              {curr ? <>{toFaDigits(curr.spentMinutes)} دقیقه{(curr.status === "waiting" || curr.status === "checked_in") && <span className="mt-1 block text-[10px] font-semibold text-blue-700">{toFaDigits(curr.queueAhead)} نفر جلوتر · حدود {toFaDigits(curr.estimatedWaitMinutes)} دقیقه تا فراخوان</span>}</> : "ترخیص آماده"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {p.stations.map((s) => (
                                  <span
                                    key={s.id}
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                      s.status === "completed"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : s.status === "sample_taken"
                                          ? "bg-amber-100 text-amber-800"
                                          : s.status === "pending"
                                            ? "bg-slate-100 text-slate-500"
                                            : "bg-sky-600 text-white"
                                    }`}
                                  >
                                    {s.roomName}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onSwitchToPatientMobile(p.id)}
                                  className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 font-bold text-sky-700 hover:bg-sky-100"
                                >
                                  همراه بیمار
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQueuePatientId(p.id);
                                    setSection("queue");
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100"
                                >
                                  مدیریت صف
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= 2. CHECK-IN & PATHWAY SETUP ================= */}
        {section === "checkin" && (
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              {/* STEP 1: national id lookup */}
              <form onSubmit={handleLookup} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">۱</span><h1 className="text-base font-extrabold text-slate-900">کد ملی بیمار را وارد کنید</h1></div>
                <p className="mt-1 text-xs text-slate-500">ابتدا سوابق جست‌وجو می‌شود؛ اگر بیمار قبلاً مراجعه داشته، اطلاعات و سوابق او به‌صورت خودکار بارگذاری می‌شود.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div><input dir="ltr" inputMode="numeric" autoFocus aria-label="کد ملی بیمار" value={lookupId} onChange={(e) => { lookupVersion.current++; setLookupId(e.target.value); setLookup(null); setLookupError(""); setNationalId(""); }} placeholder="0012345678" className="app-input max-w-xs font-mono text-left" /><div className="mt-1 text-left text-[10px] text-slate-400" dir="ltr">{toFaDigits(normalizeNationalId(lookupId).length)} / {toFaDigits(10)}</div></div>
                  <button type="submit" disabled={lookupBusy || normalizeNationalId(lookupId).length !== 10} className="primary-button"><Search className="h-4 w-4" />{lookupBusy ? "در حال جست‌وجو..." : "جست‌وجو در سوابق"}</button>
                  {lookup && <button type="button" onClick={resetAdmission} className="secondary-button">کد ملی دیگر</button>}
                </div>
                {lookupError && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600">{lookupError}</p>}
                {lookup && !lookup.found && <p className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-800">سابقه‌ای برای این کد ملی یافت نشد. بیمار جدید است؛ اطلاعات را در مرحله بعد تکمیل کنید.</p>}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => setDirectoryOpen(true)} className="secondary-button w-full justify-between !py-3">
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Search className="h-4 w-4 text-teal-600" />جست‌وجوی پیشرفته بیمار (نام خانوادگی، کد ملی، تلفن، بسته و ایستگاه فعلی)</span>
                    <span className="text-[10px] text-teal-700">باز کردن جدول نتایج ←</span>
                  </button>
                  <p className="mt-2 text-[10px] leading-6 text-slate-400">بخشی از نام یا نام خانوادگی کافی است؛ مثلاً «تابش» یا «مریم»، و چند کلمه هم پشتیبانی می‌شود.</p>
                </div>
                {lookup?.found && lookup.patient && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900"><History className="h-4 w-4" />بیمار تکراری — سوابق بارگذاری شد</div>
                      <span className="text-[10px] text-amber-800">{toFaDigits(lookup.visits?.length ?? 0)} مراجعه قبلی</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-700"><strong>{lookup.patient.fullName}</strong> · {toFaDigits(lookup.patient.age)} ساله · {lookup.patient.gender} · {toFaDigits(lookup.patient.phone)}</div>
                    {lookup.patient.allergies.length > 0 && <div className="mt-2 text-[11px] font-bold text-red-700">حساسیت ثبت‌شده: {lookup.patient.allergies.map((a) => a.substance).join("، ")}</div>}
                    {lookup.patient.medications.length > 0 && <div className="mt-1 text-[11px] text-slate-600">داروهای ثبت‌شده: {lookup.patient.medications.map((m) => m.name).join("، ")}</div>}
                    <ul className="mt-2 space-y-1 text-[10px] text-slate-500">
                      {(lookup.visits ?? []).slice(0, 4).map((v) => <li key={v.id} className="flex items-center justify-between rounded-lg bg-white/70 px-2.5 py-1.5"><span>{v.pathwayTitle}</span><span>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(new Date(v.checkInTime))} · {v.completedAt ? "تکمیل شده" : "فعال"}</span></li>)}
                    </ul>
                    {lookup.activeVisitId && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-white p-3 text-[11px] text-red-700">
                        <span>این بیمار هم‌اکنون یک مراجعه فعال دارد و نمی‌توان پذیرش جدید ثبت کرد.</span>
                        <button type="button" onClick={() => onSwitchToPatientMobile(lookup.activeVisitId!)} className="secondary-button">باز کردن پرونده فعال</button>
                      </div>
                    )}
                    {!lookup.activeVisitId && <p className="mt-2 text-[10px] text-amber-800">شرح حال، داروها و حساسیت‌های مراجعه قبلی به پرونده جدید منتقل می‌شود.</p>}
                  </div>
                )}
              </form>

              {/* STEP 2: details + pathway (enabled after lookup) */}
              <form onSubmit={handleCheckinSubmit} className={`space-y-4 rounded-2xl border border-slate-200 bg-white p-5 ${!lookup || lookup.activeVisitId ? "pointer-events-none opacity-50" : ""}`} aria-disabled={!lookup || Boolean(lookup.activeVisitId)}>
                <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">۲</span><h2 className="text-base font-extrabold text-slate-900">{lookup?.found ? "تایید اطلاعات و انتخاب بسته امروز" : "ثبت مشخصات بیمار جدید و بسته امروز"}</h2></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label htmlFor="admission-name" className="mb-1 block text-xs font-bold text-slate-700">نام و نام خانوادگی</label><input id="admission-name" name="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs" /></div>
                  <div><label htmlFor="admission-national-id" className="mb-1 block text-xs font-bold text-slate-700">کد ملی</label><input id="admission-national-id" name="nationalId" type="text" dir="ltr" readOnly value={nationalId} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-left" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label htmlFor="admission-age" className="mb-1 block text-xs font-bold text-slate-700">سن</label><input id="admission-age" name="age" type="text" value={age} onChange={(e) => setAge(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs" /></div>
                    <div><label htmlFor="admission-gender" className="mb-1 block text-xs font-bold text-slate-700">جنسیت</label><select id="admission-gender" name="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs"><option value="مرد">مرد</option><option value="زن">زن</option></select></div>
                  </div>
                  <div><label htmlFor="admission-phone" className="mb-1 block text-xs font-bold text-slate-700">شماره تلفن همراه</label><input id="admission-phone" name="phone" type="text" required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲۳۴۵۶۷۸۹" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs" /></div>
                </div>
                <div className="pt-1">
                  <label className="mb-2 block text-xs font-extrabold text-slate-800">بسته خدمات درمانی امروز:</label>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {snapshot.pathways.map((pkg) => (
                      <button key={pkg.id} type="button" onClick={() => handleSelectPathway(pkg.id)} className={`rounded-xl border p-3 text-right transition ${pkg.id === selectedPathwayId ? "border-teal-600 bg-teal-50/60 ring-2 ring-teal-100" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"}`}>
                        <div className="flex items-center justify-between"><span className="text-xs font-extrabold text-slate-900">{pkg.title}</span><span className="text-[10px] font-bold text-teal-700">~{toFaDigits(pkg.estimatedTotalMinutes)} دقیقه</span></div>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{pkg.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="mb-2 text-xs font-bold text-slate-700">ایستگاه‌های مسیر امروز (به ترتیب مراجعه):</div>
                  <div className="flex flex-wrap gap-2">
                    {snapshot.rooms.map((rm) => { const idx = customStations.indexOf(rm.code); const active = idx !== -1; return (
                      <button key={rm.code} type="button" onClick={() => toggleStationInCheckin(rm.code)} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${active ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
                        {active && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] text-teal-700">{toFaDigits(idx + 1)}</span>}{rm.name}
                      </button>); })}
                  </div>
                </div>
                <button type="submit" disabled={busy || customStations.length === 0 || !lookup || Boolean(lookup.activeVisitId)} className="primary-button w-full justify-center py-3.5 text-sm"><QrCode className="h-5 w-5" />ثبت پذیرش و صدور QR همراه بیمار</button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5">
              <h3 className="text-sm font-extrabold text-slate-900">کارت پذیرش و QR همراه بیمار</h3>
              <p className="mt-1 text-xs text-slate-500">بیمار با اسکن این کد، بدون رمز عبور فقط به مسیر و پرونده خودش دسترسی دارد.</p>
              {issuedQrPatient ? (
                <div className="mt-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/50 p-5 text-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4" />پذیرش ثبت شد</div>
                  <h4 className="mt-3 text-base font-extrabold text-slate-900">{issuedQrPatient.name}</h4>
                  <p className="mt-0.5 text-xs text-slate-600">{issuedQrPatient.pathway}</p>
                  <div className="mt-4 flex justify-center"><QrCodeVisual token={issuedQrPatient.qrToken} size={160} /></div>
                  <button type="button" onClick={() => onSwitchToPatientMobile(issuedQrPatient.id)} className="primary-button mt-4 w-full justify-center"><Smartphone className="h-4 w-4" />باز کردن پرونده این بیمار</button>
                </div>
              ) : (
                <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center"><QrCode className="mb-4 h-16 w-16 stroke-1 text-slate-200" /><h4 className="text-xs font-semibold text-slate-500">کارت پذیرش بیمار اینجا نمایش داده می‌شود</h4><p className="mt-2 text-[11px] leading-6 text-slate-400">پس از ثبت فرم، QR اختصاصی و لینک ورود بیمار به‌صورت خودکار ایجاد می‌شود.</p></div>
              )}
            </div>
          </div>
        )}

        {/* ================= 3. DYNAMIC QUEUE MANAGEMENT ================= */}
        {section === "queue" && queueTargetPatient && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-extrabold text-slate-900">
                    مدیریت پویا صف‌ها و تغییر هوشمند ترتیب ایستگاه‌ها
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-500">
                    در صورت شلوغی یک بخش (مثلاً متخصص قلب)، بیمار را به ایستگاه
                    خلوت‌تر (مثلاً دندانپزشکی) هدایت کنید تا زمان بیمار تلف نشود.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  <select
                    value={queueTargetPatient.id}
                    onChange={(e) => setQueuePatientId(Number(e.target.value))}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-900"
                  >
                    {snapshot.patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.pathwayTitle})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {queueSavedBanner && (
                <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                  {queueSavedBanner}
                </div>
              )}

              {/* Room boards: manual per-room queue */}
              <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/60 p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-900"><LayoutGrid className="h-4 w-4" />تابلوی اتاق‌ها — مدیریت دستی صف هر اتاق</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {snapshot.rooms.map((rm) => { const n = roomCongestion.get(rm.code)?.activePatients.length ?? 0; return <button key={rm.code} type="button" onClick={() => setOpenRoomCode(rm.code)} className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-1.5 text-[11px] font-bold text-teal-800 hover:bg-teal-100">{rm.name}<span className={`rounded-md px-1.5 py-0.5 text-[10px] ${n >= 2 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{toFaDigits(n)}</span></button>; })}
                </div>
              </div>

              {/* Congestion Overview Strip */}
              <div className="mt-4 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                {snapshot.rooms.map((rm) => {
                  const cg = roomCongestion.get(rm.code);
                  const count = cg?.activePatients.length ?? 0;
                  const maxWait = cg?.totalWaitMins ?? 0;
                  const crowded = count >= 2 || maxWait >= 25;
                  return (
                    <div
                      key={rm.code}
                      className={`rounded-xl border p-2.5 text-xs ${
                        crowded
                          ? "border-red-200 bg-red-50"
                          : count === 0
                            ? "border-emerald-200 bg-emerald-50/60"
                            : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="truncate font-bold text-slate-900">
                        {rm.name}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span>صف: {toFaDigits(count)} نفر</span>
                        <span
                          className={`font-bold ${
                            crowded
                              ? "text-red-700"
                              : count === 0
                                ? "text-emerald-700"
                                : "text-slate-600"
                          }`}
                        >
                          {crowded ? "شلوغ" : count === 0 ? "خلوت" : "عادی"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Smart 1-Click Optimization Button */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3.5">
                <div className="flex items-center gap-2 text-xs text-sky-950">
                  <Sparkles className="h-4 w-4 shrink-0 text-sky-600" />
                  <span>
                    پیشنهاد هماهنگ‌کننده هوشمند برای{" "}
                    <strong>{queueTargetPatient.fullName}</strong>: هدایت خودکار به
                    خلوت‌ترین ایستگاه باقی‌مانده و ارسال اعلان فوری به پرونده بیمار.
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    handleSmartBypassCrowdedRoom(queueTargetPatient)
                  }
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  هدایت هوشمند به ایستگاه خلوت‌تر
                </button>
              </div>

              {/* Station Reorder List */}
              <div className="mt-4 space-y-2.5">
                {queueTargetPatient.stations.map((st, idx) => {
                  const locked =
                    st.status === "completed" || st.status === "sample_taken";
                  const cgCount =
                    roomCongestion.get(st.roomCode)?.activePatients.length ?? 0;

                  return (
                    <div
                      key={st.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 ${
                        st.status === "completed"
                          ? "border-emerald-200 bg-emerald-50/40 opacity-80"
                          : st.status === "waiting" ||
                              st.status === "checked_in"
                            ? "border-sky-400 bg-sky-50/50"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                          {toFaDigits(st.stepOrder)}
                        </span>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">
                            {st.roomName}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            وضعیت فعلی:{" "}
                            {st.status === "completed"
                              ? "انجام‌شده (قفل)"
                              : st.status === "sample_taken"
                                ? "نمونه‌گیری انجام‌شده"
                                : st.status === "waiting"
                                  ? "در صف انتظار فعلی"
                                  : st.status === "checked_in"
                                    ? "پشت درب اتاق"
                                    : "باقی‌مانده در مسیر"}{" "}
                            • نفرات حاضر در این بخش: {toFaDigits(cgCount)} نفر
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={
                            busy ||
                            locked ||
                            idx === 0 ||
                            queueTargetPatient.stations[idx - 1]?.status ===
                              "completed"
                          }
                          onClick={() =>
                            handleMoveStationOrder(queueTargetPatient, idx, -1)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-35"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                          اولویت بالاتر
                        </button>
                        <button
                          type="button"
                          disabled={
                            busy ||
                            locked ||
                            idx === queueTargetPatient.stations.length - 1
                          }
                          onClick={() =>
                            handleMoveStationOrder(queueTargetPatient, idx, 1)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-35"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                          انتقال به بعد
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. PATIENT ALERTS & SMS ================= */}
        {section === "alerts" && (
          <div className="grid gap-5 lg:grid-cols-12">
            <form
              onSubmit={handleSendAlert}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-7"
            >
              <div>
                <h1 className="text-lg font-extrabold text-slate-900">
                  ارسال فراخوان و اعلان به همراه بیمار
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  اعلان ارسالی بلافاصله در بالای اپلیکیشن پرونده بیمار نمایش داده
                  می‌شود.
                </p>
              </div>

              {alertSentBanner && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                  {alertSentBanner}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    انتخاب بیمار مقصد
                  </label>
                  <select
                    value={alertPatientId}
                    onChange={(e) => setAlertPatientId(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold"
                  >
                    {snapshot.patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    نوع اعلان
                  </label>
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold"
                  >
                    <option value="move_to_room">
                      یادآوری حرکت به سمت ایستگاه بعدی
                    </option>
                    <option value="result_ready">
                      اطلاع‌رسانی آماده شدن جواب آزمایش / نوار قلب
                    </option>
                    <option value="queue_reorder">
                      اطلاع‌رسانی تغییر نوبت جهت کاهش انتظار
                    </option>
                  </select>
                </div>
              </div>

              {(() => {
                const target = snapshot.patients.find((p) => p.id === alertPatientId);
                const station = target?.stations.find((st) => ["waiting", "checked_in"].includes(st.status));
                const roomInfo = snapshot.rooms.find((r) => r.code === station?.roomCode);
                return station ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-[11px] leading-6 text-blue-900">
                    <strong>وضعیت زنده صف برای این بیمار:</strong> {station.roomName} · {toFaDigits(station.queueAhead)} نفر جلوتر · حدود {toFaDigits(station.estimatedWaitMinutes)} دقیقه تا فراخوان.
                    {roomInfo && <span className="block text-blue-700">بر اساس ترتیب فعلی صف و میانگین زمان خدمت {roomInfo.specialistName} ({toFaDigits(roomInfo.avgServiceMinutes)} دقیقه). این برآورد هنگام ارسال پیام حرکت، به متن اعلان اضافه می‌شود.</span>}
                  </div>
                ) : <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">این بیمار در حال حاضر در صفِ در انتظار فراخوان نیست.</div>;
              })()}

              {/* Quick Templates */}
              <div>
                <div className="mb-1.5 text-xs font-bold text-slate-600">
                  قالب‌های پیام آماده:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "لطفاً هم‌اکنون به ایستگاه بعدی خود مراجعه فرمایید؛ اتاق آماده پذیرش شماست.",
                    "جواب آزمایش خون شما آماده شد و مستقیماً در پرونده پزشک متخصص بارگذاری گردید.",
                    "لطفاً پیش از ورود به اتاق نوار قلب، ساعت هوشمند و اشیای فلزی همراه را خارج نمایید.",
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAlertMessage(tpl)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-right text-[11px] text-slate-700 hover:bg-sky-50 hover:text-sky-800"
                    >
                      {tpl.slice(0, 48)}...
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  متن اعلان و فراخوان
                </label>
                <textarea
                  rows={3}
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-xs font-extrabold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                ارسال فوری اعلان به همراه بیمار
              </button>
            </form>

            {/* Recent Sent Alerts Log */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-5">
              <h3 className="text-sm font-extrabold text-slate-900">
                آخرین فراخوان‌های ارسال‌شده امروز
              </h3>
              <div className="mt-3 max-h-[420px] space-y-2.5 overflow-y-auto">
                {snapshot.patients
                  .flatMap((p) =>
                    p.alerts.map((a) => ({ ...a, patientName: p.fullName }))
                  )
                  .slice(0, 12)
                  .map((al) => (
                    <div
                      key={al.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">
                          {al.patientName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatFaTime(al.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 leading-relaxed text-slate-700">
                        {al.message}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </section>
      {openRoomCode && (() => { const rm = snapshot.rooms.find((r) => r.code === openRoomCode); return rm ? <RoomQueueBoard snapshot={snapshot} room={rm} onClose={() => setOpenRoomCode(null)} onOpenPatient={(id) => { setOpenRoomCode(null); onSwitchToPatientMobile(id); }} onAction={onAction} busy={busy} /> : null; })()}
      {directoryOpen && <PatientDirectoryDialog open snapshot={snapshot} onClose={() => setDirectoryOpen(false)} onSelect={applyDirectorySelection} onOpenRecord={(patientId) => { setDirectoryOpen(false); onSwitchToPatientMobile(patientId); }} />}
    </div>
  );
}
