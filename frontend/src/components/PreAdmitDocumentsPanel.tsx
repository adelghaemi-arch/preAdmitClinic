import React, { useRef, useState } from "react";
import { FileUp, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import type { IntakeDocumentType, PatientIntakeDocumentGroup } from "@/types/clinic";
import {
  INTAKE_DOCUMENT_MAX_BYTES,
  INTAKE_DOCUMENT_MAX_FILES_PER_GROUP,
  INTAKE_DOCUMENT_MAX_GROUPS,
  intakeDocumentTypesForGender,
} from "@/lib/intake-documents";
import { toFaDigits } from "@/lib/persian";
import { IntakeFileThumbGrid } from "./IntakeFileThumbGrid";

type FilePayload = { fileName: string; mimeType: string; dataUrl: string };

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
  onAddFiles: (groupId: string, files: FilePayload[]) => Promise<void>;
  onRemoveGroup: (groupId: string) => Promise<void>;
  onRemoveFile: (groupId: string, fileId: string) => Promise<void>;
}

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
  const types = intakeDocumentTypesForGender(gender);
  const [documentType, setDocumentType] = useState<IntakeDocumentType>(types[0]?.code ?? "other");
  const [documentDate, setDocumentDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [appendGroupId, setAppendGroupId] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const groupsLeft = Math.max(0, INTAKE_DOCUMENT_MAX_GROUPS - documents.length);
  const locked = Boolean(disabled || busy || uploading);

  const handleNewGroupFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || locked) return;
    if (!documentType) {
      setError("ابتدا نوع مدرک را انتخاب کنید.");
      return;
    }
    if (groupsLeft <= 0) {
      setError(`حداکثر ${toFaDigits(INTAKE_DOCUMENT_MAX_GROUPS)} تیپ مدرک می‌توانید اضافه کنید.`);
      return;
    }
    setError("");
    setUploading(true);
    try {
      const files = await filesToPayloads(fileList, INTAKE_DOCUMENT_MAX_FILES_PER_GROUP, setError);
      if (!files.length) {
        setError("هیچ فایل معتبری انتخاب نشد.");
        return;
      }
      await onAddGroup({
        documentType,
        documentDate: documentDate.trim() || null,
        note: documentType === "other" ? note.trim() || null : null,
        files,
      });
      setDocumentDate("");
      if (documentType === "other") setNote("");
    } catch {
      setError("خواندن یا ذخیره فایل انجام نشد. دوباره تلاش کنید.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAppendFiles = async (groupId: string, fileList: FileList | null) => {
    if (!fileList?.length || locked) return;
    const group = documents.find((g) => g.id === groupId);
    if (!group) return;
    const room = INTAKE_DOCUMENT_MAX_FILES_PER_GROUP - group.files.length;
    if (room <= 0) {
      setError(`هر تیپ مدرک حداکثر ${toFaDigits(INTAKE_DOCUMENT_MAX_FILES_PER_GROUP)} فایل می‌پذیرد.`);
      return;
    }
    setError("");
    setUploading(true);
    setAppendGroupId(groupId);
    try {
      const files = await filesToPayloads(fileList, room, setError);
      if (!files.length) {
        setError("هیچ فایل معتبری انتخاب نشد.");
        return;
      }
      await onAddFiles(groupId, files);
    } catch {
      setError("افزودن فایل انجام نشد.");
    } finally {
      setUploading(false);
      setAppendGroupId(null);
      const input = document.getElementById(`append-files-${groupId}`) as HTMLInputElement | null;
      if (input) input.value = "";
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    if (locked) return;
    setRemovingKey(`g:${groupId}`);
    setError("");
    try {
      await onRemoveGroup(groupId);
    } catch {
      setError("حذف تیپ مدرک انجام نشد.");
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
              <h3 className="text-sm font-semibold text-slate-900">مدارک همراه</h3>
              <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] text-teal-800">اختیاری</span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              عکس یا PDF آزمایش، نوار قلب، سونو و… را اضافه کنید و همان‌جا چک کنید.
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              تیپ: {toFaDigits(documents.length)}/{toFaDigits(INTAKE_DOCUMENT_MAX_GROUPS)} · هر تیپ تا{" "}
              {toFaDigits(INTAKE_DOCUMENT_MAX_FILES_PER_GROUP)} فایل
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {!disabled && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div>
              <p className="mb-2 text-[11px] font-medium text-slate-700">نوع مدرک</p>
              <div className="-mx-0.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {types.map((t) => {
                  const active = documentType === t.code;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      disabled={locked || groupsLeft <= 0}
                      onClick={() => setDocumentType(t.code)}
                      className={`shrink-0 rounded-full border px-3.5 py-2.5 text-[11px] font-medium transition disabled:opacity-40 ${
                        active
                          ? "border-teal-700 bg-teal-700 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {t.labelFa}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block text-[11px] font-medium text-slate-700">
              تاریخ انجام (اختیاری)
              <input
                type="text"
                value={documentDate}
                disabled={locked || groupsLeft <= 0}
                maxLength={80}
                onChange={(e) => setDocumentDate(e.target.value)}
                placeholder="۱۴۰۳/۰۲/۱۵ یا حدوداً پارسال"
                className="app-input mt-1.5 w-full text-base"
                style={{ fontSize: "16px" }}
              />
            </label>

            {documentType === "other" && (
              <label className="block text-[11px] font-medium text-slate-700">
                توضیح کوتاه (اختیاری)
                <input
                  type="text"
                  value={note}
                  disabled={locked || groupsLeft <= 0}
                  maxLength={120}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثلاً گزارش اسپیرومتری"
                  className="app-input mt-1.5 w-full text-base"
                  style={{ fontSize: "16px" }}
                />
              </label>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              disabled={locked || groupsLeft <= 0}
              onChange={(e) => void handleNewGroupFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={locked || groupsLeft <= 0}
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 text-sm font-semibold text-white disabled:opacity-40"
            >
              {uploading && !appendGroupId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              انتخاب عکس یا PDF
            </button>
            <p className="text-center text-[10px] text-slate-400">
              تا {toFaDigits(INTAKE_DOCUMENT_MAX_FILES_PER_GROUP)} فایل · حداکثر ۵ مگابایت
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] leading-5 text-rose-800">
            {error}
          </p>
        )}

        {documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-5 text-center text-[11px] leading-6 text-slate-500">
            هنوز مدرکی نیست. اگر ندارید، ثبت نهایی را بزنید.
          </p>
        ) : (
          <ul className="space-y-3">
            {documents.map((group) => {
              const fileRoom = INTAKE_DOCUMENT_MAX_FILES_PER_GROUP - group.files.length;
              return (
                <li key={group.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="mb-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-teal-900">{group.typeLabelFa}</p>
                      {group.documentDate && (
                        <p className="mt-0.5 text-[11px] text-slate-600">تاریخ: {group.documentDate}</p>
                      )}
                      {group.note && <p className="mt-0.5 text-[11px] text-slate-500">{group.note}</p>}
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        فایل: {toFaDigits(group.files.length)}/{toFaDigits(INTAKE_DOCUMENT_MAX_FILES_PER_GROUP)}
                      </p>
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
                    <div className="mt-2.5">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        className="hidden"
                        id={`append-files-${group.id}`}
                        disabled={locked}
                        onChange={(e) => void handleAppendFiles(group.id, e.target.files)}
                      />
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => document.getElementById(`append-files-${group.id}`)?.click()}
                        className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 text-[12px] font-medium text-teal-800 disabled:opacity-40"
                      >
                        {uploading && appendGroupId === group.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        افزودن فایل بیشتر ({toFaDigits(fileRoom)} باقی)
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
