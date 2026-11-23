/*
 File: frontend/src/lib/intake-pdf.ts
 Description: گیت دکمه PDF قیف + اسکلت بیمار + برند دینامیک (نام/لوگوی کلینیک و قرارداد)
 Parent Dependencies: types/clinic, api/contracts
 */

import type { ApiMemberSubmittedFormDto } from "@/lib/api/contracts";
import { guidToNumericId } from "@/lib/api/roles";
import type { ContractMember, FormAnswer, FormAnswerValue, FormResponse, PatientFullDto } from "@/types/clinic";

/** برند PDF از تنظیمات کلینیک/قرارداد — نه مسیر ثابت public/brand */
export type IntakePdfBrandInput = {
  hospitalName: string;
  hospitalLogoUrl?: string | null;
  partnerLogoUrl?: string | null;
  organizationName?: string | null;
};

/** دکمه PDF فقط برای تکمیل‌شده با بیمار لینک‌شده و شناسه سرور عضو */
export function canShowIntakePdfButton(
  m: Pick<ContractMember, "formStatus" | "onboardingStage" | "linkedPatientServerId" | "serverId">
): boolean {
  const completed = m.formStatus === "submitted" || m.onboardingStage === "completed";
  return Boolean(completed && m.linkedPatientServerId && m.serverId);
}

function mapAnswer(a: ApiMemberSubmittedFormDto["answers"][number]): FormAnswer {
  const rawCode = a.valueCode != null ? String(a.valueCode) : null;
  const valueCode =
    rawCode === "yes" || rawCode === "no" || rawCode === "unknown" ? (rawCode as FormAnswerValue) : null;
  return {
    itemCode: String(a.itemCode ?? ""),
    valueCode,
    valueRaw: a.valueRaw != null ? String(a.valueRaw) : "",
    notes: a.notes != null ? String(a.notes) : "",
    skippedByRule: Boolean(a.skippedByRule),
  };
}

/** اسکلت PatientFullDto فقط برای رندر خلاصه پاسخ در PDF */
export function buildPatientForIntakePdf(dto: ApiMemberSubmittedFormDto): PatientFullDto {
  const submittedAt = dto.submittedAt ?? new Date().toISOString();
  const response: FormResponse = {
    id: `${dto.memberId}-response`,
    patientId: guidToNumericId(dto.patientId),
    formId: dto.formId,
    formCode: dto.formCode,
    formVersion: 1,
    formVersionId: dto.formId,
    status: "submitted",
    startedAt: submittedAt,
    updatedAt: submittedAt,
    completedAt: submittedAt,
    answers: (dto.answers ?? []).map(mapAnswer),
    context: {
      gender: dto.gender ?? "",
      age: dto.age ?? 0,
      maritalStatus: "",
    },
  };

  return {
    id: guidToNumericId(dto.patientId),
    serverId: dto.patientId,
    qrToken: "",
    fullName: dto.fullName,
    nationalId: dto.nationalId,
    age: dto.age ?? 0,
    gender: dto.gender ?? "",
    phone: "",
    pathwayTitle: "",
    checkInTime: submittedAt,
    completedAt: submittedAt,
    intakeCompleted: true,
    medications: [],
    surgeries: [],
    familyHistory: [],
    allergies: [],
    recentConditions: [],
    intakeAnswers: {},
    formResponses: [response],
    autoOpenWayfinding: false,
    journeyIntroSeen: true,
    stations: [],
    paraclinicResults: [],
    clinicalNotes: [],
    alerts: [],
  };
}
