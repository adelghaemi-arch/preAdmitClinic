import { useEffect, useState } from "react";
import { isAppPage, type AppPage } from "@/lib/workspace";
import { ensureClientDb, readSnapshot } from "@/lib/client-db";
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
  const [boot, setBoot] = useState<Bootstrap | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      ensureClientDb();
      const query = new URLSearchParams(window.location.search);
      const rawPatient = Number(query.get("patient"));
      const view = query.get("view");
      const session = await resolveSession();
      const snapshot = await readSnapshot(session.viewer);
      if (cancelled) return;
      setBoot({
        snapshot,
        user: session.user,
        isDemoSession: session.isDemoSession,
        role: session.role,
        page: isAppPage(view) ? view : "dashboard",
        patientId: Number.isSafeInteger(rawPatient) && rawPatient > 0 ? rawPatient : undefined,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!boot) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f9fa]">
        <div className="flex flex-col items-center gap-3 text-xs text-slate-400">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          در حال بارگذاری داده نمایشی کلینیک…
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
