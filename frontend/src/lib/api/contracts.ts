/*
 File: frontend/src/lib/api/contracts.ts
 Description: نگاشت قرارداد/اعضا از Nabz.Api به shape فرانت
 Parent Dependencies: api/http, api/roles, types/clinic
 */

import { apiFetch } from "@/lib/api/http";
import { guidToNumericId } from "@/lib/api/roles";
import type { ContractMember, CorporateContract } from "@/types/clinic";

export interface ApiContractDto {
  id: string;
  code: string;
  title: string;
  organizationName: string;
  status: string;
  supervisorPhone?: string | null;
  supervisorName?: string | null;
  memberCount: number;
}

export interface ApiContractMemberDto {
  id: string;
  contractId: string;
  fullName: string;
  nationalId: string;
  phone: string;
  onboardingStage: string;
  assignedPackageCode?: string | null;
  assignedPackageTitle?: string | null;
  linkedPatientId?: string | null;
  inviteToken: string;
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

export function mapApiMember(m: ApiContractMemberDto, contractNumericId: number): ContractMember {
  return {
    id: guidToNumericId(m.id),
    serverId: m.id,
    contractId: contractNumericId,
    inviteToken: m.inviteToken || "",
    personnelCode: "",
    fullName: m.fullName,
    nationalId: m.nationalId,
    phone: m.phone,
    age: 0,
    gender: "مرد",
    department: "",
    jobCategory: "",
    source: "api",
    assignedPathwayCode: m.assignedPackageCode ?? "",
    assignedPathwayTitle: m.assignedPackageTitle ?? "",
    matchedRuleTitle: "",
    manualPackageOverride: false,
    onboardingStage: mapOnboarding(m.onboardingStage),
    profileProgressPct: 0,
    abandonedAtStep: null,
    smsInviteCount: 0,
    lastSmsAt: null,
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
    defaultPathwayCode: "FULL_CHECKUP",
    packageRules: [],
    dayQuotas: [],
    supervisor: emptySupervisor(c.supervisorName, c.supervisorPhone),
    smsLogs: [],
    members: members.map((m) => mapApiMember(m, id)),
    createdAt: new Date().toISOString(),
  };
}

export async function fetchClinicContracts(clinicId: string): Promise<CorporateContract[]> {
  const list = await apiFetch<ApiContractDto[]>(`/api/contracts?clinicId=${encodeURIComponent(clinicId)}`);
  const mapped: CorporateContract[] = [];
  for (const c of list) {
    let members: ApiContractMemberDto[] = [];
    try {
      members = await apiFetch<ApiContractMemberDto[]>(`/api/contracts/${c.id}/members`);
    } catch {
      members = [];
    }
    mapped.push(mapApiContract(c, members));
  }
  return mapped;
}
