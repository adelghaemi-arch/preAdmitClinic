/*
 File: frontend/src/components/IntakeFileThumbGrid.tsx
 Description: تامنیل مدارک پیش‌پذیرش — PDF/تصویر؛ لود از dataUrl یا storageKey؛ کلیک PDF در تب جدید
 Parent Dependencies: pdfjs-dist, useStorageObjectUrl, types/clinic
 */
import React, { useEffect, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { FileText, Loader2, Trash2, X } from "lucide-react";
import type { PatientIntakeDocumentFile } from "@/types/clinic";
import { isIsoDay } from "@/lib/date-iso";
import { formatFaDate } from "@/lib/persian";
import { useStorageObjectUrl } from "@/hooks/useStorageObjectUrl";

function formatFileDate(value: string): string {
  return isIsoDay(value) ? formatFaDate(value) : value;
}

GlobalWorkerOptions.workerSrc = pdfWorker;

function isPdf(file: PatientIntakeDocumentFile, src?: string): boolean {
  const url = src ?? file.dataUrl;
  return (
    file.mimeType === "application/pdf" ||
    url.startsWith("data:application/pdf") ||
    /\.pdf$/i.test(file.fileName)
  );
}

/** data: و blob: هر دو با fetch خوانده می‌شوند */
async function sourceToPdfBytes(src: string): Promise<Uint8Array> {
  const url = (src ?? "").trim();
  if (!url) throw new Error("empty pdf source");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`pdf fetch ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function renderPdfFirstPageThumb(src: string, targetWidth = 120): Promise<string> {
  const data = await sourceToPdfBytes(src);
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

function PdfThumb({ src }: { src: string }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setThumbUrl(null);
    setFailed(false);
    if (!src.trim()) {
      setFailed(true);
      return;
    }
    void renderPdfFirstPageThumb(src)
      .then((url) => {
        if (!cancelled) setThumbUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

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

function openInNewTab(src: string) {
  const url = src.trim();
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function FileThumbCell({
  file,
  title,
  fallbackDocumentDate,
  disabled,
  busy,
  onRemoveFile,
  removingFileId,
  onPreviewImage,
}: {
  file: PatientIntakeDocumentFile;
  title: string;
  fallbackDocumentDate?: string | null;
  disabled?: boolean;
  busy?: boolean;
  onRemoveFile?: (fileId: string) => void;
  removingFileId?: string | null;
  onPreviewImage: (fileId: string) => void;
}) {
  // اگر hydrate قبلی dataUrl خالی گذاشته، از storageKey دوباره می‌گیریم
  const needsFetch = !file.dataUrl?.trim() && Boolean(file.storageKey);
  const { url: fetchedUrl, failed: fetchFailed } = useStorageObjectUrl(
    needsFetch ? file.storageKey : null
  );
  const src = file.dataUrl?.trim() || fetchedUrl || "";
  const loading = needsFetch && !src && !fetchFailed;
  const pdf = isPdf(file, src);
  const dateLabel = (file.documentDate || fallbackDocumentDate || "").trim();

  return (
    <li className="relative">
      <button
        type="button"
        disabled={!src || loading}
        onClick={() => {
          if (!src) return;
          // PDF و تصویر هر دو در تب جدید باز می‌شوند تا پزشک سریع ببیند
          if (pdf) {
            openInNewTab(src);
            return;
          }
          onPreviewImage(file.id);
        }}
        className="group block w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-right active:scale-[0.98] disabled:opacity-60"
        aria-label={
          pdf ? `باز کردن ${file.fileName} در تب جدید` : `پیش‌نمایش ${file.fileName}`
        }
      >
        {loading ? (
          <div className="flex aspect-square items-center justify-center bg-slate-100">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden />
          </div>
        ) : fetchFailed || !src ? (
          <div className="flex aspect-square flex-col items-center justify-center gap-1 bg-slate-50 px-1">
            <FileText className="h-5 w-5 text-slate-400" aria-hidden />
            <span className="text-[9px] text-slate-400">بدون پیش‌نمایش</span>
          </div>
        ) : pdf ? (
          <PdfThumb src={src} />
        ) : (
          <div className="aspect-square bg-slate-100">
            <img
              src={src}
              alt={file.fileName || title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <p className="truncate px-0.5 py-0.5 text-center text-[9px] leading-3 text-slate-600">
          {file.fileName || title}
        </p>
        {dateLabel ? (
          <p className="truncate px-0.5 pb-0.5 text-center text-[9px] leading-3 text-slate-400">
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
  const previewNeedsFetch = preview && !preview.dataUrl?.trim() && Boolean(preview.storageKey);
  const { url: previewFetched } = useStorageObjectUrl(
    previewNeedsFetch ? preview?.storageKey : null
  );
  const previewSrc = preview?.dataUrl?.trim() || previewFetched || "";

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
        {files.map((file) => (
          <FileThumbCell
            key={file.id}
            file={file}
            title={title}
            fallbackDocumentDate={fallbackDocumentDate}
            disabled={disabled}
            busy={busy}
            onRemoveFile={onRemoveFile}
            removingFileId={removingFileId}
            onPreviewImage={setPreviewId}
          />
        ))}
      </ul>

      {preview && previewSrc && !isPdf(preview, previewSrc) && (
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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openInNewTab(previewSrc)}
                  className="rounded-lg bg-white/15 px-2 py-1 text-[10px] font-semibold text-white"
                >
                  تب جدید
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewId(null)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white"
                  aria-label="بستن پیش‌نمایش"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex max-h-[70vh] items-center justify-center overflow-auto px-2 pb-2">
              <img
                src={previewSrc}
                alt={preview.fileName || title}
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
