import { ensureClientDb } from "@/lib/client-db";
import { readUsername, getCurrentUser } from "@/lib/auth";
import { mockStore } from "@/lib/mock-store";
import { ROLES } from "@/lib/workspace";
import type { SnapshotViewer } from "@/lib/clinic-scope";
import type { AppUserDto, WorkspaceRole } from "@/types/clinic";

export const ACTIVE_ROLE_KEY = "nabz_active_role";

export interface SessionContext {
  user: AppUserDto;
  isDemoSession: boolean;
  role: WorkspaceRole;
  roleAllowed: boolean;
  viewer: SnapshotViewer & { role: WorkspaceRole };
}

const ALL_ROLE_IDS = ROLES.map((r) => r.id);

/** Full-access accounts can switch across every role; external supervisors entered via phone only see their supervisor portal. */
export function allowedRolesFor(user?: AppUserDto | null): WorkspaceRole[] {
  if (user && !user.canAccessAllRoles && user.primaryRole === "supervisor") {
    return ["supervisor"];
  }
  return ALL_ROLE_IDS;
}

export function asRole(value: string | null | undefined): WorkspaceRole | null {
  return ROLES.some((r) => r.id === value) ? (value as WorkspaceRole) : null;
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
  } catch {}
}

/** Resolves the browser session and active role (no cookies, no server). */
export async function resolveSession(requestedRole?: string): Promise<SessionContext> {
  ensureClientDb();
  const session = await getCurrentUser();
  const userLinks = mockStore.linksOfUser(session.user.id);
  const fallback: WorkspaceRole =
    session.user.primaryRole === "supervisor"
      ? "supervisor"
      : userLinks.some((link) => link.relationship === "self") || session.user.primaryRole === "owner"
        ? "owner"
        : "patient";
  const allowed = allowedRolesFor(session.user);
  const requested = asRole(requestedRole) ?? readStoredRole();
  const roleAllowed = requested ? allowed.includes(requested) : true;
  const role: WorkspaceRole =
    requested && allowed.includes(requested) ? requested : allowed.includes(fallback) ? fallback : (allowed[0] ?? fallback);

  return {
    user: session.user,
    isDemoSession: session.isDemoSession && !readUsername(),
    role,
    roleAllowed,
    viewer: { userId: session.user.id, role },
  };
}
