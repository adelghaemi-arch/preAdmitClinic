/*
 File: frontend/src/lib/owner-intake-gate.ts
 Description: گیت Owner — پروفایل/عکس اجباری؛ پیش‌پذیرش اختیاری
 Parent Dependencies: types/clinic, workspace
 */

import type { CompanionLinkDto, PatientFullDto, WorkspaceRole } from "@/types/clinic";
import type { AppPage } from "@/lib/workspace";

/** صفحات مجاز وقتی گیت پروفایل/عکس فعال است. */
export const GATED_OWNER_PAGES: AppPage[] = [
  "journey-intro",
  "companion-intake",
  "companion-links",
  "patient-privacy",
];

export function shouldGateOwner(args: {
  role: WorkspaceRole;
  link?: CompanionLinkDto | null;
  patient?: PatientFullDto | null;
  /** از snapshot سرور: needs_form | already_complete — دیگر قفل اجباری نیست */
  intakeGate?: "needs_form" | "already_complete" | null;
}): boolean {
  const { role, link, patient } = args;
  if (role !== "owner") return false;
  if (!patient) return false;
  if (!link) return false;
  if (link.relationship !== "self") return false;
  // پرسشنامه پیش‌پذیرش اختیاری است؛ قفل فقط برای هویت/دموگرافیک و عکس
  const profileOk = patient.profileComplete !== false;
  const photoOk = Boolean(patient.hasPortrait || patient.photoDataUrl);
  return !profileOk || !photoOk;
}

type OwnerGateArgs = {
  role: WorkspaceRole;
  link?: CompanionLinkDto | null;
  patient?: PatientFullDto | null;
  intakeGate?: "needs_form" | "already_complete" | null;
};

/** مقصد Owner با توجه به intro و تکمیل پروفایل/عکس. */
export function resolveGatedPage(requested: AppPage, args: OwnerGateArgs): AppPage {
  if (!shouldGateOwner(args)) return requested;
  const seen = Boolean(args.patient?.journeyIntroSeen);
  if (!seen) {
    if (requested === "companion-links" || requested === "patient-privacy") return requested;
    return "journey-intro";
  }
  if (GATED_OWNER_PAGES.includes(requested) && requested !== "journey-intro") return requested;
  return "companion-intake";
}

export function filterNavPagesForGate(pages: AppPage[], gated: boolean): AppPage[] {
  if (!gated) return pages;
  return pages.filter((p) => GATED_OWNER_PAGES.includes(p) && p !== "journey-intro");
}
