/*
 File: frontend/src/lib/workspace.ts
 Description: ناوبری نقش‌ها، صفحات workspace و برچسب‌ها (شامل clinic-users و ادمین کل)
 Parent Dependencies: types/clinic, persian
 */

import type { PatientFullDto, RoomDto, StaffMemberDto, VisitStationDto, WorkspaceRole } from "@/types/clinic";
import { normalizePersianLetters, toLatinDigits } from "@/lib/persian";

export type AppPage =
  | "dashboard"
  | "patients"
  | "admission"
  | "flow"
  | "queues"
  | "alerts"
  | "clinical"
  | "clinical-notes"
  | "clinical-complete"
  | "diagnostics"
  | "diagnostics-tracker"
  | "diagnostics-upload"
  | "records"
  | "journey-intro"
  | "companion-intake"
  | "companion-map"
  | "companion-records"
  | "companion-links"
  | "patient-privacy"
  | "contracts"
  | "contract-packages"
  | "contract-schedule"
  | "contract-funnel"
  | "supervisor-roster"
  | "reports"
  | "pathways"
  | "rooms"
  | "team"
  | "clinic-users"
  | "forms"
  | "platform-dashboard"
  | "platform-users"
  | "platform-fraud"
  | "platform-health"
  | "platform-settings"
  | "platform-integrations"
  | "platform-audit";

export const PAGE_TITLES: Record<AppPage, string> = {
  dashboard: "داشبورد",
  patients: "سلامتجویان و پرونده‌ها",
  admission: "پذیرش سلامتجو جدید",
  flow: "جریان زنده سلامتجویان",
  queues: "مدیریت صف‌ها",
  alerts: "اعلان‌ها و فراخوان‌ها",
  clinical: "پرسشنامه و خلاصه ویزیت",
  "clinical-notes": "معاینه، تشخیص و نسخه",
  "clinical-complete": "اتمام ویزیت و هدایت سلامتجو",
  diagnostics: "خدمات تشخیصی",
  "diagnostics-tracker": "پیگیری نمونه و انجام تست",
  "diagnostics-upload": "آپلود نتایج و تصاویر",
  records: "پرونده الکترونیک سلامتجو",
  "journey-intro": "نقشه راه سلامتی",
  "companion-intake": "پرسشنامه پیش‌پذیرش",
  "companion-map": "نقشه و راهنمای مسیر",
  "companion-records": "پرونده امروز و گزارش",
  "companion-links": "سلامتجویان من و نسبت من",
  "patient-privacy": "دسترسی همراه‌های من",
  contracts: "قراردادهای سازمانی و پکیج‌ها",
  "contract-packages": "بسته‌های سلامت و قوانین تخصیص",
  "contract-schedule": "زمان‌بندی و فرمول سقفی قرارداد",
  "contract-funnel": "رصد پیش‌ثبت‌نام و پیامک گروهی",
  "supervisor-roster": "پیگیری کارمندان قرارداد",
  reports: "گزارش‌های عملکرد",
  pathways: "مسیرهای درمانی",
  rooms: "طبقات و اتاق‌ها",
  team: "کادر درمان و دسترسی‌ها",
  "clinic-users": "مدیریت کاربران",
  forms: "فرم‌های پیش‌پذیرش",
  "platform-dashboard": "داشبورد پلتفرم",
  "platform-users": "مدیریت کاربران",
  "platform-fraud": "بازبینی ضدتقلب",
  "platform-health": "نظارت فنی",
  "platform-settings": "تنظیمات پایه",
  "platform-integrations": "یکپارچه‌سازی‌ها",
  "platform-audit": "ممیزی سیستم",
};

export const PLATFORM_PAGES: AppPage[] = [
  "platform-dashboard",
  "platform-users",
  "platform-fraud",
  "platform-health",
  "platform-settings",
  "platform-integrations",
  "platform-audit",
];

/**
 * Reception / paraclinic operational pages — temporarily platform-admin only.
 * Kept as a named set so ROLE_NAV and action guards stay aligned.
 */
export const OPS_PAGES: AppPage[] = [
  "admission",
  "flow",
  "queues",
  "alerts",
  "diagnostics",
  "diagnostics-tracker",
  "diagnostics-upload",
];

/** Workspace roles whose switcher entries are hidden until ops reopen for clinic staff. */
export const OPS_ROLES_HIDDEN_FROM_SWITCHER: WorkspaceRole[] = ["reception", "paraclinic"];

/**
 * Temporary kill-switch for companion (همراه) linking / role.
 * Patient self-journey pages (companion-intake/map/records) stay available.
 * Flip to true in a later phase to restore companion UX without further refactor.
 */
export const COMPANION_FEATURE_ENABLED = false;

/** Pages that only exist for companion linking / privacy management. */
export const COMPANION_FEATURE_PAGES: AppPage[] = ["companion-links", "patient-privacy"];

/**
 * سطح محصول v1: فقط نقش‌ها و صفحات دامنهٔ مستند (بدون صف/اتاق/همراه/پاراکلینیک عملیاتی).
 * خاموش کردن این فلگ فقط برای فازهای آیندهٔ غیر-v1 مجاز است.
 */
export const V1_PRODUCT_SURFACE = true;

/** نقش‌های دامنهٔ v1 که در سوئیچر دیده می‌شوند. */
export const V1_ROLES: WorkspaceRole[] = ["owner", "specialist", "admin", "supervisor", "platform"];

/** صفحات خارج از v1 که حتی برای ادمین کل هم در ناوبری فعال نیستند. */
export const NON_V1_PAGES: AppPage[] = [
  ...OPS_PAGES,
  "rooms",
  "pathways",
  "team",
  "reports",
  "clinical",
  "clinical-notes",
  "clinical-complete",
  "companion-links",
  "patient-privacy",
  "companion-map",
  "contract-schedule",
];

/** Role switcher entries. The first role is the default for every session. */
export const ROLES: { id: WorkspaceRole; label: string; description: string; page: AppPage }[] = [
  { id: "owner", label: "سلامتجو", description: "داشبورد شخصی، پرسشنامه پیش‌پذیرش، مسیر درمان و گزارش من", page: "dashboard" },
  { id: "patient", label: "همراه سلامتجو", description: "پیگیری پرونده‌های دیگران فقط در محدوده اجازه سلامتجو", page: "dashboard" },
  { id: "reception", label: "پذیرش و هماهنگی", description: "پذیرش، صف‌ها و جریان زنده سلامتجویان", page: "dashboard" },
  { id: "specialist", label: "پزشک متخصص", description: "لیست انتظار، معاینه، تشخیص و نسخه", page: "dashboard" },
  { id: "paraclinic", label: "کارشناس پاراکلینیک", description: "صف بخش تشخیصی و نتایج آزمایش", page: "dashboard" },
  { id: "admin", label: "ادمین و راهبر کلینیک", description: "قراردادهای سازمانی، قیف ثبت‌نام، نوبت‌دهی سقفی و تنظیمات", page: "contracts" },
  { id: "platform", label: "ادمین کل", description: "نظارت سیستمی، کاربران، ضدتقلب، سلامت فنی و تنظیمات پایه", page: "platform-dashboard" },
  { id: "supervisor", label: "ناظر سازمان (طرف قرارداد)", description: "پنل نظارت شرکت بر پیش‌ثبت‌نام، نوبت‌ها و حضور کارکنان", page: "dashboard" },
];

function filterPagesForV1(pages: AppPage[]): AppPage[] {
  if (!V1_PRODUCT_SURFACE) return pages;
  return pages.filter((p) => !NON_V1_PAGES.includes(p));
}

/** Roles shown in the switcher; companion + ops staff roles hidden while feature gates are off. */
export function selectableRoles(): typeof ROLES {
  return ROLES.filter((r) => {
    if (V1_PRODUCT_SURFACE && !V1_ROLES.includes(r.id)) return false;
    if (!COMPANION_FEATURE_ENABLED && r.id === "patient") return false;
    if (OPS_ROLES_HIDDEN_FROM_SWITCHER.includes(r.id)) return false;
    return true;
  });
}

export function filterPagesForCompanionFeature(pages: AppPage[]): AppPage[] {
  let next = pages;
  if (!COMPANION_FEATURE_ENABLED) next = next.filter((p) => !COMPANION_FEATURE_PAGES.includes(p));
  return filterPagesForV1(next);
}

/** Role nav with companion-only pages stripped when the feature is disabled. */
export function roleNavFor(role: WorkspaceRole): RoleNav {
  const base = ROLE_NAV[role];
  return {
    ...base,
    groups: base.groups
      .map((group) => ({
        ...group,
        pages: filterPagesForCompanionFeature(group.pages),
      }))
      .filter((group) => group.pages.length > 0),
    mobile: filterPagesForCompanionFeature(base.mobile),
  };
}

export interface RoleNav {
  home: AppPage;
  groups: { title: string; pages: AppPage[] }[];
  mobile: AppPage[];
  labels?: Partial<Record<AppPage, string>>;
  short?: Partial<Record<AppPage, string>>;
}

/** Navigation contract per role: sidebar groups, bottom bar on small screens and role-specific labels. */
export const ROLE_NAV: Record<WorkspaceRole, RoleNav> = {
  owner: {
    home: "dashboard",
    groups: [
      { title: "پرونده من", pages: ["dashboard", "companion-intake", "companion-map", "companion-records"] },
      { title: "حریم خصوصی و سوابق", pages: ["companion-links", "patient-privacy"] },
    ],
    mobile: ["dashboard", "companion-intake", "companion-map", "companion-records", "patient-privacy"],
    labels: {
      dashboard: "امروز من",
      "companion-intake": "پرسشنامه امروز",
      "companion-map": "نقشه و مسیر من",
      "companion-records": "گزارش پایانی من",
      "companion-links": "سوابق و پرونده‌های من",
      "patient-privacy": "دسترسی همراه‌های من",
    },
    short: { dashboard: "امروز", "companion-intake": "پرسشنامه", "companion-map": "نقشه", "companion-records": "گزارش", "patient-privacy": "همراه‌ها" },
  },
  patient: {
    home: "dashboard",
    groups: [
      { title: "پرونده من", pages: ["dashboard", "companion-intake", "companion-map", "companion-records"] },
      { title: "وابستگی", pages: ["companion-links"] },
    ],
    mobile: ["dashboard", "companion-intake", "companion-map", "companion-records", "companion-links"],
    labels: {
      dashboard: "پیگیری امروز",
      "companion-intake": "وضعیت پرسشنامه سلامتجو",
      "companion-map": "مسیر و مکان سلامتجو",
      "companion-records": "گزارش مجاز سلامتجو",
      "companion-links": "سلامتجویان همراهی‌شده",
    },
    short: { dashboard: "پیگیری", "companion-intake": "پرسشنامه", "companion-map": "مسیر", "companion-records": "گزارش", "companion-links": "سلامتجویان" },
  },
  reception: {
    home: "dashboard",
    groups: [
      { title: "نمای کلی", pages: ["dashboard"] },
      { title: "پذیرش و جریان", pages: ["admission", "flow", "queues", "alerts"] },
      { title: "سلامتجویان", pages: ["patients", "records"] },
    ],
    mobile: ["dashboard", "admission", "flow", "queues", "alerts"],
    labels: {
      dashboard: "نمای امروز",
      admission: "پذیرش سلامتجو جدید",
      flow: "جریان زنده سلامتجویان",
      queues: "مدیریت صف‌ها",
      alerts: "اعلان و فراخوان",
      patients: "فهرست سلامتجویان",
      records: "پرونده سلامتجو",
    },
    short: { dashboard: "امروز", admission: "پذیرش", flow: "جریان", queues: "صف‌ها", alerts: "اعلان" },
  },
  specialist: {
    home: "dashboard",
    groups: [
      { title: "مطب من", pages: ["dashboard", "clinical", "clinical-notes", "clinical-complete"] },
      { title: "سلامتجویان", pages: ["records"] },
    ],
    mobile: ["dashboard", "clinical", "clinical-notes", "clinical-complete", "records"],
    labels: {
      dashboard: "لیست انتظار مطب",
      clinical: "شرح حال و خلاصه",
      "clinical-notes": "معاینه و نسخه",
      "clinical-complete": "اتمام ویزیت",
      records: "پرونده سلامتجو",
    },
    short: { dashboard: "انتظار", clinical: "شرح حال", "clinical-notes": "نسخه", "clinical-complete": "اتمام", records: "پرونده" },
  },
  paraclinic: {
    home: "dashboard",
    groups: [
      { title: "بخش تشخیصی", pages: ["dashboard", "diagnostics-tracker", "diagnostics-upload"] },
      { title: "سلامتجویان", pages: ["records"] },
    ],
    mobile: ["dashboard", "diagnostics-tracker", "diagnostics-upload", "records"],
    labels: {
      dashboard: "صف بخش تشخیصی",
      "diagnostics-tracker": "پیگیری نمونه و تست",
      "diagnostics-upload": "آپلود نتیجه",
      records: "پرونده سلامتجو",
    },
    short: { dashboard: "صف", "diagnostics-tracker": "پیگیری", "diagnostics-upload": "آپلود", records: "پرونده" },
  },
  supervisor: {
    home: "dashboard",
    groups: [
      { title: "پنل ناظر سازمان", pages: ["dashboard", "supervisor-roster"] },
    ],
    mobile: ["dashboard", "supervisor-roster"],
    labels: {
      dashboard: "داشبورد پایش قرارداد",
      "supervisor-roster": "وضعیت کارمندان و پیامک",
    },
    short: { dashboard: "پایش قرارداد", "supervisor-roster": "کارمندان" },
  },
  admin: {
    home: "contracts",
    groups: [
      { title: "قراردادهای سازمانی", pages: ["contracts", "contract-packages", "contract-funnel"] },
      { title: "نمای کلی", pages: ["dashboard", "patients", "records"] },
      { title: "پیکربندی کلینیک", pages: ["clinic-users", "forms"] },
    ],
    mobile: ["contracts", "contract-funnel", "dashboard", "clinic-users", "forms"],
    labels: {
      contracts: "افراد قرارداد و منابع ورود",
      "contract-packages": "بسته‌ها و کتابخانه قوانین",
      "contract-funnel": "قیف ثبت‌نام و پیامک گروهی",
      dashboard: "داشبورد کلینیک",
      patients: "سلامتجویان حاضر",
      records: "پرونده سلامتجو",
      "clinic-users": "مدیریت کاربران",
      forms: "فرم‌های پیش‌پذیرش",
    },
    short: {
      contracts: "افراد",
      "contract-packages": "بسته‌ها",
      "contract-funnel": "قیف و پیامک",
      dashboard: "کلینیک",
      "clinic-users": "کاربران",
    },
  },
  platform: {
    home: "platform-dashboard",
    groups: [
      { title: "نمای پلتفرم", pages: ["platform-dashboard"] },
      { title: "کاربران و نظارت", pages: ["platform-users", "platform-fraud"] },
      { title: "فنی و پیکربندی", pages: ["platform-health", "platform-settings", "platform-integrations", "platform-audit"] },
      { title: "پرونده‌ها", pages: ["patients", "records"] },
    ],
    mobile: ["platform-dashboard", "platform-users", "platform-fraud", "platform-settings"],
    labels: {
      "platform-dashboard": "داشبورد پلتفرم",
      "platform-users": "مدیریت کاربران",
      "platform-fraud": "ضدتقلب",
      "platform-health": "سلامت فنی",
      "platform-settings": "تنظیمات پایه",
      "platform-integrations": "یکپارچه‌سازی",
      "platform-audit": "ممیزی",
      patients: "فهرست سلامتجویان",
      records: "پرونده سلامتجو",
    },
    short: {
      "platform-dashboard": "پلتفرم",
      "platform-users": "کاربران",
      "platform-fraud": "ضدتقلب",
      "platform-settings": "تنظیمات",
    },
  },
};

/** Pages a role may open — در v1 دیگر OPS به ادمین کل ضمیمه نمی‌شود. */
export function allowedPagesFor(role: WorkspaceRole): AppPage[] {
  return filterPagesForCompanionFeature(roleNavFor(role).groups.flatMap((group) => group.pages));
}

export function isOpsPage(page: AppPage): boolean {
  return OPS_PAGES.includes(page);
}

export function labelFor(role: WorkspaceRole, page: AppPage): string {
  return ROLE_NAV[role].labels?.[page] ?? PAGE_TITLES[page];
}

export function shortLabelFor(role: WorkspaceRole, page: AppPage): string {
  return ROLE_NAV[role].short?.[page] ?? labelFor(role, page);
}

export function isAppPage(value: string | null | undefined): value is AppPage {
  return Boolean(value && value in PAGE_TITLES);
}

export const COMPANION_RELATIONS = [
  { value: "self", label: "خود سلامتجو" },
  { value: "child", label: "فرزند" },
  { value: "parent", label: "والدین" },
  { value: "spouse", label: "همسر" },
  { value: "sibling", label: "خواهر/برادر" },
  { value: "relative", label: "سایر بستگان" },
  { value: "other", label: "سایر" },
] as const;

export const COMPANION_RELATION_CODES: string[] = COMPANION_RELATIONS.map((r) => r.value);

export function relationLabel(code?: string | null): string {
  return COMPANION_RELATIONS.find((r) => r.value === code)?.label ?? "همراه";
}

export function permissionLabel(code?: string | null): string {
  return code === "follow" ? "فقط پیگیری" : "ثبت اطلاعات و پیگیری";
}

export function currentStation(patient: PatientFullDto): VisitStationDto | undefined {
  return patient.stations.find((s) => ["waiting", "checked_in", "in_progress"].includes(s.status))
    ?? patient.stations.find((s) => s.status === "pending");
}

/** Display name/specialty for a room: active staff with matching roomCode wins over legacy room.specialistName. */
export function roomStaffDisplay(
  room: RoomDto,
  staff: StaffMemberDto[]
): { name: string; specialty: string; staffId: number | null } {
  const assigned = staff.find((s) => s.isActive && s.roomCode === room.code);
  if (assigned) {
    return {
      name: assigned.fullName,
      specialty: assigned.specialtyOrDept || room.specialtyTitle,
      staffId: assigned.id,
    };
  }
  return {
    name: room.specialistName,
    specialty: room.specialtyTitle,
    staffId: null,
  };
}

export function stationLabel(code: string): string {
  return ({ LAB: "آزمایشگاه", ECG: "نوار قلب", CARDIO: "قلب و عروق", PULMO: "ریه", DENTAL: "دندانپزشکی", RADIO: "تصویربرداری" } as Record<string, string>)[code] ?? code;
}

export function patientStatus(patient: PatientFullDto): { label: string; tone: string } {
  if (patient.completedAt || (patient.stations.length > 0 && patient.stations.every((s) => s.status === "completed"))) return { label: "تکمیل شده", tone: "green" };
  const station = currentStation(patient);
  if (station?.status === "in_progress") return { label: "در حال ویزیت", tone: "blue" };
  if (station?.status === "checked_in") return { label: "اعلام حضور", tone: "teal" };
  return { label: "در انتظار", tone: "amber" };
}

export function initials(name: string): string {
  return name.replace(/دکتر |مهندس /g, "").split(/[\s‌]+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join(" ");
}

export function normalizeText(value: string): string {
  return toLatinDigits(normalizePersianLetters(value))
    .replace(/[\u200c\u200e\u200f\u2066-\u2069]/g, "")
    .toLowerCase();
}

/** True when every query word appears in the haystack; Persian/Arabic digit and ZWNJ tolerant. */
export function matchesAllTerms(haystack: string, query: string): boolean {
  const normalized = normalizeText(haystack).replace(/\s+/g, " ");
  const terms = normalizeText(query).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  return terms.length > 0 && terms.every((term) => normalized.includes(term));
}

export function normalizeNationalId(value: string): string {
  return normalizeText(value).replace(/[^0-9]/g, "");
}

export function matchesPatient(patient: PatientFullDto, query: string): boolean {
  const search = normalizeText(query.trim());
  return !search || normalizeText(`${patient.fullName} ${patient.nationalId} ${patient.phone} ${patient.qrToken}`).includes(search);
}

export function totalVisitMinutes(patient: PatientFullDto, asOf: string): number {
  const end = patient.completedAt ?? asOf;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(patient.checkInTime).getTime()) / 60000));
}

export function downloadPatientsCsv(patients: PatientFullDto[]) {
  const rows = [["نام سلامتجو", "کد ملی", "تلفن", "بسته درمانی", "ایستگاه فعلی", "وضعیت"], ...patients.map((p) => [p.fullName, p.nationalId, p.phone, p.pathwayTitle, currentStation(p)?.roomName ?? "پایان مراجعه", patientStatus(p).label])];
  const csv = "\uFEFF" + rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "nabz-patients.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
