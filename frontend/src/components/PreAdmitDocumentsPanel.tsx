import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "@jalali-js/react";
import { CalendarDays, FileUp, Loader2, Plus, Trash2, UploadCloud, X } from "lucide-react";
import type { IntakeDocumentType, PatientIntakeDocumentGroup } from "@/types/clinic";
import {
  INTAKE_DOCUMENT_MAX_BYTES,
  INTAKE_DOCUMENT_MAX_FILES_PER_GROUP,
  INTAKE_DOCUMENT_MAX_GROUPS,
  intakeDocumentTypesForGender,
} from "@/lib/intake-documents";
import {
  gregorianIsoToJalaliDate,
  iranLocalDayOffset,
  jalaliFieldsToGregorianIso,
} from "@/lib/date-iso";
import { toFaDigits } from "@/lib/persian";
import { IntakeFileThumbGrid } from "./IntakeFileThumbGrid";

function jalaliShortFromIso(iso: string): string {
  const j = gregorianIsoToJalaliDate(iso);
  if (!j) return iso;
  return toFaDigits(
    `${j.year}/${String(j.month).padStart(2, "0")}/${String(j.day).padStart(2, "0")}`
  );
}

type FilePayload = {
  fileName: string;
  mimeType: string;
  dataUrl: string;
  documentDate?: string | null;
};

interface PreAdmitDocumentsPanelProps {
  gender: string;
  documents: PatientIntakeDocumentGroup[];
  disabled?: boolean;
  busy?: boolean;
  onAddGroup: (payload: {
    documentType: IntakeDocumentType;
    documentDate: string | null;
    note: string | null;
    files: FilePayload[];
  }) => Promise<void>;
  onAddFiles: (
    groupId: string,
    files: FilePayload[],
    documentDate?: string | null
  ) => Promise<void>;
  onRemoveGroup: (groupId: string) => Promise<void>;
  onRemoveFile: (groupId: string, fileId: string) => Promise<void>;
}

type ModalMode =
  | { open: false }
  | { open: true; lockedType: IntakeDocumentType | null };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("empty"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

async function filesToPayloads(
  fileList: FileList | File[],
  maxCount: number,
  onSkip: (msg: string) => void
): Promise<FilePayload[]> {
  const picked = Array.from(fileList).slice(0, maxCount);
  const out: FilePayload[] = [];
  for (const file of picked) {
    if (file.size > INTAKE_DOCUMENT_MAX_BYTES) {
      onSkip(`«${file.name}» بیش از ۵ مگابایت است.`);
      continue;
    }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      onSkip(`«${file.name}» فقط به‌صورت PDF یا تصویر قابل بارگذاری است.`);
      continue;
    }
    const dataUrl = await readFileAsDataUrl(file);
    out.push({
      fileName: file.name,
      mimeType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
      dataUrl,
    });
  }
  return out;
}

export function PreAdmitDocumentsPanel({
  gender,
  documents,
  disabled,
  busy,
  onAddGroup,
  onAddFiles,
  onRemoveGroup,
  onRemoveFile,
}: PreAdmitDocumentsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const datePickerWrapRef = useRef<HTMLDivElement>(null);
  const types = intakeDocumentTypesForGender(gender);
  const [modal, setModal] = useState<ModalMode>({ open: false });
  const [documentType, setDocumentType] = useState<IntakeDocumentType>(types[0]?.code ?? "other");
  const [documentDate, setDocumentDate] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pendingFiles, setPendingFiles] = useState<FilePayload[]>([]);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [highlightGroupId, setHighlightGroupId] = useState<string | null>(null);

  const groupsLeft = Math.max(0, INTAKE_DOCUMENT_MAX_GROUPS - documents.length);
  const totalFiles = documents.reduce((sum, g) => sum + g.files.length, 0);
  const locked = Boolean(disabled || busy || uploading);
  const typeLocked = Boolean(modal.open && modal.lockedType);
  const existingOfSelectedType = documents.find((g) => g.documentType === documentType) ?? null;
  const calendarMaxRules = useMemo(() => {
    const today = gregorianIsoToJalaliDate(iranLocalDayOffset(0));
    if (!today) return undefined;
    return { maxDate: { year: today.year, month: today.month, day: today.day } };
  }, []);

  const resetModalForm = (nextType?: IntakeDocumentType) => {
    setDocumentType(nextType ?? types[0]?.code ?? "other");
    setDocumentDate("");
    setDatePickerOpen(false);
    setNote("");
    setPendingFiles([]);
    setModalError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const openAddModal = (lockedType: IntakeDocumentType | null = null) => {
    resetModalForm(lockedType ?? types[0]?.code ?? "other");
    setModal({ open: true, lockedType });
  };

  const closeModal = () => {
    if (uploading) return;
    setModal({ open: false });
    setDatePickerOpen(false);
    setModalError("");
  };

  useEffect(() => {
    if (!types.some((t) => t.code === documentType)) {
      setDocumentType(types[0]?.code ?? "other");
    }
  }, [types, documentType]);

  useEffect(() => {
    if (!modal.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close only while modal open
  }, [modal.open, uploading]);

  useEffect(() => {
    if (!datePickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (datePickerWrapRef.current && !datePickerWrapRef.current.contains(event.target as Node)) {
        setDatePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [datePickerOpen]);

  useEffect(() => {
    if (!highlightGroupId) return;
    const timer = window.setTimeout(() => setHighlightGroupId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [highlightGroupId]);

  const scrollToGroup = (groupId: string) => {
    const el = document.getElementById(`intake-doc-card-${groupId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setHighlightGroupId(groupId);
  };

  const handlePickFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || locked) return;
    const existing = documents.find((g) => g.documentType === documentType);
    const room = existing
      ? INTAKE_DOCUMENT_MAX_FILES_PER_GROUP - existing.files.length
      : INTAKE_DOCUMENT_MAX_FILES_PER_GROUP;
    if (room <= 0) {
      setModalError(`هر نوع مدرک حداکثر ${toFaDigits(INTAKE_DOCUMENT_MAX_FILES_PER_GROUP)} فایل می‌پذیرد.`);
      return;
    }
    setModalError("");
    try {
      const files = await filesToPayloads(fileList, room, setModalError);
      if (!files.length) {
        setModalError("هیچ فایل معتبری انتخاب نشد.");
        return;
      }
      setPendingFiles(files);
    } catch {
      setModalError("خواندن فایل انجام نشد.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmitModal = async () => {
    if (locked || !modal.open) return;
    if (!documentType) {
      setModalError("نوع مدرک را انتخاب کنید.");
      return;
    }
    if (!pendingFiles.length) {
      setModalError("حداقل یک عکس یا PDF انتخاب کنید.");
      return;
    }
    const existing = documents.find((g) => g.documentType === documentType) ?? null;
    if (!existing && groupsLeft <= 0) {
      setModalError(`حداکثر ${toFaDigits(INTAKE_DOCUMENT_MAX_GROUPS)} نوع مدرک می‌توانید اضافه کنید.`);
      return;
    }
    if (existing) {
      const room = INTAKE_DOCUMENT_MAX_FILES_PER_GROUP - existing.files.length;
      if (pendingFiles.length > room) {
        setModalError(`برای این نوع فقط ${toFaDigits(room)} فایل دیگر می‌توانید اضافه کنید.`);
        return;
      }
    }

    const dateValue = documentDate.trim() || null;
    setUploading(true);
    setModalError("");
    setError("");
    try {
      if (existing) {
        await onAddFiles(existing.id, pendingFiles, dateValue);
        scrollToGroup(existing.id);
      } else {
        await onAddGroup({
          documentType,
          documentDate: dateValue,
          note: documentType === "other" ? note.trim() || null : null,
          files: pendingFiles,
        });
      }
      setModal({ open: false });
      resetModalForm();
    } catch {
      setModalError("ذخیره مدرک انجام نشد. دوباره تلاش کنید.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    if (locked) return;
    setRemovingKey(`g:${groupId}`);
    setError("");
    try {
      await onRemoveGroup(groupId);
    } catch {
      setError("حذف مدرک انجام نشد.");
    } finally {
      setRemovingKey(null);
    }
  };

  const handleRemoveFile = async (groupId: string, fileId: string) => {
    if (locked) return;
    setRemovingKey(`f:${fileId}`);
    setError("");
    try {
      await onRemoveFile(groupId, fileId);
    } catch {
      setError("حذف فایل انجام نشد.");
    } finally {
      setRemovingKey(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50/80 to-white">
      <div className="border-b border-teal-100 bg-teal-100/30 px-3 py-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
            <FileUp className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold leading-6 text-slate-900">
                هر تعداد آزمایش و مدارک درمانی مثل MRI و … دارید و فکر می‌کنید کمک‌کننده است اینجا ارسال کنید
              </h3>
              <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] text-teal-800">اختیاری</span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              هر نوع مدرک یک کارت است؛ داخل هر کارت چند عکس یا PDF بگذارید.
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              نوع مدرک: {toFaDigits(documents.length)}/{toFaDigits(INTAKE_DOCUMENT_MAX_GROUPS)} · فایل:{" "}
              {toFaDigits(totalFiles)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {documents.length > 1 && (
          <div className="-mx-0.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {documents.map((group) => (
              <button
                key={`chip-${group.id}`}
                type="button"
                onClick={() => scrollToGroup(group.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                  highlightGroupId === group.id
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {group.typeLabelFa}
                <span className="mr-1 opacity-70">({toFaDigits(group.files.length)})</span>
              </button>
            ))}
          </div>
        )}

        {documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-5 text-center text-[11px] leading-6 text-slate-500">
            هنوز چیزی نفرستاده‌اید. با دکمهٔ «افزودن مدرک» شروع کنید.
          </p>
        ) : (
          <section className="space-y-2">
            <h4 className="text-[11px] font-semibold text-slate-700">مدارک ثبت‌شده</h4>
            <ul className="space-y-3">
              {documents.map((group) => {
                const fileRoom = INTAKE_DOCUMENT_MAX_FILES_PER_GROUP - group.files.length;
                const highlighted = highlightGroupId === group.id;
                return (
                  <li
                    key={group.id}
                    id={`intake-doc-card-${group.id}`}
                    className={`scroll-mt-3 rounded-2xl border bg-white p-3 transition ${
                      highlighted ? "border-teal-500 shadow-md ring-2 ring-teal-100" : "border-slate-200"
                    }`}
                  >
                    <div className="mb-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-teal-900">{group.typeLabelFa}</p>
                          <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-800">
                            {toFaDigits(group.files.length)} فایل
                          </span>
                        </div>
                        {group.note && group.note !== group.typeLabelFa && (
                          <p className="mt-0.5 text-[11px] text-slate-500">{group.note}</p>
                        )}
                      </div>
                      {!disabled && (
                        <button
                          type="button"
                          disabled={locked || removingKey === `g:${group.id}`}
                          onClick={() => void handleRemoveGroup(group.id)}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 disabled:opacity-40"
                          aria-label={`حذف ${group.typeLabelFa}`}
                        >
                          {removingKey === `g:${group.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>

                    <IntakeFileThumbGrid
                      files={group.files}
                      title={group.typeLabelFa}
                      fallbackDocumentDate={group.documentDate}
                      disabled={disabled}
                      busy={locked}
                      removingFileId={removingKey?.startsWith("f:") ? removingKey.slice(2) : null}
                      onRemoveFile={
                        disabled
                          ? undefined
                          : (fileId) => {
                              void handleRemoveFile(group.id, fileId);
                            }
                      }
                    />

                    {!disabled && fileRoom > 0 && (
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => openAddModal(group.documentType)}
                        className="mt-2.5 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 text-[12px] font-medium text-teal-800 disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                        افزودن به این دسته ({toFaDigits(fileRoom)} باقی)
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] leading-5 text-rose-800">
            {error}
          </p>
        )}

        {!disabled && (
          <button
            type="button"
            disabled={locked}
            onClick={() => openAddModal(null)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            افزودن مدرک
          </button>
        )}
      </div>

      {modal.open && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-slate-950/50 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="افزودن مدرک"
          onClick={closeModal}
        >
          <div
            className="mt-auto flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:mx-auto sm:mt-auto sm:mb-0 sm:max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <h4 className="text-sm font-semibold text-slate-900">افزودن مدرک</h4>
              <button
                type="button"
                disabled={uploading}
                onClick={closeModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40"
                aria-label="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <label className="block text-[11px] font-medium text-slate-700">
                نوع مدرک
                <select
                  value={documentType}
                  disabled={locked || typeLocked}
                  onChange={(e) => {
                    setDocumentType(e.target.value as IntakeDocumentType);
                    setPendingFiles([]);
                  }}
                  className="app-input mt-1.5 w-full text-base disabled:bg-slate-50"
                  style={{ fontSize: "16px" }}
                >
                  {types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.labelFa}
                      {documents.some((g) => g.documentType === t.code) ? " (موجود)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              {existingOfSelectedType && (
                <p className="rounded-xl border border-teal-100 bg-teal-50/80 px-3 py-2 text-[11px] leading-5 text-teal-900">
                  فایل‌ها به کارت «{existingOfSelectedType.typeLabelFa}» اضافه می‌شوند.
                </p>
              )}

              {!existingOfSelectedType && groupsLeft <= 0 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">
                  سقف انواع مدرک پر است. یک نوع موجود را انتخاب کنید یا از داخل کارت اضافه کنید.
                </p>
              )}

              <div ref={datePickerWrapRef} className="relative">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-700">تاریخ انجام (اختیاری)</span>
                  <button
                    type="button"
                    disabled={locked}
                    aria-label="انتخاب تاریخ از تقویم"
                    aria-expanded={datePickerOpen}
                    onClick={() => setDatePickerOpen((open) => !open)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-teal-700 disabled:opacity-40"
                  >
                    <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
                {datePickerOpen && (
                  <div
                    className="persian-date-field absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                    role="dialog"
                    aria-label="تقویم تاریخ انجام"
                  >
                    <Calendar
                      system="jalali"
                      locale="fa"
                      quickNav
                      showHolidays
                      holidayRegion="IR"
                      rules={calendarMaxRules}
                      onSelect={(date) => {
                        if (locked) return;
                        const iso = jalaliFieldsToGregorianIso(date);
                        setDocumentDate(jalaliShortFromIso(iso));
                        setDatePickerOpen(false);
                      }}
                    />
                  </div>
                )}
                <input
                  type="text"
                  value={documentDate}
                  disabled={locked}
                  maxLength={80}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  placeholder="مثلاً حدوداً دو ماه پیش یا ۱۴۰۳/۰۲/۱۵"
                  className="app-input mt-1.5 w-full text-base"
                  style={{ fontSize: "16px" }}
                />
              </div>

              {documentType === "other" && !existingOfSelectedType && (
                <label className="block text-[11px] font-medium text-slate-700">
                  توضیح کوتاه (اختیاری)
                  <input
                    type="text"
                    value={note}
                    disabled={locked}
                    maxLength={120}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="مثلاً گزارش اسپیرومتری"
                    className="app-input mt-1.5 w-full text-base"
                    style={{ fontSize: "16px" }}
                  />
                </label>
              )}

              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  disabled={locked}
                  onChange={(e) => void handlePickFiles(e.target.files)}
                />
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50/60 text-[12px] font-medium text-teal-800 disabled:opacity-40"
                >
                  <UploadCloud className="h-4 w-4" />
                  {pendingFiles.length
                    ? `تغییر فایل‌ها (${toFaDigits(pendingFiles.length)} انتخاب‌شده)`
                    : "انتخاب عکس یا PDF"}
                </button>
                {pendingFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {pendingFiles.map((f, i) => (
                      <li
                        key={`${f.fileName}-${i}`}
                        className="truncate rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-600"
                      >
                        {f.fileName}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1.5 text-center text-[10px] text-slate-400">
                  تا {toFaDigits(INTAKE_DOCUMENT_MAX_FILES_PER_GROUP)} فایل · حداکثر ۵ مگابایت
                </p>
              </div>

              {modalError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] leading-5 text-rose-800">
                  {modalError}
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                disabled={
                  locked ||
                  !pendingFiles.length ||
                  (!existingOfSelectedType && groupsLeft <= 0)
                }
                onClick={() => void handleSubmitModal()}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 text-sm font-semibold text-white disabled:opacity-40"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                ثبت مدرک
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
