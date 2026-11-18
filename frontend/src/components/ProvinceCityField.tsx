import { AppInput } from "@/components/AppInput";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  filterLocationNames,
  formatProvinceCity,
  listCities,
  listProvinces,
  parseProvinceCity,
} from "@/lib/iran-locations";

export interface ProvinceCityFieldProps {
  value: string;
  onChange: (valueRaw: string) => void;
  disabled?: boolean;
  /** Locked prefilled value — khaki chrome, not muted disabled opacity. */
  readOnly?: boolean;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
}

function SearchableCombo({
  label,
  value,
  options,
  disabled,
  readOnly,
  placeholder,
  emptyText,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  readOnly?: boolean;
  placeholder: string;
  emptyText: string;
  onSelect: (next: string) => void;
}) {
  const locked = Boolean(disabled || readOnly);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => filterLocationNames(options, query), [options, query]);

  const pick = (name: string) => {
    onSelect(name);
    setQuery(name);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1 block text-[10px] font-medium text-slate-500">{label}</span>
      <div className="relative">
        <AppInput
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled && !readOnly}
          readOnly={readOnly}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          lang="fa"
          dir="rtl"
          onFocus={() => {
            if (!locked) setOpen(true);
          }}
          onChange={(e) => {
            if (locked) return;
            setQuery(e.target.value);
            setOpen(true);
            if (value && e.target.value !== value) onSelect("");
          }}
          onKeyDown={(e) => {
            if (locked) return;
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length === 1) pick(filtered[0]);
              else if (filtered.includes(query.trim())) pick(query.trim());
            }
          }}
          className={`app-input w-full rounded-xl border border-slate-200 p-2.5 pe-9 text-xs ${
            disabled && !readOnly ? "disabled:bg-slate-50 disabled:text-slate-400" : ""
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={locked}
          aria-label={`باز کردن فهرست ${label}`}
          onClick={() => {
            if (!locked) setOpen((v) => !v);
          }}
          className="absolute inset-y-0 left-0 flex items-center px-2.5 text-slate-400 disabled:opacity-40"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && !locked && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-[11px] text-slate-400">{emptyText}</li>
          ) : (
            filtered.map((name) => (
              <li key={name} role="option" aria-selected={name === value}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-right text-xs hover:bg-teal-50 ${
                    name === value ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-700"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(name)}
                >
                  {name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function ProvinceCityField({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  required = false,
  className = "",
  "aria-label": ariaLabel,
}: ProvinceCityFieldProps) {
  const parsed = useMemo(() => parseProvinceCity(value), [value]);
  const [province, setProvince] = useState(parsed.province);
  const [city, setCity] = useState(parsed.city);

  useEffect(() => {
    const next = parseProvinceCity(value);
    setProvince(next.province);
    setCity(next.city);
  }, [value]);

  const provinces = useMemo(() => listProvinces(), []);
  const cities = useMemo(() => (province ? listCities(province) : []), [province]);

  const emit = (nextProvince: string, nextCity: string) => {
    onChange(formatProvinceCity(nextProvince, nextCity));
  };

  return (
    <div className={`grid gap-2 sm:grid-cols-2 ${className}`} aria-label={ariaLabel} aria-required={required || undefined}>
      <SearchableCombo
        label="استان"
        value={province}
        options={provinces}
        disabled={disabled}
        readOnly={readOnly}
        placeholder="جستجو یا انتخاب استان"
        emptyText="استانی یافت نشد"
        onSelect={(next) => {
          setProvince(next);
          setCity("");
          emit(next, "");
        }}
      />
      <SearchableCombo
        label="شهر"
        value={city}
        options={cities}
        disabled={disabled || !province}
        readOnly={readOnly}
        placeholder={province ? "جستجو یا انتخاب شهر" : "ابتدا استان را انتخاب کنید"}
        emptyText="شهری یافت نشد"
        onSelect={(next) => {
          setCity(next);
          emit(province, next);
        }}
      />
    </div>
  );
}
