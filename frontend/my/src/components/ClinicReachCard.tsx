/*
 File: frontend/my/src/components/ClinicReachCard.tsx
 Description: کارت بیمارستان — آمار فاصله در یک ردیف فشرده موبایل؛ GPS برای شواهد
 Parent Dependencies: osm-routing, media-permission, PermissionRetryPanel
 */

import { useMemo, useState } from "react";
import { Loader2, MapPin, Navigation, RefreshCw, Ruler } from "lucide-react";
import { PermissionRetryPanel } from "@/components/PermissionRetryPanel";
import { classifyMediaError, type PermissionErrorKind } from "@/lib/media-permission";
import {
  calculateRoute,
  estimateTravelModes,
  openHospitalNavigators,
  openOsmMap,
  type RouteInfo,
} from "@/lib/osm-routing";
import { toFaDigits } from "@/lib/persian";
import type { ClinicLocation } from "@/types/clinic";

export type EvidenceGpsCoords = { lat: number; lon: number; accuracy: number };

interface Props {
  clinic: ClinicLocation;
  clinicName?: string;
  compact?: boolean;
  /** پس از موفقیت GPS برای فاصله — همان مختصات برای شواهد distance_btn */
  onStartEvidenceGps?: (coords: EvidenceGpsCoords) => void;
}

export function ClinicReachCard({ clinic, clinicName, compact, onStartEvidenceGps }: Props) {
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoDeniedKind, setGeoDeniedKind] = useState<PermissionErrorKind | null>(null);
  const [hint, setHint] = useState("");
  const title = clinicName?.trim() || clinic.address.split("—")[0]?.trim() || "بیمارستان";

  const travel = useMemo(
    () => (route ? estimateTravelModes(route.drivingMinutes, route.distanceKm) : null),
    [route]
  );

  /** فقط موقعیت زنده — بدون fallback منزل تا کاربر مجبور به اجازه GPS باشد */
  const resolveFromGps = async (): Promise<EvidenceGpsCoords | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoDeniedKind("unsupported");
      return null;
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      });
      setGeoDeniedKind(null);
      return {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? 0,
      };
    } catch (err) {
      setGeoDeniedKind(classifyMediaError(err, "geolocation"));
      return null;
    }
  };

  const measureDistance = async () => {
    if (!Number.isFinite(clinic.lat) || !Number.isFinite(clinic.lon)) {
      setHint("لوکیشن بیمارستان هنوز توسط ادمین ثبت نشده است.");
      setRoute(null);
      return;
    }
    setLoading(true);
    setHint("");
    try {
      const from = await resolveFromGps();
      if (!from) {
        setRoute(null);
        setHint("برای دیدن فاصله باید دسترسی موقعیت را اجازه دهید.");
        return;
      }
      // همان مختصات فاصله به شواهد می‌رود تا getCurrentPosition دوم لازم نباشد
      onStartEvidenceGps?.(from);
      const next = await calculateRoute(from, { lat: clinic.lat, lon: clinic.lon });
      setRoute(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className={`overflow-hidden border border-[#cfe2d7] bg-white ${
        compact ? "rounded-2xl" : "rounded-[1.5rem]"
      }`}
    >
      <div className="border-b border-[#e8f0eb] px-4 py-3.5 sm:px-5">
        <p className="text-[10px] font-semibold text-[#3f7b60]">مرکز درمانی شما</p>
        <h3 className="mt-0.5 truncate text-sm font-extrabold text-[#1d3f32] sm:text-base">{title}</h3>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">{clinic.address}</p>
        {clinic.city ? <p className="text-[10px] text-slate-400">{clinic.city}</p> : null}
      </div>

      <div className="space-y-3 px-4 py-3.5 sm:px-5">
        {geoDeniedKind && (
          <PermissionRetryPanel
            kind="geolocation"
            errorKind={geoDeniedKind}
            onRetry={() => void measureDistance()}
            retryDisabled={loading}
            compact
          />
        )}
        {hint && !route ? <p className="text-[11px] text-slate-500">{hint}</p> : null}

        {!route && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void measureDistance()}
            className="primary-button w-full justify-center"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ruler className="h-4 w-4" />}
            فاصله من تا بیمارستان
          </button>
        )}

        {route && (
          <>
            {/* سه آمار همیشه در یک ردیف — روی موبایل فشرده */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-2 text-center sm:rounded-xl sm:p-3">
                <div className="text-[9px] text-teal-700 sm:text-[10px]">
                  <span className="sm:hidden">فاصله</span>
                  <span className="hidden sm:inline">فاصله فعلی</span>
                </div>
                <div className="mt-0.5 text-base font-extrabold text-teal-900 tabular-fa sm:mt-1 sm:text-xl">
                  {toFaDigits(route.distanceKm)}
                </div>
                <div className="text-[9px] text-teal-700 sm:text-[10px]">
                  <span className="sm:hidden">کیلومتر</span>
                  <span className="hidden sm:inline">
                    کیلومتر {route.source === "osrm" ? "(مسیر واقعی)" : "(مستقیم)"}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-2 text-center sm:rounded-xl sm:p-3">
                <div className="text-[9px] text-sky-700 sm:text-[10px]">
                  <span className="sm:hidden">خودرو</span>
                  <span className="hidden sm:inline">با خودرو</span>
                </div>
                <div className="mt-0.5 text-base font-extrabold text-sky-900 tabular-fa sm:mt-1 sm:text-xl">
                  {toFaDigits(travel?.carMinutes ?? 0)}
                </div>
                <div className="text-[9px] text-sky-700 sm:text-[10px]">دقیقه</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-center sm:rounded-xl sm:p-3">
                <div className="text-[9px] text-amber-700 sm:text-[10px]">
                  <span className="sm:hidden">پیاده</span>
                  <span className="hidden sm:inline">پیاده تقریبی</span>
                </div>
                <div className="mt-0.5 text-base font-extrabold text-amber-900 tabular-fa sm:mt-1 sm:text-xl">
                  {toFaDigits(travel?.walkMinutes ?? 0)}
                </div>
                <div className="text-[9px] text-amber-700 sm:text-[10px]">دقیقه</div>
              </div>
            </div>

            {/* نقشه فقط بعد از فاصله، کنار مسیریابی */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => openHospitalNavigators(route.from, route.to)}
                className="primary-button flex-1 justify-center"
              >
                <Navigation className="h-4 w-4" />
                مسیریابی
              </button>
              <button
                type="button"
                onClick={() => openOsmMap({ lat: clinic.lat, lon: clinic.lon })}
                className="secondary-button"
              >
                <MapPin className="h-3.5 w-3.5" />
                نقشه
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void measureDistance()}
                className="secondary-button"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                به‌روز
              </button>
            </div>
          </>
        )}

        {!route && (
          <button type="button" disabled className="secondary-button w-full justify-center opacity-50" aria-disabled>
            <Navigation className="h-4 w-4" />
            مسیریابی (پس از محاسبه فاصله)
          </button>
        )}
      </div>
    </section>
  );
}
