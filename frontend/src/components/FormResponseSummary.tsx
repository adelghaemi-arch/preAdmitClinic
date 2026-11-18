import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { ClinicSnapshot, FormDefinition, PatientFullDto } from "@/types/clinic";
import {
  buildAiPayload,
  getAnswer,
  redFlagAnswers,
  sectionsOf,
  submittedResponse,
  ynLabel,
} from "@/lib/form-engine";
import { toFaDigits } from "@/lib/persian";

interface FormResponseSummaryProps {
  patient: PatientFullDto;
  forms: FormDefinition[];
  compact?: boolean;
  showAiPayloadToggle?: boolean;
}

export function FormResponseSummary({
  patient,
  forms,
  compact = false,
  showAiPayloadToggle = false,
}: FormResponseSummaryProps) {
  const response = submittedResponse(patient);
  const form = useMemo(
    () => (response ? forms.find((f) => f.id === response.formId) ?? null : null),
    [forms, response]
  );
  const [showPayload, setShowPayload] = React.useState(false);

  if (!patient.intakeCompleted || !response || !form) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
        پرسشنامه پیش‌پذیرش این مراجعه هنوز ثبت نهایی نشده است.
      </div>
    );
  }

  const flags = redFlagAnswers(form, response);
  const yesItems = form.items
    .map((item) => ({ item, answer: getAnswer(response.answers, item.code) }))
    .filter(({ answer, item }) => item.inputType === "yn_unk" && answer.valueCode === "yes" && !answer.skippedByRule);

  const payload = buildAiPayload(form, response);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{form.title}</h3>
          <p className="text-[10px] text-slate-500">
            نسخه {toFaDigits(form.version)} · ثبت {response.completedAt ? new Date(response.completedAt).toLocaleString("fa-IR") : "—"}
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-800">پشتیبانی تصمیم — نه تشخیص</span>
      </div>

      {flags.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-rose-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            موارد هشدار گزارش‌شده توسط سلامتجو
          </div>
          <ul className="space-y-1 text-[11px] text-rose-900">
            {flags.map(({ item, answer }) => (
              <li key={item.code}>
                • {item.labelFa}
                {answer.notes ? ` — ${answer.notes}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && (
        <div className="space-y-2">
          {sectionsOf(form).map((section) => {
            const rows = form.items
              .filter((i) => i.sectionId === section.id)
              .map((item) => ({ item, answer: getAnswer(response.answers, item.code) }))
              .filter(({ answer }) => !answer.skippedByRule)
              .filter(({ item, answer }) =>
                item.inputType === "yn_unk" ? Boolean(answer.valueCode) : Boolean(answer.valueRaw.trim())
              );
            if (!rows.length) return null;
            return (
              <div key={section.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-semibold text-slate-800">{section.title}</div>
                <div className="mt-2 space-y-1.5">
                  {rows.map(({ item, answer }) => (
                    <div key={item.code} className="text-[11px] leading-5 text-slate-700">
                      <span className="font-medium">{item.labelFa}: </span>
                      <span>
                        {item.inputType === "yn_unk" ? ynLabel(answer.valueCode) : answer.valueRaw}
                        {answer.notes ? ` (${answer.notes})` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {compact && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-semibold text-slate-800">پاسخ‌های «بله» ({toFaDigits(yesItems.length)})</div>
          <ul className="mt-2 space-y-1 text-[11px] text-slate-700">
            {yesItems.slice(0, 12).map(({ item, answer }) => (
              <li key={item.code}>
                • {item.labelFa}
                {answer.notes ? ` — ${answer.notes}` : ""}
              </li>
            ))}
            {yesItems.length > 12 && <li>… و {toFaDigits(yesItems.length - 12)} مورد دیگر</li>}
            {!yesItems.length && <li>مورد مثبتی ثبت نشده است.</li>}
          </ul>
        </div>
      )}

      {showAiPayloadToggle && (
        <div>
          <button
            type="button"
            onClick={() => setShowPayload((v) => !v)}
            className="text-[10px] text-teal-700 underline"
          >
            {showPayload ? "پنهان کردن" : "نمایش"} خروجی ساخت‌یافته برای تحلیل AI
          </button>
          {showPayload && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-[10px] text-emerald-100" dir="ltr">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function formsOfSnapshot(snapshot: ClinicSnapshot): FormDefinition[] {
  return snapshot.forms ?? [];
}
