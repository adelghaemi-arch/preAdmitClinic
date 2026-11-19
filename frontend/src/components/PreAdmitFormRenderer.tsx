import { AppInput, AppTextarea } from "@/components/AppInput";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader2,
  Shield,
} from "lucide-react";
import type {
  ClinicSnapshot,
  FormAnswer,
  FormAnswerValue,
  FormDefinition,
  FormItemDefinition,
  FormSectionDefinition,
  IntakeDocumentType,
  PatientFullDto,
} from "@/types/clinic";
import {
  buildContext,
  getAnswer,
  isFormDateItem,
  isItemComplete,
  isItemVisible,
  itemsOfSection,
  latestResponseForForm,
  overallProgress,
  prefillValue,
  resolveFormForPatient,
  sectionProgress,
  syncSkippedAnswers,
  upsertAnswer,
  validateForm,
  visibleSections,
} from "@/lib/form-engine";
import { toFaDigits } from "@/lib/persian";
import { iranLocalDayOffset } from "@/lib/date-iso";
import { birthDateBounds, PersianDateField } from "@/components/PersianDateField";
import { ProvinceCityField } from "@/components/ProvinceCityField";
import { PatientPhotoCapture } from "@/components/PatientPhotoCapture";
import { PreAdmitDocumentsPanel } from "@/components/PreAdmitDocumentsPanel";
import { ContextualIntakeUpload } from "@/components/ContextualIntakeUpload";
import { screeningDocumentPromptsForItem } from "@/lib/intake-documents";

/** Screening / vaccination sections rendered as a final dossier phase, not in the main stepper. */
const SCREENING_SECTION_CODES = new Set(["CA_F_SEC_9", "CA_M_SEC_10"]);

interface PreAdmitFormRendererProps {
  patient: PatientFullDto;
  forms: FormDefinition[];
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
  readOnly?: boolean;
  userId?: number | null;
  fraudIntervalSeconds?: number;
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

function itemRowClass(opts: { requiredEmpty: boolean; invalid: boolean }): string {
  if (opts.invalid) return "form-item-row form-item-row--invalid";
  if (opts.requiredEmpty) return "form-item-row form-item-row--required-empty";
  return "form-item-row";
}

function displayFormTitle(form: FormDefinition): string {
  if (form.code === "cancer_screening_female_v02") return "پرسشنامه پیش‌پذیرش";
  if (/غربالگری و واکسیناسیون/.test(form.title)) return "پرسشنامه پیش‌پذیرش";
  return form.title;
}

type BaseLayoutRow =
  | { kind: "full"; item: FormItemDefinition }
  | { kind: "pair"; items: [FormItemDefinition, FormItemDefinition] };

function isBaseInfoSection(sectionCode: string): boolean {
  return sectionCode.endsWith("_SEC_BASE") || sectionCode.endsWith("_SEC_DEMO");
}

/** Pair related/readonly base-info (demographic) fields; leave long controls full-width. */
function layoutBaseItems(items: FormItemDefinition[]): BaseLayoutRow[] {
  const bySuffix = (suffix: string) =>
    items.find((i) => i.code.endsWith(suffix) || i.code.endsWith(suffix.replace("_BASE_", "_DEMO_")));
  const fullName = bySuffix("_BASE_fullName");
  const nationalId = bySuffix("_BASE_nationalId");
  const phone = bySuffix("_BASE_phone");
  const birthDate = bySuffix("_BASE_birthDate");
  const formDate = bySuffix("_BASE_formDate");
  const heightCm = bySuffix("_BASE_heightCm");
  const weightKg = bySuffix("_BASE_weightKg");
  const waistCm = bySuffix("_BASE_waistCm");
  const maritalStatus = bySuffix("_BASE_maritalStatus");
  const city = bySuffix("_BASE_city");

  const rows: BaseLayoutRow[] = [];
  const used = new Set<string>();
  const take = (item?: FormItemDefinition) => {
    if (!item) return undefined;
    used.add(item.id);
    return item;
  };
  const pushPairOrFull = (a?: FormItemDefinition, b?: FormItemDefinition) => {
    if (a && b) rows.push({ kind: "pair", items: [a, b] });
    else {
      if (a) rows.push({ kind: "full", item: a });
      if (b) rows.push({ kind: "full", item: b });
    }
  };

  // Long name stays full-width.
  const name = take(fullName);
  if (name) rows.push({ kind: "full", item: name });

  // Read-only demographics together.
  pushPairOrFull(take(nationalId), take(phone));

  // Remaining locked form-date alone (do not pair with editable fields).
  const formDt = take(formDate);
  if (formDt) rows.push({ kind: "full", item: formDt });

  const birth = take(birthDate);
  if (birth) rows.push({ kind: "full", item: birth });

  // Related vitals / status pairs (two columns from mobile up).
  pushPairOrFull(take(heightCm), take(weightKg));
  pushPairOrFull(take(waistCm), take(maritalStatus));

  // Province/city control is wide.
  const cityItem = take(city);
  if (cityItem) rows.push({ kind: "full", item: cityItem });

  for (const item of items) {
    if (!used.has(item.id)) rows.push({ kind: "full", item });
  }
  return rows;
}

function ensureFormDateAnswers(
  form: FormDefinition,
  answers: FormAnswer[],
  patient: PatientFullDto
): FormAnswer[] {
  const byCode = new Map(answers.map((a) => [a.itemCode, a]));
  let changed = false;
  for (const item of form.items) {
    if (!isFormDateItem(item)) continue;
    const today = prefillValue(item, patient);
    const existing = byCode.get(item.code);
    if (!existing) {
      byCode.set(item.code, { itemCode: item.code, valueCode: null, valueRaw: today, notes: "" });
      changed = true;
      continue;
    }
    if (!existing.valueRaw?.trim()) {
      byCode.set(item.code, { ...existing, valueRaw: today });
      changed = true;
    }
  }
  if (!changed) return answers;
  return form.items.map(
    (item) =>
      byCode.get(item.code) ?? {
        itemCode: item.code,
        valueCode: null,
        valueRaw: prefillValue(item, patient),
        notes: "",
      }
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
  const [focusNotes, setFocusNotes] = useState(false);

  if (item.inputType === "yn_unk") {
    return (
      <div>
        <YnButtons
          value={answer.valueCode}
          disabled={disabled}
          onChange={(v) => {
            setFocusNotes(v === "yes" && item.notesPolicy !== "never");
            onChange({
              ...answer,
              itemCode: item.code,
              valueCode: v,
              valueRaw: v ?? "",
              skippedByRule: false,
            });
          }}
        />
        {answer.valueCode === "yes" && item.notesPolicy !== "never" && (
          <label className="mt-2 block text-[11px] text-slate-600">
            توضیحات (مدت / تاریخ / شدت)
            {item.notesPolicy === "required_if_yes" ? (
              <>
                {" — "}
                <span className="font-bold text-red-600">الزامی</span>
              </>
            ) : null}
            <AppTextarea
              autoFocus={focusNotes}
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
        disabled={Boolean(disabled || readOnlyPrefill)}
        value={answer.valueRaw}
        onChange={(e) =>
          onChange({ ...answer, itemCode: item.code, valueRaw: e.target.value, valueCode: null, skippedByRule: false })
        }
        className={`mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs ${
          readOnlyPrefill ? "app-field--readonly" : "bg-white disabled:bg-slate-50"
        }`}
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

  if (item.inputType === "date") {
    // Always use grid: library rules/holidays only work on grid; dropdown also seeds empty as "today".
    const isBirth = /birthDate|birth_date/i.test(item.code) || /تولد/.test(item.labelFa);
    const bounds = isBirth ? birthDateBounds(iranLocalDayOffset(0)) : undefined;
    return (
      <PersianDateField
        className="mt-1"
        value={answer.valueRaw}
        disabled={disabled}
        readOnly={readOnlyPrefill}
        required={item.required}
        placeholder={item.helpText || item.labelFa}
        variant="grid"
        showHolidays={!isBirth}
        minDate={bounds?.minDate}
        maxDate={bounds?.maxDate}
        aria-label={item.labelFa}
        onChange={(iso) =>
          onChange({ ...answer, itemCode: item.code, valueRaw: iso, valueCode: null, skippedByRule: false })
        }
      />
    );
  }

  if (item.inputType === "province_city") {
    return (
      <ProvinceCityField
        className="mt-1"
        value={answer.valueRaw}
        disabled={disabled}
        readOnly={readOnlyPrefill}
        required={item.required}
        aria-label={item.labelFa}
        onChange={(valueRaw) =>
          onChange({ ...answer, itemCode: item.code, valueRaw, valueCode: null, skippedByRule: false })
        }
      />
    );
  }

  return (
    <AppInput
      type={item.inputType === "number" ? "number" : "text"}
      disabled={disabled}
      readOnly={readOnlyPrefill}
      value={answer.valueRaw}
      onChange={(e) =>
        onChange({ ...answer, itemCode: item.code, valueRaw: e.target.value, valueCode: null, skippedByRule: false })
      }
      className="app-input mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs disabled:bg-slate-50"
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
  userId = null,
  fraudIntervalSeconds = 3,
}: PreAdmitFormRendererProps) {
  const form = useMemo(
    () => resolveFormForPatient(forms, patient.gender, patient.age),
    [forms, patient.gender, patient.age]
  );
  const [sectionIndex, setSectionIndex] = useState(0);
  const [onScreeningPhase, setOnScreeningPhase] = useState(false);
  const [onDocumentsPhase, setOnDocumentsPhase] = useState(false);
  const [answers, setAnswers] = useState<FormAnswer[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveHint, setSaveHint] = useState("");
  const [invalidCodes, setInvalidCodes] = useState<string[]>([]);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const answersRef = useRef<FormAnswer[]>([]);
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollCode = useRef<string | null>(null);
  const skipNextTopScroll = useRef(false);
  const navScrollReady = useRef(false);
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
    setSectionIndex(0);
    setOnScreeningPhase(false);
    setOnDocumentsPhase(false);
    setInvalidCodes([]);
    setLocalPhotoUrl(null);
    const existing = latestResponseForForm(patient.formResponses, form.id);
    if (existing?.answers?.length) {
      setAnswers(ensureFormDateAnswers(form, existing.answers, patient));
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

  useEffect(() => {
    if (!navScrollReady.current) {
      navScrollReady.current = true;
      return;
    }
    if (pendingScrollCode.current) {
      const code = pendingScrollCode.current;
      pendingScrollCode.current = null;
      const timer = window.setTimeout(() => {
        document.querySelector(`[data-item-code="${code}"]`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 60);
      return () => window.clearTimeout(timer);
    }
    if (skipNextTopScroll.current) {
      skipNextTopScroll.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [sectionIndex, onScreeningPhase, onDocumentsPhase]);

  const ctx = useMemo(
    () => (form ? buildContext(patient, answers, form) : { gender: patient.gender, age: patient.age, maritalStatus: "" }),
    [form, patient, answers]
  );

  const allSections = useMemo(() => {
    if (!form) return [];
    return visibleSections(form, ctx).filter((s) => !s.code.includes("SIG") && s.title !== "تأیید و امضا");
  }, [form, ctx]);
  const screeningSection = useMemo(
    () => allSections.find((s) => SCREENING_SECTION_CODES.has(s.code)) ?? null,
    [allSections]
  );
  const sections = useMemo(
    () => allSections.filter((s) => !SCREENING_SECTION_CODES.has(s.code)),
    [allSections]
  );
  const currentSection = onScreeningPhase || onDocumentsPhase ? null : sections[sectionIndex] ?? null;
  const progress = form ? overallProgress(form, answers, ctx) : { total: 0, done: 0, pct: 0 };
  const screeningProg =
    form && screeningSection ? sectionProgress(form, screeningSection.id, answers, ctx) : { total: 0, done: 0 };
  const screeningDone =
    !screeningSection || (screeningProg.total > 0 && screeningProg.done === screeningProg.total);

  // Keep stepper index valid when marital/age filters shrink the visible section list.
  useEffect(() => {
    if (sections.length === 0) {
      if (sectionIndex !== 0) setSectionIndex(0);
      return;
    }
    if (sectionIndex >= sections.length) setSectionIndex(sections.length - 1);
  }, [sections.length, sectionIndex]);

  // If screening has no visible items, never stay on that phase.
  useEffect(() => {
    if (onScreeningPhase && !screeningSection) {
      setOnScreeningPhase(false);
      setOnDocumentsPhase(true);
    }
  }, [onScreeningPhase, screeningSection]);
  const intakeDocuments = patient.intakeDocuments ?? [];
  const documentsDone = intakeDocuments.length > 0;
  const submitted =
    patient.intakeCompleted &&
    Boolean(
      latestResponseForForm(patient.formResponses, form?.id ?? "")?.status === "submitted" ||
        patient.formResponses?.some((r) => r.status === "submitted")
    );
  const invalidSet = useMemo(() => new Set(invalidCodes), [invalidCodes]);

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
        silent: true,
      });
      // Keep a subtle inline hint only; never toast on autosave.
      setSaveHint("");
      if (!quiet) setMessage("پیش‌نویس ذخیره شد.");
    } catch {
      setSaveHint("ذخیره موقت ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const scheduleDraftSave = (nextAnswers: FormAnswer[]) => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
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
    setInvalidCodes((prev) => prev.filter((c) => c !== item.code));
    setError("");
    setMessage("");
  };

  const flushDraft = async () => {
    if (draftTimer.current) {
      clearTimeout(draftTimer.current);
      draftTimer.current = null;
    }
    await persistDraft(answersRef.current, true);
  };

  const missingCodesForItems = (items: FormItemDefinition[], nextAnswers = answers) =>
    items.filter((i) => i.required && !isItemComplete(i, getAnswer(nextAnswers, i.code), true)).map((i) => i.code);

  const focusMissingCodes = (codes: string[]) => {
    if (!codes.length || !form) return;
    setInvalidCodes(codes);
    const first = form.items.find((i) => codes.includes(i.code));
    if (!first) return;
    pendingScrollCode.current = first.code;
    skipNextTopScroll.current = true;
    const missingSection = allSections.find((s) => s.id === first.sectionId);
    const needsScreening = Boolean(missingSection && SCREENING_SECTION_CODES.has(missingSection.code));
    const idx = needsScreening ? -1 : sections.findIndex((s) => s.id === first.sectionId);
    const alreadyThere =
      (needsScreening && onScreeningPhase && !onDocumentsPhase) ||
      (!needsScreening && !onScreeningPhase && !onDocumentsPhase && idx === sectionIndex);

    if (needsScreening) {
      setOnDocumentsPhase(false);
      if (!onScreeningPhase) setOnScreeningPhase(true);
    } else if (idx >= 0 && (onScreeningPhase || onDocumentsPhase || idx !== sectionIndex)) {
      setOnScreeningPhase(false);
      setOnDocumentsPhase(false);
      setSectionIndex(idx);
    }

    // Always schedule scroll — React may skip re-render when already on the target section.
    window.setTimeout(() => {
      document.querySelector(`[data-item-code="${first.code}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      pendingScrollCode.current = null;
    }, alreadyThere ? 60 : 120);
  };

  const goSection = async (nextIndex: number) => {
    if (!onScreeningPhase && !onDocumentsPhase && nextIndex === sectionIndex) return;
    await flushDraft();
    setInvalidCodes([]);
    setOnScreeningPhase(false);
    setOnDocumentsPhase(false);
    setSectionIndex(nextIndex);
  };

  const goScreeningPhase = async () => {
    if (!screeningSection || (onScreeningPhase && !onDocumentsPhase)) return;
    await flushDraft();
    setInvalidCodes([]);
    setOnDocumentsPhase(false);
    setOnScreeningPhase(true);
  };

  const goDocumentsPhase = async () => {
    if (onDocumentsPhase) return;
    await flushDraft();
    setInvalidCodes([]);
    setOnScreeningPhase(false);
    setOnDocumentsPhase(true);
  };

  const goPrev = async () => {
    if (onDocumentsPhase) {
      await flushDraft();
      setInvalidCodes([]);
      setOnDocumentsPhase(false);
      if (screeningSection) {
        setOnScreeningPhase(true);
      } else {
        setOnScreeningPhase(false);
        setSectionIndex(Math.max(0, sections.length - 1));
      }
      return;
    }
    if (onScreeningPhase) {
      await flushDraft();
      setInvalidCodes([]);
      setOnScreeningPhase(false);
      setSectionIndex(Math.max(0, sections.length - 1));
      return;
    }
    if (sectionIndex <= 0) return;
    await goSection(sectionIndex - 1);
  };

  const goNext = async () => {
    if (onDocumentsPhase || !form) return;
    if (onScreeningPhase) {
      if (screeningSection) {
        const items = itemsOfSection(form, screeningSection.id).filter(
          (i) => isItemVisible(i, ctx) && !i.code.includes("_SIG_")
        );
        const missing = missingCodesForItems(items);
        if (missing.length) {
          setError(`${toFaDigits(missing.length)} مورد اجباری در پرونده غربالگری تکمیل نشده است.`);
          focusMissingCodes(missing);
          return;
        }
      }
      await goDocumentsPhase();
      return;
    }
    if (currentSection) {
      const items = itemsOfSection(form, currentSection.id).filter(
        (i) => isItemVisible(i, ctx) && !i.code.includes("_SIG_")
      );
      const missing = missingCodesForItems(items);
      if (missing.length) {
        setError(`${toFaDigits(missing.length)} مورد اجباری در این بخش تکمیل نشده است.`);
        focusMissingCodes(missing);
        return;
      }
    }
    if (sectionIndex < sections.length - 1) {
      await goSection(sectionIndex + 1);
      return;
    }
    if (screeningSection) {
      await goScreeningPhase();
      return;
    }
    await goDocumentsPhase();
  };

  const addIntakeDocumentGroup = async (payload: {
    documentType: IntakeDocumentType;
    documentDate: string | null;
    note: string | null;
    files: Array<{ fileName: string; mimeType: string; dataUrl: string }>;
  }) => {
    await onAction({
      action: "ADD_INTAKE_DOCUMENT_GROUP",
      patientId: patient.id,
      ...payload,
      silent: true,
    });
  };

  const addIntakeDocumentFiles = async (
    groupId: string,
    files: Array<{ fileName: string; mimeType: string; dataUrl: string; documentDate?: string | null }>,
    documentDate?: string | null
  ) => {
    await onAction({
      action: "ADD_INTAKE_DOCUMENT_FILES",
      patientId: patient.id,
      groupId,
      files,
      documentDate: documentDate ?? null,
      silent: true,
    });
  };

  const removeIntakeDocumentGroup = async (groupId: string) => {
    await onAction({
      action: "REMOVE_INTAKE_DOCUMENT_GROUP",
      patientId: patient.id,
      groupId,
      silent: true,
    });
  };

  const removeIntakeDocumentFile = async (groupId: string, fileId: string) => {
    await onAction({
      action: "REMOVE_INTAKE_DOCUMENT_FILE",
      patientId: patient.id,
      groupId,
      fileId,
      silent: true,
    });
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
        focusMissingCodes(validation.missingCodes);
        return;
      }
      setInvalidCodes([]);
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

  const fraudWatch = useMemo(
    () => ({
      patientId: patient.id,
      userId,
      intervalSeconds: fraudIntervalSeconds,
      onStartSession: async (patientId: number) => {
        const res = (await onAction({
          action: "START_FRAUD_CAMERA_SESSION",
          patientId,
          userId,
          silent: true,
        })) as { sessionId?: string } | null;
        return res?.sessionId ?? null;
      },
      onAutoFrame: async ({
        sessionId,
        photoDataUrl,
        lat,
        lon,
        accuracy,
      }: {
        sessionId: string;
        photoDataUrl: string;
        lat?: number;
        lon?: number;
        accuracy?: number;
      }) => {
        await onAction({
          action: "CAPTURE_FRAUD_FRAME",
          patientId: patient.id,
          userId,
          sessionId,
          kind: "fraud_auto",
          photoDataUrl,
          lat,
          lon,
          accuracy,
          silent: true,
        });
      },
      onEndSession: async (sessionId: string) => {
        await onAction({ action: "END_FRAUD_CAMERA_SESSION", sessionId, silent: true });
      },
    }),
    [patient.id, userId, fraudIntervalSeconds, onAction]
  );

  if (!patient.gender || (patient.gender !== "مرد" && patient.gender !== "زن")) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        جنسیت سلامتجو در پرونده مشخص نیست. پیش از شروع پرسشنامه، پذیرش باید جنسیت را ثبت کند.
      </div>
    );
  }

  if (!form) {
    const blockedByAge = forms
      .filter(
        (f) =>
          f.status === "published" &&
          (f.targetAudience.gender === patient.gender || f.targetAudience.gender === "همه") &&
          typeof patient.age === "number" &&
          f.targetAudience.ageMin != null &&
          patient.age < f.targetAudience.ageMin
      )
      .sort((a, b) => (a.targetAudience.ageMin ?? 0) - (b.targetAudience.ageMin ?? 0))[0];
    const minAge = blockedByAge?.targetAudience.ageMin;
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        {minAge != null
          ? `پرسشنامه پیش‌پذیرش سرطان برای افراد ${toFaDigits(minAge)} سال به بالا است.`
          : `فرم منتشرشده‌ای برای جامعه هدف «${patient.gender}» یافت نشد. از پنل ادمین یک فرم با این مخاطب منتشر کنید.`}
      </div>
    );
  }

  const resolvedPhoto = localPhotoUrl || patient.photoDataUrl || null;
  const needsPhotoGate = !readOnly && !submitted && !resolvedPhoto && Boolean(patient.journeyIntroSeen);

  if (needsPhotoGate) {
    return (
      <PatientPhotoCapture
        patientName={patient.fullName}
        busy={busy}
        fraudWatch={fraudWatch}
        onConfirm={async (photoDataUrl, meta) => {
          await onAction({
            action: "UPDATE_PATIENT_PHOTO",
            patientId: patient.id,
            photoDataUrl,
            fraudSessionId: meta?.fraudSessionId,
            lat: meta?.lat,
            lon: meta?.lon,
            accuracy: meta?.accuracy,
            silent: true,
          });
          setLocalPhotoUrl(photoDataUrl);
        }}
      />
    );
  }

  const sectionItems = currentSection
    ? itemsOfSection(form, currentSection.id).filter((i) => isItemVisible(i, ctx) && !i.code.includes("_SIG_"))
    : [];
  const secProg = currentSection ? sectionProgress(form, currentSection.id, answers, ctx) : { total: 0, done: 0 };
  const screeningItems = screeningSection
    ? itemsOfSection(form, screeningSection.id).filter((i) => isItemVisible(i, ctx) && !i.code.includes("_SIG_"))
    : [];
  const activeSection = onScreeningPhase ? screeningSection : currentSection;
  const activeSectionItems = onScreeningPhase ? screeningItems : sectionItems;
  const activeSecProg = onScreeningPhase ? screeningProg : secProg;
  const atLastMain = !onScreeningPhase && !onDocumentsPhase && sectionIndex >= sections.length - 1;
  const canGoNext = !onDocumentsPhase;
  const canGoPrev = onDocumentsPhase || onScreeningPhase || sectionIndex > 0;
  const canFinalSubmit = validateForm(form, answers, ctx).ok;
  const formTitle = displayFormTitle(form);
  const nextButtonLabel = onScreeningPhase
    ? "سایر مدارک"
    : atLastMain && screeningSection
      ? "پرونده غربالگری"
      : atLastMain
        ? "سایر مدارک"
        : "بخش بعد";

  return (
    <div ref={formTopRef} className="space-y-3 scroll-mt-3">
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{formTitle}</h2>
            <p className="text-[10px] text-slate-500">
              نسخه {toFaDigits(form.version)} · {form.targetAudience.gender} ·{" "}
              {toFaDigits(progress.done)}/{toFaDigits(progress.total)} ({toFaDigits(progress.pct)}٪)
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                submitted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
              }`}
            >
              {submitted ? "ثبت‌شده" : "در انتظار تکمیل"}
            </span>
            {!submitted && saveHint && (
              <span className="text-[10px] text-slate-400">{saving ? "در حال ذخیره…" : saveHint}</span>
            )}
          </div>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress.pct}%` }} />
        </div>

        <details className="mt-2 group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10px] text-amber-800/90 marker:content-none [&::-webkit-details-marker]:hidden">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span className="font-medium">نکته ایمنی — برای پزشک جایگزین نیست</span>
            <span className="text-slate-400 group-open:hidden">· بیشتر</span>
          </summary>
          <p className="mt-1.5 text-[10px] leading-5 text-amber-950/90">{form.warningText}</p>
        </details>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((sec, idx) => {
          const p = sectionProgress(form, sec.id, answers, ctx);
          const active = !onScreeningPhase && !onDocumentsPhase && idx === sectionIndex;
          const done = p.total > 0 && p.done === p.total;
          const focusIdx = onDocumentsPhase || onScreeningPhase ? sections.length - 1 : sectionIndex;
          const showLabel = Math.abs(idx - focusIdx) <= 1;
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
        {screeningSection && (
          <button
            type="button"
            title="پرونده غربالگری"
            aria-label="پرونده غربالگری و واکسیناسیون"
            aria-current={onScreeningPhase && !onDocumentsPhase ? "step" : undefined}
            onClick={() => void goScreeningPhase()}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border py-1.5 px-3 text-[10px] ${
              onScreeningPhase && !onDocumentsPhase
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : screeningDone
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            <Shield className="h-3 w-3" aria-hidden />
            پرونده
          </button>
        )}
        <button
          type="button"
          title="سایر مدارک درمانی"
          aria-label="سایر مدارک درمانی که در غربالگری نبود"
          aria-current={onDocumentsPhase ? "step" : undefined}
          onClick={() => void goDocumentsPhase()}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border py-1.5 px-3 text-[10px] ${
            onDocumentsPhase
              ? "border-teal-700 bg-teal-700 text-white"
              : documentsDone
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-teal-200 bg-teal-50 text-teal-800"
          }`}
        >
          <FileUp className="h-3 w-3" aria-hidden />
          مدارک
        </button>
      </div>

      {onDocumentsPhase ? (
        <PreAdmitDocumentsPanel
          gender={patient.gender}
          documents={intakeDocuments}
          finalPhaseOnly
          disabled={readOnly || submitted}
          busy={busy || saving}
          onAddGroup={addIntakeDocumentGroup}
          onAddFiles={addIntakeDocumentFiles}
          onRemoveGroup={removeIntakeDocumentGroup}
          onRemoveFile={removeIntakeDocumentFile}
        />
      ) : activeSection && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
            {(() => {
              const isBaseSection = isBaseInfoSection(activeSection.code);
              const showHeaderPhoto = Boolean(isBaseSection && resolvedPhoto);
              return (
                <div className={`mb-2.5 ${showHeaderPhoto ? "flex items-start gap-2.5" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">{activeSection.title}</h3>
                    {activeSection.guideText && (
                      <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{activeSection.guideText}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      تکمیل این بخش: {toFaDigits(activeSecProg.done)}/{toFaDigits(activeSecProg.total)}
                    </p>
                  </div>
                  {showHeaderPhoto && (
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
                      <img
                        src={resolvedPhoto!}
                        alt="عکس پرونده سلامت الکترونیک"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-1.5">
              {(() => {
                const isBaseSection = isBaseInfoSection(activeSection.code);
                const renderItem = (item: FormItemDefinition, opts?: { tight?: boolean }) => {
                  const answer = getAnswer(answers, item.code);
                  const locked = Boolean(item.readOnlyIfPrefill && prefillValue(item, patient));
                  const complete = isItemComplete(item, answer, true);
                  const requiredEmpty = Boolean(item.required && !complete);
                  const invalid = invalidSet.has(item.code);
                  const docPrompts =
                    onScreeningPhase && answer.valueCode === "yes"
                      ? screeningDocumentPromptsForItem(item.code)
                      : [];
                  return (
                    <div
                      key={item.id}
                      data-item-code={item.code}
                      className={`${itemRowClass({ requiredEmpty, invalid })} ${
                        opts?.tight ? "" : "border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                      }`}
                    >
                      <p className="text-[11px] font-medium leading-4 text-slate-800">
                        {item.labelFa}
                        {item.required && <span className="mr-1 text-rose-400">*</span>}
                      </p>
                      <ItemField
                        item={item}
                        answer={answer}
                        disabled={readOnly || submitted || busy}
                        readOnlyPrefill={locked}
                        onChange={(next) => updateItem(item, next)}
                      />
                      {docPrompts.map((prompt) => (
                        <ContextualIntakeUpload
                          key={`${item.code}-${prompt.documentType}`}
                          prompt={prompt}
                          documents={intakeDocuments}
                          disabled={readOnly || submitted}
                          busy={busy || saving}
                          onAddGroup={addIntakeDocumentGroup}
                          onAddFiles={addIntakeDocumentFiles}
                          onRemoveFile={removeIntakeDocumentFile}
                        />
                      ))}
                    </div>
                  );
                };

                if (!isBaseSection) {
                  return activeSectionItems.length
                    ? activeSectionItems.map((item) => renderItem(item))
                    : (
                        <p className="text-xs text-slate-500">
                          با توجه به وضعیت تاهل/سن، آیتمی در این بخش نمایش داده نمی‌شود.
                        </p>
                      );
                }

                const rows = layoutBaseItems(activeSectionItems);
                if (!rows.length) {
                  return (
                    <p className="text-xs text-slate-500">
                      با توجه به وضعیت تاهل/سن، آیتمی در این بخش نمایش داده نمی‌شود.
                    </p>
                  );
                }
                return rows.map((row, idx) => {
                  if (row.kind === "full") {
                    return (
                      <div key={row.item.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                        {renderItem(row.item, { tight: true })}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`pair-${row.items[0].id}-${row.items[1].id}-${idx}`}
                      className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                    >
                      {row.items.map((item) => renderItem(item, { tight: true }))}
                    </div>
                  );
                });
              })()}
            </div>
            {onScreeningPhase && (
              <p className="mt-3 rounded-xl border border-teal-100 bg-teal-50/80 px-3 py-2 text-[11px] leading-5 text-teal-900">
                اگر برای سوالی «بله» زدید، همان‌جا می‌توانید عکس یا PDF مرتبط را بفرستید. بقیهٔ مدارک در مرحلهٔ بعد است.
              </p>
            )}
            {atLastMain && (
              <p className="mt-3 rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2 text-[11px] leading-5 text-teal-900">
                {screeningSection
                  ? "بعد از این بخش، در پرونده غربالگری مدارک مرتبط با هر سوال را همان‌جا می‌فرستید؛ سپس سایر مدارک."
                  : "بعد از این بخش می‌توانید مدارک مرتبط (آزمایش، نوار قلب، سونو و…) را ارسال کنید."}
              </p>
            )}
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
              disabled={!canGoPrev || saving}
              onClick={() => void goPrev()}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              بخش قبل
            </button>
            <button
              type="button"
              disabled={!canGoNext || saving}
              onClick={() => void goNext()}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              {nextButtonLabel}
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
          {canFinalSubmit ? (
            <button
              type="button"
              disabled={busy || saving}
              onClick={() => void persistSubmit()}
              className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              ثبت نهایی پرسشنامه
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || saving}
              onClick={() => void persistDraft(answers, false)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              ذخیره موقت
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function formsFromSnapshot(snapshot: ClinicSnapshot): FormDefinition[] {
  return snapshot.forms ?? [];
}
