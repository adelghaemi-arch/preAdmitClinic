import React, { useEffect, useMemo, useRef, useState } from "react";
import { DatePicker } from "@jalali-js/react";
import { createCalendar, type CalendarDateFields, type SelectionRules } from "jalali-js";
import { CalendarDays } from "lucide-react";
import {
  formatIsoDay,
  gregorianIsoToJalaliDate,
  isIsoDay,
  parseIsoDay,
  storageValueToIsoDay,
  iranLocalDayOffset,
  jalaliFieldsToGregorianIso,
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
  /** Locked prefilled value — khaki chrome, not muted disabled opacity. */
  readOnly?: boolean;
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
  readOnly = false,
  required = false,
  placeholder = "انتخاب تاریخ",
  className = "",
  id,
  name,
  "aria-label": ariaLabel,
}: PersianDateFieldProps) {
  const locked = disabled || readOnly;
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
    if (min) next.minDate = { year: min.year, month: min.month, day: min.day };
    if (max) next.maxDate = { year: max.year, month: max.month, day: max.day };
    if (disableFridays) next.disabledWeekdays = [5];
    return min || max || disableFridays ? next : undefined;
  }, [minDate, maxDate, disableFridays, variant]);

  const withinBounds = (iso: string): boolean => {
    if (!isIsoDay(iso)) return false;
    if (minDate && isIsoDay(minDate) && iso < minDate) return false;
    if (maxDate && isIsoDay(maxDate) && iso > maxDate) return false;
    return true;
  };

  return (
    <div
      className={`persian-date-field ${readOnly ? "persian-date-field--readonly" : ""} ${disabled && !readOnly ? "persian-date-field--disabled" : ""} ${safeValue ? "persian-date-field--filled" : ""} ${className}`.trim()}
      aria-disabled={locked || undefined}
      aria-readonly={readOnly || undefined}
      aria-required={required || undefined}
      aria-label={ariaLabel}
    >
      <span className="persian-date-field__icon" aria-hidden>
        <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
      </span>
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
        displayFormat={{ style: "short", weekday: false }}
        className="persian-date-field__picker w-full"
        onChange={(next) => {
          if (locked) return;
          const iso = storageValueToIsoDay(next);
          if (!iso || !withinBounds(iso)) return;
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

/** Convenience bounds for birth-date fields (Iran-local Gregorian day strings). Never after today. */
export function birthDateBounds(maxIso = iranLocalDayOffset(0)): { minDate: string; maxDate: string } {
  const iranToday = iranLocalDayOffset(0);
  const jalaliToday = createCalendar({ system: "jalali" }).today();
  const libTodayIso = jalaliFieldsToGregorianIso(jalaliToday);
  // Use the earlier of Iran-civil today and the library calendar today so future days stay blocked.
  const cappedMax = [maxIso, iranToday, libTodayIso].filter(isIsoDay).sort()[0] ?? iranToday;
  const max = parseIsoDay(cappedMax) ?? parseIsoDay(iranToday)!;
  return {
    minDate: formatIsoDay({ year: Math.max(1900, max.year - 120), month: 1, day: 1 }),
    maxDate: cappedMax,
  };
}
