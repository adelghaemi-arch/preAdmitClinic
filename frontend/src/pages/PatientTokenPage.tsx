import { Suspense, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { getPatientSnapshot } from "@/lib/patient-access";
import { ensureClientDb } from "@/lib/client-db";
import type { ClinicSnapshot } from "@/types/clinic";
import { PatientCompanion } from "@/components/PatientCompanion";

function PatientTokenView() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();
  const [snapshot, setSnapshot] = useState<ClinicSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      ensureClientDb();
      const result = token ? await getPatientSnapshot(token) : null;
      if (!cancelled) setSnapshot(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (snapshot === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <span className="flex items-center gap-2 text-xs text-slate-400">
          <HeartPulse className="h-4 w-4 animate-pulse text-teal-600" />
          در حال باز کردن پرونده…
        </span>
      </main>
    );
  }

  if (snapshot === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <HeartPulse className="h-8 w-8 text-slate-300" />
        <h1 className="text-sm font-bold text-slate-700">لینک پذیرش معتبر نیست</h1>
        <p className="max-w-sm text-xs leading-6 text-slate-400">
          این کد QR در داده نمایشی این مرورگر پیدا نشد. کد سلامتجو را بررسی کنید یا داده نمایشی را از پنل مدیریت بازگردانی کنید.
        </p>
        <Link to="/" className="primary-button">
          بازگشت به داشبورد
        </Link>
      </main>
    );
  }

  return <PatientCompanion token={token} initialSnapshot={snapshot} />;
}

export function PatientTokenPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-xs text-slate-400">
          در حال بارگذاری…
        </main>
      }
    >
      <PatientTokenView />
    </Suspense>
  );
}
