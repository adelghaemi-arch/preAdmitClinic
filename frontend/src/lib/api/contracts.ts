/*
 File: frontend/src/lib/api/contracts.ts
 Description: نگاشت قرارداد/اعضا از Nabz.Api به shape فرانت (شامل SmsInviteCount/LastSmsAt)
 Parent Dependencies: api/http, api/roles, types/clinic
 */

import { apiFetch } from "@/lib/api/http";
import { guidToNumericId } from "@/lib/api/roles";
import { ageFromBirthIso, displayFullName } from "@/lib/person-identity";
import type { ContractMember, ContractPackageRule, CorporateContract } from "@/types/clinic";

export interface ApiContractPackageRuleDto {
  id: string;
  libraryRuleId?: string | null;
  title: string;
  gender: string;
  minAge?: number | null;
  maxAge?: number | null;
  jobCategory: string;
  packageCode: string;
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
  defaultPackageCode?: string | null;
  packageRules?: ApiContractPackageRuleDto[];
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
  assignedPackageCode?: string | null;
  assignedPackageTitle?: string | null;
  matchedRuleTitle?: string | null;
  linkedPatientId?: string | null;
  inviteToken: string;
  smsInviteCount?: number;
  lastSmsAt?: string | null;
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

/** عنوان فارسی بسته؛ اگر سرور کد انگلیسی برگرداند (مثل FULL_CHECKUP) جایگزین می‌شود. */
export function resolvePackageDisplayTitle(code?: string | null, title?: string | null): string {
  const c = (code ?? "").trim();
  const t = (title ?? "").trim();
  if (t && t !== c) return t;
  if (!c || c === "FULL_CHECKUP") return "چکاپ جامع";
  return t || c;
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
  const packageCode = m.assignedPackageCode ?? "";
  return {
    id: guidToNumericId(m.id),
    serverId: m.id,
    contractId: contractNumericId,
    inviteToken: m.inviteToken || "",
    personnelCode: m.personnelCode ?? "",
    firstName,
    lastName,
    fullName: m.fullName || displayFullName(firstName, lastName),
    nationalId: m.nationalId,
    phone: m.phone,
    birthDate,
    age,
    gender,
    maritalStatus: m.maritalStatus ?? null,
    department: m.department ?? "",
    jobCategory: m.jobCategory ?? "",
    source: "api",
    assignedPathwayCode: packageCode,
    assignedPathwayTitle: resolvePackageDisplayTitle(packageCode, m.assignedPackageTitle),
    matchedRuleTitle: m.matchedRuleTitle ?? "",
    manualPackageOverride: false,
    onboardingStage: mapOnboarding(m.onboardingStage),
    profileProgressPct: 0,
    abandonedAtStep: null,
    smsInviteCount: Number(m.smsInviteCount ?? 0),
    lastSmsAt: m.lastSmsAt ? String(m.lastSmsAt) : null,
    linkOpenedAt: null,
    loggedInAt: null,
    lastActivityAt: null,
    profileCompletedAt: null,
    draftSymptoms: "",
    draftAllergies: "",
    draftMedications: "",
    appointmentStatus: "unscheduled",
    scheduledDate: null,
    scheduledLabel: null,
    callSentAt: null,
    linkedPatientId: m.linkedPatientId ? guidToNumericId(m.linkedPatientId) : null,
  };
}

export function mapApiContract(c: ApiContractDto, members: ApiContractMemberDto[] = []): CorporateContract {
  const id = guidToNumericId(c.id);
  const statusRaw = (c.status ?? "active").toLowerCase();
  const status: CorporateContract["status"] =
    statusRaw === "draft" ? "draft" : statusRaw === "completed" ? "completed" : "active";
  return {
    id,
    serverId: c.id,
    code: c.code,
    title: c.title,
    organizationName: c.organizationName,
    status,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    apiEndpoint: "",
    apiKey: "",
    lastApiSyncAt: null,
    defaultPathwayCode: (c.defaultPackageCode ?? "").trim() || "FULL_CHECKUP",
    packageRules: (c.packageRules ?? []).map(
      (r, idx): ContractPackageRule => ({
        id: r.id || `api-rule-${c.id}-${idx}`,
        libraryRuleId: r.libraryRuleId ?? null,
        title: r.title,
        gender: r.gender === "زن" || r.gender === "مرد" ? r.gender : "همه",
        minAge: r.minAge ?? null,
        maxAge: r.maxAge ?? null,
        jobCategory: r.jobCategory || "همه",
        pathwayCode: r.packageCode,
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
