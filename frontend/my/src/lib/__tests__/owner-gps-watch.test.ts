/*
 File: frontend/my/src/lib/__tests__/owner-gps-watch.test.ts
 Description: تست واحد ردیابی GPS شواهد — نقطهٔ اول با seed روی دسکتاپ؛ watch فقط موبایل؛ آستانه ۱۰۰م
 Parent Dependencies: owner-gps-watch, vitest
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetOwnerGpsWatchForTests,
  beginOwnerEvidenceGps,
  isOwnerGpsInitialRecorded,
  isOwnerGpsWatchRunning,
  startOwnerGpsWatch,
  stopOwnerGpsWatch,
} from "@/lib/owner-gps-watch";

function mockCoarsePointer(matches = true) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("pointer: coarse") ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
}

function mockGeolocation(positions: Array<{ lat: number; lon: number; accuracy?: number }>) {
  let i = 0;
  const getCurrentPosition = vi.fn((success: PositionCallback, error?: PositionErrorCallback) => {
    const next = positions[Math.min(i, positions.length - 1)];
    i += 1;
    if (!next) {
      error?.({ code: 2, message: "unavailable", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
      return;
    }
    success({
      coords: {
        latitude: next.lat,
        longitude: next.lon,
        accuracy: next.accuracy ?? 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition);
  });
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: { getCurrentPosition, watchPosition: vi.fn(), clearWatch: vi.fn() },
  });
  return getCurrentPosition;
}

describe("UC-OWN-10", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockCoarsePointer(true);
    __resetOwnerGpsWatchForTests();
  });

  afterEach(() => {
    stopOwnerGpsWatch();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("نقطهٔ اول را با distance_btn می‌فرستد و watch را روشن می‌کند", async () => {
    mockGeolocation([{ lat: 35.7, lon: 51.4 }]);
    const recorder = vi.fn();
    const ok = await startOwnerGpsWatch(recorder, "p1", { initialSource: "distance_btn" });
    expect(ok).toBe(true);
    expect(isOwnerGpsWatchRunning()).toBe(true);
    expect(recorder).toHaveBeenCalledTimes(1);
    expect(recorder.mock.calls[0][0].source).toBe("distance_btn");
  });

  it("با seed روی موبایل نقطهٔ اول می‌فرستد و watch را روشن می‌کند بدون getCurrentPosition اولیه", async () => {
    const getCurrentPosition = mockGeolocation([{ lat: 35.8, lon: 51.5 }]);
    const recorder = vi.fn();
    const ok = await startOwnerGpsWatch(recorder, "p1", {
      initialSource: "distance_btn",
      seed: { lat: 35.7, lon: 51.4, accuracy: 12 },
    });
    expect(ok).toBe(true);
    expect(isOwnerGpsWatchRunning()).toBe(true);
    expect(recorder).toHaveBeenCalledTimes(1);
    expect(recorder.mock.calls[0][0]).toMatchObject({
      lat: 35.7,
      lon: 51.4,
      accuracy: 12,
      source: "distance_btn",
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("با seed روی دسکتاپ نقطهٔ اول را می‌فرستد ولی watch روشن نمی‌شود", async () => {
    mockCoarsePointer(false);
    mockGeolocation([{ lat: 35.7, lon: 51.4 }]);
    const recorder = vi.fn();
    const ok = await startOwnerGpsWatch(recorder, "p1", {
      initialSource: "distance_btn",
      seed: { lat: 35.71, lon: 51.41, accuracy: 8 },
    });
    expect(ok).toBe(true);
    expect(isOwnerGpsWatchRunning()).toBe(false);
    expect(isOwnerGpsInitialRecorded()).toBe(true);
    expect(recorder).toHaveBeenCalledTimes(1);
    expect(recorder.mock.calls[0][0].source).toBe("distance_btn");
  });

  it("تریگر دوم روی همان ownerKey نقطهٔ اول تکراری نمی‌فرستد", async () => {
    mockGeolocation([
      { lat: 35.7, lon: 51.4 },
      { lat: 35.71, lon: 51.41 },
    ]);
    const first = vi.fn();
    const second = vi.fn();
    await startOwnerGpsWatch(first, "p1", { initialSource: "distance_btn" });
    await startOwnerGpsWatch(second, "p1", { initialSource: "map_open" });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it("پس از ۱۰ دقیقه فقط اگر ≥۱۰۰ متر جابه‌جا شده باشد watch می‌فرستد", async () => {
    // ~۰٫۰۵ درجه ≈ چند کیلومتر؛ برای زیر آستانه از جابه‌جایی خیلی کوچک استفاده می‌کنیم
    mockGeolocation([
      { lat: 35.7, lon: 51.4 },
      { lat: 35.70001, lon: 51.4 }, // کمتر از ۱۰۰ متر
      { lat: 35.7015, lon: 51.4 }, // بیشتر از ۱۰۰ متر
    ]);
    const recorder = vi.fn();
    await startOwnerGpsWatch(recorder, "p1", { initialSource: "map_open" });
    expect(recorder).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(recorder).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(recorder).toHaveBeenCalledTimes(2);
    expect(recorder.mock.calls[1][0].source).toBe("watch");
  });

  it("روی دسکتاپ بدون seed شروع نمی‌شود", async () => {
    mockCoarsePointer(false);
    mockGeolocation([{ lat: 35.7, lon: 51.4 }]);
    const recorder = vi.fn();
    const ok = await startOwnerGpsWatch(recorder, "p1", { initialSource: "distance_btn" });
    expect(ok).toBe(false);
    expect(recorder).not.toHaveBeenCalled();
    expect(isOwnerGpsWatchRunning()).toBe(false);
  });

  it("beginOwnerEvidenceGps وقتی enabled=false هیچ اکشنی نمی‌زند", () => {
    mockGeolocation([{ lat: 35.7, lon: 51.4 }]);
    const onAction = vi.fn();
    beginOwnerEvidenceGps({
      enabled: false,
      patientId: 1,
      initialSource: "distance_btn",
      seed: { lat: 35.7, lon: 51.4 },
      onAction,
    });
    expect(onAction).not.toHaveBeenCalled();
    expect(isOwnerGpsWatchRunning()).toBe(false);
  });

  it("beginOwnerEvidenceGps با seed نقطهٔ اول را با notifyError می‌فرستد", async () => {
    mockCoarsePointer(false);
    mockGeolocation([]);
    const onAction = vi.fn().mockResolvedValue({ ok: true });
    beginOwnerEvidenceGps({
      enabled: true,
      patientId: 1,
      serverPatientId: "guid-1",
      initialSource: "distance_btn",
      seed: { lat: 35.7, lon: 51.4, accuracy: 5 },
      onAction,
    });
    await vi.waitFor(() => expect(onAction).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(isOwnerGpsInitialRecorded()).toBe(true));
    expect(onAction.mock.calls[0][0]).toMatchObject({
      action: "RECORD_USER_GPS",
      source: "distance_btn",
      silent: true,
      notifyError: true,
      lat: 35.7,
      lon: 51.4,
    });
    expect(isOwnerGpsWatchRunning()).toBe(false);
  });
});
