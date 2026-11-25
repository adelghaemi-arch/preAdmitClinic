/*
 File: frontend/my/src/components/ContractSearchSelect.tsx
 Description: کمبوی قابل‌جستجوی قرارداد با تاریخ شمسی شروع؛ سورت جدیدترین بالا / نمونه پایین؛ badge غیرفعال
 Parent Dependencies: AppInput, persian, date-iso, contract-list-sort, workspace matches
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { AppInput } from "@/components/AppInput";
import { contractStatusBadgeLabel, sortContractsForPicker } from "@/lib/contract-list-sort";
import { gregorianIsoToJalaliDate } from "@/lib/date-iso";
import { toFaDigits } from "@/lib/persian";
import { matchesAllTerms } from "@/lib/workspace";
import type { CorporateContract } from "@/types/clinic";

function contractStartJalali(iso: string | null | undefined): string {
  const day = (iso ?? "").trim().slice(0, 10);
  const j = gregorianIsoToJalaliDate(day);
  if (!j) return "—";
  return toFaDigits(`${j.year}/${String(j.month).padStart(2, "0")}/${String(j.day).padStart(2, "0")}`);
}

function contractSearchHaystack(c: CorporateContract): string {
  const jalali = contractStartJalali(c.startDate);
  const count = c.memberCount ?? c.members.length;
  return [
    c.organizationName,
    c.title,
    c.code,
    jalali,
    `${count} نفر`,
    c.startDate,
  ].join(" ");
}

function contractPrimaryLabel(c: CorporateContract): string {
  return `${c.organizationName} — ${c.title}`;
}

function contractMetaLabel(c: CorporateContract): string {
  const count = toFaDigits(c.memberCount ?? c.members.length);
  const jalali = contractStartJalali(c.startDate);
  return `از ${jalali} · ${count} نفر${c.code ? ` · ${c.code}` : ""}`;
}

interface Props {
  contracts: CorporateContract[];
  value: number;
  onChange: (contractId: number) => void;
  "aria-label"?: string;
}

export function ContractSearchSelect({
  contracts,
  value,
  onChange,
  "aria-label": ariaLabel = "انتخاب قرارداد",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const ordered = useMemo(() => sortContractsForPicker(contracts), [contracts]);
  const selected = ordered.find((c) => c.id === value) ?? ordered[0] ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return ordered;
    return ordered.filter((c) => matchesAllTerms(contractSearchHaystack(c), q));
  }, [ordered, query]);

  const pick = (id: number) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    // وقتی باز است z بالا تا روی تب‌ها/لیست پایین بنشیند؛ والد نباید overflow-hidden داشته باشد
    <div ref={rootRef} className={`relative ${open ? "z-50" : "z-0"}`}>
      {!open ? (
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pr-3 pl-9 text-right transition hover:border-teal-200 hover:bg-white focus:border-teal-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
        >
          <span className="min-w-0 flex-1">
            {selected ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="block min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-800">
                    {contractPrimaryLabel(selected)}
                  </span>
                  {contractStatusBadgeLabel(selected.status) ? (
                    <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 ring-1 ring-amber-200">
                      {contractStatusBadgeLabel(selected.status)}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500">{contractMetaLabel(selected)}</span>
              </>
            ) : (
              <span className="text-[12px] font-semibold text-slate-400">قراردادی انتخاب نشده</span>
            )}
          </span>
          <ChevronDown className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </button>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <AppInput
              autoFocus
              role="combobox"
              aria-label={ariaLabel}
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              value={query}
              placeholder="جستجوی سازمان، عنوان، کد یا تاریخ…"
              autoComplete="off"
              lang="fa"
              dir="rtl"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered.length === 1) pick(filtered[0].id);
                }
              }}
              className="w-full rounded-xl border border-teal-300 bg-white py-2.5 pr-9 pl-9 text-[12px] font-semibold text-slate-800 outline-none ring-2 ring-teal-100"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label="بستن فهرست قراردادها"
              onClick={() => setOpen(false)}
              className="absolute inset-y-0 left-0 flex items-center px-2.5 text-slate-400 hover:text-slate-600"
            >
              <ChevronDown className="h-4 w-4 rotate-180" />
            </button>
          </div>
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-800/10"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-[11px] text-slate-400">قراردادی با این جستجو پیدا نشد.</li>
            ) : (
              filtered.map((c) => {
                const active = c.id === value;
                return (
                  <li key={c.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      className={`w-full px-3 py-2.5 text-right transition hover:bg-teal-50 ${active ? "bg-teal-50/80" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(c.id)}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`block min-w-0 flex-1 truncate text-[12px] ${active ? "font-bold text-teal-900" : "font-semibold text-slate-800"}`}>
                          {contractPrimaryLabel(c)}
                        </span>
                        {contractStatusBadgeLabel(c.status) ? (
                          <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 ring-1 ring-amber-200">
                            {contractStatusBadgeLabel(c.status)}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">{contractMetaLabel(c)}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </>
      )}
    </div>
  );
}
