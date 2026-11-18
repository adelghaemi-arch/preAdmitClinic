import { useEffect, useState } from "react";
import { HeartPulse, X } from "lucide-react";
import type { ClinicSnapshot } from "@/types/clinic";
import { PatientMobileProfile } from "./PatientMobileProfile";
import { dispatchClinicAction, readSnapshot } from "@/lib/client-db";
import { getPatientSnapshot } from "@/lib/patient-access";

export function PatientCompanion({ token, initialSnapshot }: { token: string; initialSnapshot: ClinicSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try { const next = await getPatientSnapshot(token); if (next) setSnapshot(next); } catch { /* Retry on next interval without interrupting the patient. */ }
    }, 12000);
    return () => clearInterval(timer);
  }, [token]);
  const act = async (payload: Record<string, unknown>) => {
    setBusy(true); setError("");
    try {
      const patient = (await readSnapshot(null)).patients.find((item) => item.qrToken.toUpperCase() === token.toUpperCase());
      if (!patient) throw new Error("لینک پذیرش معتبر نیست.");
      const allowed = ["SAVE_PATIENT_INTAKE", "PATIENT_STATION_CHECKIN", "MARK_ALERTS_READ", "COMPLETE_REPORT_STEP", "UPDATE_COMPANION_VISIBILITY"];
      if (!allowed.includes(String(payload.action)) || Number(payload.patientId) !== patient.id) throw new Error("این عملیات برای همراه بیمار مجاز نیست.");
      const data = await dispatchClinicAction(payload, { unscoped: true });
      if (!data.ok) throw new Error(data.error ?? "ذخیره اطلاعات انجام نشد.");
      const next = await getPatientSnapshot(token);
      if (next) setSnapshot(next);
    } catch (e) { setError(e instanceof Error ? e.message : "ارتباط برقرار نشد."); throw e; } finally { setBusy(false); }
  };
  return <main className="mx-auto min-h-screen max-w-[650px] bg-slate-50"><div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3"><span className="flex items-center gap-2 text-xs font-bold text-[#20745c]"><HeartPulse className="h-5 w-5" />همراه بیمار نبض</span><span className="text-[9px] text-slate-400">مراقبت پیوسته، کنار شما</span></div><PatientMobileProfile snapshot={snapshot} selectedPatientId={snapshot.patients[0]?.id ?? 0} onSelectPatient={() => undefined} onAction={act} busy={busy} hidePatientSwitch />{error && <div role="alert" className="fixed right-4 bottom-24 left-4 z-50 mx-auto flex max-w-lg items-center justify-between rounded-xl border border-rose-200 bg-white px-4 py-3 text-xs text-rose-600 shadow-xl">{error}<button onClick={() => setError("")} aria-label="بستن"><X className="h-4 w-4" /></button></div>}</main>;
}
