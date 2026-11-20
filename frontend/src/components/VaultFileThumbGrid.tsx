/*
 File: frontend/src/components/VaultFileThumbGrid.tsx
 Description: تامنیل و lightbox خزانه فایل با object URL احراز‌شده از API
 Parent Dependencies: hooks/useStorageObjectUrl, ApiVaultFileDto
 */

import { useEffect, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { FileText, Loader2, X } from "lucide-react";
import type { ApiVaultFileDto } from "@/lib/api/evidence";
import { useStorageObjectUrl } from "@/hooks/useStorageObjectUrl";
import { toFaDigits } from "@/lib/persian";

GlobalWorkerOptions.workerSrc = pdfWorker;

const VAULT_KIND_FA: Record<string, string> = {
  document: "مدرک",
  portrait: "پرتره",
  fraud_auto: "فریم ضدتقلب",
  fraud_confirm: "تأیید هویت",
};

function isPdfName(fileName: string): boolean {
  return /\.pdf$/i.test(fileName);
}

async function renderPdfFirstPageThumb(objectUrl: string, targetWidth = 120): Promise<string> {
  const res = await fetch(objectUrl);
  const data = new Uint8Array(await res.arrayBuffer());
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

function PdfThumb({ objectUrl }: { objectUrl: string }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setThumbUrl(null);
    setFailed(false);
    void renderPdfFirstPageThumb(objectUrl)
      .then((u) => {
        if (!cancelled) setThumbUrl(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [objectUrl]);

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

function VaultThumbCell({
  row,
  selected,
  busy,
  onToggle,
  onOpen,
}: {
  row: ApiVaultFileDto;
  selected: boolean;
  busy: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const { url, failed } = useStorageObjectUrl(row.storageKey);
  const pdf = isPdfName(row.fileName);

  return (
    <li className={`relative overflow-hidden rounded-xl border ${selected ? "border-teal-400 ring-1 ring-teal-200" : "border-slate-200"} bg-white`}>
      <label className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-white/95 shadow-sm">
        <input
          type="checkbox"
          checked={selected}
          disabled={busy}
          onChange={onToggle}
          aria-label={`انتخاب ${row.fileName}`}
          className="h-3.5 w-3.5"
        />
      </label>
      <button
        type="button"
        onClick={onOpen}
        disabled={!url && !failed}
        className="block w-full text-right active:scale-[0.99] disabled:opacity-70"
        aria-label={`پیش‌نمایش ${row.fileName}`}
      >
        {failed ? (
          <div className="flex aspect-square flex-col items-center justify-center gap-1 bg-slate-50 px-2">
            <FileText className="h-5 w-5 text-slate-400" aria-hidden />
            <span className="text-[9px] text-slate-400">بارگذاری ناموفق</span>
          </div>
        ) : !url ? (
          <div className="flex aspect-square items-center justify-center bg-slate-100">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden />
          </div>
        ) : pdf ? (
          <PdfThumb objectUrl={url} />
        ) : (
          <div className="aspect-square bg-slate-100">
            <img src={url} alt={row.fileName} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="space-y-0.5 px-1.5 py-1.5">
          <p className="truncate text-[10px] font-medium text-slate-800">{row.patientFullName}</p>
          <p className="truncate text-[9px] text-slate-500">{VAULT_KIND_FA[row.kind] ?? row.kind}</p>
          <p className="truncate text-[9px] text-slate-400" title={row.storageKey}>
            {row.fileName}
          </p>
          <p className="text-[9px] text-slate-400">{new Date(row.capturedAt).toLocaleString("fa-IR")}</p>
          {row.deletedAt && (
            <p className="text-[9px] text-amber-700">حذف: {new Date(row.deletedAt).toLocaleString("fa-IR")}</p>
          )}
          {row.nationalId ? (
            <p className="truncate font-mono text-[8px] text-slate-400">{toFaDigits(row.nationalId)}</p>
          ) : null}
        </div>
      </button>
    </li>
  );
}

export function VaultFileThumbGrid({
  rows,
  selected,
  busy,
  onToggle,
  emptyLabel,
}: {
  rows: ApiVaultFileDto[];
  selected: Set<string>;
  busy: boolean;
  onToggle: (id: string) => void;
  emptyLabel: string;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = rows.find((r) => r.id === previewId) ?? null;
  const { url: previewUrl, failed: previewFailed } = useStorageObjectUrl(preview?.storageKey)

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

  if (!rows.length) {
    return <p className="rounded-xl border border-slate-100 px-3 py-8 text-center text-[11px] text-slate-400">{emptyLabel}</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {rows.map((row) => (
          <VaultThumbCell
            key={row.id}
            row={row}
            selected={selected.has(row.id)}
            busy={busy}
            onToggle={() => onToggle(row.id)}
            onOpen={() => setPreviewId(row.id)}
          />
        ))}
      </ul>

      {preview && (
        <div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-slate-950/90 p-2 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="پیش‌نمایش فایل خزانه"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-slate-900/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-2.5 py-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] text-white/90">{preview.fileName}</p>
                <p className="truncate text-[9px] text-white/50" title={preview.storageKey}>
                  {preview.patientFullName} · {VAULT_KIND_FA[preview.kind] ?? preview.kind}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white"
                aria-label="بستن پیش‌نمایش"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-[75vh] min-h-[12rem] items-center justify-center overflow-auto px-2 pb-2">
              {previewFailed ? (
                <p className="text-[11px] text-rose-200">بارگذاری فایل ناموفق بود.</p>
              ) : !previewUrl ? (
                <Loader2 className="h-6 w-6 animate-spin text-white/70" aria-hidden />
              ) : isPdfName(preview.fileName) ? (
                <iframe
                  src={previewUrl}
                  title={preview.fileName}
                  className="h-[70vh] w-full rounded-lg bg-white"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={preview.fileName}
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
