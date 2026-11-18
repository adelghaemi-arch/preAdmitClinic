import React, { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Lock,
  Search,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AppUserDto, ClinicSnapshot, CorporateContract } from "@/types/clinic";
import {
  APPOINTMENT_META,
  exportContractReportExcel,
  isoDayOffset,
  ONBOARDING_META,
} from "@/lib/mock-contracts";
import { formatFaTime, toFaDigits } from "@/lib/persian";
import { normalizeText } from "@/lib/workspace";

interface CorporateSupervisorPanelProps {
  snapshot: ClinicSnapshot;
  user: AppUserDto;
  initialView?: "overview" | "roster";
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
}

export function CorporateSupervisorPanel({
  snapshot,
  user,
  initialView = "overview",
  onAction,
  busy,
}: CorporateSupervisorPanelProps) {
  // If signed in with a supervisor mobile number, scope to that supervisor's contract(s);
  // full-access demo switcher can inspect all contracts.
  const visibleContracts = useMemo(() => {
    const all = snapshot.contracts ?? [];
    const userPhone = (user.medicalCouncilCode || user.username).replace(/\D/g, "");
    if (!user.canAccessAllRoles && /^09\d{9}$/.test(userPhone)) {
      return all.filter((c) => c.supervisor.phone.replace(/\D/g, "") === userPhone);
    }
    return all;
  }, [snapshot.contracts, user]);

  const [selectedId, setSelectedId] = useState<number>(visibleContracts[0]?.id ?? 0);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [apptFilter, setApptFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [smsNote, setSmsNote] = useState("");
  const [smsBody, setSmsBody] = useState(
    "همکار گرامی {نام}، با هماهنگی واحد رفاه و سلامت سازمان، لطفاً جهت تکمیل پیش‌ثبت‌نام چکاپ دوره‌ای خود به لینک {لینک} مراجعه فرمایید."
  );

  const contract: CorporateContract | undefined =
    visibleContracts.find((c) => c.id === selectedId) ?? visibleContracts[0];

  const today = isoDayOffset(0);

  const summary = useMemo(() => {
    if (!contract) return null;
    const list = contract.members;
    const total = list.length;
    const opened = list.filter((m) =>
      ["link_opened", "logged_in", "abandoned", "completed"].includes(m.onboardingStage)
    ).length;
    const logged = list.filter((m) =>
      ["logged_in", "abandoned", "completed"].includes(m.onboardingStage)
    ).length;
    const abandoned = list.filter((m) => m.onboardingStage === "abandoned").length;
    const completed = list.filter((m) => m.onboardingStage === "completed").length;
    const notOpened = list.filter(
      (m) => m.onboardingStage === "sms_sent" || m.onboardingStage === "not_sent"
    ).length;

    const unscheduled = list.filter((m) => m.appointmentStatus === "unscheduled").length;
    const todayScheduled = list.filter(
      (m) => m.scheduledDate === today && m.appointmentStatus !== "unscheduled"
    ).length;
    const futureScheduled = list.filter(
      (m) =>
        m.scheduledDate !== null &&
        m.scheduledDate > today &&
        (m.appointmentStatus === "pinned" || m.appointmentStatus === "auto_scheduled")
    ).length;
    const visited = list.filter(
      (m) => m.appointmentStatus === "checked_in" || m.appointmentStatus === "visit_done"
    ).length;

    // Department breakdown
    const deptMap = new Map<
      string,
      { total: number; onboarded: number; scheduled: number; visited: number }
    >();
    for (const m of list) {
      const cur = deptMap.get(m.department) ?? { total: 0, onboarded: 0, scheduled: 0, visited: 0 };
      cur.total++;
      if (m.onboardingStage === "completed") cur.onboarded++;
      if (m.appointmentStatus !== "unscheduled") cur.scheduled++;
      if (m.appointmentStatus === "checked_in" || m.appointmentStatus === "visit_done") cur.visited++;
      deptMap.set(m.department, cur);
    }
    const departments = [...deptMap.entries()]
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.total - a.total);

    return {
      total,
      opened,
      logged,
      abandoned,
      completed,
      notOpened,
      unscheduled,
      todayScheduled,
      futureScheduled,
      visited,
      departments,
    };
  }, [contract, today]);

  const filtered = useMemo(() => {
    if (!contract) return [];
    const q = normalizeText(query.trim());
    return contract.members.filter((m) => {
      if (q && !normalizeText(`${m.fullName} ${m.department} ${m.phone} ${m.personnelCode}`).includes(q)) {
        return false;
      }
      if (stageFilter === "incomplete" && m.onboardingStage === "completed") return false;
      if (stageFilter !== "all" && stageFilter !== "incomplete" && m.onboardingStage !== stageFilter) {
        return false;
      }
      if (apptFilter === "unscheduled" && m.appointmentStatus !== "unscheduled") return false;
      if (apptFilter === "scheduled" && m.appointmentStatus === "unscheduled") return false;
      if (apptFilter === "today" && (m.scheduledDate !== today || m.appointmentStatus === "unscheduled")) {
        return false;
      }
      return true;
    });
  }, [contract, query, stageFilter, apptFilter, today]);

  if (!contract || !summary) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
        هیچ قرارداد فعالی به شماره موبایل ناظر شما متصل نیست.
      </div>
    );
  }

  const handleSupervisorReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    const pendingTargets = filtered.filter((m) => m.onboardingStage !== "completed");
    if (!pendingTargets.length) return;
    await onAction({
      action: "SEND_CONTRACT_BULK_SMS",
      contractId: contract.id,
      memberIds: pendingTargets.map((m) => m.id),
      campaignTitle: `یادآوری ناظر سازمان (${contract.organizationName})`,
      audienceLabel: `${toFaDigits(pendingTargets.length)} همکار تکمیل‌نکرده`,
      messageTemplate: smsBody,
    });
    setSmsNote(`پیامک یادآوری برای ${toFaDigits(pendingTargets.length)} نفر از همکاران سازمان ارسال شد.`);
    setTimeout(() => setSmsNote(""), 4500);
  };

  const incompleteInFilter = filtered.filter((m) => m.onboardingStage !== "completed").length;

  return (
    <div className="module-content space-y-5">
      {/* Organization Supervisor Banner */}
      <section className="rounded-2xl border border-[#dcebe6] bg-[#edf6f1] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#20745c] text-white">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[#3a755c]">
                  پنل نظارت سازمان طرف قرارداد
                </span>
                <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] text-[#3a755c]">
                  ناظر: {contract.supervisor.fullName} ({toFaDigits(contract.supervisor.phone)})
                </span>
              </div>
              <h1 className="mt-1 text-lg font-extrabold text-[#1f4739]">{contract.title}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#5c7c6e]">
                <Lock className="h-3 w-3" />
                رصد زنده پیش‌ثبت‌نام، نوبت‌های معاینه و مراجعه کارکنان «{contract.organizationName}» (نتایج بالینی محرمانه نزد سلامتجو و پزشک است)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {visibleContracts.length > 1 && (
              <select
                aria-label="انتخاب قرارداد تحت نظارت"
                value={contract.id}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="app-select bg-white text-xs font-semibold"
              >
                {visibleContracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.organizationName} ({toFaDigits(c.members.length)} نفر)
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => exportContractReportExcel(contract)}
              className="primary-button"
            >
              <Download className="h-3.5 w-3.5" />
              دانلود گزارش اکسل سازمان
            </button>
          </div>
        </div>
      </section>

      {smsNote && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="ml-1.5 inline h-4 w-4 text-emerald-600" />
          {smsNote}
        </div>
      )}

      {initialView === "overview" && (
        <>
          {/* Two clear streams: 1) Pre-registration funnel  2) Appointment & attendance */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Users className="h-4 w-4 text-teal-700" />
                  جریان ۱: قیف تکمیل پروفایل پیش‌ثبت‌نام کارکنان
                </h2>
                <span className="text-xs font-semibold text-teal-700">
                  کل: {toFaDigits(summary.total)} نفر
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { label: "لینک پیامک را باز کرده‌اند", val: summary.opened, color: "bg-indigo-500" },
                  { label: "وارد حساب شده‌اند (لاگین)", val: summary.logged, color: "bg-violet-500" },
                  { label: "وسط تکمیل پروفایل رها کرده‌اند", val: summary.abandoned, color: "bg-amber-500" },
                  { label: "پیش‌ثبت‌نام را کامل کرده‌اند", val: summary.completed, color: "bg-emerald-600" },
                  { label: "هنوز لینک را باز نکرده‌اند", val: summary.notOpened, color: "bg-slate-400" },
                ].map((row) => {
                  const pct = summary.total ? Math.round((row.val / summary.total) * 100) : 0;
                  return (
                    <div key={row.label} className="text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>{row.label}</span>
                        <strong className="tabular-fa text-slate-800">
                          {toFaDigits(row.val)} نفر ({toFaDigits(pct)}٪)
                        </strong>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Calendar className="h-4 w-4 text-teal-700" />
                  جریان ۲: وضعیت نوبت‌دهی و مراجعه به کلینیک (مستقل)
                </h2>
                <span className="status-badge status-green">پایش زنده</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3.5">
                  <div className="text-slate-500">دارای نوبت معاینه امروز</div>
                  <div className="mt-1 text-2xl font-bold text-teal-800 tabular-fa">
                    {toFaDigits(summary.todayScheduled)} نفر
                  </div>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3.5">
                  <div className="text-slate-500">نوبت روزهای آینده</div>
                  <div className="mt-1 text-2xl font-bold text-sky-800 tabular-fa">
                    {toFaDigits(summary.futureScheduled)} نفر
                  </div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5">
                  <div className="text-rose-700 font-medium">هنوز فراخوان و نوبت‌دهی نشده</div>
                  <div className="mt-1 text-2xl font-bold text-rose-900 tabular-fa">
                    {toFaDigits(summary.unscheduled)} نفر
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                  <div className="text-emerald-700 font-medium">مراجعه‌کرده / معاینه انجام‌شده</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-900 tabular-fa">
                    {toFaDigits(summary.visited)} نفر
                  </div>
                </div>
              </div>

              {/* Scheduled day caps preview */}
              <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                <div className="text-[11px] font-semibold text-slate-600">سهمیه‌های روزانه هماهنگ‌شده با کلینیک:</div>
                {contract.dayQuotas.map((q) => {
                  const cnt = contract.members.filter(
                    (m) => m.scheduledDate === q.date && m.appointmentStatus !== "unscheduled"
                  ).length;
                  return (
                    <div
                      key={q.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-[11px]"
                    >
                      <span className="text-slate-700">
                        {q.persianLabel} ({q.genderFilter === "همه" ? "همه" : `ویژه ${q.genderFilter}`})
                      </span>
                      <strong className="text-teal-700 tabular-fa">
                        {toFaDigits(cnt)} از سقف {toFaDigits(q.totalCap)} نفر
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Department progress table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-800">پیشرفت به تفکیک واحدهای سازمانی</h3>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {summary.departments.slice(0, 8).map((d) => (
                <div key={d.name} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="truncate text-slate-700">{d.name}</strong>
                    <span className="text-[10px] text-slate-400">{toFaDigits(d.total)} نفر</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>پروفایل کامل: {toFaDigits(d.onboarded)}</span>
                    <span>نوبت‌دار: {toFaDigits(d.scheduled)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Employee Roster + Optional Supervisor Group Reminder */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-800">
              فهرست پیگیری کارمندان ({toFaDigits(filtered.length)} نفر)
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="app-select text-xs"
              >
                <option value="all">همه وضعیت‌های پروفایل</option>
                <option value="incomplete">همه تکمیل‌نکرده‌ها</option>
                <option value="abandoned">رها کرده وسط کار</option>
                <option value="logged_in">لاگین کرده</option>
                <option value="link_opened">فقط لینک باز کرده</option>
                <option value="sms_sent">پیامک‌شده (باز نکرده)</option>
                <option value="completed">تکمیل‌شده</option>
              </select>
              <select
                value={apptFilter}
                onChange={(e) => setApptFilter(e.target.value)}
                className="app-select text-xs"
              >
                <option value="all">همه وضعیت‌های نوبت</option>
                <option value="today">نوبت امروز</option>
                <option value="scheduled">دارای نوبت</option>
                <option value="unscheduled">فراخوان‌نشده</option>
              </select>
              <label className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="نام یا واحد..."
                  className="w-28 bg-transparent outline-none"
                />
              </label>
            </div>
          </div>

          <div className="mt-4 max-h-[440px] overflow-auto">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                  <th className="pb-2">نام کارمند و واحد</th>
                  <th className="pb-2">بسته سلامت</th>
                  <th className="pb-2">پیش‌ثبت‌نام</th>
                  <th className="pb-2">نوبت و مراجعه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5">
                      <div className="font-semibold text-slate-800">{m.fullName}</div>
                      <div className="text-[10px] text-slate-400">
                        {m.department} · کد {m.personnelCode} · {toFaDigits(m.phone)}
                      </div>
                    </td>
                    <td className="py-2.5 text-[11px] text-slate-600">{m.assignedPathwayTitle}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          ONBOARDING_META[m.onboardingStage].badgeClass
                        }`}
                      >
                        {ONBOARDING_META[m.onboardingStage].short}
                      </span>
                      {m.onboardingStage === "abandoned" && (
                        <div className="mt-0.5 text-[10px] text-amber-700">
                          {toFaDigits(m.profileProgressPct)}٪ تکمیل شده
                        </div>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          APPOINTMENT_META[m.appointmentStatus].badgeClass
                        }`}
                      >
                        {APPOINTMENT_META[m.appointmentStatus].short}
                      </span>
                      {m.scheduledLabel && (
                        <div className="mt-0.5 text-[10px] text-slate-500">{m.scheduledLabel}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supervisor reminder card */}
        <div className="space-y-4 lg:col-span-4">
          <form
            onSubmit={handleSupervisorReminder}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold text-slate-800">پیگیری و یادآوری به همکاران</h3>
            </div>
            <p className="text-[11px] text-slate-500">
              ارسال پیامک یادآوری به {toFaDigits(incompleteInFilter)} نفر از همکاران تکمیل‌نکرده در فهرست فعلی.
            </p>
            <textarea
              rows={4}
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
              disabled={!contract.supervisor.canSendReminders}
              className="app-input text-xs leading-6"
            />
            <button
              type="submit"
              disabled={busy || !contract.supervisor.canSendReminders || incompleteInFilter === 0}
              className="primary-button w-full justify-center"
            >
              <Send className="h-3.5 w-3.5" />
              ارسال یادآوری به {toFaDigits(incompleteInFilter)} همکار
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs">
            <div className="font-bold text-slate-700">آخرین اطلاع‌رسانی‌های قرارداد</div>
            <div className="mt-2.5 max-h-48 space-y-2 overflow-y-auto">
              {contract.smsLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="rounded-lg bg-slate-50 p-2.5 text-[10px]">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{log.campaignTitle}</span>
                    <span>{toFaDigits(log.recipientCount)} نفر</span>
                  </div>
                  <div className="mt-0.5 text-slate-400">
                    {log.senderName} · {formatFaTime(log.sentAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
