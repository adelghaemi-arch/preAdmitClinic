import React, { useEffect, useState } from "react";
import { Download, FileText, Trash2, X } from "lucide-react";
import type { PatientIntakeDocumentFile } from "@/types/clinic";

function isPdf(file: PatientIntakeDocumentFile): boolean {
  return (
    file.mimeType === "application/pdf" ||
    file.dataUrl.startsWith("data:application/pdf") ||
    /\.pdf$/i.test(file.fileName)
  );
}

interface IntakeFileThumbGridProps {
  files: PatientIntakeDocumentFile[];
  title: string;
  disabled?: boolean;
  busy?: boolean;
  onRemoveFile?: (fileId: string) => void;
  removingFileId?: string | null;
}

export function IntakeFileThumbGrid({
  files,
  title,
  disabled,
  busy,
  onRemoveFile,
  removingFileId,
}: IntakeFileThumbGridProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = files.find((f) => f.id === previewId) ?? null;

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewId(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [preview]);

  if (!files.length) return null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {files.map((file) => {
          const pdf = isPdf(file);
          return (
            <li key={file.id} className="relative">
              <button
                type="button"
                onClick={() => setPreviewId(file.id)}
                className="group block w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-right shadow-sm active:scale-[0.98]"
                aria-label={`پیش‌نمایش ${file.fileName}`}
              >
                {pdf ? (
                  <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-slate-50 px-2">
                    <FileText className="h-8 w-8 text-teal-600" aria-hidden />
                    <span className="line-clamp-2 w-full text-center text-[10px] leading-4 text-slate-600">
                      {file.fileName}
                    </span>
                  </div>
                ) : (
                  <div className="aspect-square bg-slate-100">
                    <img
                      src={file.dataUrl}
                      alt={file.fileName || title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </button>
              {onRemoveFile && !disabled && (
                <button
                  type="button"
                  disabled={busy || removingFileId === file.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  className="absolute left-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-white/95 text-rose-700 shadow-sm disabled:opacity-40"
                  aria-label={`حذف ${file.fileName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {preview && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-slate-950/90 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="پیش‌نمایش مدرک"
          onClick={() => setPreviewId(null)}
        >
          <div className="flex items-center justify-between gap-2 pb-3" onClick={(e) => e.stopPropagation()}>
            <p className="min-w-0 truncate text-xs text-white/90">{preview.fileName || title}</p>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={preview.dataUrl}
                download={preview.fileName || "document"}
                className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-4 w-4" />
                دریافت
              </a>
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white"
                aria-label="بستن پیش‌نمایش"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div
            className="flex min-h-0 flex-1 items-center justify-center overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {isPdf(preview) ? (
              <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white p-5 text-center">
                <FileText className="mx-auto h-12 w-12 text-teal-600" />
                <p className="mt-3 text-sm font-medium text-slate-800">{preview.fileName}</p>
                <p className="mt-1 text-[11px] text-slate-500">برای مشاهده کامل، فایل را دریافت کنید.</p>
                <a
                  href={preview.dataUrl}
                  download={preview.fileName || "report.pdf"}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 text-sm font-medium text-white"
                >
                  <Download className="h-4 w-4" />
                  دریافت PDF
                </a>
              </div>
            ) : (
              <img
                src={preview.dataUrl}
                alt={preview.fileName || title}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
