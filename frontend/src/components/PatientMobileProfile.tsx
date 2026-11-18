import { ResultAttachment } from "./ResultAttachment";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Compass,
  Download,
  FileCheck2,
  FileText,
  FlaskConical,
  HeartPulse,
  MapPin,
  Navigation,
  Pill,
  Plus,
  QrCode,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Trash2,
  UserCheck,
} from "lucide-react";
import type {
  ClinicSnapshot,
  PatientFullDto,
  RoomDto,
} from "@/types/clinic";
import type {
  AllergyItem,
  FamilyHistoryItem,
  MedicationItem,
  SurgeryItem,
  RecentConditionItem,
  IntakeAnswers,
} from "@/types/clinic";
import {
  createMedicineBoxSvgDataUrl,
  formatFaTime,
  toFaDigits,
} from "@/lib/persian";
import {
  buildHealthRoadmap,
  findActiveContractMembership,
  roadmapProgress,
} from "@/lib/health-roadmap";
import { QrCodeVisual } from "./QrCodeVisual";
import { PrintableEmrReport } from "./PrintableEmrReport";

type MobileTab = "journey" | "intake" | "wayfinding" | "emr";

interface PatientMobileProfileProps {
  snapshot: ClinicSnapshot;
  selectedPatientId: number;
  onSelectPatient: (id: number) => void;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  compactEmbed?: boolean;
  desktop?: boolean;
  hidePatientSwitch?: boolean;
  initialTab?: MobileTab;
  readOnly?: boolean;
  hideTabBar?: boolean;
  /** When true, keep the patient on intake until pre-admission is completed. */
  lockNonIntakeTabs?: boolean;
}

const HEREDITARY_DISEASES = [
  "دیابت نوع ۲",
  "فشار خون بالا",
  "بیماری عروق کرونر و قلبی",
  "آسم و بیماری ریوی",
  "سکته مغزی",
  "کم‌کاری / پرکاری تیروئید",
  "بیماری مزمن کلیوی",
];

const RELATIVES = ["پدر", "مادر", "برادر/خواهر", "فرزند"];

export function PatientMobileProfile({
  snapshot,
  selectedPatientId,
  onSelectPatient,
  onAction,
  busy,
  compactEmbed = false,
  desktop = false,
  hidePatientSwitch = false,
  initialTab = "journey",
  readOnly = false,
  hideTabBar = false,
  lockNonIntakeTabs = false,
}: PatientMobileProfileProps) {
  const patient: PatientFullDto | undefined =
    snapshot.patients.find((p) => p.id === selectedPatientId) ??
    snapshot.patients[0];

  const [activeTab, setActiveTab] = useState<MobileTab>(initialTab);
  const [showQrScannerModal, setShowQrScannerModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [qrInputToken, setQrInputToken] = useState("");
  const [qrError, setQrError] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Intake local editable state synced with selected patient
  const [meds, setMeds] = useState<MedicationItem[]>([]);
  const [surgeries, setSurgeries] = useState<SurgeryItem[]>([]);
  const [familyHistory, setFamilyHistory] = useState<FamilyHistoryItem[]>([]);
  const [allergies, setAllergies] = useState<AllergyItem[]>([]);
  const [recentConditions, setRecentConditions] = useState<RecentConditionItem[]>([]);
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswers>({ currentSymptoms: "", lastMeal: "", smoking: "", breathlessness: "", chestPain: "", dentalBleeding: "", pregnancyStatus: "", medicationChanges: "", supplements: "", anticoagulantUse: "", fastingStatus: "", diabetesStatus: "" });
  const [conditionTitle, setConditionTitle] = useState("");
  const [conditionWhen, setConditionWhen] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");

  // New item inputs
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medTiming, setMedTiming] = useState("");
  const [medImage, setMedImage] = useState<string | undefined>(undefined);

  const [surgType, setSurgType] = useState("");
  const [surgDate, setSurgDate] = useState("");
  const [surgNotes, setSurgNotes] = useState("");

  const [selectedRelation, setSelectedRelation] = useState("پدر");

  const [allergySub, setAllergySub] = useState("");
  const [allergyCat, setAllergyCat] = useState<"دارویی" | "غذایی" | "محیطی">(
    "دارویی"
  );
  const [allergyReaction, setAllergyReaction] = useState("");
  const [allergySeverity, setAllergySeverity] = useState<"شدید" | "متوسط">(
    "شدید"
  );

  // Wayfinding selected floor
  const [selectedFloor, setSelectedFloor] = useState<number>(2);

  const roomMap = useMemo(() => {
    return new Map<string, RoomDto>(snapshot.rooms.map((r) => [r.code, r]));
  }, [snapshot.rooms]);

  const activeStation = useMemo(() => {
    if (!patient) return undefined;
    return (
      patient.stations.find(
        (s) =>
          s.status === "in_progress" ||
          s.status === "checked_in" ||
          s.status === "waiting"
      ) ?? patient.stations.find((s) => s.status === "pending")
    );
  }, [patient]);

  const activeRoom = activeStation
    ? roomMap.get(activeStation.roomCode)
    : undefined;

  // Sync intake state when patient changes
  useEffect(() => {
    if (!patient) return;
    setMeds(patient.medications ?? []);
    setSurgeries(patient.surgeries ?? []);
    setFamilyHistory(patient.familyHistory ?? []);
    setAllergies(patient.allergies ?? []);
    setRecentConditions(patient.recentConditions ?? []);
    setIntakeAnswers(patient.intakeAnswers ?? { currentSymptoms: "", lastMeal: "", smoking: "", breathlessness: "", chestPain: "", dentalBleeding: "", pregnancyStatus: "", medicationChanges: "", supplements: "", anticoagulantUse: "", fastingStatus: "", diabetesStatus: "" });
  }, [patient?.id]);

  // Sync floor & auto-open wayfinding when triggered by specialist completion!
  useEffect(() => {
    if (activeRoom) {
      setSelectedFloor(activeRoom.floor);
    }
  }, [activeRoom]);

  useEffect(() => {
    if (lockNonIntakeTabs) {
      setActiveTab("intake");
      return;
    }
    if (!desktop && patient?.autoOpenWayfinding && patient.intakeCompleted) {
      setActiveTab("wayfinding");
    }
  }, [desktop, patient?.id, patient?.autoOpenWayfinding, patient?.intakeCompleted, lockNonIntakeTabs]);

  useEffect(() => {
    if (lockNonIntakeTabs && activeTab !== "intake") setActiveTab("intake");
  }, [lockNonIntakeTabs, activeTab]);

  if (!patient) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        هیچ بیماری در کلینیک ثبت نشده است.
      </div>
    );
  }

  const completedCount = patient.stations.filter(
    (s) => s.status === "completed"
  ).length;
  const allCompleted =
    patient.stations.length > 0 && completedCount === patient.stations.length;

  const unreadAlerts = patient.alerts.filter((a) => !a.isRead);
  const hasCardio = patient.stations.some((s) => ["CARDIO", "ECG"].includes(s.roomCode));
  const hasPulmo = patient.stations.some((s) => s.roomCode === "PULMO");
  const hasDental = patient.stations.some((s) => s.roomCode === "DENTAL");
  const hasRadiology = patient.stations.some((s) => s.roomCode === "RADIO");
  const updateAnswer = (field: keyof IntakeAnswers, value: string) => setIntakeAnswers((prev) => ({ ...prev, [field]: value }));

  const handleQrTokenLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = qrInputToken.trim().toUpperCase();
    const found = snapshot.patients.find(
      (p) => p.qrToken.toUpperCase() === cleaned
    );
    if (found) {
      onSelectPatient(found.id);
      setShowQrScannerModal(false);
      setQrInputToken("");
      setQrError("");
    } else {
      setQrError("کد QR پذیرش یافت نشد. یکی از کارت‌های پذیرش زیر را لمس کنید.");
    }
  };

  const handleMedBoxFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setMedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSmartBoxScan = () => {
    const label = medName.trim() || "Atorvastatin 20mg";
    const dose = medDosage.trim() || "روزی یک عدد";
    if (!medName.trim()) setMedName("آتورواستاتین (اسکن هوشمند جعبه)");
    if (!medDosage.trim()) setMedDosage("۲۰ میلی‌گرم");
    if (!medTiming.trim()) setMedTiming("شب‌ها بعد از شام");
    setMedImage(createMedicineBoxSvgDataUrl(label, dose, "#0284C7"));
  };

  const addMedication = () => {
    if (!medName.trim()) return;
    setMeds((prev) => [
      ...prev,
      {
        id: `med_${Date.now()}`,
        name: medName.trim(),
        dosage: medDosage.trim() || "طبق دستور",
        timing: medTiming.trim() || "روزانه",
        boxImage: medImage,
      },
    ]);
    setMedName("");
    setMedDosage("");
    setMedTiming("");
    setMedImage(undefined);
  };

  const addSurgery = () => {
    if (!surgType.trim()) return;
    setSurgeries((prev) => [
      ...prev,
      {
        id: `surg_${Date.now()}`,
        type: surgType.trim(),
        approxDate: surgDate.trim() || "سال‌های اخیر",
        notes: surgNotes.trim() || "بدون عارضه خاص",
      },
    ]);
    setSurgType("");
    setSurgDate("");
    setSurgNotes("");
  };

  const toggleFamilyCondition = (condition: string) => {
    const exists = familyHistory.find(
      (f) => f.condition === condition && f.relation === selectedRelation
    );
    if (exists) {
      setFamilyHistory((prev) => prev.filter((f) => f.id !== exists.id));
    } else {
      setFamilyHistory((prev) => [
        ...prev,
        {
          id: `fam_${Date.now()}_${Math.random()}`,
          condition,
          relation: selectedRelation,
        },
      ]);
    }
  };

  const addAllergy = () => {
    if (!allergySub.trim()) return;
    setAllergies((prev) => [
      ...prev,
      {
        id: `alg_${Date.now()}`,
        substance: allergySub.trim(),
        category: allergyCat,
        reaction: allergyReaction.trim() || "حساسیت و واکنش بالینی",
        severity: allergySeverity,
      },
    ]);
    setAllergySub("");
    setAllergyReaction("");
  };

  const handleSaveIntake = async () => {
    await onAction({
      action: "SAVE_PATIENT_INTAKE",
      patientId: patient.id,
      medications: meds,
      surgeries,
      familyHistory,
      allergies,
      recentConditions,
      intakeAnswers,
    });
    setSaveSuccessMsg("اطلاعات شرح حال و هشدار حساسیت‌ها با موفقیت در پرونده امروز ثبت شد.");
    setTimeout(() => setSaveSuccessMsg(""), 4000);
  };

  const roomsOnFloor = snapshot.rooms.filter((r) => r.floor === selectedFloor);

  const membership = findActiveContractMembership(snapshot.contracts, patient.nationalId);
  const roadmapStages = buildHealthRoadmap(patient, membership?.member ?? null);
  const roadmap = roadmapProgress(roadmapStages);
  const roadmapActive = roadmapStages.find((s) => s.state === "active");

  const goRoadmapStage = (stageId: string) => {
    if (lockNonIntakeTabs) {
      setActiveTab("intake");
      return;
    }
    if (stageId === "pre") setActiveTab("intake");
    else if (stageId === "emr" || stageId === "analysis" || stageId === "monitor") setActiveTab("emr");
    else if (stageId === "visit") setActiveTab("wayfinding");
    else setActiveTab("journey");
  };

  return (
    <div
      className={`mx-auto w-full ${
        desktop ? "patient-desktop" : compactEmbed ? "max-w-[410px]" : "max-w-[650px]"
      }`}
      data-tab={activeTab}
    >
      {/* Responsive patient workspace */}
      <div className={desktop ? "flex flex-col" : "relative flex min-h-screen flex-col bg-slate-50 pb-2"}>
        {/* Top Mobile Companion Header (Passwordless QR Session) */}
        <header className={desktop ? "hidden" : "bg-[#20745c] px-5 pt-5 pb-4 text-white"}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs">
                <QrCode className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold">
                    {patient.fullName}
                  </span>
                  <span className="rounded-full bg-emerald-400/25 px-2 py-0.5 text-[10px] font-bold text-emerald-50">
                    ورود با QR بدون رمز
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-sky-100">
                  <span dir="ltr" className="font-mono">
                    {patient.qrToken}
                  </span>
                  <span>•</span>
                  <span className="truncate">{patient.pathwayTitle}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQrScannerModal(true)}
              className={`${hidePatientSwitch ? "hidden" : ""} shrink-0 rounded-xl border border-white/25 bg-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/25`}
            >
              اسکن QR دیگر
            </button>
          </div>

          {/* Shared 6-stage health roadmap strip */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-emerald-50/90">
            <span>
              نقشه راه سلامتی:{" "}
              {roadmapActive
                ? roadmapActive.id === "pre"
                  ? "شما در ابتدای مسیر هستید"
                  : `مرحله «${roadmapActive.title}»`
                : "مسیر کامل شد"}
            </span>
            <span className="font-bold text-white">
              {toFaDigits(roadmap.done)}/{toFaDigits(roadmap.total)} · {toFaDigits(roadmap.pct)}٪
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            {roadmapStages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                disabled={stage.state === "locked" || (lockNonIntakeTabs && stage.id !== "pre")}
                title={stage.title}
                onClick={() => goRoadmapStage(stage.id)}
                className={`h-1.5 flex-1 rounded-full transition ${
                  stage.state === "done"
                    ? "bg-emerald-300"
                    : stage.state === "active"
                      ? "bg-white shadow-[0_0_0_2px_rgba(255,255,255,0.35)]"
                      : "bg-white/25"
                } ${stage.state === "locked" || (lockNonIntakeTabs && stage.id !== "pre") ? "cursor-not-allowed" : "cursor-pointer"}`}
              />
            ))}
          </div>
          {roadmapActive?.id === "pre" && !readOnly && (
            <button
              type="button"
              onClick={() => setActiveTab("intake")}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-extrabold text-[#1d4f3c]"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              ورود به پیش‌پذیرش
            </button>
          )}
          <div className="mt-2 text-[10px] text-emerald-50/70">
            مسیر امروز: {toFaDigits(completedCount)} از {toFaDigits(patient.stations.length)} ایستگاه
          </div>
        </header>

        {/* Desktop / embedded compact roadmap bar */}
        {desktop && (
          <div className="mb-3 rounded-2xl border border-[#cfe2d7] bg-[linear-gradient(120deg,#edf7f2,#ffffff)] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-[#3f7b60]">نقشه راه سلامتی شما</div>
                <div className="mt-0.5 text-sm font-extrabold text-[#1d3f32]">
                  {roadmapActive
                    ? roadmapActive.id === "pre"
                      ? "شما در ابتدای مسیر هستید"
                      : `شما در مرحله «${roadmapActive.title}» هستید`
                    : "تمام مراحل نقشه راه کامل شد"}
                </div>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#20745c] ring-1 ring-[#d7e8df]">
                {toFaDigits(roadmap.pct)}٪
              </span>
            </div>
            <div className="mt-2.5 flex gap-1">
              {roadmapStages.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  disabled={stage.state === "locked" || (lockNonIntakeTabs && stage.id !== "pre")}
                  onClick={() => goRoadmapStage(stage.id)}
                  className={`group flex min-w-0 flex-1 flex-col items-center gap-1 disabled:cursor-not-allowed`}
                >
                  <span
                    className={`h-1.5 w-full rounded-full ${
                      stage.state === "done"
                        ? "bg-emerald-500"
                        : stage.state === "active"
                          ? "bg-[#20745c]"
                          : "bg-slate-200"
                    }`}
                  />
                  <span className={`truncate text-[9px] font-semibold ${stage.state === "active" ? "text-[#20745c]" : "text-slate-400"}`}>
                    {stage.title}
                  </span>
                </button>
              ))}
            </div>
            {roadmapActive?.id === "pre" && !readOnly && (
              <button type="button" onClick={() => setActiveTab("intake")} className="primary-button mt-3 w-full justify-center py-2.5">
                <ClipboardList className="h-4 w-4" />
                ورود به پیش‌پذیرش
              </button>
            )}
          </div>
        )}

        {/* Live Unread Notification / Auto-Wayfinding Alert Banner */}
        {(unreadAlerts.length > 0 || patient.autoOpenWayfinding) && (
          <div className="border-b border-sky-200 bg-sky-50 px-3.5 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 animate-bounce text-sky-600" />
                <div className="text-xs leading-relaxed text-sky-950">
                  {patient.autoOpenWayfinding && activeRoom ? (
                    <span className="font-bold text-emerald-700">
                      ایستگاه قبلی سبز شد! نقشه هدایت به «{activeRoom.name}»
                      (طبقه {toFaDigits(activeRoom.floor)}، اتاق{" "}
                      {activeRoom.roomNumber}) به صورت خودکار باز شد.{" "}
                    </span>
                  ) : null}
                  {unreadAlerts[0]?.message}
                </div>
              </div>
              <button
                type="button"
                disabled={busy || readOnly}
                onClick={() =>
                  onAction({
                    action: "MARK_ALERTS_READ",
                    patientId: patient.id,
                  })
                }
                className="shrink-0 rounded-lg bg-sky-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-sky-700"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}

        {/* Persistent Allergy Pill if allergies exist */}
        {patient.allergies.length > 0 && (
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50/90 px-3.5 py-1.5 text-[11px] text-red-800">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
              <span>
                هشدار قرمز حساسیت فعال برای پزشکان:{" "}
                {patient.allergies.map((a) => a.substance).join("، ")}
              </span>
            </div>
          </div>
        )}

        {/* Main Scrollable Content Area */}
        <div className={desktop ? "patient-content py-5" : "patient-content flex-1 px-3.5 pt-3.5 pb-24"}>
          {/* ================= TAB 1: MY LIVE JOURNEY ================= */}
          {activeTab === "journey" && (
            <div className="space-y-4">
              {/* Current Station Spotlight Card */}
              {allCompleted ? (
                <div className="rounded-2xl border border-emerald-300 bg-gradient-to-bl from-emerald-50 to-teal-50 p-4 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-700">
                        پایان موفقیت‌آمیز مراجعات امروز
                      </div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        کلیه ایستگاه‌های درمانی شما تکمیل شد
                      </h2>
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-700">
                    تمامی نتایج آزمایشگاه، نوار قلب، تشخیص‌های پزشکان متخصص و نسخه‌های
                    دارویی امروز شما تجمیع شده است.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("emr")}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    مشاهده پرونده کامل امروز
                  </button>
                </div>
              ) : activeStation && activeRoom ? (
                <div className="rounded-2xl border-2 border-sky-500 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-extrabold text-sky-800">
                      <span className="h-2 w-2 animate-ping rounded-full bg-sky-600" />
                      موقعیت لحظه‌ای شما در کلینیک
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      ایستگاه {toFaDigits(activeStation.stepOrder)} از{" "}
                      {toFaDigits(patient.stations.length)}
                    </span>
                  </div>

                  <h2 className="mt-2.5 text-base font-extrabold text-slate-900">
                    ایستگاه فعلی: {activeRoom.name} — طبقه{" "}
                    {toFaDigits(activeRoom.floor)}، اتاق {activeRoom.roomNumber}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    مسئول ایستگاه: {activeRoom.specialistName}
                  </p>

                  {/* Pre-Intake Prompt if not completed yet */}
                  {!patient.intakeCompleted && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("intake")}
                      className="mt-3 flex w-full items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900"
                    >
                      <span>تکمیل فرم شرح حال و حساسیت‌ها در سالن انتظار</span>
                      <span className="rounded-md bg-amber-600 px-2 py-0.5 text-[10px] text-white">
                        تکمیل فوری
                      </span>
                    </button>
                  )}

                  <div className="mt-3.5 grid grid-cols-2 gap-2">
                    {activeStation.status === "waiting" ? (
                      <button
                        type="button"
                        disabled={busy || readOnly}
                        onClick={() =>
                          onAction({
                            action: "PATIENT_STATION_CHECKIN",
                            patientId: patient.id,
                            stationId: activeStation.id,
                          })
                        }
                        className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
                      >
                        <UserCheck className="h-4 w-4" />
                        اعلام حضور در ایستگاه (Check-in)
                      </button>
                    ) : (
                      <div className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        {activeStation.status === "checked_in"
                          ? "حضور شما پشت درب اتاق ثبت شد — منتظر فراخوان باشید"
                          : "در داخل اتاق — در حال دریافت خدمت درمانی"}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab("wayfinding")}
                      className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Navigation className="h-3.5 w-3.5 text-sky-600" />
                      نمایش نقشه مسیر و نکات آمادگی قبل از ورود
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Graphical Station Timeline */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-800">
                    تایم‌لاین گرافیکی مسیر درمانی امروز
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      انجام‌شده
                    </span>
                    <span className="flex items-center gap-1 text-sky-700">
                      <span className="h-2 w-2 rounded-full bg-sky-600" />
                      در جریان
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      باقی‌مانده
                    </span>
                  </div>
                </div>

                <div className="relative space-y-3 pr-2">
                  {patient.stations.map((st, idx) => {
                    const rm = roomMap.get(st.roomCode);
                    const isDone = st.status === "completed";
                    const isSampleTaken = st.status === "sample_taken";
                    const isCurrent =
                      st.status === "waiting" ||
                      st.status === "checked_in" ||
                      st.status === "in_progress";

                    return (
                      <div key={st.id} className="relative flex gap-3">
                        {/* Vertical connector line */}
                        {idx < patient.stations.length - 1 && (
                          <div
                            className={`absolute top-8 right-[13px] bottom-[-14px] w-0.5 ${
                              isDone
                                ? "bg-emerald-500"
                                : isSampleTaken
                                  ? "bg-teal-400"
                                  : isCurrent
                                    ? "bg-sky-300"
                                    : "bg-slate-200"
                            }`}
                          />
                        )}

                        {/* Status Circle */}
                        <div
                          className={`z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                            isDone
                              ? "bg-emerald-600 text-white"
                              : isSampleTaken
                                ? "bg-teal-600 text-white"
                                : isCurrent
                                  ? "bg-blue-500 text-white ring-4 ring-blue-100"
                                  : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isDone ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            toFaDigits(st.stepOrder)
                          )}
                        </div>

                        {/* Station Card */}
                        <div
                          className={`flex-1 rounded-xl border p-3 transition ${
                            isDone
                              ? "border-emerald-200 bg-emerald-50/50"
                              : isSampleTaken
                                ? "border-teal-200 bg-teal-50/60"
                                : isCurrent
                                  ? "border-blue-300 bg-blue-50/40 shadow-2xs"
                                  : "border-slate-200 bg-slate-50/60 opacity-85"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="text-xs font-extrabold text-slate-900">
                              {st.roomName}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isSampleTaken
                                    ? "bg-amber-100 text-amber-900"
                                    : isCurrent
                                      ? "bg-sky-600 text-white"
                                      : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {isDone
                                ? "انجام شد"
                                : isSampleTaken
                                  ? "نمونه‌گیری شد • جواب در دست تهیه"
                                  : st.status === "checked_in"
                                    ? "اعلام حضور شده"
                                    : st.status === "in_progress"
                                      ? "در حال ویزیت"
                                      : isCurrent
                                        ? "ایستگاه فعلی"
                                        : "باقی‌مانده"}
                            </span>
                          </div>

                          {rm && (
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              <span>
                                طبقه {toFaDigits(rm.floor)}، اتاق {rm.roomNumber}
                              </span>
                              <span>•</span>
                              <span className="truncate">{rm.specialistName}</span>
                            </div>
                          )}

                          {st.addedByDoctor && (
                            <div className="mt-1.5 inline-block rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                              {st.addedByDoctor}
                            </div>
                          )}

                          {isSampleTaken && (
                            <p className="mt-1.5 text-[11px] font-medium text-teal-900">
                              بدون نیاز به انتظار در سالن آزمایشگاه، به ایستگاه بعدی
                              مراجعه فرمایید؛ جواب خودکار به پزشک ارسال می‌شود.
                            </p>
                          )}

                          {isCurrent && st.status === "waiting" && (
                            <button
                              type="button"
                              disabled={busy || readOnly}
                              onClick={() =>
                                onAction({
                                  action: "PATIENT_STATION_CHECKIN",
                                  patientId: patient.id,
                                  stationId: st.id,
                                })
                              }
                              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-sky-700"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              اعلام حضور در این ایستگاه
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: PRE-VISIT INTAKE FORM ================= */}
          {activeTab === "intake" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-slate-900">
                    فرم شرح حال و سوابق پیش از ویزیت
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      patient.intakeCompleted
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {patient.intakeCompleted ? "ثبت‌شده در پرونده" : "در انتظار تکمیل"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  اطلاعات زیر پیش از اولین ویزیت به صورت یکپارچه در پنل تمام پزشکان
                  متخصص امروز شما نمایش داده می‌شود.
                </p>
              </div>

              {saveSuccessMsg && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                  {saveSuccessMsg}
                </div>
              )}

              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-xs text-teal-900">
                <strong>مرحله اول مسیر امروز: بازبینی و تکمیل سوابق</strong>
                <p className="mt-1 leading-6">اطلاعات مراجعه‌های قبل از قبل پر شده‌اند؛ لطفاً داروها، حساسیت‌ها و تغییرات جدید را پیش از اولین ویزیت مرور کنید. سؤال‌های این فرم با ایستگاه‌های امروز شما هماهنگ است.</p>
                <div className="mt-2 flex flex-wrap gap-1">{patient.stations.map((st) => <span key={st.id} className="rounded-md bg-white px-2 py-1 text-[10px]">{st.roomName}</span>)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-bold text-slate-800">علائم و تغییرات اخیر</div>
                <textarea value={intakeAnswers.currentSymptoms} onChange={(e) => updateAnswer("currentSymptoms", e.target.value)} disabled={readOnly} rows={2} placeholder="امروز چه مشکلی دارید؟ از چه زمانی شروع شده؟" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs" />
                <div className="mt-3 text-[11px] font-semibold text-slate-700">بیماری‌ها و اقدامات اخیر (مثل بستری، عفونت، درمان جدید)</div>
                {recentConditions.map((condition) => <div key={condition.id} className="mt-2 flex items-start justify-between rounded-lg bg-slate-50 p-2.5 text-[11px]"><span><strong>{condition.title}</strong> · {condition.when}<span className="mt-1 block text-slate-500">{condition.notes}</span></span>{!readOnly && <button onClick={() => setRecentConditions((items) => items.filter((i) => i.id !== condition.id))} className="text-red-600">حذف</button>}</div>)}
                {!readOnly && <div className="mt-2 grid gap-2 sm:grid-cols-3"><input value={conditionTitle} onChange={(e) => setConditionTitle(e.target.value)} placeholder="عنوان بیماری / اقدام" className="rounded-lg border border-slate-200 p-2 text-xs" /><input value={conditionWhen} onChange={(e) => setConditionWhen(e.target.value)} placeholder="زمان تقریبی" className="rounded-lg border border-slate-200 p-2 text-xs" /><button onClick={() => { if (!conditionTitle.trim()) return; setRecentConditions((items) => [...items, { id: crypto.randomUUID(), title: conditionTitle.trim(), when: conditionWhen.trim(), notes: conditionNotes.trim() }]); setConditionTitle(""); setConditionWhen(""); setConditionNotes(""); }} className="rounded-lg bg-teal-600 p-2 text-xs font-bold text-white">افزودن مورد اخیر</button><input value={conditionNotes} onChange={(e) => setConditionNotes(e.target.value)} placeholder="توضیح بیشتر (اختیاری)" className="rounded-lg border border-slate-200 p-2 text-xs sm:col-span-3" /></div>}
              </div>
              {(hasCardio || hasPulmo || hasDental || hasRadiology) && <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-bold text-slate-800">پرسش‌های مرتبط با خدمات امروز</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-[11px] text-slate-600 sm:col-span-2">تغییر دارویی اخیر؛ در ۳۰ روز اخیر دارویی را شروع، قطع یا دوز آن را تغییر داده‌اید؟<textarea disabled={readOnly} value={intakeAnswers.medicationChanges} onChange={(e) => updateAnswer("medicationChanges", e.target.value)} rows={2} placeholder="نام دارو و نوع تغییر را بنویسید؛ اگر تغییری نداشته‌اید خالی بگذارید." className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label>
                  <label className="text-[11px] text-slate-600">مکمل، داروی گیاهی یا بدون نسخه مصرف می‌کنید؟<input disabled={readOnly} value={intakeAnswers.supplements} onChange={(e) => updateAnswer("supplements", e.target.value)} placeholder="مثلاً امگا ۳، جینسینگ، مسکن" className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label>
                  <label className="text-[11px] text-slate-600">داروی رقیق‌کننده خون یا ضدپلاکت مصرف می‌کنید؟<select disabled={readOnly} value={intakeAnswers.anticoagulantUse} onChange={(e) => updateAnswer("anticoagulantUse", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="">انتخاب کنید</option><option value="بله">بله</option><option value="خیر">خیر</option><option value="نمی‌دانم">نمی‌دانم</option></select></label>
                  <label className="text-[11px] text-slate-600">آخرین وعده غذایی چه زمانی بود؟<input disabled={readOnly} value={intakeAnswers.lastMeal} onChange={(e) => updateAnswer("lastMeal", e.target.value)} placeholder="مثلاً دیشب ساعت ۲۲ یا امروز صبح" className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label>
                  <label className="text-[11px] text-slate-600">الان ناشتا هستید؟<select disabled={readOnly} value={intakeAnswers.fastingStatus} onChange={(e) => updateAnswer("fastingStatus", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="">انتخاب کنید</option><option value="بله">بله</option><option value="خیر">خیر</option></select></label>
                  <label className="text-[11px] text-slate-600">دیابت یا قند خون بالا دارید؟<select disabled={readOnly} value={intakeAnswers.diabetesStatus} onChange={(e) => updateAnswer("diabetesStatus", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="">انتخاب کنید</option><option value="بله">بله</option><option value="خیر">خیر</option><option value="مرزی / نمی‌دانم">مرزی / نمی‌دانم</option></select></label>
                  {hasCardio && <label className="text-[11px] text-slate-600">درد یا فشار قفسه سینه در روزهای اخیر؟<select disabled={readOnly} value={intakeAnswers.chestPain} onChange={(e) => updateAnswer("chestPain", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="">انتخاب کنید</option><option value="بله">بله</option><option value="خیر">خیر</option></select></label>}
                  {hasPulmo && <label className="text-[11px] text-slate-600">تنگی نفس، سرفه یا خس‌خس سینه؟<select disabled={readOnly} value={intakeAnswers.breathlessness} onChange={(e) => updateAnswer("breathlessness", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="">انتخاب کنید</option><option value="بله">بله</option><option value="خیر">خیر</option></select></label>}
                  {hasPulmo && <label className="text-[11px] text-slate-600">مصرف دخانیات؟<select disabled={readOnly} value={intakeAnswers.smoking} onChange={(e) => updateAnswer("smoking", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="">انتخاب کنید</option><option value="بله">بله</option><option value="خیر">خیر</option></select></label>}
                  {hasDental && <label className="text-[11px] text-slate-600">خونریزی لثه یا درد دندان؟<select disabled={readOnly} value={intakeAnswers.dentalBleeding} onChange={(e) => updateAnswer("dentalBleeding", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="">انتخاب کنید</option><option value="بله">بله</option><option value="خیر">خیر</option></select></label>}
                  {hasRadiology && patient.gender === "زن" && <label className="text-[11px] text-slate-600">احتمال بارداری وجود دارد؟<select disabled={readOnly} value={intakeAnswers.pregnancyStatus} onChange={(e) => updateAnswer("pregnancyStatus", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="">انتخاب کنید</option><option value="بله">بله</option><option value="خیر">خیر</option></select></label>}
                </div>
              </div>}
              {/* 1. Allergies (Red Alert to all doctors) */}
              <div className="rounded-2xl border-2 border-red-200 bg-white p-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-red-700">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  ۱. حساسیت‌ها و آلرژی‌ها (نمایش هشدار قرمز به پزشکان)
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  حساسیت دارویی یا غذایی شما با رنگ قرمز در بالای صفحه تمام متخصصین
                  امروز درج می‌گردد.
                </p>

                {allergies.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {allergies.map((al) => (
                      <div
                        key={al.id}
                        className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-extrabold text-red-800">
                            {al.substance}
                          </span>{" "}
                          <span className="text-[11px] text-red-600">
                            ({al.category} • {al.severity})
                          </span>
                          <div className="text-[11px] text-slate-700">
                            واکنش: {al.reaction}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAllergies((prev) =>
                              prev.filter((x) => x.id !== al.id)
                            )
                          }
                          className="p-1 text-red-500 hover:text-red-700"
                          aria-label="حذف حساسیت"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-2.5">
                  <input
                    type="text"
                    value={allergySub}
                    onChange={(e) => setAllergySub(e.target.value)}
                    placeholder="نام دارو یا ماده غذایی (مثلاً: پنی‌سیلین، آسپرین، بادام‌زمینی)"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-red-500 focus:outline-hidden"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={allergyCat}
                      onChange={(e) =>
                        setAllergyCat(
                          e.target.value as "دارویی" | "غذایی" | "محیطی"
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    >
                      <option value="دارویی">حساسیت دارویی</option>
                      <option value="غذایی">حساسیت غذایی</option>
                      <option value="محیطی">حساسیت محیطی</option>
                    </select>
                    <select
                      value={allergySeverity}
                      onChange={(e) =>
                        setAllergySeverity(e.target.value as "شدید" | "متوسط")
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    >
                      <option value="شدید">شدت: شدید (بحرانی)</option>
                      <option value="متوسط">شدت: متوسط</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={allergyReaction}
                      onChange={(e) => setAllergyReaction(e.target.value)}
                      placeholder="نوع واکنش (کهیر، تنگی نفس...)"
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={addAllergy}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      افزودن
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Current Medications + Box Photo/Scan */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                  <Pill className="h-4 w-4 text-sky-600" />
                  ۲. داروهای مصرفی فعلی (با قابلیت عکس یا اسکن جعبه دارو)
                </div>

                {meds.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    {meds.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900">{m.name}</div>
                            <div className="text-[11px] text-slate-600">
                              دوز: {m.dosage} • زمان مصرف: {m.timing}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setMeds((prev) => prev.filter((x) => x.id !== m.id))
                            }
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

                <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-2.5">
                  <input
                    type="text"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="نام دارو (مثلاً: متفورمین، لوزارتان)"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      placeholder="دوز (مثلاً ۵۰۰ میلی‌گرم)"
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={medTiming}
                      onChange={(e) => setMedTiming(e.target.value)}
                      placeholder="زمان مصرف (مثلاً شب‌ها)"
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  {/* Medicine Box Photo / Smart Scan */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-800 hover:bg-sky-100">
                      <Camera className="h-3.5 w-3.5" />
                      عکس از جعبه دارو
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMedBoxFileUpload}
                        className="hidden"
                      />
                    </label>

                    

                    <button
                      type="button"
                      onClick={addMedication}
                      className="mr-auto inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      ثبت دارو
                    </button>
                  </div>

                  {medImage && (
                    <div className="mt-2 rounded-lg border border-sky-200 bg-white p-1.5">
                      <div className="mb-1 text-[10px] font-bold text-sky-700">
                        پیش‌نمایش تصویر جعبه دارو آماده پیوست:
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={medImage}
                        alt="Medicine Box Preview"
                        className="h-20 w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Surgical & Hospitalization History */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="text-xs font-extrabold text-slate-900">
                  ۳. سوابق جراحی و بستری بیمارستانی
                </div>

                {surgeries.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {surgeries.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">
                            {s.type}
                          </span>{" "}
                          <span className="text-slate-500">({s.approxDate})</span>
                          <div className="text-[11px] text-slate-600">
                            {s.notes}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSurgeries((prev) =>
                              prev.filter((x) => x.id !== s.id)
                            )
                          }
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2.5 space-y-2 rounded-xl bg-slate-50 p-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={surgType}
                      onChange={(e) => setSurgType(e.target.value)}
                      placeholder="نوع عمل یا بستری"
                      className="col-span-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={surgDate}
                      onChange={(e) => setSurgDate(e.target.value)}
                      placeholder="سال/تاریخ"
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={surgNotes}
                      onChange={(e) => setSurgNotes(e.target.value)}
                      placeholder="شرح کوتاه (اختیاری)"
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={addSurgery}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      افزودن
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Family Hereditary History Checklist */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="text-xs font-extrabold text-slate-900">
                  ۴. چک‌لیست بیماری‌های بستگان درجه‌یک
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-slate-600">نسبت درجه‌یک:</span>
                  <select
                    value={selectedRelation}
                    onChange={(e) => setSelectedRelation(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold"
                  >
                    {RELATIVES.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {HEREDITARY_DISEASES.map((cond) => {
                    const checked = familyHistory.some(
                      (f) =>
                        f.condition === cond && f.relation === selectedRelation
                    );
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleFamilyCondition(cond)}
                        className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                          checked
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {checked ? "✓ " : "+ "}
                        {cond}
                      </button>
                    );
                  })}
                </div>

                {familyHistory.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                    {familyHistory.map((fh) => (
                      <span
                        key={fh.id}
                        className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-900"
                      >
                        {fh.condition} ({fh.relation})
                        <button
                          type="button"
                          onClick={() =>
                            setFamilyHistory((prev) =>
                              prev.filter((x) => x.id !== fh.id)
                            )
                          }
                          className="text-sky-600 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={busy || readOnly}
                onClick={handleSaveIntake}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-extrabold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                ذخیره نهایی شرح حال و ارسال آنی به پنل پزشکان امروز
              </button>
            </div>
          )}

          {/* ================= TAB 3: HOSPITAL WAYFINDING ================= */}
          {activeTab === "wayfinding" && (
            <div className="space-y-4">
              {/* Target Destination Card */}
              {activeRoom ? (
                <div className="rounded-2xl border-2 border-sky-500 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-800">
                      <Navigation className="h-3 w-3" />
                      مسیریابی زنده تا ایستگاه مقصد
                    </span>
                    <span className="text-xs font-bold text-sky-700">
                      طبقه {toFaDigits(activeRoom.floor)} • اتاق{" "}
                      {activeRoom.roomNumber}
                    </span>
                  </div>
                  <h2 className="mt-2 text-sm font-extrabold text-slate-900">
                    مقصد فعلی: {activeRoom.name}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {activeRoom.wayfindingSteps}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800">
                  کلیه ایستگاه‌های امروز شما به پایان رسیده است. جهت خروج به لابی
                  طبقه ۱ مراجعه فرمایید.
                </div>
              )}

              {/* Floor Selector */}
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-200/70 p-1">
                {[1, 2, 3].map((fl) => (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => setSelectedFloor(fl)}
                    className={`rounded-lg py-2 text-xs font-bold transition ${
                      selectedFloor === fl
                        ? "bg-white text-sky-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    طبقه {toFaDigits(fl)}
                    {activeRoom?.floor === fl ? " (مقصد)" : ""}
                  </button>
                ))}
              </div>

              {/* Architectural Clinic Floor SVG Map */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-bold text-slate-800">
                    پشته‌نگاری معماری طبقه {toFaDigits(selectedFloor)} کلینیک نبض
                  </span>
                  <span>آسانسور مرکزی ⇆ راهروها</span>
                </div>

                <svg
                  viewBox="0 0 400 230"
                  className="w-full rounded-xl border border-slate-100 bg-slate-50"
                >
                  {/* Corridor Cross Layout */}
                  <rect
                    x="20"
                    y="98"
                    width="360"
                    height="36"
                    rx="8"
                    fill="#E2E8F0"
                  />
                  <rect
                    x="175"
                    y="20"
                    width="50"
                    height="190"
                    rx="8"
                    fill="#E2E8F0"
                  />

                  {/* Central Elevator Core */}
                  <rect
                    x="176"
                    y="92"
                    width="48"
                    height="48"
                    rx="10"
                    fill="#0F172A"
                  />
                  <text
                    x="200"
                    y="114"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    آسانسور
                  </text>
                  <text
                    x="200"
                    y="128"
                    textAnchor="middle"
                    fill="#38BDF8"
                    fontSize="8"
                  >
                    طبقه {toFaDigits(selectedFloor)}
                  </text>

                  {/* Animated Walking Route Line from Elevator to Active Room if on this floor */}
                  {activeRoom && activeRoom.floor === selectedFloor && (
                    <g>
                      <path
                        d={`M 200 116 L ${activeRoom.mapX} 116 L ${activeRoom.mapX} ${activeRoom.mapY}`}
                        fill="none"
                        stroke="#0284C7"
                        strokeWidth="4"
                        strokeDasharray="7 5"
                        strokeLinecap="round"
                      />
                      <circle
                        cx={activeRoom.mapX}
                        cy={activeRoom.mapY}
                        r="18"
                        fill="#0284C7"
                        opacity="0.2"
                      />
                    </g>
                  )}

                  {/* Rooms on Selected Floor */}
                  {roomsOnFloor.map((rm) => {
                    const isTarget = activeRoom?.code === rm.code;
                    const stForRoom = patient.stations.find(
                      (s) => s.roomCode === rm.code
                    );
                    const isDone = stForRoom?.status === "completed";

                    return (
                      <g key={rm.code}>
                        <rect
                          x={rm.mapX - 48}
                          y={rm.mapY - 26}
                          width="96"
                          height="52"
                          rx="10"
                          fill={
                            isTarget
                              ? "#0284C7"
                              : isDone
                                ? "#ECFDF5"
                                : "#FFFFFF"
                          }
                          stroke={
                            isTarget
                              ? "#0369A1"
                              : isDone
                                ? "#059669"
                                : "#94A3B8"
                          }
                          strokeWidth={isTarget ? "2.5" : "1.5"}
                        />
                        <text
                          x={rm.mapX}
                          y={rm.mapY - 5}
                          textAnchor="middle"
                          fill={isTarget ? "#FFFFFF" : "#0F172A"}
                          fontSize="9.5"
                          fontWeight="bold"
                        >
                          اتاق {rm.roomNumber}
                        </text>
                        <text
                          x={rm.mapX}
                          y={rm.mapY + 11}
                          textAnchor="middle"
                          fill={isTarget ? "#E0F2FE" : "#475569"}
                          fontSize="8.5"
                        >
                          {rm.name.slice(0, 18)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Pre-Service Preparation Instructions Card */}
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4">
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900">
                  <Clock className="h-4 w-4 text-amber-600" />
                  نکات آمادگی الزامی قبل از ورود به ایستگاه
                </div>
                {activeRoom ? (
                  <p className="mt-2 text-xs leading-relaxed text-amber-950">
                    <span className="font-bold">{activeRoom.name}:</span>{" "}
                    {activeRoom.prepInstructions}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-amber-900">
                    برای مشاهده نکات هر اتاق، یکی از طبقات بالا را بررسی فرمایید.
                  </p>
                )}
              </div>

              {/* Directory of All Clinic Rooms */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <h3 className="text-xs font-extrabold text-slate-800">
                  راهنمای کامل اتاق‌های طبقه {toFaDigits(selectedFloor)}
                </h3>
                <div className="mt-2.5 space-y-2">
                  {roomsOnFloor.map((rm) => (
                    <div
                      key={rm.code}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{rm.name}</span>
                        <span className="rounded-md bg-white px-2 py-0.5 text-[11px] text-sky-700">
                          اتاق {rm.roomNumber}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600">
                        {rm.prepInstructions}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: TODAY'S EMR & REPORT ================= */}
          {activeTab === "emr" && (
            <div className="space-y-4">
              {/* Header & PDF Download Action */}
              <div className="rounded-2xl border border-sky-200 bg-gradient-to-bl from-sky-50 to-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      پرونده الکترونیک تجمیعی امروز
                    </h2>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      تجمیع خودکار آزمایشگاه، نوار قلب، تشخیص متخصصین و نسخه‌ها
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      allCompleted
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {allCompleted ? "پرونده نهایی کامل" : "در حال تکمیل زنده"}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!allCompleted}
                  onClick={() => setShowPdfModal(true)}
                  className={`mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold text-white shadow-sm transition ${
                    allCompleted
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-sky-600 hover:bg-sky-700"
                  }`}
                >
                  <Download className="h-4 w-4" />
                  {allCompleted ? "مشاهده و ذخیره PDF گزارش جامع امروز" : "گزارش نهایی بعد از تکمیل تمام ایستگاه‌ها فعال می‌شود"}
                </button>
              </div>

              {/* Paraclinic Results Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                  <FlaskConical className="h-4 w-4 text-sky-600" />
                  نتایج آزمایشگاه و نوار قلب امروز (
                  {toFaDigits(patient.paraclinicResults.length)})
                </div>

                {patient.paraclinicResults.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    جواب آزمایش یا نوار قلب شما به محض بارگذاری در واحد پاراکلینیک
                    در این قسمت نمایش داده می‌شود.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {patient.paraclinicResults.map((res) => (
                      <div
                        key={res.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {res.title}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              res.summaryStatus === "نرمال"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {res.summaryStatus}
                          </span>
                        </div>

                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700">
                          {res.interpretation}
                        </p>

                        {res.metrics.length > 0 && (
                          <div className="mt-2 space-y-1 rounded-lg bg-white p-2">
                            {res.metrics.map((m, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between border-b border-slate-100 pb-1 text-[11px] last:border-none last:pb-0"
                              >
                                <span className="text-slate-700">
                                  {m.parameter}
                                </span>
                                <span
                                  dir="ltr"
                                  className={`font-bold ${
                                    m.abnormal
                                      ? "text-red-600"
                                      : "text-slate-900"
                                  }`}
                                >
                                  {m.value} {m.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {res.attachmentUrl && (
                          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <ResultAttachment url={res.attachmentUrl} title={res.title} fileName={res.fileName} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Specialist Diagnoses & Prescriptions */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                  <Stethoscope className="h-4 w-4 text-emerald-600" />
                  تشخیص‌های متخصصین و نسخه‌های دارویی امروز (
                  {toFaDigits(patient.clinicalNotes.length)})
                </div>

                {patient.clinicalNotes.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    هنوز تشخیص و نسخه‌ای توسط متخصصین امروز ثبت نشده است.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {patient.clinicalNotes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-extrabold text-slate-900">
                              {note.doctorName}
                            </span>
                            <span className="mr-1.5 text-[11px] text-sky-700">
                              ({note.specialty})
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {formatFaTime(note.createdAt)}
                          </span>
                        </div>
                        <div className="mt-2 rounded-lg bg-white p-2.5 text-xs text-slate-800">
                          <span className="font-bold text-sky-800">تشخیص: </span>
                          {note.diagnosis}
                        </div>

                        {note.prescriptions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="text-[11px] font-bold text-emerald-800">
                              نسخه الکترونیک تجویز شده:
                            </div>
                            {note.prescriptions.map((rx, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1.5 text-[11px] text-slate-800"
                              >
                                <span className="font-bold">{rx.drug}</span> (
                                {rx.dosage}) — {rx.instruction}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================= BOTTOM NAVIGATION BAR (NO SIDEBAR!) ================= */}
        {!hideTabBar && (<nav
          aria-label={desktop ? "بخش‌های پرونده بیمار" : "نوار ناوبری پایین همراه بیمار"}
          className={desktop ? "patient-desktop-tabs order-first grid grid-cols-4 gap-2 border-b border-slate-200 bg-white px-2 py-2" : "fixed right-0 bottom-0 left-0 z-20 mx-auto grid max-w-[650px] grid-cols-4 border-t border-slate-200 bg-white/95 px-1.5 py-2 backdrop-blur-md"}
        >
          <button
            type="button"
            disabled={lockNonIntakeTabs}
            onClick={() => !lockNonIntakeTabs && setActiveTab("journey")}
            className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition ${
              activeTab === "journey"
                ? "bg-sky-50 text-sky-700"
                : lockNonIntakeTabs
                  ? "cursor-not-allowed text-slate-300"
                  : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <HeartPulse className="h-5 w-5" />
            <span>مسیر امروز</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("intake")}
            className={`relative flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition ${
              activeTab === "intake"
                ? "bg-sky-50 text-sky-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {!patient.intakeCompleted && (
              <span className="absolute top-1 right-4 h-2 w-2 rounded-full bg-amber-500" />
            )}
            <ClipboardList className="h-5 w-5" />
            <span>شرح حال</span>
          </button>

          <button
            type="button"
            disabled={lockNonIntakeTabs}
            onClick={() => !lockNonIntakeTabs && setActiveTab("wayfinding")}
            className={`relative flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition ${
              activeTab === "wayfinding"
                ? "bg-sky-50 text-sky-700"
                : lockNonIntakeTabs
                  ? "cursor-not-allowed text-slate-300"
                  : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {patient.autoOpenWayfinding && patient.intakeCompleted && (
              <span className="absolute top-1 right-4 h-2 w-2 animate-ping rounded-full bg-emerald-500" />
            )}
            <Compass className="h-5 w-5" />
            <span>نقشه کلینیک</span>
          </button>

          <button
            type="button"
            disabled={lockNonIntakeTabs}
            onClick={() => !lockNonIntakeTabs && setActiveTab("emr")}
            className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition ${
              activeTab === "emr"
                ? "bg-sky-50 text-sky-700"
                : lockNonIntakeTabs
                  ? "cursor-not-allowed text-slate-300"
                  : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="h-5 w-5" />
            <span>پرونده امروز</span>
          </button>
        </nav>)}
      </div>

      {/* Passwordless QR Admission Switcher Modal */}
      {showQrScannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                ورود سریع بیمار با اسکن QR کد پذیرش (بدون رمز عبور)
              </h3>
              <button
                type="button"
                onClick={() => setShowQrScannerModal(false)}
                className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
              >
                بستن
              </button>
            </div>

            <div className="mt-3 flex justify-center">
              <QrCodeVisual token={patient.qrToken} size={120} />
            </div>

            <form onSubmit={handleQrTokenLookup} className="mt-3 flex gap-2">
              <input
                type="text"
                dir="ltr"
                value={qrInputToken}
                onChange={(e) => setQrInputToken(e.target.value)}
                placeholder="NBZ-1404-401"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
              />
              <button
                type="submit"
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700"
              >
                ورود با کد
              </button>
            </form>
            {qrError && (
              <p className="mt-1.5 text-xs text-red-600">{qrError}</p>
            )}

            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="mb-2 text-xs font-bold text-slate-600">
                انتخاب پرونده بیمار:
              </div>
              <div className="max-h-52 space-y-1.5 overflow-y-auto">
                {snapshot.patients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectPatient(p.id);
                      setShowQrScannerModal(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-right text-xs transition ${
                      p.id === patient.id
                        ? "border-sky-500 bg-sky-50 font-bold text-sky-900"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <div className="font-bold">{p.fullName}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.pathwayTitle}
                      </div>
                    </div>
                    <span
                      dir="ltr"
                      className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] text-sky-700"
                    >
                      {p.qrToken}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable & Downloadable Complete Today's EMR Modal */}
      {showPdfModal && (
        <PrintableEmrReport
          patient={patient}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}
