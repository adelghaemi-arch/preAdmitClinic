/*
 File: frontend/my/src/lib/focus-next-field.ts
 Description: فوکوس فیلد بعدی در فرم (Enter / کلید Next موبایل)
 Parent Dependencies: none
 */

const FOCUSABLE_SELECTOR = [
  "input.app-input:not([disabled]):not([readonly])",
  "textarea:not([disabled]):not([readonly])",
  "select:not([disabled])",
  "input[data-jalali-datepicker-input]",
].join(",");

function isFocusCandidate(el: HTMLElement): boolean {
  if (el.getAttribute("aria-hidden") === "true" || el.hasAttribute("hidden")) return false;
  // display:none را رد کن؛ getClientRects در jsdom همیشه خالی است و معیار خوبی نیست
  try {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
  } catch {
    /* محیط بدون layout */
  }
  return true;
}

/** لیست کنترل‌های قابل فوکوس به‌ترتیب DOM داخل root. */
export function listFocusableFields(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusCandidate);
}

/**
 * Enter/Next → فوکوس کنترل بعدی در همان ظرف فرم.
 * @returns true اگر فوکوس جابه‌جا شد
 */
export function focusNextFieldFrom(from: EventTarget | null, rootSelector = "[data-preadmit-fields]"): boolean {
  if (!(from instanceof HTMLElement)) return false;
  const root = from.closest(rootSelector);
  if (!root) return false;
  const list = listFocusableFields(root);
  const idx = list.findIndex((el) => el === from || el.contains(from));
  if (idx < 0 || idx >= list.length - 1) return false;
  const next = list[idx + 1];
  next.focus();
  if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) {
    try {
      next.select();
    } catch {
      /* select روی بعضی inputها پشتیبانی نمی‌شود */
    }
  }
  return true;
}

/** هندلر کلید برای input/select؛ textarea فقط با Ctrl/Cmd+Enter. */
export function handleEnterToNextField(e: { key: string; ctrlKey: boolean; metaKey: boolean; preventDefault: () => void; target: EventTarget | null }): boolean {
  if (e.key !== "Enter") return false;
  const t = e.target;
  if (!(t instanceof HTMLElement)) return false;
  if (t.tagName === "TEXTAREA" && !e.ctrlKey && !e.metaKey) return false;
  if (t.tagName === "BUTTON") return false;
  if (focusNextFieldFrom(t)) {
    e.preventDefault();
    return true;
  }
  return false;
}
