/*
 File: frontend/src/lib/mock-contracts.ts
 Description: دادهٔ نمایشی قراردادها؛ قالب پیام با برند نفس
 Parent Dependencies: clinic types
 */
import type {
  ContractAppointmentStatus,
  PathwayLibraryRule,
  ContractMember,
  ContractPathwayRule,
  CorporateContract,
  MockPathwayRow,
  OnboardingStage,
} from "@/types/clinic";
import { iranLocalDayOffset } from "@/lib/date-iso";
import { formatFaDateRelative } from "@/lib/persian";

/**
 * Seed/helper قرارداد سازمانی سمت کلاینت (کاتالوگ، Excel، matcher جمعیتی).
 * دادهٔ زندهٔ قرارداد از API می‌آید؛ این ماژول جایگزین دیتابیس نیست.
 */

/** Central, system-wide package rules — reusable across any number of contracts. */
export function buildSeededPathwayLibrary(): PathwayLibraryRule[] {
  const now = new Date().toISOString();
  return [
    {
      id: "lib-rule-1",
      code: "LR-001",
      title: "پایش سالمندان (بالای ۴۵ سال)",
      description: "افراد ۴۵ سال به بالا — چکاپ جامع شامل قلب، ریه، دهان، آزمایشگاه و تصویربرداری",
      gender: "همه",
      minAge: 45,
      maxAge: null,
      jobCategory: "همه",
      pathwayCode: "FULL_CHECKUP",
      createdAt: now,
    },
    {
      id: "lib-rule-2",
      code: "LR-002",
      title: "بانوان زیر ۴۵ سال — پایش قلب و ریه",
      description: "بانوان جوان و میانسال — بسته قلب و ریه با آزمایشگاه تخصصی",
      gender: "زن",
      minAge: 18,
      maxAge: 44,
      jobCategory: "همه",
      pathwayCode: "CARDIO_PULMO",
      createdAt: now,
    },
    {
      id: "lib-rule-3",
      code: "LR-003",
      title: "مردان عملیات و فنی زیر ۴۵ سال",
      description: "نیروهای عملیاتی در معرض گرد و غبار و مواد شیمیایی — پایش ریه، قلب و تاییدیه جراحی",
      gender: "مرد",
      minAge: 18,
      maxAge: 44,
      jobCategory: "عملیات و فنی",
      pathwayCode: "PRE_OP",
      createdAt: now,
    },
    {
      id: "lib-rule-4",
      code: "LR-004",
      title: "کارکنان اداری و مالی",
      description: "کارکنان ستادی — پایش قلب، سلامت دهان و ارزیابی سوخت‌وساز",
      gender: "همه",
      minAge: 18,
      maxAge: 44,
      jobCategory: "اداری و مالی",
      pathwayCode: "DENTAL_CARDIO",
      createdAt: now,
    },
    {
      id: "lib-rule-5",
      code: "LR-005",
      title: "نیروهای فناوری اطلاعات",
      description: "کارکنان شیفت‌کاری و پشت رایانه — پایش قلب و ریه",
      gender: "همه",
      minAge: 18,
      maxAge: 44,
      jobCategory: "فناوری و مهندسی",
      pathwayCode: "CARDIO_PULMO",
      createdAt: now,
    },
    {
      id: "lib-rule-6",
      code: "LR-006",
      title: "پایش میانسالان مرد (۳۵ تا ۵۵ سال)",
      description: "ریسک‌های متابولیک و قلبی مردان میانسال — قلب، ریه و آزمایشگاه",
      gender: "مرد",
      minAge: 35,
      maxAge: 55,
      jobCategory: "همه",
      pathwayCode: "CARDIO_PULMO",
      createdAt: now,
    },
  ];
}

export const JOB_CATEGORIES = [
  "همه",
  "عملیات و فنی",
  "مدیریت",
  "اداری و مالی",
  "فناوری و مهندسی",
  "خدمات و پشتیبانی",
] as const;

export const ONBOARDING_META: Record<
  OnboardingStage,
  { label: string; short: string; tone: string; badgeClass: string }
> = {
  not_sent: {
    label: "پیامک دعوت ارسال نشده",
    short: "ارسال‌نشده",
    tone: "slate",
    badgeClass: "bg-slate-100 text-slate-600 border border-slate-200",
  },
  sms_sent: {
    label: "پیامک ارسال شد (باز نکرده)",
    short: "پیامک‌شده",
    tone: "sky",
    badgeClass: "bg-sky-50 text-sky-700 border border-sky-200",
  },
  link_opened: {
    label: "لینک را باز کرده (بدون لاگین)",
    short: "بازکرده لینک",
    tone: "indigo",
    badgeClass: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  },
  logged_in: {
    label: "لاگین کرده (شروع نکرده)",
    short: "لاگین کرده",
    tone: "violet",
    badgeClass: "bg-violet-50 text-violet-700 border border-violet-200",
  },
  abandoned: {
    label: "رها شده وسط تکمیل پروفایل",
    short: "رها کرده",
    tone: "amber",
    badgeClass: "bg-amber-50 text-amber-800 border border-amber-200",
  },
  completed: {
    label: "پیش‌ثبت‌نام تکمیل شده",
    short: "تکمیل‌شده",
    tone: "emerald",
    badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
};

export const APPOINTMENT_META: Record<
  ContractAppointmentStatus,
  { label: string; short: string; badgeClass: string }
> = {
  unscheduled: {
    label: "هنوز فراخوان و نوبت‌دهی نشده",
    short: "فراخوان‌نشده",
    badgeClass: "bg-rose-50 text-rose-700 border border-rose-200",
  },
  pinned: {
    label: "نوبت قطعی دستی (اختصاصی)",
    short: "دستی (پین)",
    badgeClass: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  auto_scheduled: {
    label: "فراخوان خودکار (فرمول سقفی)",
    short: "فراخوان خودکار",
    badgeClass: "bg-teal-50 text-teal-700 border border-teal-200",
  },
  checked_in: {
    label: "حاضر در کلینیک (پذیرش‌شده)",
    short: "پذیرش‌شده",
    badgeClass: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  visit_done: {
    label: "پایش سلامت انجام شد",
    short: "معاینه‌شده",
    badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  },
};

export const FILL_FORMULA_LABELS: Record<
  "age_desc" | "onboarded_first" | "roster_order" | "department_balanced",
  string
> = {
  age_desc: "اولویت سن بالاتر به پایین‌تر",
  onboarded_first: "اولویت با تکمیل‌کنندگان پروفایل (سپس بقیه)",
  department_balanced: "توزیع متوازن بین واحدهای سازمانی (تا یک واحد خالی نشود)",
  roster_order: "به ترتیب ردیف لیست قرارداد",
};

/** Evaluates demographic & occupational rules to attach the right health package to a member. */
export function resolveMemberPackage(
  member: { age: number; gender: "مرد" | "زن"; jobCategory: string },
  rules: ContractPathwayRule[],
  defaultPathwayCode: string,
  pathways: Pick<MockPathwayRow, "code" | "title">[]
): { pathwayCode: string; pathwayTitle: string; ruleTitle: string } {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const titleOf = (code: string) =>
    pathways.find((p) => p.code === code)?.title ?? pathways[0]?.title ?? "چکاپ جامع سلامت یک‌روزه";

  for (const rule of sorted) {
    if (rule.gender !== "همه" && rule.gender !== member.gender) continue;
    if (rule.minAge !== null && member.age < rule.minAge) continue;
    if (rule.maxAge !== null && member.age > rule.maxAge) continue;
    if (rule.jobCategory && rule.jobCategory !== "همه" && rule.jobCategory !== member.jobCategory) continue;
    return {
      pathwayCode: rule.pathwayCode,
      pathwayTitle: titleOf(rule.pathwayCode),
      ruleTitle: rule.title,
    };
  }
  const fallback = pathways.find((p) => p.code === defaultPathwayCode)?.code ?? pathways[0]?.code ?? "FULL_CHECKUP";
  return {
    pathwayCode: fallback,
    pathwayTitle: titleOf(fallback),
    ruleTitle: "بسته پایه پیش‌فرض قرارداد",
  };
}

/** Iran-local civil day as Gregorian YYYY-MM-DD ± offset (not a UTC instant). */
export function isoDayOffset(daysFromToday: number): string {
  return iranLocalDayOffset(daysFromToday);
}

export function formatPersianDateLabel(isoDate: string): string {
  return formatFaDateRelative(isoDate);
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

interface RawPerson {
  code: string;
  name: string;
  nid: string;
  phone: string;
  age: number;
  gender: "مرد" | "زن";
  dept: string;
  cat: string;
  source: "api" | "excel" | "manual";
  stage: OnboardingStage;
  pct: number;
  abandonedStep?: string;
  appt: ContractAppointmentStatus;
  dayOffset?: number;
  allergies?: string;
  meds?: string;
  symptoms?: string;
}

/** رجیستری شبیه‌سازی HR/بیمه برای import دمو — کلید API قرارداد؛ دادهٔ زنده از سرور است. */
export interface ExternalApiPerson {
  personnelCode: string;
  fullName: string;
  nationalId: string;
  phone: string;
  age: number;
  gender: "مرد" | "زن";
  department: string;
  jobCategory: string;
}

export const EXTERNAL_HR_API_POOLS: Record<string, ExternalApiPerson[]> = {
  // NIDها با checksum ایران هم‌تراز validation ورود اکسل/API
  "PARS-HR-LIVE-9841-K2": [
    { personnelCode: "PN-1429", fullName: "فرشید بهرامی‌نیا", nationalId: "0071248595", phone: "09124418520", age: 49, gender: "مرد", department: "بهره‌برداری پالایشگاه", jobCategory: "عملیات و فنی" },
    { personnelCode: "PN-1430", fullName: "مهسا شجاعی", nationalId: "0082359611", phone: "09126587412", age: 33, gender: "زن", department: "آزمایشگاه کنترل کیفیت", jobCategory: "فناوری و مهندسی" },
    { personnelCode: "PN-1431", fullName: "کیوان سلطانی", nationalId: "0063417820", phone: "09133258964", age: 54, gender: "مرد", department: "تعمیرات اساسی", jobCategory: "عملیات و فنی" },
    { personnelCode: "PN-1432", fullName: "پیمان درخشان", nationalId: "0054829135", phone: "09128741236", age: 38, gender: "مرد", department: "ایمنی و آتش‌نشانی", jobCategory: "عملیات و فنی" },
    { personnelCode: "PN-1433", fullName: "آزاده توکلی", nationalId: "0079153240", phone: "09352147896", age: 46, gender: "زن", department: "مدیریت قراردادها", jobCategory: "مدیریت" },
  ],
  "NOVIN-BANK-API-4420-X9": [
    { personnelCode: "NB-2211", fullName: "حمیدرضا ملکی", nationalId: "0068412576", phone: "09123365478", age: 51, gender: "مرد", department: "مدیریت اعتبارات کلان", jobCategory: "مدیریت" },
    { personnelCode: "NB-2212", fullName: "شقایق فرزانه", nationalId: "0084512369", phone: "09125478963", age: 31, gender: "زن", department: "شعبه ونک", jobCategory: "اداری و مالی" },
    { personnelCode: "NB-2213", fullName: "یاسر خدادادی", nationalId: "0073698520", phone: "09196541238", age: 44, gender: "مرد", department: "امنیت اطلاعات بانکی", jobCategory: "فناوری و مهندسی" },
    { personnelCode: "NB-2214", fullName: "نسرین پناهی", nationalId: "0059874120", phone: "09127894561", age: 47, gender: "زن", department: "خزانه‌داری مرکزی", jobCategory: "اداری و مالی" },
  ],
  DEFAULT: [
    { personnelCode: "EMP-301", fullName: "سهیل کاظمی‌فرد", nationalId: "0074125893", phone: "09123147852", age: 48, gender: "مرد", department: "مدیریت فنی", jobCategory: "مدیریت" },
    { personnelCode: "EMP-302", fullName: "مرجان احمدزاده", nationalId: "0081472587", phone: "09126325874", age: 32, gender: "زن", department: "منابع انسانی", jobCategory: "اداری و مالی" },
    { personnelCode: "EMP-303", fullName: "رامین گودرزی", nationalId: "0062583697", phone: "09357418529", age: 53, gender: "مرد", department: "تولید و عملیات", jobCategory: "عملیات و فنی" },
    { personnelCode: "EMP-304", fullName: "الناز حیدری", nationalId: "0076543218", phone: "09129517532", age: 29, gender: "زن", department: "توسعه محصول", jobCategory: "فناوری و مهندسی" },
    { personnelCode: "EMP-305", fullName: "مرتضی یوسفی", nationalId: "0053216547", phone: "09138529631", age: 42, gender: "مرد", department: "پشتیبانی و تدارکات", jobCategory: "خدمات و پشتیبانی" },
    { personnelCode: "EMP-306", fullName: "بهنوش صادقیان", nationalId: "0067891233", phone: "09124569871", age: 46, gender: "زن", department: "امور مالی", jobCategory: "اداری و مالی" },
  ],
};

function makeMember(
  id: number,
  contractId: number,
  raw: RawPerson,
  rules: ContractPathwayRule[],
  defaultCode: string,
  pathways: Pick<MockPathwayRow, "code" | "title">[]
): ContractMember {
  const pkg = resolveMemberPackage(
    { age: raw.age, gender: raw.gender, jobCategory: raw.cat },
    rules,
    defaultCode,
    pathways
  );
  const sent = raw.stage !== "not_sent";
  const opened = ["link_opened", "logged_in", "abandoned", "completed"].includes(raw.stage);
  const logged = ["logged_in", "abandoned", "completed"].includes(raw.stage);
  const done = raw.stage === "completed";
  const scheduledIso = raw.dayOffset !== undefined ? isoDayOffset(raw.dayOffset) : null;

  const nameParts = raw.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? raw.name;
  const lastName = nameParts.slice(1).join(" ") || "—";
  const birthYear = new Date().getFullYear() - raw.age;
  return {
    id,
    contractId,
    inviteToken: `CNT-${contractId}-${1000 + id}`,
    personnelCode: raw.code,
    firstName,
    lastName,
    fullName: raw.name,
    nationalId: raw.nid,
    phone: raw.phone,
    birthDate: `${birthYear}-01-01`,
    age: raw.age,
    gender: raw.gender,
    department: raw.dept,
    jobCategory: raw.cat,
    source: raw.source,
    assignedPathwayCode: pkg.pathwayCode,
    assignedPathwayTitle: pkg.pathwayTitle,
    matchedPathwayTitle: pkg.ruleTitle,
    manualPathwayOverride: false,
    onboardingStage: raw.stage,
    profileProgressPct: raw.pct,
    abandonedAtStep: raw.abandonedStep ?? null,
    formStatus:
      raw.stage === "completed" ? "submitted" : raw.stage === "abandoned" || raw.pct > 0 ? "draft" : "none",
    intakeCompleted: raw.stage === "completed",
    smsInviteCount: sent ? (raw.stage === "abandoned" ? 2 : 1) : 0,
    lastSmsAt: sent ? hoursAgo(36 - (id % 12)) : null,
    linkOpenedAt: opened ? hoursAgo(28 - (id % 10)) : null,
    loggedInAt: logged ? hoursAgo(24 - (id % 8)) : null,
    lastActivityAt: logged ? hoursAgo(14 - (id % 7)) : opened ? hoursAgo(20) : null,
    profileCompletedAt: done ? hoursAgo(10 - (id % 6)) : null,
    draftSymptoms: raw.symptoms ?? "",
    draftAllergies: raw.allergies ?? "",
    draftMedications: raw.meds ?? "",
    appointmentStatus: raw.appt,
    scheduledDate: scheduledIso,
    scheduledLabel: scheduledIso ? formatPersianDateLabel(scheduledIso) : null,
    callSentAt: raw.appt !== "unscheduled" ? hoursAgo(8) : null,
    linkedPatientId: null,
  };
}

export function buildSeededContracts(pathways: Pick<MockPathwayRow, "code" | "title">[]): CorporateContract[] {
  const today = isoDayOffset(0);
  const tomorrow = isoDayOffset(1);
  const dayAfter = isoDayOffset(2);

  /* -------- Contract 1: هلدینگ پتروشیمی پارس‌نفت (28 پرسنل فارسی) -------- */
  const c1Rules: ContractPathwayRule[] = [
    {
      id: "r1-exec-senior",
      title: "مدیران و افراد ۴۵ سال به بالا (هر دو جنس)",
      gender: "همه",
      minAge: 45,
      maxAge: null,
      jobCategory: "همه",
      pathwayCode: "FULL_CHECKUP",
      priority: 1,
    },
    {
      id: "r1-ops-men",
      title: "مردان واحد عملیات و فنی (زیر ۴۵ سال — پایش ریه و قلب شغلی)",
      gender: "مرد",
      minAge: 18,
      maxAge: 44,
      jobCategory: "عملیات و فنی",
      pathwayCode: "PRE_OP",
      priority: 2,
    },
    {
      id: "r1-women-under45",
      title: "بانوان زیر ۴۵ سال (پایش قلب، تنفس و آزمایش کامل)",
      gender: "زن",
      minAge: 18,
      maxAge: 44,
      jobCategory: "همه",
      pathwayCode: "CARDIO_PULMO",
      priority: 3,
    },
    {
      id: "r1-office-men",
      title: "مردان ستادی و مهندسی زیر ۴۵ سال",
      gender: "مرد",
      minAge: 18,
      maxAge: 44,
      jobCategory: "همه",
      pathwayCode: "DENTAL_CARDIO",
      priority: 4,
    },
  ];

  // Exactly illustrates user's example:
  // «عادل مرادی» is manually pinned to TODAY; today's quota is 20 men → clicking auto-fill calls up 19 remaining men automatically!
  // Plus 22 other men + 5 women = 28 staff total, so even after filling 20 men today, several remain unscheduled and clearly counted.
  const c1Raw: RawPerson[] = [
    { code: "PN-1401", name: "عادل مرادی", nid: "0064512387", phone: "09121184520", age: 47, gender: "مرد", dept: "مدیریت بهره‌برداری", cat: "مدیریت", source: "api", stage: "completed", pct: 100, appt: "pinned", dayOffset: 0, meds: "لوزارتان ۵۰ میلی‌گرم روزانه", allergies: "پنی‌سیلین", symptoms: "چکاپ دوره‌ای سالانه" },
    { code: "PN-1402", name: "محسن کاویانی", nid: "0057841236", phone: "09123451122", age: 56, gender: "مرد", dept: "اتاق کنترل مرکزی", cat: "عملیات و فنی", source: "api", stage: "completed", pct: 100, appt: "unscheduled", meds: "آتورواستاتین ۲۰", symptoms: "تنگی نفس خفیف در پله" },
    { code: "PN-1403", name: "بابک شریعتی", nid: "0069123478", phone: "09124562233", age: 52, gender: "مرد", dept: "تعمیرات دوار", cat: "عملیات و فنی", source: "api", stage: "completed", pct: 100, appt: "unscheduled", meds: "متفورمین ۵۰۰", allergies: "آسپرین" },
    { code: "PN-1404", name: "فرهاد امینیان", nid: "0072345619", phone: "09125673344", age: 48, gender: "مرد", dept: "مهندسی فرآیند", cat: "فناوری و مهندسی", source: "api", stage: "completed", pct: 100, appt: "unscheduled" },
    { code: "PN-1405", name: "جواد قاسمی‌پور", nid: "1283456712", phone: "09132145566", age: 59, gender: "مرد", dept: "تأسیسات بخار", cat: "عملیات و فنی", source: "api", stage: "abandoned", pct: 65, abandonedStep: "گام ۳ از ۴: داروهای مصرفی", appt: "unscheduled", allergies: "ایبوپروفن" },
    { code: "PN-1406", name: "حامد رضوانی", nid: "0081234590", phone: "09126784455", age: 39, gender: "مرد", dept: "عملیات پالایش", cat: "عملیات و فنی", source: "api", stage: "completed", pct: 100, appt: "unscheduled" },
    { code: "PN-1407", name: "سعید نعمتی", nid: "0075612394", phone: "09193456677", age: 43, gender: "مرد", dept: "ایمنی و HSE", cat: "عملیات و فنی", source: "api", stage: "abandoned", pct: 40, abandonedStep: "گام ۲ از ۴: حساسیت‌ها و آلرژی", appt: "unscheduled" },
    { code: "PN-1408", name: "پویا تهرانی", nid: "0083451276", phone: "09127895566", age: 34, gender: "مرد", dept: "فناوری اطلاعات", cat: "فناوری و مهندسی", source: "excel", stage: "completed", pct: 100, appt: "unscheduled" },
    { code: "PN-1409", name: "مهدی اکبریان", nid: "0061982345", phone: "09354127788", age: 46, gender: "مرد", dept: "حسابرسی داخلی", cat: "اداری و مالی", source: "excel", stage: "logged_in", pct: 15, appt: "unscheduled" },
    { code: "PN-1410", name: "اشکان مرادیان", nid: "0078912356", phone: "09128906677", age: 37, gender: "مرد", dept: "برق و ابزار دقیق", cat: "عملیات و فنی", source: "api", stage: "completed", pct: 100, appt: "unscheduled" },
    { code: "PN-1411", name: "نادر سلیمانی", nid: "0054127893", phone: "09121478899", age: 61, gender: "مرد", dept: "مشاور مدیرعامل", cat: "مدیریت", source: "api", stage: "completed", pct: 100, appt: "unscheduled", meds: "آملودیپین ۵، رزوواستاتین ۱۰" },
    { code: "PN-1412", name: "وحید کرمی", nid: "0076234891", phone: "09362589900", age: 41, gender: "مرد", dept: "بهره‌برداری مخازن", cat: "عملیات و فنی", source: "api", stage: "abandoned", pct: 80, abandonedStep: "گام ۴ از ۴: سوابق بستگان درجه‌یک", appt: "unscheduled" },
    { code: "PN-1413", name: "میلاد جعفری", nid: "0085671234", phone: "09123691100", age: 31, gender: "مرد", dept: "تدارکات و انبار", cat: "خدمات و پشتیبانی", source: "excel", stage: "link_opened", pct: 0, appt: "unscheduled" },
    { code: "PN-1414", name: "اکبر حاتمی", nid: "0058912367", phone: "09134782211", age: 55, gender: "مرد", dept: "حراست صنعتی", cat: "خدمات و پشتیبانی", source: "api", stage: "link_opened", pct: 0, appt: "unscheduled" },
    { code: "PN-1415", name: "شهاب موسوی", nid: "0073128945", phone: "09125893322", age: 44, gender: "مرد", dept: "مهندسی مکانیک", cat: "فناوری و مهندسی", source: "api", stage: "completed", pct: 100, appt: "unscheduled" },
    { code: "PN-1416", name: "داود فرهادی", nid: "0062349871", phone: "09196904433", age: 50, gender: "مرد", dept: "تولید الفین", cat: "عملیات و فنی", source: "api", stage: "logged_in", pct: 10, appt: "unscheduled" },
    { code: "PN-1417", name: "ایمان نادری", nid: "0087123459", phone: "09377015544", age: 29, gender: "مرد", dept: "آزمایشگاه شیمی", cat: "عملیات و فنی", source: "excel", stage: "sms_sent", pct: 0, appt: "unscheduled" },
    { code: "PN-1418", name: "کورش زندی", nid: "0068451290", phone: "09128126655", age: 45, gender: "مرد", dept: "برنامه‌ریزی تولید", cat: "مدیریت", source: "api", stage: "completed", pct: 100, appt: "unscheduled" },
    { code: "PN-1419", name: "رحیم قربانی", nid: "0059234781", phone: "09139237766", age: 57, gender: "مرد", dept: "ترابری سنگین", cat: "خدمات و پشتیبانی", source: "api", stage: "sms_sent", pct: 0, appt: "unscheduled" },
    { code: "PN-1420", name: "سینا فخری", nid: "0089345127", phone: "09120348877", age: 27, gender: "مرد", dept: "شبکه و زیرساخت", cat: "فناوری و مهندسی", source: "excel", stage: "abandoned", pct: 50, abandonedStep: "گام ۲ از ۴: سوابق جراحی و بستری", appt: "unscheduled" },
    { code: "PN-1421", name: "بهزاد محمودی", nid: "0071458923", phone: "09121459988", age: 42, gender: "مرد", dept: "کمپرسورخانه", cat: "عملیات و فنی", source: "api", stage: "link_opened", pct: 0, appt: "unscheduled" },
    { code: "PN-1422", name: "رسول اسدی", nid: "0065781239", phone: "09352561199", age: 49, gender: "مرد", dept: "نگهداری و تعمیرات", cat: "عملیات و فنی", source: "api", stage: "not_sent", pct: 0, appt: "unscheduled" },
    { code: "PN-1423", name: "نوید پارسا", nid: "0082193457", phone: "09123672200", age: 35, gender: "مرد", dept: "مالی و خزانه", cat: "اداری و مالی", source: "excel", stage: "not_sent", pct: 0, appt: "unscheduled" },
    // Women in Contract 1 (scheduled for tomorrow's women day or unscheduled)
    { code: "PN-1424", name: "مینا رستمی", nid: "0074891235", phone: "09124783311", age: 38, gender: "زن", dept: "منابع انسانی", cat: "اداری و مالی", source: "api", stage: "completed", pct: 100, appt: "pinned", dayOffset: 1, meds: "لووتیروکسین ۵۰" },
    { code: "PN-1425", name: "سپیده افشار", nid: "0083912456", phone: "09125894422", age: 32, gender: "زن", dept: "مهندسی شیمی", cat: "فناوری و مهندسی", source: "api", stage: "completed", pct: 100, appt: "unscheduled" },
    { code: "PN-1426", name: "فرزانه طاهری", nid: "0063127894", phone: "09126905533", age: 47, gender: "زن", dept: "مدیریت حقوقی", cat: "مدیریت", source: "api", stage: "abandoned", pct: 55, abandonedStep: "گام ۳ از ۴: داروهای مصرفی", appt: "unscheduled" },
    { code: "PN-1427", name: "نگین هاشمی", nid: "0086451238", phone: "09367016644", age: 28, gender: "زن", dept: "روابط عمومی", cat: "اداری و مالی", source: "excel", stage: "link_opened", pct: 0, appt: "unscheduled" },
    { code: "PN-1428", name: "زهرا باقری‌نژاد", nid: "0075123984", phone: "09128127755", age: 41, gender: "زن", dept: "مالیات و بودجه", cat: "اداری و مالی", source: "excel", stage: "logged_in", pct: 20, appt: "unscheduled" },
  ];

  /* -------- Contract 2: بانک توسعه نوین (10 پرسنل فارسی) -------- */
  const c2Rules: ContractPathwayRule[] = [
    {
      id: "r2-senior",
      title: "مدیران شعب و کارکنان بالای ۴۵ سال",
      gender: "همه",
      minAge: 45,
      maxAge: null,
      jobCategory: "همه",
      pathwayCode: "FULL_CHECKUP",
      priority: 1,
    },
    {
      id: "r2-mid",
      title: "کارشناسان ۳۵ تا ۴۴ سال (پکیج قلب و ریه)",
      gender: "همه",
      minAge: 35,
      maxAge: 44,
      jobCategory: "همه",
      pathwayCode: "CARDIO_PULMO",
      priority: 2,
    },
    {
      id: "r2-young",
      title: "کارکنان زیر ۳۵ سال (پایش قلب و سلامت دهان)",
      gender: "همه",
      minAge: 18,
      maxAge: 34,
      jobCategory: "همه",
      pathwayCode: "DENTAL_CARDIO",
      priority: 3,
    },
  ];

  const c2Raw: RawPerson[] = [
    { code: "NB-2201", name: "شهرام نیک‌پی", nid: "0061234589", phone: "09121119988", age: 53, gender: "مرد", dept: "مدیریت امور شعب", cat: "مدیریت", source: "api", stage: "completed", pct: 100, appt: "visit_done", dayOffset: 0, meds: "والزارتان ۸۰" },
    { code: "NB-2202", name: "لاله معینی", nid: "0072345891", phone: "09122228877", age: 46, gender: "زن", dept: "شعبه مرکزی", cat: "مدیریت", source: "api", stage: "completed", pct: 100, appt: "checked_in", dayOffset: 0 },
    { code: "NB-2203", name: "آرش بهمنی", nid: "0079871234", phone: "09123337766", age: 39, gender: "مرد", dept: "بانکداری شرکتی", cat: "اداری و مالی", source: "api", stage: "completed", pct: 100, appt: "auto_scheduled", dayOffset: 1 },
    { code: "NB-2204", name: "پریسا خسروی", nid: "0081239874", phone: "09124446655", age: 36, gender: "زن", dept: "ارز و بین‌الملل", cat: "اداری و مالی", source: "api", stage: "abandoned", pct: 45, abandonedStep: "گام ۲ از ۴: حساسیت‌های دارویی", appt: "auto_scheduled", dayOffset: 1 },
    { code: "NB-2205", name: "امید سعادتی", nid: "0086541239", phone: "09355554433", age: 30, gender: "مرد", dept: "توسعه همراه بانک", cat: "فناوری و مهندسی", source: "excel", stage: "logged_in", pct: 15, appt: "unscheduled" },
    { code: "NB-2206", name: "هدی جلالی", nid: "0087654321", phone: "09126663322", age: 29, gender: "زن", dept: "شعبه جردن", cat: "اداری و مالی", source: "excel", stage: "link_opened", pct: 0, appt: "unscheduled" },
    { code: "NB-2207", name: "کامبیز صفوی", nid: "0058761234", phone: "09127772211", age: 50, gender: "مرد", dept: "بازرسی و تطبیق", cat: "مدیریت", source: "api", stage: "completed", pct: 100, appt: "auto_scheduled", dayOffset: 1 },
    { code: "NB-2208", name: "مریم نوروزی", nid: "0076549871", phone: "09198881100", age: 42, gender: "زن", dept: "اعتبارات خرد", cat: "اداری و مالی", source: "api", stage: "abandoned", pct: 70, abandonedStep: "گام ۳ از ۴: داروهای فعلی", appt: "unscheduled" },
    { code: "NB-2209", name: "مانی شفیعی", nid: "0084321987", phone: "09129990011", age: 33, gender: "مرد", dept: "پشتیبانی شعب", cat: "خدمات و پشتیبانی", source: "excel", stage: "sms_sent", pct: 0, appt: "unscheduled" },
    { code: "NB-2210", name: "رعنا کریمیان", nid: "0073216548", phone: "09121231234", age: 37, gender: "زن", dept: "مالی و تسویه", cat: "اداری و مالی", source: "excel", stage: "not_sent", pct: 0, appt: "unscheduled" },
  ];

  let nextMemberId = 1;

  const contract1: CorporateContract = {
    id: 1,
    code: "CTR-1404-101",
    title: "پایش سلامت سالانه کارکنان هلدینگ پتروشیمی پارس‌نفت",
    organizationName: "هلدینگ پتروشیمی پارس‌نفت",
    status: "active",
    startDate: today,
    endDate: isoDayOffset(30),
    apiEndpoint: "https://hr-gateway.parsnaft.ir/v2/health-roster",
    apiKey: "PARS-HR-LIVE-9841-K2",
    lastApiSyncAt: hoursAgo(6),
    defaultPathwayCode: "FULL_CHECKUP",
    pathwayRules: c1Rules,
    dayQuotas: [
      {
        id: "q1-today",
        date: today,
        persianLabel: formatPersianDateLabel(today),
        totalCap: 20,
        genderFilter: "مرد",
        minAge: null,
        maxAge: null,
        fillFormula: "age_desc",
        notes: "سقف امروز ۲۰ نفر آقا — عادل مرادی به صورت دستی فیکس شده و ۱۹ ظرفیت دیگر آماده فراخوان خودکار است.",
      },
      {
        id: "q1-tomorrow",
        date: tomorrow,
        persianLabel: formatPersianDateLabel(tomorrow),
        totalCap: 12,
        genderFilter: "زن",
        minAge: null,
        maxAge: null,
        fillFormula: "onboarded_first",
        notes: "روز اختصاصی پایش سلامت بانوان سازمان",
      },
      {
        id: "q1-day3",
        date: dayAfter,
        persianLabel: formatPersianDateLabel(dayAfter),
        totalCap: 15,
        genderFilter: "همه",
        minAge: null,
        maxAge: null,
        fillFormula: "department_balanced",
        notes: "توزیع متوازن افراد باقی‌مانده بین واحدها",
      },
    ],
    supervisor: {
      fullName: "مهندس کامران بهشتی",
      title: "مدیر HSE و سلامت شغلی هلدینگ",
      phone: "09123409876",
      nationalId: "0061122335",
      isActive: true,
      canSendReminders: true,
      assignedAt: hoursAgo(48),
      lastSeenAt: hoursAgo(2),
    },
    smsLogs: [
      {
        id: "sms-101",
        sentAt: hoursAgo(30),
        senderName: "دکتر فرهاد سعیدی (مدیر کلینیک)",
        campaignTitle: "دعوت اولیه تکمیل پروفایل سلامت",
        audienceLabel: "پرسنل دریافت‌شده از API و اکسل",
        messageTemplate: "همکار گرامی {نام}، پایش سلامت {شرکت} در نفس فعال شد. لطفاً پیش از مراجعه پروفایل و سوابق خود را در لینک {لینک} تکمیل فرمایید.",
        recipientCount: 26,
        recipientPreview: ["عادل مرادی", "محسن کاویانی", "بابک شریعتی", "مینا رستمی"],
      },
      {
        id: "sms-102",
        sentAt: hoursAgo(9),
        senderName: "دکتر فرهاد سعیدی (مدیر کلینیک)",
        campaignTitle: "یادآوری تکمیل فرم نیمه‌کاره",
        audienceLabel: "افراد رهاکرده وسط تکمیل پروفایل",
        messageTemplate: "{نام} عزیز، فرم پیش‌ثبت‌نام سلامت شما نیمه‌کاره مانده است. برای جلوگیری از معطلی در روز مراجعه از طریق {لینک} آن را نهایی کنید.",
        recipientCount: 5,
        recipientPreview: ["جواد قاسمی‌پور", "سعید نعمتی", "وحید کرمی", "فرزانه طاهری"],
      },
    ],
    members: c1Raw.map((raw) => makeMember(nextMemberId++, 1, raw, c1Rules, "FULL_CHECKUP", pathways)),
    createdAt: hoursAgo(72),
  };

  const contract2: CorporateContract = {
    id: 2,
    code: "CTR-1404-102",
    title: "چکاپ دوره‌ای کارکنان بانک توسعه نوین (شعب تهران)",
    organizationName: "بانک توسعه نوین",
    status: "active",
    startDate: today,
    endDate: isoDayOffset(45),
    apiEndpoint: "https://welfare.novinbank.ir/api/v1/checkup-members",
    apiKey: "NOVIN-BANK-API-4420-X9",
    lastApiSyncAt: hoursAgo(18),
    defaultPathwayCode: "CARDIO_PULMO",
    pathwayRules: c2Rules,
    dayQuotas: [
      {
        id: "q2-tomorrow",
        date: tomorrow,
        persianLabel: formatPersianDateLabel(tomorrow),
        totalCap: 8,
        genderFilter: "همه",
        minAge: null,
        maxAge: null,
        fillFormula: "onboarded_first",
        notes: "سهمیه روزانه کارکنان شعب بدون توقف خدمت‌رسانی",
      },
    ],
    supervisor: {
      fullName: "سمانه کاوه",
      title: "مدیر رفاه و سرمایه انسانی بانک",
      phone: "09127754310",
      nationalId: "0075544334",
      isActive: true,
      canSendReminders: true,
      assignedAt: hoursAgo(96),
      lastSeenAt: hoursAgo(5),
    },
    smsLogs: [
      {
        id: "sms-201",
        sentAt: hoursAgo(40),
        senderName: "دکتر فرهاد سعیدی (مدیر کلینیک)",
        campaignTitle: "ارسال لینک پیش‌ثبت‌نام چکاپ بانک",
        audienceLabel: "لیست اولیه کارکنان",
        messageTemplate: "همکار گرامی {نام}، بسته «{پکیج}» برای شما فعال شد. تکمیل پرسشنامه پیش‌پذیرش: {لینک}",
        recipientCount: 9,
        recipientPreview: ["شهرام نیک‌پی", "لاله معینی", "آرش بهمنی"],
      },
    ],
    members: c2Raw.map((raw) => makeMember(nextMemberId++, 2, raw, c2Rules, "CARDIO_PULMO", pathways)),
    createdAt: hoursAgo(120),
  };

  return [contract1, contract2];
}

/* ---------------- Excel Template Generator & Parser (100% client-side) ---------------- */

const TEMPLATE_HEADERS = [
  "نام*",
  "نام‌خانوادگی*",
  "کد ملی*",
  "شماره موبایل*",
  "تاریخ تولد* (شمسی)",
  "جنسیت*",
  "تاهل",
  "نام پدر",
  "تاریخ مراجعه (شمسی)",
  "گروه / کد مسیر",
  "واحد سازمانی",
  "رده شغلی",
  "کد پرسنلی",
];

const TEMPLATE_SAMPLE_ROWS = [
  ["امیرحسین", "رستگار", "0012345679", "09123456781", "1355/02/15", "مرد", "متأهل", "رضا", "1405/09/01", "FULL_CHECKUP", "بهره‌برداری", "عملیات و فنی", "PR-2001"],
  ["نازنین", "شریفی", "0011223340", "09129876542", "1369/08/03", "زن", "مجرد", "علی", "", "", "امور مالی", "اداری و مالی", "PR-2002"],
  ["مسعود", "طباطبایی", "0499370899", "09351122334", "1351/11/20", "مرد", "", "حسن", "1405/09/02", "آقایان 40+", "مدیریت مهندسی", "مدیریت", "PR-2003"],
];

/** Downloads a real Excel-ready RTL `.xls` template (opens natively in Microsoft Excel & LibreOffice). */
export function downloadContractExcelTemplate(format: "xls" | "csv" = "xls"): void {
  if (typeof window === "undefined") return;
  if (format === "csv") {
    const rows = [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE_ROWS];
    const csv =
      "\uFEFF" +
      rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, "nabz-contract-template.csv");
    return;
  }

  const headerHtml = TEMPLATE_HEADERS.map(
    (h) =>
      `<th style="background:#1d5545;color:#ffffff;font-weight:bold;padding:8px 12px;border:1px solid #cbd5e1;">${h}</th>`
  ).join("");
  const bodyHtml = TEMPLATE_SAMPLE_ROWS.map(
    (row) =>
      `<tr>${row
        .map(
          (cell, i) =>
            `<td style="padding:6px 10px;border:1px solid #e2e8f0;${
              // کدملی و موبایل به‌صورت متن تا صفر پیشوند در Excel حذف نشود
              i === 2 || i === 3 ? "mso-number-format:'\\@';" : ""
            }">${cell}</td>`
        )
        .join("")}</tr>`
  ).join("");

  const html = `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" dir="rtl"><head><meta charset="UTF-8" /></head><body><table dir="rtl" border="1"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  triggerDownload(blob, "nabz-contract-template.xls");
}

/** Exports a contract's full roster (funnel + package + appointment) to Excel for admin or corporate supervisor. */
export function exportContractReportExcel(contract: CorporateContract): void {
  if (typeof window === "undefined") return;
  const headers = [
    "کد پرسنلی",
    "نام و نام خانوادگی",
    "کد ملی",
    "موبایل",
    "سن",
    "جنسیت",
    "واحد سازمانی",
    "مسیر سلامتی تخصیص‌یافته",
    "وضعیت پیش‌ثبت‌نام",
    "درصد تکمیل پروفایل",
    "وضعیت نوبت‌دهی",
    "تاریخ نوبت معاینه",
  ];
  const rows = contract.members.map((m) => [
    m.personnelCode,
    m.fullName,
    m.nationalId,
    m.phone,
    String(m.age),
    m.gender,
    m.department,
    // عنوان فارسی؛ اگر عنوان = کد انگلیسی بود جایگزین می‌شود
    m.assignedPathwayTitle === m.assignedPathwayCode || !m.assignedPathwayTitle
      ? m.assignedPathwayCode === "FULL_CHECKUP" || !m.assignedPathwayCode
        ? "چکاپ جامع"
        : m.assignedPathwayTitle || m.assignedPathwayCode
      : m.assignedPathwayTitle,
    ONBOARDING_META[m.onboardingStage].label,
    `${m.profileProgressPct}%`,
    APPOINTMENT_META[m.appointmentStatus].label,
    m.scheduledLabel ?? "نوبت‌دهی نشده",
  ]);
  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    `report-${contract.code}.csv`
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type {
  ImportPreviewStatus,
  ImportPreviewRow,
  ParseImportResult,
  ColumnMapping,
  ImportFieldKey,
} from "@/lib/contract-member-import";
export {
  parseExcelOrCsvText,
  parseImportFile,
  finalizeImportParse,
  analyzeImportGrid,
  previewRowToExternalPerson,
  IMPORT_FIELD_LABELS,
  REQUIRED_IMPORT_FIELDS,
} from "@/lib/contract-member-import";
