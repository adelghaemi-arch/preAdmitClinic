/*
 File: frontend/my/src/lib/media-permission.ts
 Description: تشخیص نوع خطای دوربین/GPS و راهنمای رفع بلاک برای دسکتاپ و موبایل
 Parent Dependencies: none
 */

export type PermissionKind = "camera" | "geolocation";

export type PermissionErrorKind =
  | "denied"
  | "unsupported"
  | "insecure"
  | "unavailable"
  | "unknown";

export function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent ?? "");
  }
}

/** تفکیک NotAllowed از نبود سخت‌افزار / بستر ناامن / پشتیبانی‌نشدن */
export function classifyMediaError(err: unknown, kind: PermissionKind): PermissionErrorKind {
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";

  if (kind === "camera" && typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }
  if (kind === "geolocation" && (typeof navigator === "undefined" || !navigator.geolocation)) {
    return "unsupported";
  }

  const name =
    err && typeof err === "object" && "name" in err ? String((err as { name?: string }).name) : "";
  const message =
    err instanceof Error
      ? err.message
      : err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : String(err ?? "");

  if (name === "NotAllowedError" || name === "PermissionDeniedError" || /denied|permission/i.test(message)) {
    return "denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || /not found|no device/i.test(message)) {
    return "unavailable";
  }
  if (name === "NotSupportedError" || message === "unsupported") return "unsupported";
  if (name === "SecurityError" || /secure context|https/i.test(message)) return "insecure";
  return "unknown";
}

export function permissionTitle(kind: PermissionKind, errorKind: PermissionErrorKind): string {
  if (errorKind === "insecure") return "این صفحه برای دسترسی امن نیست";
  if (errorKind === "unsupported") {
    return kind === "camera" ? "دوربین در این مرورگر پشتیبانی نمی‌شود" : "موقعیت مکانی پشتیبانی نمی‌شود";
  }
  if (errorKind === "unavailable") {
    return kind === "camera" ? "دوربین پیدا نشد" : "موقعیت مکانی در دسترس نیست";
  }
  return kind === "camera" ? "دسترسی به دوربین داده نشد" : "دسترسی به موقعیت مکانی داده نشد";
}

export function permissionShortHint(kind: PermissionKind, errorKind: PermissionErrorKind): string {
  if (errorKind === "insecure") {
    return "برای درخواست مجوز باید صفحه روی HTTPS (یا localhost) باز باشد.";
  }
  if (errorKind === "unsupported") {
    return kind === "camera"
      ? "مرورگر فعلی دوربین زنده را پشتیبانی نمی‌کند؛ می‌توانید از گالری عکس انتخاب کنید."
      : "مرورگر فعلی موقعیت مکانی را پشتیبانی نمی‌کند؛ آدرس را دستی یا روی نقشه انتخاب کنید.";
  }
  if (errorKind === "unavailable") {
    return kind === "camera"
      ? "هیچ دوربینی روی دستگاه یافت نشد. از گالری استفاده کنید یا دستگاه دیگری امتحان کنید."
      : "سرویس موقعیت در دسترس نیست. آدرس را دستی یا روی نقشه انتخاب کنید.";
  }
  return kind === "camera"
    ? "اگر قبلاً دسترسی را رد کرده‌اید، پاپاپ سیستم معمولاً دوباره باز نمی‌شود؛ ابتدا مجوز را در تنظیمات سایت فعال کنید و سپس «تلاش مجدد» را بزنید."
    : "اگر قبلاً موقعیت را رد کرده‌اید، ابتدا مجوز Location را در تنظیمات سایت/سیستم روشن کنید و سپس «تلاش مجدد» را بزنید.";
}

export function permissionSteps(kind: PermissionKind, errorKind: PermissionErrorKind, mobile: boolean): string[] {
  if (errorKind === "insecure" || errorKind === "unsupported" || errorKind === "unavailable") {
    return [];
  }
  const label = kind === "camera" ? "Camera / دوربین" : "Location / موقعیت مکانی";
  if (mobile) {
    return [
      `در نوار آدرس یا منوی مرورگر، تنظیمات سایت را باز کنید و ${label} را روی Allow بگذارید.`,
      "در iOS: Settings → Safari (یا مرورگر شما) → Camera/Location را بررسی کنید.",
      "در Android: Settings → Apps → مرورگر → Permissions → Camera/Location را Allow کنید.",
      "بعد از تغییر تنظیمات به همین صفحه برگردید و «تلاش مجدد برای دسترسی» را بزنید.",
    ];
  }
  return [
    "روی آیکون قفل (یا اطلاعات سایت) کنار نوار آدرس کلیک کنید.",
    `مجوز ${label} را روی Allow بگذارید.`,
    "در صورت نیاز صفحه را یک‌بار تازه کنید، سپس «تلاش مجدد برای دسترسی» را بزنید.",
  ];
}
