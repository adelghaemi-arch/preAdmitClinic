import React, { useEffect, useMemo, useRef, useState } from "react";
import { DatePicker } from "@jalali-js/react";
import type { CalendarDateFields, SelectionRules } from "jalali-js";
import {
  gregorianIsoToJalaliDate,
  isIsoDay,
  parseIsoDay,
  storageValueToIsoDay,
  iranLocalDayOffset,
} from "@/lib/date-iso";

export interface PersianDateFieldProps {
  value: string;
  onChange: (isoDay: string) => void;
  minDate?: string;
  maxDate?: string;
  disableFridays?: boolean;
  showHolidays?: boolean;
  blockHolidays?: boolean;
  /** Prefer grid: library `rules` / holidays only apply to the grid variant. */
  variant?: "grid" | "dropdown";
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
}

function isoToJalaliFields(iso: string | undefined): CalendarDateFields | undefined {
  if (!iso || !isIsoDay(iso)) return undefined;
  const seed = gregorianIsoToJalaliDate(iso);
  if (!seed) return undefined;
  return { year: seed.year, month: seed.month, day: seed.day };
}

export function PersianDateField({
  value,
  onChange,
  minDate,
  maxDate,
  disableFridays = false,
  showHolidays = true,
  blockHolidays = false,
  variant = "grid",
  disabled = false,
  required = false,
  placeholder = "انتخاب تاریخ",
  className = "",
  id,
  name,
  "aria-label": ariaLabel,
}: PersianDateFieldProps) {
  const safeValue = isIsoDay(value) ? value : "";
  const fromUser = useRef(false);
  const seenValue = useRef<string | null>(null);
  const [seedKey, setSeedKey] = useState(0);

  // Remount only when parent changes value externally (draft hydrate / reset),
  // not after our own onChange — avoids mid-edit remount flicker.
  useEffect(() => {
    if (fromUser.current) {
      fromUser.current = false;
      seenValue.current = safeValue;
      return;
    }
    if (seenValue.current === null) {
      seenValue.current = safeValue;
      return;
    }
    if (seenValue.current !== safeValue) {
      seenValue.current = safeValue;
      setSeedKey((k) => k + 1);
    }
  }, [safeValue]);

  const defaultDate = useMemo(
    () => (safeValue ? gregorianIsoToJalaliDate(safeValue) : null),
    // seedKey pairs with remount so defaultDate is read on the new instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeValue, seedKey]
  );

  const rules = useMemo<SelectionRules | undefined>(() => {
    if (variant !== "grid") return undefined;
    const next: SelectionRules = {};
    const min = isoToJalaliFields(minDate);
    const max = isoToJalaliFields(maxDate);
    if (min) next.minDate = min;
    if (max) next.maxDate = max;
    if (disableFridays) next.disabledWeekdays = [5];
    return min || max || disableFridays ? next : undefined;
  }, [minDate, maxDate, disableFridays, variant]);

  return (
    <div
      className={`persian-date-field ${disabled ? "persian-date-field--disabled" : ""} ${className}`.trim()}
      aria-disabled={disabled || undefined}
      aria-required={required || undefined}
      aria-label={ariaLabel}
    >
      <DatePicker
        key={`pdf-${seedKey}`}
        system="jalali"
        locale="fa"
        valueFormat="gregorian-iso"
        defaultDate={defaultDate}
        variant={variant}
        quickNav
        showHolidays={variant === "grid" ? showHolidays : false}
        blockHolidays={variant === "grid" ? blockHolidays : false}
        holidayRegion="IR"
        rules={rules}
        placeholder={placeholder}
        displayFormat={{ style: "long", weekday: false }}
        className="persian-date-field__picker w-full"
        onChange={(next) => {
          if (disabled) return;
          const iso = storageValueToIsoDay(next);
          fromUser.current = true;
          onChange(iso);
        }}
      />
      {/* Mirror for native form association only — never `required` (clipped → not focusable). */}
      <input
        type="text"
        tabIndex={-1}
        aria-hidden
        id={id}
        name={name}
        value={safeValue}
        readOnly
        className="persian-date-field__mirror"
      />
    </div>
  );
}

/** Convenience bounds for birth-date fields (Iran-local Gregorian day strings). */
export function birthDateBounds(maxIso = iranLocalDayOffset(0)): { minDate: string; maxDate: string } {
  const max = parseIsoDay(maxIso) ?? parseIsoDay(iranLocalDayOffset(0))!;
  return {
    minDate: `${Math.max(1900, max.year - 120)}-01-01`,
    maxDate: maxIso,
  };
}
