/*
 File: frontend/my/src/components/HoldToConfirmButton.tsx
 Description: دکمه نگه‌داشتن ~۳ثانیه برای تأیید خوداظهاری ایستگاه مسیر
 Parent Dependencies: —
 */

import { useEffect, useRef, useState } from "react";

type Props = {
  label?: string;
  doneLabel?: string;
  disabled?: boolean;
  confirmed?: boolean;
  holdMs?: number;
  onConfirm: () => void | Promise<void>;
  className?: string;
};

export function HoldToConfirmButton({
  label = "نگه دارید تا تأیید شود",
  doneLabel = "انجام شد",
  disabled,
  confirmed,
  holdMs = 3000,
  onConfirm,
  className = "",
}: Props) {
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const raf = useRef<number | null>(null);
  const started = useRef<number | null>(null);
  const armed = useRef(false);

  const clear = () => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
    started.current = null;
    armed.current = false;
    setProgress(0);
  };

  useEffect(() => () => clear(), []);

  const tick = (now: number) => {
    if (started.current == null) return;
    const p = Math.min(1, (now - started.current) / holdMs);
    setProgress(p);
    if (p >= 1) {
      clear();
      void (async () => {
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
        }
      })();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const onDown = () => {
    if (disabled || confirmed || busy) return;
    armed.current = true;
    started.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };

  const onUp = () => {
    if (!armed.current) return;
    clear();
  };

  if (confirmed) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200 ${className}`}
      >
        <span aria-hidden>✓</span>
        {doneLabel}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      className={`relative overflow-hidden rounded-xl bg-teal-700 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50 ${className}`}
    >
      <span
        className="pointer-events-none absolute inset-y-0 right-0 bg-teal-500/50 transition-[width]"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
      <span className="relative z-10">{busy ? "در حال ثبت…" : label}</span>
    </button>
  );
}
