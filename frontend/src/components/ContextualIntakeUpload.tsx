import React, { useRef, useState } from "react";
import { Loader2, Plus, UploadCloud } from "lucide-react";
import type { IntakeDocumentType, PatientIntakeDocumentGroup } from "@/types/clinic";
import {
  INTAKE_DOCUMENT_MAX_BYTES,
  INTAKE_DOCUMENT_MAX_FILES_PER_GROUP,
  INTAKE_DOCUMENT_MAX_GROUPS,
  type ScreeningDocumentPrompt,
} from "@/lib/intake-documents";
import { toFaDigits } from "@/lib/persian";
import { IntakeFileThumbGrid } from "./IntakeFileThumbGrid";

type FilePayload = {
  fileName: string;
  mimeType: string;
  dataUrl: string;
  documentDate?: string | null;
};

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

export interface ContextualIntakeUploadProps {
  prompt: ScreeningDocumentPrompt;
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
  onRemoveFile: (groupId: string, fileId: string) => Promise<void>;
}

export function ContextualIntakeUpload({
  prompt,
  documents,
  disabled,
  busy,
  onAddGroup,
  onAddFiles,
  onRemoveFile,
}: ContextualIntakeUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingFileId, setRemovingFileId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const group = documents.find((g) => g.documentType === prompt.documentType) ?? null;
  const fileRoom = group
    ? INTAKE_DOCUMENT_MAX_FILES_PER_GROUP - group.files.length
    : INTAKE_DOCUMENT_MAX_FILES_PER_GROUP;
  const groupsLeft = Math.max(0, INTAKE_DOCUMENT_MAX_GROUPS - documents.length);
  const locked = Boolean(disabled || busy || uploading);
  const canAdd = !disabled && fileRoom > 0 && (group || groupsLeft > 0);

  const handlePick = async (fileList: FileList | null) => {
    if (!fileList?.length || locked || !canAdd) return;
    setError("");
    setUploading(true);
    try {
      const files = await filesToPayloads(fileList, fileRoom, setError);
      if (!files.length) {
        setError("هیچ فایل معتبری انتخاب نشد.");
        return;
      }
      if (group) {
        await onAddFiles(group.id, files, null);
      } else {
        await onAddGroup({
          documentType: prompt.documentType,
          documentDate: null,
          note: null,
          files,
        });
      }
    } catch {
      setError("ذخیره مدرک انجام نشد. دوباره تلاش کنید.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!group || locked) return;
    setRemovingFileId(fileId);
    setError("");
    try {
      await onRemoveFile(group.id, fileId);
    } catch {
      setError("حذف فایل انجام نشد.");
    } finally {
      setRemovingFileId(null);
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-teal-200 bg-teal-50/50 px-2.5 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-[11px] font-semibold text-teal-900">{prompt.titleFa}</p>
        <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] text-teal-800">اختیاری</span>
        {group && group.files.length > 0 && (
          <span className="rounded-md bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-800">
            {toFaDigits(group.files.length)} فایل
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] leading-5 text-teal-900/80">{prompt.hintFa}</p>

      {group && group.files.length > 0 && (
        <div className="mt-2">
          <IntakeFileThumbGrid
            files={group.files}
            title={prompt.titleFa}
            fallbackDocumentDate={group.documentDate}
            disabled={disabled}
            busy={locked}
            removingFileId={removingFileId}
            onRemoveFile={
              disabled
                ? undefined
                : (fileId) => {
                    void handleRemoveFile(fileId);
                  }
            }
          />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        disabled={!canAdd || locked}
        onChange={(e) => void handlePick(e.target.files)}
      />

      {canAdd && (
        <button
          type="button"
          disabled={locked}
          onClick={() => fileRef.current?.click()}
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-teal-300 bg-white text-[11px] font-medium text-teal-800 disabled:opacity-40"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : group ? (
            <Plus className="h-3.5 w-3.5" />
          ) : (
            <UploadCloud className="h-3.5 w-3.5" />
          )}
          {uploading
            ? "در حال ارسال…"
            : group
              ? `افزودن فایل دیگر (${toFaDigits(fileRoom)} باقی)`
              : "آپلود عکس یا PDF"}
        </button>
      )}

      {!group && !canAdd && !disabled && (
        <p className="mt-2 text-[10px] text-amber-800">سقف انواع مدرک پر است؛ از مرحله مدارک یک مورد را حذف کنید.</p>
      )}

      {error && (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] leading-5 text-rose-800">
          {error}
        </p>
      )}
    </div>
  );
}
