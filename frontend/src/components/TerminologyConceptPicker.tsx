import { AppInput } from "@/components/AppInput";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  formatConceptLabel,
  searchTerminology,
  type TerminologyConcept,
} from "@/lib/terminology-lookup";

export interface TerminologyConceptPickerProps {
  onPick: (concept: TerminologyConcept) => void;
  disabled?: boolean;
  className?: string;
}

function codeChips(concept: TerminologyConcept): string[] {
  const chips: string[] = [];
  if (concept.snomed.length) chips.push(`SNOMED ${concept.snomed.slice(0, 2).join(", ")}`);
  if (concept.loinc.length) chips.push(`LOINC ${concept.loinc.slice(0, 2).join(", ")}`);
  if (concept.icd10.length) chips.push(`ICD-10 ${concept.icd10.slice(0, 2).join(", ")}`);
  return chips;
}

export function TerminologyConceptPicker({
  onPick,
  disabled = false,
  className = "",
}: TerminologyConceptPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const results = useMemo(() => searchTerminology(query, 12), [query]);

  const pick = (concept: TerminologyConcept) => {
    onPick(concept);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative md:col-span-4 ${className}`}>
      <span className="mb-1 block text-[10px] font-medium text-slate-500">
        جست‌وجوی مفهوم (UMLS) — با انتخاب، CUI و کدهای مرتبط اضافه می‌شوند
      </span>
      <div className="relative">
        <AppInput
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={query}
          placeholder="نام فارسی / انگلیسی / CUI / SNOMED / LOINC / ICD-10"
          autoComplete="off"
          dir="ltr"
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onChange={(e) => {
            if (disabled) return;
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter") {
              e.preventDefault();
              if (results.length === 1) pick(results[0]);
            }
          }}
          className="w-full rounded-lg border border-slate-200 bg-white p-1.5 pe-8 text-[11px]"
        />
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
          {open ? <ChevronDown className="h-3.5 w-3.5 rotate-180" /> : <Search className="h-3.5 w-3.5" />}
        </span>
      </div>
      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-[11px] text-slate-400">مفهومی یافت نشد</li>
          ) : (
            results.map((concept) => {
              const chips = codeChips(concept);
              return (
                <li key={concept.cui} role="option">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-teal-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(concept)}
                  >
                    <div className="text-[11px] font-medium text-slate-800" dir="rtl">
                      {concept.nameFa}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500" dir="ltr">
                      {formatConceptLabel(concept)}
                    </div>
                    {chips.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1" dir="ltr">
                        {chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
