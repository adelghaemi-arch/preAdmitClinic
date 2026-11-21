/*
 File: frontend/src/components/CorporateContractsHub.tsx
 Description: هاب قرارداد سازمانی — رستر افراد، مسیر سلامتی (توزیع=مسیر)، نوبت‌دهی، قیف؛ پیامک قالبی
 Parent Dependencies: types/clinic.ts, mock-contracts.ts, contract-pathway-buckets.ts
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppInput, AppTextarea } from "@/components/AppInput";
import {
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Download,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  Info,
  KeyRound,
  Link2,
  Pencil,
  Pin,
  Plus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
  UserCog,
  UserPlus,
  Wand2,
  X,
} from "lucide-react";
import type {
  ClinicSnapshot,
  ContractDayQuota,
  ContractMember,
  ContractPathwayRule,
  PathwayLibraryRule,
} from "@/types/clinic";
import {
  APPOINTMENT_META,
  downloadContractExcelTemplate,
  exportContractReportExcel,
  FILL_FORMULA_LABELS,
  isoDayOffset,
  JOB_CATEGORIES,
  ONBOARDING_META,
  parseExcelOrCsvText,
  parseImportFile,
  finalizeImportParse,
  IMPORT_FIELD_LABELS,
  REQUIRED_IMPORT_FIELDS,
  type ImportPreviewRow,
  type ParseImportResult,
  type ColumnMapping,
  type ImportFieldKey,
} from "@/lib/mock-contracts";
import { fetchContractMembersAll, resolvePathwayDisplayTitle } from "@/lib/api/contracts";
import {
  buildContractPathwayBuckets,
  contractPathwayOverrideOptions,
  membersForPathwayBucket,
  reorderPathwayRulePriorities,
  sortedContractPathwayRules,
} from "@/lib/contract-pathway-buckets";
import {
  ageFromBirthIso,
  birthIsoToFaLabel,
  displayFullName,
  exactNationalIdDigits,
  isExactIranNationalId,
  isValidIranMobile,
  normalizeMobile,
} from "@/lib/person-identity";
import { ContractSearchSelect } from "@/components/ContractSearchSelect";
import { IranDigitField } from "@/components/IranDigitField";
import { ListPager, slicePage, type ListPageSize } from "@/components/ListPager";
import { canDeleteContractMember } from "@/lib/contract-member-guards";
import { MARITAL_STATUS_OPTIONS } from "@/lib/marital-status";
import { fetchSmsTemplates, type ApiSmsCampaignTemplateDto } from "@/lib/api/sms-templates";
import { formatFaTime, toFaDigits } from "@/lib/persian";
import { normalizeText, stationLabel } from "@/lib/workspace";
import { birthDateBounds, PersianDateField } from "@/components/PersianDateField";
import { iranLocalDayOffset } from "@/lib/date-iso";

type PeopleAddPanel = null | "manual" | "excel" | "api";

export type ContractHubTab = "people" | "packages" | "schedule" | "funnel";

interface Props {
  snapshot: ClinicSnapshot;
  initialTab?: ContractHubTab;
  onAction: (payload: Record<string, unknown>) => Promise<Record<string, unknown> | void>;
  onOpenPatientRecord: (patientId: number) => void;
  onSwitchToSupervisor: (contractId: number) => void;
  busy: boolean;
}

type PathwayRecheckRow = {
  memberId: string;
  fullName: string;
  currentPathwayTitle?: string | null;
  proposedPathwayTitle?: string | null;
  proposedMatchedTitle?: string | null;
  wouldChange: boolean;
  manualOverride: boolean;
  admitted: boolean;
  canApply: boolean;
};

type FunnelFilter =
  | "all"
  | "not_sent"
  | "sms_sent"
  | "opened_any"
  | "link_opened"
  | "logged_any"
  | "logged_in"
  | "abandoned"
  | "form_draft"
  | "completed";
type ApptFilter = "all" | "unscheduled" | "scheduled_any" | "today" | "pinned" | "auto_scheduled" | "visited";

const STEPS: Array<{ id: ContractHubTab; n: string; title: string; sub: string }> = [
  { id: "people", n: "۱", title: "افراد قرارداد", sub: "API خارجی، اکسل و ورود دستی" },
  { id: "packages", n: "۲", title: "مسیر سلامتی هر فرد", sub: "معیار سن، جنسیت و شغل" },
  { id: "schedule", n: "۳", title: "نوبت‌دهی و فراخوان", sub: "سقف روزانه و توزیع خودکار" },
  { id: "funnel", n: "۴", title: "پیگیری پیش‌ثبت‌نام", sub: "قیف تکمیل و پیامک گروهی" },
];

const GUIDE: Record<ContractHubTab, string> = {
  people: "در این مرحله افراد سازمان را وارد قرارداد می‌کنید؛ از API خارجی، فایل اکسل یا ثبت دستی. پس از دریافت، سامانه مسیر سلامتی مناسب هر نفر را می‌چسباند و برایش پیامک تکمیل پروفایل می‌فرستد.",
  packages: "عدد کمتر اولویت بالاتر است. تغییر اولویت به‌تنهایی اعضا را جابه‌جا نمی‌کند؛ برای جابه‌جایی از «بررسی مجدد مسیرها» استفاده کنید. مسیرها از کتابخانه قابل اتصال‌اند.",
  schedule: "در این مرحله برای هر روز سقف پذیرش و قانون توزیع را تعیین می‌کنید؛ افراد دستی فیکس می‌شوند و باقی ظرفیت به‌صورت خودکار از میان افراد بدون نوبت فراخوان می‌شود.",
  funnel: "در این مرحله می‌بینید چه کسانی لینک را باز کرده‌اند، چه کسانی پرسشنامه را شروع کرده یا تکمیل کرده‌اند؛ و می‌توانید برای گروه‌های موردنظر پیامک یادآوری بفرستید.",
};

export function CorporateContractsHub({ snapshot, initialTab = "people", onAction, onOpenPatientRecord, onSwitchToSupervisor, busy }: Props) {
  const contracts = snapshot.contracts ?? [];
  const library = snapshot.pathwayLibrary ?? [];
  const pathways = snapshot.pathways;
  const today = isoDayOffset(0);
  const [tab, setTab] = useState<ContractHubTab>(initialTab);
  const [selectedContractId, setSelectedContractId] = useState<number>(contracts[0]?.id ?? 0);
  const [banner, setBanner] = useState("");
  // راهنمای مرحله فقط با i زیر ریل؛ نه بنر دائمی و نه popover داخل overflow
  const [guideOpen, setGuideOpen] = useState(false);
  /** اعضا فقط برای قرارداد انتخاب‌شده — نه N+1 در bootstrap همهٔ قراردادها */
  const [membersOverride, setMembersOverride] = useState<ContractMember[] | null>(null);
  const [membersBusy, setMembersBusy] = useState(false);
  /** اولویت مسیر — به‌روزرسانی فوری UI قبل از برگشت snapshot */
  const [pathwayRulesOverride, setPathwayRulesOverride] = useState<ContractPathwayRule[] | null>(null);
  const [funnelPage, setFunnelPage] = useState(1);
  const [funnelPageSize, setFunnelPageSize] = useState<ListPageSize>(20);
  const [schedulePage, setSchedulePage] = useState(1);
  const [schedulePageSize, setSchedulePageSize] = useState<ListPageSize>(20);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peoplePage, setPeoplePage] = useState(1);
  const [peoplePageSize, setPeoplePageSize] = useState<ListPageSize>(20);
  const [peoplePanel, setPeoplePanel] = useState<PeopleAddPanel>(null);
  // بعد از hydrate seed، اگر id قبلی در لیست نبود اولین قرارداد را انتخاب کن
  useEffect(() => {
    if (!contracts.length) return;
    if (!contracts.some((c) => c.id === selectedContractId)) setSelectedContractId(contracts[0].id);
  }, [contracts, selectedContractId]);

  useEffect(() => {
    if (!guideOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGuideOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [guideOpen]);

  const baseContract = contracts.find((c) => c.id === selectedContractId) ?? contracts[0];
  const pathwayRulesSignature = (baseContract?.pathwayRules ?? [])
    .map((r) => `${r.id}:${r.priority}`)
    .join("|");

  useEffect(() => {
    setPathwayRulesOverride(null);
  }, [baseContract?.serverId, pathwayRulesSignature]);

  useEffect(() => {
    if (!baseContract?.serverId) {
      setMembersOverride(null);
      return;
    }
    let cancelled = false;
    setMembersBusy(true);
    void fetchContractMembersAll(baseContract.serverId)
      .then((rows) => {
        if (!cancelled) setMembersOverride(rows);
      })
      .catch(() => {
        if (!cancelled) setMembersOverride([]);
      })
      .finally(() => {
        if (!cancelled) setMembersBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseContract?.serverId, snapshot.serverTime]);

  const contract = useMemo(() => {
    if (!baseContract) return undefined;
    const members = membersOverride ?? [];
    return {
      ...baseContract,
      pathwayRules: pathwayRulesOverride ?? baseContract.pathwayRules,
      members,
      memberCount: membersOverride?.length ?? baseContract.memberCount ?? 0,
    };
  }, [baseContract, membersOverride, pathwayRulesOverride]);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOrg, setNewOrg] = useState("");
  const [newEndpoint, setNewEndpoint] = useState("https://hr-api.company.ir/v1/health-list");
  const [newApiKey, setNewApiKey] = useState("CORP-API-1404-7721");
  const [newDefaultPkg, setNewDefaultPkg] = useState(pathways[0]?.code ?? "FULL_CHECKUP");
  const [newDailyCap, setNewDailyCap] = useState("20");
  const [newSupName, setNewSupName] = useState("");
  const [newSupTitle, setNewSupTitle] = useState("مدیر منابع انسانی و رفاه");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [fetchNowOnCreate, setFetchNowOnCreate] = useState(true);
  // ویرایش مشخصات پایه قرارداد انتخاب‌شده (Code قفل؛ API/ناظر مسیر جدا)
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editOrg, setEditOrg] = useState("");
  const [editDefaultPkg, setEditDefaultPkg] = useState(pathways[0]?.code ?? "FULL_CHECKUP");
  const [sendSmsOnImport, setSendSmsOnImport] = useState(true);
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [apiEditOpen, setApiEditOpen] = useState(false);
  const [editApiKey, setEditApiKey] = useState("");
  const [editEndpoint, setEditEndpoint] = useState("");
  const [supEditOpen, setSupEditOpen] = useState(false);
  const [supFirstName, setSupFirstName] = useState("");
  const [supLastName, setSupLastName] = useState("");
  const [supTitle, setSupTitle] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supCanSms, setSupCanSms] = useState(true);
  const [mFirstName, setMFirstName] = useState("");
  const [mLastName, setMLastName] = useState("");
  const [mNid, setMNid] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mBirthDate, setMBirthDate] = useState("");
  const [mGender, setMGender] = useState<"مرد" | "زن">("مرد");
  const [mMarital, setMMarital] = useState("");
  const [mDept, setMDept] = useState("");
  const [mCat, setMCat] = useState("");
  const [excelPreview, setExcelPreview] = useState<ParseImportResult | null>(null);
  const [columnMappingDraft, setColumnMappingDraft] = useState<ColumnMapping>({});
  const [importResults, setImportResults] = useState<ImportPreviewRow[] | null>(null);
  const [editingMember, setEditingMember] = useState<ContractMember | null>(null);
  const [eFirstName, setEFirstName] = useState("");
  const [eLastName, setELastName] = useState("");
  const [eNid, setENid] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eBirthDate, setEBirthDate] = useState("");
  const [eGender, setEGender] = useState<"مرد" | "زن">("مرد");
  const [eMarital, setEMarital] = useState("");
  const [eDept, setEDept] = useState("");
  const [eCat, setECat] = useState("");
  const [ePersonnel, setEPersonnel] = useState("");

  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleGender, setRuleGender] = useState<"همه" | "مرد" | "زن">("مرد");
  const [ruleMinAge, setRuleMinAge] = useState("40");
  const [ruleMaxAge, setRuleMaxAge] = useState("");
  const [ruleJobCat, setRuleJobCat] = useState("همه");
  const [rulePathway, setRulePathway] = useState(pathways[0]?.code ?? "FULL_CHECKUP");
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [editingLibRule, setEditingLibRule] = useState<PathwayLibraryRule | null>(null);
  const [libQuery, setLibQuery] = useState("");
  // مشاهده فقط‌خواندنی مسیر فعال + افراد متصل (بدون mutate)
  const [viewingRule, setViewingRule] = useState<ContractPathwayRule | null>(null);
  const [ruleMemberQuery, setRuleMemberQuery] = useState("");
  // ساخت/ویرایش مسیر و انتخاب از کتابخانه در مودال — نه ستون جدا
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  // سطل مسیر انتخاب‌شده (پیش‌فرض یا قانون) — لیست اعضا زیر همان کارت
  const [selectedPathwayBucketId, setSelectedPathwayBucketId] = useState<string | null>(null);
  const [recheckOpen, setRecheckOpen] = useState(false);
  const [recheckRows, setRecheckRows] = useState<PathwayRecheckRow[]>([]);
  const [recheckSelected, setRecheckSelected] = useState<Set<string>>(new Set());

  const [qDate, setQDate] = useState(today);
  const [qCap, setQCap] = useState("20");
  const [qGender, setQGender] = useState<"همه" | "مرد" | "زن">("مرد");
  const [qFormula, setQFormula] = useState<ContractDayQuota["fillFormula"]>("age_desc");
  const [qNotes, setQNotes] = useState("");
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<"all" | "unscheduled" | "scheduled">("all");
  const [pinDateDraft, setPinDateDraft] = useState(today);

  const [funnelFilter, setFunnelFilter] = useState<FunnelFilter>("all");
  const [apptFilter, setApptFilter] = useState<ApptFilter>("all");
  const [memberSearch, setMemberSearch] = useState("");
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<ApiSmsCampaignTemplateDto[]>([]);
  const [smsTemplateId, setSmsTemplateId] = useState("");
  const [smsHistoryOpen, setSmsHistoryOpen] = useState(false);
  const [smsPreviewOpen, setSmsPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSmsTemplates(true)
      .then((rows) => {
        if (cancelled) return;
        const usable = rows.filter((t) => t.availableForSend);
        setSmsTemplates(usable);
        setSmsTemplateId((prev) => {
          if (prev && usable.some((t) => t.id === prev)) return prev;
          return usable.find((t) => t.code === "invite_register")?.id ?? usable[0]?.id ?? "";
        });
      })
      .catch(() => {
        if (!cancelled) setSmsTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSmsTemplate = useMemo(
    () => smsTemplates.find((t) => t.id === smsTemplateId) ?? null,
    [smsTemplates, smsTemplateId]
  );

  const pickSmsTemplateByCode = (code: string) => {
    const hit = smsTemplates.find((t) => t.code === code);
    if (hit) setSmsTemplateId(hit.id);
  };

  const flash = (msg: string) => { setBanner(msg); setTimeout(() => setBanner(""), 5500); };
  type ActionResult = {
    ok?: boolean;
    added?: number;
    duplicates?: number;
    rejected?: number;
    results?: Array<{ firstName: string; lastName: string; nationalId: string; status: string; reason?: string | null }>;
    filledNow?: number;
    alreadyAssigned?: number;
    totalUnscheduled?: number;
    totalFilled?: number;
    stillUnscheduled?: number;
    libraryRuleId?: string;
    createdContractId?: number;
    createdPatientId?: string | number;
    recalculated?: number;
    needsManual?: number;
  };
  const run = async (payload: Record<string, unknown>): Promise<ActionResult> => {
    return ((await onAction(payload)) ?? {}) as ActionResult;
  };

  const movePathwayPriority = async (ruleId: string, direction: "up" | "down") => {
    if (!contract?.serverId) {
      flash("شناسه سرور قرارداد موجود نیست؛ صفحه را تازه کنید.");
      return;
    }
    const before = sortedContractPathwayRules(contract.pathwayRules).map((r) => r.id).join("|");
    const next = reorderPathwayRulePriorities(contract.pathwayRules, ruleId, direction);
    if (before === next.map((r) => r.id).join("|")) return;
    setPathwayRulesOverride(next);
    try {
      await run({
        action: "SAVE_CONTRACT_PATHWAY_RULES",
        contractId: contract.id,
        contractServerId: contract.serverId,
        saveToLibrary: false,
        skipMemberReapply: true,
        pathwayRules: next,
      });
      flash("اولویت مسیر به‌روز شد؛ برای جابه‌جایی اعضا «بررسی مجدد» بزنید.");
    } catch (err) {
      setPathwayRulesOverride(null);
      flash(err instanceof Error ? err.message : "جابه‌جایی اولویت ناموفق بود.");
    }
  };

  const birthBounds = birthDateBounds(iranLocalDayOffset(0));

  const openEditMember = (m: ContractMember) => {
    setEditingMember(m);
    setEFirstName(m.firstName);
    setELastName(m.lastName);
    setENid(m.nationalId);
    setEPhone(m.phone);
    setEBirthDate(m.birthDate ?? "");
    setEGender(m.gender);
    setEMarital(m.maritalStatus ?? "");
    setEDept(m.department);
    setECat(m.jobCategory);
    setEPersonnel(m.personnelCode);
  };

  const deleteMember = async (m: ContractMember) => {
    if (!canDeleteContractMember(m)) {
      flash("حذف فقط قبل از ورود به پیش‌پذیرش مجاز است.");
      return;
    }
    if (!m.serverId) {
      flash("شناسه سرور عضو موجود نیست.");
      return;
    }
    if (!window.confirm(`«${m.fullName}» از این قرارداد حذف شود؟`)) return;
    await run({ action: "DELETE_CONTRACT_MEMBER", contractId: contract?.id, memberServerId: m.serverId });
    flash(`«${m.fullName}» از قرارداد حذف شد.`);
    setCheckedIds((prev) => prev.filter((id) => id !== m.id));
  };

  const stats = useMemo(() => {
    if (!contract) return null;
    const m = contract.members;
    const countStage = (stage: string) => m.filter((x) => x.onboardingStage === stage).length;
    return {
      total: m.length,
      notSent: countStage("not_sent"),
      smsSentOnly: countStage("sms_sent"),
      openedAny: m.filter((x) => ["link_opened", "logged_in", "abandoned", "completed"].includes(x.onboardingStage)).length,
      linkOpenedOnly: countStage("link_opened"),
      loggedAny: m.filter((x) => ["logged_in", "abandoned", "completed"].includes(x.onboardingStage)).length,
      loggedInOnly: countStage("logged_in"),
      abandoned: countStage("abandoned"),
      // شروع پرسشنامه (draft) — مستقل از badge SMS
      formDraft: m.filter((x) => x.formStatus === "draft" || (x.onboardingStage === "abandoned" && x.formStatus !== "submitted")).length,
      formSubmitted: m.filter((x) => x.formStatus === "submitted" || x.onboardingStage === "completed").length,
      completed: countStage("completed"),
      unscheduled: m.filter((x) => x.appointmentStatus === "unscheduled").length,
      scheduledToday: m.filter((x) => x.scheduledDate === today && x.appointmentStatus !== "unscheduled").length,
      menUnscheduled: m.filter((x) => x.appointmentStatus === "unscheduled" && x.gender === "مرد").length,
      womenUnscheduled: m.filter((x) => x.appointmentStatus === "unscheduled" && x.gender === "زن").length,
    };
  }, [contract, today]);

  const filteredFunnelMembers = useMemo(() => {
    if (!contract) return [];
    const q = normalizeText(memberSearch.trim());
    return contract.members.filter((x) => {
      if (q && !normalizeText(`${x.fullName} ${x.nationalId} ${x.phone} ${x.department} ${x.personnelCode} ${x.assignedPathwayTitle}`).includes(q)) return false;
      const s = x.onboardingStage;
      if (funnelFilter === "not_sent" && s !== "not_sent") return false;
      if (funnelFilter === "sms_sent" && s !== "sms_sent") return false;
      if (funnelFilter === "opened_any" && !["link_opened", "logged_in", "abandoned", "completed"].includes(s)) return false;
      if (funnelFilter === "link_opened" && s !== "link_opened") return false;
      if (funnelFilter === "logged_any" && !["logged_in", "abandoned", "completed"].includes(s)) return false;
      if (funnelFilter === "logged_in" && s !== "logged_in") return false;
      if (funnelFilter === "abandoned" && s !== "abandoned") return false;
      if (funnelFilter === "form_draft" && x.formStatus !== "draft" && !(s === "abandoned" && x.formStatus !== "submitted")) return false;
      if (funnelFilter === "completed" && s !== "completed" && x.formStatus !== "submitted") return false;
      const a = x.appointmentStatus;
      if (apptFilter === "unscheduled" && a !== "unscheduled") return false;
      if (apptFilter === "scheduled_any" && a === "unscheduled") return false;
      if (apptFilter === "today" && (x.scheduledDate !== today || a === "unscheduled")) return false;
      if (apptFilter === "pinned" && a !== "pinned") return false;
      if (apptFilter === "auto_scheduled" && a !== "auto_scheduled") return false;
      if (apptFilter === "visited" && a !== "checked_in" && a !== "visit_done") return false;
      return true;
    });
  }, [contract, memberSearch, funnelFilter, apptFilter, today]);

  const smsRecipients = useMemo(() => {
    if (!contract) return [] as ContractMember[];
    return checkedIds.length > 0
      ? contract.members.filter((m) => checkedIds.includes(m.id))
      : filteredFunnelMembers;
  }, [contract, checkedIds, filteredFunnelMembers]);

  const smsSamplePreview = useMemo(() => {
    const body = selectedSmsTemplate?.bodyPreview ?? "";
    if (!body) return "";
    const sample = smsRecipients[0];
    const name = sample?.fullName?.trim() || "نام نمونه";
    const inviteToken = sample?.inviteToken?.trim() || "ABC123";
    const inviteUrl = `https://my.example/?invite=${inviteToken}`;
    return body
      .replaceAll("{name}", name)
      .replaceAll("{invite_token}", inviteToken)
      .replaceAll("{invite_url}", inviteUrl)
      .replaceAll("{emr_url}", "— (لینک پرونده هنوز فعال نیست)");
  }, [selectedSmsTemplate, smsRecipients]);

  const sendBulkSms = async () => {
    if (!contract?.serverId) { flash("شناسه سرور قرارداد موجود نیست."); return; }
    const memberServerIds = smsRecipients.map((m) => m.serverId).filter((id): id is string => Boolean(id));
    if (!memberServerIds.length) { flash("هیچ گیرنده‌ای با شناسه سرور یافت نشد."); return; }
    if (!smsTemplateId) { flash("یک قالب پیامک انتخاب کنید."); return; }
    await run({
      action: "SEND_CONTRACT_BULK_SMS",
      contractId: contract.id,
      contractServerId: contract.serverId,
      memberServerIds,
      templateId: smsTemplateId,
      campaignTitle: selectedSmsTemplate?.title ?? "",
      audienceLabel: checkedIds.length > 0 ? `${toFaDigits(checkedIds.length)} نفر انتخاب دستی` : "گروه فیلتر شده",
    });
    setCheckedIds([]);
    setSmsPreviewOpen(false);
    flash(`پیامک گروهی برای ${toFaDigits(memberServerIds.length)} نفر ارسال شد.`);
  };

  // با تغییر فیلتر، صفحه به اول برگردد
  useEffect(() => {
    setFunnelPage(1);
  }, [memberSearch, funnelFilter, apptFilter, selectedContractId]);
  useEffect(() => {
    setSchedulePage(1);
  }, [scheduleSearch, scheduleFilter, selectedContractId]);
  useEffect(() => {
    setPeoplePage(1);
  }, [peopleSearch, selectedContractId]);

  const pagedFunnelMembers = useMemo(
    () => slicePage(filteredFunnelMembers, funnelPage, funnelPageSize),
    [filteredFunnelMembers, funnelPage, funnelPageSize]
  );

  const scheduleMembers = useMemo(() => {
    if (!contract) return [];
    const q = normalizeText(scheduleSearch.trim());
    return contract.members.filter((x) => {
      if (scheduleFilter === "unscheduled" && x.appointmentStatus !== "unscheduled") return false;
      if (scheduleFilter === "scheduled" && x.appointmentStatus === "unscheduled") return false;
      return !q || normalizeText(`${x.fullName} ${x.nationalId} ${x.phone} ${x.department} ${x.gender}`).includes(q);
    });
  }, [contract, scheduleSearch, scheduleFilter]);

  const pagedScheduleMembers = useMemo(
    () => slicePage(scheduleMembers, schedulePage, schedulePageSize),
    [scheduleMembers, schedulePage, schedulePageSize]
  );

  const peopleMembers = useMemo(() => {
    if (!contract) return [];
    const q = normalizeText(peopleSearch.trim());
    return contract.members.filter((x) =>
      !q || normalizeText(`${x.fullName} ${x.nationalId} ${x.phone} ${x.department} ${x.personnelCode}`).includes(q)
    );
  }, [contract, peopleSearch]);

  const pagedPeopleMembers = useMemo(
    () => slicePage(peopleMembers, peoplePage, peoplePageSize),
    [peopleMembers, peoplePage, peoplePageSize]
  );

  const attachedLibraryIds = useMemo(() => new Set((contract?.pathwayRules ?? []).map((r) => r.libraryRuleId).filter(Boolean) as string[]), [contract]);
  const pathwayBuckets = useMemo(
    () => (contract ? buildContractPathwayBuckets(contract, pathways) : []),
    [contract, pathways]
  );
  const pathwayOverrideOptions = useMemo(
    () => (contract ? contractPathwayOverrideOptions(contract, pathways) : []),
    [contract, pathways]
  );
  const visibleLibrary = useMemo(() => {
    const q = normalizeText(libQuery.trim());
    // code هم جستجو می‌شود تا LR-001 و مشابه در API mode کار کند
    return library.filter(
      (r) =>
        !q ||
        normalizeText(`${r.title} ${r.description} ${r.code} ${r.jobCategory} ${r.gender} ${r.pathwayCode}`).includes(q)
    );
  }, [library, libQuery]);

  // افراد متصل به مسیر در حال مشاهده — پیوند منطقی همان matchedPathwayTitle است
  const viewingRuleMembers = useMemo(() => {
    if (!viewingRule || !contract) return [];
    const matched = contract.members.filter((m) => m.matchedPathwayTitle === viewingRule.title);
    const q = normalizeText(ruleMemberQuery.trim());
    if (!q) return matched;
    return matched.filter((m) =>
      normalizeText(`${m.fullName} ${m.firstName} ${m.lastName} ${m.nationalId} ${m.personnelCode} ${m.department} ${m.jobCategory}`).includes(q)
    );
  }, [viewingRule, contract, ruleMemberQuery]);

  const viewingRuleLib = viewingRule?.libraryRuleId
    ? library.find((r) => r.id === viewingRule.libraryRuleId)
    : undefined;
  const viewingRulePkg = viewingRule
    ? pathways.find((p) => p.code === viewingRule.pathwayCode)
    : undefined;

  const openEditContract = () => {
    if (!baseContract) return;
    setEditTitle(baseContract.title);
    setEditOrg(baseContract.organizationName);
    setEditDefaultPkg(baseContract.defaultPathwayCode || pathways[0]?.code || "FULL_CHECKUP");
    setEditOpen(true);
  };

  const createModal = createOpen && (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="تعریف قرارداد سازمانی جدید" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold text-slate-800">تعریف قرارداد سازمانی جدید</h2><button type="button" onClick={() => setCreateOpen(false)} aria-label="بستن"><X className="h-4 w-4 text-slate-400" /></button></div>
        <form onSubmit={async (e) => { e.preventDefault(); const r = (await run({ action: "CREATE_CONTRACT", title: newTitle, organizationName: newOrg, apiEndpoint: newEndpoint, apiKey: newApiKey, defaultPathwayCode: newDefaultPkg, initialDailyCap: Number(newDailyCap) || 20, supervisorName: newSupName, supervisorTitle: newSupTitle, supervisorPhone: normalizeMobile(newSupPhone), fetchFromApiNow: fetchNowOnCreate })) as { createdContractId?: number }; if (r?.createdContractId) setSelectedContractId(Number(r.createdContractId)); setCreateOpen(false); setNewTitle(""); setNewOrg(""); setNewSupName(""); setNewSupPhone(""); flash(fetchNowOnCreate ? "قرارداد ساخته شد." : "قرارداد جدید ثبت شد."); }} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2"><label className="app-label">نام سازمان<AppInput required value={newOrg} onChange={(e) => setNewOrg(e.target.value)} placeholder="مثلاً: شرکت فولاد مبارکه" className="app-input mt-1 text-xs" /></label><label className="app-label">عنوان قرارداد<AppInput required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="پایش سلامت سالانه" className="app-input mt-1 text-xs" /></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="app-label">آدرس API خارجی<AppInput dir="ltr" value={newEndpoint} onChange={(e) => setNewEndpoint(e.target.value)} className="app-input mt-1 font-mono text-left text-xs" /></label><label className="app-label">کلید API قرارداد<AppInput dir="ltr" value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)} className="app-input mt-1 font-mono text-left text-xs" /></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="app-label">مسیر پایه پیش‌فرض{pathways.length > 0 ? <select value={newDefaultPkg} onChange={(e) => setNewDefaultPkg(e.target.value)} className="app-select mt-1 w-full text-xs">{pathways.map((p) => <option key={p.code} value={p.code}>{p.title}</option>)}</select> : <AppInput value={newDefaultPkg} onChange={(e) => setNewDefaultPkg(e.target.value)} className="app-input mt-1 text-xs" />}</label><label className="app-label">سقف پذیرش روزانه<AppInput type="number" min={1} value={newDailyCap} onChange={(e) => setNewDailyCap(e.target.value)} className="app-input mt-1 text-xs" /></label></div>
          <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5"><div className="text-xs font-semibold text-amber-900">ناظر خارجی شرکت</div><div className="grid gap-2 sm:grid-cols-3"><AppInput value={newSupName} onChange={(e) => setNewSupName(e.target.value)} placeholder="نام ناظر" className="app-input text-xs" /><AppInput value={newSupTitle} onChange={(e) => setNewSupTitle(e.target.value)} placeholder="سمت" className="app-input text-xs" /><IranDigitField kind="mobile" value={newSupPhone} onValueChange={setNewSupPhone} placeholder="موبایل: 0912..." className="app-input font-mono text-left text-xs" /></div></div>
          <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={fetchNowOnCreate} onChange={(e) => setFetchNowOnCreate(e.target.checked)} className="accent-teal-700" />دریافت فوری لیست افراد از API و ارسال پیامک تکمیل پروفایل (در این موج پس از ایجاد نادیده گرفته می‌شود)</label>
          <button type="submit" disabled={busy} className="primary-button w-full justify-center py-3">ایجاد قرارداد</button>
        </form>
      </div>
    </div>
  );

  const editModal = editOpen && contract && (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setEditOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="ویرایش قرارداد سازمانی" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">ویرایش قرارداد</h2>
          <button type="button" onClick={() => setEditOpen(false)} aria-label="بستن"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await run({
              action: "UPDATE_CONTRACT",
              contractId: contract.id,
              contractServerId: contract.serverId,
              title: editTitle,
              organizationName: editOrg,
              defaultPathwayCode: editDefaultPkg,
            });
            setEditOpen(false);
            flash("مشخصات قرارداد به‌روزرسانی شد.");
          }}
          className="space-y-3.5"
        >
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            کد قرارداد: <code dir="ltr" className="font-mono font-semibold text-slate-700">{contract.code}</code>
            <span className="mr-2 text-[10px] text-slate-400">(غیرقابل تغییر)</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="app-label">نام سازمان<AppInput required value={editOrg} onChange={(e) => setEditOrg(e.target.value)} className="app-input mt-1 text-xs" /></label>
            <label className="app-label">عنوان قرارداد<AppInput required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="app-input mt-1 text-xs" /></label>
          </div>
          <label className="app-label">مسیر پایه پیش‌فرض
            {pathways.length > 0 ? (
              <select value={editDefaultPkg} onChange={(e) => setEditDefaultPkg(e.target.value)} className="app-select mt-1 w-full text-xs">
                {pathways.map((p) => <option key={p.code} value={p.code}>{p.title}</option>)}
              </select>
            ) : (
              <AppInput value={editDefaultPkg} onChange={(e) => setEditDefaultPkg(e.target.value)} className="app-input mt-1 text-xs" />
            )}
          </label>
          <p className="text-[11px] leading-5 text-slate-400">API خارجی و ناظر سازمان از تب‌های مربوط در همان قرارداد ویرایش می‌شوند.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="primary-button flex-1 justify-center">ذخیره تغییرات</button>
            <button type="button" onClick={() => setEditOpen(false)} className="secondary-button">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );

  // مودال باید حتی در empty-state mount شود؛ early-return قبلی createOpen را بی‌اثر می‌کرد
  if (!contract || !stats) {
    return (
      <>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-teal-600" />
          <h2 className="mt-3 text-base font-bold text-slate-800">هنوز قراردادی تعریف نشده است</h2>
          <button type="button" onClick={() => setCreateOpen(true)} className="primary-button mt-4">
            <Plus className="h-4 w-4" />
            تعریف اولین قرارداد سازمانی
          </button>
        </div>
        {createModal}
      </>
    );
  }

  const stepChip: Record<ContractHubTab, string> = {
    people: `${toFaDigits(stats.total)} نفر`,
    packages: `${toFaDigits(contract.pathwayRules.length)} مسیر`,
    schedule: `${toFaDigits(stats.unscheduled)} بدون نوبت`,
    funnel: `${toFaDigits(stats.abandoned)} رهاکرده`,
  };

  return (
    <div className="module-content space-y-5">
      <div className="overflow-hidden rounded-2xl border border-[#dce8e1] bg-white shadow-[0_1px_2px_rgba(26,67,48,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eef3f0] bg-[#f7fbf8] px-4 py-2.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#3f6e58]">
            <Building2 className="h-4 w-4 text-teal-600" />
            قرارداد فعال
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200/80">
              {toFaDigits(contracts.length)} قرارداد
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openEditContract}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              ویرایش قرارداد
            </button>
            <button type="button" onClick={() => setCreateOpen(true)} className="primary-button !py-1.5 !text-[11px]">
              <Plus className="h-3.5 w-3.5" />
              قرارداد جدید
            </button>
          </div>
        </div>
        <div className="space-y-3 px-4 py-3.5">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold tracking-wide text-slate-400">انتخاب سازمان / قرارداد</span>
            <ContractSearchSelect
              contracts={contracts}
              value={contract.id}
              onChange={(id) => {
                setSelectedContractId(id);
                setCheckedIds([]);
                setExcelPreview(null);
              }}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-600" dir="ltr">
              {contract.code || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-500">
              <UserCog className="h-3 w-3 text-slate-400" />
              ناظر:{" "}
              <strong className="font-semibold text-slate-700">
                {contract.supervisor.isActive
                  ? `${contract.supervisor.fullName} (${toFaDigits(contract.supervisor.phone)})`
                  : "تعریف نشده"}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-100 bg-teal-50/70 px-2.5 py-1 text-[10px] text-teal-800">
              سقف امروز: <strong className="font-semibold">{toFaDigits(contract.dayQuotas.find((d) => d.date === today)?.totalCap ?? 0)} نفر</strong>
            </span>
          </div>
        </div>
      </div>

      {banner && <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{banner}</span><button type="button" onClick={() => setBanner("")} aria-label="بستن"><X className="h-3.5 w-3.5 text-emerald-700" /></button></div>}

      <div>
        <div className="flex items-end justify-between gap-3 border-b border-slate-200">
          <div className="-mb-px min-w-0 flex-1 overflow-x-auto">
            <div className="flex min-w-max flex-nowrap items-end gap-5" role="tablist" aria-label="مراحل قرارداد">
              {STEPS.map((step) => {
                const active = tab === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setTab(step.id);
                      setGuideOpen(false);
                    }}
                    className={`inline-flex items-center gap-2.5 whitespace-nowrap border-b-2 pb-2.5 text-xs transition ${active ? "border-teal-600 font-bold text-teal-800" : "border-transparent font-medium text-slate-500 hover:text-slate-700"}`}
                  >
                    <span
                      aria-hidden
                      title={`مرحله ${step.n}`}
                      className={`inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-black leading-none tabular-nums ${
                        active
                          ? "bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-2 ring-teal-600 ring-offset-2 ring-offset-white"
                          : "bg-white text-slate-700 ring-2 ring-slate-300"
                      }`}
                    >
                      {step.n}
                    </span>
                    <span className={active ? "text-teal-900" : ""}>{step.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mb-1.5 flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{stepChip[tab]}</span>
            <button
              type="button"
              aria-label="شرح مرحلهٔ فعال"
              aria-expanded={guideOpen}
              onClick={() => setGuideOpen((v) => !v)}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${guideOpen ? "bg-sky-100 text-sky-700" : "text-slate-400 hover:bg-slate-100 hover:text-sky-700"}`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {guideOpen && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-right">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-700">{STEPS.find((s) => s.id === tab)?.sub}</div>
              <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{GUIDE[tab]}</p>
            </div>
          </div>
        )}
      </div>

      {/* Step 1 — people: جدول اعضا + افزودن از نوار ابزار */}
      {tab === "people" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">افراد این قرارداد</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">{toFaDigits(peopleMembers.length)} نفر{membersBusy ? " · در حال بارگذاری…" : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <AppInput value={peopleSearch} onChange={(e) => setPeopleSearch(e.target.value)} placeholder="نام، کدملی، موبایل…" className="w-36 bg-transparent outline-none" />
                </label>
                <button type="button" onClick={() => setPeoplePanel((v) => (v === "manual" ? null : "manual"))} className={`secondary-button ${peoplePanel === "manual" ? "border-teal-300 bg-teal-50 text-teal-800" : ""}`}><UserPlus className="h-3.5 w-3.5" />افزودن تکی</button>
                <button type="button" onClick={() => setPeoplePanel((v) => (v === "excel" ? null : "excel"))} className={`secondary-button ${peoplePanel === "excel" ? "border-teal-300 bg-teal-50 text-teal-800" : ""}`}><FileSpreadsheet className="h-3.5 w-3.5" />اکسل</button>
                <button type="button" onClick={() => setPeoplePanel((v) => (v === "api" ? null : "api"))} className={`secondary-button ${peoplePanel === "api" ? "border-teal-300 bg-teal-50 text-teal-800" : ""}`}><RefreshCw className="h-3.5 w-3.5" />همگام API</button>
                <button type="button" onClick={() => exportContractReportExcel(contract)} className="secondary-button"><Download className="h-3.5 w-3.5" />خروجی اکسل</button>
              </div>
            </div>

            {peoplePanel === "api" && (
<div className="space-y-4 rounded-2xl border border-teal-200 bg-teal-50/30 p-5">
            <div><span className="status-badge status-teal">دریافت خودکار</span><h2 className="mt-1.5 text-sm font-bold text-slate-800">API خارجی سازمان</h2><p className="mt-1 text-xs text-slate-500">کلید اختصاصی قرارداد به سامانه منابع انسانی سازمان متصل است و لیست پرسنل را دریافت می‌کند.</p></div>
            {apiEditOpen ? (
              <form onSubmit={async (e) => { e.preventDefault(); await run({ action: "UPDATE_CONTRACT_API", contractId: contract.id, apiKey: editApiKey, apiEndpoint: editEndpoint }); setApiEditOpen(false); flash("کلید API قرارداد به‌روزرسانی شد."); }} className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/40 p-3.5">
                <label className="app-label">آدرس سرویس<AppInput dir="ltr" value={editEndpoint} onChange={(e) => setEditEndpoint(e.target.value)} className="app-input mt-1 font-mono text-left text-xs" /></label>
                <label className="app-label">کلید قرارداد<AppInput dir="ltr" required value={editApiKey} onChange={(e) => setEditApiKey(e.target.value)} className="app-input mt-1 font-mono text-left text-xs" /></label>
                <div className="flex gap-2"><button type="submit" disabled={busy} className="primary-button">ذخیره</button><button type="button" onClick={() => setApiEditOpen(false)} className="secondary-button">انصراف</button></div>
              </form>
            ) : (
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
                <div className="flex items-center justify-between gap-2"><span className="text-slate-400">آدرس سرویس:</span><span dir="ltr" className="truncate font-mono text-[11px] text-slate-600">{contract.apiEndpoint}</span></div>
                <div className="flex items-center justify-between gap-2"><span className="text-slate-400">کلید قرارداد:</span><code dir="ltr" className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-700 border border-teal-100">{contract.apiKey}</code></div>
                <div className="flex items-center justify-between gap-2"><span className="text-slate-400">آخرین همگام‌سازی:</span><span className="text-[11px] text-slate-600">{contract.lastApiSyncAt ? `ساعت ${formatFaTime(contract.lastApiSyncAt)}` : "انجام نشده"}</span></div>
                <button type="button" onClick={() => { setEditApiKey(contract.apiKey); setEditEndpoint(contract.apiEndpoint); setApiEditOpen(true); }} className="secondary-button mt-1"><KeyRound className="h-3.5 w-3.5" />ویرایش کلید</button>
              </div>
            )}
            {/* SMS دعوت هنوز از قیف/گروهی است؛ ImportMembers پیامک نمی‌زند — چک‌باکس فقط برای SYNC آینده */}
            <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={sendSmsOnImport} onChange={(e) => setSendSmsOnImport(e.target.checked)} className="accent-teal-700" />پس از دریافت از API سازمان، پیامک دعوت ارسال شود (ورود دستی/اکسل از قیف پیامک می‌گیرد)</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={async () => { const r = await run({ action: "SYNC_CONTRACT_FROM_API", contractId: contract.id, sendInviteSms: sendSmsOnImport }); flash(Number(r.added) > 0 ? `${toFaDigits(r.added)} نفر جدید دریافت شد و برایشان پیامک ارسال گردید.` : "همه افراد قبلاً در قرارداد ثبت شده‌اند."); }} className="primary-button flex-1 justify-center"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />دریافت افراد جدید از API</button>
            </div>
          </div>
            )}

            {peoplePanel === "manual" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  // کدملی بدون pad مخفی؛ موبایل پس از نرمال (+98/۹…) به ۰۹ ذخیره می‌شود
                  const nid = exactNationalIdDigits(mNid);
                  const phone = normalizeMobile(mPhone);
                  if (mFirstName.trim().length < 2 || mLastName.trim().length < 2) {
                    flash("نام و نام‌خانوادگی الزامی است.");
                    return;
                  }
                  if (!isExactIranNationalId(mNid)) {
                    flash("کدملی را با صفر اول، دقیقاً ۱۰ رقم وارد کنید.");
                    return;
                  }
                  if (!isValidIranMobile(mPhone)) {
                    flash("موبایل را به‌صورت ۰۹… یا +۹۸ وارد کنید (۱۱ رقم استاندارد).");
                    return;
                  }
                  if (!mBirthDate) {
                    flash("تاریخ تولد الزامی است.");
                    return;
                  }
                  if (!contract.serverId) {
                    flash("شناسه سرور قرارداد موجود نیست.");
                    return;
                  }
                  const r = await run({
                    action: "IMPORT_CONTRACT_MEMBERS",
                    contractId: contract.id,
                    contractServerId: contract.serverId,
                    source: "manual",
                    members: [
                      {
                        firstName: mFirstName.trim(),
                        lastName: mLastName.trim(),
                        nationalId: nid,
                        phone,
                        birthDate: mBirthDate,
                        gender: mGender,
                        maritalStatus: mMarital || null,
                        department: mDept || null,
                        jobCategory: mCat || null,
                        personnelCode: `MN-${Date.now().toString().slice(-4)}`,
                      },
                    ],
                  });
                  if (!r.added) {
                    flash(r.results?.[0]?.reason || "ثبت انجام نشد.");
                    return;
                  }
                  setMFirstName("");
                  setMLastName("");
                  setMNid("");
                  setMPhone("");
                  setMBirthDate("");
                  setMMarital("");
                  setPeoplePanel(null);
                  const age = ageFromBirthIso(mBirthDate);
                  flash(`«${displayFullName(mFirstName, mLastName)}» ثبت شد${age != null ? ` (${toFaDigits(age)} ساله)` : ""}.`);
                }}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
              >
                <div className="text-xs font-semibold text-slate-700">ثبت دستی یک نفر</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <AppInput required placeholder="نام *" value={mFirstName} onChange={(e) => setMFirstName(e.target.value)} className="app-input text-xs" />
                  <AppInput required placeholder="نام‌خانوادگی *" value={mLastName} onChange={(e) => setMLastName(e.target.value)} className="app-input text-xs" />
                  <IranDigitField kind="nationalId" required placeholder="کد ملی ۱۰ رقمی *" value={mNid} onValueChange={setMNid} className="app-input text-left font-mono text-xs" />
                  <IranDigitField kind="mobile" required placeholder="موبایل 09… *" value={mPhone} onValueChange={setMPhone} className="app-input text-left font-mono text-xs" />
                  <label className="app-label text-[10px] sm:col-span-2">
                    تاریخ تولد *
                    <PersianDateField
                      className="mt-1"
                      value={mBirthDate}
                      onChange={setMBirthDate}
                      minDate={birthBounds.minDate}
                      maxDate={birthBounds.maxDate}
                      required
                      aria-label="تاریخ تولد"
                    />
                  </label>
                  <select value={mGender} onChange={(e) => setMGender(e.target.value as "مرد" | "زن")} className="app-select text-xs" required>
                    <option value="مرد">مرد</option>
                    <option value="زن">زن</option>
                  </select>
                  <select value={mMarital} onChange={(e) => setMMarital(e.target.value)} className="app-select text-xs">
                    <option value="">تاهل (اختیاری)</option>
                    {MARITAL_STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <AppInput placeholder="واحد سازمانی (اختیاری)" value={mDept} onChange={(e) => setMDept(e.target.value)} className="app-input text-xs" />
                  <select value={mCat} onChange={(e) => setMCat(e.target.value)} className="app-select text-xs">
                    <option value="">رده شغلی (اختیاری)</option>
                    {JOB_CATEGORIES.filter((c) => c !== "همه").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={busy} className="primary-button w-full justify-center">افزودن به قرارداد</button>
              </form>          </div>
            )}

            {peoplePanel === "excel" && (
<div className="space-y-4 rounded-2xl border border-teal-200 bg-teal-50/30 p-5">
            <div>
              <span className="status-badge status-green">ورود گروهی با اکسل</span>
              <h2 className="mt-1.5 text-sm font-bold text-slate-800">تمپلیت آماده اکسل و بارگذاری لیست</h2>
              <p className="mt-1 text-xs text-slate-500">ترتیب ستون‌ها مهم نیست؛ سیستم از عنوان تشخیص می‌دهد. اگر مبهم بود، مپ دستی می‌آید. گروه فقط وقتی کد مسیر باشد مسیر را ست می‌کند.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadContractExcelTemplate("xls")} className="secondary-button border-teal-200 bg-teal-50/60 text-teal-800"><FileSpreadsheet className="h-4 w-4 text-teal-700" />دانلود تمپلیت اکسل (.xls)</button>
              <button type="button" onClick={() => downloadContractExcelTemplate("csv")} className="secondary-button"><Download className="h-3.5 w-3.5" />دانلود CSV</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="primary-button mr-auto"><Upload className="h-4 w-4" />بارگذاری فایل اکسل</button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImportResults(null);
                  const parsed = await parseImportFile(file);
                  setExcelPreview(parsed);
                  setColumnMappingDraft(parsed.suggestedMapping);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>
            <AppTextarea
              rows={3}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"نام، نام‌خانوادگی، کدملی، موبایل، تاریخ‌تولد شمسی، جنسیت، …\nسامان, نوری, 0012345679, 09123459876, 1360/05/12, مرد"}
              className="app-input text-[11px] leading-6"
            />
            {pasteText.trim() && (
              <button
                type="button"
                onClick={() => {
                  setImportResults(null);
                  const parsed = parseExcelOrCsvText(pasteText);
                  setExcelPreview(parsed);
                  setColumnMappingDraft(parsed.suggestedMapping);
                }}
                className="secondary-button"
              >
                بررسی ردیف‌ها
              </button>
            )}
            {excelPreview?.needsMapping && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs space-y-3">
                <strong className="text-amber-950">ستون‌های اجباری تشخیص داده نشد — مپ دستی</strong>
                <p className="text-amber-900/80">ستون‌های فایل: {excelPreview.fileColumns.join(" · ") || "—"}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(IMPORT_FIELD_LABELS) as ImportFieldKey[]).map((field) => (
                    <label key={field} className="flex flex-col gap-1 text-[11px] text-slate-700">
                      <span>
                        {IMPORT_FIELD_LABELS[field]}
                        {REQUIRED_IMPORT_FIELDS.includes(field) ? " *" : ""}
                      </span>
                      <select
                        className="app-select text-xs"
                        value={columnMappingDraft[field] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setColumnMappingDraft((prev) => ({
                            ...prev,
                            [field]: v === "" ? undefined : Number(v),
                          }));
                        }}
                      >
                        <option value="">— انتخاب ستون —</option>
                        {excelPreview.fileColumns.map((label, idx) => (
                          <option key={`${field}-${idx}`} value={idx}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    const missing = REQUIRED_IMPORT_FIELDS.filter((f) => columnMappingDraft[f] == null);
                    if (missing.length) {
                      flash(`ستون اجباری مپ نشده: ${missing.map((f) => IMPORT_FIELD_LABELS[f]).join("، ")}`);
                      return;
                    }
                    setExcelPreview(
                      finalizeImportParse(
                        excelPreview.rawRows,
                        columnMappingDraft,
                        excelPreview.headerRowIndex,
                        excelPreview.fileColumns,
                      ),
                    );
                  }}
                >
                  اعمال مپ و پیش‌نمایش
                </button>
              </div>
            )}
            {excelPreview && !excelPreview.needsMapping && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 text-xs">
                <strong className="text-teal-900">
                  {toFaDigits(excelPreview.readyCount)} آماده · {toFaDigits(excelPreview.invalidCount)} رد
                  {excelPreview.skipped ? ` · ${toFaDigits(excelPreview.skipped)} رديف ناديده` : ""}
                </strong>
                <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full min-w-[640px] text-right text-[10px]">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-2 py-1.5">#</th>
                        <th className="px-2 py-1.5">نام</th>
                        <th className="px-2 py-1.5">نام‌خانوادگی</th>
                        <th className="px-2 py-1.5">کدملی</th>
                        <th className="px-2 py-1.5">موبایل</th>
                        <th className="px-2 py-1.5">تولد</th>
                        <th className="px-2 py-1.5">جنسیت</th>
                        <th className="px-2 py-1.5">وضعیت</th>
                        <th className="px-2 py-1.5">دلیل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelPreview.rows.filter((r) => r.status !== "header" && r.status !== "skipped").map((r) => (
                        <tr key={`${r.lineNo}-${r.nationalId}`} className={r.status === "ready" ? "bg-emerald-50/40" : "bg-rose-50/50"}>
                          <td className="px-2 py-1 tabular-fa">{toFaDigits(r.lineNo)}</td>
                          <td className="px-2 py-1">{r.firstName}</td>
                          <td className="px-2 py-1">{r.lastName}</td>
                          <td className="px-2 py-1 font-mono" dir="ltr">{r.nationalId}</td>
                          <td className="px-2 py-1 font-mono" dir="ltr">{r.phone}</td>
                          <td className="px-2 py-1">{r.birthDateIso ? birthIsoToFaLabel(r.birthDateIso) : r.birthDateRaw || "—"}</td>
                          <td className="px-2 py-1">{r.gender || "—"}</td>
                          <td className="px-2 py-1 font-semibold">{r.status === "ready" ? "آماده" : "رد"}</td>
                          <td className="px-2 py-1 text-rose-700">{r.reason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  disabled={busy || excelPreview.readyCount === 0 || !contract.serverId}
                  onClick={async () => {
                    const ready = excelPreview.rows.filter((r) => r.status === "ready");
                    try {
                      const r = await run({
                        action: "IMPORT_CONTRACT_MEMBERS",
                        contractId: contract.id,
                        contractServerId: contract.serverId,
                        source: "excel",
                        members: ready.map((row) => ({
                          firstName: row.firstName,
                          lastName: row.lastName,
                          nationalId: row.nationalId,
                          phone: row.phone,
                          birthDate: row.birthDateIso,
                          gender: row.gender,
                          maritalStatus: row.maritalStatus || null,
                          department: row.department || null,
                          jobCategory: row.jobCategory || null,
                          personnelCode: row.personnelCode || null,
                          fatherName: row.fatherName || null,
                          scheduledVisitDate: row.scheduledVisitDateIso || null,
                          pathwayCodeOrGroup: row.pathwayCodeOrGroup || null,
                        })),
                      });
                      const byNid = new Map((r.results ?? []).map((x) => [x.nationalId, x]));
                      setImportResults(
                        ready.map((row) => {
                          const hit = byNid.get(row.nationalId);
                          const st = (hit?.status ?? "rejected") as ImportPreviewRow["status"];
                          return {
                            ...row,
                            status:
                              st === "imported" || st === "linked" || st === "duplicate" || st === "rejected"
                                ? st
                                : "rejected",
                            reason: hit?.reason ?? row.reason,
                          };
                        }),
                      );
                      setExcelPreview(null);
                      setPasteText("");
                      flash(
                        `${toFaDigits(r.added ?? 0)} نفر ثبت شد${Number(r.duplicates) ? ` · ${toFaDigits(r.duplicates)} تکراری` : ""}${Number(r.rejected) ? ` · ${toFaDigits(r.rejected)} رد` : ""}.`,
                      );
                    } catch (err) {
                      flash(err instanceof Error ? err.message : "ثبت اکسل ناموفق بود.");
                    }
                  }}
                  className="primary-button mt-3 w-full justify-center"
                >
                  <Check className="h-4 w-4" />
                  تایید نهایی و افزودن به قرارداد
                </button>
              </div>
            )}
            {importResults && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs">
                <strong className="text-slate-800">نتیجه ثبت</strong>
                <div className="mt-2 max-h-48 overflow-auto">
                  <table className="w-full text-right text-[10px]">
                    <thead className="bg-slate-50"><tr><th className="px-2 py-1">نام</th><th className="px-2 py-1">کدملی</th><th className="px-2 py-1">وضعیت</th><th className="px-2 py-1">دلیل</th></tr></thead>
                    <tbody>
                      {importResults.map((r) => (
                        <tr key={`res-${r.nationalId}-${r.lineNo}`}>
                          <td className="px-2 py-1">{displayFullName(r.firstName, r.lastName)}</td>
                          <td className="px-2 py-1 font-mono" dir="ltr">{r.nationalId}</td>
                          <td className="px-2 py-1">{r.status === "imported" ? "ثبت شد" : r.status === "linked" ? "وصل به پرونده" : r.status === "duplicate" ? "تکراری" : "ناموفق"}</td>
                          <td className="px-2 py-1">{r.reason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                    <th className="pb-2.5 pr-2">نام و واحد</th>
                    <th className="pb-2.5">موبایل</th>
                    <th className="pb-2.5">کدملی</th>
                    <th className="pb-2.5">وضعیت پیش‌ثبت‌نام</th>
                    <th className="pb-2.5">مسیر</th>
                    <th className="pb-2.5">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedPeopleMembers.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-400">هنوز فردی در این قرارداد نیست — از افزودن تکی، اکسل یا همگام API استفاده کنید.</td></tr>
                  )}
                  {pagedPeopleMembers.map((m) => {
                    const canDelete = canDeleteContractMember(m);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 pr-2">
                          <div className="font-semibold text-slate-800">{m.fullName}</div>
                          <div className="text-[10px] text-slate-400">{m.department || "—"} · {m.gender} · {toFaDigits(m.age)} سال</div>
                        </td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-600" dir="ltr">{toFaDigits(m.phone)}</td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-600" dir="ltr">{toFaDigits(m.nationalId)}</td>
                        <td className="py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${ONBOARDING_META[m.onboardingStage].badgeClass}`}>{ONBOARDING_META[m.onboardingStage].short}</span>
                            {m.formStatus === "draft" && <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">پرسشنامه</span>}
                            {m.formStatus === "submitted" && <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">تکمیل فرم</span>}
                          </div>
                        </td>
                        <td className="py-2.5 text-[11px] text-slate-700">{resolvePathwayDisplayTitle(m.assignedPathwayCode, m.assignedPathwayTitle)}</td>
                        <td className="py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button type="button" disabled={busy} onClick={() => openEditMember(m)} className="secondary-button !px-1.5 py-1" aria-label={`ویرایش ${m.fullName}`} title="ویرایش"><Pencil className="h-3.5 w-3.5" /></button>
                            {canDelete ? (
                              <button type="button" disabled={busy} onClick={() => void deleteMember(m)} className="secondary-button !px-1.5 py-1 text-rose-700" aria-label={`حذف ${m.fullName}`} title="حذف"><Trash2 className="h-3.5 w-3.5" /></button>
                            ) : (
                              <span className="inline-flex h-7 w-7 items-center justify-center text-[10px] text-slate-300" title="پس از ورود به پیش‌پذیرش حذف مجاز نیست">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <ListPager
                page={peoplePage}
                pageSize={peoplePageSize}
                totalCount={peopleMembers.length}
                onPageChange={setPeoplePage}
                onPageSizeChange={setPeoplePageSize}
                itemLabel="نفر"
                disabled={membersBusy || busy}
              />
            </div>
          </div>

<div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700"><UserCog className="h-5 w-5" /></span>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold text-slate-800">ناظر خارجی سازمان</h2><span className={`status-badge ${contract.supervisor.isActive ? "status-green" : "status-amber"}`}>{contract.supervisor.isActive ? "فعال" : "تعریف نشده"}</span></div>
                  <p className="mt-1 text-xs text-slate-500">ناظر با شماره موبایل خود وارد پنل نظارت می‌شود و پیشرفت ثبت‌نام، نوبت‌ها و حضور کارکنانش را بدون دیدن جزئیات محرمانه پزشکی رصد می‌کند.</p>
                  {contract.supervisor.isActive && <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs"><span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">{contract.supervisor.fullName} — {contract.supervisor.title}</span><span className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-1.5 font-mono text-xs font-semibold text-teal-800" dir="ltr">{contract.supervisor.phone}</span></div>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => {
                  const parts = (contract.supervisor.isActive ? contract.supervisor.fullName : "").trim().split(/\s+/).filter(Boolean);
                  setSupFirstName(parts[0] ?? "");
                  setSupLastName(parts.slice(1).join(" "));
                  setSupTitle(contract.supervisor.title || "مدیر HSE و رفاه کارکنان");
                  setSupPhone(contract.supervisor.phone || "");
                  setSupCanSms(contract.supervisor.canSendReminders);
                  setSupEditOpen(!supEditOpen);
                }} className="secondary-button"><Pencil className="h-3.5 w-3.5" />{contract.supervisor.isActive ? "تغییر ناظر" : "تعریف ناظر"}</button>
                <button type="button" onClick={() => onSwitchToSupervisor(contract.id)} className="primary-button"><ExternalLink className="h-3.5 w-3.5" />مشاهده پنل ناظر</button>
              </div>
            </div>
            {supEditOpen && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!contract.serverId) { flash("شناسه سرور قرارداد موجود نیست."); return; }
                const displayName = `${supFirstName.trim()} ${supLastName.trim()}`.trim();
                const phoneNorm = normalizeMobile(supPhone);
                await run({
                  action: "UPDATE_CONTRACT_SUPERVISOR",
                  contractId: contract.id,
                  contractServerId: contract.serverId,
                  firstName: supFirstName.trim(),
                  lastName: supLastName.trim(),
                  title: supTitle,
                  phone: phoneNorm,
                  canSendReminders: supCanSms,
                  isActive: true,
                });
                setSupEditOpen(false);
                flash(`ناظر «${displayName}» ثبت شد و ورود با شماره ${toFaDigits(phoneNorm)} فعال گردید.`);
              }} className="mt-4 grid gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:grid-cols-5">
                <label className="app-label">نام<AppInput required value={supFirstName} onChange={(e) => setSupFirstName(e.target.value)} placeholder="نام" className="app-input mt-1 text-xs" /></label>
                <label className="app-label">نام‌خانوادگی<AppInput required value={supLastName} onChange={(e) => setSupLastName(e.target.value)} placeholder="نام‌خانوادگی" className="app-input mt-1 text-xs" /></label>
                <label className="app-label">سمت<AppInput value={supTitle} onChange={(e) => setSupTitle(e.target.value)} placeholder="مدیر منابع انسانی" className="app-input mt-1 text-xs" /></label>
                <label className="app-label">موبایل (نام کاربری ورود)<IranDigitField kind="mobile" required value={supPhone} onValueChange={setSupPhone} placeholder="0912..." className="app-input mt-1 font-mono text-left text-xs" /></label>
                <div className="flex flex-col justify-end gap-2"><label className="flex items-center gap-1.5 text-[11px] text-slate-600"><input type="checkbox" checked={supCanSms} onChange={(e) => setSupCanSms(e.target.checked)} className="accent-teal-700" />مجوز یادآوری پیامکی</label><button type="submit" disabled={busy} className="primary-button justify-center">ثبت ناظر</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Step 2 — package rules */}
      {tab === "packages" && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">مسیرهای سلامتی این قرارداد</h2>
                <p className="mt-0.5 text-xs text-slate-500">عدد کمتر = اولویت بالاتر در تطبیق؛ بدون تطبیق → مسیر پیش‌فرض. جابه‌جایی اعضا با «بررسی مجدد».</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy || !contract.serverId}
                  onClick={async () => {
                    if (!contract.serverId) { flash("شناسه سرور قرارداد موجود نیست."); return; }
                    const r = (await run({ action: "PREVIEW_PATHWAY_RECHECK", contractId: contract.id, contractServerId: contract.serverId })) as { rows?: PathwayRecheckRow[] };
                    const rows = Array.isArray(r?.rows) ? r.rows : [];
                    setRecheckRows(rows);
                    setRecheckSelected(new Set(rows.filter((x) => x.wouldChange && x.canApply).map((x) => x.memberId)));
                    setRecheckOpen(true);
                  }}
                  className="secondary-button"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  بررسی مجدد مسیرها
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLibQuery("");
                    setLibraryPickerOpen(true);
                  }}
                  className="secondary-button"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  از کتابخانه
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingLibRule(null);
                    setRuleTitle("");
                    setRuleDesc("");
                    setRuleGender("مرد");
                    setRuleMinAge("40");
                    setRuleMaxAge("");
                    setRuleJobCat("همه");
                    setRulePathway(pathways[0]?.code ?? "FULL_CHECKUP");
                    setSaveToLibrary(true);
                    setRuleFormOpen(true);
                  }}
                  className="primary-button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  مسیر جدید
                </button>
              </div>
            </div>
            <div className="space-y-2.5 pt-1">
              {pathwayBuckets.map((bucket, idx) => {
                const pkg = pathways.find((p) => p.code === bucket.pathwayCode);
                const bucketMembers = membersForPathwayBucket(contract.members, bucket, contract.pathwayRules);
                const expanded = selectedPathwayBucketId === bucket.id;
                const ruleRank = bucket.kind === "rule" ? pathwayBuckets.filter((b) => b.kind === "rule").indexOf(bucket) + 1 : 0;
                return (
                  <div
                    key={bucket.id}
                    className={`rounded-xl border p-3.5 text-xs transition ${expanded ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-600/20" : "border-slate-200 bg-slate-50/70 hover:border-teal-300"}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {bucket.kind === "default" ? (
                          <span className="rounded-lg bg-slate-700 px-2 py-1 text-[10px] font-bold text-white">پیش‌فرض</span>
                        ) : (
                          <div className="flex shrink-0 items-center gap-0.5">
                            <div className="flex flex-col">
                              {(() => {
                                const ruleBuckets = pathwayBuckets.filter((b) => b.kind === "rule");
                                const ruleIndex = ruleBuckets.findIndex((b) => b.id === bucket.id);
                                const canUp = ruleIndex > 0;
                                const canDown = ruleIndex >= 0 && ruleIndex < ruleBuckets.length - 1;
                                return (
                                  <>
                                    <button
                                      type="button"
                                      disabled={busy || !canUp || !bucket.rule}
                                      aria-label="اولویت بالاتر"
                                      className="rounded p-0.5 text-slate-500 hover:bg-white disabled:opacity-30"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (bucket.rule) void movePathwayPriority(bucket.rule.id, "up");
                                      }}
                                    >
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy || !canDown || !bucket.rule}
                                      aria-label="اولویت پایین‌تر"
                                      className="rounded p-0.5 text-slate-500 hover:bg-white disabled:opacity-30"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (bucket.rule) void movePathwayPriority(bucket.rule.id, "down");
                                      }}
                                    >
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#20745c] text-[11px] font-bold text-white">{toFaDigits(ruleRank || idx)}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedPathwayBucketId((id) => (id === bucket.id ? null : bucket.id))}
                          className="min-w-0 flex-1 text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
                          aria-expanded={expanded}
                          aria-label={`اعضای مسیر ${bucket.title}`}
                        >
                          <strong className="block truncate text-slate-800">{bucket.title}</strong>
                          {bucket.libraryRuleId && (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-teal-50 px-1.5 py-0.5 text-[9px] font-semibold text-teal-700">
                              <BookOpen className="h-2.5 w-2.5" />از کتابخانه
                            </span>
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="status-badge status-teal">{toFaDigits(bucketMembers.length)} نفر</span>
                        {bucket.kind === "rule" && bucket.rule && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!contract.serverId) { flash("شناسه سرور قرارداد موجود نیست."); return; }
                              try {
                                const r = await run({ action: "DETACH_CONTRACT_PATHWAY", contractId: contract.id, contractServerId: contract.serverId, ruleId: bucket.rule!.id });
                                if (selectedPathwayBucketId === bucket.id) setSelectedPathwayBucketId(null);
                                const bits = ["مسیر جدا شد"];
                                if (r.recalculated) bits.push(`${toFaDigits(r.recalculated)} نفر → مسیر پیش‌فرض`);
                                if (r.needsManual) bits.push(`${toFaDigits(r.needsManual)} نفر پذیرش‌شده را در نوبت‌دهی دستی عوض کنید`);
                                flash(bits.join("؛ ") + ".");
                              } catch (err) {
                                flash(err instanceof Error ? err.message : "حذف مسیر ناموفق بود.");
                              }
                            }}
                            aria-label="حذف از قرارداد"
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPathwayBucketId((id) => (id === bucket.id ? null : bucket.id))}
                      className="mt-2 w-full text-right"
                      aria-expanded={expanded}
                    >
                      {bucket.kind === "default" ? (
                        <p className="text-[11px] text-slate-500">اعضایی که با هیچ مسیر سفارشی منطبق نشوند اینجا می‌مانند.</p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="rounded border border-slate-200 bg-white px-2 py-0.5">جنسیت: <strong>{bucket.gender}</strong></span>
                          <span className="rounded border border-slate-200 bg-white px-2 py-0.5">سن: <strong>{bucket.minAge != null ? `از ${toFaDigits(bucket.minAge)}` : "هر سنی"} {bucket.maxAge != null ? `تا ${toFaDigits(bucket.maxAge)}` : "به بالا"}</strong></span>
                          <span className="rounded border border-slate-200 bg-white px-2 py-0.5">رده شغلی: <strong>{bucket.jobCategory || "همه"}</strong></span>
                        </div>
                      )}
                      {pkg && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pkg.stationCodes.map((code, sIdx) => (
                            <span key={`${bucket.id}-${code}`} className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] text-teal-800">
                              {toFaDigits(sIdx + 1)}. {stationLabel(code)}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                    {expanded && (
                      <div className="mt-3 rounded-xl border border-teal-200 bg-white p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-slate-800">
                            افراد این مسیر
                            <span className="mr-1 font-normal text-slate-400">({toFaDigits(bucketMembers.length)} نفر)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {bucket.kind === "rule" && bucket.rule && (
                              <button
                                type="button"
                                onClick={() => { setViewingRule(bucket.rule); setRuleMemberQuery(""); }}
                                className="text-[10px] font-semibold text-teal-700 hover:text-teal-900"
                              >
                                جزئیات
                              </button>
                            )}
                            <button type="button" onClick={() => setSelectedPathwayBucketId(null)} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600">بستن</button>
                          </div>
                        </div>
                        {bucketMembers.length === 0 ? (
                          <p className="py-4 text-center text-[11px] text-slate-400">کسی روی این مسیر نیست.</p>
                        ) : (
                          <div className="max-h-64 overflow-auto">
                            <table className="w-full text-right text-[11px]">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400">
                                  <th className="pb-2 pr-1 font-semibold">نام</th>
                                  <th className="pb-2 font-semibold">وضعیت</th>
                                  <th className="pb-2 font-semibold">مسیر</th>
                                  <th className="pb-2 font-semibold">عملیات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {bucketMembers.map((m) => (
                                  <tr key={m.id} className="text-slate-700">
                                    <td className="py-2 pr-1">
                                      <div className="font-semibold text-slate-800">{m.fullName}</div>
                                      <div className="text-[10px] text-slate-400">{m.department || "—"} · {toFaDigits(m.phone)}</div>
                                    </td>
                                    <td className="py-2">
                                      <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${ONBOARDING_META[m.onboardingStage].badgeClass}`}>{ONBOARDING_META[m.onboardingStage].short}</span>
                                    </td>
                                    <td className="py-2">
                                      <select
                                        aria-label={`مسیر ${m.fullName}`}
                                        value={pathwayOverrideOptions.find((o) => o.title === m.matchedPathwayTitle)?.bucketId
                                          ?? pathwayOverrideOptions.find((o) => o.code === (m.assignedPathwayCode || ""))?.bucketId
                                          ?? pathwayOverrideOptions[0]?.bucketId
                                          ?? ""}
                                        onChange={(e) => {
                                          const opt = pathwayOverrideOptions.find((o) => o.bucketId === e.target.value);
                                          if (!opt) return;
                                          void run({ action: "OVERRIDE_MEMBER_PATHWAY", contractId: contract.id, memberId: m.id, memberServerId: m.serverId, pathwayCode: opt.code, pathwayTitle: opt.title });
                                        }}
                                        className="app-select py-1 text-[11px]"
                                      >
                                        {pathwayOverrideOptions.map((o) => <option key={o.bucketId} value={o.bucketId}>{o.title}</option>)}
                                      </select>
                                    </td>
                                    <td className="py-2">
                                      <button type="button" disabled={busy} onClick={() => openEditMember(m)} className="secondary-button !px-1.5 py-1" aria-label={`ویرایش ${m.fullName}`} title="ویرایش"><Pencil className="h-3.5 w-3.5" /></button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
        </div>
      )}

      {recheckOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setRecheckOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="بررسی مجدد مسیرها" onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">بررسی مجدد مسیرها</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">جابه‌جایی‌های پیشنهادی بر اساس اولویت مسیرهای قرارداد؛ پذیرش‌شده‌ها اعمال نمی‌شوند.</p>
              </div>
              <button type="button" onClick={() => setRecheckOpen(false)} aria-label="بستن"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
              {recheckRows.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">عضوی برای بررسی نیست.</p>
              ) : (
                <table className="w-full text-right text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="pb-2 pr-1">
                        <input
                          type="checkbox"
                          aria-label="انتخاب همه قابل‌اعمال"
                          checked={recheckRows.some((r) => r.canApply && r.wouldChange) && recheckRows.filter((r) => r.canApply && r.wouldChange).every((r) => recheckSelected.has(r.memberId))}
                          onChange={(e) => {
                            if (e.target.checked) setRecheckSelected(new Set(recheckRows.filter((r) => r.canApply && r.wouldChange).map((r) => r.memberId)));
                            else setRecheckSelected(new Set());
                          }}
                          className="accent-teal-700"
                        />
                      </th>
                      <th className="pb-2">نام</th>
                      <th className="pb-2">فعلی</th>
                      <th className="pb-2">پیشنهادی</th>
                      <th className="pb-2">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recheckRows.map((row) => (
                      <tr key={row.memberId} className={row.wouldChange ? "bg-amber-50/40" : ""}>
                        <td className="py-2 pr-1">
                          <input
                            type="checkbox"
                            disabled={!row.canApply || !row.wouldChange}
                            checked={recheckSelected.has(row.memberId)}
                            onChange={(e) => {
                              setRecheckSelected((prev) => {
                                const n = new Set(prev);
                                if (e.target.checked) n.add(row.memberId); else n.delete(row.memberId);
                                return n;
                              });
                            }}
                            className="accent-teal-700"
                            aria-label={`انتخاب ${row.fullName}`}
                          />
                        </td>
                        <td className="py-2 font-semibold text-slate-800">{row.fullName}</td>
                        <td className="py-2 text-slate-600">{row.currentPathwayTitle || "—"}</td>
                        <td className="py-2 text-teal-800">{row.proposedMatchedTitle || row.proposedPathwayTitle || "پیش‌فرض"}</td>
                        <td className="py-2 text-[10px] text-slate-500">
                          {row.admitted ? "پذیرش‌شده" : row.manualOverride ? "قفل دستی" : row.wouldChange ? "جابه‌جا می‌شود" : "بدون تغییر"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button type="button" className="secondary-button" onClick={() => setRecheckOpen(false)}>انصراف</button>
              <button
                type="button"
                disabled={busy || recheckSelected.size === 0}
                className="primary-button"
                onClick={async () => {
                  if (!contract.serverId) return;
                  const r = (await run({ action: "APPLY_PATHWAY_RECHECK", contractId: contract.id, contractServerId: contract.serverId, memberIds: [...recheckSelected] })) as { applied?: number; skipped?: number };
                  flash(`اعمال شد: ${toFaDigits(r.applied ?? 0)} نفر` + (r.skipped ? `؛ ${toFaDigits(r.skipped)} رد شد` : "") + ".");
                  setRecheckOpen(false);
                }}
              >
                اعمال انتخاب‌شده‌ها
              </button>
            </div>
          </div>
        </div>
      )}

      {libraryPickerOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setLibraryPickerOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="انتخاب مسیر از کتابخانه" onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">انتخاب از کتابخانه</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">مسیرهای مرکزی سیستم را به این قرارداد متصل کنید.</p>
              </div>
              <button type="button" onClick={() => setLibraryPickerOpen(false)} aria-label="بستن"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="border-b border-slate-100 px-5 py-3">
              <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <AppInput value={libQuery} onChange={(e) => setLibQuery(e.target.value)} placeholder="جست‌وجوی مسیر..." className="w-full bg-transparent outline-none" />
              </label>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
              {visibleLibrary.length === 0 && <p className="py-8 text-center text-xs text-slate-400">مسیری یافت نشد.</p>}
              {visibleLibrary.map((lib) => {
                const attached = attachedLibraryIds.has(lib.id);
                return (
                  <div key={lib.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <strong className="text-slate-800">{lib.title}</strong>
                          <span className="font-mono text-[9px] text-slate-400" dir="ltr">{lib.code}</span>
                        </div>
                        <p className="mt-1 text-[10px] leading-5 text-slate-500">{lib.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                          <span className="rounded border border-slate-100 bg-white px-1.5 py-0.5">{lib.gender}</span>
                          <span className="rounded border border-slate-100 bg-white px-1.5 py-0.5">{lib.minAge !== null ? `${toFaDigits(lib.minAge)}+` : "همه سنین"}</span>
                          <span className="rounded border border-slate-100 bg-white px-1.5 py-0.5">{lib.jobCategory}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingLibRule(lib);
                            setRuleTitle(lib.title);
                            setRuleDesc(lib.description);
                            setRuleGender(lib.gender);
                            setRuleMinAge(lib.minAge != null ? String(lib.minAge) : "");
                            setRuleMaxAge(lib.maxAge != null ? String(lib.maxAge) : "");
                            setRuleJobCat(lib.jobCategory);
                            setRulePathway(lib.pathwayCode);
                            setSaveToLibrary(true);
                            setLibraryPickerOpen(false);
                            setRuleFormOpen(true);
                          }}
                          className="secondary-button !px-1.5 py-1"
                          aria-label="ویرایش مسیر"
                          title="ویرایش"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={attached || busy || !contract.serverId}
                          onClick={async () => {
                            await run({ action: "ATTACH_PATHWAY_LIBRARY", contractId: contract.id, contractServerId: contract.serverId, libraryRuleIds: [lib.id] });
                            flash(`مسیر «${lib.title}» به قرارداد اضافه و تخصیص‌ها بازمحاسبه شد.`);
                          }}
                          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${attached ? "bg-slate-100 text-slate-400" : "bg-teal-600 text-white hover:bg-teal-700"}`}
                        >
                          {attached ? "متصل" : "افزودن"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  setLibraryPickerOpen(false);
                  setEditingLibRule(null);
                  setRuleTitle("");
                  setRuleDesc("");
                  setRuleGender("مرد");
                  setRuleMinAge("40");
                  setRuleMaxAge("");
                  setRuleJobCat("همه");
                  setRulePathway(pathways[0]?.code ?? "FULL_CHECKUP");
                  setSaveToLibrary(true);
                  setRuleFormOpen(true);
                }}
                className="secondary-button w-full justify-center"
              >
                <Plus className="h-3.5 w-3.5" />
                ساخت مسیر جدید به‌جای انتخاب
              </button>
            </div>
          </div>
        </div>
      )}

      {ruleFormOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => { setRuleFormOpen(false); setEditingLibRule(null); }}>
          <div role="dialog" aria-modal="true" aria-label={editingLibRule ? "ویرایش مسیر" : "ساخت مسیر جدید"} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">{editingLibRule ? `ویرایش مسیر: ${editingLibRule.title}` : "ساخت مسیر جدید"}</h2>
              <button type="button" onClick={() => { setRuleFormOpen(false); setEditingLibRule(null); }} aria-label="بستن"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ruleData = { title: ruleTitle, description: ruleDesc, gender: ruleGender, minAge: ruleMinAge, maxAge: ruleMaxAge, jobCategory: ruleJobCat, pathwayCode: rulePathway };
                if (editingLibRule) {
                  await run({ action: "UPSERT_PATHWAY_LIBRARY_ITEM", rule: { ...ruleData, id: editingLibRule.id } });
                  flash("مسیر کتابخانه به‌روزرسانی شد و در همه قراردادهای متصل اعمال گردید.");
                  setEditingLibRule(null);
                } else if (saveToLibrary) {
                  if (!contract.serverId) { flash("شناسه سرور قرارداد موجود نیست."); return; }
                  const r = (await run({ action: "UPSERT_PATHWAY_LIBRARY_ITEM", rule: ruleData })) as { libraryRuleId?: string };
                  if (r?.libraryRuleId) {
                    await run({ action: "ATTACH_PATHWAY_LIBRARY", contractId: contract.id, contractServerId: contract.serverId, libraryRuleIds: [r.libraryRuleId] });
                  }
                  flash("مسیر جدید در کتابخانه سیستم ذخیره و به این قرارداد متصل شد.");
                } else {
                  if (!contract.serverId) { flash("شناسه سرور قرارداد موجود نیست."); return; }
                  await run({ action: "SAVE_CONTRACT_PATHWAY_RULES", contractId: contract.id, contractServerId: contract.serverId, saveToLibrary: false, ruleDescription: ruleDesc, pathwayRules: [{ id: `rule-${Date.now()}`, title: ruleTitle, gender: ruleGender, minAge: ruleMinAge !== "" ? Number(ruleMinAge) : null, maxAge: ruleMaxAge !== "" ? Number(ruleMaxAge) : null, jobCategory: ruleJobCat, pathwayCode: rulePathway, priority: contract.pathwayRules.length + 1 } as ContractPathwayRule, ...contract.pathwayRules] });
                  flash("مسیر فقط برای همین قرارداد ثبت شد.");
                }
                setRuleTitle("");
                setRuleDesc("");
                setRuleFormOpen(false);
              }}
              className="space-y-3.5"
            >
              <AppInput required value={ruleTitle} onChange={(e) => setRuleTitle(e.target.value)} placeholder="عنوان مسیر سلامتی (مثلاً: آقایان عملیات زیر ۴۵)" className="app-input text-xs" />
              <AppTextarea rows={2} value={ruleDesc} onChange={(e) => setRuleDesc(e.target.value)} placeholder="توضیح کوتاه برای استفاده مجدد..." className="app-input text-xs" />
              <div className="grid grid-cols-3 gap-2">
                <select value={ruleGender} onChange={(e) => setRuleGender(e.target.value as "همه" | "مرد" | "زن")} className="app-select text-xs"><option value="همه">همه</option><option value="مرد">مرد</option><option value="زن">زن</option></select>
                <AppInput type="number" value={ruleMinAge} onChange={(e) => setRuleMinAge(e.target.value)} placeholder="حداقل سن" className="app-input text-xs" />
                <AppInput type="number" value={ruleMaxAge} onChange={(e) => setRuleMaxAge(e.target.value)} placeholder="حداکثر سن" className="app-input text-xs" />
              </div>
              <select value={ruleJobCat} onChange={(e) => setRuleJobCat(e.target.value)} className="app-select w-full text-xs">{JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select value={rulePathway} onChange={(e) => setRulePathway(e.target.value)} className="app-select w-full text-xs">{pathways.map((p) => <option key={p.code} value={p.code}>{p.title} ({toFaDigits(p.stationCodes.length)} ایستگاه)</option>)}</select>
              {!editingLibRule && <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={saveToLibrary} onChange={(e) => setSaveToLibrary(e.target.checked)} className="accent-teal-700" />در کتابخانه مرکزی ذخیره شود تا در قراردادهای دیگر هم قابل استفاده باشد</label>}
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="primary-button flex-1 justify-center"><Sparkles className="h-4 w-4" />{editingLibRule ? "ذخیره ویرایش" : saveToLibrary ? "ساخت و اتصال به قرارداد" : "افزودن فقط به قرارداد"}</button>
                <button type="button" onClick={() => { setRuleFormOpen(false); setEditingLibRule(null); }} className="secondary-button">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 3 — schedule */}
      {tab === "schedule" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-rose-700">بدون نوبت</span>
                <strong className="text-sm tabular-fa text-rose-900">{toFaDigits(stats.unscheduled)}</strong>
                <span className="text-slate-400">({toFaDigits(stats.menUnscheduled)} آقا · {toFaDigits(stats.womenUnscheduled)} خانم)</span>
              </div>
              <span className="hidden h-3 w-px bg-slate-200 sm:block" aria-hidden />
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-purple-700">دستی</span>
                <strong className="text-sm tabular-fa text-purple-900">{toFaDigits(contract.members.filter((m) => m.appointmentStatus === "pinned").length)}</strong>
              </div>
              <span className="hidden h-3 w-px bg-slate-200 sm:block" aria-hidden />
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-teal-700">خودکار</span>
                <strong className="text-sm tabular-fa text-teal-900">{toFaDigits(contract.members.filter((m) => m.appointmentStatus === "auto_scheduled").length)}</strong>
              </div>
              <span className="hidden h-3 w-px bg-slate-200 sm:block" aria-hidden />
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-slate-600">امروز</span>
                <strong className="text-sm tabular-fa text-slate-800">{toFaDigits(stats.scheduledToday)}</strong>
              </div>
            </div>
            <button
              type="button"
              disabled={busy || stats.unscheduled === 0}
              onClick={async () => {
                const r = await run({ action: "AUTO_DISTRIBUTE_ALL_REMAINING", contractId: contract.id });
                flash(`توزیع خودکار انجام شد: ${toFaDigits(r.totalFilled ?? 0)} نفر نوبت‌دار شدند و ${toFaDigits(r.stillUnscheduled ?? 0)} نفر بدون نوبت باقی ماندند.`);
              }}
              className="primary-button !py-1.5 !text-[11px]"
            >
              <Wand2 className="h-3.5 w-3.5" />
              توزیع باقی‌ماندگان
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7">
              <h2 className="text-sm font-bold text-slate-800">سهمیه‌های روزانه و فرمول توزیع</h2>
              <p className="text-xs text-slate-500">افراد دستی فیکس‌شده از سقف کسر می‌شوند و باقی ظرفیت با فرمول انتخابی به‌صورت خودکار از میان افراد بدون نوبت فراخوان می‌شود.</p>
              <div className="space-y-3 pt-1">
                {contract.dayQuotas.map((quota) => {
                  const assignedOnDay = contract.members.filter((m) => m.scheduledDate === quota.date && m.appointmentStatus !== "unscheduled" && (quota.genderFilter === "همه" || m.gender === quota.genderFilter));
                  const pinnedOnDay = assignedOnDay.filter((m) => m.appointmentStatus === "pinned");
                  const autoOnDay = assignedOnDay.filter((m) => m.appointmentStatus === "auto_scheduled");
                  const freeSlots = Math.max(0, quota.totalCap - assignedOnDay.length);
                  const eligibleWaiting = contract.members.filter((m) => m.appointmentStatus === "unscheduled" && (quota.genderFilter === "همه" || m.gender === quota.genderFilter)).length;
                  const willCallCount = Math.min(freeSlots, eligibleWaiting);
                  const pct = Math.min(100, Math.round((assignedOnDay.length / quota.totalCap) * 100));
                  return (
                    <div key={quota.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-800">{quota.persianLabel}</strong><span className="status-badge status-teal">سقف: {toFaDigits(quota.totalCap)} نفر ({quota.genderFilter === "همه" ? "زن و مرد" : `فقط ${quota.genderFilter}`})</span></div><div className="mt-1 text-[11px] text-slate-500">فرمول توزیع: <strong>{FILL_FORMULA_LABELS[quota.fillFormula]}</strong></div></div>
                        <button type="button" onClick={async () => { await run({ action: "REMOVE_DAY_QUOTA", contractId: contract.id, quotaId: quota.id }); flash("سهمیه روز حذف شد."); }} aria-label="حذف سهمیه" className="rounded p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="mt-3">
                        <div className="flex flex-wrap justify-between text-[11px] text-slate-600"><span>پر شده: <strong>{toFaDigits(assignedOnDay.length)}</strong> از <strong>{toFaDigits(quota.totalCap)}</strong> (دستی: {toFaDigits(pinnedOnDay.length)} · خودکار: {toFaDigits(autoOnDay.length)})</span><span className="font-semibold text-teal-700">ظرفیت خالی: {toFaDigits(freeSlots)} (واجد شرایط: {toFaDigits(eligibleWaiting)} نفر)</span></div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#20745c]" style={{ width: `${pct}%` }} /></div>
                      </div>
                      {pinnedOnDay.length > 0 && <div className="mt-2.5 flex flex-wrap items-center gap-1.5"><span className="text-[10px] font-semibold text-purple-700">نوبت دستی:</span>{pinnedOnDay.map((pm) => <span key={pm.id} className="rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-800"><Pin className="ml-1 inline h-2.5 w-2.5" />{pm.fullName}</span>)}</div>}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button type="button" disabled={busy || willCallCount === 0} onClick={async () => { const r = await run({ action: "RUN_DAY_AUTO_SCHEDULE", contractId: contract.id, quotaId: quota.id, sendCallSms: true }); flash(willCallCount > 0 ? `با احتساب ${toFaDigits(r.alreadyAssigned ?? 0)} نفر قبلی، دقیقاً ${toFaDigits(r.filledNow ?? 0)} نفر دیگر فراخوان شدند؛ ${toFaDigits(r.totalUnscheduled ?? 0)} نفر هنوز بدون نوبت‌اند.` : "ظرفیت این روز پر است."); }} className="primary-button"><Wand2 className="h-3.5 w-3.5" />{willCallCount > 0 ? `فراخوان خودکار ${toFaDigits(willCallCount)} نفر` : "ظرفیت پر است"}</button>
                        {autoOnDay.length > 0 && <button type="button" disabled={busy} onClick={() => run({ action: "CLEAR_DAY_AUTO_SCHEDULE", contractId: contract.id, date: quota.date })} className="secondary-button text-rose-600"><Unlock className="h-3.5 w-3.5" />آزادسازی نوبت‌های خودکار ({toFaDigits(autoOnDay.length)})</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={async (e) => { e.preventDefault(); if (!/^\d{4}-\d{2}-\d{2}$/.test(qDate)) { flash("تاریخ معتبر انتخاب کنید."); return; } await run({ action: "UPSERT_DAY_QUOTA", contractId: contract.id, date: qDate, totalCap: Number(qCap) || 20, genderFilter: qGender, fillFormula: qFormula, notes: qNotes }); setQNotes(""); flash("سقف و فرمول روز ذخیره شد."); }} className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5">
              <h2 className="text-sm font-bold text-slate-800">تعریف سقف و فرمول یک روز</h2>
              <div className="grid grid-cols-2 gap-3"><label className="app-label">تاریخ مراجعه<PersianDateField className="mt-1" value={qDate} onChange={setQDate} showHolidays placeholder="انتخاب تاریخ مراجعه" aria-label="تاریخ مراجعه" /></label><label className="app-label">سقف نفرات<AppInput type="number" min={1} max={200} required value={qCap} onChange={(e) => setQCap(e.target.value)} className="app-input mt-1 text-xs" /></label></div>
              <label className="app-label">شرط جنسیت روز<select value={qGender} onChange={(e) => setQGender(e.target.value as "همه" | "مرد" | "زن")} className="app-select mt-1 w-full text-xs"><option value="مرد">فقط آقایان</option><option value="زن">فقط بانوان</option><option value="همه">همه</option></select></label>
              <label className="app-label">فرمول توزیع باقی‌مانده<select value={qFormula} onChange={(e) => setQFormula(e.target.value as ContractDayQuota["fillFormula"])} className="app-select mt-1 w-full text-xs">{Object.entries(FILL_FORMULA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="app-label">یادداشت<AppInput value={qNotes} onChange={(e) => setQNotes(e.target.value)} placeholder="مثلاً: شیفت صبح عملیات" className="app-input mt-1 text-xs" /></label>
              <button type="submit" disabled={busy} className="primary-button w-full justify-center">ذخیره سقف و فرمول</button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-sm font-bold text-slate-800">تعیین دستی نوبت اشخاص و ورود به کلینیک</h3><p className="text-xs text-slate-500">هر فردی را روی تاریخ انتخابی فیکس کنید تا از سقف همان روز کسر شود. مسیر افراد پذیرش‌شده را اینجا عوض کنید.</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => exportContractReportExcel(contract)} className="secondary-button py-1 text-[10px]"><Download className="h-3.5 w-3.5" />خروجی اکسل</button>
                <label className="flex items-center gap-1.5 text-xs text-slate-600">تاریخ پین<PersianDateField className="min-w-40" value={pinDateDraft} onChange={setPinDateDraft} showHolidays placeholder="تاریخ پین" aria-label="تاریخ پین" /></label>
                <select value={scheduleFilter} onChange={(e) => setScheduleFilter(e.target.value as typeof scheduleFilter)} className="app-select text-xs"><option value="all">همه ({toFaDigits(contract.members.length)})</option><option value="unscheduled">فقط بدون نوبت ({toFaDigits(stats.unscheduled)})</option><option value="scheduled">دارای نوبت</option></select>
                <AppInput value={scheduleSearch} onChange={(e) => setScheduleSearch(e.target.value)} placeholder="جست‌وجوی نام..." className="app-select text-xs" />
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead><tr className="border-b border-slate-100 text-[11px] text-slate-400"><th className="pb-2.5 pr-2">نام و واحد</th><th className="pb-2.5">سن / جنس</th><th className="pb-2.5">مسیر سلامتی</th><th className="pb-2.5">پیش‌ثبت‌نام</th><th className="pb-2.5">وضعیت نوبت</th><th className="pb-2.5">عملیات</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedScheduleMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-2"><div className="font-semibold text-slate-800">{m.fullName}</div><div className="text-[10px] text-slate-400">{m.department} · {toFaDigits(m.phone)}</div></td>
                      <td className="py-2.5 text-slate-600">{m.gender} · {toFaDigits(m.age)} سال</td>
                      <td className="py-2.5"><select aria-label={`مسیر ${m.fullName}`} value={pathwayOverrideOptions.find((o) => o.title === m.matchedPathwayTitle)?.bucketId ?? pathwayOverrideOptions.find((o) => o.code === (m.assignedPathwayCode || ""))?.bucketId ?? pathwayOverrideOptions[0]?.bucketId ?? ""} onChange={(e) => { const opt = pathwayOverrideOptions.find((o) => o.bucketId === e.target.value); if (!opt) return; void run({ action: "OVERRIDE_MEMBER_PATHWAY", contractId: contract.id, memberId: m.id, memberServerId: m.serverId, pathwayCode: opt.code, pathwayTitle: opt.title }); }} className="app-select py-1 text-[11px]">{pathwayOverrideOptions.map((o) => <option key={o.bucketId} value={o.bucketId}>{o.title}</option>)}</select></td>
                      <td className="py-2.5"><span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${ONBOARDING_META[m.onboardingStage].badgeClass}`}>{ONBOARDING_META[m.onboardingStage].short}</span></td>
                      <td className="py-2.5"><span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${APPOINTMENT_META[m.appointmentStatus].badgeClass}`}>{APPOINTMENT_META[m.appointmentStatus].short}</span>{m.scheduledLabel && <div className="mt-0.5 text-[10px] text-slate-500">{m.scheduledLabel}</div>}</td>
                      <td className="py-2.5"><div className="flex flex-wrap items-center gap-1.5">
                        <button type="button" disabled={busy} onClick={() => openEditMember(m)} className="secondary-button !px-1.5 py-1" aria-label={`ویرایش ${m.fullName}`} title="ویرایش"><Pencil className="h-3.5 w-3.5 text-slate-600" /></button>
                        {canDeleteContractMember(m) && <button type="button" disabled={busy} onClick={() => void deleteMember(m)} className="secondary-button !px-1.5 py-1 text-rose-700" aria-label={`حذف ${m.fullName}`} title="حذف"><Trash2 className="h-3.5 w-3.5" /></button>}
                        <button type="button" disabled={busy} onClick={async () => { await run({ action: "PIN_MEMBER_DATE", contractId: contract.id, memberId: m.id, date: pinDateDraft }); flash(`نوبت دستی «${m.fullName}» ثبت شد.`); }} className="secondary-button !px-1.5 py-1" aria-label={`فیکس نوبت ${m.fullName}`} title="فیکس در این تاریخ"><Pin className="h-3.5 w-3.5 text-purple-600" /></button>
                        {m.appointmentStatus !== "unscheduled" && m.appointmentStatus !== "visit_done" && !m.linkedPatientId && <button type="button" disabled={busy} onClick={async () => { const r = await run({ action: "ADMIT_CONTRACT_MEMBER_TO_CLINIC", contractId: contract.id, memberId: m.id, memberServerId: m.serverId }); const pkg = resolvePathwayDisplayTitle(m.assignedPathwayCode, m.assignedPathwayTitle); flash(`«${m.fullName}» با مسیر «${pkg}» وارد جریان کلینیک شد.`); const pid = String(r?.createdPatientId ?? ""); const local = snapshot.patients.find((p) => p.serverId === pid); if (local) onOpenPatientRecord(local.id); }} className="secondary-button !px-1.5 border-teal-200 bg-teal-50 py-1 text-teal-800" aria-label={`پذیرش ${m.fullName}`} title="پذیرش به کلینیک"><UserCheck className="h-3.5 w-3.5" /></button>}
                        {m.linkedPatientId && <button type="button" onClick={() => onOpenPatientRecord(m.linkedPatientId!)} className="secondary-button !px-1.5 py-1 text-teal-700" aria-label={`پرونده ${m.fullName}`} title="پرونده"><ExternalLink className="h-3.5 w-3.5" /></button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ListPager
                page={schedulePage}
                pageSize={schedulePageSize}
                totalCount={scheduleMembers.length}
                onPageChange={setSchedulePage}
                onPageSizeChange={setSchedulePageSize}
                itemLabel="نفر"
                disabled={membersBusy || busy}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — funnel + sms */}
      {tab === "funnel" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {([
              { id: "all" as FunnelFilter, title: "کل افراد قرارداد", count: stats.total, sub: `${toFaDigits(stats.notSent)} بدون پیامک`, cls: "border-slate-200 bg-white" },
              { id: "sms_sent" as FunnelFilter, title: "پیامک‌شده (باز نکرده)", count: stats.smsSentOnly, sub: "هنوز لینک را باز نکرده‌اند", cls: "border-sky-200 bg-sky-50/50" },
              { id: "opened_any" as FunnelFilter, title: "لینک را باز کرده‌اند", count: stats.openedAny, sub: `${toFaDigits(stats.linkOpenedOnly)} نفر بدون لاگین`, cls: "border-indigo-200 bg-indigo-50/50" },
              { id: "logged_any" as FunnelFilter, title: "لاگین کرده‌اند", count: stats.loggedAny, sub: `${toFaDigits(stats.loggedInOnly)} نفر شروع‌نکرده`, cls: "border-violet-200 bg-violet-50/50" },
              { id: "form_draft" as FunnelFilter, title: "شروع پرسشنامه", count: stats.formDraft, sub: "در حال تکمیل پیش‌پذیرش", cls: "border-amber-300 bg-amber-50/70" },
              { id: "abandoned" as FunnelFilter, title: "رها کرده وسط تکمیل", count: stats.abandoned, sub: "نیازمند یادآوری", cls: "border-orange-200 bg-orange-50/60" },
              { id: "completed" as FunnelFilter, title: "تکمیل پرسشنامه", count: stats.formSubmitted, sub: `${toFaDigits(stats.total ? Math.round((stats.formSubmitted / stats.total) * 100) : 0)}٪ کل قرارداد`, cls: "border-emerald-200 bg-emerald-50/60" },
            ]).map((card) => (
              <button key={card.id} type="button" onClick={() => { setFunnelFilter(card.id); setCheckedIds([]); }} className={`rounded-2xl border p-3.5 text-right transition ${card.cls} ${funnelFilter === card.id ? "ring-2 ring-teal-600" : "hover:border-teal-300"}`}>
                <div className="text-[11px] font-semibold text-slate-600">{card.title}</div>
                <div className="mt-1.5 text-2xl font-bold text-slate-800 tabular-fa">{toFaDigits(card.count)}<span className="mr-1 text-xs font-normal text-slate-500">نفر</span></div>
                <div className="mt-1 text-[10px] text-slate-500">{card.sub}</div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                <Send className="h-3.5 w-3.5 text-teal-600" />
                پیامک گروهی
              </span>
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
                {toFaDigits(smsRecipients.length)} گیرنده
                {checkedIds.length > 0 ? " · انتخاب‌شده" : " · فیلتر فعلی"}
              </span>
              <div className="flex flex-wrap gap-1">
                <button type="button" onClick={() => { setFunnelFilter("abandoned"); setApptFilter("all"); setCheckedIds([]); pickSmsTemplateByCode("abandon_followup"); }} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">رهاکردگان ({toFaDigits(stats.abandoned)})</button>
                <button type="button" onClick={() => { setFunnelFilter("sms_sent"); setApptFilter("all"); setCheckedIds([]); pickSmsTemplateByCode("invite_register"); }} className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-800">بازنکردگان ({toFaDigits(stats.smsSentOnly)})</button>
                <button type="button" onClick={() => { setFunnelFilter("all"); setApptFilter("today"); setCheckedIds([]); pickSmsTemplateByCode("appointment_today"); }} className="rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-800">نوبت امروز ({toFaDigits(stats.scheduledToday)})</button>
              </div>
              <select
                aria-label="قالب پیامک"
                value={smsTemplateId}
                onChange={(e) => setSmsTemplateId(e.target.value)}
                className="app-select min-w-[14rem] flex-1 !py-1.5 text-[11px]"
              >
                {smsTemplates.length === 0 ? (
                  <option value="">قالبی تعریف نشده</option>
                ) : (
                  smsTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))
                )}
              </select>
              <button
                type="button"
                disabled={!smsTemplateId || smsRecipients.length === 0}
                onClick={() => setSmsPreviewOpen(true)}
                className="primary-button !py-1.5 !text-[11px]"
              >
                <Eye className="h-3.5 w-3.5" />
                مشاهده
              </button>
              <button
                type="button"
                onClick={() => setSmsHistoryOpen((v) => !v)}
                className="secondary-button !py-1.5 !text-[11px]"
                aria-expanded={smsHistoryOpen}
              >
                تاریخچه ({toFaDigits(contract.smsLogs.length)})
                {smsHistoryOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <p className="basis-full text-[10px] leading-5 text-slate-400">قالب را انتخاب کنید، با «مشاهده» نمونه و تعداد گیرنده را ببینید، سپس ارسال کنید.</p>
              {smsHistoryOpen && (
                <div className="basis-full max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                  {contract.smsLogs.length === 0 ? (
                    <p className="px-1 py-2 text-[11px] text-slate-400">هنوز پیامک گروهی ثبت نشده است.</p>
                  ) : (
                    contract.smsLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-[11px]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-slate-700">{log.campaignTitle}</strong>
                          <span className="text-[10px] text-slate-400">{log.audienceLabel} · {formatFaTime(log.sentAt)} · {toFaDigits(log.recipientCount)} نفر</span>
                        </div>
                        {log.messageTemplate && <p className="mt-1 text-[10px] leading-5 text-slate-500">{log.messageTemplate}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {smsPreviewOpen && selectedSmsTemplate && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
                role="dialog"
                aria-modal="true"
                aria-label="پیش‌نمایش ارسال پیامک"
                onClick={() => setSmsPreviewOpen(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">پیش‌نمایش ارسال</h3>
                      <p className="mt-0.5 text-[11px] text-slate-500">{selectedSmsTemplate.title}</p>
                    </div>
                    <button type="button" onClick={() => setSmsPreviewOpen(false)} aria-label="بستن" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3 overflow-y-auto px-5 py-4 text-right">
                    <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-3.5 py-3">
                      <div className="text-[10px] font-semibold text-teal-800">نمونه پیام (با دادهٔ اولین گیرنده)</div>
                      <p className="mt-1.5 text-[12px] leading-6 text-teal-950 whitespace-pre-wrap">{smsSamplePreview}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
                        ارسال برای {toFaDigits(smsRecipients.length)} نفر
                      </span>
                      <span className="text-slate-400">
                        {checkedIds.length > 0 ? "انتخاب دستی از جدول" : "بر اساس فیلتر فعلی قیف"}
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-2">
                      {smsRecipients.slice(0, 12).map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[11px]">
                          <span className="font-medium text-slate-700">{m.fullName}</span>
                          <span className="font-mono text-[10px] text-slate-400" dir="ltr">{toFaDigits(m.phone)}</span>
                        </div>
                      ))}
                      {smsRecipients.length > 12 && (
                        <p className="px-2 py-1 text-[10px] text-slate-400">و {toFaDigits(smsRecipients.length - 12)} نفر دیگر…</p>
                      )}
                    </div>
                    <p className="text-[10px] leading-5 text-slate-400">
                      کاوه‌نگار: <span dir="ltr" className="font-mono">{selectedSmsTemplate.providerTemplateName || "—"}</span>
                      {" · "}توکن‌ها: {selectedSmsTemplate.tokenKeys.join("، ") || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
                    <button type="button" onClick={() => setSmsPreviewOpen(false)} className="secondary-button !py-1.5 !text-[11px]">انصراف</button>
                    <button
                      type="button"
                      disabled={busy || !contract.serverId || smsRecipients.length === 0}
                      onClick={() => void sendBulkSms()}
                      className="primary-button !py-1.5 !text-[11px]"
                    >
                      <Send className="h-3.5 w-3.5" />
                      ارسال برای {toFaDigits(smsRecipients.length)} نفر
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-800">جزئیات تک‌به‌تک افراد ({toFaDigits(filteredFunnelMembers.length)} نفر){membersBusy ? " · در حال بارگذاری…" : ""}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => exportContractReportExcel(contract)} className="secondary-button py-1 text-[10px]"><Download className="h-3.5 w-3.5" />خروجی اکسل</button>
                  <select value={funnelFilter} onChange={(e) => setFunnelFilter(e.target.value as FunnelFilter)} className="app-select text-xs"><option value="all">همه مراحل</option><option value="not_sent">پیامک‌نشده ({toFaDigits(stats.notSent)})</option><option value="sms_sent">بازنکرده لینک ({toFaDigits(stats.smsSentOnly)})</option><option value="opened_any">بازکنندگان لینک ({toFaDigits(stats.openedAny)})</option><option value="logged_any">لاگین‌کردگان ({toFaDigits(stats.loggedAny)})</option><option value="form_draft">شروع پرسشنامه ({toFaDigits(stats.formDraft)})</option><option value="abandoned">رهاکردگان وسط کار ({toFaDigits(stats.abandoned)})</option><option value="completed">تکمیل پرسشنامه ({toFaDigits(stats.formSubmitted)})</option></select>
                  <select value={apptFilter} onChange={(e) => setApptFilter(e.target.value as ApptFilter)} className="app-select text-xs"><option value="all">همه نوبت‌ها</option><option value="unscheduled">فراخوان‌نشده</option><option value="today">نوبت امروز</option><option value="pinned">دستی (پین)</option><option value="auto_scheduled">فراخوان خودکار</option><option value="visited">مراجعه‌کرده</option></select>
                  <label className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"><Search className="h-3.5 w-3.5 text-slate-400" /><AppInput value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="نام، کد ملی..." className="w-28 bg-transparent outline-none" /></label>
                </div>
              </div>
              <div className="mt-4 max-h-[520px] overflow-auto">
                <table className="w-full text-right text-xs">
                  <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-100 text-[11px] text-slate-400"><th className="pb-2 pr-1"><input type="checkbox" aria-label="انتخاب همه" checked={filteredFunnelMembers.length > 0 && checkedIds.length === filteredFunnelMembers.length} onChange={(e) => setCheckedIds(e.target.checked ? filteredFunnelMembers.map((m) => m.id) : [])} className="accent-teal-700" /></th><th className="pb-2">فرد و موبایل</th><th className="pb-2">وضعیت پیش‌ثبت‌نام</th><th className="pb-2">مسیر سلامتی</th><th className="pb-2">نوبت</th><th className="pb-2">لینک</th><th className="pb-2">عملیات</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedFunnelMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 pr-1"><input type="checkbox" checked={checkedIds.includes(m.id)} onChange={(e) => setCheckedIds((prev) => e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id))} className="accent-teal-700" /></td>
                        <td className="py-2.5"><div className="font-semibold text-slate-800">{m.fullName} <span className="text-[10px] font-normal text-slate-400">({m.gender} · {toFaDigits(m.age)})</span></div><div className="text-[10px] text-slate-400">{toFaDigits(m.phone)} · {m.department}</div><div className="text-[10px] text-slate-400">کدملی: {toFaDigits(m.nationalId)}</div></td>
                        <td className="py-2.5"><div className="flex flex-wrap items-center gap-1.5"><span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${ONBOARDING_META[m.onboardingStage].badgeClass}`}>{ONBOARDING_META[m.onboardingStage].label}</span>{m.formStatus === "draft" && <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">پرسشنامه شروع‌شده</span>}{m.formStatus === "submitted" && <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">پرسشنامه تکمیل</span>}<span className="text-[10px] text-slate-400">({toFaDigits(m.smsInviteCount)} پیامک)</span></div>{(m.formStatus === "draft" || m.onboardingStage === "abandoned") && m.profileProgressPct > 0 && <div className="mt-1 flex items-center gap-2 text-[10px] text-amber-800"><span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-amber-100"><span className="block h-full bg-amber-500" style={{ width: `${m.profileProgressPct}%` }} /></span><span>{toFaDigits(m.profileProgressPct)}٪{m.abandonedAtStep ? ` — توقف در ${m.abandonedAtStep}` : ""}</span></div>}{(m.formStatus === "submitted" || m.onboardingStage === "completed") && m.profileCompletedAt && <div className="mt-0.5 text-[10px] text-emerald-700">تکمیل در ساعت {formatFaTime(m.profileCompletedAt)}</div>}</td>
                        <td className="py-2.5"><div className="text-[11px] font-medium text-slate-700">{resolvePathwayDisplayTitle(m.assignedPathwayCode, m.assignedPathwayTitle)}</div><div className="text-[9px] text-slate-400">{m.matchedPathwayTitle}</div></td>
                        <td className="py-2.5"><span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${APPOINTMENT_META[m.appointmentStatus].badgeClass}`}>{APPOINTMENT_META[m.appointmentStatus].short}</span>{m.scheduledLabel && <div className="mt-0.5 text-[10px] text-slate-500">{m.scheduledLabel}</div>}</td>
                        <td className="py-2.5"><button type="button" onClick={() => setBanner(`لینک اختصاصی ${m.fullName}: ${m.inviteToken}`)} className="secondary-button !px-1.5 py-1" aria-label={`لینک ${m.fullName}`} title="مشاهده لینک"><Link2 className="h-3.5 w-3.5 text-teal-700" /></button></td>
                        <td className="py-2.5"><div className="flex flex-wrap items-center gap-1">
                          <button type="button" disabled={busy || !m.serverId || !contract.serverId} onClick={async () => {
                            if (!m.serverId || !contract.serverId) { flash("شناسه سرور عضو یا قرارداد موجود نیست."); return; }
                            if (!smsTemplateId) { flash("ابتدا یک قالب پیامک انتخاب کنید."); return; }
                            await run({
                              action: "SEND_CONTRACT_BULK_SMS",
                              contractId: contract.id,
                              contractServerId: contract.serverId,
                              memberServerIds: [m.serverId],
                              templateId: smsTemplateId,
                              campaignTitle: `دعوت فردی — ${m.fullName}`,
                            });
                            flash(`پیامک دعوت برای «${m.fullName}» ارسال شد.`);
                          }} className="secondary-button !px-1.5 py-1 text-teal-800" aria-label={`پیامک دعوت ${m.fullName}`} title="پیامک دعوت"><Send className="h-3.5 w-3.5" /></button>
                          <button type="button" disabled={busy} onClick={() => openEditMember(m)} className="secondary-button !px-1.5 py-1" aria-label={`ویرایش ${m.fullName}`} title="ویرایش"><Pencil className="h-3.5 w-3.5" /></button>
                          {canDeleteContractMember(m) && <button type="button" disabled={busy} onClick={() => void deleteMember(m)} className="secondary-button !px-1.5 py-1 text-rose-700" aria-label={`حذف ${m.fullName}`} title="حذف"><Trash2 className="h-3.5 w-3.5" /></button>}
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ListPager
                page={funnelPage}
                pageSize={funnelPageSize}
                totalCount={filteredFunnelMembers.length}
                onPageChange={setFunnelPage}
                onPageSizeChange={setFunnelPageSize}
                itemLabel="نفر"
                disabled={membersBusy || busy}
              />
            </div>
          </div>
        </div>
      )}

      {viewingRule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`جزئیات مسیر ${viewingRule.title}`}
          onClick={() => setViewingRule(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#20745c] text-[11px] font-bold text-white">{toFaDigits(viewingRule.priority)}</span>
                  <h3 className="text-sm font-bold text-slate-800">{viewingRule.title}</h3>
                  {viewingRule.libraryRuleId && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-1.5 py-0.5 text-[9px] font-semibold text-teal-700">
                      <BookOpen className="h-2.5 w-2.5" />از کتابخانه{viewingRuleLib?.code ? ` · ${viewingRuleLib.code}` : ""}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">فقط نمایش — افراد متصل با عنوان مسیر مطابقت داده شده‌اند.</p>
              </div>
              <button type="button" onClick={() => setViewingRule(null)} aria-label="بستن" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5">جنسیت: <strong>{viewingRule.gender}</strong></span>
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5">سن: <strong>{viewingRule.minAge !== null ? `از ${toFaDigits(viewingRule.minAge)}` : "هر سنی"} {viewingRule.maxAge !== null ? `تا ${toFaDigits(viewingRule.maxAge)}` : "به بالا"}</strong></span>
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5">رده شغلی: <strong>{viewingRule.jobCategory || "همه"}</strong></span>
                <span className="rounded border border-teal-200 bg-teal-50 px-2 py-0.5 font-semibold text-teal-800">مسیر: {viewingRulePkg?.title ?? viewingRule.pathwayCode}</span>
              </div>

              {viewingRuleLib?.description ? (
                <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600">{viewingRuleLib.description}</p>
              ) : null}

              {viewingRulePkg?.stationCodes?.length ? (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold text-slate-700">ترتیب ایستگاه‌ها</div>
                  <div className="flex flex-wrap gap-1">
                    {viewingRulePkg.stationCodes.map((code, sIdx) => (
                      <span key={`${viewingRule.id}-detail-${code}`} className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] text-teal-800">
                        {toFaDigits(sIdx + 1)}. {stationLabel(code)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold text-slate-700">
                    افراد متصل ({toFaDigits(contract.members.filter((m) => m.matchedPathwayTitle === viewingRule.title).length)})
                  </div>
                  <label className="flex min-w-[12rem] flex-1 items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] sm:max-w-xs">
                    <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <AppInput
                      value={ruleMemberQuery}
                      onChange={(e) => setRuleMemberQuery(e.target.value)}
                      placeholder="جست‌وجوی نام یا کدملی..."
                      className="w-full bg-transparent outline-none"
                    />
                  </label>
                </div>

                {viewingRuleMembers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-6 text-center text-[11px] text-slate-500">
                    {ruleMemberQuery.trim()
                      ? "نتیجه‌ای برای این جست‌وجو نیست."
                      : "هنوز کسی به این مسیر وصل نشده."}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[32rem] text-right text-[11px]">
                      <thead className="sticky top-0 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">نام</th>
                          <th className="px-3 py-2 font-semibold">سن</th>
                          <th className="px-3 py-2 font-semibold">جنسیت</th>
                          <th className="px-3 py-2 font-semibold">بخش / شغل</th>
                          <th className="px-3 py-2 font-semibold">پیش‌ثبت‌نام</th>
                          <th className="px-3 py-2 font-semibold">مسیر</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingRuleMembers.map((m) => {
                          const stage = ONBOARDING_META[m.onboardingStage];
                          return (
                            <tr key={m.id} className="border-t border-slate-100 text-slate-700">
                              <td className="px-3 py-2 font-medium text-slate-800">{m.fullName || displayFullName(m.firstName, m.lastName)}</td>
                              <td className="px-3 py-2">{toFaDigits(m.age)}</td>
                              <td className="px-3 py-2">{m.gender}</td>
                              <td className="px-3 py-2">{[m.department, m.jobCategory].filter(Boolean).join(" · ") || "—"}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${stage?.badgeClass ?? "bg-slate-100 text-slate-600"}`}>
                                  {stage?.short ?? m.onboardingStage}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-teal-800">{m.assignedPathwayTitle || m.assignedPathwayCode || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-3">
              <button type="button" onClick={() => setViewingRule(null)} className="secondary-button w-full justify-center sm:w-auto">بستن</button>
            </div>
          </div>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="ویرایش عضو قرارداد">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editingMember.serverId) {
                flash("شناسه سرور عضو موجود نیست.");
                return;
              }
              const nid = exactNationalIdDigits(eNid);
              const phone = normalizeMobile(ePhone);
              if (eFirstName.trim().length < 2 || eLastName.trim().length < 2) {
                flash("نام و نام‌خانوادگی الزامی است.");
                return;
              }
              if (!isExactIranNationalId(eNid)) {
                flash("کدملی را با صفر اول، دقیقاً ۱۰ رقم وارد کنید.");
                return;
              }
              if (!isValidIranMobile(ePhone)) {
                flash("موبایل نامعتبر است.");
                return;
              }
              if (!eBirthDate) {
                flash("تاریخ تولد الزامی است.");
                return;
              }
              await run({
                action: "UPDATE_CONTRACT_MEMBER",
                contractId: contract.id,
                memberServerId: editingMember.serverId,
                firstName: eFirstName.trim(),
                lastName: eLastName.trim(),
                nationalId: nid,
                phone,
                birthDate: eBirthDate,
                gender: eGender,
                maritalStatus: eMarital || null,
                department: eDept || null,
                jobCategory: eCat || null,
                personnelCode: ePersonnel || null,
              });
              flash(`«${displayFullName(eFirstName, eLastName)}» به‌روز شد.`);
              setEditingMember(null);
            }}
            className="w-full max-w-lg space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">ویرایش عضو قرارداد</h3>
              <button type="button" onClick={() => setEditingMember(null)} aria-label="بستن" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="app-label">نام<AppInput required value={eFirstName} onChange={(ev) => setEFirstName(ev.target.value)} className="app-input mt-1 text-xs" /></label>
              <label className="app-label">نام‌خانوادگی<AppInput required value={eLastName} onChange={(ev) => setELastName(ev.target.value)} className="app-input mt-1 text-xs" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="app-label">کدملی<IranDigitField kind="nationalId" value={eNid} onValueChange={setENid} className="app-input mt-1 font-mono text-left text-xs" /></label>
              <label className="app-label">موبایل<IranDigitField kind="mobile" value={ePhone} onValueChange={setEPhone} className="app-input mt-1 font-mono text-left text-xs" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="app-label">تاریخ تولد<PersianDateField className="mt-1" value={eBirthDate} onChange={setEBirthDate} minDate={birthBounds.minDate} maxDate={birthBounds.maxDate} /></label>
              <label className="app-label">جنسیت<select value={eGender} onChange={(ev) => setEGender(ev.target.value as "مرد" | "زن")} className="app-select mt-1 w-full text-xs"><option value="مرد">مرد</option><option value="زن">زن</option></select></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="app-label">وضعیت تأهل<select value={eMarital} onChange={(ev) => setEMarital(ev.target.value)} className="app-select mt-1 w-full text-xs"><option value="">—</option>{MARITAL_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
              <label className="app-label">کد پرسنلی<AppInput value={ePersonnel} onChange={(ev) => setEPersonnel(ev.target.value)} className="app-input mt-1 text-xs" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="app-label">واحد سازمانی<AppInput value={eDept} onChange={(ev) => setEDept(ev.target.value)} className="app-input mt-1 text-xs" /></label>
              <label className="app-label">رده شغلی<select value={eCat} onChange={(ev) => setECat(ev.target.value)} className="app-select mt-1 w-full text-xs"><option value="">—</option>{JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
            </div>
            {editingMember.linkedPatientId ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">این عضو پذیرش شده است؛ تغییر مسیر فقط از تب نوبت‌دهی (تعیین دستی) انجام می‌شود.</p>
            ) : null}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={busy} className="primary-button flex-1 justify-center">ذخیره تغییرات</button>
              <button type="button" onClick={() => setEditingMember(null)} className="secondary-button">انصراف</button>
            </div>
          </form>
        </div>
      )}

      {createModal}
      {editModal}
    </div>
  );
}
