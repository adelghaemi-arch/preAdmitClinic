export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  boxImage?: string;
}

export interface SurgeryItem {
  id: string;
  type: string;
  approxDate: string;
  notes: string;
}

export interface FamilyHistoryItem {
  id: string;
  condition: string;
  relation: string;
}

export interface AllergyItem {
  id: string;
  substance: string;
  category: "دارویی" | "غذایی" | "محیطی";
  reaction: string;
  severity: "شدید" | "متوسط";
}

export interface PrescriptionItem {
  drug: string;
  dosage: string;
  instruction: string;
  duration: string;
}

export interface LabMetricItem {
  parameter: string;
  value: string;
  unit: string;
  normalRange: string;
  abnormal?: boolean;
}

export interface RecentConditionItem {
  id: string;
  title: string;
  when: string;
  notes: string;
}

export interface IntakeAnswers {
  currentSymptoms: string;
  lastMeal: string;
  smoking: string;
  breathlessness: string;
  chestPain: string;
  dentalBleeding: string;
  pregnancyStatus: string;
  medicationChanges: string;
  supplements: string;
  anticoagulantUse: string;
  fastingStatus: string;
  diabetesStatus: string;
}

export interface CompanionVisibility {
  journey: boolean;
  results: boolean;
  diagnoses: boolean;
  medications: boolean;
  allergies: boolean;
  familyHistory: boolean;
  reports: boolean;
}

export const defaultCompanionVisibility: CompanionVisibility = {
  journey: true,
  results: false,
  diagnoses: false,
  medications: false,
  allergies: false,
  familyHistory: false,
  reports: false,
};

export const emptyIntakeAnswers: IntakeAnswers = {
  currentSymptoms: "",
  lastMeal: "",
  smoking: "",
  breathlessness: "",
  chestPain: "",
  dentalBleeding: "",
  pregnancyStatus: "",
  medicationChanges: "",
  supplements: "",
  anticoagulantUse: "",
  fastingStatus: "",
  diabetesStatus: "",
};

export type WorkspaceRole =
  | "owner"
  | "patient"
  | "reception"
  | "specialist"
  | "paraclinic"
  | "supervisor"
  | "admin";

export type WorkspaceView = "overview" | WorkspaceRole;

export interface AppUserDto {
  id: number;
  username: string;
  fullName: string;
  jobTitle: string;
  primaryRole: string;
  medicalCouncilCode: string;
  canAccessAllRoles: boolean;
}

export type StationStatus =
  | "pending"
  | "waiting"
  | "checked_in"
  | "in_progress"
  | "sample_taken"
  | "completed";

export interface ClinicLocation {
  lat: number;
  lon: number;
  /** Persian display address shown to patients */
  address: string;
  city: string;
}

export interface RoomDto {
  id: number;
  code: string;
  name: string;
  category: string;
  floor: number;
  roomNumber: string;
  specialistName: string;
  specialtyTitle: string;
  prepInstructions: string;
  wayfindingSteps: string;
  mapX: number;
  mapY: number;
  avgServiceMinutes: number;
}

export interface PathwayDto {
  id: number;
  code: string;
  title: string;
  description: string;
  stationCodes: string[];
  estimatedTotalMinutes: number;
  isActive: boolean;
}

export interface StaffMemberDto {
  id: number;
  fullName: string;
  role: string;
  specialtyOrDept: string;
  roomCode: string | null;
  medicalCouncilCode: string;
  permissions: string[];
  isActive: boolean;
}

export interface VisitStationDto {
  id: number;
  patientId: number;
  roomCode: string;
  roomName: string;
  category: string;
  stepOrder: number;
  status: StationStatus;
  enteredQueueAt: string | null;
  checkedInAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  spentMinutes: number;
  addedByDoctor: string | null;
  queueRank: number;
  queueAhead: number;
  estimatedWaitMinutes: number;
}

export interface ClinicalNoteDto {
  id: number;
  patientId: number;
  stationId: number | null;
  roomCode: string;
  doctorName: string;
  specialty: string;
  chiefComplaint: string;
  examFindings: string;
  diagnosis: string;
  prescriptions: PrescriptionItem[];
  referralNote: string | null;
  createdAt: string;
}

export interface ParaclinicResultDto {
  id: number;
  patientId: number;
  stationId: number | null;
  roomCode: string;
  title: string;
  resultType: string;
  operatorName: string;
  summaryStatus: string;
  metrics: LabMetricItem[];
  interpretation: string;
  attachmentUrl: string | null;
  fileName: string | null;
  createdAt: string;
}

export interface PatientAlertDto {
  id: number;
  patientId: number;
  senderRole: string;
  alertType: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PatientFullDto {
  id: number;
  qrToken: string;
  fullName: string;
  nationalId: string;
  age: number;
  gender: string;
  phone: string;
  pathwayTitle: string;
  checkInTime: string;
  completedAt: string | null;
  intakeCompleted: boolean;
  medications: MedicationItem[];
  surgeries: SurgeryItem[];
  familyHistory: FamilyHistoryItem[];
  allergies: AllergyItem[];
  recentConditions: RecentConditionItem[];
  intakeAnswers: IntakeAnswers;
  autoOpenWayfinding: boolean;
  /** Patient's home coordinates used for OSM distance & travel-time estimation. */
  homeLat?: number | null;
  homeLon?: number | null;
  homeAddress?: string | null;
  stations: VisitStationDto[];
  clinicalNotes: ClinicalNoteDto[];
  paraclinicResults: ParaclinicResultDto[];
  alerts: PatientAlertDto[];
}

export interface CompanionLinkDto {
  id: number;
  userId: number;
  patientId: number;
  relationship: string;
  permission: string;
  visibility: CompanionVisibility;
}

/* ---------- corporate health contracts & pre-registration funnel ---------- */

/**
 * Pre-registration funnel status — strictly independent from appointment scheduling.
 * - not_sent: دعوت‌نامه پیامکی هنوز ارسال نشده
 * - sms_sent: پیامک لینک ارسال شده ولی هنوز لینک باز نشده
 * - link_opened: لینک را باز کرده ولی هنوز لاگین نکرده
 * - logged_in: لاگین کرده ولی هنوز فرم پروفایل را شروع/ذخیره نکرده
 * - abandoned: وسط تکمیل پروفایل رها کرده (دارای درصد پیشرفت و آخرین گام)
 * - completed: تکمیل کامل پروفایل و شرح حال اولیه
 */
export type OnboardingStage =
  | "not_sent"
  | "sms_sent"
  | "link_opened"
  | "logged_in"
  | "abandoned"
  | "completed";

/**
 * Appointment & call-up status — completely decoupled from pre-registration completion.
 * - unscheduled: هنوز نوبت‌دهی و فراخوان نشده
 * - pinned: دستی و قطعی برای یک تاریخ مشخص تعیین شده (مثلاً عادل امروز بیاید)
 * - auto_scheduled: به‌صورت اتوماتیک طبق فرمول سقف روزانه فراخوان و نوبت‌دهی شده
 * - checked_in: به کلینیک مراجعه کرده و وارد مسیر روزانه شده
 * - visit_done: کلیه ایستگاه‌های بسته سلامت وی تکمیل شده
 */
export type ContractAppointmentStatus =
  | "unscheduled"
  | "pinned"
  | "auto_scheduled"
  | "checked_in"
  | "visit_done";

/**
 * A reusable, system-wide rule stored in the central rule library.
 * Contracts attach copies of library rules (or create private ones) to bind
 * the right health package to each member based on age / gender / job category.
 */
export interface PackageLibraryRule {
  id: string;
  code: string;
  title: string;
  description: string;
  gender: "همه" | "مرد" | "زن";
  minAge: number | null;
  maxAge: number | null;
  jobCategory: string;
  pathwayCode: string;
  createdAt: string;
}

export interface ContractPackageRule {
  id: string;
  /** Set when this rule came from (or is linked to) the central library. */
  libraryRuleId?: string | null;
  title: string;
  gender: "همه" | "مرد" | "زن";
  minAge: number | null;
  maxAge: number | null;
  /** Optional department / job category filter (e.g., "عملیات", "مدیریت", "همه") */
  jobCategory: string;
  pathwayCode: string;
  priority: number;
}

export interface ContractDayQuota {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Human-readable Persian date label (e.g. «امروز — شنبه ۲۴ آبان ۱۴۰۴») */
  persianLabel: string;
  totalCap: number;
  genderFilter: "همه" | "مرد" | "زن";
  minAge: number | null;
  maxAge: number | null;
  /** Formula for auto-distributing remaining members into free slots */
  fillFormula: "age_desc" | "onboarded_first" | "roster_order" | "department_balanced";
  notes: string;
}

export interface ContractSupervisor {
  fullName: string;
  title: string;
  phone: string;
  nationalId: string;
  isActive: boolean;
  canSendReminders: boolean;
  assignedAt: string;
  lastSeenAt: string | null;
}

export interface ContractSmsLog {
  id: string;
  sentAt: string;
  senderName: string;
  campaignTitle: string;
  audienceLabel: string;
  messageTemplate: string;
  recipientCount: number;
  recipientPreview: string[];
}

export interface ContractMember {
  id: number;
  contractId: number;
  inviteToken: string;
  personnelCode: string;
  fullName: string;
  nationalId: string;
  phone: string;
  age: number;
  gender: "مرد" | "زن";
  department: string;
  jobCategory: string;
  source: "api" | "excel" | "manual";
  /** Bound health package based on contract demographic rules */
  assignedPathwayCode: string;
  assignedPathwayTitle: string;
  matchedRuleTitle: string;
  manualPackageOverride: boolean;
  /** Pre-registration funnel tracking (independent of appointment) */
  onboardingStage: OnboardingStage;
  profileProgressPct: number;
  abandonedAtStep: string | null;
  smsInviteCount: number;
  lastSmsAt: string | null;
  linkOpenedAt: string | null;
  loggedInAt: string | null;
  lastActivityAt: string | null;
  profileCompletedAt: string | null;
  /** Saved profile draft/data from onboarding link */
  draftSymptoms: string;
  draftAllergies: string;
  draftMedications: string;
  /** Appointment scheduling (independent of onboarding) */
  appointmentStatus: ContractAppointmentStatus;
  scheduledDate: string | null;
  scheduledLabel: string | null;
  callSentAt: string | null;
  linkedPatientId: number | null;
}

export interface CorporateContract {
  id: number;
  code: string;
  title: string;
  organizationName: string;
  status: "active" | "draft" | "completed";
  startDate: string;
  endDate: string;
  /** External HR/Insurance API endpoint + key configured by clinic admin */
  apiEndpoint: string;
  apiKey: string;
  lastApiSyncAt: string | null;
  defaultPathwayCode: string;
  packageRules: ContractPackageRule[];
  dayQuotas: ContractDayQuota[];
  supervisor: ContractSupervisor;
  smsLogs: ContractSmsLog[];
  members: ContractMember[];
  createdAt: string;
}

export interface ClinicSnapshot {
  clinicLocation: ClinicLocation;
  packageRuleLibrary: PackageLibraryRule[];
  rooms: RoomDto[];
  links: CompanionLinkDto[];
  pathways: PathwayDto[];
  staff: StaffMemberDto[];
  patients: PatientFullDto[];
  contracts: CorporateContract[];
  serverTime: string;
}

/* ---------- mock store row shapes (date fields stay ISO strings) ---------- */
export interface MockUserRow {
  id: number;
  username: string;
  fullName: string;
  jobTitle: string;
  primaryRole: string;
  medicalCouncilCode: string;
  canAccessAllRoles: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface MockRoomRow {
  id: number;
  code: string;
  name: string;
  category: string;
  floor: number;
  roomNumber: string;
  specialistName: string;
  specialtyTitle: string;
  prepInstructions: string;
  wayfindingSteps: string;
  mapX: number;
  mapY: number;
  avgServiceMinutes: number;
}

export interface MockPathwayRow {
  id: number;
  code: string;
  title: string;
  description: string;
  stationCodes: string[];
  estimatedTotalMinutes: number;
  isActive: boolean;
}

export interface MockStaffRow {
  id: number;
  fullName: string;
  role: string;
  specialtyOrDept: string;
  roomCode: string | null;
  medicalCouncilCode: string;
  permissions: string[];
  isActive: boolean;
}

export interface MockPatientRow {
  id: number;
  qrToken: string;
  fullName: string;
  nationalId: string;
  age: number;
  gender: string;
  phone: string;
  pathwayTitle: string;
  checkInTime: string;
  completedAt: string | null;
  intakeCompleted: boolean;
  medications: MedicationItem[];
  surgeries: SurgeryItem[];
  familyHistory: FamilyHistoryItem[];
  allergies: AllergyItem[];
  recentConditions: RecentConditionItem[];
  intakeAnswers: IntakeAnswers;
  autoOpenWayfinding: boolean;
  homeLat?: number | null;
  homeLon?: number | null;
  homeAddress?: string | null;
}

export interface MockStationRow {
  id: number;
  patientId: number;
  roomCode: string;
  roomName: string;
  category: string;
  stepOrder: number;
  status: StationStatus;
  enteredQueueAt: string | null;
  checkedInAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  spentMinutes: number;
  addedByDoctor: string | null;
  queueRank: number;
}

export interface MockNoteRow {
  id: number;
  patientId: number;
  stationId: number | null;
  roomCode: string;
  doctorName: string;
  specialty: string;
  chiefComplaint: string;
  examFindings: string;
  diagnosis: string;
  prescriptions: PrescriptionItem[];
  referralNote: string | null;
  createdAt: string;
}

export interface MockResultRow {
  id: number;
  patientId: number;
  stationId: number | null;
  roomCode: string;
  title: string;
  resultType: string;
  operatorName: string;
  summaryStatus: string;
  metrics: LabMetricItem[];
  interpretation: string;
  attachmentUrl: string | null;
  fileName: string | null;
  createdAt: string;
}

export interface MockLinkRow {
  id: number;
  userId: number;
  patientId: number;
  relationship: string;
  permission: string;
  visibility: CompanionVisibility;
  createdAt: string;
}

export interface MockAlertRow {
  id: number;
  patientId: number;
  senderRole: string;
  alertType: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
