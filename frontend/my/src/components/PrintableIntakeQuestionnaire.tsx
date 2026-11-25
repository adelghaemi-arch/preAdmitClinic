/*
 File: frontend/my/src/components/PrintableIntakeQuestionnaire.tsx
 Description: پیش‌نمایش حرفه‌ای + دانلود PDF با برند کلینیک/قرارداد
 Parent Dependencies: intake-pdf-render, intake-pdf, types/clinic
 */

import React, { useMemo, useState } from "react";
import { Download, FileText, Loader2, X } from "lucide-react";
import type { FormDefinition } from "@/types/clinic";
import { downloadMemberIntakePdf, type ApiMemberSubmittedFormDto } from "@/lib/api/contracts";
import type { IntakePdfBrandInput } from "@/lib/intake-pdf";
import { buildIntakePdfModel } from "@/lib/intake-pdf-render";
import { toFaDigits } from "@/lib/persian";

interface Props {
  dto: ApiMemberSubmittedFormDto;
  forms: FormDefinition[];
  brand: IntakePdfBrandInput;
  onClose: () => void;
}

function BrandBlock({ logoUrl, label }: { logoUrl?: string | null; label: string }) {
  const [broken, setBroken] = useState(false);
  if (!logoUrl || broken) {
    return (
      <div className="flex h-14 w-28 items-center justify-center rounded-xl border border-teal-100 bg-teal-50/80 px-2 text-center text-[10px] font-bold leading-4 text-teal-800">
        {label}
      </div>
    );
  }
  return (
    <div className="flex h-14 w-28 items-center justify-center">
      <img src={logoUrl} alt={label} className="max-h-14 max-w-[7rem] object-contain" onError={() => setBroken(true)} />
    </div>
  );
}

export function PrintableIntakeQuestionnaire({ dto, forms, brand, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const model = useMemo(() => buildIntakePdfModel(dto, forms, brand), [dto, forms, brand]);

  const handleDownloadPdf = async () => {
    setBusy(true);
    setError("");
    try {
      // PDF واقعی از Chromium سرور — نه html2canvas مرورگر
      await downloadMemberIntakePdf(dto.contractId, dto.memberId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "دانلود PDF ناموفق بود.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="دانلود PDF پرسشنامه"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs md:p-6"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">خروجی PDF پرسشنامه پیش‌پذیرش</h3>
              <p className="text-xs text-slate-500">
                {dto.fullName} · {model.hospitalLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-teal-800 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {busy ? "در حال ساخت PDF…" : "دانلود فایل PDF"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="بستن"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-[11px] font-medium text-rose-800">{error}</div>
        ) : null}

        <div className="overflow-y-auto bg-[#f3f6f5] p-4 md:p-6">
          <div className="mx-auto max-w-[720px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1 bg-gradient-to-l from-[#1e3a5f] via-[#134e4a] to-[#0f766e]" />
            <div className="space-y-5 p-6 md:p-8">
              <header className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <BrandBlock logoUrl={model.hospitalLogoSrc} label={model.hospitalLabel} />
                <div className="min-w-0 flex-1 text-center">
                  <div className="text-[12px] font-extrabold leading-5 text-teal-800">{model.hospitalLabel}</div>
                  <h2 className="mt-1 text-base font-extrabold text-slate-900 md:text-lg">گزارش پرسشنامه پیش‌پذیرش</h2>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {model.formTitle} · کد {toFaDigits(model.formCode)}
                  </p>
                </div>
                <BrandBlock logoUrl={model.partnerLogoSrc} label={model.organizationName} />
              </header>

              <div className="grid gap-2.5 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3.5 sm:grid-cols-2">
                {[
                  ["نام و نام‌خانوادگی", model.fullName],
                  ["کد ملی", toFaDigits(model.nationalId)],
                  ["سن / جنسیت", `${model.ageLabel} · ${model.gender}`],
                  ["سازمان طرف‌قرارداد", model.organizationName],
                  ["تاریخ تکمیل", model.submittedLabel],
                  ["عنوان فرم", model.formTitle],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[10px] font-semibold text-slate-500">{k}</div>
                    <div className="mt-0.5 text-xs font-bold leading-5 text-slate-800">{v}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-block rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-[11px] font-bold leading-4 text-teal-800">
                  {toFaDigits(model.totalAnswers)} پاسخ ثبت‌شده
                </span>
                <span className="inline-block rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold leading-4 text-slate-600">
                  {toFaDigits(model.sections.length)} بخش
                </span>
                {model.flagTotal > 0 ? (
                  <span className="inline-block rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold leading-4 text-rose-800">
                    {toFaDigits(model.flagTotal)} مورد هشدار بالینی
                  </span>
                ) : (
                  <span className="inline-block rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold leading-4 text-slate-600">
                    بدون هشدار بالینی
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {model.sections.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-[11px] text-slate-500">
                    پاسخی برای نمایش ثبت نشده است.
                  </div>
                ) : (
                  model.sections.map((sec, idx) => (
                    <section key={`${sec.title}-${idx}`} className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-[12px] font-extrabold leading-none text-white">
                          {toFaDigits(idx + 1)}
                        </span>
                        <h3 className="flex-1 text-[12px] font-extrabold leading-7 text-slate-900">{sec.title}</h3>
                        {sec.flagCount > 0 ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-800">
                            {toFaDigits(sec.flagCount)} هشدار
                          </span>
                        ) : null}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {sec.rows.map((row, rIdx) => (
                          <div
                            key={`${row.label}-${rIdx}`}
                            className={`grid gap-2 px-3 py-2.5 text-[11px] sm:grid-cols-[1.3fr_1fr] ${
                              row.isRedFlag ? "bg-rose-50/70" : row.hasNotes ? "bg-amber-50/50" : "bg-white"
                            }`}
                          >
                            <div className="font-semibold leading-5 text-slate-700">
                              {row.isRedFlag ? (
                                <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-800">
                                  هشدار
                                </span>
                              ) : null}
                              {row.label}
                            </div>
                            <div className="leading-5">
                              <div className="font-bold text-slate-900">{row.value}</div>
                              {row.notes ? (
                                <div className="mt-0.5 text-[10px] font-medium text-slate-600">توضیح: {row.notes}</div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>

              <footer className="flex items-start justify-between gap-3 border-t border-slate-200 pt-3 text-[9px] leading-5 text-slate-500">
                <p className="max-w-[75%]">
                  این سند محرمانه است و صرفاً برای استفاده‌ی بالینی/اداری مجاز صادر شده است. هرگونه انتشار بدون مجوز{" "}
                  {model.hospitalLabel} ممنوع است.
                </p>
                <span className="shrink-0 font-bold text-teal-800">{model.hospitalLabel}</span>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
