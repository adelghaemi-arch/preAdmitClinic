/**
 * Browser-side routing helpers built on the OpenStreetMap ecosystem.
 * - Nominatim geocoding: address -> coordinates / reverse
 * - OSRM: coordinates -> real driving distance & duration
 * - Optional local stack via PlatformSettings.osmLocal (after admin test)
 * - OpenStreetMap deep links so the phone opens native maps / OSM app
 */

import type { OsmLocalSettings, PlatformSettings } from "@/types/clinic";

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface GeocodeResult extends GeoPoint {
  /** Human-readable address from Nominatim (often Persian when accept-language=fa). */
  displayName: string;
}

export interface RouteInfo {
  /** Straight-line distance in km (always computable) */
  distanceKm: number;
  /** Driving distance in km when OSRM responded */
  drivingKm: number | null;
  /** Driving duration in minutes when OSRM responded */
  drivingMinutes: number | null;
  source: "osrm" | "haversine";
  from: GeoPoint;
  to: GeoPoint;
}

export interface OsmEndpoints {
  nominatimBase: string;
  osrmBase: string;
  /** Leaflet/OSM tile URL template with {z}/{x}/{y} */
  tileUrlTemplate: string;
  usingLocal: boolean;
  local: {
    nominatim: boolean;
    osrm: boolean;
    tile: boolean;
  };
}

export interface OsmLocalProbeResult {
  nominatimOk: boolean;
  osrmOk: boolean;
  tileOk: boolean;
  active: boolean;
  lastError: string | null;
}

const R = 6371; // Earth radius in km

/** Tehran city centre — default map focus when no home/clinic coords exist. */
export const TEHRAN_CENTER: GeoPoint = { lat: 35.6892, lon: 51.389 };

export const DEFAULT_OSM_PUBLIC = {
  nominatimBase: "https://nominatim.openstreetmap.org",
  osrmBase: "https://router.project-osrm.org",
  tileUrlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  webMapBase: "https://www.openstreetmap.org",
} as const;

const NOMINATIM_HEADERS: HeadersInit = {
  Accept: "application/json",
  "Accept-Language": "fa",
};

let runtimeOsmLocal: OsmLocalSettings | null = null;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Strip trailing slashes; require http(s). Returns "" if invalid. */
export function normalizeOsmBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return trimmed;
  } catch {
    return "";
  }
}

/** Sync runtime resolver from platform settings (call on snapshot refresh). */
export function configureOsmFromSettings(settings?: PlatformSettings | null): void {
  runtimeOsmLocal = settings?.osmLocal ? { ...settings.osmLocal } : null;
}

export function getOsmEndpoints(): OsmEndpoints {
  const local = runtimeOsmLocal;
  const base = normalizeOsmBaseUrl(local?.baseUrl ?? "");
  const active = Boolean(local?.active && base);
  return {
    nominatimBase: active && local?.nominatimOk !== false ? base : DEFAULT_OSM_PUBLIC.nominatimBase,
    osrmBase: active && local?.osrmOk ? base : DEFAULT_OSM_PUBLIC.osrmBase,
    tileUrlTemplate:
      active && local?.tileOk ? `${base}/tile/{z}/{x}/{y}.png` : DEFAULT_OSM_PUBLIC.tileUrlTemplate,
    usingLocal: active,
    local: {
      nominatim: Boolean(active && local?.nominatimOk !== false),
      osrm: Boolean(active && local?.osrmOk),
      tile: Boolean(active && local?.tileOk),
    },
  };
}

/** Client-side probe of a local OSM stack at `baseUrl` (Tehran sample). */
export async function probeOsmLocal(baseUrlRaw: string): Promise<OsmLocalProbeResult> {
  const base = normalizeOsmBaseUrl(baseUrlRaw);
  if (!base) {
    return {
      nominatimOk: false,
      osrmOk: false,
      tileOk: false,
      active: false,
      lastError: "Base URL معتبر نیست؛ باید با http یا https شروع شود.",
    };
  }

  let nominatimOk = false;
  let osrmOk = false;
  let tileOk = false;
  const errors: string[] = [];

  try {
    const res = await fetch(`${base}/search?format=json&limit=1&q=${encodeURIComponent("Tehran")}`, {
      headers: NOMINATIM_HEADERS,
    });
    if (!res.ok) {
      errors.push(`Nominatim: HTTP ${res.status}`);
    } else {
      const rows = (await res.json()) as unknown;
      nominatimOk = Array.isArray(rows) && rows.length > 0;
      if (!nominatimOk) errors.push("Nominatim: پاسخ خالی یا نامعتبر");
    }
  } catch (e) {
    errors.push(`Nominatim: ${e instanceof Error ? e.message : "خطای شبکه/CORS"}`);
  }

  try {
    const res = await fetch(
      `${base}/route/v1/driving/51.389,35.689;51.41,35.70?overview=false`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) {
      errors.push(`OSRM: HTTP ${res.status}`);
    } else {
      const data = (await res.json()) as { code?: string };
      osrmOk = data.code === "Ok";
      if (!osrmOk) errors.push("OSRM: code != Ok");
    }
  } catch (e) {
    errors.push(`OSRM: ${e instanceof Error ? e.message : "خطای شبکه/CORS"}`);
  }

  try {
    const res = await fetch(`${base}/tile/12/2629/1607.png`);
    const ct = res.headers.get("content-type") ?? "";
    tileOk = res.ok && ct.startsWith("image/");
    if (!tileOk) errors.push(res.ok ? "تایل: content-type تصویر نیست" : `تایل: HTTP ${res.status}`);
  } catch (e) {
    errors.push(`تایل: ${e instanceof Error ? e.message : "خطای شبکه/CORS"}`);
  }

  const active = nominatimOk;
  return {
    nominatimOk,
    osrmOk,
    tileOk,
    active,
    lastError: active
      ? osrmOk && tileOk
        ? null
        : errors.filter((m) => !m.startsWith("Nominatim")).join(" · ") || null
      : errors.join(" · ") || "تست ناموفق",
  };
}

/** Great-circle distance between two coordinates in kilometres. */
export function haversineKm(from: GeoPoint, to: GeoPoint): number {
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function parseNominatimRow(row: { lat?: string; lon?: string; display_name?: string }): GeocodeResult | null {
  const lat = Number(row.lat);
  const lon = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const displayName = String(row.display_name ?? "").trim();
  return { lat, lon, displayName };
}

/**
 * Resolves a free-text Persian/English address to coordinates via Nominatim.
 * Returns displayName when available so callers can fill the address field.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  try {
    const { nominatimBase } = getOsmEndpoints();
    const url = `${nominatimBase}/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return parseNominatimRow(rows[0]);
  } catch {
    return null;
  }
}

/** Searches Nominatim and returns up to `limit` candidate places for a picker UI. */
export async function searchAddresses(query: string, limit = 5): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const capped = Math.min(Math.max(limit, 1), 8);
  try {
    const { nominatimBase } = getOsmEndpoints();
    const url = `${nominatimBase}/search?format=json&limit=${capped}&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    if (!Array.isArray(rows)) return [];
    return rows.map(parseNominatimRow).filter((r): r is GeocodeResult => r !== null);
  } catch {
    return [];
  }
}

/** Resolves coordinates to a human-readable address via Nominatim reverse geocoding. */
export async function reverseGeocode(point: GeoPoint): Promise<GeocodeResult | null> {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return null;
  try {
    const { nominatimBase } = getOsmEndpoints();
    const url = `${nominatimBase}/reverse?format=json&lat=${encodeURIComponent(String(point.lat))}&lon=${encodeURIComponent(String(point.lon))}&zoom=18&addressdetails=0`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) return null;
    const row = (await res.json()) as { lat?: string; lon?: string; display_name?: string; error?: string };
    if (row.error) return null;
    const parsed = parseNominatimRow(row);
    if (!parsed) return null;
    // Prefer requested coords so the pin stays where the user placed it.
    return { lat: point.lat, lon: point.lon, displayName: parsed.displayName || `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}` };
  } catch {
    return null;
  }
}

/** Computes the real driving route with OSRM; falls back to straight-line distance. */
export async function calculateRoute(from: GeoPoint, to: GeoPoint): Promise<RouteInfo> {
  const fallback: RouteInfo = {
    distanceKm: haversineKm(from, to),
    drivingKm: null,
    drivingMinutes: null,
    source: "haversine",
    from,
    to,
  };
  try {
    const { osrmBase } = getOsmEndpoints();
    const url = `${osrmBase}/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{ distance?: number; duration?: number }>;
    };
    if (data.code !== "Ok" || !data.routes?.length) return fallback;
    const route = data.routes[0];
    const drivingKm = Math.round(((route.distance ?? 0) / 1000) * 10) / 10;
    const drivingMinutes = Math.round((route.duration ?? 0) / 60);
    if (!Number.isFinite(drivingKm) || drivingKm <= 0) return fallback;
    return {
      distanceKm: drivingKm,
      drivingKm,
      drivingMinutes: Number.isFinite(drivingMinutes) && drivingMinutes > 0 ? drivingMinutes : null,
      source: "osrm",
      from,
      to,
    };
  } catch {
    return fallback;
  }
}

export interface TravelModes {
  carMinutes: number | null;
  transitMinutes: number | null;
  walkMinutes: number | null;
  bikeMinutes: number | null;
}

/** Rough multi-modal estimates derived from the OSRM driving duration. */
export function estimateTravelModes(drivingMinutes: number | null, distanceKm: number): TravelModes {
  const car = drivingMinutes;
  // Public transit in Tehran averages ~1.5x driving time (stops + transfers)
  const transit = car !== null ? Math.round(car * 1.5) : Math.round(distanceKm * 3.4);
  // Walking ~4.8 km/h
  const walk = Math.round((distanceKm / 4.8) * 60);
  // Cycling ~15 km/h
  const bike = Math.round((distanceKm / 15) * 60);
  return { carMinutes: car, transitMinutes: transit, walkMinutes: walk, bikeMinutes: bike };
}

/** Opens OSM directions in a new tab — on phones this hands off to the maps app. */
export function openOsmDirections(from: GeoPoint, to: GeoPoint): void {
  const url = `${DEFAULT_OSM_PUBLIC.webMapBase}/directions?engine=fossgis_osrm_car&route=${from.lat}%2C${from.lon}%3B${to.lat}%2C${to.lon}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Opens a plain OSM map centred on the clinic. */
export function openOsmMap(point: GeoPoint, zoom = 17): void {
  const url = `${DEFAULT_OSM_PUBLIC.webMapBase}/?mlat=${point.lat}&mlon=${point.lon}#map=${zoom}/${point.lat}/${point.lon}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Opens Neshan (نشان) driving directions — primary navigator for Iranian mobiles. */
export function openNeshanDirections(from: GeoPoint, to: GeoPoint): void {
  const url = `https://neshan.org/maps/#/routing/car/origin/${from.lat},${from.lon}/destination/${to.lat},${to.lon}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Opens Google Maps driving directions. */
export function openGoogleMapsDirections(from: GeoPoint, to: GeoPoint): void {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&travelmode=driving`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Opens the two hospital navigators (Neshan + Google Maps) together.
 * Distance remains OSM/OSRM-based; these links only hand off to native apps on mobile.
 */
export function openHospitalNavigators(from: GeoPoint, to: GeoPoint): void {
  openNeshanDirections(from, to);
  window.setTimeout(() => openGoogleMapsDirections(from, to), 350);
}

/** Builds a concrete tile URL from the active template. */
export function osmTileUrl(z: number, x: number, y: number): string {
  const { tileUrlTemplate } = getOsmEndpoints();
  return tileUrlTemplate.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}

/** Renders a small static OSM tile strip showing the straight route between two points. */
export function osmTileUrlsForRoute(from: GeoPoint, to: GeoPoint, zoom = 12): Array<{ url: string; x: number; y: number }> {
  const lonToTileX = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
  const latToTileY = (lat: number, z: number) => {
    const rad = toRad(lat);
    return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
  };
  const x0 = lonToTileX(from.lon, zoom);
  const y0 = latToTileY(from.lat, zoom);
  const x1 = lonToTileX(to.lon, zoom);
  const y1 = latToTileY(to.lat, zoom);
  const tiles: Array<{ url: string; x: number; y: number }> = [];
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      tiles.push({ url: osmTileUrl(zoom, x, y), x, y });
    }
  }
  return tiles.slice(0, 9);
}
