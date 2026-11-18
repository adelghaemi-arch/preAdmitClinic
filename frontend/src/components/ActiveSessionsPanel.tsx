import { Laptop, Loader2, MonitorSmartphone, Smartphone, Trash2 } from "lucide-react";
import { readSessionId } from "@/lib/auth-sessions";
import { toFaDigits } from "@/lib/persian";
import type { AuthSession } from "@/types/clinic";

interface Props {
  sessions: AuthSession[];
  busy?: boolean;
  onRevoke: (sessionId: string) => Promise<void>;
  onRevokeOthers: () => Promise<void>;
}

const SURFACE_FA: Record<AuthSession["appSurface"], string> = {
  clinic_web: "وب کلینیک",
  patient_kiosk: "کیوسک پذیرش",
};

function SessionIcon({ session }: { session: AuthSession }) {
  if (session.appSurface === "patient_kiosk") return <MonitorSmartphone className="h-4 w-4 text-teal-700" />;
  if (/Android|iOS/i.test(session.system)) return <Smartphone className="h-4 w-4 text-teal-700" />;
  return <Laptop className="h-4 w-4 text-teal-700" />;
}

export function ActiveSessionsPanel({ sessions, busy = false, onRevoke, onRevokeOthers }: Props) {
  const currentId = readSessionId();
  const active = sessions
    .filter((s) => !s.revokedAt)
    .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
  const others = active.filter((s) => s.id !== currentId).length;

  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-700">نشست‌های فعال</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">دستگاه‌ها و سیستم‌هایی که با این حساب وارد شده‌اند</p>
        </div>
        {others > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onRevokeOthers()}
            className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            قطع همه به‌جز این دستگاه
          </button>
        )}
      </div>

      {!active.length && (
        <p className="text-[11px] text-slate-400">نشست فعالی ثبت نشده است.</p>
      )}

      <ul className="space-y-2">
        {active.map((session) => {
          const isCurrent = session.id === currentId;
          return (
            <li
              key={session.id}
              className={`flex items-start gap-3 rounded-xl border bg-white px-3 py-2.5 ${
                isCurrent ? "border-teal-200" : "border-slate-100"
              }`}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                <SessionIcon session={session} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-800">{session.deviceLabel}</span>
                  {isCurrent && (
                    <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-medium text-teal-700">این دستگاه</span>
                  )}
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {session.system} · {session.browser} · {SURFACE_FA[session.appSurface]}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  آخرین فعالیت: {toFaDigits(new Date(session.lastSeenAt).toLocaleString("fa-IR"))}
                  {" · "}
                  {session.ipHint}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onRevoke(session.id)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                title="قطع نشست"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                قطع
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
