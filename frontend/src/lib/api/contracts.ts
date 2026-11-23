/*
 File: frontend/src/lib/api/contracts.ts
 Description: نگاشت قرارداد/اعضا از Nabz.Api (قیف + formStatus + submitted-form PDF)
 Parent Dependencies: api/http, api/roles, mock-contracts, types/clinic
 */

import { ApiError, apiFetch, getApiBaseUrl, readApiToken } from "@/lib/api/http";
import { guidToNumericId } from "@/lib/api/roles";
import { DEFAULT_PATHWAY_CODE, resolveHealthPathwayTitle } from "@/lib/health-pathway-titles";
import { formatPersianDateLabel } from "@/lib/mock-contracts";
import { ageFromBirthIso, displayFullName } from "@/lib/person-identity";
import type { ContractMember, ContractPathwayRule, CorporateContract } from "@/types/clinic";

export interface ApiContractPathwayRuleDto {
  id: string;
  libraryPathwayId?: string | null;
  title: string;
  gender: string;
  minAge?: number | null;
  maxAge?: number | null;
  jobCategory: string;
  pathwayCode: string;
  priority: number;
}

export interface ApiContractDto {
  id: string;
  code: string;
  title: string;
  organizationName: string;
  status: string;
  supervisorPhone?: string | null;
  supervisorName?: string | null;
  memberCount: number;
  defaultPathwayCode?: string | null;
  pathwayRules?: ApiContractPathwayRuleDto[];
  partnerLogoStorageKey?: string | null;
}

export interface ApiContractMemberDto {
  id: string;
  contractId: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  nationalId: string;
  phone: string;
  birthDate?: string | null;
  age?: number | null;
  gender?: string | null;
  maritalStatus?: string | null;
  department?: string | null;
  jobCategory?: string | null;
  personnelCode?: string | null;
  onboardingStage: string;
  assignedPathwayCode?: string | null;
  assignedPathwayTitle?: string | null;
  matchedPathwayTitle?: string | null;
  manualPathwayOverride?: boolean;
  linkedPatientId?: string | null;
  inviteToken: string;
  smsInviteCount?: number;
  lastSmsAt?: string | null;
  profileProgressPct?: number;
  abandonedAtStep?: string | null;
  profileCompletedAt?: string | null;
  formStatus?: string | null;
  intakeCompleted?: boolean;
  fatherName?: string | null;
  scheduledVisitDate?: string | null;
}

export interface ApiContractFunnelStatsDto {
  contractId: string;
  memberCount: number;
  notSent: number;
  smsSent: number;
  linkOpened: number;
  loggedIn: number;
  abandoned: number;
  completed: number;
  linkedPatients: number;
  formDraft: number;
  formSubmitted: number;
}

function mapOnboarding(stage: string): ContractMember["onboardingStage"] {
  const s = stage.toLowerCase();
  if (s === "smssent" || s === "sms_sent") return "sms_sent";
  if (s === "linkopened" || s === "link_opened") return "link_opened";
  if (s === "loggedin" || s === "logged_in") return "logged_in";
  if (s === "abandoned") return "abandoned";
  if (s === "completed") return "completed";
  return "not_sent";
}

function mapFormStatus(raw: string | null | undefined): ContractMember["formStatus"] {
  const s = (raw ?? "").toLowerCase();
  if (s === "submitted") return "submitted";
  if (s === "draft") return "draft";
  return "none";
}

function emptySupervisor(name?: string | null, phone?: string | null): CorporateContract["supervisor"] {
  const fullName = (name ?? "").trim();
  const phoneDigits = (phone ?? "").trim();
  return {
    fullName: fullName || "ناظر تعریف‌نشده",
    title: "",
    phone: phoneDigits,
    nationalId: "",
    isActive: Boolean(fullName && phoneDigits),
    canSendReminders: true,
    assignedAt: new Date().toISOString(),
    lastSeenAt: null,
  };
}

/** عنوان فارسی مسیر سلامتی؛ کد انگلیسی خام در UI نشان داده نمی‌شود. */
export function resolvePathwayDisplayTitle(code?: string | null, title?: string | null): string {
  return resolveHealthPathwayTitle(code, title);
}

export function mapApiMember(m: ApiContractMemberDto, contractNumericId: number): ContractMember {
  const firstName = (m.firstName ?? "").trim() || (m.fullName ?? "").trim().split(/\s+/)[0] || "";
  const lastName =
    (m.lastName ?? "").trim() ||
    (m.fullName ?? "").trim().split(/\s+/).slice(1).join(" ") ||
    "";
  const birthDate = m.birthDate ? String(m.birthDate).slice(0, 10) : null;
  const age = m.age ?? ageFromBirthIso(birthDate) ?? 0;
  const gender: "مرد" | "زن" = m.gender === "زن" ? "زن" : "مرد";
  const pathwayCode = m.assignedPathwayCode ?? "";
  // تاریخ مراجعه اکسل/رستر → نوبت دستی در تب نوبت‌دهی (قبلاً فقط در scheduledVisitDate می‌ماند)
  const visitIso = m.scheduledVisitDate ? String(m.scheduledVisitDate).slice(0, 10) : null;
  const hasVisit = Boolean(visitIso && /^\d{4}-\d{2}-\d{2}$/.test(visitIso));
  return {
    id: guidToNumericId(m.id),
    serverId: m.id,
    contractId: contractNumericId,
    inviteToken: m.inviteToken || "",
    personnelCode: m.personnelCode ?? "",
    firstName,
    lastName,
    fatherName: m.fatherName ?? null,
    fullName: m.fullName || displayFullName(firstName, lastName),
    nationalId: m.nationalId,
    phone: m.phone,
    birthDate,
    scheduledVisitDate: visitIso,
    age,
    gender,
    maritalStatus: m.maritalStatus ?? null,
    department: m.department ?? "",
    jobCategory: m.jobCategory ?? "",
    source: "api",
    assignedPathwayCode: pathwayCode,
    assignedPathwayTitle: resolvePathwayDisplayTitle(pathwayCode, m.assignedPathwayTitle),
    matchedPathwayTitle: m.matchedPathwayTitle ?? "",
    manualPathwayOverride: Boolean(m.manualPathwayOverride),
    onboardingStage: mapOnboarding(m.onboardingStage),
    profileProgressPct: Number(m.profileProgressPct ?? 0),
    abandonedAtStep: m.abandonedAtStep != null ? String(m.abandonedAtStep) : null,
    formStatus: mapFormStatus(m.formStatus),
    intakeCompleted: Boolean(m.intakeCompleted) || mapFormStatus(m.formStatus) === "submitted",
    smsInviteCount: Number(m.smsInviteCount ?? 0),
    lastSmsAt: m.lastSmsAt ? String(m.lastSmsAt) : null,
    linkOpenedAt: null,
    loggedInAt: null,
    lastActivityAt: null,
    profileCompletedAt: m.profileCompletedAt ? String(m.profileCompletedAt) : null,
    draftSymptoms: "",
    draftAllergies: "",
    draftMedications: "",
    appointmentStatus: hasVisit ? "pinned" : "unscheduled",
    scheduledDate: hasVisit ? visitIso : null,
    scheduledLabel: hasVisit && visitIso ? formatPersianDateLabel(visitIso) : null,
    callSentAt: null,
    linkedPatientId: m.linkedPatientId ? guidToNumericId(m.linkedPatientId) : null,
    linkedPatientServerId: m.linkedPatientId ? String(m.linkedPatientId) : null,
  };
}

export function mapApiContract(c: ApiContractDto, members: ApiContractMemberDto[] = []): CorporateContract {
  const id = guidToNumericId(c.id);
  const statusRaw = (c.status ?? "active").toLowerCase();
  const status: CorporateContract["status"] =
    statusRaw === "draft"
      ? "draft"
      : statusRaw === "completed"
        ? "completed"
        : statusRaw === "inactive"
          ? "inactive"
          : "active";
  return {
    id,
    serverId: c.id,
    code: c.code,
    title: c.title,
    organizationName: c.organizationName,
    partnerLogoStorageKey: c.partnerLogoStorageKey ?? null,
    status,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    apiEndpoint: "",
    apiKey: "",
    lastApiSyncAt: null,
    defaultPathwayCode: (c.defaultPathwayCode ?? "").trim() || DEFAULT_PATHWAY_CODE,
    pathwayRules: (c.pathwayRules ?? []).map(
      (r, idx): ContractPathwayRule => ({
        id: r.id || `api-rule-${c.id}-${idx}`,
        libraryPathwayId: r.libraryPathwayId ?? null,
        title: r.title,
        gender: r.gender === "زن" || r.gender === "مرد" ? r.gender : "همه",
        minAge: r.minAge ?? null,
        maxAge: r.maxAge ?? null,
        jobCategory: r.jobCategory || "همه",
        pathwayCode: r.pathwayCode,
        priority: r.priority ?? idx + 1,
      })
    ),
    dayQuotas: [],
    supervisor: emptySupervisor(c.supervisorName, c.supervisorPhone),
    smsLogs: [],
    members: members.map((m) => mapApiMember(m, id)),
    memberCount: c.memberCount ?? members.length,
    createdAt: new Date().toISOString(),
  };
}

export interface PagedMembersResult {
  items: ContractMember[];
  page: number;
  pageSize: number;
  totalCount: number;
}

interface ApiPagedMembersDto {
  items: ApiContractMemberDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/** فقط متادیتای قراردادها — بدون N+1 اعضا (اعضا جدا و صفحه‌ای لود می‌شوند) */
export async function fetchClinicContracts(clinicId: string): Promise<CorporateContract[]> {
  const list = await apiFetch<ApiContractDto[]>(`/api/contracts?clinicId=${encodeURIComponent(clinicId)}`);
  return list.map((c) => mapApiContract(c, []));
}

export async function fetchContractMembersPaged(
  contractServerId: string,
  page = 1,
  pageSize = 20,
  q?: string
): Promise<PagedMembersResult> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (q?.trim()) params.set("q", q.trim());
  const dto = await apiFetch<ApiPagedMembersDto>(
    `/api/contracts/${encodeURIComponent(contractServerId)}/members?${params}`
  );
  const numericId = guidToNumericId(contractServerId);
  return {
    items: (dto.items ?? []).map((m) => mapApiMember(m, numericId)),
    page: dto.page,
    pageSize: dto.pageSize,
    totalCount: dto.totalCount,
  };
}

/** فقط برای SMS گروهی / آمار محلی یک قرارداد انتخاب‌شده — نه در bootstrap همهٔ قراردادها */
export async function fetchContractMembersAll(contractServerId: string): Promise<ContractMember[]> {
  const list = await apiFetch<ApiContractMemberDto[]>(
    `/api/contracts/${encodeURIComponent(contractServerId)}/members?all=true`
  );
  const numericId = guidToNumericId(contractServerId);
  return list.map((m) => mapApiMember(m, numericId));
}

/** UC-ADM-26 — پاسخ submitted پرسشنامه عضو برای PDF قیف. */
export interface ApiMemberSubmittedFormDto {
  memberId: string;
  contractId: string;
  patientId: string;
  formId: string;
  formCode: string;
  formTitle: string;
  submittedAt?: string | null;
  fullName: string;
  nationalId: string;
  age?: number | null;
  gender?: string | null;
  organizationName: string;
  answers: Array<{
    itemCode: string;
    valueCode?: string | null;
    valueRaw?: string | null;
    notes?: string | null;
    skippedByRule?: boolean;
  }>;
}

export async function fetchMemberSubmittedForm(
  contractServerId: string,
  memberServerId: string
): Promise<ApiMemberSubmittedFormDto> {
  return apiFetch<ApiMemberSubmittedFormDto>(
    `/api/contracts/${encodeURIComponent(contractServerId)}/members/${encodeURIComponent(memberServerId)}/submitted-form`
  );
}

/** UC-ADM-26 — دانلود PDF واقعی از Chromium سرور. */
export async function downloadMemberIntakePdf(
  contractServerId: string,
  memberServerId: string
): Promise<void> {
  const headers = new Headers();
  const token = readApiToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(
    `${getApiBaseUrl()}/api/contracts/${encodeURIComponent(contractServerId)}/members/${encodeURIComponent(memberServerId)}/intake-pdf`,
    { method: "GET", headers }
  );
  if (!res.ok) {
    let msg = `خطای سرور (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = String(body.error);
    } catch {
      /* پاسخ باینری یا خالی */
    }
    throw new ApiError(msg, res.status);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  const fileName = match
    ? decodeURIComponent(match[1].replace(/"/g, "").trim())
    : `intake-${memberServerId}.pdf`;
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** UC-ADM-22 — آپلود لوگوی سازمان/بانک قرارداد. */
export async function uploadContractPartnerLogo(
  contractServerId: string,
  file: File
): Promise<{ partnerLogoStorageKey: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch<{ ok: boolean; partnerLogoStorageKey: string }>(
    `/api/contracts/${encodeURIComponent(contractServerId)}/partner-logo`,
    { method: "POST", body: form }
  );
  return { partnerLogoStorageKey: res.partnerLogoStorageKey };
}
