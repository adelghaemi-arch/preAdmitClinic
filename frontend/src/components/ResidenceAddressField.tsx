/*
 File: frontend/src/components/ResidenceAddressField.tsx
 Description: فیلد آدرس سکونت دموگرافیک — نقشه/GPS + پلاک/واحد/کد پستی
 Parent Dependencies: LocationPickerPopup, residence-address.ts, AppInput, owner-gps-watch
 */

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { AppInput } from "@/components/AppInput";
import { IranDigitField } from "@/components/IranDigitField";
import { LocationPickerPopup, type LocationPickResult } from "@/components/LocationPickerPopup";
import {
  parseResidenceAddress,
  residenceAddressValidationMessage,
  serializeResidenceAddress,
  type ResidenceAddressValue,
} from "@/lib/residence-address";
import { toFaDigits } from "@/lib/persian";

interface Props {
  value: string;
  onChange: (valueRaw: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
  fallbackCenter?: { lat: number; lon: number } | null;
  /** شروع ردیابی شواهد GPS هنگام باز شدن نقشه (موبایل) */
  onEvidenceGpsStart?: () => void;
}

export function ResidenceAddressField({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  required = false,
  className = "",
  "aria-label": ariaLabel,
  fallbackCenter = null,
  onEvidenceGpsStart,
}: Props) {
  const [openMap, setOpenMap] = useState(false);
  const parsed = useMemo(() => parseResidenceAddress(value), [value]);
  const draft: ResidenceAddressValue = parsed ?? {
    lat: NaN,
    lon: NaN,
    address: "",
    plaque: "",
    unit: "",
    postalCode: "",
  };
  const validation = residenceAddressValidationMessage(value);
  const locked = disabled || readOnly;

  const patch = (partial: Partial<ResidenceAddressValue>) => {
    const next: ResidenceAddressValue = {
      lat: partial.lat ?? draft.lat,
      lon: partial.lon ?? draft.lon,
      address: partial.address ?? draft.address,
      plaque: partial.plaque ?? draft.plaque,
      unit: partial.unit ?? draft.unit,
      postalCode: partial.postalCode ?? draft.postalCode,
    };
    // تا وقتی مختصات/آدرس/پلاک ناقص است JSON ننویس مگر فیلدها خالی شوند
    if (!Number.isFinite(next.lat) || !Number.isFinite(next.lon) || !next.address.trim()) {
      if (!next.plaque.trim() && !next.unit?.trim() && !next.postalCode?.trim() && !next.address.trim()) {
        onChange("");
        return;
      }
      onChange(
        JSON.stringify({
          lat: Number.isFinite(next.lat) ? next.lat : null,
          lon: Number.isFinite(next.lon) ? next.lon : null,
          address: next.address,
          plaque: next.plaque,
          unit: next.unit || undefined,
          postalCode: next.postalCode || undefined,
        })
      );
      return;
    }
    onChange(serializeResidenceAddress(next));
  };

  const onMapConfirm = (result: LocationPickResult) => {
    patch({ lat: result.lat, lon: result.lon, address: result.address });
    setOpenMap(false);
  };

  return (
    <div className={`space-y-2 ${className}`} aria-label={ariaLabel}>
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <p className="text-[11px] font-medium text-slate-700">موقعیت روی نقشه</p>
        {Number.isFinite(draft.lat) && Number.isFinite(draft.lon) && draft.address ? (
          <p className="mt-1 text-[11px] leading-5 text-slate-600">{draft.address}</p>
        ) : (
          <p className="mt-1 text-[11px] leading-5 text-slate-400">هنوز موقعیتی انتخاب نشده است.</p>
        )}
        {Number.isFinite(draft.lat) && Number.isFinite(draft.lon) && (
          <p className="mt-1 text-[10px] text-slate-400">
            مختصات: {toFaDigits(draft.lat.toFixed(5))} ، {toFaDigits(draft.lon.toFixed(5))}
          </p>
        )}
        {!locked && (
          <button
            type="button"
            onClick={() => {
              setOpenMap(true);
              // ردیابی GPS شواهد از لحظهٔ باز شدن نقشه آدرس (فقط موبایل در watcher)
              onEvidenceGpsStart?.();
            }}
            className="secondary-button mt-2 inline-flex items-center gap-1.5"
          >
            <MapPin className="h-3.5 w-3.5" />
            {Number.isFinite(draft.lat) ? "تغییر موقعیت روی نقشه" : "انتخاب موقعیت روی نقشه"}
          </button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="app-label text-[11px] sm:col-span-1">
          پلاک {required ? "*" : ""}
          <AppInput
            value={draft.plaque}
            disabled={locked}
            onChange={(e) => patch({ plaque: e.target.value })}
            className="app-input mt-1 text-xs"
            placeholder="مثلاً ۱۲"
            required={required}
          />
        </label>
        <label className="app-label text-[11px]">
          واحد
          <AppInput
            value={draft.unit ?? ""}
            disabled={locked}
            onChange={(e) => patch({ unit: e.target.value })}
            className="app-input mt-1 text-xs"
            placeholder="اختیاری"
          />
        </label>
        <label className="app-label text-[11px]">
          کد پستی
          <IranDigitField
            kind="postal"
            value={draft.postalCode ?? ""}
            disabled={locked}
            onValueChange={(v) => patch({ postalCode: v })}
            className="app-input mt-1 text-xs"
            placeholder="۱۰ رقم — برای ارسال جواب/آزمایش"
          />
        </label>
      </div>

      <label className="app-label text-[11px]">
        آدرس (قابل ویرایش)
        <AppInput
          value={draft.address}
          disabled={locked}
          onChange={(e) => patch({ address: e.target.value })}
          className="app-input mt-1 text-xs"
          placeholder="پس از انتخاب نقشه از OSM پر می‌شود"
        />
      </label>

      {value.trim() && validation && (
        <p role="alert" className="text-[10px] leading-5 text-amber-800">
          {validation}
        </p>
      )}

      {openMap && !locked && (
        <LocationPickerPopup
          initial={
            Number.isFinite(draft.lat) && Number.isFinite(draft.lon)
              ? { lat: draft.lat, lon: draft.lon, address: draft.address }
              : null
          }
          fallbackCenter={fallbackCenter}
          onConfirm={onMapConfirm}
          onClose={() => setOpenMap(false)}
        />
      )}
    </div>
  );
}
