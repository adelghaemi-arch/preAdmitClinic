import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, Compass, Loader2, MapPin, Search, X } from "lucide-react";
import { AppInput } from "@/components/AppInput";
import {
  getOsmEndpoints,
  reverseGeocode,
  searchAddresses,
  TEHRAN_CENTER,
  type GeoPoint,
  type GeocodeResult,
} from "@/lib/osm-routing";
import { toFaDigits } from "@/lib/persian";

export interface LocationPickResult {
  lat: number;
  lon: number;
  address: string;
}

interface Props {
  initial?: Partial<LocationPickResult> | null;
  /** Fallback map centre when no initial home coords (e.g. clinic). */
  fallbackCenter?: GeoPoint | null;
  onConfirm: (result: LocationPickResult) => void;
  onClose: () => void;
}

const pinIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:9999px;background:#0f766e;border:3px solid #fff;box-shadow:0 1px 6px rgba(15,23,42,.35)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function resolveCenter(initial?: Partial<LocationPickResult> | null, fallback?: GeoPoint | null): GeoPoint {
  if (typeof initial?.lat === "number" && typeof initial?.lon === "number") {
    return { lat: initial.lat, lon: initial.lon };
  }
  if (fallback && Number.isFinite(fallback.lat) && Number.isFinite(fallback.lon)) {
    return { lat: fallback.lat, lon: fallback.lon };
  }
  return TEHRAN_CENTER;
}

export function LocationPickerPopup({ initial, fallbackCenter, onConfirm, onClose }: Props) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const reverseTimerRef = useRef<number | null>(null);
  const applyPointRef = useRef<(next: GeoPoint, opts?: { address?: string; pan?: boolean }) => void>(() => {});

  const [point, setPoint] = useState<GeoPoint>(() => resolveCenter(initial, fallbackCenter));
  const [address, setAddress] = useState(initial?.address?.trim() || "");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const applyPoint = (next: GeoPoint, opts?: { address?: string; pan?: boolean }) => {
    setPoint(next);
    markerRef.current?.setLatLng([next.lat, next.lon]);
    if (opts?.pan !== false) {
      mapRef.current?.panTo([next.lat, next.lon], { animate: true });
    }
    if (typeof opts?.address === "string") {
      setAddress(opts.address);
      return;
    }
    if (reverseTimerRef.current) window.clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = window.setTimeout(() => {
      void (async () => {
        setBusy(true);
        setError("");
        const result = await reverseGeocode(next);
        setBusy(false);
        if (result?.displayName) {
          setAddress(result.displayName);
        } else {
          setError("آدرس از OSM دریافت نشد؛ می‌توانید متن را دستی وارد کنید.");
        }
      })();
    }, 350);
  };
  applyPointRef.current = applyPoint;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const host = mapHostRef.current;
    if (!host || mapRef.current) return;

    const centre = resolveCenter(initial, fallbackCenter);
    const map = L.map(host, {
      center: [centre.lat, centre.lon],
      zoom: 15,
      zoomControl: true,
      attributionControl: true,
    });
    const { tileUrlTemplate, local } = getOsmEndpoints();
    L.tileLayer(tileUrlTemplate, {
      maxZoom: 19,
      attribution: local.tile
        ? "OSM محلی"
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker([centre.lat, centre.lon], { draggable: true, icon: pinIcon }).addTo(map);
    marker.on("dragend", () => {
      const ll = marker.getLatLng();
      applyPointRef.current({ lat: ll.lat, lon: ll.lng }, { pan: false });
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      applyPointRef.current({ lat: e.latlng.lat, lon: e.latlng.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Invalidate size after modal layout settles.
    const t = window.setTimeout(() => map.invalidateSize(), 80);

    // Seed reverse geocode when opening without a typed address.
    if (!initial?.address?.trim()) {
      void (async () => {
        setBusy(true);
        const result = await reverseGeocode(centre);
        setBusy(false);
        if (result?.displayName) setAddress(result.displayName);
      })();
    }

    return () => {
      window.clearTimeout(t);
      if (reverseTimerRef.current) window.clearTimeout(reverseTimerRef.current);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Mount once for this modal instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setError("");
    const results = await searchAddresses(query, 5);
    setBusy(false);
    setHits(results);
    if (results.length === 0) {
      setError("آدرس پیدا نشد. نام محله یا خیابان را دقیق‌تر وارد کنید.");
      return;
    }
    const first = results[0];
    applyPoint({ lat: first.lat, lon: first.lon }, { address: first.displayName });
    mapRef.current?.setView([first.lat, first.lon], 16);
  };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("مرورگر شما موقعیت مکانی را پشتیبانی نمی‌کند.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        applyPoint(next);
        mapRef.current?.setView([next.lat, next.lon], 17);
      },
      () => {
        setLocating(false);
        setError("دسترسی به موقعیت مکانی داده نشد.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const confirm = () => {
    const trimmed = address.trim();
    if (!trimmed) {
      setError("آدرس را وارد کنید یا نقطه را روی نقشه انتخاب کنید تا از OSM تکمیل شود.");
      return;
    }
    onConfirm({ lat: point.lat, lon: point.lon, address: trimmed });
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="انتخاب موقعیت روی نقشه"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <MapPin className="h-3.5 w-3.5 text-teal-700" />
              انتخاب موقعیت روی نقشه
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              روی نقشه کلیک کنید یا مارکر را جابه‌جا کنید؛ آدرس از OpenStreetMap تکمیل می‌شود.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 border-b border-slate-100 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <AppInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runSearch();
                }
              }}
              placeholder="جستجوی آدرس، محله یا خیابان…"
              className="app-input min-w-48 flex-1 text-xs"
            />
            <button type="button" disabled={busy} onClick={() => void runSearch()} className="primary-button">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              جستجو
            </button>
            <button type="button" disabled={locating} onClick={useMyLocation} className="secondary-button">
              <Compass className="h-3.5 w-3.5" />
              {locating ? "در حال یافتن…" : "موقعیت من"}
            </button>
          </div>
          {hits.length > 1 && (
            <ul className="max-h-28 space-y-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-1.5">
              {hits.map((hit) => (
                <li key={`${hit.lat}-${hit.lon}-${hit.displayName}`}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2.5 py-2 text-right text-[11px] leading-5 text-slate-700 hover:bg-white"
                    onClick={() => {
                      applyPoint({ lat: hit.lat, lon: hit.lon }, { address: hit.displayName });
                      mapRef.current?.setView([hit.lat, hit.lon], 16);
                      setHits([]);
                    }}
                  >
                    {hit.displayName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative h-64 w-full shrink-0 bg-slate-100 sm:h-72">
          <div ref={mapHostRef} className="h-full w-full" />
          {busy && (
            <div className="pointer-events-none absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] text-teal-800 shadow-sm">
              <Loader2 className="h-3 w-3 animate-spin" />
              دریافت آدرس از OSM…
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-100 px-4 py-3">
          <label className="app-label text-[11px]">
            آدرس تکمیل‌شده (قابل ویرایش)
            <AppInput
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="app-input mt-1.5 text-xs"
              placeholder="آدرس از OSM اینجا می‌آید…"
            />
          </label>
          <p className="text-[10px] text-slate-400">
            مختصات: {toFaDigits(point.lat.toFixed(5))} ، {toFaDigits(point.lon.toFixed(5))}
          </p>
          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3">
          <button type="button" onClick={confirm} disabled={busy} className="primary-button flex-1 justify-center">
            <Check className="h-4 w-4" />
            تأیید موقعیت
          </button>
          <button type="button" onClick={onClose} className="secondary-button flex-1 justify-center">
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}
