/*
 File: frontend/src/components/PermissionRetryPanel.tsx
 Description: پنل راهنما + تلاش مجدد وقتی کاربر مجوز دوربین یا GPS را بلاک کرده
 Parent Dependencies: media-permission.ts
 */

import { RefreshCw, ShieldAlert } from "lucide-react";
import {
  classifyMediaError,
  isCoarsePointerDevice,
  permissionShortHint,
  permissionSteps,
  permissionTitle,
  type PermissionErrorKind,
  type PermissionKind,
} from "@/lib/media-permission";

export interface PermissionRetryPanelProps {
  kind: PermissionKind;
  /** خطای خام یا kind از پیش‌طبقه‌بندی‌شده */
  error?: unknown;
  errorKind?: PermissionErrorKind;
  onRetry: () => void;
  retryDisabled?: boolean;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

export function PermissionRetryPanel({
  kind,
  error,
  errorKind: errorKindProp,
  onRetry,
  retryDisabled = false,
  retryLabel = "تلاش مجدد برای دسترسی",
  className = "",
  compact = false,
}: PermissionRetryPanelProps) {
  const errorKind = errorKindProp ?? classifyMediaError(error, kind);
  const mobile = isCoarsePointerDevice();
  const steps = permissionSteps(kind, errorKind, mobile);
  const showRetry = errorKind === "denied" || errorKind === "unknown";

  return (
    <div
      role="alert"
      className={
        className ||
        (compact
          ? "rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-right"
          : "flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-3 text-center")
      }
    >
      <div className={compact ? "flex items-start gap-2" : "contents"}>
        <ShieldAlert className={`h-6 w-6 shrink-0 text-amber-600 ${compact ? "mt-0.5" : ""}`} />
        <div className={compact ? "min-w-0 flex-1 space-y-1.5" : "space-y-1.5"}>
          <p className="text-[12px] font-semibold text-amber-950">{permissionTitle(kind, errorKind)}</p>
          <p className="text-[11px] leading-5 text-slate-600">{permissionShortHint(kind, errorKind)}</p>
          {steps.length > 0 && (
            <ol className="list-decimal space-y-1 pe-1 ps-4 text-start text-[10px] leading-5 text-slate-600">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          {showRetry && (
            <button
              type="button"
              disabled={retryDisabled}
              onClick={onRetry}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-[11px] font-medium text-amber-900 disabled:opacity-50 ${
                compact ? "mt-1" : "mt-2 w-full"
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
