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

/** @deprecated Legacy flat intake — kept only for older mock rows during migration. */
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

/** Prior medical documents uploaded during pre-admit (patient-supplied). */
export type IntakeDocumentType =
  | "lab_blood"
  | "lab_urine"
  | "pathology"
  | "ecg"
  | "echo"
  | "ultrasound"
  | "xray"
  | "ct"
  | "mri"
  | "mammography"
  | "endoscopy"
  | "other";

export interface PatientIntakeDocumentFile {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  /** Exam/report date for this file — exact or approximate free text; optional. */
  documentDate?: string | null;
}

/** One type entry (duplicate types allowed) with optional date and up to 20 files. */
export interface PatientIntakeDocumentGroup {
  id: string;
  documentType: IntakeDocumentType;
  typeLabelFa: string;
  note?: string | null;
  /** Exam/report date — exact or approximate free text; optional. */
  documentDate?: string | null;
  files: PatientIntakeDocumentFile[];
  uploadedAt: string;
}

/** @deprecated Prefer PatientIntakeDocumentGroup */
export type PatientIntakeDocument = PatientIntakeDocumentGroup;

/* ---------- configurable pre-admit forms (docs-driven) ---------- */

export type FormInputType =
  | "yn_unk"
  | "text"
  | "number"
  | "date"
  | "select"
  | "signature"
  | "province_city"
  | "residence_address";
export type FormNotesPolicy = "never" | "optional" | "required_if_yes";
export type FormPublishStatus = "draft" | "published" | "archived";
export type FormResponseStatus = "draft" | "submitted";
export type FormConceptKind =
  | "demographics"
  | "symptom"
  | "history"
  | "family"
  | "lifestyle"
  | "screening"
  | "behavior";

export type FormAnswerValue = "yes" | "no" | "unknown" | null;

export interface FormVisibilityRule {
  field: "maritalStatus" | "age" | "gender";
  op: "eq" | "in" | "gte" | "lte";
  value: string | number | string[];
}

export interface FormItemCoding {
  snomed: string[];
  loinc: string[];
  icd10: string[];
  /** UMLS Concept Unique Identifiers (e.g. C0027051) */
  umls: string[];
  conceptKind: FormConceptKind;
  aiTags: string[];
  redFlagOnYes?: boolean;
}

export interface FormTargetAudience {
  gender: "مرد" | "زن" | "همه";
  ageMin: number | null;
  ageMax: number | null;
  maritalStatuses: string[];
}

export interface FormItemDefinition {
  id: string;
  sectionId: string;
  code: string;
  labelFa: string;
  inputType: FormInputType;
  required: boolean;
  sortOrder: number;
  visibilityRules: FormVisibilityRule[];
  helpText: string;
  notesPolicy: FormNotesPolicy;
  prefillFromPatient?: string | null;
  readOnlyIfPrefill?: boolean;
  selectOptions?: string[] | null;
  coding: FormItemCoding;
}

export interface FormSectionDefinition {
  id: string;
  formId: string;
  code: string;
  title: string;
  sortOrder: number;
  timeWindowHint: string;
  guideText: string;
}

export interface FormDefinition {
  id: string;
  code: string;
  title: string;
  version: number;
  status: FormPublishStatus;
  sortOrder: number;
  warningText: string;
  targetAudience: FormTargetAudience;
  sections: FormSectionDefinition[];
  items: FormItemDefinition[];
}

export interface FormAnswer {
  itemCode: string;
  valueCode: FormAnswerValue;
  valueRaw: string;
  notes: string;
  skippedByRule?: boolean;
}

export interface FormResponse {
  id: string;
  patientId: number;
  formId: string;
  formCode: string;
  formVersion: number;
  formVersionId: string;
  status: FormResponseStatus;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  answers: FormAnswer[];
  context: {
    gender: string;
    age: number;
    maritalStatus: string;
  };
}

export interface CompanionVisibility {
  journey: boolean;
  results: boolean;
  diagnoses: boolean;
  medications: boolean;
  allergies: boolean;
  familyHistory: boolean;
  reports: boolean;
  /** When false/undefined, companions cannot see submitted questionnaire answers. */
  clinicalIntake?: boolean;
}

export const defaultCompanionVisibility: CompanionVisibility = {
  journey: true,
  results: false,
  diagnoses: false,
  medications: false,
  allergies: false,
  familyHistory: false,
  reports: false,
  clinicalIntake: false,
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
  | "admin"
  | "platform";

/* ---------- platform admin (multi-clinic control plane, mock) ---------- */

export type PlatformClinicStatus = "active" | "suspended" | "onboarding";

export interface PlatformClinic {
  id: string;
  name: string;
  city: string;
  status: PlatformClinicStatus;
  plan: string;
  adminContact: string;
  adminPhone: string;
  /** تلفن پشتیبانی پیش‌پذیرش — پیام خطای ورود شماره ثبت‌نشده */
  preAdmitSupportPhone?: string;
  /** سامانه پیامک: None | Kavenegar | Touba */
  smsProvider?: string;
  smsSenderNumber?: string;
  kavenegarApiKey?: string;
  kavenegarApiKeySet?: boolean;
  kavenegarOtpTemplate?: string;
  toubaUsername?: string;
  toubaPassword?: string;
  toubaPasswordSet?: boolean;
  toubaSendUrl?: string;
  toubaOtpMessageTemplate?: string;
  patientsToday: number;
  staffCount: number;
  contractsCount: number;
  createdAt: string;
  /** True when this row maps to the live local clinic dataset. */
  isCurrentTenant: boolean;
}

export interface GpsPoint {
  lat: number;
  lon: number;
  accuracy: number;
  capturedAt: string;
  source: "camera_session" | "checkin" | "manual" | "seed" | "map_open" | "distance_btn" | "watch";
  /** Evidence package this point belongs to (session / burst / day). */
  packageId?: string | null;
}

export type UserPhotoKind = "portrait" | "fraud_auto" | "fraud_confirm";

export interface UserPhotoRecord {
  id: string;
  patientId: number;
  userId: number | null;
  kind: UserPhotoKind;
  /** blob/data URL — فقط بعد از لود تنبل یا ثبت محلی پر می‌شود */
  dataUrl: string;
  /** کلید ذخیره‌سازی سرور؛ تامنیل فقط وقتی UI واقعاً نشان می‌دهد دانلود می‌شود */
  storageKey?: string | null;
  capturedAt: string;
  sessionId: string | null;
  gps: GpsPoint | null;
  /** Evidence package this photo belongs to (session / burst / day). */
  packageId?: string | null;
}

export type EvidencePackageKind = "camera_session" | "burst" | "day";

/** Time-bounded bundle of photos + GPS for platform review. */
export interface EvidencePackage {
  id: string;
  patientId: number;
  userId: number | null;
  kind: EvidencePackageKind;
  startedAt: string;
  endedAt: string;
  sessionId: string | null;
  label: string;
  /** Calendar day key in Asia/Tehran, e.g. 2026-11-18 */
  dayKey: string;
}

export type FraudReviewStatus = "pending" | "cleared" | "flagged";

export interface FraudCaptureSession {
  id: string;
  patientId: number;
  userId: number | null;
  startedAt: string;
  endedAt: string | null;
  reviewStatus: FraudReviewStatus;
  reviewNote: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  /** Linked evidence package for this camera session. */
  packageId?: string | null;
  /** Guid پرونده روی سرور — برای لینک GPS/کاربر بدون hash. */
  patientServerId?: string | null;
  /** Guid کاربر ثبت‌کننده نشست. */
  userServerId?: string | null;
  /** نام Person برای نمایش در پنل پلتفرم. */
  patientDisplayName?: string | null;
  patientNationalId?: string | null;
}

export type AuthAppSurface = "clinic_web" | "patient_kiosk";

/** Browser OTP login session tracked for self-service revoke and multi-session fraud watch. */
export interface AuthSession {
  id: string;
  userId: number;
  username: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
  deviceLabel: string;
  system: string;
  browser: string;
  appSurface: AuthAppSurface;
  ipHint: string;
}

/** Raised when one account holds 2+ concurrent active auth sessions. */
export interface MultiSessionAlert {
  id: string;
  userId: number;
  activeSessionCount: number;
  openedAt: string;
  reviewStatus: FraudReviewStatus;
  reviewNote: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export type PlatformUserPrimaryRole =
  | "platform"
  | "clinic_admin"
  | "staff"
  | "patient"
  | "supervisor";

/** قرارداد مرتبط با کاربر در فهرست ادمین (عضو یا ناظر). */
export interface PlatformUserContractLink {
  contractId: string;
  title: string;
  relation: "member" | "supervisor" | string;
  /** Active | Draft | Completed — از API */
  status?: string;
}

export interface PlatformUserProfile {
  id: string;
  userId: number | null;
  patientId: number | null;
  /** Guid پرونده Owner روی سرور (OwnerUserId). */
  linkedPatientId?: string | null;
  fullName: string;
  phone: string;
  nationalId: string;
  email: string;
  clinicId: string;
  roleLabel: string;
  primaryRole: PlatformUserPrimaryRole;
  notes: string;
  createdAt: string;
  lastLoginAt: string | null;
  /** Platform avatar; auto-filled from record portrait only when empty. */
  profilePhotoDataUrl: string | null;
  lastGps: GpsPoint | null;
  gpsHistory: GpsPoint[];
  isActive: boolean;
  /** قراردادهای مرتبط از API (عضویت کدملی یا نقش ناظر). */
  contracts?: PlatformUserContractLink[];
  /** هنگام ایجاد/ویرایش ناظر — شناسه قرارداد انتخابی برای ارسال به API. */
  assignedContractId?: string | null;
}

export interface PlatformHealthMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  status: "ok" | "warn" | "critical";
  sparkline: number[];
}

export interface PlatformIntegration {
  id: string;
  name: string;
  kind: "hr_api" | "sms" | "otp" | "maps" | "storage";
  endpoint: string;
  apiKeyMasked: string;
  status: "connected" | "degraded" | "offline";
  lastSyncAt: string | null;
  notes: string;
}

/** Local self-hosted OSM stack (Nominatim / OSRM / tiles) configured by platform admin. */
export interface OsmLocalSettings {
  /** Root URL without trailing slash; empty means public OSM only. */
  baseUrl: string;
  /** True only after a successful Nominatim probe against baseUrl. */
  active: boolean;
  nominatimOk: boolean;
  osrmOk: boolean;
  tileOk: boolean;
  lastTestedAt: string | null;
  lastError: string | null;
}

export interface PlatformSettings {
  brandName: string;
  supportPhone: string;
  otpLength: number;
  otpTtlSeconds: number;
  smsSenderId: string;
  fraudAutoCaptureSeconds: number;
  maxPortraitDataUrlChars: number;
  maxFraudFrameDataUrlChars: number;
  featureFlags: {
    fraudWatch: boolean;
    gpsTracking: boolean;
    multiClinicRegistry: boolean;
    corporateContracts: boolean;
    multiSessionWatch: boolean;
  };
  osmLocal: OsmLocalSettings;
}

export interface PlatformAuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export interface PlatformState {
  clinics: PlatformClinic[];
  users: PlatformUserProfile[];
  photos: UserPhotoRecord[];
  packages: EvidencePackage[];
  fraudSessions: FraudCaptureSession[];
  authSessions: AuthSession[];
  multiSessionAlerts: MultiSessionAlert[];
  health: PlatformHealthMetric[];
  integrations: PlatformIntegration[];
  settings: PlatformSettings;
  audit: PlatformAuditEntry[];
}

export type WorkspaceView = "overview" | WorkspaceRole;

export interface AppUserDto {
  id: number;
  /** شناسه Guid کاربر در Nabz.Api */
  serverId?: string;
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
  /** Linked login account in appUsers; null when roster-only. */
  appUserId: number | null;
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
  /** شناسه Guid سرور برای API (وقتی از بک پر شود) */
  serverId?: string;
  qrToken: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  /** نام پدر — اختیاری */
  fatherName?: string | null;
  nationalId: string;
  age: number;
  /** ISO yyyy-MM-dd از سرور */
  birthDate?: string | null;
  gender: string;
  maritalStatus?: string | null;
  phone: string;
  pathwayTitle: string;
  /** تاریخ مراجعه برنامه‌ای از عضو قرارداد — بنر پیش‌پذیرش */
  scheduledVisitDate?: string | null;
  /** needs_form | already_complete از snapshot Owner */
  intakeGate?: "needs_form" | "already_complete" | null;
  hasPortrait?: boolean;
  portraitStorageKey?: string | null;
  /** introduced | not_introduced | mobile_mismatch */
  hospitalIntroStatus?: "introduced" | "not_introduced" | "mobile_mismatch" | null;
  hospitalName?: string | null;
  introducedMobileMasked?: string | null;
  /** هویت/دموگرافیک حداقل از سرور */
  profileComplete?: boolean;
  checkInTime: string;
  completedAt: string | null;
  intakeCompleted: boolean;
  medications: MedicationItem[];
  surgeries: SurgeryItem[];
  familyHistory: FamilyHistoryItem[];
  allergies: AllergyItem[];
  recentConditions: RecentConditionItem[];
  /** @deprecated Prefer formResponses */
  intakeAnswers: IntakeAnswers;
  formResponses: FormResponse[];
  autoOpenWayfinding: boolean;
  /** True after the patient dismisses the first-login 6-step journey intro for this visit. */
  journeyIntroSeen: boolean;
  /** Patient's home coordinates used for OSM distance & travel-time estimation. */
  homeLat?: number | null;
  homeLon?: number | null;
  homeAddress?: string | null;
  homePlaque?: string | null;
  homeUnit?: string | null;
  homePostalCode?: string | null;
  /** Pre-admit portrait as a compressed JPEG data URL. */
  photoDataUrl?: string | null;
  /** Patient-supplied prior labs/imaging uploaded during pre-admit (grouped by type entry). */
  intakeDocuments?: PatientIntakeDocumentGroup[];
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
 * - completed: تکمیل کامل پروفایل و پرسشنامه پیش‌پذیرش
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
 * - visit_done: کلیه ایستگاه‌های مسیر سلامتی وی تکمیل شده
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
export interface PathwayLibraryRule {
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
  /** اعضا match‌شده و هنوز Completed نشده‌اند */
  activeMatchedCount?: number;
  /** اعضا با OnboardingStage=Completed که به این مسیر match شده‌اند */
  previouslyUsedCount?: number;
  /** تعداد قراردادهایی که این مسیر را attach کرده‌اند */
  attachedContractCount?: number;
}

export interface ContractPathwayRule {
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
  /** شناسه Guid سرور برای فراخوانی API */
  serverId?: string;
  contractId: number;
  inviteToken: string;
  personnelCode: string;
  firstName: string;
  lastName: string;
  fatherName?: string | null;
  /** نمایش یکپارچه — از first+last */
  fullName: string;
  nationalId: string;
  phone: string;
  /** ISO yyyy-MM-dd میلادی */
  birthDate: string | null;
  /** تاریخ مراجعه از رستر/اکسل (ISO) — جدا از نوبت‌دهی mock */
  scheduledVisitDate?: string | null;
  /** سن محاسبه‌شده برای نمایش/قوانین */
  age: number;
  gender: "مرد" | "زن";
  maritalStatus?: string | null;
  department: string;
  jobCategory: string;
  source: "api" | "excel" | "manual";
  /** Bound health package based on contract demographic rules */
  assignedPathwayCode: string;
  assignedPathwayTitle: string;
  matchedPathwayTitle: string;
  manualPathwayOverride: boolean;
  /** Pre-registration funnel tracking (independent of appointment) */
  onboardingStage: OnboardingStage;
  profileProgressPct: number;
  abandonedAtStep: string | null;
  /** وضعیت پرسشنامه پیش‌پذیرش روی رستر — از FormResponse همگام می‌شود */
  formStatus: "none" | "draft" | "submitted";
  intakeCompleted: boolean;
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
  /** شناسه Guid سرور برای فراخوانی API */
  serverId?: string;
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
  pathwayRules: ContractPathwayRule[];
  dayQuotas: ContractDayQuota[];
  supervisor: ContractSupervisor;
  smsLogs: ContractSmsLog[];
  members: ContractMember[];
  /** تعداد اعضا از API لیست — بدون لود کامل members */
  memberCount?: number;
  createdAt: string;
}

export interface ClinicSnapshot {
  clinicLocation: ClinicLocation;
  pathwayLibrary: PathwayLibraryRule[];
  rooms: RoomDto[];
  links: CompanionLinkDto[];
  pathways: PathwayDto[];
  staff: StaffMemberDto[];
  patients: PatientFullDto[];
  contracts: CorporateContract[];
  forms: FormDefinition[];
  platform: PlatformState;
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
  appUserId?: number | null;
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
  formResponses?: FormResponse[];
  autoOpenWayfinding: boolean;
  journeyIntroSeen: boolean;
  homeLat?: number | null;
  homeLon?: number | null;
  homeAddress?: string | null;
  homePlaque?: string | null;
  homeUnit?: string | null;
  homePostalCode?: string | null;
  /** Pre-admit portrait as a compressed JPEG data URL. */
  photoDataUrl?: string | null;
  /** Patient-supplied prior labs/imaging uploaded during pre-admit (grouped by type entry). */
  intakeDocuments?: PatientIntakeDocumentGroup[];
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
