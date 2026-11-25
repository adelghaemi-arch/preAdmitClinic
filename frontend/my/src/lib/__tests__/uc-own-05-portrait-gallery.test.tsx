/*
 File: frontend/src/lib/__tests__/uc-own-05-portrait-gallery.test.tsx
 Description: UC-OWN-05 — گالری بدون capture + pan پیکسلی قبل/بعد زوم
 Parent Dependencies: portrait-gallery, PatientPhotoCapture
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { PatientPhotoCapture, type FraudCaptureHooks } from "@/components/PatientPhotoCapture";
import {
  clampGalleryPan,
  composeGalleryPortraitJpeg,
  coverScale,
  galleryLayoutPx,
  galleryPanLimits,
  panAfterZoom,
  PORTRAIT_ASPECT,
  PORTRAIT_OUT_H,
  PORTRAIT_OUT_W,
} from "@/lib/portrait-gallery";

function stubImageNaturalSize(w = 400, h = 300) {
  class StubImage {
    onload: ((this: StubImage, ev: Event) => void) | null = null;
    naturalWidth = w;
    naturalHeight = h;
    set src(_v: string) {
      queueMicrotask(() => {
        this.onload?.call(this, new Event("load"));
      });
    }
  }
  vi.stubGlobal("Image", StubImage);
}

function makeFraudWatch(): FraudCaptureHooks {
  return {
    patientId: 1,
    intervalSeconds: 7,
    onStartSession: async () => ({ sessionId: "s1", wrapKey: "k1" }),
    onAutoFrame: () => undefined,
    onEndSession: async () => undefined,
  };
}

describe("UC-OWN-05", () => {
  beforeEach(() => {
    vi.stubGlobal("isSecureContext", false);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("input گالری accept=image/* دارد و capture ندارد", () => {
    render(<PatientPhotoCapture onConfirm={() => undefined} />);
    const input = document.querySelector('[data-testid="portrait-gallery-input"]') as HTMLInputElement | null;
    expect(input).toBeTruthy();
    expect(input!.accept).toBe("image/*");
    expect(input!.hasAttribute("capture")).toBe(false);
    expect(input!.getAttribute("capture")).toBeNull();
  });

  it("تغییر identityی fraudWatch فاز adjust گالری را ریست نمی‌کند", async () => {
    stubImageNaturalSize();
    const fraud1 = makeFraudWatch();
    const { rerender } = render(
      <PatientPhotoCapture onConfirm={() => undefined} fraudWatch={fraud1} />
    );

    const input = document.querySelector('[data-testid="portrait-gallery-input"]') as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], "face.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("اعمال و ادامه")).toBeTruthy();
    });

    rerender(<PatientPhotoCapture onConfirm={() => undefined} fraudWatch={makeFraudWatch()} />);
    expect(screen.getByText("اعمال و ادامه")).toBeTruthy();
    expect(screen.queryByText("انتخاب از گالری")).toBeNull();
  });

  it("coverScale قاب ۳×۴ را بدون letterbox پر می‌کند", () => {
    const s = coverScale(800, 600, PORTRAIT_OUT_W, PORTRAIT_OUT_H);
    expect(s * 600).toBeGreaterThanOrEqual(PORTRAIT_OUT_H - 0.5);
    expect(s * 800).toBeGreaterThanOrEqual(PORTRAIT_OUT_W - 0.5);
  });

  it("در zoom=1 وقتی overflow افقی هست pan جابجا می‌کند", () => {
    const limits = galleryPanLimits(800, 600, 210, 280, 1);
    expect(limits.maxPanX).toBeGreaterThan(0);
    const centered = galleryLayoutPx(800, 600, 210, 280, 1, 0, 0);
    const shifted = galleryLayoutPx(800, 600, 210, 280, 1, limits.maxPanX, 0);
    expect(shifted.left).toBeGreaterThan(centered.left);
    expect(shifted.panX).toBeCloseTo(limits.maxPanX, 5);
  });

  it("بعد از زوم محدوده pan بزرگ‌تر می‌شود", () => {
    const at1 = galleryPanLimits(800, 600, 210, 280, 1);
    const at2 = galleryPanLimits(800, 600, 210, 280, 2);
    expect(at2.maxPanX).toBeGreaterThan(at1.maxPanX);
    expect(at2.maxPanY).toBeGreaterThanOrEqual(at1.maxPanY);
  });

  it("panAfterZoom نقطهٔ کانونی مرکز قاب را حفظ می‌کند و clamp می‌کند", () => {
    const prevZoom = 1;
    const nextZoom = 2;
    const panX = 40;
    const panY = 0;
    const next = panAfterZoom(800, 600, 210, 280, prevZoom, nextZoom, panX, panY);
    expect(next.zoom).toBe(2);
    expect(next.panX).toBeCloseTo(80, 5);
    const clamped = clampGalleryPan(800, 600, 210, 280, 2, 9999, 9999);
    expect(Math.abs(clamped.panX)).toBeLessThanOrEqual(galleryPanLimits(800, 600, 210, 280, 2).maxPanX + 1e-6);
    expect(Math.abs(clamped.panY)).toBeLessThanOrEqual(galleryPanLimits(800, 600, 210, 280, 2).maxPanY + 1e-6);
  });

  it("composeGalleryPortraitJpeg با pan پیکسلی خروجی متفاوت می‌دهد", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#112233";
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 40, 40);

    const limits = galleryPanLimits(400, 300, PORTRAIT_OUT_W, PORTRAIT_OUT_H, 1);
    const a = composeGalleryPortraitJpeg(canvas, 400, 300, { zoom: 1, panX: 0, panY: 0, quality: 1 });
    const b = composeGalleryPortraitJpeg(canvas, 400, 300, {
      zoom: 1,
      panX: limits.maxPanX || 20,
      panY: 0,
      quality: 1,
    });
    expect(a.startsWith("data:image/jpeg")).toBe(true);
    expect(b.startsWith("data:image/jpeg")).toBe(true);
    if (limits.maxPanX > 0) expect(a).not.toBe(b);
    expect(PORTRAIT_OUT_W / PORTRAIT_OUT_H).toBeCloseTo(PORTRAIT_ASPECT, 5);
  });
});
