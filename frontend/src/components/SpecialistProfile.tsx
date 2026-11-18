import { ResultAttachment } from "./ResultAttachment";

import { AppInput, AppTextarea } from "@/components/AppInput";
import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  FlaskConical,
  Navigation,
  Pill,
  Plus,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Stethoscope,
  Trash2,
  Users,
} from "lucide-react";
import type { ClinicSnapshot, PatientFullDto } from "@/types/clinic";
import type { PrescriptionItem } from "@/types/clinic";
import { formatFaTime, toFaDigits } from "@/lib/persian";
import { FormResponseSummary } from "./FormResponseSummary";

type SpecialistSection = "waiting" | "brief" | "notes" | "complete";

interface SpecialistProfileProps {
  snapshot: ClinicSnapshot;
  onSwitchToPatientMobile: (patientId: number) => void;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  embedded?: boolean;
  initialSection?: SpecialistSection;
  onSectionChange?: (section: SpecialistSection) => void;
  initialPatientId?: number;
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
}: SpecialistProfileProps) {
  const specialistStaff = useMemo(
    () => snapshot.staff.filter((s) => s.role === "specialist" && s.isActive && s.roomCode),
    [snapshot.staff]
  );

  // When opened from the dashboard for a specific patient, focus the room that
  // patient is actually routed to; otherwise default to the pulmonology desk.
  const focusPatient = initialPatientId
    ? snapshot.patients.find((p) => p.id === initialPatientId)
    : undefined;
  const focusRoomCode =
    focusPatient?.stations.find(
      (s) => s.category === "specialist" && s.status !== "completed"
    )?.roomCode ??
    focusPatient?.stations.find((s) => s.category === "specialist")?.roomCode;

  const defaultDoc =
    (focusRoomCode
      ? specialistStaff.find((s) => s.roomCode === focusRoomCode)
      : undefined) ??
    specialistStaff.find((s) => s.roomCode === "PULMO") ??
    specialistStaff[0];

  const [activeStaffId, setActiveStaffId] = useState<number>(
    defaultDoc?.id ?? 1
  );
  const [section, setLocalSection] = useState<SpecialistSection>(initialSection);
  const setSection = (next: SpecialistSection) => { setLocalSection(next); onSectionChange?.(next); };

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
        1)
  );

  const activeEntry =
    myPatients.find((x) => x.patient.id === selectedPatientId) ?? myPatients[0];

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
    setTimeout(() => setFeedbackBanner(""), 4500);
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
            {([['waiting', 'لیست انتظار'], ['brief', 'خلاصه پرونده'], ['notes', 'معاینه و نسخه'], ['complete', 'اتمام ویزیت']] as const).map(([id, title]) => <button type="button" key={id} onClick={() => setSection(id)} className={section === id ? 'active' : ''}>{title}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="پزشک معالج" value={activeDoctor?.id} onChange={(e) => handleDoctorSwitch(Number(e.target.value))} className="app-select max-w-60">{specialistStaff.map((d) => <option key={d.id} value={d.id}>{d.fullName} · {d.specialtyOrDept}</option>)}</select>
            <select aria-label="سلامتجو ویزیت" value={activeEntry?.patient.id ?? ''} onChange={(e) => setSelectedPatientId(Number(e.target.value))} className="app-select max-w-52">{myPatients.map(({patient: p}) => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select>
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

        {/* ================= 1. MY WAITING ROOM ================= */}
        {section === "waiting" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h1 className="text-lg font-extrabold text-slate-900">
              لیست انتظار مطب {activeDoctor?.fullName} ({activeDoctor?.specialtyOrDept})
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              تفکیک لحظه‌ای سلامتجویان ارجاع‌شده امروز بر اساس وضعیت حضور، تکمیل پرسشنامه
              و انجام تست‌های پیش‌نیاز
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {myPatients.map(({ patient: p, myStation }) => {
                const activeOtherStation = p.stations.find(
                  (s) =>
                    s.id !== myStation.id &&
                    (s.status === "waiting" ||
                      s.status === "checked_in" ||
                      s.status === "in_progress")
                );

                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border p-4 transition ${
                      myStation.status === "checked_in"
                        ? "border-emerald-400 bg-emerald-50/40"
                        : myStation.status === "waiting"
                          ? "border-sky-300 bg-sky-50/40"
                          : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">
                          {p.fullName}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            ({toFaDigits(p.age)} ساله)
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-600">
                          {p.pathwayTitle}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          myStation.status === "checked_in"
                            ? "bg-emerald-600 text-white"
                            : myStation.status === "waiting" ||
                                myStation.status === "in_progress"
                              ? "bg-sky-600 text-white"
                              : myStation.status === "completed"
                                ? "bg-slate-200 text-slate-700"
                                : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {myStation.status === "checked_in"
                          ? "پشت درب مطب"
                          : myStation.status === "in_progress"
                            ? "در حال معاینه"
                            : myStation.status === "waiting"
                              ? "در نوبت ورود به مطب"
                              : myStation.status === "completed"
                                ? "ویزیت انجام شد"
                                : activeOtherStation
                                  ? `در حال انجام تست (${activeOtherStation.roomName})`
                                  : "در انتظار مراحل قبل"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={`rounded-md px-2 py-0.5 font-bold ${
                          p.intakeCompleted
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.intakeCompleted
                          ? "✓ پرسشنامه پیش‌پذیرش تکمیل شده"
                          : "⧗ در حال تکمیل پرسشنامه پیش‌پذیرش"}
                      </span>

                      {p.allergies.length > 0 && (
                        <span className="rounded-md bg-red-100 px-2 py-0.5 font-bold text-red-700">
                          ⚠ دارای حساسیت دارویی ({toFaDigits(p.allergies.length)})
                        </span>
                      )}

                      <span className="rounded-md bg-white px-2 py-0.5 text-slate-600">
                        نتایج پاراکلینیک:{" "}
                        {toFaDigits(p.paraclinicResults.length)} مورد
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setSection("brief");
                        }}
                        className="flex-1 rounded-xl bg-sky-600 py-2 text-xs font-bold text-white hover:bg-sky-700"
                      >
                        باز کردن خلاصه هوشمند سلامتجو
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setSection("notes");
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        ثبت معاینه
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= 2. SMART PATIENT BRIEF ================= */}
        {section === "brief" && activeEntry && (
          <div className="space-y-4">
            {/* Patient Header Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold text-slate-900">
                    خلاصه هوشمند یک‌صفحه‌ای: {activeEntry.patient.fullName}
                  </h1>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    {toFaDigits(activeEntry.patient.age)} ساله •{" "}
                    {activeEntry.patient.gender}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  پکیج: {activeEntry.patient.pathwayTitle} • کد ملی:{" "}
                  {toFaDigits(activeEntry.patient.nationalId)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSection("notes")}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-sky-700"
                >
                  ثبت معاینه و نسخه جدید
                </button>
                <button
                  type="button"
                  onClick={() => setSection("complete")}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
                >
                  اتمام ویزیت و هدایت سلامتجو
                </button>
              </div>
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

            <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-teal-900">پرسشنامه پیش‌پذیرش (پشتیبانی تصمیم)</h2>
                <span className="rounded-lg bg-white px-2 py-1 text-[10px] text-teal-700">
                  {doctorRoomCode === "CARDIO"
                    ? "قلب و عروق"
                    : doctorRoomCode === "PULMO"
                      ? "ریه و تنفس"
                      : doctorRoomCode === "DENTAL"
                        ? "دندانپزشکی"
                        : "ویزیت تخصصی"}
                </span>
              </div>
              <FormResponseSummary
                patient={activeEntry.patient}
                forms={snapshot.forms ?? []}
                compact
                showAiPayloadToggle
              />
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
                  .filter((r) => r.code !== doctorRoomCode)
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
                onClick={() => setSection("complete")}
                className="rounded-xl border border-emerald-600 bg-emerald-50 px-5 py-3 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100"
              >
                ادامه به مرحله تایید اتمام ویزیت ←
              </button>
            </div>
          </form>
        )}

        {/* ================= 4. COMPLETE STATION & AUTO-WAYFINDING ================= */}
        {section === "complete" && activeEntry && (
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
