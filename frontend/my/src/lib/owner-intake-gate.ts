/*
 File: frontend/my/src/lib/owner-intake-gate.ts
 Description: گیت Owner — خانه با مسیر مجاز؛ پروفایل/عکس اجباری در پیش‌پذیرش
 Parent Dependencies: types/clinic, workspace
 */

import type { CompanionLinkDto, PatientFullDto, WorkspaceRole } from "@/types/clinic";
import type { AppPage } from "@/lib/workspace";

/** صفحات مجاز وقتی گیت پروفایل/عکس فعال است — خانه برای دیدن مسیر قبل از ورود. */
export const GATED_OWNER_PAGES: AppPage[] = [
  "dashboard",
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

/**
 * مقصد Owner با گیت پروفایل/عکس.
 * خانه همیشه مجاز است تا فاصله+مسیر قبل از «ورود به پیش‌پذیرش» دیده شود.
 */
export function resolveGatedPage(requested: AppPage, args: OwnerGateArgs): AppPage {
  if (!shouldGateOwner(args)) {
    // intro جدا دیگر اجباری نیست؛ مستقیم به خانه
    if (requested === "journey-intro") return "dashboard";
    return requested;
  }
  if (requested === "dashboard" || requested === "journey-intro") return "dashboard";
  if (requested === "companion-links" || requested === "patient-privacy") return requested;
  if (requested === "companion-intake") return "companion-intake";
  // صفحات غیرمرتبط → پیش‌پذیرش (تکمیل عکس/پروفایل)
  return "companion-intake";
}

export function filterNavPagesForGate(pages: AppPage[], gated: boolean): AppPage[] {
  if (!gated) return pages;
  return pages.filter((p) => GATED_OWNER_PAGES.includes(p));
}
