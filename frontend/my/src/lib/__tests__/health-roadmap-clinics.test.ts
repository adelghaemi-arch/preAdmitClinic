/*
 File: frontend/my/src/lib/__tests__/health-roadmap-clinics.test.ts
 Description: نام کلینیک‌های مرحله مراجعه از مسیر سلامتی همان سلامتجو
 Parent Dependencies: health-roadmap
 */
import { describe, expect, it } from "vitest";
import {
  buildHealthRoadmap,
  preAdmitPartialPct,
  resolveVisitClinicNames,
  ROADMAP_STAGE_WEIGHTS,
  roadmapProgress,
} from "@/lib/health-roadmap";
import type {
  ContractMember,
  PathwayDto,
  PatientFullDto,
  VisitStationDto,
} from "@/types/clinic";

function basePatient(partial: Partial<PatientFullDto> = {}): PatientFullDto {
  return {
    id: 1,
    qrToken: "q",
    fullName: "علی تست",
    nationalId: "0012345678",
    age: 35,
    gender: "مرد",
    phone: "09120000000",
    pathwayTitle: "چکاپ آقایان زیر ۴۰ سال",
    checkInTime: "2026-01-01T08:00:00Z",
    completedAt: null,
    intakeCompleted: false,
    medications: [],
    surgeries: [],
    familyHistory: [],
    allergies: [],
    recentConditions: [],
    intakeAnswers: {},
    formResponses: [],
    autoOpenWayfinding: false,
    journeyIntroSeen: false,
    stations: [],
    clinicalNotes: [],
    paraclinicResults: [],
    alerts: [],
    ...partial,
  };
}

const pathway: PathwayDto = {
  id: "p1",
  code: "CORP_MEN_LT40",
  title: "چکاپ آقایان زیر ۴۰ سال",
  description: "",
  gender: "مرد",
  minAge: null,
  maxAge: 39,
  jobCategory: "همه",
  stationCodes: ["LAB", "ECG", "CARDIO"],
  stations: [
    { roomCode: "LAB", titleFa: "آزمایشگاه تشخیص طبی", stepOrder: 1, isOptional: false },
    { roomCode: "ECG", titleFa: "نوار قلب (ECG)", stepOrder: 2, isOptional: false },
    { roomCode: "CARDIO", titleFa: "مطب تخصصی قلب", stepOrder: 3, isOptional: false },
  ],
  estimatedTotalMinutes: 90,
  isActive: true,
  isInLibrary: true,
};

describe("resolveVisitClinicNames", () => {
  it("اولویت با itinerary مسیر سلامتی است", () => {
    const names = resolveVisitClinicNames(
      basePatient({
        pathwayItinerary: [
          {
            stationDefId: "a",
            roomCode: "LAB",
            titleFa: "آزمایشگاه",
            stepOrder: 2,
            isOptional: false,
            confirmed: false,
          },
          {
            stationDefId: "b",
            roomCode: "ECG",
            titleFa: "نوار قلب",
            stepOrder: 1,
            isOptional: false,
            confirmed: false,
          },
        ],
      })
    );
    expect(names).toEqual(["نوار قلب", "آزمایشگاه"]);
  });

  it("از کاتالوگ مسیر تخصیص‌یافته عضو قرارداد پر می‌شود", () => {
    const member = {
      assignedPathwayCode: "CORP_MEN_LT40",
      appointmentStatus: "unscheduled",
    } as ContractMember;
    const names = resolveVisitClinicNames(basePatient(), member, {
      pathways: [pathway],
      rooms: [],
    });
    expect(names).toEqual(["آزمایشگاه تشخیص طبی", "نوار قلب (ECG)", "مطب تخصصی قلب"]);
  });

  it("مرحله مراجعه desc را با نام کلینیک‌ها می‌سازد", () => {
    const stages = buildHealthRoadmap(
      basePatient({
        pathwayItinerary: [
          {
            stationDefId: "1",
            roomCode: "LAB",
            titleFa: "آزمایشگاه تشخیص طبی",
            stepOrder: 1,
            isOptional: false,
            confirmed: false,
          },
          {
            stationDefId: "2",
            roomCode: "ECG",
            titleFa: "نوار قلب (ECG)",
            stepOrder: 2,
            isOptional: false,
            confirmed: false,
          },
        ],
      })
    );
    const visit = stages.find((s) => s.id === "visit");
    expect(visit?.desc).toBe("آزمایشگاه تشخیص طبی، نوار قلب (ECG)");
  });

  it("از صف مراجعه VisitStation هم می‌خواند", () => {
    const stations = [
      { stepOrder: 1, roomName: "رادیولوژی", roomCode: "RAD", status: "pending" },
      { stepOrder: 2, roomName: "سونوگرافی", roomCode: "US", status: "pending" },
    ] as VisitStationDto[];
    expect(resolveVisitClinicNames(basePatient({ stations }))).toEqual(["رادیولوژی", "سونوگرافی"]);
  });

  it("اگر پرتره باشد، desc پیش‌پذیرش دیگر «شروع با عکس» نمی‌گوید", () => {
    const without = buildHealthRoadmap(basePatient({ hasPortrait: false }));
    const withPhoto = buildHealthRoadmap(basePatient({ hasPortrait: true }));
    expect(without.find((s) => s.id === "pre")?.desc).toContain("شروع با عکس");
    expect(withPhoto.find((s) => s.id === "pre")?.desc).toContain("عکس پرونده ثبت شده");
    expect(withPhoto.find((s) => s.id === "pre")?.cta).toBe("ادامه پیش‌پذیرش");
  });
});

describe("roadmapProgress + preAdmitPartialPct", () => {
  it("بدون داده → ۰٪؛ با پیش‌نویس فرم روی وزن ۳۰٪ پیش‌پذیرش حساب می‌شود", () => {
    const stages = buildHealthRoadmap(basePatient());
    expect(roadmapProgress(stages).pct).toBe(0);
    const partial = preAdmitPartialPct(basePatient({ formProgressPct: 40 }));
    expect(partial).toBe(40);
    // ۴۰٪ از وزن ۳۰ = ۱۲
    expect(roadmapProgress(stages, partial).pct).toBe(12);
  });

  it("پیش‌پذیرش کامل = ۳۰٪؛ پرونده+تحلیل با هم ۳۵٪ وزن دارند", () => {
    const stages = buildHealthRoadmap(basePatient({ intakeCompleted: true }));
    expect(roadmapProgress(stages).pct).toBe(30);
    expect(ROADMAP_STAGE_WEIGHTS.emr + ROADMAP_STAGE_WEIGHTS.analysis).toBe(35);
    expect(ROADMAP_STAGE_WEIGHTS.pre).toBe(30);
  });

  it("فقط پرتره → سهم جزئی کوچک", () => {
    expect(preAdmitPartialPct(basePatient({ hasPortrait: true }))).toBe(8);
  });
});
