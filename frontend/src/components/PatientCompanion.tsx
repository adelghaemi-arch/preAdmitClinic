/*
 File: frontend/src/components/PatientCompanion.tsx
 Description: نمای همراه سلامتجو با برند نفس و آیکن محصول
 Parent Dependencies: PatientMobileProfile, JourneyIntroPage, client-db
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ClinicSnapshot } from "@/types/clinic";
import { PatientMobileProfile } from "./PatientMobileProfile";
import { JourneyIntroPage } from "./JourneyIntroPage";
import { dispatchClinicAction, readSnapshot } from "@/lib/client-db";
import { getPatientSnapshot } from "@/lib/patient-access";

export function PatientCompanion({ token, initialSnapshot }: { token: string; initialSnapshot: ClinicSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [introDismissedLocally, setIntroDismissedLocally] = useState(false);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const next = await getPatientSnapshot(token);
        if (next) setSnapshot(next);
      } catch {
        /* Retry on next interval without interrupting the patient. */
      }
    }, 12000);
    return () => clearInterval(timer);
  }, [token]);

  const patient = snapshot.patients[0];
  const needsIntro = Boolean(patient && !patient.intakeCompleted && !patient.journeyIntroSeen && !introDismissedLocally);
  const lockNonIntakeTabs = Boolean(patient && !patient.intakeCompleted);

  const act = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const full = (await readSnapshot(null)).patients.find((item) => item.qrToken.toUpperCase() === token.toUpperCase());
      if (!full) throw new Error("لینک پذیرش معتبر نیست.");
      const allowed = ["SAVE_FORM_RESPONSE", "UPDATE_PATIENT_PHOTO", "PATIENT_STATION_CHECKIN", "MARK_ALERTS_READ", "COMPLETE_REPORT_STEP", "UPDATE_COMPANION_VISIBILITY", "DISMISS_JOURNEY_INTRO"];
      if (!allowed.includes(String(payload.action)) || Number(payload.patientId) !== full.id) throw new Error("این عملیات برای همراه سلامتجو مجاز نیست.");
      const data = await dispatchClinicAction(payload, { unscoped: true });
      if (!data.ok) throw new Error(data.error ?? "ذخیره اطلاعات انجام نشد.");
      const next = await getPatientSnapshot(token);
      if (next) setSnapshot(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط برقرار نشد.");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const dismissIntro = async () => {
    if (!patient) return;
    setIntroDismissedLocally(true);
    await act({ action: "DISMISS_JOURNEY_INTRO", patientId: patient.id });
  };

  return (
    <main className="mx-auto min-h-screen max-w-[650px] bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
        <span className="flex items-center gap-2 text-xs font-bold text-[#20745c]">
          <img src="/icon-64x64.png" alt="نفس" className="h-5 w-5 rounded-md object-cover" />
          همراه سلامتجو نفس
        </span>
        <span className="text-[9px] text-slate-400">مراقبت پیوسته، کنار شما</span>
      </div>
      {needsIntro && patient ? (
        <div className="p-4">
          <JourneyIntroPage snapshot={snapshot} patientId={patient.id} onContinue={() => void dismissIntro()} busy={busy} />
        </div>
      ) : (
        <PatientMobileProfile
          snapshot={snapshot}
          selectedPatientId={patient?.id ?? 0}
          onSelectPatient={() => undefined}
          onAction={act}
          busy={busy}
          hidePatientSwitch
          initialTab={lockNonIntakeTabs ? "intake" : "journey"}
          lockNonIntakeTabs={lockNonIntakeTabs}
        />
      )}
      {error && (
        <div role="alert" className="fixed right-4 bottom-24 left-4 z-50 mx-auto flex max-w-lg items-center justify-between rounded-xl border border-rose-200 bg-white px-4 py-3 text-xs text-rose-600 shadow-xl">
          {error}
          <button onClick={() => setError("")} aria-label="بستن">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </main>
  );
}
