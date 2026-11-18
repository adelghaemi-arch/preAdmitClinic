import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type {
  ClinicSnapshot,
  FormAnswer,
  FormAnswerValue,
  FormDefinition,
  FormItemDefinition,
  PatientFullDto,
} from "@/types/clinic";
import {
  buildContext,
  getAnswer,
  isItemVisible,
  itemsOfSection,
  latestResponseForForm,
  overallProgress,
  prefillValue,
  resolveFormForPatient,
  sectionProgress,
  sectionsOf,
  syncSkippedAnswers,
  upsertAnswer,
  validateForm,
} from "@/lib/form-engine";
import { toFaDigits } from "@/lib/persian";

interface PreAdmitFormRendererProps {
  patient: PatientFullDto;
  forms: FormDefinition[];
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  readOnly?: boolean;
}

function YnButtons({
  value,
  disabled,
  onChange,
}: {
  value: FormAnswerValue;
  disabled?: boolean;
  onChange: (v: FormAnswerValue) => void;
}) {
  const opts: Array<{ v: FormAnswerValue; label: string }> = [
    { v: "yes", label: "بله" },
    { v: "no", label: "خیر" },
    { v: "unknown", label: "نمی‌دانم" },
  ];
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {opts.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={String(o.v)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.v)}
            className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition ${
              active
                ? o.v === "yes"
                  ? "border-rose-500 bg-rose-50 text-rose-800"
                  : o.v === "no"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-slate-500 bg-slate-100 text-slate-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ItemField({
  item,
  answer,
  disabled,
  readOnlyPrefill,
  onChange,
}: {
  item: FormItemDefinition;
  answer: FormAnswer;
  disabled?: boolean;
  readOnlyPrefill?: boolean;
  onChange: (next: FormAnswer) => void;
}) {
  if (item.inputType === "yn_unk") {
    return (
      <div>
        <YnButtons
          value={answer.valueCode}
          disabled={disabled}
          onChange={(v) =>
            onChange({
              ...answer,
              itemCode: item.code,
              valueCode: v,
              valueRaw: v ?? "",
              notes: v === "yes" ? answer.notes : "",
              skippedByRule: false,
            })
          }
        />
        {answer.valueCode === "yes" && item.notesPolicy !== "never" && (
          <label className="mt-2 block text-[11px] text-slate-600">
            توضیحات (مدت / تاریخ / شدت){item.notesPolicy === "required_if_yes" ? " — الزامی" : ""}
            <textarea
              disabled={disabled}
              rows={2}
              value={answer.notes}
              onChange={(e) => onChange({ ...answer, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs"
              placeholder="مثلاً از ۲ ماه پیش، شدت متوسط"
            />
          </label>
        )}
      </div>
    );
  }

  if (item.inputType === "select") {
    return (
      <select
        disabled={disabled || readOnlyPrefill}
        value={answer.valueRaw}
        onChange={(e) =>
          onChange({ ...answer, itemCode: item.code, valueRaw: e.target.value, valueCode: null, skippedByRule: false })
        }
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs"
      >
        <option value="">انتخاب کنید</option>
        {(item.selectOptions ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={item.inputType === "number" ? "number" : item.inputType === "date" ? "date" : "text"}
      disabled={disabled || readOnlyPrefill}
      value={answer.valueRaw}
      onChange={(e) =>
        onChange({ ...answer, itemCode: item.code, valueRaw: e.target.value, valueCode: null, skippedByRule: false })
      }
      className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs disabled:bg-slate-50"
      placeholder={item.helpText || item.labelFa}
    />
  );
}

export function PreAdmitFormRenderer({
  patient,
  forms,
  onAction,
  busy,
  readOnly = false,
}: PreAdmitFormRendererProps) {
  const form = useMemo(() => resolveFormForPatient(forms, patient.gender), [forms, patient.gender]);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<FormAnswer[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveHint, setSaveHint] = useState("");
  const answersRef = useRef<FormAnswer[]>([]);
  const hydratedKey = useRef("");
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!form) {
      setAnswers([]);
      hydratedKey.current = "";
      return;
    }
    const key = `${patient.id}:${form.id}`;
    if (hydratedKey.current === key) return;
    hydratedKey.current = key;
    const existing = latestResponseForForm(patient.formResponses, form.id);
    if (existing?.answers?.length) {
      setAnswers(existing.answers);
      return;
    }
    setAnswers(
      form.items.map((item) => ({
        itemCode: item.code,
        valueCode: null,
        valueRaw: prefillValue(item, patient),
        notes: "",
      }))
    );
  }, [form, patient.id, patient.formResponses, patient]);

  useEffect(() => {
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, []);

  const ctx = useMemo(
    () => (form ? buildContext(patient, answers, form) : { gender: patient.gender, age: patient.age, maritalStatus: "" }),
    [form, patient, answers]
  );

  const sections = useMemo(
    () => (form ? sectionsOf(form).filter((s) => !s.code.includes("SIG") && s.title !== "تأیید و امضا") : []),
    [form]
  );
  const currentSection = sections[sectionIndex];
  const progress = form ? overallProgress(form, answers, ctx) : { total: 0, done: 0, pct: 0 };
  const submitted =
    patient.intakeCompleted &&
    Boolean(
      latestResponseForForm(patient.formResponses, form?.id ?? "")?.status === "submitted" ||
        patient.formResponses?.some((r) => r.status === "submitted")
    );

  const persistDraft = async (nextAnswers: FormAnswer[], quiet = true) => {
    if (!form || readOnly || submitted) return;
    setSaving(true);
    if (!quiet) setError("");
    try {
      await onAction({
        action: "SAVE_FORM_RESPONSE",
        patientId: patient.id,
        formId: form.id,
        mode: "draft",
        answers: nextAnswers,
      });
      setSaveHint("پیشرفت این بخش ذخیره شد");
      if (!quiet) setMessage("پیش‌نویس ذخیره شد.");
    } catch {
      setSaveHint("ذخیره موقت ناموفق بود؛ پاسخ‌ها روی دستگاه مانده‌اند");
    } finally {
      setSaving(false);
    }
  };

  const scheduleDraftSave = (nextAnswers: FormAnswer[]) => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    setSaveHint("در حال ذخیره…");
    draftTimer.current = setTimeout(() => {
      void persistDraft(nextAnswers, true);
    }, 650);
  };

  const updateItem = (item: FormItemDefinition, next: FormAnswer) => {
    setAnswers((prev) => {
      const merged = upsertAnswer(prev, next);
      const synced = form ? syncSkippedAnswers(form, merged, buildContext(patient, merged, form)) : merged;
      scheduleDraftSave(synced);
      return synced;
    });
    setError("");
    setMessage("");
  };

  const goSection = async (nextIndex: number) => {
    if (nextIndex === sectionIndex) return;
    if (draftTimer.current) {
      clearTimeout(draftTimer.current);
      draftTimer.current = null;
    }
    await persistDraft(answersRef.current, true);
    setSectionIndex(nextIndex);
  };

  const persistSubmit = async () => {
    if (!form || readOnly) return;
    if (draftTimer.current) {
      clearTimeout(draftTimer.current);
      draftTimer.current = null;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const validation = validateForm(form, answers, ctx);
      if (!validation.ok) {
        setError(validation.message);
        const firstMissing = form.items.find((i) => validation.missingCodes.includes(i.code));
        if (firstMissing) {
          const idx = sections.findIndex((s) => s.id === firstMissing.sectionId);
          if (idx >= 0) setSectionIndex(idx);
        }
        return;
      }
      await onAction({
        action: "SAVE_FORM_RESPONSE",
        patientId: patient.id,
        formId: form.id,
        mode: "submit",
        answers,
      });
      setMessage("پرسشنامه با موفقیت ثبت شد و برای پزشک ارسال گردید.");
      setSaveHint("ثبت نهایی انجام شد");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره ناموفق بود.");
    } finally {
      setSaving(false);
    }
  };

  if (!patient.gender || (patient.gender !== "مرد" && patient.gender !== "زن")) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        جنسیت سلامتجو در پرونده مشخص نیست. پیش از شروع پرسشنامه، پذیرش باید جنسیت را ثبت کند.
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        فرم منتشرشده‌ای برای جامعه هدف «{patient.gender}» یافت نشد. از پنل ادمین یک فرم با این مخاطب منتشر کنید.
      </div>
    );
  }

  const sectionItems = currentSection
    ? itemsOfSection(form, currentSection.id).filter((i) => isItemVisible(i, ctx) && !i.code.includes("_SIG_"))
    : [];
  const secProg = currentSection ? sectionProgress(form, currentSection.id, answers, ctx) : { total: 0, done: 0 };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{form.title}</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              نسخه {toFaDigits(form.version)} · جامعه هدف: {form.targetAudience.gender}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                submitted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
              }`}
            >
              {submitted ? "ثبت‌شده در پرونده" : "در انتظار تکمیل"}
            </span>
            {!submitted && saveHint && (
              <span className="text-[10px] text-slate-500">{saving ? "در حال ذخیره…" : saveHint}</span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] leading-5 text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{form.warningText}</p>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] text-slate-500">
            <span>
              پیشرفت کلی: {toFaDigits(progress.done)} از {toFaDigits(progress.total)}
            </span>
            <span>{toFaDigits(progress.pct)}٪</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((sec, idx) => {
          const p = sectionProgress(form, sec.id, answers, ctx);
          const active = idx === sectionIndex;
          const done = p.total > 0 && p.done === p.total;
          const showLabel = Math.abs(idx - sectionIndex) <= 1;
          const shortTitle = sec.title.length > 22 ? `${sec.title.slice(0, 22)}…` : sec.title;
          const stepLabel = `${toFaDigits(idx + 1)}. ${sec.title}`;
          return (
            <button
              key={sec.id}
              type="button"
              title={sec.title}
              aria-label={stepLabel}
              onClick={() => void goSection(idx)}
              className={`shrink-0 rounded-full border py-1.5 text-[10px] ${
                showLabel ? "px-3" : "min-w-8 px-2.5"
              } ${
                active
                  ? "border-teal-600 bg-teal-50 text-teal-800"
                  : done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {showLabel ? (
                <>
                  {toFaDigits(idx + 1)}. {shortTitle}
                </>
              ) : (
                toFaDigits(idx + 1)
              )}
            </button>
          );
        })}
      </div>

      {currentSection && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900">{currentSection.title}</h3>
            {currentSection.guideText && (
              <p className="mt-1 text-[11px] leading-5 text-slate-500">{currentSection.guideText}</p>
            )}
            <p className="mt-1 text-[10px] text-slate-400">
              تکمیل این بخش: {toFaDigits(secProg.done)}/{toFaDigits(secProg.total)}
            </p>
          </div>

          <div className="space-y-4">
            {sectionItems.map((item) => {
              const answer = getAnswer(answers, item.code);
              const locked = Boolean(item.readOnlyIfPrefill && item.prefillFromPatient && prefillValue(item, patient));
              return (
                <div key={item.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <p className="text-xs font-medium leading-6 text-slate-800">
                    {item.labelFa}
                    {item.required && <span className="mr-1 text-rose-500">*</span>}
                  </p>
                  <ItemField
                    item={item}
                    answer={answer}
                    disabled={readOnly || submitted || busy}
                    readOnlyPrefill={locked}
                    onChange={(next) => updateItem(item, next)}
                  />
                </div>
              );
            })}
            {!sectionItems.length && (
              <p className="text-xs text-slate-500">با توجه به وضعیت تاهل/سن، آیتمی در این بخش نمایش داده نمی‌شود.</p>
            )}
          </div>
        </div>
      )}

      {(error || message) && (
        <div
          className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
            error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{error || message}</span>
        </div>
      )}

      {!readOnly && !submitted && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={sectionIndex <= 0 || saving}
              onClick={() => void goSection(Math.max(0, sectionIndex - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              بخش قبل
            </button>
            <button
              type="button"
              disabled={sectionIndex >= sections.length - 1 || saving}
              onClick={() => void goSection(Math.min(sections.length - 1, sectionIndex + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs disabled:opacity-40"
            >
              بخش بعد
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            disabled={busy || saving}
            onClick={() => void persistSubmit()}
            className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3 py-2 text-xs font-medium text-white"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            ثبت نهایی پرسشنامه
          </button>
        </div>
      )}
    </div>
  );
}

export function formsFromSnapshot(snapshot: ClinicSnapshot): FormDefinition[] {
  return snapshot.forms ?? [];
}
