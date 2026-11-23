/*
 File: frontend/src/lib/health-roadmap.ts
 Description: نقشه راه ۶مرحله‌ای؛ desc پیش‌پذیرش وابسته به وجود پرتره
 Parent Dependencies: types/clinic, pathway-stations, persian
 */

import type {
  ContractMember,
  CorporateContract,
  PathwayDto,
  PatientFullDto,
  RoomDto,
} from "@/types/clinic";
import type { AppPage } from "@/lib/workspace";
import { draftsFromPathway } from "@/lib/pathway-stations";
import { toFaDigits } from "@/lib/persian";

export type HealthRoadmapStageId = "pre" | "queue" | "visit" | "emr" | "analysis" | "monitor";
export type HealthRoadmapStageState = "done" | "active" | "locked";

export interface HealthRoadmapStage {
  id: HealthRoadmapStageId;
  n: string;
  title: string;
  desc: string;
  note: string;
  cta: string;
  state: HealthRoadmapStageState;
  page: AppPage;
}

export interface ActiveContractMembership {
  contract: CorporateContract;
  member: ContractMember;
}

export interface RoadmapPathwayCatalog {
  pathways: PathwayDto[];
  rooms: Pick<RoomDto, "code" | "name">[];
}

/** Finds an active corporate contract that includes this national ID. */
export function findActiveContractMembership(
  contracts: CorporateContract[] | undefined,
  nationalId: string
): ActiveContractMembership | null {
  if (!contracts?.length || !nationalId) return null;
  for (const contract of contracts) {
    if (contract.status !== "active") continue;
    const member = contract.members.find((m) => m.nationalId === nationalId);
    if (member) return { contract, member };
  }
  return null;
}

function stationProgress(patient: PatientFullDto) {
  const total = patient.stations.length;
  const passed = patient.stations.filter((s) => s.status === "completed" || s.status === "sample_taken").length;
  const done = patient.stations.filter((s) => s.status === "completed").length;
  const allDone = total > 0 && done === total;
  const visiting = patient.stations.some((s) => ["checked_in", "in_progress"].includes(s.status));
  return { total, passed, done, allDone, visiting };
}

/** نام ایستگاه/کلینیک از itinerary، صف مراجعه، یا کاتالوگ مسیر تخصیص‌یافته. */
export function resolveVisitClinicNames(
  patient: PatientFullDto,
  contractMember?: ContractMember | null,
  catalog?: RoadmapPathwayCatalog | null
): string[] {
  const fromItinerary = [...(patient.pathwayItinerary ?? [])]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((s) => s.titleFa.trim())
    .filter(Boolean);
  if (fromItinerary.length) return uniqueNames(fromItinerary);

  const fromVisit = [...patient.stations]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((s) => s.roomName.trim())
    .filter(Boolean);
  if (fromVisit.length) return uniqueNames(fromVisit);

  if (!catalog?.pathways?.length) return [];
  const code =
    (contractMember?.assignedPathwayCode || "").trim() ||
    catalog.pathways.find((p) => p.title === patient.pathwayTitle)?.code ||
    "";
  const pathway =
    (code ? catalog.pathways.find((p) => p.code === code) : null) ||
    catalog.pathways.find((p) => p.title === patient.pathwayTitle) ||
    null;
  if (!pathway) return [];
  return uniqueNames(
    draftsFromPathway(pathway, catalog.rooms ?? [])
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((s) => s.titleFa.trim())
      .filter(Boolean)
  );
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function visitStageDesc(clinicNames: string[]): string {
  if (!clinicNames.length) return "انجام آزمایش، نوار قلب و ویزیت متخصصین طبق مسیر سلامتی شما";
  if (clinicNames.length <= 4) return clinicNames.join("، ");
  // لیست بلند: چند تای اول + تعداد باقی‌مانده
  const head = clinicNames.slice(0, 3).join("، ");
  return `${head} و ${toFaDigits(clinicNames.length - 3)} ایستگاه دیگر`;
}

/** Shared 6-stage health roadmap used by patient cartable and mobile profile. */
export function buildHealthRoadmap(
  patient: PatientFullDto,
  contractMember?: ContractMember | null,
  catalog?: RoadmapPathwayCatalog | null
): HealthRoadmapStage[] {
  const preAdmissionDone = patient.intakeCompleted;
  // عکس قبلاً ثبت شده → دیگر «شروع با عکس» نگوییم
  const hasPortrait = Boolean(patient.hasPortrait || patient.photoDataUrl);
  const scheduled = contractMember
    ? contractMember.appointmentStatus !== "unscheduled"
    : patient.stations.some((s) => ["waiting", "checked_in", "in_progress"].includes(s.status));
  const { total, passed, done, allDone, visiting } = stationProgress(patient);
  const analysisDone = patient.paraclinicResults.length > 0 && patient.clinicalNotes.length > 0;
  const monitorDone = analysisDone && allDone;
  const clinicNames = resolveVisitClinicNames(patient, contractMember, catalog);

  const preDesc = preAdmissionDone
    ? "پرسشنامه و عکس پرونده سلامت الکترونیک ثبت شده است"
    : hasPortrait
      ? "عکس پرونده ثبت شده؛ ادامه پرسشنامه پیش‌پذیرش بر اساس جنسیت"
      : "شروع با عکس ۳×۴ پرونده سلامت الکترونیک، سپس پرسشنامه پیش‌پذیرش بر اساس جنسیت";
  const preCta = preAdmissionDone
    ? "ویرایش اطلاعات"
    : hasPortrait
      ? "ادامه پیش‌پذیرش"
      : "شروع پیش‌پذیرش";

  const stages: HealthRoadmapStage[] = [
    {
      id: "pre",
      n: "۱",
      title: "پیش‌پذیرش",
      desc: preDesc,
      note: preAdmissionDone
        ? "اطلاعات شما ثبت و برای پزشکان امروز ارسال شد."
        : hasPortrait
          ? "پرسشنامه را کامل کنید تا پیش‌پذیرش بسته شود."
          : "این مرحله باید پیش از ویزیت تکمیل شود.",
      cta: preCta,
      state: preAdmissionDone ? "done" : "active",
      page: "companion-intake",
    },
    {
      id: "queue",
      n: "۲",
      title: "نوبت‌دهی",
      desc: "تعیین روز و ساعت مراجعه بر اساس سقف روزانه قرارداد",
      note:
        scheduled && contractMember?.scheduledLabel
          ? `نوبت شما: ${contractMember.scheduledLabel}`
          : "پس از پیش‌پذیرش، نوبت شما تعیین می‌شود.",
      cta: scheduled ? "مشاهده نوبت من" : "در انتظار فراخوان کلینیک",
      state: preAdmissionDone ? (scheduled ? "done" : "active") : "locked",
      page: "dashboard",
    },
    {
      id: "visit",
      n: "۳",
      title: "مراجعه به کلینیک‌ها",
      // نام‌ها از پلن مسیر سلامتی همین سلامتجو (itinerary / صف / کاتالوگ)
      desc: visitStageDesc(clinicNames),
      note: clinicNames.length
        ? `${toFaDigits(passed)} از ${toFaDigits(Math.max(total, clinicNames.length))} ایستگاه انجام شده است.`
        : `${toFaDigits(passed)} از ${toFaDigits(total)} ایستگاه انجام شده است.`,
      cta: done > 0 || visiting ? "ادامه مسیر درمان" : "مسیر امروز من",
      state: scheduled ? (allDone ? "done" : "active") : "locked",
      page: "dashboard",
    },
    {
      id: "emr",
      n: "۴",
      title: "پرونده الکترونیک",
      desc: "تجمیع نتایج، تشخیص‌ها و نسخه‌ها در یک گزارش",
      note: `${toFaDigits(patient.paraclinicResults.length)} نتیجه و ${toFaDigits(patient.clinicalNotes.length)} گزارش پزشک ثبت شده است.`,
      cta: allDone ? "مشاهده و چاپ پرونده" : "در حال تکمیل",
      state: allDone
        ? "done"
        : done > 0 || patient.clinicalNotes.length > 0 || patient.paraclinicResults.length > 0
          ? "active"
          : "locked",
      page: "companion-records",
    },
    {
      id: "analysis",
      n: "۵",
      title: "تحلیل اطلاعات",
      desc: "بررسی نتایج تشخیصی و جمع‌بندی یافته‌های بالینی",
      note: analysisDone
        ? "تحلیل اولیه نتایج شما آماده است."
        : "با تکمیل نتایج و گزارش پزشکان، تحلیل فعال می‌شود.",
      cta: analysisDone ? "مشاهده تحلیل سلامت" : "پس از تکمیل نتایج",
      state: analysisDone ? "done" : allDone || patient.paraclinicResults.length > 0 ? "active" : "locked",
      page: "companion-records",
    },
    {
      id: "monitor",
      n: "۶",
      title: "پایش سلامتی مستمر",
      desc: "یادآوری پیگیری دوره‌ای و مراقبت پس از مراجعه",
      note: monitorDone
        ? "پایش دوره‌ای برای شما فعال است."
        : "پس از تحلیل اطلاعات، پایش مستمر فعال می‌شود.",
      cta: monitorDone ? "مشاهده برنامه پایش" : "پس از تحلیل اطلاعات",
      state: monitorDone ? "done" : analysisDone ? "active" : "locked",
      page: "companion-records",
    },
  ];

  // Single "you are here" focus: keep the first active, demote later actives to locked for spine UX
  const focusIdx = stages.findIndex((s) => s.state === "active");
  if (focusIdx < 0) return stages;
  return stages.map((s, i) => (i > focusIdx && s.state === "active" ? { ...s, state: "locked" as const } : s));
}

/**
 * وزن نسبی مراحل در٪ پیشرفت نقشه راه (جمع = ۱۰۰).
 * پیش‌پذیرش ۳۰٪؛ پرونده الکترونیک و تحلیل سهم قابل‌توجه دارند.
 */
export const ROADMAP_STAGE_WEIGHTS: Record<HealthRoadmapStageId, number> = {
  pre: 30,
  queue: 10,
  visit: 15,
  emr: 20,
  analysis: 15,
  monitor: 10,
};

/**
 * پیشرفت نقشه راه با وزن نابرابر: مراحل done وزن کامل + مرحلهٔ active سهم جزئی
 * (مثلاً٪ پرسشنامه روی وزن ۳۰٪ پیش‌پذیرش).
 */
export function roadmapProgress(
  stages: HealthRoadmapStage[],
  activePartialPct = 0
): { done: number; total: number; pct: number } {
  const done = stages.filter((s) => s.state === "done").length;
  const total = stages.length || 1;
  const partialFrac = Math.min(100, Math.max(0, activePartialPct)) / 100;
  let score = 0;
  for (const s of stages) {
    const w = ROADMAP_STAGE_WEIGHTS[s.id] ?? 0;
    if (s.state === "done") {
      score += w;
      continue;
    }
    // فقط مرحلهٔ جاری سهم جزئی می‌گیرد (پیش‌پذیرش از٪ فرم)
    if (s.state === "active" && partialFrac > 0) {
      score += w * partialFrac;
    }
  }
  let pct = Math.round(score);
  // اگر داده‌ای پر شده، صفر مطلق نشان نده
  if (partialFrac > 0 && pct < 1) pct = 1;
  return { done, total, pct: Math.min(100, pct) };
}

/** سهم جزئی پیش‌پذیرش از٪ فرم / عکس برای نوار پیشرفت نقشه. */
export function preAdmitPartialPct(
  patient: Pick<PatientFullDto, "intakeCompleted" | "hasPortrait" | "photoDataUrl" | "formProgressPct">,
  formProgressPctFallback = 0
): number {
  if (patient.intakeCompleted) return 0;
  const fromPatient = Number(patient.formProgressPct ?? 0);
  const formPct = Math.min(100, Math.max(0, fromPatient > 0 ? fromPatient : formProgressPctFallback));
  if (formPct > 0) return formPct;
  // فقط عکس ثبت شده — سهم کوچک تا صفر نماند
  if (patient.hasPortrait || patient.photoDataUrl) return 8;
  return 0;
}
