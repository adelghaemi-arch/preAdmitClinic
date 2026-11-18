import { useState } from "react";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import type { ClinicSnapshot } from "@/types/clinic";
import type { CompanionVisibility } from "@/types/clinic";
import { relationLabel } from "@/lib/workspace";

const FIELDS: { key: keyof CompanionVisibility; label: string; description: string }[] = [
  { key: "journey", label: "مسیر و فراخوان‌ها", description: "ایستگاه فعلی، زمان انتظار، نقشه و پیام‌های حرکت" },
  { key: "results", label: "نتایج آزمایش و تصویر", description: "اعداد آزمایش و تصاویر تشخیصی" },
  { key: "diagnoses", label: "تشخیص پزشکان", description: "یادداشت‌های معاینه و نسخه‌ها" },
  { key: "medications", label: "داروهای مصرفی", description: "داروهای فعلی ثبت‌شده" },
  { key: "allergies", label: "حساسیت‌ها", description: "اطلاعات آلرژی بیمار" },
  { key: "familyHistory", label: "سوابق خانوادگی", description: "بیماری‌های بستگان درجه یک" },
  { key: "reports", label: "گزارش پایانی پرونده", description: "خروجی جامع پس از پایان مراجعه" },
];

export function PatientPrivacySettings({ snapshot, userId, patientId, onAction, busy }: {
  snapshot: ClinicSnapshot;
  userId: number;
  patientId: number;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
}) {
  const links = snapshot.links.filter((link) => link.patientId === patientId && link.userId !== userId && link.relationship !== "self");
  const [drafts, setDrafts] = useState<Record<number, CompanionVisibility>>({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const save = async (linkId: number, visibility: CompanionVisibility) => {
    setError(""); setStatus("");
    try {
      await onAction({ action: "UPDATE_COMPANION_VISIBILITY", patientId, linkId, visibility });
      setDrafts((prev) => { const next = { ...prev }; delete next[linkId]; return next; });
      setStatus("تنظیمات نمایش همراه ذخیره شد.");
    } catch (err) { setError(err instanceof Error ? err.message : "ذخیره انجام نشد."); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-teal-900"><ShieldCheck className="h-5 w-5" />شما مالک این پرونده هستید</h2>
        <p className="mt-2 text-xs leading-7 text-teal-800">برای هر همراه تعیین کنید کدام اطلاعات درمانی را در حساب خودش ببیند. بخش‌هایی که خاموش هستند، از پاسخ سرور هم حذف می‌شوند. پزشکان همچنان به پرونده کامل برای درمان شما دسترسی دارند.</p>
      </div>
      {status && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{status}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {links.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">هنوز همراهی برای این پرونده ثبت نشده است.</div> : links.map((link) => {
        const visibility = drafts[link.id] ?? link.visibility;
        return <section key={link.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><UserRound className="h-4 w-4 text-teal-600" /><strong className="text-sm text-slate-800">همراه: {relationLabel(link.relationship)}</strong><span className="text-[10px] text-slate-400">حساب #{link.userId}</span></div>
          <div className="grid gap-2 p-5 sm:grid-cols-2">{FIELDS.map((field) => <label key={field.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3"><span><span className="block text-xs font-semibold text-slate-800">{field.label}</span><span className="mt-1 block text-[10px] leading-5 text-slate-500">{field.description}</span></span><input aria-label={`${field.label} برای ${relationLabel(link.relationship)}`} type="checkbox" checked={Boolean(visibility[field.key])} onChange={(e) => setDrafts((prev) => ({ ...prev, [link.id]: { ...visibility, [field.key]: e.target.checked } }))} className="h-4 w-4 accent-teal-600" /></label>)}</div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3"><span className="flex items-center gap-1 text-[10px] text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />بخش‌های خاموش از همراه پنهان می‌مانند.</span><button disabled={busy || !drafts[link.id]} onClick={() => void save(link.id, visibility)} className="primary-button">ذخیره دسترسی این همراه</button></div>
        </section>;
      })}
    </div>
  );
}
