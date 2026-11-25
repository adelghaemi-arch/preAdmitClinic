/*
 File: frontend/my/src/components/AppInput.tsx
 Description: ورودی متن با نرمال‌سازی حروف فارسی و نمایش ارقام فارسی (state لاتین)
 Parent Dependencies: lib/persian.ts
 */
import {
  forwardRef,
  useCallback,
  type ChangeEvent,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { normalizePersianInput, toFaDigits } from "@/lib/persian";

type DigitsMode = "fa" | "latin";

function displayValue(value: string | number | readonly string[] | undefined, digits: DigitsMode): string {
  if (value === undefined || value === null) return "";
  const raw = typeof value === "string" || typeof value === "number" ? String(value) : value.join(",");
  return digits === "fa" ? toFaDigits(raw) : raw;
}

/** Placeholder هم باید ارقام فارسی ببیند؛ وگرنه hint لاتین می‌ماند حتی وقتی value فارسی است. */
function displayPlaceholder(placeholder: string | undefined, digits: DigitsMode): string | undefined {
  if (placeholder === undefined) return undefined;
  return digits === "fa" ? toFaDigits(placeholder) : placeholder;
}

function emitNormalized<T extends HTMLInputElement | HTMLTextAreaElement>(
  e: ChangeEvent<T>,
  onChange: ((event: ChangeEvent<T>) => void) | undefined,
) {
  if (!onChange) return;
  const next = normalizePersianInput(e.target.value);
  if (next === e.target.value) {
    onChange(e);
    return;
  }
  onChange({
    ...e,
    target: { ...e.target, value: next },
    currentTarget: { ...e.currentTarget, value: next },
  });
}

/** Ensure locked fields pick up the global khaki readonly style. */
function withReadonlyClass(className: string | undefined, readOnly: boolean | undefined): string | undefined {
  if (!readOnly) return className;
  const base = className ?? "";
  if (/\bapp-input\b/.test(base) || /\bapp-field--readonly\b/.test(base)) return className;
  return `${base} app-field--readonly`.trim();
}

export type AppInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Show Persian digits in the field while keeping Latin digits in `onChange` / parent state. */
  digits?: DigitsMode;
  type?: "text" | "search" | "tel" | "email" | "url" | "password" | "number";
};

/**
 * Text input with automatic Arabic→Persian letters and digit normalization.
 * Parent state should store Latin digits; the field always displays Persian digits by default.
 */
export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(function AppInput(
  { value, defaultValue, onChange, digits = "fa", type = "text", inputMode, className, readOnly, placeholder, ...rest },
  ref,
) {
  const isNumeric = type === "number";
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => emitNormalized(e, onChange),
    [onChange],
  );

  return (
    <input
      {...rest}
      ref={ref}
      type={isNumeric ? "text" : type}
      inputMode={inputMode ?? (isNumeric || type === "tel" ? "numeric" : undefined)}
      readOnly={readOnly}
      placeholder={displayPlaceholder(placeholder, digits)}
      value={value !== undefined ? displayValue(value, digits) : undefined}
      defaultValue={defaultValue !== undefined ? displayValue(defaultValue, digits) : undefined}
      onChange={handleChange}
      className={withReadonlyClass(className, readOnly)}
      lang={rest.lang ?? "fa"}
    />
  );
});

export type AppTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  digits?: DigitsMode;
};

export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(function AppTextarea(
  { value, defaultValue, onChange, digits = "fa", className, readOnly, placeholder, ...rest },
  ref,
) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => emitNormalized(e, onChange),
    [onChange],
  );

  return (
    <textarea
      {...rest}
      ref={ref}
      readOnly={readOnly}
      placeholder={displayPlaceholder(placeholder, digits)}
      value={value !== undefined ? displayValue(value, digits) : undefined}
      defaultValue={defaultValue !== undefined ? displayValue(defaultValue, digits) : undefined}
      onChange={handleChange}
      className={withReadonlyClass(className, readOnly)}
      lang={rest.lang ?? "fa"}
    />
  );
});
