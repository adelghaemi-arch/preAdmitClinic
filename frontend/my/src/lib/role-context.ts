/**
 * The active role is remembered per browser (not per server session) so a copied
 * static build behaves identically in StackBlitz / CodeSandbox.
 */
export function setRequestRole(role: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("nabz_tab_role", role);
    window.localStorage.setItem("nabz_active_role", role);
  } catch {}
}

export function getRequestRole(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("nabz_tab_role") ?? window.localStorage.getItem("nabz_active_role");
  } catch {
    return null;
  }
}
