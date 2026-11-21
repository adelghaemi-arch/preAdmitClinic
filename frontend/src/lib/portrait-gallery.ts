/*
 File: frontend/src/lib/portrait-gallery.ts
 Description: کراپ/زوم/جابجایی پیکسلی گالری پرتره ۳×۴ با حفظ کانون هنگام زوم
 Parent Dependencies: —
 */

/** 3:4 ID photo stored at 6×8 cm / 150 dpi. */
export const PORTRAIT_W_CM = 6;
export const PORTRAIT_H_CM = 8;
export const PORTRAIT_DPI = 150;
export const PORTRAIT_OUT_W = Math.round((PORTRAIT_W_CM / 2.54) * PORTRAIT_DPI); // ~354
export const PORTRAIT_OUT_H = Math.round((PORTRAIT_H_CM / 2.54) * PORTRAIT_DPI); // ~472
export const PORTRAIT_ASPECT = PORTRAIT_W_CM / PORTRAIT_H_CM; // 0.75
export const PORTRAIT_JPEG_QUALITY = 0.85;

export const GALLERY_ZOOM_MIN = 1;
export const GALLERY_ZOOM_MAX = 3;
/** جابجایی دکمه‌ای برای کشف‌پذیری (~۱۴px در قاب UI). */
export const GALLERY_NUDGE_PX = 14;

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function clampGalleryZoom(zoom: number): number {
  return clamp(zoom, GALLERY_ZOOM_MIN, GALLERY_ZOOM_MAX);
}

/** مقیاس cover تا قاب ۳×۴ پر شود (بدون letterbox). */
export function coverScale(imgW: number, imgH: number, frameW: number, frameH: number): number {
  if (imgW < 1 || imgH < 1 || frameW < 1 || frameH < 1) return 1;
  return Math.max(frameW / imgW, frameH / imgH);
}

export interface GalleryPanLimits {
  drawnW: number;
  drawnH: number;
  /** حداکثر |panX| تا لبهٔ تصویر از قاب بیرون نزند */
  maxPanX: number;
  maxPanY: number;
}

export interface GalleryLayoutPx extends GalleryPanLimits {
  left: number;
  top: number;
  panX: number;
  panY: number;
  zoom: number;
}

/** حدود pan پیکسلی برای zoom فعلی (مرکز تصویر نسبت به مرکز قاب). */
export function galleryPanLimits(
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number,
  zoom: number
): GalleryPanLimits {
  const z = clampGalleryZoom(zoom);
  const scale = coverScale(imgW, imgH, frameW, frameH) * z;
  const drawnW = imgW * scale;
  const drawnH = imgH * scale;
  return {
    drawnW,
    drawnH,
    maxPanX: Math.max(0, (drawnW - frameW) / 2),
    maxPanY: Math.max(0, (drawnH - frameH) / 2),
  };
}

export function clampGalleryPan(
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number,
  zoom: number,
  panX: number,
  panY: number
): { panX: number; panY: number } {
  const { maxPanX, maxPanY } = galleryPanLimits(imgW, imgH, frameW, frameH, zoom);
  return {
    panX: clamp(panX, -maxPanX, maxPanX),
    panY: clamp(panY, -maxPanY, maxPanY),
  };
}

/**
 * موقعیت تصویر داخل قاب: panX/panY جابجایی مرکز تصویر نسبت به مرکز قاب (پیکسل).
 * zoom=1 یعنی cover.
 */
export function galleryLayoutPx(
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number,
  zoom: number,
  panX: number,
  panY: number
): GalleryLayoutPx {
  const z = clampGalleryZoom(zoom);
  const limits = galleryPanLimits(imgW, imgH, frameW, frameH, z);
  const clamped = clampGalleryPan(imgW, imgH, frameW, frameH, z, panX, panY);
  const left = (frameW - limits.drawnW) / 2 + clamped.panX;
  const top = (frameH - limits.drawnH) / 2 + clamped.panY;
  return {
    ...limits,
    left,
    top,
    panX: clamped.panX,
    panY: clamped.panY,
    zoom: z,
  };
}

/**
 * هنگام تغییر زوم، نقطهٔ تصویر زیر مرکز قاب ثابت می‌ماند؛ سپس clamp.
 * pan به پیکسل قاب در زوم قبلی است؛ با نسبت مقیاس به زوم جدید نگاشت می‌شود.
 */
export function panAfterZoom(
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number,
  prevZoom: number,
  nextZoom: number,
  panX: number,
  panY: number
): { panX: number; panY: number; zoom: number } {
  const prevZ = clampGalleryZoom(prevZoom);
  const nextZ = clampGalleryZoom(nextZoom);
  if (prevZ < 1e-6) {
    return { ...clampGalleryPan(imgW, imgH, frameW, frameH, nextZ, 0, 0), zoom: nextZ };
  }
  // مرکز قاب روی همان نقطهٔ نسبی تصویر بماند: pan با نسبت مقیاس‌ها مقیاس می‌شود
  const ratio = nextZ / prevZ;
  const mappedX = panX * ratio;
  const mappedY = panY * ratio;
  const clamped = clampGalleryPan(imgW, imgH, frameW, frameH, nextZ, mappedX, mappedY);
  return { ...clamped, zoom: nextZ };
}

/** نگاشت pan از مختصات قاب UI به قاب خروجی JPEG (یا برعکس). */
export function scaleGalleryPan(
  panX: number,
  panY: number,
  fromFrameW: number,
  fromFrameH: number,
  toFrameW: number,
  toFrameH: number
): { panX: number; panY: number } {
  if (fromFrameW < 1 || fromFrameH < 1) return { panX: 0, panY: 0 };
  return {
    panX: panX * (toFrameW / fromFrameW),
    panY: panY * (toFrameH / fromFrameH),
  };
}

export interface ComposeGalleryPortraitOptions {
  zoom: number;
  panX: number;
  panY: number;
  quality?: number;
  outW?: number;
  outH?: number;
}

/** خروجی JPEG استاندارد پرتره از عکس گالری با زوم/جابجایی پیکسلی. */
export function composeGalleryPortraitJpeg(
  image: CanvasImageSource,
  imgW: number,
  imgH: number,
  opts: ComposeGalleryPortraitOptions
): string {
  if (imgW < 2 || imgH < 2) return "";
  const outW = opts.outW ?? PORTRAIT_OUT_W;
  const outH = opts.outH ?? PORTRAIT_OUT_H;
  const layout = galleryLayoutPx(imgW, imgH, outW, outH, opts.zoom, opts.panX, opts.panY);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // گالری mirror نمی‌شود — فقط دوربین زنده آینه است
  ctx.drawImage(image, 0, 0, imgW, imgH, layout.left, layout.top, layout.drawnW, layout.drawnH);
  return canvas.toDataURL("image/jpeg", opts.quality ?? PORTRAIT_JPEG_QUALITY);
}
