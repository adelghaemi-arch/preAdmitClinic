/*
 File: frontend/src/components/PatientPhotoCapture.tsx
 Description: عکس پرونده (دوربین/گالری با زوم) + فریم ضدتقلب؛ ensure-stream بدون ریست adjust/preview
 Parent Dependencies: portrait-face.ts, portrait-gallery.ts, PermissionRetryPanel, media-permission.ts
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { PermissionRetryPanel } from "@/components/PermissionRetryPanel";
import {
  classifyMediaError,
  type PermissionErrorKind,
} from "@/lib/media-permission";
import {
  checkLiveFaceInOval,
  OVAL,
  preloadPortraitFaceDetector,
  validatePortraitDataUrl,
} from "@/lib/portrait-face";
import {
  clampGalleryPan,
  clampGalleryZoom,
  composeGalleryPortraitJpeg,
  galleryLayoutPx,
  GALLERY_NUDGE_PX,
  GALLERY_ZOOM_MAX,
  GALLERY_ZOOM_MIN,
  panAfterZoom,
  PORTRAIT_ASPECT,
  PORTRAIT_JPEG_QUALITY,
  PORTRAIT_OUT_H,
  PORTRAIT_OUT_W,
  scaleGalleryPan,
} from "@/lib/portrait-gallery";

type Phase = "live" | "adjust" | "preview";

export interface FraudSessionStart {
  sessionId: string;
  wrapKey: string;
}

export interface FraudCaptureHooks {
  patientId: number;
  userId?: number | null;
  /** Seconds between auto frames while the fraud camera session is open (live + preview). Default 7. */
  intervalSeconds?: number;
  onStartSession: (patientId: number) => Promise<FraudSessionStart | null>;
  onAutoFrame: (payload: {
    sessionId: string;
    wrapKey: string;
    photoDataUrl: string;
    lat?: number;
    lon?: number;
    accuracy?: number;
  }) => void | Promise<void>;
  onEndSession: (sessionId: string) => void | Promise<void>;
}

export interface PatientPhotoCaptureProps {
  patientName?: string;
  busy?: boolean;
  onConfirm: (photoDataUrl: string, meta?: { fraudSessionId?: string | null; lat?: number; lon?: number; accuracy?: number }) => void | Promise<void>;
  fraudWatch?: FraudCaptureHooks | null;
}

const FRAUD_JPEG_QUALITY = 0.6;
const LIVE_FACE_INTERVAL_MS = 320;
const ADJUST_FACE_INTERVAL_MS = 450;

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Center-crop source to 3:4 and export JPEG at 6×8 cm / 150 dpi. */
function frameToJpeg(source: CanvasImageSource, srcW: number, srcH: number, mirror = true, quality = PORTRAIT_JPEG_QUALITY): string {
  if (srcW < 2 || srcH < 2) return "";
  let cropW: number;
  let cropH: number;
  if (srcW / srcH > PORTRAIT_ASPECT) {
    cropH = srcH;
    cropW = srcH * PORTRAIT_ASPECT;
  } else {
    cropW = srcW;
    cropH = srcW / PORTRAIT_ASPECT;
  }
  const sx = Math.max(0, (srcW - cropW) / 2);
  const sy = Math.max(0, (srcH - cropH) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = PORTRAIT_OUT_W;
  canvas.height = PORTRAIT_OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  if (mirror) {
    ctx.translate(PORTRAIT_OUT_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, PORTRAIT_OUT_W, PORTRAIT_OUT_H);
  return canvas.toDataURL("image/jpeg", quality);
}

function readGps(): Promise<{ lat: number; lon: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 0,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 15_000 }
    );
  });
}

export function PatientPhotoCapture({ patientName, busy = false, onConfirm, fraudWatch = null }: PatientPhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const galleryImgRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const wrapKeyRef = useRef<string | null>(null);
  const gpsRef = useRef<{ lat: number; lon: number; accuracy: number } | null>(null);
  const fraudInFlightRef = useRef(false);
  const liveCheckBusyRef = useRef(false);
  const adjustCheckBusyRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
  } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number; startPanX: number; startPanY: number } | null>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });

  const [phase, setPhase] = useState<Phase>("live");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gallerySrc, setGallerySrc] = useState<string | null>(null);
  const [gallerySize, setGallerySize] = useState<{ w: number; h: number } | null>(null);
  const [frameSize, setFrameSize] = useState({ w: 210, h: 280 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  zoomRef.current = zoom;
  panRef.current = { x: panX, y: panY };
  const [cameraError, setCameraError] = useState("");
  const [cameraErrorKind, setCameraErrorKind] = useState<PermissionErrorKind | null>(null);
  const [faceError, setFaceError] = useState("");
  const [faceInOval, setFaceInOval] = useState(false);
  const [starting, setStarting] = useState(true);
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // fraudWatch از ref خوانده می‌شود تا تغییر هویت props استریم/فاز گالری را ریست نکند
  const fraudWatchRef = useRef(fraudWatch);
  fraudWatchRef.current = fraudWatch;

  const endFraudSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    sessionIdRef.current = null;
    wrapKeyRef.current = null;
    const fw = fraudWatchRef.current;
    if (sid && fw) {
      await fw.onEndSession(sid);
    }
  }, []);

  useEffect(() => {
    preloadPortraitFaceDetector();
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const sync = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 2 && r.height > 2) setFrameSize({ w: r.width, h: r.height });
    };
    sync();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [phase, gallerySrc]);

  /** روشن کردن استریم؛ فقط با resetPortraitFlow فاز adjust/preview پاک می‌شود */
  const ensureCamera = useCallback(async (opts?: { resetPortraitFlow?: boolean }) => {
    const resetPortraitFlow = opts?.resetPortraitFlow === true;
    setStarting(true);
    setCameraError("");
    setCameraErrorKind(null);
    if (resetPortraitFlow) {
      setFaceError("");
      setFaceInOval(false);
    }
    stopStream(streamRef.current);
    streamRef.current = null;
    try {
      if (!window.isSecureContext) {
        throw Object.assign(new Error("insecure"), { name: "SecurityError" });
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" });
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      // ریست فقط برای retake / تلاش مجدد — نه برای bootstrap اثر مونت
      if (resetPortraitFlow) {
        setPhase("live");
        setPreviewUrl(null);
        setGallerySrc(null);
        setGallerySize(null);
      }
      // GPS نباید روشن شدن تایمر ضدتقلب را عقب بیندازد
      setStarting(false);

      // نشست ضدتقلب جدا از مجوز دوربین — خطایش نباید پیام بلاک دوربین شود
      const fw = fraudWatchRef.current;
      if (fw) {
        // اگر نشست فعال است دوباره START نزن (مثلاً پس از ensure بدون ریست)
        if (!sessionIdRef.current || !wrapKeyRef.current) {
          const tryStart = async () => {
            const started = await fw.onStartSession(fw.patientId);
            sessionIdRef.current = started?.sessionId ?? null;
            wrapKeyRef.current = started?.wrapKey ?? null;
            return started;
          };
          try {
            let started = await tryStart();
            if (!started?.sessionId) {
              await new Promise((r) => window.setTimeout(r, 400));
              started = await tryStart();
            }
            if (!started?.sessionId) {
              console.warn("[fraud] session start returned null");
            }
          } catch (e) {
            sessionIdRef.current = null;
            wrapKeyRef.current = null;
            console.warn("[fraud] session start failed", e);
          }
        }
        void readGps().then((gps) => {
          if (gps) gpsRef.current = gps;
        });
      }
      return;
    } catch (err) {
      const kind = classifyMediaError(err, "camera");
      setCameraErrorKind(kind);
      setCameraError(
        kind === "denied" || kind === "unknown"
          ? "دسترسی به دوربین داده نشد."
          : kind === "insecure"
            ? "این صفحه برای دسترسی امن به دوربین نیست."
            : kind === "unavailable"
              ? "دوربین پیدا نشد."
              : "دوربین در این مرورگر پشتیبانی نمی‌شود."
      );
    } finally {
      setStarting(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    await ensureCamera({ resetPortraitFlow: true });
  }, [ensureCamera]);

  // فقط یک‌بار روی mount؛ deps ناپایدار والد نباید گالری/preview را صفر کند
  useEffect(() => {
    void ensureCamera({ resetPortraitFlow: false });
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
      void endFraudSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap یک‌بار؛ ensure/end از ref/stable callback
  }, []);

  // فریم ضدتقلب از باز شدن دوربین؛ تأیید پرتره الزامی نیست (live + adjust + preview)
  useEffect(() => {
    if (!fraudWatch || cameraError || starting) return;
    if (phase !== "live" && phase !== "adjust" && phase !== "preview") return;
    const intervalMs = Math.max(2, fraudWatch.intervalSeconds ?? 7) * 1000;
    const tick = async () => {
      if (fraudInFlightRef.current) return;
      const video = videoRef.current;
      const sid = sessionIdRef.current;
      const wrapKey = wrapKeyRef.current;
      if (!video || !sid || !wrapKey || video.videoWidth < 2) return;
      if (!streamRef.current) return;
      const dataUrl = frameToJpeg(video, video.videoWidth, video.videoHeight, true, FRAUD_JPEG_QUALITY);
      if (!dataUrl) return;
      // GPS اختیاری — await نکن تا فریم عقب نیفتد
      const gps = gpsRef.current;
      if (!gps) {
        void readGps().then((g) => {
          if (g) gpsRef.current = g;
        });
      }
      fraudInFlightRef.current = true;
      try {
        await fraudWatch.onAutoFrame({
          sessionId: sid,
          wrapKey,
          photoDataUrl: dataUrl,
          lat: gps?.lat,
          lon: gps?.lon,
          accuracy: gps?.accuracy,
        });
      } catch (e) {
        console.warn("[fraud] auto frame upload failed", e);
      } finally {
        fraudInFlightRef.current = false;
      }
    };
    const id = window.setInterval(() => {
      void tick();
    }, intervalMs);
    const first = window.setTimeout(() => {
      void tick();
    }, 800);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, [fraudWatch, phase, cameraError, starting]);

  // Live face-in-oval guide (throttled).
  useEffect(() => {
    if (phase !== "live" || cameraError || starting || validating) {
      if (phase === "live") setFaceInOval(false);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      if (cancelled || liveCheckBusyRef.current) return;
      const video = videoRef.current;
      if (!video || video.videoWidth < 2 || !streamRef.current) return;
      liveCheckBusyRef.current = true;
      try {
        const check = await checkLiveFaceInOval(video);
        if (!cancelled) setFaceInOval(check.inOval);
      } catch {
        if (!cancelled) setFaceInOval(false);
      } finally {
        liveCheckBusyRef.current = false;
      }
    };
    const id = window.setInterval(() => {
      void tick();
    }, LIVE_FACE_INTERVAL_MS);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [phase, cameraError, starting, validating]);

  // راهنمای چهره هنگام تنظیم گالری — همان گیت بیضی روی خروجی استاندارد
  useEffect(() => {
    if (phase !== "adjust" || !gallerySrc || !gallerySize || validating) {
      if (phase === "adjust") setFaceInOval(false);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      if (cancelled || adjustCheckBusyRef.current) return;
      const img = galleryImgRef.current;
      if (!img || img.naturalWidth < 2) return;
      adjustCheckBusyRef.current = true;
      try {
        const scaled = scaleGalleryPan(panX, panY, frameSize.w, frameSize.h, PORTRAIT_OUT_W, PORTRAIT_OUT_H);
        const dataUrl = composeGalleryPortraitJpeg(img, img.naturalWidth, img.naturalHeight, {
          zoom,
          panX: scaled.panX,
          panY: scaled.panY,
          quality: 0.7,
        });
        if (!dataUrl) {
          if (!cancelled) setFaceInOval(false);
          return;
        }
        const check = await validatePortraitDataUrl(dataUrl);
        if (!cancelled) setFaceInOval(check.inOval);
      } catch {
        if (!cancelled) setFaceInOval(false);
      } finally {
        adjustCheckBusyRef.current = false;
      }
    };
    const id = window.setInterval(() => {
      void tick();
    }, ADJUST_FACE_INTERVAL_MS);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [phase, gallerySrc, gallerySize, zoom, panX, panY, frameSize.w, frameSize.h, validating]);

  const acceptPortrait = async (dataUrl: string): Promise<boolean> => {
    setValidating(true);
    setFaceError("");
    try {
      const check = await validatePortraitDataUrl(dataUrl);
      if (!check.ok) {
        setFaceError(check.message);
        setFaceInOval(false);
        return false;
      }
      setPreviewUrl(dataUrl);
      setPhase("preview");
      setGallerySrc(null);
      setGallerySize(null);
      setFaceError("");
      setFaceInOval(true);
      return true;
    } finally {
      setValidating(false);
    }
  };

  const captureFrame = () => {
    if (validating || busy || confirming) return;
    const video = videoRef.current;
    if (!video || video.videoWidth < 2) return;
    const dataUrl = frameToJpeg(video, video.videoWidth, video.videoHeight, true);
    if (!dataUrl) return;
    void (async () => {
      const ok = await acceptPortrait(dataUrl);
      if (!ok) return;
      // Keep the stream alive for fraudWatch so auto-frames continue until confirm.
      if (!fraudWatch) {
        stopStream(streamRef.current);
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    })();
  };

  const resetGalleryTransform = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const applyZoomKeepingFocus = (nextZoomRaw: number) => {
    if (!gallerySize) {
      setZoom(clampGalleryZoom(nextZoomRaw));
      return;
    }
    const next = panAfterZoom(
      gallerySize.w,
      gallerySize.h,
      frameSize.w,
      frameSize.h,
      zoomRef.current,
      nextZoomRaw,
      panRef.current.x,
      panRef.current.y
    );
    setZoom(next.zoom);
    setPanX(next.panX);
    setPanY(next.panY);
  };

  const nudgePan = (dx: number, dy: number) => {
    if (!gallerySize) return;
    const next = clampGalleryPan(
      gallerySize.w,
      gallerySize.h,
      frameSize.w,
      frameSize.h,
      zoom,
      panX + dx,
      panY + dy
    );
    setPanX(next.panX);
    setPanY(next.panY);
  };

  const retake = () => {
    setPreviewUrl(null);
    setGallerySrc(null);
    setGallerySize(null);
    resetGalleryTransform();
    setPhase("live");
    setFaceError("");
    setFaceInOval(false);
    void startCamera();
  };

  const cancelAdjust = () => {
    setGallerySrc(null);
    setGallerySize(null);
    resetGalleryTransform();
    setFaceError("");
    setFaceInOval(false);
    setPhase("live");
  };

  const applyGalleryAdjust = () => {
    if (validating || busy || confirming || !gallerySize) return;
    const img = galleryImgRef.current;
    if (!img || img.naturalWidth < 2) return;
    // چهره باید داخل بیضی باشد؛ کراپ مرکز خام کافی نیست — pan UI را به ابعاد خروجی می‌بریم
    const scaled = scaleGalleryPan(panX, panY, frameSize.w, frameSize.h, PORTRAIT_OUT_W, PORTRAIT_OUT_H);
    const dataUrl = composeGalleryPortraitJpeg(img, img.naturalWidth, img.naturalHeight, {
      zoom,
      panX: scaled.panX,
      panY: scaled.panY,
    });
    if (!dataUrl) return;
    void (async () => {
      const ok = await acceptPortrait(dataUrl);
      if (!ok) return;
      if (!fraudWatch) {
        stopStream(streamRef.current);
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    })();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/") || validating || busy || confirming) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const img = new Image();
      img.onload = () => {
        setGallerySrc(reader.result as string);
        setGallerySize({ w: img.naturalWidth, h: img.naturalHeight });
        resetGalleryTransform();
        setPreviewUrl(null);
        setFaceError("");
        setFaceInOval(false);
        setPhase("adjust");
        // استریم دوربین برای فریم ضدتقلب هنگام تنظیم گالری قطع نمی‌شود
        if (!fraudWatch) {
          stopStream(streamRef.current);
          streamRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const onAdjustPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "adjust" || !gallerySize || e.button !== 0) return;
    // pinch دو انگشت: درگ تک‌انگشتی را قطع نکن مگر قبلاً capture شده
    if (pinchRef.current) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originPanX: panX,
      originPanY: panY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onAdjustPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !gallerySize) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const next = clampGalleryPan(
      gallerySize.w,
      gallerySize.h,
      frameSize.w,
      frameSize.h,
      zoom,
      drag.originPanX + dx,
      drag.originPanY + dy
    );
    setPanX(next.panX);
    setPanY(next.panY);
  };

  const onAdjustPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }
  };

  const onAdjustTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (phase !== "adjust" || e.touches.length !== 2) {
      if (e.touches.length < 2) pinchRef.current = null;
      return;
    }
    const a = e.touches[0]!;
    const b = e.touches[1]!;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    pinchRef.current = {
      startDist: dist,
      startZoom: zoomRef.current,
      startPanX: panRef.current.x,
      startPanY: panRef.current.y,
    };
    dragRef.current = null;
  };

  const onAdjustTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const pinch = pinchRef.current;
    if (!pinch || e.touches.length !== 2 || !gallerySize) return;
    e.preventDefault();
    const a = e.touches[0]!;
    const b = e.touches[1]!;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinch.startDist < 1) return;
    const nextZoom = clampGalleryZoom(pinch.startZoom * (dist / pinch.startDist));
    const next = panAfterZoom(
      gallerySize.w,
      gallerySize.h,
      frameSize.w,
      frameSize.h,
      pinch.startZoom,
      nextZoom,
      pinch.startPanX,
      pinch.startPanY
    );
    setZoom(next.zoom);
    setPanX(next.panX);
    setPanY(next.panY);
  };

  const onAdjustTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) pinchRef.current = null;
  };

  const confirm = async () => {
    if (!previewUrl || confirming || busy || validating) return;
    setConfirming(true);
    setFaceError("");
    try {
      const check = await validatePortraitDataUrl(previewUrl);
      if (!check.ok) {
        setFaceError(check.message);
        setPreviewUrl(null);
        setPhase("live");
        setFaceInOval(false);
        void startCamera();
        return;
      }
      const gps = gpsRef.current ?? (await readGps());
      await onConfirm(previewUrl, {
        fraudSessionId: sessionIdRef.current,
        lat: gps?.lat,
        lon: gps?.lon,
        accuracy: gps?.accuracy,
      });
      stopStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      await endFraudSession();
    } finally {
      setConfirming(false);
    }
  };

  const showOval = phase === "live" || phase === "adjust";
  const ovalBorderClass =
    faceInOval && (phase === "live" || phase === "adjust") ? "border-emerald-400/90" : "border-white/40";

  const adjustLayout =
    phase === "adjust" && gallerySize
      ? galleryLayoutPx(gallerySize.w, gallerySize.h, frameSize.w, frameSize.h, zoom, panX, panY)
      : null;

  return (
    <div className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-center">
        <p className="text-[10px] font-medium text-teal-700">گام ۱ از پیش‌پذیرش</p>
        <h2 className="mt-1 text-sm font-semibold text-slate-900">عکس پرونده سلامت الکترونیک</h2>
        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
          {patientName ? `${patientName}، ` : ""}
          {phase === "adjust"
            ? "عکس را بکشید یا با دکمه‌ها جابه‌جا کنید؛ قبل یا بعد از زوم می‌توانید بخش دلخواه را داخل کادر بگذارید."
            : "این عکس ۳×۴ بخشی از پرونده سلامت الکترونیک شماست. چهره را داخل کادر قرار دهید، عکس بگیرید و تأیید کنید."}
        </p>
        <p className="mt-1 text-[10px] leading-5 text-slate-400">
          عکس باید متعلق به خود سلامتجو باشد و بدون عینک دودی، کلاه و ماسک گرفته شود.
        </p>
        {/* {fraudWatch && !cameraError && (
          <p className="mt-1 text-[10px] leading-5 text-amber-700">
            {phase === "preview" || phase === "adjust"
              ? `ضدتقلب تا تأیید ادامه دارد؛ هر ${fraudWatch.intervalSeconds ?? 7} ثانیه یک فریم امنیتی ثبت می‌شود.`
              : `تا روشن بودن دوربین، هر ${fraudWatch.intervalSeconds ?? 7} ثانیه یک فریم امنیتی ثبت می‌شود.`}
          </p>
        )} */}
      </div>

      {/* دکمه‌های باریک/کشیده چسبیده به قاب؛ بیرون از overflow تا بریده نشوند */}
      <div className={`relative mx-auto w-full max-w-[210px] ${phase === "adjust" ? "px-2.5 py-2.5" : ""}`}>
        {phase === "adjust" && (
          <>
            <button
              type="button"
              aria-label="جابجایی به بالا"
              disabled={busy || validating}
              onClick={() => nudgePan(0, GALLERY_NUDGE_PX)}
              className="absolute left-1/2 top-0 z-10 inline-flex h-2.5 w-24 -translate-x-1/2 items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-600 shadow-sm disabled:opacity-50"
            >
              <ChevronUp className="h-2.5 w-2.5" />
            </button>
            {/* pan افقی برعکس جابه‌جایی CSS است تا فلش «سمت بیشتر دیده شود» حس شود */}
            <button
              type="button"
              aria-label="جابجایی به چپ"
              disabled={busy || validating}
              onClick={() => nudgePan(GALLERY_NUDGE_PX, 0)}
              className="absolute left-0 top-1/2 z-10 inline-flex h-24 w-2.5 -translate-y-1/2 items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-600 shadow-sm disabled:opacity-50"
            >
              <ChevronLeft className="h-2.5 w-2.5" />
            </button>
            <button
              type="button"
              aria-label="جابجایی به راست"
              disabled={busy || validating}
              onClick={() => nudgePan(-GALLERY_NUDGE_PX, 0)}
              className="absolute right-0 top-1/2 z-10 inline-flex h-24 w-2.5 -translate-y-1/2 items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-600 shadow-sm disabled:opacity-50"
            >
              <ChevronRight className="h-2.5 w-2.5" />
            </button>
            <button
              type="button"
              aria-label="جابجایی به پایین"
              disabled={busy || validating}
              onClick={() => nudgePan(0, -GALLERY_NUDGE_PX)}
              className="absolute bottom-0 left-1/2 z-10 inline-flex h-2.5 w-24 -translate-x-1/2 items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-600 shadow-sm disabled:opacity-50"
            >
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </>
        )}
        <div
          ref={frameRef}
          className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-teal-700/80 bg-slate-900 shadow-sm ${
            phase === "adjust" ? "touch-none cursor-grab active:cursor-grabbing" : ""
          }`}
          onPointerDown={phase === "adjust" ? onAdjustPointerDown : undefined}
          onPointerMove={phase === "adjust" ? onAdjustPointerMove : undefined}
          onPointerUp={phase === "adjust" ? onAdjustPointerUp : undefined}
          onPointerCancel={phase === "adjust" ? onAdjustPointerUp : undefined}
          onTouchStart={phase === "adjust" ? onAdjustTouchStart : undefined}
          onTouchMove={phase === "adjust" ? onAdjustTouchMove : undefined}
          onTouchEnd={phase === "adjust" ? onAdjustTouchEnd : undefined}
        >
          {/* Keep video mounted (possibly hidden) so fraud frames continue after capture/adjust. */}
          {!cameraError && (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              aria-hidden={phase !== "live"}
              className={`h-full w-full scale-x-[-1] object-cover ${
                phase === "live" ? "" : "pointer-events-none absolute inset-0 opacity-0"
              }`}
            />
          )}
          {phase === "adjust" && gallerySrc && adjustLayout && (
            <img
              ref={galleryImgRef}
              src={gallerySrc}
              alt="تنظیم عکس گالری"
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                width: adjustLayout.drawnW,
                height: adjustLayout.drawnH,
                left: adjustLayout.left,
                top: adjustLayout.top,
              }}
            />
          )}
          {phase === "preview" && previewUrl && (
            <img src={previewUrl} alt="پیش‌نمایش عکس پرونده سلامت الکترونیک" className="relative z-[1] h-full w-full object-cover" />
          )}
          {(starting || validating) && (phase === "live" || phase === "adjust") && !(cameraError && phase === "live") && (
            <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-2 bg-slate-900/50 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              {validating && <p className="px-3 text-center text-[10px] leading-4">در حال بررسی چهره…</p>}
            </div>
          )}
          {cameraError && phase === "live" && (
            <div className="absolute inset-0 z-[2] bg-slate-100" aria-hidden />
          )}
          {showOval && !(cameraError && phase === "live") && (
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
              {/* کمی بالاتر از مرکز تا مو و گردن در کادر بیفتد */}
              <div
                className={`rounded-[50%] border shadow-[inset_0_0_0_9999px_rgba(15,40,30,0.12)] transition-colors duration-200 ${ovalBorderClass}`}
                style={{
                  width: `${OVAL.widthRatio * 100}%`,
                  height: `${OVAL.heightRatio * 100}%`,
                  transform: `translateY(${OVAL.translateYRatio * 100}%)`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {cameraError && phase === "live" && cameraErrorKind && (
        <PermissionRetryPanel
          kind="camera"
          errorKind={cameraErrorKind}
          onRetry={() => void startCamera()}
          retryDisabled={starting || busy || validating}
        />
      )}

      {faceError && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] leading-5 text-amber-900" role="alert">
          {faceError}
        </p>
      )}

      {phase === "live" && (
        <div className="flex flex-col gap-2">
          {!cameraError && (
            <button
              type="button"
              disabled={starting || busy || validating}
              onClick={captureFrame}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 py-2.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {validating ? "بررسی چهره…" : "گرفتن عکس"}
            </button>
          )}
          <button
            type="button"
            disabled={busy || validating}
            onClick={() => fileRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 disabled:opacity-50"
          >
            <ImageIcon className="h-4 w-4" />
            انتخاب از گالری
          </button>
          {/* بدون capture تا موبایل/دسکتاپ واقعاً گالری/فایل باز کنند؛ دوربین زنده جداست */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            data-testid="portrait-gallery-input"
            className="hidden"
            onChange={onFile}
          />
        </div>
      )}

      {phase === "adjust" && (
        <div className="flex flex-col gap-3">
          <label className="block space-y-1.5">
            <span className="flex items-center justify-between text-[10px] text-slate-500">
              <span>زوم</span>
              <span>{zoom.toFixed(1)}×</span>
            </span>
            <input
              type="range"
              min={GALLERY_ZOOM_MIN}
              max={GALLERY_ZOOM_MAX}
              step={0.05}
              value={zoom}
              disabled={busy || validating}
              onChange={(e) => applyZoomKeepingFocus(Number(e.target.value))}
              className="w-full accent-teal-700"
            />
          </label>
          <p className="text-center text-[10px] leading-4 text-slate-400">
            بکشید تا جابه‌جا شود (قبل یا بعد از زوم)؛ روی لمس با دو انگشت هم می‌توانید زوم کنید.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy || validating}
              onClick={cancelAdjust}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 disabled:opacity-50"
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={busy || validating || !gallerySrc}
              onClick={applyGalleryAdjust}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {validating ? "بررسی چهره…" : "اعمال و ادامه"}
            </button>
          </div>
        </div>
      )}

      {phase === "preview" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={confirming || busy || validating}
            onClick={retake}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            دوباره بگیر
          </button>
          <button
            type="button"
            disabled={confirming || busy || validating || !previewUrl}
            onClick={() => void confirm()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {confirming || busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            تأیید و ادامه
          </button>
        </div>
      )}
    </div>
  );
}
