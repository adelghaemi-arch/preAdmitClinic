import type { CompanionLinkDto, PatientFullDto, WorkspaceRole } from "@/types/clinic";
import type { AppPage } from "@/lib/workspace";

/** Pages still reachable while the owner is gated on incomplete pre-admission. */
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
}): boolean {
  const { role, link, patient } = args;
  if (role !== "owner") return false;
  if (!patient) return false;
  if (patient.intakeCompleted) return false;
  // Owner without a self-link yet (no record connected) — keep links page open, no force-intake.
  if (!link) return false;
  if (link.relationship !== "self") return false;
  return true;
}

/** Where the owner should land given gate + intro-seen state. */
export function resolveGatedPage(
  requested: AppPage,
  args: {
    role: WorkspaceRole;
    link?: CompanionLinkDto | null;
    patient?: PatientFullDto | null;
  }
): AppPage {
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
