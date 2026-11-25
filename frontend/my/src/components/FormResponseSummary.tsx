/*
 File: frontend/my/src/components/FormResponseSummary.tsx
 Description: خلاصه پاسخ پرسشنامه — مود اولویت بالینی (مثبت/توضیح/هشدار) و پرسشنامه کامل
 Parent Dependencies: form-engine, types/clinic
 */
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, FileText, ListFilter } from "lucide-react";
import type { ClinicSnapshot, FormDefinition, PatientFullDto } from "@/types/clinic";
import {
  answersBySection,
  buildAiPayload,
  redFlagAnswers,
  resolveFormFromResponse,
  submittedResponse,
  ynLabel,
  type FormAnswerRow,
  type SectionAnswerBundle,
} from "@/lib/form-engine";
import { formatFaDate, toFaDigits } from "@/lib/persian";
import { isIsoDay } from "@/lib/date-iso";

export type FormSummaryViewMode = "flags" | "full";

interface FormResponseSummaryProps {
  patient: PatientFullDto;
  forms: FormDefinition[];
  /** @deprecated use viewMode / enableViewToggle — maps to flags without toggle */
  compact?: boolean;
  enableViewToggle?: boolean;
  viewMode?: FormSummaryViewMode;
  expandAllSections?: boolean;
  showAiPayloadToggle?: boolean;
}

function formatAnswerDisplay(row: FormAnswerRow): string {
  const { item, answer } = row;
  if (item.inputType === "yn_unk") return ynLabel(answer.valueCode);
  if (item.inputType === "date" && isIsoDay(answer.valueRaw)) return formatFaDate(answer.valueRaw);
  return answer.valueRaw || "—";
}

function AnswerRowView({ row }: { row: FormAnswerRow }) {
  const value = formatAnswerDisplay(row);
  const notes =
    row.hasNotes || (row.answer.notes.trim() && (row.item.inputType !== "yn_unk" || row.answer.valueCode === "yes"))
      ? row.answer.notes.trim()
      : "";
  return (
    <div
      className={`rounded-lg px-2.5 py-2 text-[11px] leading-5 ${
        row.isRedFlag
          ? "border border-rose-200 bg-rose-50 text-rose-950"
          : notes
            ? "border border-amber-200 bg-amber-50/80 text-slate-800"
            : "border border-transparent text-slate-700"
      }`}
    >
      <div className="flex flex-wrap items-start gap-1.5">
        {row.isRedFlag && (
          <span className="mt-0.5 inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-800">
            <AlertTriangle className="h-3 w-3" />
            هشدار
          </span>
        )}
        {!row.isRedFlag && notes ? (
          <span className="mt-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">نکته</span>
        ) : null}
        <div className="min-w-0 flex-1">
          <span className="font-medium">{row.item.labelFa}: </span>
          <span
            className={
              row.isRedFlag || (row.item.inputType === "yn_unk" && row.answer.valueCode === "yes")
                ? "font-semibold"
                : ""
            }
          >
            {value}
          </span>
          {notes ? <div className="mt-0.5 text-[10px] text-slate-600">توضیح: {notes}</div> : null}
        </div>
      </div>
    </div>
  );
}

function SectionDrillDown({
  bundles,
  expandAll,
  openSectionId,
  onOpenSection,
}: {
  bundles: SectionAnswerBundle[];
  expandAll: boolean;
  openSectionId: string | null;
  onOpenSection: (id: string | null) => void;
}) {
  if (!bundles.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-500">
        موردی برای نمایش در این مود ثبت نشده است.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bundles.map((bundle) => {
        const open = expandAll || openSectionId === bundle.section.id;
        return (
          <div
            key={bundle.section.id}
            className={`overflow-hidden rounded-xl border ${
              bundle.flagCount > 0 ? "border-rose-200" : "border-slate-200"
            } bg-white`}
          >
            <button
              type="button"
              disabled={expandAll}
              onClick={() => onOpenSection(open && !expandAll ? null : bundle.section.id)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-right ${
                expandAll ? "cursor-default" : "hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-800">{bundle.section.title}</div>
                <div className="mt-0.5 flex flex-wrap gap-1.5 text-[9px]">
                  {bundle.flagCount > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-800">
                      {toFaDigits(bundle.flagCount)} هشدار
                    </span>
                  )}
                  {bundle.specialCount > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      {toFaDigits(bundle.specialCount)} مورد خاص
                    </span>
                  )}
                  <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-500">
                    {toFaDigits(bundle.rows.length)} پاسخ
                  </span>
                </div>
              </div>
              {!expandAll && (
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
              )}
            </button>
            {open && (
              <div className="space-y-1.5 border-t border-slate-100 px-2.5 py-2.5">
                {bundle.rows.map((row) => (
                  <AnswerRowView key={row.item.code} row={row} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FormResponseSummary({
  patient,
  forms,
  compact = false,
  enableViewToggle = false,
  viewMode: viewModeProp,
  expandAllSections = false,
  showAiPayloadToggle = false,
}: FormResponseSummaryProps) {
  const response = submittedResponse(patient);
  const form = useMemo(() => resolveFormFromResponse(forms, response), [forms, response]);

  const [mode, setMode] = useState<FormSummaryViewMode>(
    () => viewModeProp ?? (compact ? "flags" : enableViewToggle ? "flags" : "full")
  );
  const [showPayload, setShowPayload] = useState(false);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const activeMode: FormSummaryViewMode = viewModeProp
    ? viewModeProp
    : enableViewToggle
      ? mode
      : compact
        ? "flags"
        : "full";

  const flags = useMemo(() => (form && response ? redFlagAnswers(form, response) : []), [form, response]);
  const bundles = useMemo(
    () => (form && response ? answersBySection(form, response, activeMode) : []),
    [form, response, activeMode]
  );
  const expandAll = expandAllSections || (!enableViewToggle && activeMode === "full" && !compact);
  const payload = useMemo(() => (form && response ? buildAiPayload(form, response) : null), [form, response]);

  useEffect(() => {
    if (viewModeProp) setMode(viewModeProp);
  }, [viewModeProp]);

  useEffect(() => {
    setOpenSectionId(null);
  }, [patient.id, activeMode]);

  useEffect(() => {
    if (expandAll) return;
    setOpenSectionId((prev) => {
      if (prev && bundles.some((b) => b.section.id === prev)) return prev;
      const firstFlagged = bundles.find((b) => b.flagCount > 0) ?? bundles[0];
      return firstFlagged?.section.id ?? null;
    });
  }, [patient.id, activeMode, expandAll, bundles]);

  if (!patient.intakeCompleted || !response || !form) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
        پرسشنامه پیش‌پذیرش این مراجعه هنوز ثبت نهایی نشده است.
      </div>
    );
  }

  const jumpToFlag = (sectionId: string) => {
    if (enableViewToggle) setMode("flags");
    setOpenSectionId(sectionId);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{form.title}</h3>
        <p className="text-[10px] text-slate-500">
          نسخه {toFaDigits(form.version)} · ثبت{" "}
          {response.completedAt ? new Date(response.completedAt).toLocaleString("fa-IR") : "—"}
          {activeMode === "full" ? " · فقط خواندنی" : ""}
        </p>
      </div>

      {enableViewToggle && (
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("flags")}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold transition ${
              activeMode === "flags" ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            اولویت بالینی
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold transition ${
              activeMode === "full" ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            پرسشنامه کامل
          </button>
        </div>
      )}

      {flags.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-rose-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            موارد هشدار گزارش‌شده توسط سلامتجو
          </div>
          <ul className="space-y-1 text-[11px] text-rose-900">
            {flags.map(({ item, answer }) => (
              <li key={item.code}>
                {enableViewToggle || !expandAll ? (
                  <button
                    type="button"
                    className="text-right underline-offset-2 hover:underline"
                    onClick={() => jumpToFlag(item.sectionId)}
                  >
                    • {item.labelFa}
                    {answer.notes ? ` — ${answer.notes}` : ""}
                  </button>
                ) : (
                  <>
                    • {item.labelFa}
                    {answer.notes ? ` — ${answer.notes}` : ""}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeMode === "full" && enableViewToggle && (
        <p className="text-[10px] text-slate-500">
          کل فرم ثبت‌شده همان پاسخ‌های سلامتجو است؛ فقط خواندنی برای مرور پزشک.
        </p>
      )}

      <SectionDrillDown
        bundles={bundles}
        expandAll={expandAll}
        openSectionId={openSectionId}
        onOpenSection={setOpenSectionId}
      />

      {showAiPayloadToggle && payload && (
        <div>
          <button
            type="button"
            onClick={() => setShowPayload((v) => !v)}
            className="text-[10px] text-teal-700 underline"
          >
            {showPayload ? "پنهان کردن" : "نمایش"} خروجی ساخت‌یافته برای تحلیل AI
          </button>
          {showPayload && (
            <pre
              className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-[10px] text-emerald-100"
              dir="ltr"
            >
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function formsOfSnapshot(snapshot: ClinicSnapshot): FormDefinition[] {
  return snapshot.forms ?? [];
}
