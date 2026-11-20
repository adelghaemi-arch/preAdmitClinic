import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppInput, AppTextarea } from "@/components/AppInput";
import {
  BookOpen,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Info,
  KeyRound,
  Link2,
  MessageSquareText,
  Pencil,
  Pin,
  Plus,
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
  Users,
  Wand2,
  X,
} from "lucide-react";
import type {
  ClinicSnapshot,
  ContractDayQuota,
  ContractPackageRule,
  PackageLibraryRule,
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
} from "@/lib/mock-contracts";
import { formatFaTime, toFaDigits } from "@/lib/persian";
import { normalizeText, stationLabel } from "@/lib/workspace";
import { PersianDateField } from "@/components/PersianDateField";

export type ContractHubTab = "people" | "packages" | "schedule" | "funnel";

interface Props {
  snapshot: ClinicSnapshot;
  initialTab?: ContractHubTab;
  onAction: (payload: Record<string, unknown>) => Promise<Record<string, unknown> | void>;
  onOpenPatientRecord: (patientId: number) => void;
  onSwitchToSupervisor: () => void;
  busy: boolean;
}

type FunnelFilter = "all" | "not_sent" | "sms_sent" | "opened_any" | "link_opened" | "logged_any" | "logged_in" | "abandoned" | "completed";
type ApptFilter = "all" | "unscheduled" | "scheduled_any" | "today" | "pinned" | "auto_scheduled" | "visited";

const STEPS: Array<{ id: ContractHubTab; n: string; title: string; sub: string; icon: typeof Users }> = [
  { id: "people", n: "۱", title: "افراد قرارداد", sub: "API خارجی، اکسل و ورود دستی", icon: Users },
  { id: "packages", n: "۲", title: "بسته سلامت هر فرد", sub: "قوانین سن، جنسیت و شغل", icon: BookOpen },
  { id: "schedule", n: "۳", title: "نوبت‌دهی و فراخوان", sub: "سقف روزانه و توزیع خودکار", icon: CalendarCheck },
  { id: "funnel", n: "۴", title: "پیگیری پیش‌ثبت‌نام", sub: "قیف تکمیل و پیامک گروهی", icon: MessageSquareText },
];

const GUIDE: Record<ContractHubTab, string> = {
  people: "در این مرحله افراد سازمان را وارد قرارداد می‌کنید؛ از API خارجی، فایل اکسل یا ثبت دستی. پس از دریافت، سامانه بسته سلامت مناسب هر نفر را می‌چسباند و برایش پیامک تکمیل پروفایل می‌فرستد.",
  packages: "در این مرحله مشخص می‌کنید هر فرد با چه بسته سلامتی وارد کلینیک شود. قوانین در کتابخانه مرکزی سیستم ذخیره می‌شوند، در هر قرارداد قابل استفاده مجدد‌اند و می‌توانید از همان‌جا قانون جدید هم بسازید.",
  schedule: "در این مرحله برای هر روز سقف پذیرش و قانون توزیع را تعیین می‌کنید؛ افراد دستی فیکس می‌شوند و باقی ظرفیت به‌صورت خودکار از میان افراد بدون نوبت فراخوان می‌شود.",
  funnel: "در این مرحله می‌بینید چه کسانی لینک را باز کرده‌اند، کجاها رها شده‌اند و چه کسانی تکمیل کرده‌اند؛ و می‌توانید برای گروه‌های موردنظر پیامک یادآوری بفرستید.",
};

export function CorporateContractsHub({ snapshot, initialTab = "people", onAction, onOpenPatientRecord, onSwitchToSupervisor, busy }: Props) {
  const contracts = snapshot.contracts ?? [];
  const library = snapshot.packageRuleLibrary ?? [];
  const pathways = snapshot.pathways;
  const today = isoDayOffset(0);
  const [tab, setTab] = useState<ContractHubTab>(initialTab);
  const [selectedContractId, setSelectedContractId] = useState<number>(contracts[0]?.id ?? 0);
  const [banner, setBanner] = useState("");
  // بعد از hydrate seed، اگر id قبلی در لیست نبود اولین قرارداد را انتخاب کن
  useEffect(() => {
    if (!contracts.length) return;
    if (!contracts.some((c) => c.id === selectedContractId)) setSelectedContractId(contracts[0].id);
  }, [contracts, selectedContractId]);
  const contract = contracts.find((c) => c.id === selectedContractId) ?? contracts[0];

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
  const [sendSmsOnImport, setSendSmsOnImport] = useState(true);
  const [pasteText, setPasteText] = useState("");
  const [excelPreview, setExcelPreview] = useState<ReturnType<typeof parseExcelOrCsvText> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [apiEditOpen, setApiEditOpen] = useState(false);
  const [editApiKey, setEditApiKey] = useState("");
  const [editEndpoint, setEditEndpoint] = useState("");
  const [supEditOpen, setSupEditOpen] = useState(false);
  const [supName, setSupName] = useState("");
  const [supTitle, setSupTitle] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supCanSms, setSupCanSms] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [mName, setMName] = useState("");
  const [mNid, setMNid] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mAge, setMAge] = useState("42");
  const [mGender, setMGender] = useState<"مرد" | "زن">("مرد");
  const [mDept, setMDept] = useState("فنی و مهندسی");
  const [mCat, setMCat] = useState("عملیات و فنی");

  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleGender, setRuleGender] = useState<"همه" | "مرد" | "زن">("مرد");
  const [ruleMinAge, setRuleMinAge] = useState("40");
  const [ruleMaxAge, setRuleMaxAge] = useState("");
  const [ruleJobCat, setRuleJobCat] = useState("همه");
  const [rulePathway, setRulePathway] = useState(pathways[0]?.code ?? "FULL_CHECKUP");
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [editingLibRule, setEditingLibRule] = useState<PackageLibraryRule | null>(null);
  const [libQuery, setLibQuery] = useState("");

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
  const [smsCampaign, setSmsCampaign] = useState("یادآوری تکمیل پروفایل سلامت");
  const [smsText, setSmsText] = useState("همکار گرامی {نام}، پیش‌ثبت‌نام پایش سلامت {شرکت} برای بسته «{پکیج}» فعال است. لطفاً اطلاعات خود را در لینک {لینک} تکمیل فرمایید.");

  const flash = (msg: string) => { setBanner(msg); setTimeout(() => setBanner(""), 5500); };
  type ActionResult = { added?: number; duplicates?: number; filledNow?: number; alreadyAssigned?: number; totalUnscheduled?: number; totalFilled?: number; stillUnscheduled?: number; libraryRuleId?: string; createdContractId?: number; createdPatientId?: number };
  const run = async (payload: Record<string, unknown>): Promise<ActionResult> => {
    try { return ((await onAction(payload)) ?? {}) as ActionResult; } catch { return {}; }
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
      if (funnelFilter === "completed" && s !== "completed") return false;
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

  const scheduleMembers = useMemo(() => {
    if (!contract) return [];
    const q = normalizeText(scheduleSearch.trim());
    return contract.members.filter((x) => {
      if (scheduleFilter === "unscheduled" && x.appointmentStatus !== "unscheduled") return false;
      if (scheduleFilter === "scheduled" && x.appointmentStatus === "unscheduled") return false;
      return !q || normalizeText(`${x.fullName} ${x.nationalId} ${x.phone} ${x.department} ${x.gender}`).includes(q);
    });
  }, [contract, scheduleSearch, scheduleFilter]);

  const attachedLibraryIds = useMemo(() => new Set((contract?.packageRules ?? []).map((r) => r.libraryRuleId).filter(Boolean) as string[]), [contract]);
  const visibleLibrary = useMemo(() => {
    const q = normalizeText(libQuery.trim());
    return library.filter((r) => !q || normalizeText(`${r.title} ${r.description} ${r.jobCategory} ${r.gender}`).includes(q));
  }, [library, libQuery]);

  const createModal = createOpen && (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="تعریف قرارداد سازمانی جدید" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold text-slate-800">تعریف قرارداد سازمانی جدید</h2><button type="button" onClick={() => setCreateOpen(false)} aria-label="بستن"><X className="h-4 w-4 text-slate-400" /></button></div>
        <form onSubmit={async (e) => { e.preventDefault(); const r = (await run({ action: "CREATE_CONTRACT", title: newTitle, organizationName: newOrg, apiEndpoint: newEndpoint, apiKey: newApiKey, defaultPathwayCode: newDefaultPkg, initialDailyCap: Number(newDailyCap) || 20, supervisorName: newSupName, supervisorTitle: newSupTitle, supervisorPhone: newSupPhone, fetchFromApiNow: fetchNowOnCreate })) as { createdContractId?: number }; if (r?.createdContractId) setSelectedContractId(Number(r.createdContractId)); setCreateOpen(false); setNewTitle(""); setNewOrg(""); setNewSupName(""); setNewSupPhone(""); flash(fetchNowOnCreate ? "قرارداد ساخته شد." : "قرارداد جدید ثبت شد."); }} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2"><label className="app-label">نام سازمان<AppInput required value={newOrg} onChange={(e) => setNewOrg(e.target.value)} placeholder="مثلاً: شرکت فولاد مبارکه" className="app-input mt-1 text-xs" /></label><label className="app-label">عنوان قرارداد<AppInput required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="پایش سلامت سالانه" className="app-input mt-1 text-xs" /></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="app-label">آدرس API خارجی<AppInput dir="ltr" value={newEndpoint} onChange={(e) => setNewEndpoint(e.target.value)} className="app-input mt-1 font-mono text-left text-xs" /></label><label className="app-label">کلید API قرارداد<AppInput dir="ltr" value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)} className="app-input mt-1 font-mono text-left text-xs" /></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="app-label">بسته پایه پیش‌فرض{pathways.length > 0 ? <select value={newDefaultPkg} onChange={(e) => setNewDefaultPkg(e.target.value)} className="app-select mt-1 w-full text-xs">{pathways.map((p) => <option key={p.code} value={p.code}>{p.title}</option>)}</select> : <AppInput value={newDefaultPkg} onChange={(e) => setNewDefaultPkg(e.target.value)} className="app-input mt-1 text-xs" />}</label><label className="app-label">سقف پذیرش روزانه<AppInput type="number" min={1} value={newDailyCap} onChange={(e) => setNewDailyCap(e.target.value)} className="app-input mt-1 text-xs" /></label></div>
          <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5"><div className="text-xs font-semibold text-amber-900">ناظر خارجی شرکت</div><div className="grid gap-2 sm:grid-cols-3"><AppInput value={newSupName} onChange={(e) => setNewSupName(e.target.value)} placeholder="نام ناظر" className="app-input text-xs" /><AppInput value={newSupTitle} onChange={(e) => setNewSupTitle(e.target.value)} placeholder="سمت" className="app-input text-xs" /><AppInput dir="ltr" value={newSupPhone} onChange={(e) => setNewSupPhone(e.target.value)} placeholder="موبایل: 0912..." className="app-input font-mono text-left text-xs" /></div></div>
          <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={fetchNowOnCreate} onChange={(e) => setFetchNowOnCreate(e.target.checked)} className="accent-teal-700" />دریافت فوری لیست افراد از API و ارسال پیامک تکمیل پروفایل (در این موج پس از ایجاد نادیده گرفته می‌شود)</label>
          <button type="submit" disabled={busy} className="primary-button w-full justify-center py-3">ایجاد قرارداد</button>
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
    packages: `${toFaDigits(contract.packageRules.length)} قانون`,
    schedule: `${toFaDigits(stats.unscheduled)} بدون نوبت`,
    funnel: `${toFaDigits(stats.abandoned)} رهاکرده`,
  };

  return (
    <div className="module-content space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Building2 className="h-5 w-5" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="انتخاب قرارداد" value={contract.id} onChange={(e) => { setSelectedContractId(Number(e.target.value)); setCheckedIds([]); setExcelPreview(null); }} className="app-select font-semibold text-slate-800">
                  {contracts.map((c) => <option key={c.id} value={c.id}>{c.organizationName} — {c.title} ({toFaDigits(c.members.length)} نفر)</option>)}
                </select>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500" dir="ltr">{contract.code}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">ناظر سازمان: <strong className="text-slate-600">{contract.supervisor.isActive ? `${contract.supervisor.fullName} (${toFaDigits(contract.supervisor.phone)})` : "تعریف نشده"}</strong> · سقف امروز: <strong className="text-teal-700">{toFaDigits(contract.dayQuotas.find((d) => d.date === today)?.totalCap ?? 0)} نفر</strong></p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => exportContractReportExcel(contract)} className="secondary-button"><Download className="h-3.5 w-3.5" />خروجی اکسل</button>
            <button type="button" onClick={() => setCreateOpen(true)} className="primary-button"><Plus className="h-4 w-4" />قرارداد جدید</button>
          </div>
        </div>
      </div>

      {banner && <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{banner}</span><button type="button" onClick={() => setBanner("")} aria-label="بستن"><X className="h-3.5 w-3.5 text-emerald-700" /></button></div>}

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const active = tab === step.id;
          return (
            <button key={step.id} type="button" onClick={() => setTab(step.id)} className={`relative overflow-hidden rounded-2xl border p-4 text-right transition ${active ? "border-teal-600 bg-[#20745c] text-white shadow-sm" : "border-slate-200 bg-white hover:border-teal-300"}`}>
              <div className="flex items-center justify-between">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold ${active ? "bg-white/15 text-white" : "bg-teal-50 text-teal-700"}`}>{step.n}</span>
                <Icon className={`h-5 w-5 ${active ? "text-white/70" : "text-slate-300"}`} />
              </div>
              <div className={`mt-2 text-sm font-bold ${active ? "text-white" : "text-slate-800"}`}>{step.title}</div>
              <div className={`mt-0.5 text-[11px] ${active ? "text-white/70" : "text-slate-400"}`}>{step.sub}</div>
              <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>{stepChip[step.id]}</div>
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-sky-100 bg-sky-50/60 p-3.5"><Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /><p className="text-xs leading-6 text-sky-900">{GUIDE[tab]}</p></div>

      {/* Step 1 — people */}
      {tab === "people" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-6">
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
            <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={sendSmsOnImport} onChange={(e) => setSendSmsOnImport(e.target.checked)} className="accent-teal-700" />برای افراد جدید پیامک لینک تکمیل پروفایل ارسال شود</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={async () => { const r = await run({ action: "SYNC_CONTRACT_FROM_API", contractId: contract.id, sendInviteSms: sendSmsOnImport }); flash(Number(r.added) > 0 ? `${toFaDigits(r.added)} نفر جدید دریافت شد و برایشان پیامک ارسال گردید.` : "همه افراد قبلاً در قرارداد ثبت شده‌اند."); }} className="primary-button flex-1 justify-center"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />دریافت افراد جدید از API</button>
              <button type="button" onClick={() => setManualOpen(!manualOpen)} className="secondary-button"><UserPlus className="h-3.5 w-3.5" />افزودن تکی</button>
            </div>
            {manualOpen && (
              <form onSubmit={async (e) => { e.preventDefault(); await run({ action: "IMPORT_CONTRACT_MEMBERS", contractId: contract.id, source: "manual", sendInviteSms: sendSmsOnImport, members: [{ personnelCode: `MN-${Date.now().toString().slice(-4)}`, fullName: mName, nationalId: mNid, phone: mPhone, age: Number(mAge) || 35, gender: mGender, department: mDept, jobCategory: mCat }] }); setMName(""); setMNid(""); setMPhone(""); setManualOpen(false); flash("فرد جدید با بسته متناسب سن و جنسیت ثبت شد."); }} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="text-xs font-semibold text-slate-700">ثبت دستی یک نفر</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <AppInput required placeholder="نام و نام خانوادگی" value={mName} onChange={(e) => setMName(e.target.value)} className="app-input text-xs" />
                  <AppInput required dir="ltr" placeholder="کد ملی ۱۰ رقمی" value={mNid} onChange={(e) => setMNid(e.target.value)} className="app-input text-left font-mono text-xs" />
                  <AppInput required dir="ltr" placeholder="موبایل (0912...)" value={mPhone} onChange={(e) => setMPhone(e.target.value)} className="app-input text-left font-mono text-xs" />
                  <div className="grid grid-cols-2 gap-2"><AppInput type="number" min={18} max={90} value={mAge} onChange={(e) => setMAge(e.target.value)} placeholder="سن" className="app-input text-xs" /><select value={mGender} onChange={(e) => setMGender(e.target.value as "مرد" | "زن")} className="app-select text-xs"><option value="مرد">مرد</option><option value="زن">زن</option></select></div>
                  <AppInput placeholder="واحد سازمانی" value={mDept} onChange={(e) => setMDept(e.target.value)} className="app-input text-xs" />
                  <select value={mCat} onChange={(e) => setMCat(e.target.value)} className="app-select text-xs">{JOB_CATEGORIES.filter((c) => c !== "همه").map((c) => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <button type="submit" disabled={busy} className="primary-button w-full justify-center">افزودن به قرارداد</button>
              </form>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-6">
            <div><span className="status-badge status-green">ورود گروهی با اکسل</span><h2 className="mt-1.5 text-sm font-bold text-slate-800">تمپلیت آماده اکسل و بارگذاری لیست</h2><p className="mt-1 text-xs text-slate-500">تمپلیت را دانلود کنید، سازمان پر کند، سپس فایل اکسل یا ردیف‌های کپی‌شده را بارگذاری کنید.</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadContractExcelTemplate("xls")} className="secondary-button border-teal-200 bg-teal-50/60 text-teal-800"><FileSpreadsheet className="h-4 w-4 text-teal-700" />دانلود تمپلیت اکسل (.xls)</button>
              <button type="button" onClick={() => downloadContractExcelTemplate("csv")} className="secondary-button"><Download className="h-3.5 w-3.5" />دانلود CSV</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="primary-button mr-auto"><Upload className="h-4 w-4" />بارگذاری فایل اکسل</button>
              <input ref={fileInputRef} type="file" accept=".xls,.csv,.tsv,.txt" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setExcelPreview(parseExcelOrCsvText(await file.text())); e.target.value = ""; }} className="hidden" />
            </div>
            <AppTextarea rows={3} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"نام، کد ملی، موبایل، سن، جنسیت، واحد، رده شغلی\nسامان نوری, 0074512369, 09123459876, 48, مرد, تعمیرات, عملیات و فنی"} className="app-input text-[11px] leading-6" />
            {pasteText.trim() && <button type="button" onClick={() => setExcelPreview(parseExcelOrCsvText(pasteText))} className="secondary-button">بررسی ردیف‌ها</button>}
            {excelPreview && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 text-xs">
                <strong className="text-teal-900">{toFaDigits(excelPreview.rows.length)} نفر معتبر{excelPreview.skipped > 0 && ` (${toFaDigits(excelPreview.skipped)} ردیف ناقص رد شد)`}</strong>
                <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">{excelPreview.rows.map((r, i) => <div key={`${r.nationalId}-${i}`} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-[11px]"><span className="font-semibold text-slate-700">{r.fullName} ({r.gender} · {toFaDigits(r.age)} سال · {r.department})</span><span dir="ltr" className="font-mono text-[10px] text-slate-500">{r.nationalId}</span></div>)}</div>
                <button type="button" disabled={busy} onClick={async () => { const r = await run({ action: "IMPORT_CONTRACT_MEMBERS", contractId: contract.id, members: excelPreview.rows, source: "excel", sendInviteSms: sendSmsOnImport }); setExcelPreview(null); setPasteText(""); flash(`${toFaDigits(r.added ?? 0)} نفر از اکسل اضافه شد${Number(r.duplicates) ? ` (${toFaDigits(r.duplicates)} تکراری رد شد)` : ""} و پیامک ارسال گردید.`); }} className="primary-button mt-3 w-full justify-center"><Check className="h-4 w-4" />تایید نهایی و افزودن به قرارداد</button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-12">
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
                <button type="button" onClick={() => { setSupName(contract.supervisor.isActive ? contract.supervisor.fullName : ""); setSupTitle(contract.supervisor.title || "مدیر HSE و رفاه کارکنان"); setSupPhone(contract.supervisor.phone || ""); setSupCanSms(contract.supervisor.canSendReminders); setSupEditOpen(!supEditOpen); }} className="secondary-button"><Pencil className="h-3.5 w-3.5" />{contract.supervisor.isActive ? "تغییر ناظر" : "تعریف ناظر"}</button>
                <button type="button" onClick={onSwitchToSupervisor} className="primary-button"><ExternalLink className="h-3.5 w-3.5" />مشاهده پنل ناظر</button>
              </div>
            </div>
            {supEditOpen && (
              <form onSubmit={async (e) => { e.preventDefault(); await run({ action: "UPDATE_CONTRACT_SUPERVISOR", contractId: contract.id, fullName: supName, title: supTitle, phone: supPhone, canSendReminders: supCanSms, isActive: true }); setSupEditOpen(false); flash(`ناظر «${supName}» ثبت شد و ورود با شماره ${toFaDigits(supPhone)} فعال گردید.`); }} className="mt-4 grid gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:grid-cols-4">
                <label className="app-label">نام ناظر<AppInput required value={supName} onChange={(e) => setSupName(e.target.value)} placeholder="نام و نام خانوادگی" className="app-input mt-1 text-xs" /></label>
                <label className="app-label">سمت<AppInput value={supTitle} onChange={(e) => setSupTitle(e.target.value)} placeholder="مدیر منابع انسانی" className="app-input mt-1 text-xs" /></label>
                <label className="app-label">موبایل (نام کاربری ورود)<AppInput required dir="ltr" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} placeholder="0912..." className="app-input mt-1 font-mono text-left text-xs" /></label>
                <div className="flex flex-col justify-end gap-2"><label className="flex items-center gap-1.5 text-[11px] text-slate-600"><input type="checkbox" checked={supCanSms} onChange={(e) => setSupCanSms(e.target.checked)} className="accent-teal-700" />مجوز یادآوری پیامکی</label><button type="submit" disabled={busy} className="primary-button justify-center">ثبت ناظر</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Step 2 — package rules */}
      {tab === "packages" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7">
            <div><h2 className="text-sm font-bold text-slate-800">قوانین فعال در این قرارداد</h2><p className="mt-0.5 text-xs text-slate-500">هر فرد به اولین قانونی که با سن، جنسیت و رده شغلی او مطابقت داشته باشد می‌چسبد و ایستگاه‌های همان بسته برایش فعال می‌شود.</p></div>
            <div className="space-y-2.5 pt-1">
              {contract.packageRules.map((rule, idx) => {
                const pkg = pathways.find((p) => p.code === rule.pathwayCode);
                const matchedCount = contract.members.filter((m) => m.matchedRuleTitle === rule.title).length;
                return (
                  <div key={rule.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#20745c] text-[11px] font-bold text-white">{toFaDigits(idx + 1)}</span>
                        <strong className="text-slate-800">{rule.title}</strong>
                        {rule.libraryRuleId && <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-1.5 py-0.5 text-[9px] font-semibold text-teal-700"><BookOpen className="h-2.5 w-2.5" />از کتابخانه</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="status-badge status-teal">{toFaDigits(matchedCount)} نفر متصل</span>
                        <button type="button" onClick={async () => { await run({ action: "DETACH_CONTRACT_RULE", contractId: contract.id, ruleId: rule.id }); flash("قانون از قرارداد جدا شد و بسته‌های افراد بازمحاسبه گردید."); }} aria-label="حذف از قرارداد" className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                      <span className="rounded border border-slate-200 bg-white px-2 py-0.5">جنسیت: <strong>{rule.gender}</strong></span>
                      <span className="rounded border border-slate-200 bg-white px-2 py-0.5">سن: <strong>{rule.minAge !== null ? `از ${toFaDigits(rule.minAge)}` : "هر سنی"} {rule.maxAge !== null ? `تا ${toFaDigits(rule.maxAge)}` : "به بالا"}</strong></span>
                      <span className="rounded border border-slate-200 bg-white px-2 py-0.5">رده شغلی: <strong>{rule.jobCategory || "همه"}</strong></span>
                      <span className="font-semibold text-teal-700">← بسته: {pkg?.title ?? rule.pathwayCode}</span>
                    </div>
                    {pkg && <div className="mt-2 flex flex-wrap gap-1">{pkg.stationCodes.map((code, sIdx) => <span key={`${rule.id}-${code}`} className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] text-teal-800">{toFaDigits(sIdx + 1)}. {stationLabel(code)}</span>)}</div>}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/40 p-3.5">
              <div className="text-xs font-semibold text-teal-900">توزیع افراد قرارداد به تفکیک بسته سلامت:</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">{pathways.map((pkg) => { const count = contract.members.filter((m) => m.assignedPathwayCode === pkg.code).length; return <div key={pkg.code} className="flex items-center justify-between rounded-lg border border-teal-100 bg-white px-3 py-2 text-xs"><span className="font-medium text-slate-700">{pkg.title}</span><strong className="text-teal-700">{toFaDigits(count)} نفر</strong></div>; })}</div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5">
            <div><h2 className="text-sm font-bold text-slate-800">کتابخانه مرکزی قوانین سیستم</h2><p className="mt-0.5 text-xs text-slate-500">این قوانین در سراسر سیستم ذخیره می‌شوند و در هر قراردادی قابل استفاده مجدد هستند.</p></div>
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs"><Search className="h-3.5 w-3.5 text-slate-400" /><AppInput value={libQuery} onChange={(e) => setLibQuery(e.target.value)} placeholder="جست‌وجوی قانون..." className="w-full bg-transparent outline-none" /></label>
            <div className="space-y-2">
              {visibleLibrary.map((lib) => {
                const attached = attachedLibraryIds.has(lib.id);
                return (
                  <div key={lib.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div><div className="flex items-center gap-1.5"><strong className="text-slate-800">{lib.title}</strong><span className="font-mono text-[9px] text-slate-400" dir="ltr">{lib.code}</span></div><p className="mt-1 text-[10px] leading-5 text-slate-500">{lib.description}</p></div>
                      <button type="button" disabled={attached || busy} onClick={async () => { await run({ action: "ATTACH_LIBRARY_RULES", contractId: contract.id, libraryRuleIds: [lib.id] }); flash(`قانون «${lib.title}» به قرارداد اضافه و بسته‌ها بازمحاسبه شد.`); }} className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold ${attached ? "bg-slate-100 text-slate-400" : "bg-teal-600 text-white hover:bg-teal-700"}`}>{attached ? "✓ متصل" : "افزودن"}</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-500"><span className="rounded bg-white px-1.5 py-0.5 border border-slate-100">{lib.gender}</span><span className="rounded bg-white px-1.5 py-0.5 border border-slate-100">{lib.minAge !== null ? `${toFaDigits(lib.minAge)}+` : "همه سنین"}</span><span className="rounded bg-white px-1.5 py-0.5 border border-slate-100">{lib.jobCategory}</span></div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const ruleData = { title: ruleTitle, description: ruleDesc, gender: ruleGender, minAge: ruleMinAge, maxAge: ruleMaxAge, jobCategory: ruleJobCat, pathwayCode: rulePathway };
              if (editingLibRule) {
                await run({ action: "UPSERT_LIBRARY_RULE", rule: { ...ruleData, id: editingLibRule.id } });
                flash("قانون کتابخانه به‌روزرسانی شد و در همه قراردادهای متصل اعمال گردید.");
                setEditingLibRule(null);
              } else if (saveToLibrary) {
                const r = (await run({ action: "UPSERT_LIBRARY_RULE", rule: ruleData })) as { libraryRuleId?: string };
                await run({ action: "ATTACH_LIBRARY_RULES", contractId: contract.id, libraryRuleIds: [r.libraryRuleId] });
                flash("قانون جدید در کتابخانه سیستم ذخیره و به این قرارداد متصل شد.");
              } else {
                await run({ action: "SAVE_CONTRACT_PACKAGE_RULES", contractId: contract.id, saveToLibrary: false, ruleDescription: ruleDesc, packageRules: [{ id: `rule-${Date.now()}`, title: ruleTitle, gender: ruleGender, minAge: ruleMinAge !== "" ? Number(ruleMinAge) : null, maxAge: ruleMaxAge !== "" ? Number(ruleMaxAge) : null, jobCategory: ruleJobCat, pathwayCode: rulePathway, priority: contract.packageRules.length + 1 } as ContractPackageRule, ...contract.packageRules] });
                flash("قانون فقط برای همین قرارداد ثبت شد.");
              }
              setRuleTitle(""); setRuleDesc("");
            }} className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/40 p-3.5">
              <div className="text-xs font-semibold text-teal-900">{editingLibRule ? `ویرایش قانون: ${editingLibRule.title}` : "ساخت قانون جدید"}</div>
              <AppInput required value={ruleTitle} onChange={(e) => setRuleTitle(e.target.value)} placeholder="عنوان قانون (مثلاً: آقایان عملیات زیر ۴۵)" className="app-input text-xs" />
              <AppTextarea rows={2} value={ruleDesc} onChange={(e) => setRuleDesc(e.target.value)} placeholder="توضیح کوتاه برای استفاده مجدد..." className="app-input text-xs" />
              <div className="grid grid-cols-3 gap-2">
                <select value={ruleGender} onChange={(e) => setRuleGender(e.target.value as "همه" | "مرد" | "زن")} className="app-select text-xs"><option value="همه">همه</option><option value="مرد">مرد</option><option value="زن">زن</option></select>
                <AppInput type="number" value={ruleMinAge} onChange={(e) => setRuleMinAge(e.target.value)} placeholder="حداقل سن" className="app-input text-xs" />
                <AppInput type="number" value={ruleMaxAge} onChange={(e) => setRuleMaxAge(e.target.value)} placeholder="حداکثر سن" className="app-input text-xs" />
              </div>
              <select value={ruleJobCat} onChange={(e) => setRuleJobCat(e.target.value)} className="app-select w-full text-xs">{JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select value={rulePathway} onChange={(e) => setRulePathway(e.target.value)} className="app-select w-full text-xs">{pathways.map((p) => <option key={p.code} value={p.code}>{p.title} ({toFaDigits(p.stationCodes.length)} ایستگاه)</option>)}</select>
              {!editingLibRule && <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={saveToLibrary} onChange={(e) => setSaveToLibrary(e.target.checked)} className="accent-teal-700" />در کتابخانه مرکزی ذخیره شود تا در قراردادهای دیگر هم قابل استفاده باشد</label>}
              <div className="flex gap-2"><button type="submit" disabled={busy} className="primary-button flex-1 justify-center"><Sparkles className="h-4 w-4" />{editingLibRule ? "ذخیره ویرایش" : saveToLibrary ? "ساخت و اتصال به قرارداد" : "افزودن فقط به قرارداد"}</button>{editingLibRule && <button type="button" onClick={() => setEditingLibRule(null)} className="secondary-button">انصراف</button>}</div>
            </form>
          </div>
        </div>
      )}

      {/* Step 3 — schedule */}
      {tab === "schedule" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4"><div className="text-[11px] font-semibold text-rose-700">هنوز صدا نشده و نوبت‌دهی نشده</div><div className="mt-1.5 text-2xl font-bold text-rose-900 tabular-fa">{toFaDigits(stats.unscheduled)} نفر</div><div className="mt-1 text-[10px] text-rose-700">{toFaDigits(stats.menUnscheduled)} آقا · {toFaDigits(stats.womenUnscheduled)} خانم</div></div>
            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4"><div className="text-[11px] font-semibold text-purple-700">نوبت دستی اختصاصی (پین)</div><div className="mt-1.5 text-2xl font-bold text-purple-900 tabular-fa">{toFaDigits(contract.members.filter((m) => m.appointmentStatus === "pinned").length)} نفر</div><div className="mt-1 text-[10px] text-purple-700">افراد فیکس‌شده روی روز مشخص</div></div>
            <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4"><div className="text-[11px] font-semibold text-teal-700">فراخوان خودکار سقفی</div><div className="mt-1.5 text-2xl font-bold text-teal-900 tabular-fa">{toFaDigits(contract.members.filter((m) => m.appointmentStatus === "auto_scheduled").length)} نفر</div><div className="mt-1 text-[10px] text-teal-700">تکمیل خودکار ظرفیت خالی روزها</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[11px] text-slate-500">نوبت‌داران امروز</div><div className="mt-1.5 text-2xl font-bold text-slate-800 tabular-fa">{toFaDigits(stats.scheduledToday)} نفر</div><div className="mt-1 text-[10px] text-slate-400">دستی + فراخوان خودکار امروز</div></div>
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[11px] font-semibold text-slate-700">نوبت‌دهی مستقل از پیش‌ثبت‌نام است</div><button type="button" disabled={busy || stats.unscheduled === 0} onClick={async () => { const r = await run({ action: "AUTO_DISTRIBUTE_ALL_REMAINING", contractId: contract.id }); flash(`توزیع خودکار انجام شد: ${toFaDigits(r.totalFilled ?? 0)} نفر نوبت‌دار شدند و ${toFaDigits(r.stillUnscheduled ?? 0)} نفر بدون نوبت باقی ماندند.`); }} className="primary-button mt-2 w-full justify-center"><Wand2 className="h-3.5 w-3.5" />توزیع خودکار کل باقی‌ماندگان</button></div>
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
              <div><h3 className="text-sm font-bold text-slate-800">تعیین دستی نوبت اشخاص و ورود به کلینیک</h3><p className="text-xs text-slate-500">هر فردی را روی تاریخ انتخابی فیکس کنید تا از سقف همان روز کسر شود.</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">تاریخ پین<PersianDateField className="min-w-40" value={pinDateDraft} onChange={setPinDateDraft} showHolidays placeholder="تاریخ پین" aria-label="تاریخ پین" /></label>
                <select value={scheduleFilter} onChange={(e) => setScheduleFilter(e.target.value as typeof scheduleFilter)} className="app-select text-xs"><option value="all">همه ({toFaDigits(contract.members.length)})</option><option value="unscheduled">فقط بدون نوبت ({toFaDigits(stats.unscheduled)})</option><option value="scheduled">دارای نوبت</option></select>
                <AppInput value={scheduleSearch} onChange={(e) => setScheduleSearch(e.target.value)} placeholder="جست‌وجوی نام..." className="app-select text-xs" />
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead><tr className="border-b border-slate-100 text-[11px] text-slate-400"><th className="pb-2.5 pr-2">نام و واحد</th><th className="pb-2.5">سن / جنس</th><th className="pb-2.5">بسته سلامت</th><th className="pb-2.5">پیش‌ثبت‌نام</th><th className="pb-2.5">وضعیت نوبت</th><th className="pb-2.5">عملیات</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {scheduleMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-2"><div className="font-semibold text-slate-800">{m.fullName}</div><div className="text-[10px] text-slate-400">{m.department} · {toFaDigits(m.phone)}</div></td>
                      <td className="py-2.5 text-slate-600">{m.gender} · {toFaDigits(m.age)} سال</td>
                      <td className="py-2.5"><select aria-label={`بسته ${m.fullName}`} value={m.assignedPathwayCode} onChange={(e) => run({ action: "OVERRIDE_MEMBER_PACKAGE", contractId: contract.id, memberId: m.id, pathwayCode: e.target.value })} className="app-select py-1 text-[11px]">{pathways.map((p) => <option key={p.code} value={p.code}>{p.title}</option>)}</select></td>
                      <td className="py-2.5"><span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${ONBOARDING_META[m.onboardingStage].badgeClass}`}>{ONBOARDING_META[m.onboardingStage].short}</span></td>
                      <td className="py-2.5"><span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${APPOINTMENT_META[m.appointmentStatus].badgeClass}`}>{APPOINTMENT_META[m.appointmentStatus].short}</span>{m.scheduledLabel && <div className="mt-0.5 text-[10px] text-slate-500">{m.scheduledLabel}</div>}</td>
                      <td className="py-2.5"><div className="flex flex-wrap items-center gap-1.5">
                        <button type="button" disabled={busy} onClick={async () => { await run({ action: "PIN_MEMBER_DATE", contractId: contract.id, memberId: m.id, date: pinDateDraft }); flash(`نوبت دستی «${m.fullName}» ثبت شد.`); }} className="secondary-button py-1 text-[10px]"><Pin className="h-3 w-3 text-purple-600" />فیکس در این تاریخ</button>
                        {m.appointmentStatus !== "unscheduled" && m.appointmentStatus !== "visit_done" && !m.linkedPatientId && <button type="button" disabled={busy} onClick={async () => { const r = await run({ action: "ADMIT_CONTRACT_MEMBER_TO_CLINIC", contractId: contract.id, memberId: m.id }); flash(`«${m.fullName}» با بسته «${m.assignedPathwayTitle}» وارد جریان کلینیک شد.`); if (r?.createdPatientId) onOpenPatientRecord(Number(r.createdPatientId)); }} className="secondary-button border-teal-200 bg-teal-50 py-1 text-[10px] text-teal-800"><UserCheck className="h-3 w-3" />پذیرش به کلینیک</button>}
                        {m.linkedPatientId && <button type="button" onClick={() => onOpenPatientRecord(m.linkedPatientId!)} className="text-[10px] font-semibold text-teal-700 hover:underline">پرونده ←</button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — funnel + sms */}
      {tab === "funnel" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {([
              { id: "all" as FunnelFilter, title: "کل افراد قرارداد", count: stats.total, sub: `${toFaDigits(stats.notSent)} بدون پیامک`, cls: "border-slate-200 bg-white" },
              { id: "sms_sent" as FunnelFilter, title: "پیامک‌شده (باز نکرده)", count: stats.smsSentOnly, sub: "هنوز لینک را باز نکرده‌اند", cls: "border-sky-200 bg-sky-50/50" },
              { id: "opened_any" as FunnelFilter, title: "لینک را باز کرده‌اند", count: stats.openedAny, sub: `${toFaDigits(stats.linkOpenedOnly)} نفر بدون لاگین`, cls: "border-indigo-200 bg-indigo-50/50" },
              { id: "logged_any" as FunnelFilter, title: "لاگین کرده‌اند", count: stats.loggedAny, sub: `${toFaDigits(stats.loggedInOnly)} نفر شروع‌نکرده`, cls: "border-violet-200 bg-violet-50/50" },
              { id: "abandoned" as FunnelFilter, title: "رها کرده وسط تکمیل", count: stats.abandoned, sub: "نیازمند یادآوری", cls: "border-amber-300 bg-amber-50/70" },
              { id: "completed" as FunnelFilter, title: "تکمیل‌شده نهایی", count: stats.completed, sub: `${toFaDigits(stats.total ? Math.round((stats.completed / stats.total) * 100) : 0)}٪ کل قرارداد`, cls: "border-emerald-200 bg-emerald-50/60" },
            ]).map((card) => (
              <button key={card.id} type="button" onClick={() => { setFunnelFilter(card.id); setCheckedIds([]); }} className={`rounded-2xl border p-3.5 text-right transition ${card.cls} ${funnelFilter === card.id ? "ring-2 ring-teal-600" : "hover:border-teal-300"}`}>
                <div className="text-[11px] font-semibold text-slate-600">{card.title}</div>
                <div className="mt-1.5 text-2xl font-bold text-slate-800 tabular-fa">{toFaDigits(card.count)}<span className="mr-1 text-xs font-normal text-slate-500">نفر</span></div>
                <div className="mt-1 text-[10px] text-slate-500">{card.sub}</div>
              </button>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-800">جزئیات تک‌به‌تک افراد ({toFaDigits(filteredFunnelMembers.length)} نفر)</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={funnelFilter} onChange={(e) => setFunnelFilter(e.target.value as FunnelFilter)} className="app-select text-xs"><option value="all">همه مراحل</option><option value="not_sent">پیامک‌نشده ({toFaDigits(stats.notSent)})</option><option value="sms_sent">بازنکرده لینک ({toFaDigits(stats.smsSentOnly)})</option><option value="opened_any">بازکنندگان لینک ({toFaDigits(stats.openedAny)})</option><option value="logged_any">لاگین‌کردگان ({toFaDigits(stats.loggedAny)})</option><option value="abandoned">رهاکردگان وسط کار ({toFaDigits(stats.abandoned)})</option><option value="completed">تکمیل‌شده ({toFaDigits(stats.completed)})</option></select>
                  <select value={apptFilter} onChange={(e) => setApptFilter(e.target.value as ApptFilter)} className="app-select text-xs"><option value="all">همه نوبت‌ها</option><option value="unscheduled">فراخوان‌نشده</option><option value="today">نوبت امروز</option><option value="pinned">دستی (پین)</option><option value="auto_scheduled">فراخوان خودکار</option><option value="visited">مراجعه‌کرده</option></select>
                  <label className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"><Search className="h-3.5 w-3.5 text-slate-400" /><AppInput value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="نام، کد ملی..." className="w-28 bg-transparent outline-none" /></label>
                </div>
              </div>
              <div className="mt-4 max-h-[520px] overflow-auto">
                <table className="w-full text-right text-xs">
                  <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-100 text-[11px] text-slate-400"><th className="pb-2 pr-1"><input type="checkbox" aria-label="انتخاب همه" checked={filteredFunnelMembers.length > 0 && checkedIds.length === filteredFunnelMembers.length} onChange={(e) => setCheckedIds(e.target.checked ? filteredFunnelMembers.map((m) => m.id) : [])} className="accent-teal-700" /></th><th className="pb-2">فرد و موبایل</th><th className="pb-2">وضعیت پیش‌ثبت‌نام</th><th className="pb-2">بسته سلامت</th><th className="pb-2">نوبت</th><th className="pb-2">لینک</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFunnelMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 pr-1"><input type="checkbox" checked={checkedIds.includes(m.id)} onChange={(e) => setCheckedIds((prev) => e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id))} className="accent-teal-700" /></td>
                        <td className="py-2.5"><div className="font-semibold text-slate-800">{m.fullName} <span className="text-[10px] font-normal text-slate-400">({m.gender} · {toFaDigits(m.age)})</span></div><div className="text-[10px] text-slate-400">{toFaDigits(m.phone)} · {m.department}</div></td>
                        <td className="py-2.5"><div className="flex flex-wrap items-center gap-1.5"><span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${ONBOARDING_META[m.onboardingStage].badgeClass}`}>{ONBOARDING_META[m.onboardingStage].label}</span><span className="text-[10px] text-slate-400">({toFaDigits(m.smsInviteCount)} پیامک)</span></div>{m.onboardingStage === "abandoned" && <div className="mt-1 flex items-center gap-2 text-[10px] text-amber-800"><span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-amber-100"><span className="block h-full bg-amber-500" style={{ width: `${m.profileProgressPct}%` }} /></span><span>{toFaDigits(m.profileProgressPct)}٪ — توقف در {m.abandonedAtStep}</span></div>}{m.onboardingStage === "completed" && m.profileCompletedAt && <div className="mt-0.5 text-[10px] text-emerald-700">تکمیل در ساعت {formatFaTime(m.profileCompletedAt)}</div>}</td>
                        <td className="py-2.5"><div className="text-[11px] font-medium text-slate-700">{m.assignedPathwayTitle}</div><div className="text-[9px] text-slate-400">{m.matchedRuleTitle}</div></td>
                        <td className="py-2.5"><span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${APPOINTMENT_META[m.appointmentStatus].badgeClass}`}>{APPOINTMENT_META[m.appointmentStatus].short}</span>{m.scheduledLabel && <div className="mt-0.5 text-[10px] text-slate-500">{m.scheduledLabel}</div>}</td>
                        <td className="py-2.5"><button type="button" onClick={() => setBanner(`لینک اختصاصی ${m.fullName}: ${m.inviteToken}`)} className="secondary-button py-1 text-[10px]"><Link2 className="h-3 w-3 text-teal-700" />مشاهده</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-4">
              <form onSubmit={async (e) => { e.preventDefault(); const recipients = checkedIds.length > 0 ? contract.members.filter((m) => checkedIds.includes(m.id)) : filteredFunnelMembers; if (!recipients.length) return; await run({ action: "SEND_CONTRACT_BULK_SMS", contractId: contract.id, memberIds: recipients.map((m) => m.id), campaignTitle: smsCampaign, audienceLabel: checkedIds.length > 0 ? `${toFaDigits(checkedIds.length)} نفر انتخاب دستی` : "گروه فیلتر شده", messageTemplate: smsText }); setCheckedIds([]); flash(`پیامک گروهی برای ${toFaDigits(recipients.length)} نفر ارسال شد.`); }} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">ارسال پیامک گروهی</h3><span className="status-badge status-teal">{toFaDigits(checkedIds.length > 0 ? checkedIds.length : filteredFunnelMembers.length)} گیرنده</span></div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => { setFunnelFilter("abandoned"); setApptFilter("all"); setCheckedIds([]); setSmsCampaign("پیگیری رهاکردگان"); setSmsText("{نام} عزیز، فرم پیش‌ثبت‌نام شما نیمه‌تمام است. از همان‌جا ادامه دهید: {لینک}"); }} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">رهاکردگان ({toFaDigits(stats.abandoned)})</button>
                  <button type="button" onClick={() => { setFunnelFilter("sms_sent"); setApptFilter("all"); setCheckedIds([]); setSmsCampaign("یادآوری بازنکردگان"); setSmsText("{نام} عزیز، هنوز لینک چکاپ {شرکت} را باز نکرده‌اید: {لینک}"); }} className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-800">بازنکردگان ({toFaDigits(stats.smsSentOnly)})</button>
                  <button type="button" onClick={() => { setFunnelFilter("all"); setApptFilter("today"); setCheckedIds([]); setSmsCampaign("یادآوری نوبت امروز"); setSmsText("{نام} گرامی، یادآوری نوبت معاینه امروز شما در کلینیک نبض."); }} className="rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-800">نوبت امروز ({toFaDigits(stats.scheduledToday)})</button>
                </div>
                <label className="app-label">عنوان ارسال<AppInput required value={smsCampaign} onChange={(e) => setSmsCampaign(e.target.value)} className="app-input mt-1 text-xs" /></label>
                <label className="app-label">متن پیامک<AppTextarea rows={3} required value={smsText} onChange={(e) => setSmsText(e.target.value)} className="app-input mt-1 text-xs leading-6" /></label>
                <button type="submit" disabled={busy || (checkedIds.length === 0 && filteredFunnelMembers.length === 0)} className="primary-button w-full justify-center"><Send className="h-3.5 w-3.5" />ارسال پیامک گروهی</button>
              </form>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-xs font-bold text-slate-800">تاریخچه پیامک‌ها ({toFaDigits(contract.smsLogs.length)})</h3>
                <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto">
                  {contract.smsLogs.map((log) => <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px]"><div className="flex items-center justify-between gap-2"><strong className="text-slate-700">{log.campaignTitle}</strong><span className="status-badge status-green">{toFaDigits(log.recipientCount)} نفر</span></div><div className="mt-1 text-[10px] text-slate-400">{log.audienceLabel} · {formatFaTime(log.sentAt)}</div><p className="mt-1.5 text-[10px] leading-5 text-slate-600">{log.messageTemplate}</p></div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {createModal}
    </div>
  );
}
