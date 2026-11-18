import type { PatientFullDto, VisitStationDto, WorkspaceRole } from "@/types/clinic";

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
  | "team";

export const PAGE_TITLES: Record<AppPage, string> = {
  dashboard: "داشبورد",
  patients: "بیماران و پرونده‌ها",
  admission: "پذیرش بیمار جدید",
  flow: "جریان زنده بیماران",
  queues: "مدیریت صف‌ها",
  alerts: "اعلان‌ها و فراخوان‌ها",
  clinical: "شرح حال و خلاصه ویزیت",
  "clinical-notes": "معاینه، تشخیص و نسخه",
  "clinical-complete": "اتمام ویزیت و هدایت بیمار",
  diagnostics: "خدمات تشخیصی",
  "diagnostics-tracker": "پیگیری نمونه و انجام تست",
  "diagnostics-upload": "آپلود نتایج و تصاویر",
  records: "پرونده الکترونیک بیمار",
  "companion-intake": "شرح حال و سوابق",
  "companion-map": "نقشه و راهنمای مسیر",
  "companion-records": "پرونده امروز و گزارش",
  "companion-links": "بیماران من و نسبت من",
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
};

/** Role switcher entries. The first role is the default for every session. */
export const ROLES: { id: WorkspaceRole; label: string; description: string; page: AppPage }[] = [
  { id: "owner", label: "بیمار", description: "داشبورد شخصی، شرح حال، مسیر درمان و گزارش من", page: "dashboard" },
  { id: "patient", label: "همراه بیمار", description: "پیگیری پرونده‌های دیگران فقط در محدوده اجازه بیمار", page: "dashboard" },
  { id: "reception", label: "پذیرش و هماهنگی", description: "پذیرش، صف‌ها و جریان زنده بیماران", page: "dashboard" },
  { id: "specialist", label: "پزشک متخصص", description: "لیست انتظار، معاینه، تشخیص و نسخه", page: "dashboard" },
  { id: "paraclinic", label: "کارشناس پاراکلینیک", description: "صف بخش تشخیصی و نتایج آزمایش", page: "dashboard" },
  { id: "admin", label: "ادمین و راهبر کلینیک", description: "قراردادهای سازمانی، قیف ثبت‌نام، نوبت‌دهی سقفی و تنظیمات", page: "contracts" },
  { id: "supervisor", label: "ناظر سازمان (طرف قرارداد)", description: "پنل نظارت شرکت بر پیش‌ثبت‌نام، نوبت‌ها و حضور کارکنان", page: "dashboard" },
];

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
      "companion-intake": "شرح حال امروز",
      "companion-map": "نقشه و مسیر من",
      "companion-records": "گزارش پایانی من",
      "companion-links": "سوابق و پرونده‌های من",
      "patient-privacy": "دسترسی همراه‌های من",
    },
    short: { dashboard: "امروز", "companion-intake": "شرح حال", "companion-map": "نقشه", "companion-records": "گزارش", "patient-privacy": "همراه‌ها" },
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
      "companion-intake": "وضعیت شرح حال بیمار",
      "companion-map": "مسیر و مکان بیمار",
      "companion-records": "گزارش مجاز بیمار",
      "companion-links": "بیماران همراهی‌شده",
    },
    short: { dashboard: "پیگیری", "companion-intake": "شرح حال", "companion-map": "مسیر", "companion-records": "گزارش", "companion-links": "بیماران" },
  },
  reception: {
    home: "dashboard",
    groups: [
      { title: "نمای کلی", pages: ["dashboard"] },
      { title: "پذیرش و جریان", pages: ["admission", "flow", "queues", "alerts"] },
      { title: "بیماران", pages: ["patients", "records"] },
    ],
    mobile: ["dashboard", "admission", "flow", "queues", "alerts"],
    labels: {
      dashboard: "نمای امروز",
      admission: "پذیرش بیمار جدید",
      flow: "جریان زنده بیماران",
      queues: "مدیریت صف‌ها",
      alerts: "اعلان و فراخوان",
      patients: "فهرست بیماران",
      records: "پرونده بیمار",
    },
    short: { dashboard: "امروز", admission: "پذیرش", flow: "جریان", queues: "صف‌ها", alerts: "اعلان" },
  },
  specialist: {
    home: "dashboard",
    groups: [
      { title: "مطب من", pages: ["dashboard", "clinical", "clinical-notes", "clinical-complete"] },
      { title: "بیماران", pages: ["records"] },
    ],
    mobile: ["dashboard", "clinical", "clinical-notes", "clinical-complete", "records"],
    labels: {
      dashboard: "لیست انتظار مطب",
      clinical: "شرح حال و خلاصه",
      "clinical-notes": "معاینه و نسخه",
      "clinical-complete": "اتمام ویزیت",
      records: "پرونده بیمار",
    },
    short: { dashboard: "انتظار", clinical: "شرح حال", "clinical-notes": "نسخه", "clinical-complete": "اتمام", records: "پرونده" },
  },
  paraclinic: {
    home: "dashboard",
    groups: [
      { title: "بخش تشخیصی", pages: ["dashboard", "diagnostics-tracker", "diagnostics-upload"] },
      { title: "بیماران", pages: ["records"] },
    ],
    mobile: ["dashboard", "diagnostics-tracker", "diagnostics-upload", "records"],
    labels: {
      dashboard: "صف بخش تشخیصی",
      "diagnostics-tracker": "پیگیری نمونه و تست",
      "diagnostics-upload": "آپلود نتیجه",
      records: "پرونده بیمار",
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
      { title: "قراردادهای سازمانی", pages: ["contracts", "contract-packages", "contract-schedule", "contract-funnel"] },
      { title: "نمای کلی و جریان", pages: ["dashboard", "patients", "admission", "flow", "queues", "records"] },
      { title: "درمان و تشخیص", pages: ["clinical", "diagnostics", "alerts"] },
      { title: "پیکربندی کلینیک", pages: ["reports", "pathways", "rooms", "team"] },
    ],
    mobile: ["contracts", "contract-packages", "contract-funnel", "dashboard"],
    labels: {
      contracts: "افراد قرارداد و منابع ورود",
      "contract-packages": "بسته‌ها و کتابخانه قوانین",
      "contract-schedule": "نوبت‌دهی و فرمول سقفی",
      "contract-funnel": "قیف ثبت‌نام و پیامک گروهی",
      dashboard: "داشبورد کلینیک",
      patients: "بیماران حاضر",
      flow: "جریان زنده",
      queues: "مدیریت صف‌ها",
      admission: "پذیرش موردی",
      records: "پرونده بیمار",
      clinical: "ویزیت و نسخه",
      diagnostics: "خدمات تشخیصی",
      alerts: "اعلان‌ها",
      reports: "گزارش‌ها و KPI",
      pathways: "بسته‌ها و مسیرها",
      rooms: "طبقات و اتاق‌ها",
      team: "کادر و دسترسی‌ها",
    },
    short: { contracts: "افراد", "contract-packages": "بسته‌ها", "contract-schedule": "نوبت‌دهی", "contract-funnel": "قیف و پیامک", dashboard: "کلینیک" },
  },
};

/** Admin can open every module; other roles are limited to their own navigation. */
export function allowedPagesFor(role: WorkspaceRole): AppPage[] {
  if (role === "admin") return Object.keys(PAGE_TITLES) as AppPage[];
  return ROLE_NAV[role].groups.flatMap((group) => group.pages);
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
  { value: "self", label: "خود بیمار" },
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
  return value.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[۰-۹٠-٩]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(d) % 10)).replace(/[\u200c\u200e\u200f\u2066-\u2069]/g, "").toLowerCase();
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
  const rows = [["نام بیمار", "کد ملی", "تلفن", "بسته درمانی", "ایستگاه فعلی", "وضعیت"], ...patients.map((p) => [p.fullName, p.nationalId, p.phone, p.pathwayTitle, currentStation(p)?.roomName ?? "پایان مراجعه", patientStatus(p).label])];
  const csv = "\uFEFF" + rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "nabz-patients.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
