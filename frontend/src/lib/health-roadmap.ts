import type { ContractMember, CorporateContract, PatientFullDto } from "@/types/clinic";
import type { AppPage } from "@/lib/workspace";
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

/** Shared 6-stage health roadmap used by patient cartable and mobile profile. */
export function buildHealthRoadmap(
  patient: PatientFullDto,
  contractMember?: ContractMember | null
): HealthRoadmapStage[] {
  const preAdmissionDone = patient.intakeCompleted;
  const scheduled = contractMember
    ? contractMember.appointmentStatus !== "unscheduled"
    : patient.stations.some((s) => ["waiting", "checked_in", "in_progress"].includes(s.status));
  const { total, passed, done, allDone, visiting } = stationProgress(patient);
  const analysisDone = patient.paraclinicResults.length > 0 && patient.clinicalNotes.length > 0;
  const monitorDone = analysisDone && allDone;

  const stages: HealthRoadmapStage[] = [
    {
      id: "pre",
      n: "۱",
      title: "پیش‌پذیرش",
      desc: "تکمیل شرح حال، داروها، حساسیت‌ها و سوابق خانوادگی",
      note: preAdmissionDone
        ? "اطلاعات شما ثبت و برای پزشکان امروز ارسال شد."
        : "این مرحله باید پیش از ویزیت تکمیل شود.",
      cta: preAdmissionDone ? "ویرایش اطلاعات" : "شروع پیش‌پذیرش",
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
      desc: "انجام آزمایش، نوار قلب و ویزیت متخصصین",
      note: `${toFaDigits(passed)} از ${toFaDigits(total)} ایستگاه انجام شده است.`,
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

export function roadmapProgress(stages: HealthRoadmapStage[]): { done: number; total: number; pct: number } {
  const done = stages.filter((s) => s.state === "done").length;
  const total = stages.length;
  return { done, total, pct: Math.round((done / total) * 100) };
}
