/*
 File: frontend/src/lib/viewer.ts
 Description: حل نشست و نقش فعال از API auth/me (بدون mock-store)
 Parent Dependencies: auth, api/roles, workspace
 */

import { getCurrentUser } from "@/lib/auth";
import { primaryWorkspaceRole } from "@/lib/api/roles";
import type { SnapshotViewer } from "@/lib/clinic-scope";
import { COMPANION_FEATURE_ENABLED, selectableRoles } from "@/lib/workspace";
import type { AppUserDto, WorkspaceRole } from "@/types/clinic";

export const ACTIVE_ROLE_KEY = "nabz_active_role";

export interface SessionContext {
  user: AppUserDto;
  isDemoSession: boolean;
  role: WorkspaceRole;
  roleAllowed: boolean;
  viewer: SnapshotViewer & { role: WorkspaceRole };
}

const ALL_ROLE_IDS = (): WorkspaceRole[] => selectableRoles().map((r) => r.id);

export function allowedRolesFor(user?: AppUserDto | null): WorkspaceRole[] {
  const all = ALL_ROLE_IDS();
  if (!user) return all;

  // ادمین کل بالاتر از ادمین کلینیک است و می‌تواند همه نقش‌های قابل‌انتخاب (شامل admin) را بگیرد
  if (user.primaryRole === "platform") {
    return all;
  }

  // ادمین کلینیک با سوئیچ چندنقشی کلینیکی؛ هرگز به workspace ادمین کل نمی‌رود
  if (user.canAccessAllRoles && user.primaryRole === "admin") {
    return all.filter((id) => id !== "platform");
  }

  if (!user.canAccessAllRoles && user.primaryRole === "supervisor") {
    return ["supervisor"];
  }

  if (user.primaryRole && all.includes(user.primaryRole as WorkspaceRole)) {
    // نقش‌های واقعی سرور را اولویت بده؛ سوئیچ آزاد فقط برای حساب‌های چندنقشی بالا
    if (!user.canAccessAllRoles) return [user.primaryRole as WorkspaceRole];
  }

  // canAccessAllRoles بدون primary مشخص (دمو قدیمی): همه به‌جز platform مگر خود platform
  if (user.canAccessAllRoles) {
    return all.filter((id) => id !== "platform");
  }

  return all;
}

export function asRole(value: string | null | undefined): WorkspaceRole | null {
  if (!value) return null;
  if (!COMPANION_FEATURE_ENABLED && value === "patient") return null;
  return selectableRoles().some((r) => r.id === value) ? (value as WorkspaceRole) : null;
}

export function readStoredRole(): WorkspaceRole | null {
  if (typeof window === "undefined") return null;
  try {
    return asRole(window.localStorage.getItem("nabz_tab_role") ?? window.localStorage.getItem(ACTIVE_ROLE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredRole(role: WorkspaceRole): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_ROLE_KEY, role);
    window.localStorage.setItem("nabz_tab_role", role);
  } catch {
    /* ignore */
  }
}

export function pickAllowedRole(
  user: AppUserDto,
  requestedRole?: string | null,
  storedRole?: WorkspaceRole | null,
): { role: WorkspaceRole; roleAllowed: boolean; sanitized: boolean } {
  const allowed = allowedRolesFor(user);
  const fallback = (user.primaryRole as WorkspaceRole) || "owner";
  const requested = asRole(requestedRole ?? undefined) ?? storedRole ?? null;
  const roleAllowed = requested ? allowed.includes(requested) : true;
  const role: WorkspaceRole =
    requested && allowed.includes(requested)
      ? requested
      : allowed.includes(fallback)
        ? fallback
        : (allowed[0] ?? "owner");
  const sanitized = Boolean(requested && !allowed.includes(requested));
  return { role, roleAllowed, sanitized };
}

export async function resolveSession(requestedRole?: string): Promise<SessionContext | null> {
  const session = await getCurrentUser();
  if (!session) return null;

  const allowed = allowedRolesFor(session.user);
  const stored = readStoredRole();
  const requested = asRole(requestedRole) ?? stored;

  // نقش‌های سرور در me — اگر درخواست/ذخیره نباشد هم‌تراز کن
  if (session.me?.roles?.length && !requested) {
    const fromApi = primaryWorkspaceRole(session.me.roles);
    if (allowed.includes(fromApi)) {
      return {
        user: session.user,
        isDemoSession: false,
        role: fromApi,
        roleAllowed: true,
        viewer: { userId: session.user.id, role: fromApi },
      };
    }
  }

  const picked = pickAllowedRole(session.user, requestedRole, stored);
  // نقش ذخیره‌شدهٔ غیرمجاز (مثلاً platform برای ادمین کلینیک) را با fallback بازنویسی کن
  if (picked.sanitized || (stored && stored !== picked.role)) {
    writeStoredRole(picked.role);
  }

  return {
    user: session.user,
    isDemoSession: false,
    role: picked.role,
    roleAllowed: picked.roleAllowed,
    viewer: { userId: session.user.id, role: picked.role },
  };
}
