/*
 File: frontend/my/src/lib/viewer.ts
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

/**
 * نقش‌های قابل‌نمایش در سوئیچر.
 * فقط ادمین کل می‌تواند وارد workspace نقش‌های دیگر شود؛
 * بقیهٔ نقش‌ها (از جمله ادمین کلینیک) کاملاً مستقل و قفل روی همان نقش حساب‌اند.
 */
export function allowedRolesFor(user?: AppUserDto | null): WorkspaceRole[] {
  const all = ALL_ROLE_IDS();
  if (!user) return all;

  if (user.primaryRole === "platform") {
    return all;
  }

  const primary = user.primaryRole as WorkspaceRole | undefined;
  if (primary && all.includes(primary)) {
    return [primary];
  }

  return [];
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
  // نقش ذخیره‌شدهٔ غیرمجاز (مثلاً owner برای ادمین کلینیک) را با fallback بازنویسی کن
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
