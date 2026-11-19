import { FaceDetector, FilesetResolver, type Detection } from "@mediapipe/tasks-vision";

/** Matches the oval overlay in PatientPhotoCapture (w 74%, h 68%, shift up 6%). */
export const OVAL = {
  widthRatio: 0.74,
  heightRatio: 0.68,
  /** Negative = shift oval center upward. */
  translateYRatio: -0.06,
} as const;

const MIN_FACE_AREA_RATIO = 0.08;
const MAX_FACE_AREA_RATIO = 0.65;
/** Reject when a second face is at least this fraction of the primary face area. */
const SECOND_FACE_RATIO = 0.7;
const MIN_DETECTION_CONFIDENCE = 0.55;

const WASM_BASE = "/models/wasm";
const MODEL_PATH = "/models/face-detector/blaze_face_short_range.tflite";

export type PortraitFaceReason =
  | "ok"
  | "no_face"
  | "outside_oval"
  | "too_small"
  | "too_large"
  | "multiple_faces"
  | "model_error";

export interface PortraitFaceResult {
  ok: boolean;
  reason: PortraitFaceReason;
  message: string;
  /** True when a face is present and inside the oval (used for live guide color). */
  inOval: boolean;
}

export const PORTRAIT_FACE_MESSAGES: Record<PortraitFaceReason, string> = {
  ok: "",
  no_face: "چهره‌ای در عکس پیدا نشد. چهره را داخل کادر بیضی قرار دهید.",
  outside_oval: "چهره داخل کادر بیضی نیست. کمی جلوتر بیایید و چهره را وسط کادر بگذارید.",
  too_small: "چهره خیلی کوچک است. نزدیک‌تر شوید تا داخل کادر جا بگیرد.",
  too_large: "چهره خیلی بزرگ است. کمی فاصله بگیرید تا کامل داخل کادر باشد.",
  multiple_faces: "بیش از یک چهره در عکس دیده شد. فقط چهره خودتان داخل کادر باشد.",
  model_error: "بررسی چهره ممکن نشد. اتصال را بررسی کنید و دوباره تلاش کنید.",
};

function result(reason: PortraitFaceReason, inOval = false): PortraitFaceResult {
  return {
    ok: reason === "ok",
    reason,
    message: PORTRAIT_FACE_MESSAGES[reason],
    inOval,
  };
}

export interface OvalGeometry {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export function getOvalGeometry(width: number, height: number): OvalGeometry {
  return {
    cx: width / 2,
    cy: height / 2 + OVAL.translateYRatio * height,
    rx: (OVAL.widthRatio * width) / 2,
    ry: (OVAL.heightRatio * height) / 2,
  };
}

function pointInOval(x: number, y: number, oval: OvalGeometry): boolean {
  if (oval.rx < 1 || oval.ry < 1) return false;
  const nx = (x - oval.cx) / oval.rx;
  const ny = (y - oval.cy) / oval.ry;
  return nx * nx + ny * ny <= 1;
}

function faceArea(det: Detection): number {
  const box = det.boundingBox;
  if (!box) return 0;
  return Math.max(0, box.width) * Math.max(0, box.height);
}

function evaluateDetections(detections: Detection[], width: number, height: number): PortraitFaceResult {
  const framed = detections.filter((d) => d.boundingBox && faceArea(d) > 0);
  if (framed.length === 0) return result("no_face");

  const sorted = [...framed].sort((a, b) => faceArea(b) - faceArea(a));
  const primary = sorted[0]!;
  const primaryArea = faceArea(primary);
  const second = sorted[1];
  if (second && faceArea(second) >= primaryArea * SECOND_FACE_RATIO) {
    return result("multiple_faces");
  }

  const frameArea = Math.max(1, width * height);
  const areaRatio = primaryArea / frameArea;
  if (areaRatio < MIN_FACE_AREA_RATIO) return result("too_small");
  if (areaRatio > MAX_FACE_AREA_RATIO) return result("too_large");

  const box = primary.boundingBox!;
  const faceCx = box.originX + box.width / 2;
  const faceCy = box.originY + box.height / 2;
  const oval = getOvalGeometry(width, height);
  const inOval = pointInOval(faceCx, faceCy, oval);
  if (!inOval) return result("outside_oval", false);

  return result("ok", true);
}

let detectorPromise: Promise<FaceDetector> | null = null;

async function getDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const wasm = await FilesetResolver.forVisionTasks(WASM_BASE);
      return FaceDetector.createFromOptions(wasm, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        minDetectionConfidence: MIN_DETECTION_CONFIDENCE,
      });
    })().catch((err) => {
      detectorPromise = null;
      throw err;
    });
  }
  return detectorPromise;
}

/** Warm the model early (e.g. when the photo gate mounts). */
export function preloadPortraitFaceDetector(): void {
  void getDetector().catch(() => undefined);
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = dataUrl;
  });
}

/** Validate a cropped 3×4 portrait data URL against face-in-oval rules. */
export async function validatePortraitDataUrl(dataUrl: string): Promise<PortraitFaceResult> {
  if (!dataUrl.startsWith("data:image/")) return result("model_error");
  try {
    const [detector, img] = await Promise.all([getDetector(), loadImageFromDataUrl(dataUrl)]);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (width < 2 || height < 2) return result("no_face");
    const { detections } = detector.detect(img);
    return evaluateDetections(detections, width, height);
  } catch {
    return result("model_error");
  }
}

/**
 * Live check from a video element (mirrored preview). Samples the current frame
 * into a canvas so IMAGE-mode detector can run without switching runningMode.
 */
export async function checkLiveFaceInOval(video: HTMLVideoElement): Promise<PortraitFaceResult> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw < 2 || vh < 2) return result("no_face");

  // Match frameToJpeg center-crop to 3:4 so oval math aligns with preview.
  const aspect = 0.75;
  let cropW: number;
  let cropH: number;
  if (vw / vh > aspect) {
    cropH = vh;
    cropW = vh * aspect;
  } else {
    cropW = vw;
    cropH = vw / aspect;
  }
  const sx = Math.max(0, (vw - cropW) / 2);
  const sy = Math.max(0, (vh - cropH) / 2);

  const canvas = document.createElement("canvas");
  // Downscale for speed; keep portrait aspect.
  const outW = 180;
  const outH = 240;
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return result("model_error");
  // Video CSS is mirrored; detector should see the same orientation as the user.
  ctx.translate(outW, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, outW, outH);

  try {
    const detector = await getDetector();
    const { detections } = detector.detect(canvas);
    return evaluateDetections(detections, outW, outH);
  } catch {
    return result("model_error");
  }
}
