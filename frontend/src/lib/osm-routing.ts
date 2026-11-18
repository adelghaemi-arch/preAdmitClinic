/**
 * Browser-side routing helpers built on the OpenStreetMap ecosystem.
 * - Nominatim geocoding: address -> coordinates
 * - OSRM (router.project-osrm.org): coordinates -> real driving distance & duration
 * - OpenStreetMap deep links so the phone opens native maps / OSM app
 */

export interface GeoPoint {
  lat: number;
  lon: number;
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

const R = 6371; // Earth radius in km

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
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

/** Resolves a free-text Persian/English address to coordinates via Nominatim. */
export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const lat = Number(rows[0].lat);
    const lon = Number(rows[0].lon);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
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
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
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
  const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat}%2C${from.lon}%3B${to.lat}%2C${to.lon}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Opens a plain OSM map centred on the clinic. */
export function openOsmMap(point: GeoPoint, zoom = 17): void {
  const url = `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=${zoom}/${point.lat}/${point.lon}`;
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
      tiles.push({ url: `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`, x, y });
    }
  }
  return tiles.slice(0, 9);
}
