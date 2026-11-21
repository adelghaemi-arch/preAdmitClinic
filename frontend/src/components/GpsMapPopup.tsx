import { useEffect } from "react";
import { ExternalLink, MapPinned, X } from "lucide-react";
import { openOsmMap } from "@/lib/osm-routing";
import { formatFaDateTime, toFaDigits } from "@/lib/persian";

export interface GpsMapPoint {
  lat: number;
  lon: number;
  accuracy?: number;
  capturedAt?: string;
  label?: string;
  source?: string;
}

interface Props {
  point: GpsMapPoint;
  onClose: () => void;
}

function osmEmbedUrl(lat: number, lon: number, delta = 0.008): string {
  const left = lon - delta;
  const right = lon + delta;
  const top = lat + delta;
  const bottom = lat - delta;
  const bbox = `${left},${bottom},${right},${top}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
}

function openGoogleMaps(lat: number, lon: number): void {
  const url = `https://www.google.com/maps?q=${lat},${lon}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function GpsMapPopup({ point, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="نقشه موقعیت GPS"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <MapPinned className="h-3.5 w-3.5 text-teal-700" />
              {point.label ?? "موقعیت GPS"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {toFaDigits(point.lat.toFixed(5))} ، {toFaDigits(point.lon.toFixed(5))}
              {typeof point.accuracy === "number" ? ` · دقت ${toFaDigits(Math.round(point.accuracy))} متر` : ""}
              {point.source ? ` · ${point.source}` : ""}
            </p>
            {point.capturedAt && (
              <p className="mt-0.5 text-[10px] text-slate-400">
                ثبت: {formatFaDateTime(point.capturedAt)}
              </p>
            )}
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

        <div className="relative aspect-[4/3] w-full bg-slate-100">
          <iframe
            title="نقشه OpenStreetMap"
            src={osmEmbedUrl(point.lat, point.lon)}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={() => openOsmMap({ lat: point.lat, lon: point.lon })}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2.5 text-[11px] font-medium text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            باز کردن در OSM
          </button>
          <button
            type="button"
            onClick={() => openGoogleMaps(point.lat, point.lon)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-medium text-slate-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            باز کردن در Google Maps
          </button>
        </div>
      </div>
    </div>
  );
}
