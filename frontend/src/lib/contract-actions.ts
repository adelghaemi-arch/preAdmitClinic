import {
  EXTERNAL_HR_API_POOLS,
  FILL_FORMULA_LABELS,
  formatPersianDateLabel,
  isoDayOffset,
  resolveMemberPackage,
  type ExternalApiPerson,
} from "@/lib/mock-contracts";
import { mockMutations, mockStore } from "@/lib/mock-store";
import { normalizePersianInput, normalizePersianLetters, toFaDigits, toLatinDigits } from "@/lib/persian";
import { randomUUID } from "@/lib/uuid";
import {
  emptyIntakeAnswers,
  type ContractDayQuota,
  type ContractMember,
  type ContractPathwayRule,
  type CorporateContract,
  type OnboardingStage,
  type PathwayLibraryRule,
} from "@/types/clinic";

function nextContractId(): number {
  return mockStore.contracts.reduce((max, c) => Math.max(max, c.id), 0) + 1;
}

function nextMemberId(): number {
  let max = 0;
  for (const c of mockStore.contracts) {
    for (const m of c.members) {
      if (m.id > max) max = m.id;
    }
  }
  return max + 1;
}

function cleanDigits(value: unknown): string {
  return toLatinDigits(value == null ? "" : String(value)).replace(/\D/g, "");
}

function addMembersToContract(
  contract: CorporateContract,
  incoming: ExternalApiPerson[],
  source: "api" | "excel" | "manual",
  sendSmsNow: boolean,
  senderName: string
): { added: number; duplicates: number } {
  const now = new Date().toISOString();
  const existingNids = new Set(contract.members.map((m) => cleanDigits(m.nationalId)));
  const addedNames: string[] = [];
  let duplicates = 0;

  for (const person of incoming) {
    const nid = cleanDigits(person.nationalId);
    if (!nid || existingNids.has(nid)) {
      duplicates++;
      continue;
    }
    existingNids.add(nid);
    const id = nextMemberId();
    const pkg = resolveMemberPackage(
      { age: person.age, gender: person.gender, jobCategory: person.jobCategory },
      contract.pathwayRules,
      contract.defaultPathwayCode,
      mockStore.pathways
    );
    const nameParts = normalizePersianLetters(person.fullName.trim()).split(/\s+/);
    const firstName = nameParts[0] ?? person.fullName;
    const lastName = nameParts.slice(1).join(" ") || "—";
    const age = Number(person.age) || 35;
    const member: ContractMember = {
      id,
      contractId: contract.id,
      inviteToken: `CNT-${contract.id}-${1000 + id}`,
      personnelCode: person.personnelCode || `P-${1000 + id}`,
      firstName,
      lastName,
      fullName: normalizePersianLetters(person.fullName.trim()),
      nationalId: nid,
      phone: cleanDigits(person.phone) || person.phone,
      birthDate: `${new Date().getFullYear() - age}-01-01`,
      age,
      gender: person.gender === "زن" ? "زن" : "مرد",
      department: normalizePersianLetters(person.department || "عمومی"),
      jobCategory: normalizePersianLetters(person.jobCategory || "اداری و مالی"),
      source,
      assignedPathwayCode: pkg.pathwayCode,
      assignedPathwayTitle: pkg.pathwayTitle,
      matchedPathwayTitle: pkg.ruleTitle,
      manualPathwayOverride: false,
      onboardingStage: sendSmsNow ? "sms_sent" : "not_sent",
      profileProgressPct: 0,
      abandonedAtStep: null,
      formStatus: "none",
      intakeCompleted: false,
      smsInviteCount: sendSmsNow ? 1 : 0,
      lastSmsAt: sendSmsNow ? now : null,
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
    contract.members.push(member);
    addedNames.push(member.fullName);
  }

  if (sendSmsNow && addedNames.length > 0) {
    contract.smsLogs.unshift({
      id: `sms-${randomUUID().slice(0, 8)}`,
      sentAt: now,
      senderName,
      campaignTitle:
        source === "api"
          ? "پیامک خودکار تکمیل پروفایل (همگام‌سازی API)"
          : source === "excel"
            ? "پیامک تکمیل پروفایل (بارگذاری اکسل)"
            : "پیامک دعوت تکمیل پروفایل",
      audienceLabel: `${toFaDigits(addedNames.length)} نفر جدید اضافه‌شده`,
      messageTemplate:
        "همکار گرامی {نام}، اطلاعات شما در قرارداد پایش سلامت {شرکت} ثبت شد. لطفاً پروفایل و پرسشنامه پیش‌پذیرش خود را از طریق لینک اختصاصی {لینک} تکمیل فرمایید.",
      recipientCount: addedNames.length,
      recipientPreview: addedNames.slice(0, 5),
    });
  }

  return { added: addedNames.length, duplicates };
}

function fillQuotaForDay(
  contract: CorporateContract,
  quota: ContractDayQuota,
  sendCallSms: boolean,
  senderName: string
): { filledNow: number; alreadyAssigned: number; remainingCap: number; totalUnscheduled: number } {
  const now = new Date().toISOString();

  // Count everyone already assigned to this exact date who matches the day's quota scope
  const assignedToday = contract.members.filter(
    (m) =>
      m.scheduledDate === quota.date &&
      m.appointmentStatus !== "unscheduled" &&
      (quota.genderFilter === "همه" || m.gender === quota.genderFilter)
  );
  const alreadyAssigned = assignedToday.length;
  const openSlots = Math.max(0, quota.totalCap - alreadyAssigned);

  if (openSlots === 0) {
    const unscheduled = contract.members.filter((m) => m.appointmentStatus === "unscheduled").length;
    return { filledNow: 0, alreadyAssigned, remainingCap: 0, totalUnscheduled: unscheduled };
  }

  // Candidate pool: ONLY unscheduled members matching quota criteria (appointment is decoupled from pre-registration!)
  let pool = contract.members.filter((m) => {
    if (m.appointmentStatus !== "unscheduled") return false;
    if (quota.genderFilter !== "همه" && m.gender !== quota.genderFilter) return false;
    if (quota.minAge !== null && m.age < quota.minAge) return false;
    if (quota.maxAge !== null && m.age > quota.maxAge) return false;
    return true;
  });

  if (quota.fillFormula === "age_desc") {
    pool = [...pool].sort((a, b) => b.age - a.age);
  } else if (quota.fillFormula === "onboarded_first") {
    const rank = (s: OnboardingStage) =>
      s === "completed" ? 0 : s === "abandoned" ? 1 : s === "logged_in" ? 2 : s === "link_opened" ? 3 : 4;
    pool = [...pool].sort((a, b) => rank(a.onboardingStage) - rank(b.onboardingStage) || b.age - a.age);
  } else if (quota.fillFormula === "department_balanced") {
    // Round-robin across departments so no single department empties on one day
    const buckets = new Map<string, ContractMember[]>();
    for (const m of pool) {
      const list = buckets.get(m.department) ?? [];
      list.push(m);
      buckets.set(m.department, list);
    }
    const balanced: ContractMember[] = [];
    let added = true;
    while (added) {
      added = false;
      for (const list of buckets.values()) {
        const item = list.shift();
        if (item) {
          balanced.push(item);
          added = true;
        }
      }
    }
    pool = balanced;
  }

  const chosen = pool.slice(0, openSlots);
  const label = quota.persianLabel || formatPersianDateLabel(quota.date);
  for (const member of chosen) {
    member.appointmentStatus = "auto_scheduled";
    member.scheduledDate = quota.date;
    member.scheduledLabel = label;
    member.callSentAt = now;
    if (sendCallSms) {
      member.smsInviteCount += 1;
      member.lastSmsAt = now;
    }
  }

  if (sendCallSms && chosen.length > 0) {
    const formulaText = FILL_FORMULA_LABELS[quota.fillFormula];
    contract.smsLogs.unshift({
      id: `sms-${randomUUID().slice(0, 8)}`,
      sentAt: now,
      senderName,
      campaignTitle: `فراخوان خودکار نوبت ${label}`,
      audienceLabel: `${toFaDigits(chosen.length)} نفر (${quota.genderFilter === "همه" ? "زن و مرد" : `آقا/خانم: ${quota.genderFilter}`} · ${formulaText})`,
      messageTemplate: `همکار گرامی {نام}، نوبت پایش سلامت شما برای «${label}» با بسته «{پکیج}» رزرو شد. در صورت عدم تکمیل پیش‌ثبت‌نام: {لینک}`,
      recipientCount: chosen.length,
      recipientPreview: chosen.slice(0, 5).map((m) => m.fullName),
    });
  }

  const totalUnscheduled = contract.members.filter((m) => m.appointmentStatus === "unscheduled").length;
  return {
    filledNow: chosen.length,
    alreadyAssigned,
    remainingCap: Math.max(0, openSlots - chosen.length),
    totalUnscheduled,
  };
}

export const CONTRACT_ACTION_NAMES = new Set([
  "UPSERT_PATHWAY_LIBRARY_ITEM",
  "DELETE_PATHWAY_LIBRARY_ITEM",
  "ATTACH_PATHWAY_LIBRARY",
  "DETACH_CONTRACT_PATHWAY",
  "CREATE_CONTRACT",
  "UPDATE_CONTRACT",
  "UPDATE_CONTRACT_API",
  "UPDATE_CONTRACT_SUPERVISOR",
  "SYNC_CONTRACT_FROM_API",
  "IMPORT_CONTRACT_MEMBERS",
  "SAVE_CONTRACT_PATHWAY_RULES",
  "OVERRIDE_MEMBER_PATHWAY",
  "PREVIEW_PATHWAY_RECHECK",
  "APPLY_PATHWAY_RECHECK",
  "PIN_MEMBER_DATE",
  "UPSERT_DAY_QUOTA",
  "REMOVE_DAY_QUOTA",
  "RUN_DAY_AUTO_SCHEDULE",
  "AUTO_DISTRIBUTE_ALL_REMAINING",
  "CLEAR_DAY_AUTO_SCHEDULE",
  "SEND_CONTRACT_BULK_SMS",
  "UPDATE_MEMBER_ONBOARDING",
  "ADMIT_CONTRACT_MEMBER_TO_CLINIC",
]);

export function runContractAction(
  body: Record<string, any>,
  viewerRole: string | null
): { ok: boolean; status: number; error?: string; meta?: Record<string, unknown> } {
  const action = String(body.action ?? "");
  const now = new Date().toISOString();

  // Onboarding link updates can be triggered by the employee link itself or admin simulation
  if (action === "UPDATE_MEMBER_ONBOARDING") {
    const token = String(body.inviteToken ?? "").trim().toUpperCase();
    const contractId = Number(body.contractId);
    const memberId = Number(body.memberId);

    let targetMember: ContractMember | undefined;
    for (const c of mockStore.contracts) {
      if (token) {
        const m = c.members.find((item) => item.inviteToken.toUpperCase() === token);
        if (m) { targetMember = m; break; }
      } else if (c.id === contractId) {
        const m = c.members.find((item) => item.id === memberId);
        if (m) { targetMember = m; break; }
      }
    }
    if (!targetMember) return { ok: false, status: 404, error: "فرد مورد نظر در قرارداد یافت نشد." };

    const stage = String(body.stage ?? "") as OnboardingStage;
    targetMember.onboardingStage = stage;
    targetMember.lastActivityAt = now;
    if (stage === "sms_sent") {
      targetMember.smsInviteCount += 1;
      targetMember.lastSmsAt = now;
    } else if (stage === "link_opened") {
      targetMember.linkOpenedAt = targetMember.linkOpenedAt ?? now;
      targetMember.profileProgressPct = Math.max(targetMember.profileProgressPct, 5);
    } else if (stage === "logged_in") {
      targetMember.linkOpenedAt = targetMember.linkOpenedAt ?? now;
      targetMember.loggedInAt = targetMember.loggedInAt ?? now;
      targetMember.profileProgressPct = Math.max(targetMember.profileProgressPct, 15);
    } else if (stage === "abandoned") {
      targetMember.linkOpenedAt = targetMember.linkOpenedAt ?? now;
      targetMember.loggedInAt = targetMember.loggedInAt ?? now;
      targetMember.profileProgressPct = Math.min(95, Math.max(25, Number(body.progressPct) || 55));
      targetMember.abandonedAtStep = String(body.abandonedAtStep || "گام ۲ از ۴: داروهای مصرفی و حساسیت‌ها");
      targetMember.formStatus = "draft";
      targetMember.intakeCompleted = false;
      if (typeof body.draftSymptoms === "string") targetMember.draftSymptoms = body.draftSymptoms;
      if (typeof body.draftAllergies === "string") targetMember.draftAllergies = body.draftAllergies;
      if (typeof body.draftMedications === "string") targetMember.draftMedications = body.draftMedications;
    } else if (stage === "completed") {
      targetMember.linkOpenedAt = targetMember.linkOpenedAt ?? now;
      targetMember.loggedInAt = targetMember.loggedInAt ?? now;
      targetMember.profileCompletedAt = now;
      targetMember.profileProgressPct = 100;
      targetMember.abandonedAtStep = null;
      targetMember.formStatus = "submitted";
      targetMember.intakeCompleted = true;
      if (typeof body.draftSymptoms === "string") targetMember.draftSymptoms = body.draftSymptoms;
      if (typeof body.draftAllergies === "string") targetMember.draftAllergies = body.draftAllergies;
      if (typeof body.draftMedications === "string") targetMember.draftMedications = body.draftMedications;
    }
    return { ok: true, status: 200 };
  }

  // Corporate supervisor may only send reminder SMS if enabled on that contract
  if (viewerRole === "supervisor" && action !== "SEND_CONTRACT_BULK_SMS") {
    return { ok: false, status: 403, error: "ناظر سازمان فقط دسترسی نظارت، گزارش‌گیری و ارسال یادآوری دارد." };
  }
  if (viewerRole === "owner" || viewerRole === "patient") {
    return { ok: false, status: 403, error: "دسترسی به مدیریت قراردادهای سازمانی مجاز نیست." };
  }

  if (action === "UPSERT_PATHWAY_LIBRARY_ITEM") {
    const raw = body.rule ?? {};
    const title = String(raw.title ?? "").trim();
    const pathwayCode = String(raw.pathwayCode ?? "").trim();
    if (title.length < 3 || !pathwayCode) {
      return { ok: false, status: 400, error: "عنوان مسیر و قالب ایستگاهی مقصد را کامل وارد کنید." };
    }
    const gender: PathwayLibraryRule["gender"] = raw.gender === "مرد" ? "مرد" : raw.gender === "زن" ? "زن" : "همه";
    const minAge = raw.minAge !== "" && raw.minAge !== null && raw.minAge !== undefined ? Number(raw.minAge) : null;
    const maxAge = raw.maxAge !== "" && raw.maxAge !== null && raw.maxAge !== undefined ? Number(raw.maxAge) : null;
    const values = {
      title,
      description: String(raw.description ?? "").trim(),
      gender,
      minAge: Number.isFinite(minAge) ? minAge : null,
      maxAge: Number.isFinite(maxAge) ? maxAge : null,
      jobCategory: String(raw.jobCategory ?? "همه"),
      pathwayCode,
    };

    if (raw.id) {
      const existing = mockStore.libraryRuleById(String(raw.id));
      if (!existing) return { ok: false, status: 404, error: "مسیر کتابخانه یافت نشد." };
      Object.assign(existing, values);
      // Reflect the change on every contract rule sourced from this library rule.
      for (const contract of mockStore.contracts) {
        for (const rule of contract.pathwayRules) {
          if (rule.libraryRuleId !== existing.id) continue;
          Object.assign(rule, {
            title: values.title,
            gender: values.gender,
            minAge: values.minAge,
            maxAge: values.maxAge,
            jobCategory: values.jobCategory,
            pathwayCode: values.pathwayCode,
          });
        }
      }
      return { ok: true, status: 200, meta: { libraryRuleId: existing.id } };
    }

    const created: PathwayLibraryRule = {
      id: `lib-${Date.now()}`,
      code: `LR-${String(mockStore.pathwayLibrary.length + 1).padStart(3, "0")}`,
      createdAt: now,
      ...values,
    };
    mockStore.pathwayLibrary.push(created);
    return { ok: true, status: 200, meta: { libraryRuleId: created.id } };
  }

  if (action === "DELETE_PATHWAY_LIBRARY_ITEM") {
    const id = String(body.libraryRuleId ?? "");
    const index = mockStore.pathwayLibrary.findIndex((r) => r.id === id);
    if (index < 0) return { ok: false, status: 404, error: "مسیر کتابخانه یافت نشد." };
    mockStore.pathwayLibrary.splice(index, 1);
    for (const contract of mockStore.contracts) {
      for (const rule of contract.pathwayRules) {
        if (rule.libraryRuleId === id) rule.libraryRuleId = null;
      }
    }
    return { ok: true, status: 200 };
  }

  if (action === "ATTACH_PATHWAY_LIBRARY") {
    const contract = mockStore.contractById(Number(body.contractId));
    if (!contract) return { ok: false, status: 404, error: "قرارداد مورد نظر یافت نشد." };
    const ids: string[] = Array.isArray(body.libraryRuleIds) ? body.libraryRuleIds.map(String) : [];
    let added = 0;
    for (const ruleId of ids) {
      const libRule = mockStore.libraryRuleById(ruleId);
      if (!libRule) continue;
      if (contract.pathwayRules.some((r) => r.libraryRuleId === ruleId)) continue;
      contract.pathwayRules.push({
        id: `rule-${Date.now()}-${added}`,
        libraryRuleId: ruleId,
        title: libRule.title,
        gender: libRule.gender,
        minAge: libRule.minAge,
        maxAge: libRule.maxAge,
        jobCategory: libRule.jobCategory,
        pathwayCode: libRule.pathwayCode,
        priority: contract.pathwayRules.length + 1,
      });
      added++;
    }
    // Recompute package assignment for every non-overridden member.
    for (const member of contract.members) {
      if (member.manualPathwayOverride) continue;
      const pkg = resolveMemberPackage(
        { age: member.age, gender: member.gender, jobCategory: member.jobCategory },
        contract.pathwayRules,
        contract.defaultPathwayCode,
        mockStore.pathways
      );
      member.assignedPathwayCode = pkg.pathwayCode;
      member.assignedPathwayTitle = pkg.pathwayTitle;
      member.matchedPathwayTitle = pkg.ruleTitle;
    }
    return { ok: true, status: 200, meta: { addedCount: added, added } };
  }

  if (action === "DETACH_CONTRACT_PATHWAY") {
    const contract = mockStore.contractById(Number(body.contractId));
    if (!contract) return { ok: false, status: 404, error: "قرارداد مورد نظر یافت نشد." };
    const id = String(body.ruleId ?? "");
    contract.pathwayRules = contract.pathwayRules.filter((r) => r.id !== id).map((r, idx) => ({ ...r, priority: idx + 1 }));
    for (const member of contract.members) {
      if (member.manualPathwayOverride) continue;
      const pkg = resolveMemberPackage(
        { age: member.age, gender: member.gender, jobCategory: member.jobCategory },
        contract.pathwayRules,
        contract.defaultPathwayCode,
        mockStore.pathways
      );
      member.assignedPathwayCode = pkg.pathwayCode;
      member.assignedPathwayTitle = pkg.pathwayTitle;
      member.matchedPathwayTitle = pkg.ruleTitle;
    }
    return { ok: true, status: 200 };
  }

  if (action === "CREATE_CONTRACT") {
    const title = normalizePersianLetters(String(body.title ?? "").trim());
    const organizationName = normalizePersianLetters(String(body.organizationName ?? "").trim());
    const apiKey = String(body.apiKey ?? "").trim();
    const apiEndpoint =
      String(body.apiEndpoint ?? "").trim() || "https://hr-api.partner-org.ir/v1/employees";
    const defaultPathwayCode =
      String(body.defaultPathwayCode ?? "").trim() ||
      mockStore.pathways[0]?.code ||
      "FULL_CHECKUP";
    const supName = normalizePersianLetters(String(body.supervisorName ?? "").trim());
    const supPhone = cleanDigits(body.supervisorPhone);
    const supTitle = normalizePersianLetters(String(body.supervisorTitle ?? "").trim() || "نماینده و ناظر سلامت سازمان");

    if (title.length < 3 || organizationName.length < 2) {
      return { ok: false, status: 400, error: "عنوان قرارداد و نام سازمان را وارد کنید." };
    }
    if (supPhone && !/^09\d{9}$/.test(supPhone)) {
      return { ok: false, status: 400, error: "شماره موبایل ناظر خارجی باید ۱۱ رقم و با ۰۹ شروع شود." };
    }

    const id = nextContractId();
    const today = isoDayOffset(0);
    const defaultRules: ContractPathwayRule[] = Array.isArray(body.pathwayRules) && body.pathwayRules.length
      ? body.pathwayRules
      : [
          {
            id: `rule-${id}-1`,
            title: "افراد ۴۵ سال به بالا (چکاپ جامع)",
            gender: "همه",
            minAge: 45,
            maxAge: null,
            jobCategory: "همه",
            pathwayCode: "FULL_CHECKUP",
            priority: 1,
          },
          {
            id: `rule-${id}-2`,
            title: "بانوان زیر ۴۵ سال (پایش قلب و ریه)",
            gender: "زن",
            minAge: 18,
            maxAge: 44,
            jobCategory: "همه",
            pathwayCode: "CARDIO_PULMO",
            priority: 2,
          },
          {
            id: `rule-${id}-3`,
            title: "آقایان زیر ۴۵ سال",
            gender: "مرد",
            minAge: 18,
            maxAge: 44,
            jobCategory: "همه",
            pathwayCode: defaultPathwayCode,
            priority: 3,
          },
        ];

    const newContract: CorporateContract = {
      id,
      code: `CTR-1404-${100 + id}`,
      title,
      organizationName,
      status: "active",
      startDate: String(body.startDate || today),
      endDate: String(body.endDate || isoDayOffset(30)),
      apiEndpoint,
      apiKey: apiKey || `ORG-KEY-${1000 + id * 37}`,
      lastApiSyncAt: null,
      defaultPathwayCode,
      pathwayRules: defaultRules,
      dayQuotas: [
        {
          id: `q-${id}-1`,
          date: today,
          persianLabel: formatPersianDateLabel(today),
          totalCap: Number(body.initialDailyCap) || 15,
          genderFilter: "همه",
          minAge: null,
          maxAge: null,
          fillFormula: "age_desc",
          notes: "سهمیه روز اول قرارداد",
        },
      ],
      supervisor: {
        fullName: supName || "تعریف نشده",
        title: supTitle,
        phone: supPhone || "",
        nationalId: cleanDigits(body.supervisorNationalId),
        isActive: Boolean(supName && supPhone),
        canSendReminders: true,
        assignedAt: now,
        lastSeenAt: null,
      },
      smsLogs: [],
      members: [],
      createdAt: now,
    };

    mockStore.contracts.unshift(newContract);

    if (body.fetchFromApiNow) {
      const pool = EXTERNAL_HR_API_POOLS[newContract.apiKey] ?? EXTERNAL_HR_API_POOLS.DEFAULT;
      newContract.lastApiSyncAt = now;
      addMembersToContract(newContract, pool, "api", true, "ادمین کلینیک");
    }

    return { ok: true, status: 200, meta: { createdContractId: newContract.id } };
  }

  // Remaining actions target an existing contract
  const contract = mockStore.contractById(Number(body.contractId));
  if (!contract) return { ok: false, status: 404, error: "قرارداد مورد نظر یافت نشد." };

  if (action === "UPDATE_CONTRACT") {
    // Code پس از ایجاد قفل است؛ فقط عنوان/سازمان/بسته پیش‌فرض
    const title = normalizePersianLetters(String(body.title ?? "").trim());
    const organizationName = normalizePersianLetters(String(body.organizationName ?? "").trim());
    const defaultPathwayCode = String(body.defaultPathwayCode ?? "").trim();
    if (title.length < 3 || organizationName.length < 2) {
      return { ok: false, status: 400, error: "عنوان قرارداد و نام سازمان را وارد کنید." };
    }
    contract.title = title;
    contract.organizationName = organizationName;
    if (defaultPathwayCode) contract.defaultPathwayCode = defaultPathwayCode;
    return { ok: true, status: 200 };
  }

  if (action === "UPDATE_CONTRACT_API") {
    const apiKey = String(body.apiKey ?? "").trim();
    const apiEndpoint = String(body.apiEndpoint ?? "").trim();
    if (!apiKey) return { ok: false, status: 400, error: "کلید API قرارداد نمی‌تواند خالی باشد." };
    contract.apiKey = apiKey;
    if (apiEndpoint) contract.apiEndpoint = apiEndpoint;
    return { ok: true, status: 200 };
  }

  if (action === "UPDATE_CONTRACT_SUPERVISOR") {
    const fullName = normalizePersianLetters(String(body.fullName ?? "").trim());
    const phone = cleanDigits(body.phone);
    const title = normalizePersianLetters(String(body.title ?? "").trim() || "ناظر سلامت سازمان");
    if (fullName.length < 3 || !/^09\d{9}$/.test(phone)) {
      return { ok: false, status: 400, error: "نام کامل و شماره موبایل معتبر ۱۱ رقمی ناظر خارجی را وارد کنید." };
    }
    contract.supervisor = {
      fullName,
      title,
      phone,
      nationalId: cleanDigits(body.nationalId),
      isActive: body.isActive !== false,
      canSendReminders: body.canSendReminders !== false,
      assignedAt: now,
      lastSeenAt: contract.supervisor.lastSeenAt,
    };
    return { ok: true, status: 200 };
  }

  if (action === "SYNC_CONTRACT_FROM_API") {
    if (!contract.apiKey.trim()) {
      return { ok: false, status: 400, error: "ابتدا کلید API خارجی قرارداد را ثبت کنید." };
    }
    const pool = EXTERNAL_HR_API_POOLS[contract.apiKey.trim()] ?? EXTERNAL_HR_API_POOLS.DEFAULT;
    const sendSms = body.sendInviteSms !== false;
    const result = addMembersToContract(contract, pool, "api", sendSms, "ادمین کلینیک (API)");
    contract.lastApiSyncAt = now;
    return { ok: true, status: 200, meta: result };
  }

  if (action === "IMPORT_CONTRACT_MEMBERS") {
    const rows: ExternalApiPerson[] = Array.isArray(body.members) ? body.members : [];
    if (!rows.length) return { ok: false, status: 400, error: "هیچ ردیف معتبری برای ثبت یافت نشد." };
    const source = body.source === "manual" ? "manual" : "excel";
    const sendSms = body.sendInviteSms !== false;
    const result = addMembersToContract(contract, rows, source, sendSms, "ادمین کلینیک");
    return { ok: true, status: 200, meta: result };
  }

  if (action === "SAVE_CONTRACT_PATHWAY_RULES") {
    const rules: ContractPathwayRule[] = Array.isArray(body.pathwayRules) ? body.pathwayRules : [];
    // Optionally persist the newly authored rule to the central library for reuse.
    if (body.saveToLibrary) {
      const first = rules[0];
      if (first) {
        const libraryRuleId = first.libraryRuleId ?? `lib-${Date.now()}`;
        const libraryEntry: PathwayLibraryRule = {
          id: libraryRuleId,
          code: `LR-${String(mockStore.pathwayLibrary.length + 1).padStart(3, "0")}`,
          title: first.title,
          description: String(body.ruleDescription ?? "").trim() || "مسیر تعریف‌شده داخل قرارداد",
          gender: first.gender,
          minAge: first.minAge,
          maxAge: first.maxAge,
          jobCategory: first.jobCategory,
          pathwayCode: first.pathwayCode,
          createdAt: now,
        };
        const idx = mockStore.pathwayLibrary.findIndex((r) => r.id === libraryRuleId);
        if (idx >= 0) mockStore.pathwayLibrary[idx] = libraryEntry;
        else mockStore.pathwayLibrary.push(libraryEntry);
        rules[0] = { ...first, libraryRuleId };
      }
    }
    if (body.defaultPathwayCode) contract.defaultPathwayCode = String(body.defaultPathwayCode);
    contract.pathwayRules = rules.map((r, idx) => ({ ...r, priority: idx + 1 }));
    // skipMemberReapply: فقط اولویت؛ جابه‌جایی با PREVIEW/APPLY_PATHWAY_RECHECK
    if (body.skipMemberReapply !== true) {
      for (const member of contract.members) {
        if (member.manualPathwayOverride) continue;
        const pkg = resolveMemberPackage(
          { age: member.age, gender: member.gender, jobCategory: member.jobCategory },
          contract.pathwayRules,
          contract.defaultPathwayCode,
          mockStore.pathways
        );
        member.assignedPathwayCode = pkg.pathwayCode;
        member.assignedPathwayTitle = pkg.pathwayTitle;
        member.matchedPathwayTitle = pkg.ruleTitle;
      }
    }
    return { ok: true, status: 200 };
  }

  if (action === "OVERRIDE_MEMBER_PATHWAY") {
    const member = contract.members.find((m) => m.id === Number(body.memberId));
    const pathwayCode = String(body.pathwayCode ?? "").trim();
    const pathway = mockStore.pathways.find((p) => p.code === pathwayCode);
    if (!member || !pathwayCode) return { ok: false, status: 404, error: "فرد یا مسیر یافت نشد." };
    const pathwayTitle = String(body.pathwayTitle ?? "").trim() || pathway?.title || pathwayCode;
    member.assignedPathwayCode = pathwayCode;
    member.assignedPathwayTitle = pathway?.title ?? pathwayTitle;
    // عنوان سطل برای UI — همان عنوان انتخاب‌شده تا عضو فوراً در کارت درست دیده شود
    member.matchedPathwayTitle = pathwayTitle;
    member.manualPathwayOverride = true;
    return { ok: true, status: 200 };
  }

  if (action === "PREVIEW_PATHWAY_RECHECK") {
    const rows = contract.members.map((member) => {
      const proposed = resolveMemberPackage(
        { age: member.age, gender: member.gender, jobCategory: member.jobCategory },
        contract.pathwayRules,
        contract.defaultPathwayCode,
        mockStore.pathways
      );
      const wouldChange =
        (member.assignedPathwayCode || "") !== proposed.pathwayCode ||
        (member.matchedPathwayTitle || "") !== (proposed.ruleTitle || "");
      const admitted = Boolean(member.linkedPatientId);
      return {
        memberId: member.serverId || String(member.id),
        fullName: member.fullName,
        currentPathwayTitle: member.assignedPathwayTitle,
        proposedPathwayTitle: proposed.pathwayTitle,
        proposedMatchedTitle: proposed.ruleTitle,
        wouldChange,
        manualOverride: member.manualPathwayOverride,
        admitted,
        canApply: !admitted,
      };
    });
    return { ok: true, status: 200, meta: { rows } };
  }

  if (action === "APPLY_PATHWAY_RECHECK") {
    const idSet = new Set((Array.isArray(body.memberIds) ? body.memberIds : []).map((x: unknown) => String(x)));
    let applied = 0;
    let skipped = 0;
    for (const member of contract.members) {
      const key = member.serverId || String(member.id);
      if (!idSet.has(key) && !idSet.has(String(member.id))) continue;
      if (member.linkedPatientId) {
        skipped++;
        continue;
      }
      member.manualPathwayOverride = false;
      const pkg = resolveMemberPackage(
        { age: member.age, gender: member.gender, jobCategory: member.jobCategory },
        contract.pathwayRules,
        contract.defaultPathwayCode,
        mockStore.pathways
      );
      member.assignedPathwayCode = pkg.pathwayCode;
      member.assignedPathwayTitle = pkg.pathwayTitle;
      member.matchedPathwayTitle = pkg.ruleTitle;
      applied++;
    }
    return { ok: true, status: 200, meta: { applied, skipped } };
  }

  if (action === "PIN_MEMBER_DATE") {
    const member = contract.members.find((m) => m.id === Number(body.memberId));
    if (!member) return { ok: false, status: 404, error: "فرد مورد نظر یافت نشد." };
    const date = body.date ? String(body.date).trim() : "";
    if (!date) {
      member.appointmentStatus = "unscheduled";
      member.scheduledDate = null;
      member.scheduledLabel = null;
      member.callSentAt = null;
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { ok: false, status: 400, error: "تاریخ معتبر انتخاب کنید." };
      }
      member.appointmentStatus = "pinned";
      member.scheduledDate = date;
      member.scheduledLabel = formatPersianDateLabel(date);
      member.callSentAt = now;
    }
    return { ok: true, status: 200 };
  }

  if (action === "UPSERT_DAY_QUOTA") {
    const date = String(body.date ?? "").trim();
    const totalCap = Math.max(1, Number(body.totalCap) || 10);
    const genderFilter: "همه" | "مرد" | "زن" =
      body.genderFilter === "مرد" ? "مرد" : body.genderFilter === "زن" ? "زن" : "همه";
    const fillFormula = (
      ["age_desc", "onboarded_first", "roster_order", "department_balanced"].includes(String(body.fillFormula))
        ? body.fillFormula
        : "age_desc"
    ) as ContractDayQuota["fillFormula"];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false, status: 400, error: "تاریخ معتبر انتخاب کنید." };
    }
    const minAge = body.minAge !== "" && body.minAge !== null && body.minAge !== undefined ? Number(body.minAge) : null;
    const maxAge = body.maxAge !== "" && body.maxAge !== null && body.maxAge !== undefined ? Number(body.maxAge) : null;
    const existing = contract.dayQuotas.find((q) => q.id === body.quotaId || q.date === date);
    if (existing) {
      existing.date = date;
      existing.persianLabel = formatPersianDateLabel(date);
      existing.totalCap = totalCap;
      existing.genderFilter = genderFilter;
      existing.minAge = Number.isFinite(minAge) ? minAge : null;
      existing.maxAge = Number.isFinite(maxAge) ? maxAge : null;
      existing.fillFormula = fillFormula;
      existing.notes = normalizePersianInput(String(body.notes ?? ""));
    } else {
      contract.dayQuotas.push({
        id: `q-${randomUUID().slice(0, 8)}`,
        date,
        persianLabel: formatPersianDateLabel(date),
        totalCap,
        genderFilter,
        minAge: Number.isFinite(minAge) ? minAge : null,
        maxAge: Number.isFinite(maxAge) ? maxAge : null,
        fillFormula,
        notes: normalizePersianInput(String(body.notes ?? "")),
      });
      contract.dayQuotas.sort((a, b) => a.date.localeCompare(b.date));
    }
    return { ok: true, status: 200 };
  }

  if (action === "REMOVE_DAY_QUOTA") {
    contract.dayQuotas = contract.dayQuotas.filter((q) => q.id !== String(body.quotaId));
    return { ok: true, status: 200 };
  }

  if (action === "RUN_DAY_AUTO_SCHEDULE") {
    const quota = contract.dayQuotas.find((q) => q.id === String(body.quotaId));
    if (!quota) return { ok: false, status: 404, error: "سهمیه روز مورد نظر یافت نشد." };
    const stats = fillQuotaForDay(contract, quota, body.sendCallSms !== false, "راهبر سیستم (فراخوان سقفی)");
    return { ok: true, status: 200, meta: stats };
  }

  if (action === "AUTO_DISTRIBUTE_ALL_REMAINING") {
    const sorted = [...contract.dayQuotas].sort((a, b) => a.date.localeCompare(b.date));
    let totalFilled = 0;
    for (const quota of sorted) {
      const res = fillQuotaForDay(contract, quota, true, "راهبر سیستم (توزیع خودکار کل قرارداد)");
      totalFilled += res.filledNow;
    }
    const stillUnscheduled = contract.members.filter((m) => m.appointmentStatus === "unscheduled").length;
    return { ok: true, status: 200, meta: { totalFilled, stillUnscheduled } };
  }

  if (action === "CLEAR_DAY_AUTO_SCHEDULE") {
    const date = String(body.date ?? "");
    for (const m of contract.members) {
      // Keep manually pinned members intact; only release auto-scheduled slots
      if (m.scheduledDate === date && m.appointmentStatus === "auto_scheduled") {
        m.appointmentStatus = "unscheduled";
        m.scheduledDate = null;
        m.scheduledLabel = null;
        m.callSentAt = null;
      }
    }
    return { ok: true, status: 200 };
  }

  if (action === "SEND_CONTRACT_BULK_SMS") {
    if (viewerRole === "supervisor" && !contract.supervisor.canSendReminders) {
      return { ok: false, status: 403, error: "ارسال پیامک یادآوری برای ناظر این قرارداد فعال نیست." };
    }
    const targetIds: number[] = Array.isArray(body.memberIds) ? body.memberIds.map(Number) : [];
    const messageTemplate = normalizePersianInput(String(body.messageTemplate ?? "").trim());
    const campaignTitle = normalizePersianLetters(String(body.campaignTitle ?? "پیامک گروهی قرارداد").trim());
    const audienceLabel = normalizePersianLetters(String(body.audienceLabel ?? "گروه انتخابی").trim());
    if (!messageTemplate) return { ok: false, status: 400, error: "متن پیامک را وارد کنید." };

    const targets = contract.members.filter((m) => targetIds.includes(m.id));
    if (!targets.length) return { ok: false, status: 400, error: "هیچ گیرنده‌ای در این گروه وجود ندارد." };

    for (const member of targets) {
      member.smsInviteCount += 1;
      member.lastSmsAt = now;
      if (member.onboardingStage === "not_sent") {
        member.onboardingStage = "sms_sent";
      }
    }

    contract.smsLogs.unshift({
      id: `sms-${randomUUID().slice(0, 8)}`,
      sentAt: now,
      senderName:
        viewerRole === "supervisor"
          ? `${contract.supervisor.fullName} (ناظر ${contract.organizationName})`
          : "ادمین و راهبر سیستم",
      campaignTitle,
      audienceLabel,
      messageTemplate,
      recipientCount: targets.length,
      recipientPreview: targets.slice(0, 6).map((m) => m.fullName),
    });
    return { ok: true, status: 200, meta: { sentCount: targets.length } };
  }

  if (action === "ADMIT_CONTRACT_MEMBER_TO_CLINIC") {
    const member = contract.members.find((m) => m.id === Number(body.memberId));
    if (!member) return { ok: false, status: 404, error: "فرد مورد نظر در قرارداد یافت نشد." };
    if (member.linkedPatientId) {
      return { ok: true, status: 200, meta: { createdPatientId: member.linkedPatientId } };
    }
    const pathway =
      mockStore.pathways.find((p) => p.code === member.assignedPathwayCode) ?? mockStore.pathways[0];
    const codes = pathway?.stationCodes?.length ? pathway.stationCodes : ["LAB", "ECG", "CARDIO"];

    const created = mockMutations.insertPatient({
      qrToken: `NBZ-${contract.code}-${member.id}`,
      fullName: member.fullName,
      nationalId: member.nationalId,
      age: member.age,
      gender: member.gender,
      phone: member.phone,
      pathwayTitle: `${pathway.title} (${contract.organizationName})`,
      checkInTime: now,
      completedAt: null,
      // Corporate pre-registration is NOT the visit cancer questionnaire — always start incomplete.
      intakeCompleted: false,
      medications: member.draftMedications
        ? [{ id: `cm-${member.id}`, name: member.draftMedications, dosage: "طبق شرح حال", timing: "روزانه" }]
        : [],
      surgeries: [],
      familyHistory: [],
      allergies: member.draftAllergies
        ? [{ id: `ca-${member.id}`, substance: member.draftAllergies, category: "دارویی", reaction: "ثبت‌شده در پیش‌ثبت‌نام سازمانی", severity: "شدید" }]
        : [],
      recentConditions: [],
      intakeAnswers: {
        ...emptyIntakeAnswers,
        currentSymptoms: member.draftSymptoms || `پایش سلامت سازمانی — ${contract.organizationName} (${member.department})`,
      },
      formResponses: [],
      autoOpenWayfinding: false,
      journeyIntroSeen: false,
      homeLat: null,
      homeLon: null,
      homeAddress: null,
    });

    codes.forEach((code, idx) => {
      const room = mockStore.roomByCode(code);
      if (!room) return;
      mockMutations.insertStation({
        patientId: created.id,
        roomCode: room.code,
        roomName: room.name,
        category: room.category,
        stepOrder: idx + 1,
        status: idx === 0 ? "waiting" : "pending",
        enteredQueueAt: idx === 0 ? now : null,
        checkedInAt: null,
        startedAt: null,
        completedAt: null,
        spentMinutes: 0,
        addedByDoctor: null,
        queueRank: 0,
      });
    });

    mockMutations.insertAlert({
      patientId: created.id,
      senderRole: "پذیرش قراردادهای سازمانی",
      alertType: "general",
      message: `${member.fullName} عزیز (${contract.organizationName})، بسته «${pathway.title}» برای شما فعال شد.`,
      isRead: false,
      createdAt: now,
    });

    member.appointmentStatus = "checked_in";
    member.scheduledDate = member.scheduledDate ?? isoDayOffset(0);
    member.scheduledLabel = formatPersianDateLabel(member.scheduledDate);
    member.linkedPatientId = created.id;

    return { ok: true, status: 200, meta: { createdPatientId: created.id, qrToken: created.qrToken } };
  }

  return { ok: false, status: 400, error: "عملیات قرارداد نامعتبر است." };
}
