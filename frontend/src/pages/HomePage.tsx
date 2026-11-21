/*
 File: frontend/src/pages/HomePage.tsx
 Description: bootstrap از API؛ Owner پس از رفرش به خانه مسیر برمی‌گردد
 Parent Dependencies: viewer, api/workspace, ClinicOrchestratorApp
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAppPage, type AppPage } from "@/lib/workspace";
import { loadWorkspaceSnapshot } from "@/lib/api/workspace";
import { resolveSession } from "@/lib/viewer";
import type { AppUserDto, ClinicSnapshot, WorkspaceRole } from "@/types/clinic";
import { ClinicOrchestratorApp } from "@/components/ClinicOrchestratorApp";

interface Bootstrap {
  snapshot: ClinicSnapshot;
  user: AppUserDto;
  isDemoSession: boolean;
  role: WorkspaceRole;
  page: AppPage;
  patientId?: number;
}

export function HomePage() {
  const navigate = useNavigate();
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const query = new URLSearchParams(window.location.search);
      const rawPatient = Number(query.get("patient"));
      const view = query.get("view");
      try {
        const session = await resolveSession();
        if (!session) {
          navigate("/login", { replace: true });
          return;
        }
        const snapshot = await loadWorkspaceSnapshot();
        if (cancelled) return;
        // رفرش وسط پیش‌پذیرش نباید مسیر را پنهان نگه دارد — Owner همیشه خانه را می‌بیند
        const rawPage = isAppPage(view) ? view : "dashboard";
        const ownerReset =
          session.role === "owner" &&
          (rawPage === "companion-intake" || rawPage === "journey-intro");
        setBoot({
          snapshot,
          user: session.user,
          isDemoSession: false,
          role: session.role,
          page: ownerReset ? "dashboard" : rawPage,
          patientId: Number.isSafeInteger(rawPatient) && rawPatient > 0 ? rawPatient : undefined,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "بارگذاری ناموفق بود.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f9fa] p-6">
        <div className="max-w-sm rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-700">
          {error}
          <button type="button" className="mt-3 block w-full text-teal-700" onClick={() => navigate("/login", { replace: true })}>
            بازگشت به ورود
          </button>
        </div>
      </main>
    );
  }

  if (!boot) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f9fa]">
        <div className="flex flex-col items-center gap-3 text-xs text-slate-400">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          در حال اتصال به سرور نفس…
        </div>
      </main>
    );
  }

  return (
    <ClinicOrchestratorApp
      initialSnapshot={boot.snapshot}
      user={boot.user}
      isDemoSession={boot.isDemoSession}
      initialRole={boot.role}
      initialPage={boot.page}
      initialPatientId={boot.patientId}
    />
  );
}
