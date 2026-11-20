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

const ALL_ROLE_IDS = selectableRoles().map((r) => r.id);

export function allowedRolesFor(user?: AppUserDto | null): WorkspaceRole[] {
  if (user && !user.canAccessAllRoles && user.primaryRole === "supervisor") {
    return ["supervisor"];
  }
  if (user?.primaryRole && ALL_ROLE_IDS.includes(user.primaryRole as WorkspaceRole)) {
    // نقش‌های واقعی سرور را اولویت بده؛ سوئیچ آزاد فقط برای canAccessAllRoles
    if (!user.canAccessAllRoles) return [user.primaryRole as WorkspaceRole];
  }
  return ALL_ROLE_IDS;
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

export async function resolveSession(requestedRole?: string): Promise<SessionContext | null> {
  const session = await getCurrentUser();
  if (!session) return null;

  const fallback = (session.user.primaryRole as WorkspaceRole) || "owner";
  const allowed = allowedRolesFor(session.user);
  const requested = asRole(requestedRole) ?? readStoredRole();
  const roleAllowed = requested ? allowed.includes(requested) : true;
  const role: WorkspaceRole =
    requested && allowed.includes(requested)
      ? requested
      : allowed.includes(fallback)
        ? fallback
        : (allowed[0] ?? "owner");

  // نقش‌های سرور در me — اگر موجود باشد هم‌تراز کن
  if (session.me?.roles?.length) {
    const fromApi = primaryWorkspaceRole(session.me.roles);
    if (!requested && allowed.includes(fromApi)) {
      return {
        user: session.user,
        isDemoSession: false,
        role: fromApi,
        roleAllowed: true,
        viewer: { userId: session.user.id, role: fromApi },
      };
    }
  }

  return {
    user: session.user,
    isDemoSession: false,
    role,
    roleAllowed,
    viewer: { userId: session.user.id, role },
  };
}
