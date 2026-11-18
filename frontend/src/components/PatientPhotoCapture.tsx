import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";

type Phase = "live" | "preview";

export interface FraudCaptureHooks {
  patientId: number;
  userId?: number | null;
  /** Seconds between auto frames while the fraud camera session is open (live + preview). Default 3. */
  intervalSeconds?: number;
  onStartSession: (patientId: number) => Promise<string | null>;
  onAutoFrame: (payload: {
    sessionId: string;
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

/** 3:4 ID photo stored at 6×8 cm / 150 dpi for readable quality. */
const PHOTO_W_CM = 6;
const PHOTO_H_CM = 8;
const PHOTO_DPI = 150;
const OUT_W = Math.round((PHOTO_W_CM / 2.54) * PHOTO_DPI); // ~354
const OUT_H = Math.round((PHOTO_H_CM / 2.54) * PHOTO_DPI); // ~472
const JPEG_QUALITY = 0.85;
const FRAUD_JPEG_QUALITY = 0.6;
const ASPECT = PHOTO_W_CM / PHOTO_H_CM; // 0.75

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Center-crop source to 3:4 and export JPEG at 6×8 cm / 150 dpi. */
function frameToJpeg(source: CanvasImageSource, srcW: number, srcH: number, mirror = true, quality = JPEG_QUALITY): string {
  if (srcW < 2 || srcH < 2) return "";
  let cropW: number;
  let cropH: number;
  if (srcW / srcH > ASPECT) {
    cropH = srcH;
    cropW = srcH * ASPECT;
  } else {
    cropW = srcW;
    cropH = srcW / ASPECT;
  }
  const sx = Math.max(0, (srcW - cropW) / 2);
  const sy = Math.max(0, (srcH - cropH) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  if (mirror) {
    ctx.translate(OUT_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, OUT_W, OUT_H);
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
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const gpsRef = useRef<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("live");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [starting, setStarting] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const endFraudSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    sessionIdRef.current = null;
    if (sid && fraudWatch) {
      await fraudWatch.onEndSession(sid);
    }
  }, [fraudWatch]);

  const startCamera = useCallback(async () => {
    setStarting(true);
    setCameraError("");
    stopStream(streamRef.current);
    streamRef.current = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("unsupported");
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
      setPhase("live");
      setPreviewUrl(null);

      if (fraudWatch) {
        const sid = await fraudWatch.onStartSession(fraudWatch.patientId);
        sessionIdRef.current = sid;
        gpsRef.current = await readGps();
      }
    } catch {
      setCameraError("دسترسی به دوربین ممکن نشد. می‌توانید از گالری یا دوربین گوشی عکس انتخاب کنید.");
    } finally {
      setStarting(false);
    }
  }, [fraudWatch]);

  useEffect(() => {
    void startCamera();
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
      void endFraudSession();
    };
  }, [startCamera, endFraudSession]);

  // Auto-capture fraud frames every N seconds while the camera session is open
  // (live preview AND after the user takes a photo, until confirm).
  useEffect(() => {
    if (!fraudWatch || cameraError || starting) return;
    if (phase !== "live" && phase !== "preview") return;
    const intervalMs = Math.max(2, fraudWatch.intervalSeconds ?? 3) * 1000;
    const tick = async () => {
      const video = videoRef.current;
      const sid = sessionIdRef.current;
      if (!video || !sid || video.videoWidth < 2) return;
      if (!streamRef.current) return;
      const dataUrl = frameToJpeg(video, video.videoWidth, video.videoHeight, true, FRAUD_JPEG_QUALITY);
      if (!dataUrl) return;
      const gps = gpsRef.current ?? (await readGps());
      if (gps) gpsRef.current = gps;
      await fraudWatch.onAutoFrame({
        sessionId: sid,
        photoDataUrl: dataUrl,
        lat: gps?.lat,
        lon: gps?.lon,
        accuracy: gps?.accuracy,
      });
    };
    const id = window.setInterval(() => {
      void tick();
    }, intervalMs);
    // First frame shortly after camera is ready.
    const first = window.setTimeout(() => {
      void tick();
    }, 800);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, [fraudWatch, phase, cameraError, starting]);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth < 2) return;
    const dataUrl = frameToJpeg(video, video.videoWidth, video.videoHeight, true);
    if (!dataUrl) return;
    setPreviewUrl(dataUrl);
    setPhase("preview");
    // Keep the stream alive for fraudWatch so auto-frames continue until confirm.
    if (!fraudWatch) {
      stopStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  };

  const retake = () => {
    setPreviewUrl(null);
    setPhase("live");
    void startCamera();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const img = new Image();
      img.onload = () => {
        // Gallery photos are not mirrored.
        const dataUrl = frameToJpeg(img, img.naturalWidth, img.naturalHeight, false);
        if (!dataUrl) return;
        // Keep camera stream for fraud frames when fraudWatch is active.
        if (!fraudWatch) {
          stopStream(streamRef.current);
          streamRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
        }
        setPreviewUrl(dataUrl);
        setPhase("preview");
        setCameraError("");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const confirm = async () => {
    if (!previewUrl || confirming || busy) return;
    setConfirming(true);
    try {
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

  return (
    <div className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-center">
        <p className="text-[10px] font-medium text-teal-700">گام ۱ از پیش‌پذیرش</p>
        <h2 className="mt-1 text-sm font-semibold text-slate-900">عکس پرونده سلامت الکترونیک</h2>
        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
          {patientName ? `${patientName}، ` : ""}
          این عکس ۳×۴ بخشی از پرونده سلامت الکترونیک شماست. چهره را داخل کادر قرار دهید، عکس بگیرید و تأیید کنید.
        </p>
        <p className="mt-1 text-[10px] leading-5 text-slate-400">
          عکس باید متعلق به خود سلامتجو باشد و بدون عینک دودی، کلاه و ماسک گرفته شود.
        </p>
        {fraudWatch && !cameraError && (
          <p className="mt-1 text-[10px] leading-5 text-amber-700">
            {phase === "preview"
              ? `ضدتقلب تا تأیید ادامه دارد؛ هر ${fraudWatch.intervalSeconds ?? 3} ثانیه یک فریم امنیتی ثبت می‌شود.`
              : `تا روشن بودن دوربین، هر ${fraudWatch.intervalSeconds ?? 3} ثانیه یک فریم امنیتی ثبت می‌شود.`}
          </p>
        )}
      </div>

      <div className="relative mx-auto aspect-[3/4] w-full max-w-[210px] overflow-hidden rounded-2xl border-2 border-teal-700/80 bg-slate-900 shadow-sm">
        {/* Keep video mounted (possibly hidden) so fraud frames continue after capture. */}
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
        {phase === "preview" && previewUrl && (
          <img src={previewUrl} alt="پیش‌نمایش عکس پرونده سلامت الکترونیک" className="relative z-[1] h-full w-full object-cover" />
        )}
        {starting && phase === "live" && !cameraError && (
          <div className="absolute inset-0 z-[2] flex items-center justify-center bg-slate-900/50 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {cameraError && phase === "live" && (
          <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-2 bg-slate-100 px-4 text-center">
            <ShieldAlert className="h-7 w-7 text-amber-600" />
            <p className="text-[11px] leading-5 text-slate-600">{cameraError}</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
          {/* Slightly above center so hair + neck fit; taller oval, not a circle. */}
          <div className="h-[68%] w-[74%] -translate-y-[6%] rounded-[50%] border border-white/40 shadow-[inset_0_0_0_9999px_rgba(15,40,30,0.12)]" />
        </div>
      </div>

      {phase === "live" ? (
        <div className="flex flex-col gap-2">
          {!cameraError && (
            <button
              type="button"
              disabled={starting || busy}
              onClick={captureFrame}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 py-2.5 text-xs font-medium text-white disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              گرفتن عکس
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700"
          >
            انتخاب از دوربین / گالری
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={onFile}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={confirming || busy}
            onClick={retake}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            دوباره بگیر
          </button>
          <button
            type="button"
            disabled={confirming || busy || !previewUrl}
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
