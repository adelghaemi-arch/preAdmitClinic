/*
 File: frontend/my/src/lib/__tests__/uc-adm-05.pathway-buckets.test.ts
 Description: UC-ADM-05 — سطل‌های مسیر سلامتی؛ اولویت لیست؛ پیش‌فرض؛ شمارش اعضا؛ reorder
 Parent Dependencies: contract-pathway-buckets.ts
 */

import { describe, expect, it } from "vitest";
import {
  buildContractPathwayBuckets,
  contractPathwayOverrideOptions,
  DEFAULT_PATHWAY_BUCKET_ID,
  isMemberOnDefaultPathway,
  membersForPathwayBucket,
  reorderPathwayRulePriorities,
  sortedContractPathwayRules,
} from "@/lib/contract-pathway-buckets";
import type { ContractMember, ContractPathwayRule, PathwayDto } from "@/types/clinic";

const pathways: PathwayDto[] = [
  {
    id: "t1",
    code: "CORP_MEN_LT40",
    title: "چکاپ آقایان زیر ۴۰ سال",
    description: "",
    gender: "مرد",
    minAge: null,
    maxAge: 39,
    jobCategory: "همه",
    stationCodes: ["LAB"],
    estimatedTotalMinutes: 60,
    isActive: true,
    isInLibrary: true,
  },
  {
    id: "t2",
    code: "CORP_MEN_GE40",
    title: "چکاپ آقایان ۴۰ سال به بالا",
    description: "",
    gender: "مرد",
    minAge: 40,
    maxAge: null,
    jobCategory: "همه",
    stationCodes: ["CARDIO"],
    estimatedTotalMinutes: 40,
    isActive: true,
    isInLibrary: true,
  },
];

function member(partial: Partial<ContractMember> & { id: number; matchedPathwayTitle?: string }): ContractMember {
  return {
    id: partial.id,
    serverId: String(partial.id),
    contractId: 1,
    inviteToken: "",
    personnelCode: "",
    firstName: "ن",
    lastName: "م",
    fullName: partial.fullName ?? `عضو ${partial.id}`,
    nationalId: "0011223344",
    phone: "09120000000",
    birthDate: "1990-01-01",
    age: 35,
    gender: "مرد",
    maritalStatus: null,
    department: "",
    jobCategory: "",
    source: "manual",
    assignedPathwayCode: partial.assignedPathwayCode ?? "CORP_MEN_LT40",
    assignedPathwaytitle: "چکاپ آقایان زیر ۴۰ سال",
    matchedPathwayTitle: partial.matchedPathwayTitle ?? "",
    manualPathwayOverride: false,
    onboardingStage: "not_sent",
    profileProgressPct: 0,
    abandonedAtStep: null,
    formStatus: "none",
    intakeCompleted: false,
    smsInviteCount: 0,
    lastSmsAt: null,
    linkOpenedAt: null,
    loggedInAt: null,
    lastActivityAt: null,
    profileCompletedAt: null,
    draftSymptoms: "",
    draftAllergies: "",
    draftMedications: "",
    appointmentStatus: "unscheduled",
    scheduledDate: null,
    scheduledLabel: null,
    callSentAt: null,
    linkedPatientId: null,
  };
}

describe("UC-ADM-05 pathway buckets", () => {
  it("مرتب‌سازی اولویت: عدد کمتر بالاتر است", () => {
    const rules: ContractPathwayRule[] = [
      { id: "b", title: "دوم", gender: "همه", minAge: null, maxAge: null, jobCategory: "همه", pathwayCode: "CORP_MEN_GE40", priority: 2 },
      { id: "a", title: "اول", gender: "همه", minAge: null, maxAge: null, jobCategory: "همه", pathwayCode: "CORP_MEN_LT40", priority: 1 },
    ];
    expect(sortedContractPathwayRules(rules).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("سطل‌ها: قوانین به اولویت سپس مسیر پیش‌فرض", () => {
    const buckets = buildContractPathwayBuckets(
      {
        defaultPathwayCode: "CORP_MEN_LT40",
        pathwayRules: [
          { id: "r2", title: "عملیاتی", gender: "مرد", minAge: 18, maxAge: 44, jobCategory: "عملیات و فنی", pathwayCode: "CORP_MEN_GE40", priority: 2 },
          { id: "r1", title: "سالمند", gender: "همه", minAge: 45, maxAge: null, jobCategory: "همه", pathwayCode: "CORP_MEN_LT40", priority: 1 },
        ],
      },
      pathways
    );
    expect(buckets.map((b) => b.id)).toEqual(["r1", "r2", DEFAULT_PATHWAY_BUCKET_ID]);
    expect(buckets.at(-1)?.kind).toBe("default");
  });

  it("عضو بدون match روی پیش‌فرض است؛ عضو match‌شده روی سطل قانون", () => {
    const rules: ContractPathwayRule[] = [
      { id: "r1", title: "سالمند", gender: "همه", minAge: 45, maxAge: null, jobCategory: "همه", pathwayCode: "CORP_MEN_LT40", priority: 1 },
    ];
    const members = [
      member({ id: 1, matchedPathwayTitle: "" }),
      member({ id: 2, matchedPathwayTitle: "سالمند", assignedPathwayCode: "CORP_MEN_LT40" }),
      member({ id: 3, matchedPathwayTitle: "manual_override" }),
      member({ id: 4, matchedPathwayTitle: "سالمند", assignedPathwayCode: "CORP_MEN_LT40" }),
    ];
    expect(isMemberOnDefaultPathway(members[0]!, rules)).toBe(true);
    expect(isMemberOnDefaultPathway(members[1]!, rules)).toBe(false);
    expect(isMemberOnDefaultPathway(members[2]!, rules)).toBe(true);

    const buckets = buildContractPathwayBuckets(
      { defaultPathwayCode: "CORP_MEN_LT40", pathwayRules: rules },
      pathways
    );
    const defaultBucket = buckets.find((b) => b.kind === "default")!;
    const ruleBucket = buckets.find((b) => b.id === "r1")!;
    expect(membersForPathwayBucket(members, defaultBucket, rules).map((m) => m.id)).toEqual([1, 3]);
    expect(membersForPathwayBucket(members, ruleBucket, rules).map((m) => m.id)).toEqual([2, 4]);
  });

  it("گزینه override فقط پیش‌فرض + مسیرهای قرارداد است نه کل کاتالوگ", () => {
    const opts = contractPathwayOverrideOptions(
      {
        defaultPathwayCode: "CORP_MEN_LT40",
        pathwayRules: [
          { id: "r1", title: "عملیاتی", gender: "مرد", minAge: 18, maxAge: 44, jobCategory: "همه", pathwayCode: "CORP_MEN_GE40", priority: 1 },
        ],
      },
      pathways
    );
    expect(opts.map((o) => o.code)).toEqual(["CORP_MEN_LT40", "CORP_MEN_GE40"]);
    expect(opts.map((o) => o.title)).toEqual(["چکاپ آقایان زیر ۴۰ سال", "عملیاتی"]);
  });

  it("UC-ADM-05 reorder: جابه‌جایی اولویت همسایه و بازشماره", () => {
    const rules: ContractPathwayRule[] = [
      { id: "a", title: "اول", gender: "همه", minAge: null, maxAge: null, jobCategory: "همه", pathwayCode: "CORP_MEN_LT40", priority: 1 },
      { id: "b", title: "دوم", gender: "همه", minAge: null, maxAge: null, jobCategory: "همه", pathwayCode: "CORP_MEN_GE40", priority: 2 },
      { id: "c", title: "سوم", gender: "همه", minAge: null, maxAge: null, jobCategory: "همه", pathwayCode: "CORP_MEN_GE40", priority: 3 },
    ];
    const down = reorderPathwayRulePriorities(rules, "a", "down");
    expect(down.map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(down.map((r) => r.priority)).toEqual([1, 2, 3]);
    const up = reorderPathwayRulePriorities(down, "c", "up");
    expect(up.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });
});
