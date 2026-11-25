/*
 File: frontend/src/components/CompanionLinks.tsx
 Description: اتصال پرونده سلامتجو با QR و کدملی (حداکثر ۱۰ رقم)
 Parent Dependencies: AppInput, person-identity, workspace
 */
import { useState, type FormEvent } from "react";
import { AppInput, AppTextarea } from "@/components/AppInput";
import { ArrowLeft, Link2, ShieldCheck, Trash2, UserRound } from "lucide-react";
import type { ClinicSnapshot } from "@/types/clinic";
import { IranDigitField } from "@/components/IranDigitField";
import { COMPANION_RELATIONS, currentStation, permissionLabel, relationLabel, stationLabel, type AppPage } from "@/lib/workspace";
import { toFaDigits } from "@/lib/persian";

interface CompanionLinksProps {
  snapshot: ClinicSnapshot;
  userId: number;
  onNavigate: (page: AppPage, patientId?: number) => void;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
}

export function CompanionLinks({ snapshot, userId, onNavigate, onAction, busy }: CompanionLinksProps) {
  const [qrToken, setQrToken] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [relationship, setRelationship] = useState("self");
  const [permission, setPermission] = useState<"manage" | "follow">("manage");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await onAction({ action: "LINK_COMPANION", qrToken, nationalId, relationship, permission });
      setQrToken("");
      setNationalId("");
      setSuccess("پرونده سلامتجو با موفقیت به حساب شما متصل شد.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "اتصال پرونده انجام نشد.");
    }
  };

  const unlink = async (patientId: number) => {
    try {
      await onAction({ action: "UNLINK_COMPANION", patientId });
    } catch {
      // The application shell already shows the server message.
    }
  };

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-700">پرونده‌های متصل به حساب من</h2>
        <p className="mt-1 text-[11px] leading-6 text-slate-400">
          فقط همین پرونده‌ها برای شما نمایش داده می‌شوند. اگر خودتان سلامتجو هستید، نسبت «خود سلامتجو» را انتخاب کنید.
        </p>

        {snapshot.links.filter((l) => l.userId === userId).length === 0 && (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
            هنوز پرونده‌ای متصل نشده است.
          </div>
        )}

        <div className="mt-5 space-y-3">
          {snapshot.links.filter((l) => l.userId === userId).map((link) => {
            const patient = snapshot.patients.find((p) => p.id === link.patientId);
            if (!patient) return null;
            const station = currentStation(patient);
            return (
              <div key={link.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <UserRound className="h-4 w-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-700">{patient.fullName}</span>
                    <span className="rounded-md bg-white px-2 py-0.5 text-[10px] text-slate-500">{relationLabel(link.relationship)}</span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${link.permission === "follow" ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700"}`}>
                      {permissionLabel(link.permission)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    {station ? `ایستگاه فعلی: ${station.roomName || stationLabel(station.roomCode)}` : "مسیر امروز کامل شده است"} · {toFaDigits(patient.age)} ساله
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onNavigate("dashboard", patient.id)} className="secondary-button">
                    مشاهده امروز
                    <ArrowLeft className="h-3 w-3" />
                  </button>
                  <button disabled={busy} onClick={() => void unlink(patient.id)} className="secondary-button text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" aria-label={`لغو اتصال ${patient.fullName}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                    لغو اتصال
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Link2 className="h-4 w-4 text-teal-600" />
            اتصال پرونده سلامتجو جدید
          </h2>
          <p className="mt-1 text-[11px] leading-6 text-slate-400">
            کد QR پذیرش و کد ملی سلامتجو برای تایید هویت لازم است. پس از اتصال، اطلاعات سلامتجو در حساب شما فعال می‌شود.
          </p>
        </div>

        <label className="app-label">
          کد QR پذیرش
          <AppInput required dir="ltr" value={qrToken} onChange={(e) => setQrToken(e.target.value)} placeholder="NBZ-1404-404" className="app-input mt-2 font-mono" />
        </label>

        <label className="app-label">
          کد ملی سلامتجو
          <IranDigitField kind="nationalId" required value={nationalId} onValueChange={setNationalId} placeholder="۰۰۱۸۹۴۳۲۱۰" className="app-input mt-2 font-mono" />
        </label>

        <label className="app-label">
          نسبت شما با سلامتجو
          <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="app-input mt-2">
            {COMPANION_RELATIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="app-label mb-2">سطح دسترسی</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-xs text-slate-600 has-[:checked]:border-teal-300 has-[:checked]:bg-teal-50/50">
            <input type="radio" name="permission" checked={permission === "manage"} onChange={() => setPermission("manage")} className="mt-0.5" />
            <span>
              <strong className="flex items-center gap-1.5 font-semibold text-slate-700"><ShieldCheck className="h-3.5 w-3.5 text-teal-600" />ثبت اطلاعات و پیگیری</strong>
              <span className="mt-1 block text-[10px] text-slate-400">تکمیل پرسشنامه پیش‌پذیرش، اعلام حضور در ایستگاه و پیگیری کامل مسیر</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-xs text-slate-600 has-[:checked]:border-amber-300 has-[:checked]:bg-amber-50/40">
            <input type="radio" name="permission" checked={permission === "follow"} onChange={() => setPermission("follow")} className="mt-0.5" />
            <span>
              <strong className="font-semibold text-slate-700">فقط پیگیری</strong>
              <span className="mt-1 block text-[10px] text-slate-400">مشاهده مسیر، نتایج و اعلان‌ها بدون امکان ثبت اطلاعات</span>
            </span>
          </label>
        </fieldset>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-600">{error}</p>}
        {success && <p className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-[11px] text-teal-700">{success}</p>}

        <button disabled={busy} type="submit" className="primary-button w-full justify-center py-3">
          اتصال پرونده
        </button>
      </form>
    </div>
  );
}
