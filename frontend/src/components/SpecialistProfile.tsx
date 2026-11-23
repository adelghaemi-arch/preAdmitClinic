/*
 File: frontend/src/components/SpecialistProfile.tsx
 Description: فهرست همهٔ بیماران کلینیک + پروندهٔ اولویت‌دار (مثبت/توضیح) و مدارک برای پزشک
 Parent Dependencies: FormResponseSummary, specialist-patient-map, ClinicOrchestratorApp
 */
import { ResultAttachment } from "./ResultAttachment";

import { AppInput, AppTextarea } from "@/components/AppInput";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  FlaskConical,
  FolderOpen,
  Navigation,
  Pill,
  Plus,
  Search,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Stethoscope,
  Trash2,
  Users,
} from "lucide-react";
import type { ClinicSnapshot, PatientFullDto, PatientIntakeDocumentGroup } from "@/types/clinic";
import type { PrescriptionItem } from "@/types/clinic";
import { formatFaTime, toFaDigits } from "@/lib/persian";
import { FormResponseSummary } from "./FormResponseSummary";
import { IntakeFileThumbGrid } from "./IntakeFileThumbGrid";
import type { SpecialistDirectoryRow } from "@/lib/specialist-patient-map";
import { intakeDocumentLabelFa, isIntakeDocumentType } from "@/lib/intake-documents";

type SpecialistSection = "waiting" | "brief" | "notes" | "complete";

interface SpecialistProfileProps {
  snapshot: ClinicSnapshot;
  onSwitchToPatientMobile: (patientId: number) => void;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
  embedded?: boolean;
  initialSection?: SpecialistSection;
  onSectionChange?: (section: SpecialistSection) => void;
  initialPatientId?: number;
  /** Logged-in app user id — used to default the doctor desk from staff.appUserId. */
  sessionUserId?: number;
}

function groupDocumentsByType(docs: PatientIntakeDocumentGroup[] | undefined) {
  const map = new Map<string, PatientIntakeDocumentGroup[]>();
  for (const g of docs ?? []) {
    const key = g.typeLabelFa || (isIntakeDocumentType(g.documentType) ? intakeDocumentLabelFa(g.documentType) : g.documentType);
    const list = map.get(key) ?? [];
    list.push(g);
    map.set(key, list);
  }
  return [...map.entries()];
}

export function SpecialistProfile({
  snapshot,
  onSwitchToPatientMobile,
  onAction,
  busy,
  initialSection = "brief",
  onSectionChange,
  embedded = false,
  initialPatientId,
  sessionUserId,
}: SpecialistProfileProps) {
  const specialistStaff = useMemo(
    () => snapshot.staff.filter((s) => s.role === "specialist" && s.isActive && s.roomCode),
    [snapshot.staff]
  );

  // When opened from the dashboard for a specific patient, focus the room that
  // patient is actually routed to; otherwise prefer the logged-in doctor's desk.
  const focusPatient = initialPatientId
    ? snapshot.patients.find((p) => p.id === initialPatientId)
    : undefined;
  const focusRoomCode =
    focusPatient?.stations.find(
      (s) => s.category === "specialist" && s.status !== "completed"
    )?.roomCode ??
    focusPatient?.stations.find((s) => s.category === "specialist")?.roomCode;

  const linkedDoc =
    sessionUserId != null
      ? specialistStaff.find((s) => s.appUserId === sessionUserId)
      : undefined;

  const defaultDoc =
    (focusRoomCode
      ? specialistStaff.find((s) => s.roomCode === focusRoomCode)
      : undefined) ??
    linkedDoc ??
    specialistStaff.find((s) => s.roomCode === "PULMO") ??
    specialistStaff[0];

  const [activeStaffId, setActiveStaffId] = useState<number>(
    defaultDoc?.id ?? 1
  );
  // اتمام ویزیت صف‌محور فعلاً خارج از دامنه است
  const [section, setLocalSection] = useState<SpecialistSection>(
    initialSection === "complete" ? "waiting" : initialSection
  );
  const setSection = (next: SpecialistSection) => {
    const safe = next === "complete" ? "waiting" : next;
    setLocalSection(safe);
    onSectionChange?.(safe);
  };

  const activeDoctor =
    specialistStaff.find((s) => s.id === activeStaffId) ?? specialistStaff[0];
  const doctorRoomCode = activeDoctor?.roomCode ?? "PULMO";

  // Patients whose pathway today includes this specialist's room
  const myPatients = useMemo(() => {
    return snapshot.patients
      .map((p) => {
        const myStation = p.stations.find((s) => s.roomCode === doctorRoomCode);
        return myStation ? { patient: p, myStation } : null;
      })
      .filter(
        (
          item
        ): item is {
          patient: PatientFullDto;
          myStation: PatientFullDto["stations"][number];
        } => Boolean(item)
      )
      .sort((a, b) => {
        // Manual room queue rank first, then arrival time; completed visits at the end.
        const weight = (s: PatientFullDto["stations"][number]) => s.status === "in_progress" ? 0 : s.status === "waiting" || s.status === "checked_in" ? 1 : s.status === "completed" ? 3 : 2;
        if (weight(a.myStation) !== weight(b.myStation)) return weight(a.myStation) - weight(b.myStation);
        const ra = a.myStation.queueRank || Number.MAX_SAFE_INTEGER, rb = b.myStation.queueRank || Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return (a.myStation.enteredQueueAt ? new Date(a.myStation.enteredQueueAt).getTime() : 0) - (b.myStation.enteredQueueAt ? new Date(b.myStation.enteredQueueAt).getTime() : 0);
      });
  }, [snapshot.patients, doctorRoomCode]);

  const [selectedPatientId, setSelectedPatientId] = useState<number>(
    myPatients.some((x) => x.patient.id === initialPatientId)
      ? (initialPatientId as number)
      : (myPatients.find(
          (x) =>
            x.myStation.status === "checked_in" ||
            x.myStation.status === "waiting" ||
            x.myStation.status === "in_progress"
        )?.patient.id ??
        myPatients[0]?.patient.id ??
        initialPatientId ??
        0)
  );

  const [directory, setDirectory] = useState<SpecialistDirectoryRow[]>([]);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [onlyMyRoomToday, setOnlyMyRoomToday] = useState(false);
  const [directoryBusy, setDirectoryBusy] = useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [chartBusy, setChartBusy] = useState(false);

  const clinicId =
    snapshot.platform.clinics.find((c) => c.isCurrentTenant)?.id ??
    snapshot.platform.clinics[0]?.id ??
    "";

  const loadDirectory = useCallback(
    async (q: string) => {
      setDirectoryBusy(true);
      setDirectoryError("");
      try {
        const data = (await onAction({
          action: "SEARCH_SPECIALIST_PATIENTS",
          clinicId,
          query: q,
          take: 50,
          silent: true,
        })) as { ok?: boolean; candidates?: SpecialistDirectoryRow[] };
        setDirectory(Array.isArray(data?.candidates) ? data.candidates : []);
      } catch (e) {
        setDirectory([]);
        setDirectoryError(e instanceof Error ? e.message : "بارگذاری فهرست بیماران انجام نشد.");
      } finally {
        setDirectoryBusy(false);
      }
    },
    [clinicId, onAction]
  );

  useEffect(() => {
    if (section !== "waiting") return;
    void loadDirectory(directoryQuery);
    // فقط ورود به تب فهرست — جستجوی بعدی با دکمه
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const roomTodayIds = useMemo(() => new Set(myPatients.map((x) => x.patient.id)), [myPatients]);

  const visibleDirectory = useMemo(() => {
    if (!onlyMyRoomToday) return directory;
    // فیلتر اختیاری: فقط کسانی که امروز در صف اتاق این پزشک هستند
    return directory.filter((row) => roomTodayIds.has(row.localId));
  }, [directory, onlyMyRoomToday, roomTodayIds]);

  const hydratedPatient =
    snapshot.patients.find((p) => p.id === selectedPatientId) ??
    snapshot.patients.find((p) => p.serverId && directory.some((d) => d.serverId === p.serverId && d.localId === selectedPatientId));

  const queueEntry = myPatients.find((x) => x.patient.id === selectedPatientId);

  // پرونده hydrate‌شده از API اولویت دارد؛ صف اتاق فقط برای فراخوان/اتمام
  const activePatient: PatientFullDto | undefined =
    hydratedPatient ?? queueEntry?.patient ?? myPatients[0]?.patient;

  const activeEntry = activePatient
    ? {
        patient: activePatient,
        myStation:
          queueEntry?.myStation ??
          activePatient.stations.find((s) => s.roomCode === doctorRoomCode) ??
          activePatient.stations[0] ?? {
            id: 0,
            patientId: activePatient.id,
            roomCode: doctorRoomCode,
            roomName: activeDoctor?.specialtyOrDept ?? "مطب",
            category: "specialist",
            stepOrder: 1,
            status: "pending" as const,
            enteredQueueAt: null,
            checkedInAt: null,
            startedAt: null,
            completedAt: null,
            spentMinutes: 0,
            addedByDoctor: null,
            queueRank: 0,
            queueAhead: 0,
            estimatedWaitMinutes: 0,
          },
      }
    : undefined;

  const openChart = async (row: SpecialistDirectoryRow) => {
    setChartBusy(true);
    try {
      const data = (await onAction({
        action: "OPEN_SPECIALIST_CHART",
        serverPatientId: row.serverId,
      })) as { ok?: boolean; patientId?: number };
      const nextId = Number(data?.patientId ?? row.localId);
      setSelectedPatientId(nextId);
      setSection("brief");
    } catch {
      // toast از orchestrator
    } finally {
      setChartBusy(false);
    }
  };

  // Clinical Note Form State
  const [chiefComplaint, setChiefComplaint] = useState(
    "معاینه تخصصی در مسیر چکاپ یک‌روزه و بررسی یافته‌های قبلی"
  );
  const [examFindings, setExamFindings] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [referralNote, setReferralNote] = useState("");
  const [urgentRoomCode, setUrgentRoomCode] = useState("");
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);

  const [rxDrug, setRxDrug] = useState("");
  const [rxDosage, setRxDosage] = useState("");
  const [rxInst, setRxInst] = useState("");
  const [rxDur, setRxDur] = useState("۱ ماه");

  const [feedbackBanner, setFeedbackBanner] = useState("");
  const [completedPatientIdForPreview, setCompletedPatientIdForPreview] =
    useState<number | null>(null);

  const handleDoctorSwitch = (staffId: number) => {
    setActiveStaffId(staffId);
    const nextDoc = specialistStaff.find((s) => s.id === staffId);
    if (nextDoc?.roomCode) {
      const candidates = snapshot.patients.filter((p) =>
        p.stations.some((s) => s.roomCode === nextDoc.roomCode)
      );
      const priority =
        candidates.find((p) =>
          p.stations.some(
            (s) =>
              s.roomCode === nextDoc.roomCode &&
              (s.status === "checked_in" ||
                s.status === "waiting" ||
                s.status === "in_progress")
          )
        ) ?? candidates[0];
      if (priority) {
        setSelectedPatientId(priority.id);
      }
    }
  };

  const applyQuickClinicalTemplate = () => {
    setExamFindings("وضعیت عمومی:\nعلائم حیاتی:\nیافته‌های معاینه تخصصی:\nبررسی نتایج تشخیصی:");
  };

  const addPrescriptionRow = () => {
    if (!rxDrug.trim()) return;
    setPrescriptions((prev) => [
      ...prev,
      {
        drug: rxDrug.trim(),
        dosage: rxDosage.trim() || "طبق دستور",
        instruction: rxInst.trim() || "روزانه",
        duration: rxDur.trim() || "۱ ماه",
      },
    ]);
    setRxDrug("");
    setRxDosage("");
    setRxInst("");
  };

  const handleSaveNoteAndOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntry || !activeDoctor) return;

    await onAction({
      action: "SAVE_CLINICAL_NOTE_AND_ORDERS",
      patientId: activeEntry.patient.id,
      stationId: activeEntry.myStation.id,
      roomCode: doctorRoomCode,
      doctorName: activeDoctor.fullName,
      specialty: activeDoctor.specialtyOrDept,
      chiefComplaint,
      examFindings: examFindings.trim() || "معاینه تخصصی انجام شد.",
      diagnosis: diagnosis.trim() || "تحت نظر و پیگیری درمانی",
      prescriptions,
      referralNote,
      addUrgentRoomCode: urgentRoomCode || undefined,
    });

    setFeedbackBanner(
      urgentRoomCode
        ? "معاینه، تشخیص و نسخه ثبت شد و ایستگاه ارجاع جدید به مسیر امروز سلامتجو اضافه گردید."
        : "معاینه، تشخیص و نسخه دارویی در پرونده لحظه‌ای سلامتجو ثبت گردید."
    );
    setUrgentRoomCode("");
    // بدون صف/اتمام ویزیت: بعد از ثبت به فهرست بیماران برگرد
    setSection("waiting");
    setTimeout(() => setFeedbackBanner(""), 4500);
  };

  const handleCallPatientIn = async (patientId: number, stationId: number) => {
    if (!activeDoctor) return;
    await onAction({
      action: "CALL_PATIENT_IN",
      patientId,
      stationId,
      doctorName: activeDoctor.fullName,
    });
    setSelectedPatientId(patientId);
    setFeedbackBanner(`فراخوان ورود به مطب برای سلامتجو ارسال شد؛ وضعیت به «در حال معاینه» تغییر کرد.`);
    setTimeout(() => setFeedbackBanner(""), 4000);
  };

  const handleCompleteStation = async () => {
    if (!activeEntry) return;
    await onAction({
      action: "COMPLETE_SPECIALIST_STATION",
      patientId: activeEntry.patient.id,
      stationId: activeEntry.myStation.id,
    });
    setCompletedPatientIdForPreview(activeEntry.patient.id);
    setFeedbackBanner(
      `اتمام ویزیت «${activeEntry.patient.fullName}» تایید شد! ایستگاه در گوشی سلامتجو سبز شد و نقشه ایستگاه بعدی خودکار باز گردید.`
    );
  };

  // Detect allergy conflict in typed drug
  const allergyConflict = useMemo(() => {
    if (!activeEntry || !rxDrug.trim()) return null;
    const lower = rxDrug.trim().toLowerCase();
    return activeEntry.patient.allergies.find(
      (a) =>
        a.substance.toLowerCase().includes(lower) ||
        lower.includes(a.substance.slice(0, 5).toLowerCase())
    );
  }, [activeEntry, rxDrug]);

  return (
    <div className="module-content space-y-5">
      {/* Right-hand RTL Specialist Sidebar */}
      

      {/* Main Specialist Content Area */}
      <section className="min-w-0 space-y-5">
        <div className="module-toolbar">
          <div className={embedded ? "hidden" : "section-tabs"}>
            {([['waiting', 'فهرست بیماران'], ['brief', 'خلاصه پرونده'], ['notes', 'معاینه و نسخه']] as const).map(([id, title]) => <button type="button" key={id} onClick={() => setSection(id)} className={section === id ? 'active' : ''}>{title}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {specialistStaff.length > 0 && (
              <select aria-label="پزشک معالج" value={activeDoctor?.id} onChange={(e) => handleDoctorSwitch(Number(e.target.value))} className="app-select max-w-60">{specialistStaff.map((d) => <option key={d.id} value={d.id}>{d.fullName} · {d.specialtyOrDept}</option>)}</select>
            )}
            {activePatient && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">
                پرونده: {activePatient.fullName}
              </span>
            )}
          </div>
        </div>

        {feedbackBanner && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900">
            <span>{feedbackBanner}</span>
            {completedPatientIdForPreview && (
              <button
                type="button"
                onClick={() =>
                  onSwitchToPatientMobile(completedPatientIdForPreview)
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Smartphone className="h-4 w-4" />
                مشاهده مسیر به‌روزشده سلامتجو
              </button>
            )}
          </div>
        )}

        {/* ================= 1. PATIENT DIRECTORY (UC-SPC-01/02) ================= */}
        {section === "waiting" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h1 className="text-lg font-extrabold text-slate-900">فهرست بیماران</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              همهٔ بیماران ثبت‌شدهٔ کلینیک — فیلتر با نام، کد ملی یا موبایل؛ باز کردن پروندهٔ کامل با اولویت موارد مثبت و توضیحات
            </p>

            <form
              className="mt-4 flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void loadDirectory(directoryQuery);
              }}
            >
              <AppInput
                aria-label="جستجوی بیمار"
                value={directoryQuery}
                onChange={(e) => setDirectoryQuery(e.target.value)}
                placeholder="نام، کد ملی یا موبایل"
                className="app-input min-w-56 flex-1"
              />
              <button
                type="submit"
                disabled={busy || directoryBusy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" />
                {directoryBusy ? "در حال جستجو…" : "جستجو"}
              </button>
              <button
                type="button"
                disabled={busy || directoryBusy}
                onClick={() => {
                  setDirectoryQuery("");
                  void loadDirectory("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                همه
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyMyRoomToday}
                  onChange={(e) => setOnlyMyRoomToday(e.target.checked)}
                  className="rounded border-slate-300"
                />
                فقط امروز در مطب من
              </label>
            </form>

            {directoryError && (
              <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {directoryError}
              </p>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                    <th className="px-2 py-2 font-semibold">نام</th>
                    <th className="px-2 py-2 font-semibold">کد ملی</th>
                    <th className="px-2 py-2 font-semibold">موبایل</th>
                    <th className="px-2 py-2 font-semibold">پیش‌پذیرش</th>
                    <th className="px-2 py-2 font-semibold">بسته</th>
                    <th className="px-2 py-2 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {visibleDirectory.length === 0 && !directoryBusy ? (
                    <tr>
                      <td colSpan={6} className="px-2 py-8 text-center text-slate-500">
                        {onlyMyRoomToday
                          ? "بیماری با فیلتر «امروز در مطب من» یافت نشد."
                          : "بیماری در فهرست نیست؛ عبارت جستجو را تغییر دهید یا «همه» را بزنید."}
                      </td>
                    </tr>
                  ) : (
                    visibleDirectory.map((row) => (
                      <tr key={row.serverId} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="px-2 py-2.5 font-bold text-slate-900">
                          {row.fullName}
                          {row.age > 0 && (
                            <span className="mr-1 font-normal text-slate-500">({toFaDigits(row.age)} ساله)</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 font-mono text-slate-700" dir="ltr">
                          {toFaDigits(row.nationalId || "—")}
                        </td>
                        <td className="px-2 py-2.5 font-mono text-slate-700" dir="ltr">
                          {toFaDigits(row.phone || "—")}
                        </td>
                        <td className="px-2 py-2.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              row.intakeCompleted
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {row.intakeCompleted ? "تکمیل‌شده" : "ناتمام"}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-slate-600">{row.pathwayTitle || "—"}</td>
                        <td className="px-2 py-2.5">
                          <button
                            type="button"
                            disabled={busy || chartBusy}
                            onClick={() => void openChart(row)}
                            className="rounded-xl bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            باز کردن پرونده
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {(directoryBusy || chartBusy) && (
              <p className="mt-3 text-[11px] text-slate-500">
                {chartBusy ? "در حال بارگذاری پرونده…" : "در حال بارگذاری فهرست…"}
              </p>
            )}
          </div>
        )}

        {/* ================= 2. SMART PATIENT BRIEF ================= */}
        {section === "brief" && !activeEntry && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-2xs">
            هنوز پرونده‌ای انتخاب نشده است. از «فهرست بیماران» یک نفر را باز کنید.
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setSection("waiting")}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700"
              >
                رفتن به فهرست بیماران
              </button>
            </div>
          </div>
        )}
        {section === "brief" && activeEntry && (
          <div className="space-y-4">
            {/* Patient Header Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold text-slate-900">
                    خلاصه پرونده: {activeEntry.patient.fullName}
                  </h1>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    {toFaDigits(activeEntry.patient.age)} ساله •{" "}
                    {activeEntry.patient.gender}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  پکیج: {activeEntry.patient.pathwayTitle || "—"} • کد ملی:{" "}
                  {toFaDigits(activeEntry.patient.nationalId)} • موبایل:{" "}
                  {toFaDigits(activeEntry.patient.phone)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSection("waiting")}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  بازگشت به فهرست
                </button>
                <button
                  type="button"
                  onClick={() => setSection("notes")}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-sky-700"
                >
                  ثبت معاینه و نسخه جدید
                </button>
              </div>
              {/* اتمام ویزیت صف‌محور فعلاً مخفی است */}
            </div>

            {/* PROMINENT RED ALLERGY ALERT BANNER */}
            {activeEntry.patient.allergies.length > 0 ? (
              <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-extrabold text-red-800">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  هشدار قرمز حساسیت حیاتی سلامتجو (نمایش همزمان به کلیه پزشکان امروز)
                </div>
                <div className="mt-2.5 grid gap-2 md:grid-cols-2">
                  {activeEntry.patient.allergies.map((al) => (
                    <div
                      key={al.id}
                      className="rounded-xl border border-red-200 bg-white p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-red-700">
                          {al.substance}
                        </span>
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {al.category} • شدت {al.severity}
                        </span>
                      </div>
                      <div className="mt-1 text-slate-700">
                        واکنش بالینی ثبت‌شده: {al.reaction}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs font-bold text-emerald-800">
                ✓ سلامتجو حساسیت دارویی یا غذایی شناخته‌شده‌ای ثبت نکرده است (NKA).
              </div>
            )}

            {/* اولویت بالینی: flags پیش‌فرض؛ سپس پرسشنامه کامل و مدارک */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
              <div className="mb-3">
                <h2 className="text-sm font-extrabold text-teal-900">
                  اولویت بالینی — موارد مثبت، توضیحات و هشدارها
                </h2>
              </div>
              <FormResponseSummary
                patient={activeEntry.patient}
                forms={snapshot.forms ?? []}
                enableViewToggle
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <FolderOpen className="h-4 w-4 text-slate-600" />
                مدارک پیش‌پذیرش
              </h2>
              {!(activeEntry.patient.intakeDocuments?.length) ? (
                <p className="text-xs text-slate-500">هنوز مدرکی در پرونده ثبت نشده است.</p>
              ) : (
                <div className="space-y-5">
                  {groupDocumentsByType(activeEntry.patient.intakeDocuments).map(([label, groups]) => {
                    const files = groups.flatMap((g) => g.files ?? []);
                    if (!files.length) return null;
                    return (
                      <div key={label}>
                        <div className="mb-2 text-[11px] font-bold text-slate-700">{label}</div>
                        <IntakeFileThumbGrid
                          files={files}
                          title={label}
                          fallbackDocumentDate={groups[0]?.documentDate}
                          disabled
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* 2-Column Unified Brief: Left = Fellow Specialists + Paraclinic | Right = Patient Intake */}
            <div className="grid gap-4 lg:grid-cols-12">
              {/* Fellow Specialists' Notes from Earlier Today + Paraclinic */}
              <div className="space-y-4 lg:col-span-7">
                {/* Earlier Specialist Consultations Today */}
                <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-2xs">
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <Stethoscope className="h-4 w-4 text-sky-600" />
                    تشخیص و یادداشت سایر متخصصینی که امروز سلامتجو را دیده‌اند
                  </h2>
                  {activeEntry.patient.clinicalNotes.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      شما اولین پزشک متخصص ویزیت‌کننده این سلامتجو در مسیر امروز
                      هستید.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {activeEntry.patient.clinicalNotes.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-xl border border-sky-100 bg-sky-50/60 p-3.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-extrabold text-sky-950">
                                {note.doctorName}
                              </span>{" "}
                              <span className="font-semibold text-sky-700">
                                ({note.specialty})
                              </span>
                            </div>
                            <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600">
                              ساعت {formatFaTime(note.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 leading-relaxed text-slate-700">
                            <span className="font-bold">معاینه:</span>{" "}
                            {note.examFindings}
                          </p>
                          <p className="mt-1.5 rounded-lg bg-white p-2.5 font-semibold text-slate-900">
                            <span className="font-extrabold text-sky-700">
                              تشخیص ثبت‌شده:
                            </span>{" "}
                            {note.diagnosis}
                          </p>
                          {note.referralNote && (
                            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-950">
                              <span className="font-bold">پیام همکار:</span>{" "}
                              {note.referralNote}
                            </p>
                          )}
                          {note.prescriptions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {note.prescriptions.map((rx, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900"
                                >
                                  دارو: {rx.drug} ({rx.dosage})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Today's Lab & ECG Results */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <FlaskConical className="h-4 w-4 text-teal-600" />
                    نتایج آزمایشگاه، نوار قلب و تصویربرداری امروز
                  </h2>
                  {activeEntry.patient.paraclinicResults.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      هنوز نتیجه پاراکلینیک در پرونده امروز بارگذاری نشده است.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {activeEntry.patient.paraclinicResults.map((res) => (
                        <div
                          key={res.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900">
                              {res.title}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                res.summaryStatus === "نرمال"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {res.summaryStatus}
                            </span>
                          </div>
                          <p className="mt-1.5 text-slate-700">
                            {res.interpretation}
                          </p>
                          {res.metrics.length > 0 && (
                            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                              {res.metrics.map((m, i) => (
                                <div
                                  key={i}
                                  className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 ${
                                    m.abnormal
                                      ? "border-red-200 bg-red-50 text-red-900"
                                      : "border-slate-200 bg-white text-slate-800"
                                  }`}
                                >
                                  <span>{m.parameter}</span>
                                  <span dir="ltr" className="font-bold">
                                    {m.value} {m.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {res.attachmentUrl && (
                            <div className="mt-2.5 overflow-hidden rounded-lg border border-slate-200 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <ResultAttachment url={res.attachmentUrl} title={res.title} fileName={res.fileName} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Self-Reported Intake Column */}
              <div className="space-y-4 lg:col-span-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <Pill className="h-4 w-4 text-sky-600" />
                    داروهای مصرفی فعلی سلامتجو (ثبت‌شده در سالن انتظار)
                  </h2>
                  {activeEntry.patient.medications.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      داروی مستمری توسط سلامتجو ثبت نشده است.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2.5">
                      {activeEntry.patient.medications.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                        >
                          <div className="font-extrabold text-slate-900">
                            {m.name}
                          </div>
                          <div className="mt-0.5 text-slate-600">
                            دوز: {m.dosage} • زمان مصرف: {m.timing}
                          </div>
                          {m.boxImage && (
                            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={m.boxImage}
                                alt={m.name}
                                className="h-24 w-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <h2 className="text-sm font-extrabold text-slate-900">
                    سوابق جراحی و بستری قبلی
                  </h2>
                  {activeEntry.patient.surgeries.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      سابقه جراحی ثبت نشده است.
                    </p>
                  ) : (
                    <ul className="mt-2.5 space-y-2 text-xs">
                      {activeEntry.patient.surgeries.map((s) => (
                        <li
                          key={s.id}
                          className="rounded-xl bg-slate-50 p-2.5 text-slate-800"
                        >
                          <span className="font-bold">{s.type}</span> (
                          {s.approxDate}) — {s.notes}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <h2 className="text-sm font-extrabold text-slate-900">
                    سوابق بیماری ارثی و خانوادگی
                  </h2>
                  {activeEntry.patient.familyHistory.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      موردی ثبت نشده است.
                    </p>
                  ) : (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {activeEntry.patient.familyHistory.map((f) => (
                        <span
                          key={f.id}
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800"
                        >
                          {f.condition} ({f.relation})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. CLINICAL NOTES & ORDERS ================= */}
        {section === "notes" && activeEntry && (
          <form
            onSubmit={handleSaveNoteAndOrders}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
          >
            {(activeEntry.myStation.status === "waiting" ||
              activeEntry.myStation.status === "checked_in") && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-950">
                <span>
                  ویزیت هنوز شروع نشده است. ابتدا سلامتجو را به داخل مطب فراخوانید.
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    handleCallPatientIn(
                      activeEntry.patient.id,
                      activeEntry.myStation.id
                    )
                  }
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  فراخوان به داخل مطب
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h1 className="text-lg font-extrabold text-slate-900">
                  ثبت معاینه، تشخیص، نسخه و ارجاع جدید برای{" "}
                  {activeEntry.patient.fullName}
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  اطلاعات ثبت‌شده بلافاصله به پرونده تجمیعی امروز و پنل متخصص بعدی
                  افزوده می‌شود.
                </p>
              </div>

              <button
                type="button"
                onClick={applyQuickClinicalTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100"
              >
                <Sparkles className="h-4 w-4" />
                درج ساختار شرح معاینه
              </button>
            </div>

            {/* Inline Allergy Reminder */}
            {activeEntry.patient.allergies.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                توجه هنگام نسخه‌نویسی: سلامتجو حساسیت شدید به «
                {activeEntry.patient.allergies
                  .map((a) => a.substance)
                  .join("، ")}
                » دارد!
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  شکایت اصلی / علت ارجاع
                </label>
                <AppInput
                  type="text"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  یادداشت خطابی به متخصص بعدی (اختیاری)
                </label>
                <AppInput
                  type="text"
                  value={referralNote}
                  onChange={(e) => setReferralNote(e.target.value)}
                  placeholder="مثلاً: از نظر ریوی و قلبی بلامانع جهت اقدامات دندانپزشکی"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                یافته‌های معاینه بالینی
              </label>
              <AppTextarea
                rows={3}
                required
                value={examFindings}
                onChange={(e) => setExamFindings(e.target.value)}
                placeholder="سمع قلب و ریه، علائم حیاتی، یافته‌های معاینه تخصصی..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                تشخیص نهایی پزشک متخصص
              </label>
              <AppTextarea
                rows={2}
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="تشخیص قطعی یا افتراقی..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed"
              />
            </div>

            {/* E-Prescription Builder */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-extrabold text-slate-800">
                نسخه دارویی الکترونیک امروز
              </div>

              {prescriptions.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {prescriptions.map((rx, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">
                          {rx.drug}
                        </span>{" "}
                        ({rx.dosage}) — {rx.instruction} | مدت: {rx.duration}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPrescriptions((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <AppInput
                  type="text"
                  value={rxDrug}
                  onChange={(e) => setRxDrug(e.target.value)}
                  placeholder="نام دارو"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                />
                <AppInput
                  type="text"
                  value={rxDosage}
                  onChange={(e) => setRxDosage(e.target.value)}
                  placeholder="دوز (مثلاً ۱۰ میلی‌گرم)"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                />
                <AppInput
                  type="text"
                  value={rxInst}
                  onChange={(e) => setRxInst(e.target.value)}
                  placeholder="دستور مصرف"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                />
                <div className="flex gap-1.5">
                  <AppInput
                    type="text"
                    value={rxDur}
                    onChange={(e) => setRxDur(e.target.value)}
                    placeholder="مدت"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={addPrescriptionRow}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    دارو
                  </button>
                </div>
              </div>

              {allergyConflict && (
                <div className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white">
                  هشدار تداخل حساسیت دارویی: سلامتجو به «
                  {allergyConflict.substance}» حساسیت دارد!
                </div>
              )}
            </div>

            {/* Add New Urgent Station to Today's Pathway */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
              <label className="block text-xs font-extrabold text-purple-950">
                افزودن ایستگاه جدید (ارجاع فوری پاراکلینیک یا مشاوره تکمیلی) به مسیر
                امروز سلامتجو:
              </label>
              <p className="mt-0.5 text-[11px] text-purple-800">
                در صورت انتخاب، این ایستگاه بلافاصله پس از اتاق شما در تایم‌لاین
                موبایل سلامتجو درج می‌گردد.
              </p>
              <select
                value={urgentRoomCode}
                onChange={(e) => setUrgentRoomCode(e.target.value)}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 md:w-96"
              >
                <option value="">بدون افزودن ایستگاه جدید</option>
                {snapshot.rooms
                  // فقط ایستگاه‌های فعال کاتالوگ (UC-ADM-25)
                  .filter((r) => r.isActive !== false && r.code !== doctorRoomCode)
                  .map((r) => (
                    <option key={r.code} value={r.code}>
                      افزودن فوری: {r.name} (طبقه {toFaDigits(r.floor)}، اتاق{" "}
                      {r.roomNumber})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-sky-600 px-6 py-3 text-xs font-extrabold text-white shadow-xs hover:bg-sky-700 disabled:opacity-50"
              >
                ثبت معاینه، تشخیص و دستورات در پرونده امروز
              </button>
              <button
                type="button"
                onClick={() => setSection("waiting")}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
              >
                بازگشت به فهرست بیماران
              </button>
            </div>
          </form>
        )}

        {/* اتمام ویزیت / نقشه ایستگاه بعد — فعلاً خارج از دامنه (بدون صف) */}
        {false && section === "complete" && activeEntry && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="mt-3 text-xl font-extrabold text-slate-900">
                تایید اتمام ویزیت و هدایت خودکار سلامتجو به ایستگاه بعدی
              </h1>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                با زدن دکمه زیر، ایستگاه «{activeEntry.myStation.roomName}» برای{" "}
                <strong>{activeEntry.patient.fullName}</strong> در گوشی موبایل او{" "}
                <span className="font-bold text-emerald-700">سبز</span> می‌شود و
                نقشه مسیر حرکت به ایستگاه بعدی به صورت خودکار روی صفحه موبایل
                سلامتجو باز می‌گردد.
              </p>

              {/* Show Next Station Preview */}
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right text-xs">
                <div className="font-bold text-slate-700">
                  وضعیت مسیر {activeEntry.patient.fullName}:
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {activeEntry.patient.stations.map((st) => (
                    <span
                      key={st.id}
                      className={`rounded-xl px-3 py-1.5 font-bold ${
                        st.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : st.id === activeEntry.myStation.id
                            ? "bg-sky-600 text-white"
                            : "bg-white text-slate-600 border border-slate-200"
                      }`}
                    >
                      {toFaDigits(st.stepOrder)}. {st.roomName}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={
                    busy || activeEntry.myStation.status === "completed"
                  }
                  onClick={handleCompleteStation}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
                >
                  <Navigation className="h-5 w-5" />
                  {activeEntry.myStation.status === "completed"
                    ? "این ایستگاه قبلاً سبز و تکمیل شده است"
                    : "تایید اتمام ویزیت و باز کردن نقشه ایستگاه بعد در گوشی سلامتجو"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onSwitchToPatientMobile(activeEntry.patient.id)
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-300 bg-sky-50 px-5 py-4 text-xs font-extrabold text-sky-800 hover:bg-sky-100 sm:w-auto"
                >
                  <Smartphone className="h-4 w-4" />
                  باز کردن پرونده سلامتجو
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
