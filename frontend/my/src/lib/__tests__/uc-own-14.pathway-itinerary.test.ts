/*
 File: frontend/my/src/lib/__tests__/uc-own-14.pathway-itinerary.test.ts
 Description: UC-OWN-14 — نگاشت itinerary و عنوان مسیر سازمانی
 Parent Dependencies: owner-patient-map, health-pathway-titles
 */

import { describe, expect, it } from "vitest";
import { mapOwnerSnapshotToPatient } from "@/lib/owner-patient-map";
import {
  CORP_MEN_GE40,
  CORP_MEN_LT40,
  DEFAULT_PATHWAY_CODE,
  resolveHealthPathwayTitle,
} from "@/lib/health-pathway-titles";
import type { OwnerIntakeSnapshotApi } from "@/lib/api/patients";

describe("UC-OWN-14", () => {
  it("maps pathwayItinerary from owner snapshot", () => {
    const snap = {
      patient: {
        id: "11111111-1111-1111-1111-111111111111",
        firstName: "علی",
        lastName: "تست",
        fullName: "علی تست",
        nationalId: "0011223340",
        phone: "09121112233",
        intakeCompleted: true,
        assignedPathwayTitle: resolveHealthPathwayTitle(CORP_MEN_LT40),
        journeyIntroSeen: true,
      },
      documentGroupCount: 0,
      hasPortrait: false,
      gpsPointCount: 0,
      intakeGate: "already_complete",
      pathwayItinerary: [
        {
          stationDefId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          roomCode: "LAB",
          titleFa: "آزمایشگاه",
          stepOrder: 1,
          isOptional: false,
          confirmed: false,
          confirmedAt: null,
        },
        {
          stationDefId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          roomCode: "STRESS",
          titleFa: "تست ورزش",
          stepOrder: 2,
          isOptional: true,
          confirmed: true,
          confirmedAt: "2026-11-21T10:00:00Z",
        },
      ],
    } as OwnerIntakeSnapshotApi;

    const p = mapOwnerSnapshotToPatient(snap);
    expect(p.pathwayItinerary).toHaveLength(2);
    expect(p.pathwayItinerary![0].roomCode).toBe("LAB");
    expect(p.pathwayItinerary![1].isOptional).toBe(true);
    expect(p.pathwayItinerary![1].confirmed).toBe(true);
  });

  it("resolves organizational pathway titles", () => {
    expect(resolveHealthPathwayTitle(CORP_MEN_LT40)).toContain("آقایان");
    expect(resolveHealthPathwayTitle(CORP_MEN_GE40)).toContain("۴۰");
    expect(resolveHealthPathwayTitle(null)).toBe(resolveHealthPathwayTitle(DEFAULT_PATHWAY_CODE));
    expect(resolveHealthPathwayTitle(CORP_MEN_LT40, "عنوان سفارشی")).toBe("عنوان سفارشی");
  });
});
