/*
 File: frontend/my/src/lib/owner-gps-watch.ts
 Description: شواهد GPS — نقطهٔ اول از تریگر صریح روی هر دستگاه؛ watch هر ۱۰ دقیقه فقط موبایل اگر ≥۱۰۰ متر
 Parent Dependencies: media-permission, osm-routing haversine
 */

import { isCoarsePointerDevice } from "@/lib/media-permission";
import { haversineKm } from "@/lib/osm-routing";

const INTERVAL_MS = 10 * 60 * 1000;
const MIN_MOVE_KM = 0.1;

export type GpsWatchInitialSource = "distance_btn" | "map_open";
export type GpsWatchPointSource = GpsWatchInitialSource | "watch";

export type GpsWatchRecorder = (point: {
  lat: number;
  lon: number;
  accuracy: number;
  source: GpsWatchPointSource;
}) => Promise<void> | void;

export type GpsEvidenceSeed = {
  lat: number;
  lon: number;
  accuracy?: number;
};

export type StartOwnerGpsWatchOptions = {
  /** منبع نقطهٔ اول؛ تریگر دوم روی همان پرونده نمونهٔ تکراری نمی‌فرستد */
  initialSource?: GpsWatchInitialSource;
  /** مختصات از قبل گرفته‌شده — بدون getCurrentPosition دوباره */
  seed?: GpsEvidenceSeed;
};

type WatchState = {
  ownerKey: string | null;
  recorder: GpsWatchRecorder | null;
  lastLat: number;
  lastLon: number;
  timer: number | null;
  /** interval ده‌دقیقه‌ای روی موبایل فعال است */
  started: boolean;
  /** نقطهٔ اول شواهد برای این پرونده ثبت شده (حتی بدون watch دسکتاپ) */
  initialRecorded: boolean;
};

const state: WatchState = {
  ownerKey: null,
  recorder: null,
  lastLat: NaN,
  lastLon: NaN,
  timer: null,
  started: false,
  initialRecorded: false,
};

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("geolocation unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30_000,
    });
  });
}

async function sample(source: GpsWatchPointSource) {
  const recorder = state.recorder;
  if (!recorder) return;
  const pos = await readPosition();
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  const accuracy = pos.coords.accuracy ?? 0;
  if (source === "watch" && Number.isFinite(state.lastLat) && Number.isFinite(state.lastLon)) {
    const movedKm = haversineKm({ lat: state.lastLat, lon: state.lastLon }, { lat, lon });
    if (movedKm < MIN_MOVE_KM) return;
  }
  await recorder({ lat, lon, accuracy, source });
  state.lastLat = lat;
  state.lastLon = lon;
}

function ensureWatchTimer() {
  if (state.timer != null) window.clearInterval(state.timer);
  state.started = true;
  state.timer = window.setInterval(() => {
    void sample("watch").catch(() => undefined);
  }, INTERVAL_MS);
}

/**
 * شروع ردیابی دوره‌ای فقط روی موبایل؛ با seed می‌توان نقطهٔ اول را بدون خواندن دوباره GPS ثبت کرد.
 * ownerKey جلوی overwrite اشتباه بین پرونده‌ها را می‌گیرد؛ همان کلید = فقط recorder به‌روز می‌شود.
 */
export async function startOwnerGpsWatch(
  recorder: GpsWatchRecorder,
  ownerKey = "default",
  options?: StartOwnerGpsWatchOptions
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return false;

  const initialSource: GpsWatchInitialSource = options?.initialSource ?? "map_open";
  const seed = options?.seed;

  // تعویض پرونده: interval قبلی را قطع کن تا GPS به بیمار اشتباه نرود
  if ((state.started || state.initialRecorded) && state.ownerKey && state.ownerKey !== ownerKey) {
    stopOwnerGpsWatch();
  }

  // نشست فعال روی همان پرونده: recorder را عوض کن؛ نقطهٔ اول تکراری نفرست
  if (state.initialRecorded && state.ownerKey === ownerKey) {
    state.recorder = recorder;
    // اگر قبلاً فقط نقطهٔ اول روی دسکتاپ بود و الان موبایل شد، watch را روشن کن
    if (isCoarsePointerDevice() && !state.started) {
      ensureWatchTimer();
    }
    return state.started || state.initialRecorded;
  }

  state.recorder = recorder;
  state.ownerKey = ownerKey;

  try {
    if (seed) {
      await recorder({
        lat: seed.lat,
        lon: seed.lon,
        accuracy: seed.accuracy ?? 0,
        source: initialSource,
      });
      state.lastLat = seed.lat;
      state.lastLon = seed.lon;
      state.initialRecorded = true;
    } else if (isCoarsePointerDevice()) {
      await sample(initialSource);
      state.initialRecorded = true;
    } else {
      // دسکتاپ بدون seed: فقط watch خودکار ممنوع؛ نقطهٔ اول هم نداریم
      return false;
    }
  } catch {
    return false;
  }

  // ردیابی دوره‌ای فقط موبایل
  if (isCoarsePointerDevice()) {
    ensureWatchTimer();
    return true;
  }
  return state.initialRecorded;
}

export function stopOwnerGpsWatch() {
  if (state.timer != null) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
  state.started = false;
  state.initialRecorded = false;
  state.recorder = null;
  state.ownerKey = null;
  state.lastLat = NaN;
  state.lastLon = NaN;
}

export function isOwnerGpsWatchRunning() {
  return state.started;
}

export function isOwnerGpsInitialRecorded() {
  return state.initialRecorded;
}

/**
 * شروع شواهد GPS با اکشن استاندارد؛ اگر فلگ خاموش باشد هیچ‌کار نمی‌کند.
 * با seed نقطهٔ اول روی هر دستگاه ارسال می‌شود؛ watch فقط روی موبایل.
 * تریگر دوم روی همان پرونده نقطهٔ اول تکراری نمی‌فرستد.
 */
export function beginOwnerEvidenceGps(args: {
  enabled: boolean;
  patientId: number;
  serverPatientId?: string | null;
  initialSource: GpsWatchInitialSource;
  seed?: GpsEvidenceSeed;
  onAction: (payload: Record<string, unknown>) => Promise<unknown> | unknown;
}): void {
  if (!args.enabled) return;
  const key = String(args.serverPatientId ?? args.patientId);
  void startOwnerGpsWatch(
    async (point) => {
      // silent تا busy قفل نشود؛ notifyError فقط برای نقطهٔ اول تا toast خطا دیده شود
      const isWatchTick = point.source === "watch";
      await args.onAction({
        action: "RECORD_USER_GPS",
        patientId: args.patientId,
        serverPatientId: args.serverPatientId ?? undefined,
        lat: point.lat,
        lon: point.lon,
        accuracy: point.accuracy,
        source: point.source,
        silent: true,
        notifyError: !isWatchTick,
      });
    },
    key,
    {
      initialSource: args.initialSource,
      seed: args.seed,
    }
  );
}

/** فقط برای تست — وضعیت ماژول را پاک می‌کند */
export function __resetOwnerGpsWatchForTests() {
  stopOwnerGpsWatch();
}
