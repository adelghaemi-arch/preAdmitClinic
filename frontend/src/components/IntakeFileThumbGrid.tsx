import React, { useEffect, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { FileText, Trash2, X } from "lucide-react";
import type { PatientIntakeDocumentFile } from "@/types/clinic";
import { isIsoDay } from "@/lib/date-iso";
import { formatFaDate } from "@/lib/persian";

function formatFileDate(value: string): string {
  return isIsoDay(value) ? formatFaDate(value) : value;
}

GlobalWorkerOptions.workerSrc = pdfWorker;

function isPdf(file: PatientIntakeDocumentFile): boolean {
  return (
    file.mimeType === "application/pdf" ||
    file.dataUrl.startsWith("data:application/pdf") ||
    /\.pdf$/i.test(file.fileName)
  );
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function renderPdfFirstPageThumb(dataUrl: string, targetWidth = 120): Promise<string> {
  const data = dataUrlToUint8Array(dataUrl);
  const loadingTask = getDocument({ data });
  try {
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = targetWidth / Math.max(base.width, 1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    await pdf.cleanup();
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    await loadingTask.destroy();
  }
}

interface IntakeFileThumbGridProps {
  files: PatientIntakeDocumentFile[];
  title: string;
  /** Legacy group-level date used only when a file has no documentDate. */
  fallbackDocumentDate?: string | null;
  disabled?: boolean;
  busy?: boolean;
  onRemoveFile?: (fileId: string) => void;
  removingFileId?: string | null;
}

function PdfThumb({ file }: { file: PatientIntakeDocumentFile }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setThumbUrl(null);
    setFailed(false);
    void renderPdfFirstPageThumb(file.dataUrl)
      .then((url) => {
        if (!cancelled) setThumbUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [file.dataUrl, file.id]);

  if (failed) {
    return (
      <div className="flex aspect-square items-center justify-center bg-slate-50">
        <FileText className="h-5 w-5 text-teal-600" aria-hidden />
      </div>
    );
  }

  if (!thumbUrl) {
    return <div className="aspect-square animate-pulse bg-slate-100" aria-hidden />;
  }

  return (
    <div className="aspect-square overflow-hidden bg-slate-100">
      <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

export function IntakeFileThumbGrid({
  files,
  title,
  fallbackDocumentDate,
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
      <ul className="grid grid-cols-4 gap-1.5">
        {files.map((file) => {
          const pdf = isPdf(file);
          const dateLabel = (file.documentDate || fallbackDocumentDate || "").trim();
          return (
            <li key={file.id} className="relative">
              <button
                type="button"
                onClick={() => setPreviewId(file.id)}
                className="group block w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-right active:scale-[0.98]"
                aria-label={`پیش‌نمایش ${file.fileName}`}
              >
                {pdf ? (
                  <PdfThumb file={file} />
                ) : (
                  <div className="aspect-square bg-slate-100">
                    <img
                      src={file.dataUrl}
                      alt={file.fileName || title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                {dateLabel ? (
                  <p className="truncate px-0.5 py-0.5 text-center text-[9px] leading-3 text-slate-500">
                    {formatFileDate(dateLabel)}
                  </p>
                ) : null}
              </button>
              {onRemoveFile && !disabled && (
                <button
                  type="button"
                  disabled={busy || removingFileId === file.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  className="absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-white/95 text-rose-700 disabled:opacity-40"
                  aria-label={`حذف ${file.fileName}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {preview && (
        <div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-slate-950/90 p-2 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="پیش‌نمایش مدرک"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-slate-900/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-2.5 py-2">
              <p className="min-w-0 truncate text-[11px] text-white/90">{preview.fileName || title}</p>
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white"
                aria-label="بستن پیش‌نمایش"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-[70vh] items-center justify-center overflow-auto px-2 pb-2">
              {isPdf(preview) ? (
                <iframe
                  src={preview.dataUrl}
                  title={preview.fileName || title}
                  className="h-[70vh] w-full max-w-lg rounded-lg bg-white"
                />
              ) : (
                <img
                  src={preview.dataUrl}
                  alt={preview.fileName || title}
                  className="max-h-[70vh] max-w-full rounded-lg object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
