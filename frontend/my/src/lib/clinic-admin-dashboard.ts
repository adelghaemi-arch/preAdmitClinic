/*
 File: frontend/src/lib/clinic-admin-dashboard.ts
 Description: KPI داشبورد ادمین کلینیک — قرارداد، اعضا، پیش‌پذیرش/مراجعه/تکمیل امروز
 Parent Dependencies: types/clinic, date-iso, persian
 */

import { iranLocalDayOffset } from "@/lib/date-iso";
import { parseIranApiWallClock } from "@/lib/persian";
import type { ContractMember, CorporateContract } from "@/types/clinic";

export interface AdminClinicDashboardStats {
  contractsCount: number;
  membersCount: number;
  /** پیش‌پذیرش در جریان امروز (draft یا فعالیت امروز بدون تکمیل) */
  preAdmitToday: number;
  /** اعضای با تاریخ مراجعه برنامه‌ای = امروز */
  visitsToday: number;
  /** تکمیل پیش‌پذیرش در امروز */
  completionsToday: number;
  /** هنوز پیش‌پذیرش را تمام نکرده‌اند (بک‌لاگ) */
  pendingPreAdmit: number;
}

/** روز تقویمی ایران از timestamp API یا ISO day. */
export function isoDayFromApiTimestamp(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const wall = parseIranApiWallClock(iso);
  if (wall?.ymd) return wall.ymd;
  const day = iso.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export function clinicDashboardTodayIso(serverTime?: string | null): string {
  const fromServer = isoDayFromApiTimestamp(serverTime);
  return fromServer ?? iranLocalDayOffset(0);
}

export function computeAdminClinicDashboardStats(
  contracts: CorporateContract[],
  members: ContractMember[],
  todayIso: string
): AdminClinicDashboardStats {
  const contractsCount = contracts.length;
  const membersCount = contracts.reduce((sum, c) => sum + (c.memberCount ?? c.members?.length ?? 0), 0);

  const visitsToday = members.filter((m) => (m.scheduledVisitDate ?? "").slice(0, 10) === todayIso).length;

  const completionsToday = members.filter((m) => {
    const completed = m.intakeCompleted || m.formStatus === "submitted" || m.onboardingStage === "completed";
    if (!completed) return false;
    const day = isoDayFromApiTimestamp(m.profileCompletedAt);
    // اگر timestamp تکمیل نباشد ولی stage کامل است و مراجعه امروز است، در «تکمیل امروز» نگذار
    return day === todayIso;
  }).length;

  const isComplete = (m: ContractMember) =>
    m.intakeCompleted || m.formStatus === "submitted" || m.onboardingStage === "completed";

  const preAdmitToday = members.filter((m) => {
    if (isComplete(m)) return false;
    if (m.formStatus === "draft") return true;
    const activity =
      isoDayFromApiTimestamp(m.lastActivityAt) ??
      isoDayFromApiTimestamp(m.loggedInAt) ??
      isoDayFromApiTimestamp(m.linkOpenedAt);
    return activity === todayIso;
  }).length;

  const pendingPreAdmit = members.filter((m) => !isComplete(m)).length;

  return { contractsCount, membersCount, preAdmitToday, visitsToday, completionsToday, pendingPreAdmit };
}
