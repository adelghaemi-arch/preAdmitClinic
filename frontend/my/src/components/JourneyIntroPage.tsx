/*
 File: frontend/my/src/components/JourneyIntroPage.tsx
 Description: مقدمهٔ نقشه راه ۶ مرحله‌ای + کارت بیمارستان/فاصله OSM و شروع شواهد GPS
 Parent Dependencies: ClinicReachCard, health-roadmap, owner-gps-watch
 */

import { ArrowLeft, CheckCircle2, Lock, Route, Sparkles } from "lucide-react";
import { ClinicReachCard } from "@/components/ClinicReachCard";
import { beginOwnerEvidenceGps } from "@/lib/owner-gps-watch";
import type { ClinicSnapshot } from "@/types/clinic";
import { buildHealthRoadmap, findActiveContractMembership } from "@/lib/health-roadmap";
import { toFaDigits } from "@/lib/persian";

interface Props {
  snapshot: ClinicSnapshot;
  patientId: number;
  onContinue: () => void;
  onAction?: (payload: Record<string, unknown>) => Promise<unknown> | unknown;
  busy?: boolean;
}

/** First-login-only overview of the 6-step health journey before pre-admission. */
export function JourneyIntroPage({ snapshot, patientId, onContinue, onAction, busy }: Props) {
  const patient = snapshot.patients.find((p) => p.id === patientId) ?? snapshot.patients[0];
  if (!patient) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
        پرونده‌ای برای نمایش مسیر یافت نشد.
      </div>
    );
  }

  const membership = findActiveContractMembership(snapshot.contracts, patient.nationalId);
  const stages = buildHealthRoadmap(patient, membership?.member ?? null, {
    pathways: snapshot.pathways,
    rooms: snapshot.rooms,
  });
  const clinicName =
    snapshot.platform.clinics.find((c) => c.isCurrentTenant)?.name ??
    snapshot.platform.clinics[0]?.name;
  const gpsTrackingEnabled = snapshot.platform?.settings?.featureFlags?.gpsTracking !== false;

  const startEvidenceFromDistance = (coords: { lat: number; lon: number; accuracy: number }) => {
    if (!onAction) return;
    beginOwnerEvidenceGps({
      enabled: gpsTrackingEnabled,
      patientId: patient.id,
      serverPatientId: patient.serverId,
      initialSource: "distance_btn",
      seed: coords,
      onAction,
    });
  };

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <ClinicReachCard
        clinic={snapshot.clinicLocation}
        clinicName={clinicName}
        compact
        onStartEvidenceGps={startEvidenceFromDistance}
      />

      <div className="overflow-hidden rounded-[1.75rem] border border-[#cfe2d7] bg-white shadow-[0_12px_40px_-28px_rgba(32,116,92,0.45)]">
        <div className="relative overflow-hidden border-b border-[#d7e8df] bg-[radial-gradient(circle_at_top_right,_#e8f5ee_0%,_#ffffff_55%,_#f4faf7_100%)] px-5 py-7 sm:px-7">
          <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-[#20745c]/10 blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#3f7b60] ring-1 ring-[#cfe2d7]">
              <Route className="h-3.5 w-3.5" />
              مسیر کامل مراقبت شما
            </div>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-[#1d3f32] sm:text-2xl">
              از پیش‌پذیرش تا پرونده الکترونیک
            </h1>
            <p className="mt-2 text-xs leading-7 text-slate-500">
              این نقشه راه {toFaDigits(6)} مرحله‌ای را یک‌بار ببینید؛ سپس پیش‌پذیرش را تکمیل کنید تا بقیهٔ مسیر برایتان باز شود.
            </p>
          </div>
        </div>

        <ol className="space-y-1 px-5 py-5 sm:px-7">
          {stages.map((stage, index) => (
            <li key={stage.id} className="relative flex items-start gap-3 rounded-2xl px-2 py-3">
              {index < stages.length - 1 && (
                <span className="absolute top-12 right-[1.35rem] h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-emerald-300 to-slate-200" aria-hidden />
              )}
              <span
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold ${
                  stage.state === "done"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : stage.state === "active"
                      ? "border-[#20745c] bg-[#edf7f2] text-[#1d4f3c]"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                {stage.state === "done" ? <CheckCircle2 className="h-4 w-4" /> : stage.state === "locked" ? <Lock className="h-3.5 w-3.5" /> : stage.n}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-bold ${stage.state === "active" ? "text-[#1d4f3c]" : "text-slate-700"}`}>
                    {stage.title}
                  </span>
                  {stage.state === "active" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#20745c] px-2 py-0.5 text-[9px] font-bold text-white">
                      <Sparkles className="h-2.5 w-2.5" />
                      نقطه شروع شما
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-6 text-slate-500">{stage.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="border-t border-[#e8f0eb] px-5 py-5 sm:px-7">
          <button type="button" disabled={busy} onClick={onContinue} className="primary-button w-full justify-center py-3">
            متوجه شدم؛ شروع پیش‌پذیرش
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <p className="mt-3 text-center text-[10px] leading-5 text-slate-400">
            گام بعد: اگر عکس پرونده نداشته باشید، ثبت عکس ۳×۴ باز می‌شود؛ سپس بقیه پرسشنامه. تا تکمیل پیش‌پذیرش فقط همین مسیر در دسترس است.
          </p>
        </div>
      </div>
    </section>
  );
}
