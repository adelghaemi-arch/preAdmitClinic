/*
 File: frontend/src/components/ClinicSettingsPanel.tsx
 Description: تنظیمات نام و لوکیشن بیمارستان برای ادمین کلینیک
 Parent Dependencies: LocationPickerPopup, AppInput
 */

import { useState } from "react";
import { MapPin, Save } from "lucide-react";
import { AppInput } from "@/components/AppInput";
import { LocationPickerPopup, type LocationPickResult } from "@/components/LocationPickerPopup";
import type { ClinicLocation, ClinicSnapshot } from "@/types/clinic";

interface Props {
  snapshot: ClinicSnapshot;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  busy?: boolean;
}

export function ClinicSettingsPanel({ snapshot, onAction, busy }: Props) {
  const clinic = snapshot.platform.clinics.find((c) => c.isCurrentTenant) ?? snapshot.platform.clinics[0];
  const loc: ClinicLocation = snapshot.clinicLocation;
  const [name, setName] = useState(clinic?.name ?? "");
  const [city, setCity] = useState(clinic?.city ?? loc.city ?? "");
  const [address, setAddress] = useState(loc.address ?? "");
  const [lat, setLat] = useState(loc.lat);
  const [lon, setLon] = useState(loc.lon);
  const [mapOpen, setMapOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onMapConfirm = (result: LocationPickResult) => {
    setLat(result.lat);
    setLon(result.lon);
    if (result.address.trim()) setAddress(result.address.trim());
    setMapOpen(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await onAction({
        action: "UPDATE_CLINIC_PROFILE",
        name,
        city,
        address,
        latitude: lat,
        longitude: lon,
      });
      setMessage("مشخصات بیمارستان ذخیره شد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره ناموفق بود.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-extrabold text-slate-800">تنظیمات بیمارستان / کلینیک</h2>
        <p className="mt-1 text-[11px] leading-6 text-slate-500">
          نام و موقعیت برای صفحهٔ نقشه راه سلامتجو و مسیریابی نمایش داده می‌شود.
        </p>
      </div>

      <label className="app-label text-[11px]">
        نام بیمارستان
        <AppInput value={name} onChange={(e) => setName(e.target.value)} className="app-input mt-1" placeholder="مثلاً عدل" />
      </label>

      <label className="app-label text-[11px]">
        شهر
        <AppInput value={city} onChange={(e) => setCity(e.target.value)} className="app-input mt-1" />
      </label>

      <label className="app-label text-[11px]">
        آدرس نمایشی
        <AppInput value={address} onChange={(e) => setAddress(e.target.value)} className="app-input mt-1" />
      </label>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600">
        مختصات: {Number.isFinite(lat) ? lat.toFixed(5) : "—"} ، {Number.isFinite(lon) ? lon.toFixed(5) : "—"}
      </div>

      <button type="button" onClick={() => setMapOpen(true)} className="secondary-button w-full justify-center">
        <MapPin className="h-4 w-4" />
        انتخاب موقعیت روی نقشه
      </button>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700">{error}</p>}
      {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800">{message}</p>}

      <button type="button" disabled={busy || saving || !name.trim()} onClick={() => void save()} className="primary-button w-full justify-center">
        <Save className="h-4 w-4" />
        ذخیره
      </button>

      {mapOpen && (
        <LocationPickerPopup
          initial={{ lat, lon, address }}
          onConfirm={onMapConfirm}
          onClose={() => setMapOpen(false)}
        />
      )}
    </section>
  );
}
