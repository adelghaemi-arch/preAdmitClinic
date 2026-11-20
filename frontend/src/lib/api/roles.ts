/*
 File: frontend/src/lib/api/roles.ts
 Description: نگاشت نقش API به WorkspaceRole فرانت
 Parent Dependencies: types/clinic
 */

import type { ApiAppRole } from "@/lib/api/auth";
import type { WorkspaceRole } from "@/types/clinic";

export function apiRoleToWorkspace(role: ApiAppRole): WorkspaceRole {
  switch (role) {
    case "Owner":
      return "owner";
    case "Specialist":
      return "specialist";
    case "Admin":
      return "admin";
    case "Supervisor":
      return "supervisor";
    case "Platform":
      return "platform";
    default:
      return "owner";
  }
}

export function primaryWorkspaceRole(roles: ApiAppRole[]): WorkspaceRole {
  const order: ApiAppRole[] = ["Platform", "Admin", "Specialist", "Supervisor", "Owner"];
  for (const r of order) {
    if (roles.includes(r)) return apiRoleToWorkspace(r);
  }
  return "owner";
}

/** hash پایدار Guid → number برای سازگاری موقت با AppUserDto.id عددی */
export function guidToNumericId(guid: string): number {
  let h = 0;
  for (let i = 0; i < guid.length; i++) h = (Math.imul(31, h) + guid.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}
