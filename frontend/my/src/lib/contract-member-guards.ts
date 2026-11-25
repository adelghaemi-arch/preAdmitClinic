/*
 File: frontend/my/src/lib/contract-member-guards.ts
 Description: گاردهای دامنه عضو قرارداد — حذف فقط قبل از پیش‌پذیرش (UC-ADM-04b)
 Parent Dependencies: types/clinic.ts
 */
import type { ContractMember } from "@/types/clinic";

type DeleteGuardInput = Pick<ContractMember, "onboardingStage" | "formStatus" | "linkedPatientId">;

/** حذف فقط وقتی هنوز وارد لینک/لاگین/فرم/پذیرش نشده باشد. */
export function canDeleteContractMember(m: DeleteGuardInput): boolean {
  if (m.linkedPatientId != null) return false;
  if (m.formStatus === "draft" || m.formStatus === "submitted") return false;
  return m.onboardingStage === "not_sent" || m.onboardingStage === "sms_sent";
}
