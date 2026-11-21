/*
 File: frontend/src/components/PrintableEmrReport.tsx
 Description: گزارش قابل چاپ پرونده الکترونیک با برند نفس
 Parent Dependencies: ResultAttachment
 */
import { ResultAttachment } from "./ResultAttachment";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  Stethoscope,
  X,
} from "lucide-react";
import type { FormDefinition, PatientFullDto } from "@/types/clinic";
import { formatFaTime, toFaDigits } from "@/lib/persian";
import { loadSeedForms } from "@/lib/form-engine";
import { FormResponseSummary } from "./FormResponseSummary";

interface PrintableEmrReportProps {
  patient: PatientFullDto;
  onClose: () => void;
  forms?: FormDefinition[];
}

export function PrintableEmrReport({
  patient,
  onClose,
  forms,
}: PrintableEmrReportProps) {
  const formCatalog = forms?.length ? forms : loadSeedForms();
  const getReportDocument = () => {
    const sheet = document.getElementById("printable-emr-sheet");
    if (!sheet) return "";
    const styles = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map((link) => `<link rel="stylesheet" href="${link.href}" />`).join("");
    const title = `پرونده جامع امروز - ${patient.fullName}`.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!);
    return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>${title}</title>${styles}<style>
      @font-face{font-family:Vazirmatn;src:url('${window.location.origin}/fonts/Vazirmatn.woff2')}body{font-family:Vazirmatn,Tahoma,sans-serif;background:white;margin:0;color:#243d32}#printable-emr-sheet{position:static!important;overflow:visible!important;width:100%!important;max-height:none!important;padding:20px!important;box-sizing:border-box}body *{visibility:visible!important}a{color:#24795b;text-decoration:none}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e9e4;padding:6px}img{max-width:100%;height:auto}h2,h3,h4{break-after:avoid}tr{break-inside:avoid}@page{size:A4;margin:12mm}@media print{#printable-emr-sheet{padding:0!important}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body>${sheet.outerHTML}</body></html>`;
  };

  const handlePrintPdf = () => {
    const html = getReportDocument();
    if (!html) return;
    const frame = document.createElement("iframe");
    frame.title = "چاپ پرونده سلامتجو";
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:1100px;border:0";
    frame.onload = async () => {
      const doc = frame.contentDocument;
      if (doc) await doc.fonts.ready;
      frame.contentWindow?.addEventListener("afterprint", () => frame.remove(), { once: true });
      setTimeout(() => { frame.contentWindow?.focus(); frame.contentWindow?.print(); }, 250);
      setTimeout(() => frame.remove(), 120000);
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  };

  const handleDownloadStandaloneFile = () => {
    const html = getReportDocument();
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `Nabz_EMR_${patient.id}.html`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="گزارش جامع پرونده" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs md:p-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Action Toolbar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                پیش‌نمایش رسمی پرونده الکترونیک جامع امروز (PDF / چاپ)
              </h3>
              <p className="text-xs text-slate-500">
                خلاصه کامل چکاپ، آزمایش‌ها، نوار قلب و نسخه‌های {patient.fullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700"
            >
              <Printer className="h-4 w-4" />
              چاپ / ذخیره PDF (A4)
            </button>
            <button
              type="button"
              onClick={handleDownloadStandaloneFile}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
            >
              <Download className="h-4 w-4" />
              دریافت نسخه HTML پرونده
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

        {/* Printable Document Sheet */}
        <div
          id="printable-emr-sheet"
          className="overflow-y-auto p-6 text-slate-900 md:p-8"
        >
          {/* Official Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-sky-600 pb-5">
            <div>
              <div className="text-xs font-bold text-sky-700">
                سامانه سلامت دیجیتال نفس
              </div>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                گزارش پرونده الکترونیک جامع یک‌روزه (Today&apos;s Complete EMR)
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                پکیج درمانی: <span className="font-semibold">{patient.pathwayTitle}</span>{" "}
                | ساعت پذیرش: {formatFaTime(patient.checkInTime)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
              <div className="font-bold text-slate-900">{patient.fullName}</div>
              <div className="mt-0.5 text-slate-600">
                کد ملی: {toFaDigits(patient.nationalId)} | سن:{" "}
                {toFaDigits(patient.age)} سال ({patient.gender})
              </div>
              <div dir="ltr" className="mt-1 font-mono text-[11px] text-sky-700">
                {patient.qrToken}
              </div>
            </div>
          </div>

          {/* Red Allergy Alert */}
          {patient.allergies.length > 0 && (
            <div className="mt-5 rounded-xl border-2 border-red-300 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-red-800">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                هشدار حساسیت‌های دارویی و غذایی ثبت‌شده سلامتجو
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {patient.allergies.map((al) => (
                  <div
                    key={al.id}
                    className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs"
                  >
                    <span className="font-bold text-red-700">{al.substance}</span>{" "}
                    <span className="text-slate-500">
                      ({al.category} — شدت {al.severity})
                    </span>
                    <div className="mt-0.5 text-slate-700">واکنش: {al.reaction}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pre-admit questionnaire summary */}
          <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50/50 p-4 text-xs leading-7">
            <h4 className="mb-2 font-bold text-teal-900">پرسشنامه پیش‌پذیرش ثبت‌شده برای همین مراجعه</h4>
            <FormResponseSummary
              patient={patient}
              forms={formCatalog}
              viewMode="full"
              expandAllSections
            />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <h4 className="text-xs font-bold text-slate-800">
                داروهای مصرفی پایه سلامتجو
              </h4>
              {patient.medications.length === 0 ? (
                <p className="mt-1.5 text-xs text-slate-500">موردی ثبت نشده</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                  {patient.medications.map((m) => (
                    <li key={m.id}>
                      <span className="font-semibold">{m.name}</span> ({m.dosage}) —{" "}
                      {m.timing}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <h4 className="text-xs font-bold text-slate-800">
                سوابق جراحی و بستری
              </h4>
              {patient.surgeries.length === 0 ? (
                <p className="mt-1.5 text-xs text-slate-500">سابقه جراحی ندارد</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                  {patient.surgeries.map((s) => (
                    <li key={s.id}>
                      <span className="font-semibold">{s.type}</span> ({s.approxDate})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <h4 className="text-xs font-bold text-slate-800">
                سوابق بیماری خانوادگی
              </h4>
              {patient.familyHistory.length === 0 ? (
                <p className="mt-1.5 text-xs text-slate-500">موردی ثبت نشده</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                  {patient.familyHistory.map((f) => (
                    <li key={f.id}>
                      {f.condition} — نسبت: <span className="font-semibold">{f.relation}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Paraclinic Results */}
          <div className="mt-6">
            <h3 className="flex items-center gap-2 border-b border-slate-200 pb-2 text-sm font-extrabold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-sky-600" />
              نتایج آزمایشگاه، نوار قلب و تصویربرداری امروز
            </h3>
            {patient.paraclinicResults.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                هنوز نتیجه پاراکلینیکی برای امروز بارگذاری نشده است.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {patient.paraclinicResults.map((res) => (
                  <div
                    key={res.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {res.title}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          res.summaryStatus === "نرمال"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {res.summaryStatus}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                      <span className="font-semibold">تفسیر:</span> {res.interpretation}
                    </p>
                    {res.metrics.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700">
                              <th className="border border-slate-200 px-3 py-1.5 text-right">
                                شاخص
                              </th>
                              <th className="border border-slate-200 px-3 py-1.5 text-right">
                                نتیجه سلامتجو
                              </th>
                              <th className="border border-slate-200 px-3 py-1.5 text-right">
                                بازه مرجع نرمال
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {res.metrics.map((m, idx) => (
                              <tr key={idx}>
                                <td className="border border-slate-200 px-3 py-1.5 font-medium">
                                  {m.parameter}
                                </td>
                                <td
                                  dir="ltr"
                                  className={`border border-slate-200 px-3 py-1.5 text-right font-bold ${
                                    m.abnormal ? "text-red-600" : "text-slate-900"
                                  }`}
                                >
                                  {m.value} {m.unit} {m.abnormal ? "(!)" : ""}
                                </td>
                                <td
                                  dir="ltr"
                                  className="border border-slate-200 px-3 py-1.5 text-right text-slate-500"
                                >
                                  {m.normalRange}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {res.attachmentUrl && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <ResultAttachment url={res.attachmentUrl} title={res.title} fileName={res.fileName} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Specialist Clinical Notes & Prescriptions */}
          <div className="mt-6">
            <h3 className="flex items-center gap-2 border-b border-slate-200 pb-2 text-sm font-extrabold text-slate-900">
              <Stethoscope className="h-4 w-4 text-emerald-600" />
              تشخیص‌های پزشکان متخصص و نسخه‌های دارویی امروز
            </h3>
            {patient.clinicalNotes.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                هنوز یادداشت پزشکی در مسیر امروز ثبت نشده است.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {patient.clinicalNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-sm font-extrabold text-slate-900">
                          {note.doctorName}
                        </span>{" "}
                        <span className="text-xs font-medium text-sky-700">
                          ({note.specialty})
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        ساعت ثبت: {formatFaTime(note.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2.5 space-y-1.5 text-xs leading-relaxed">
                      <div>
                        <span className="font-bold text-slate-700">شرح معاینه:</span>{" "}
                        {note.examFindings}
                      </div>
                      <div className="rounded-lg bg-sky-50 px-3 py-2 text-sky-950">
                        <span className="font-extrabold text-sky-800">
                          تشخیص نهایی:
                        </span>{" "}
                        {note.diagnosis}
                      </div>
                      {note.prescriptions.length > 0 && (
                        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                          <div className="font-bold text-emerald-900">
                            نسخه دارویی تجویز شده:
                          </div>
                          <ul className="mt-1.5 list-inside list-disc space-y-1 text-slate-800">
                            {note.prescriptions.map((rx, rIdx) => (
                              <li key={rIdx}>
                                <span className="font-bold">{rx.drug}</span> (
                                {rx.dosage}) — {rx.instruction} | مدت:{" "}
                                {rx.duration}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
