/*
 File: frontend/my/src/components/PatientDirectoryDialog.tsx
 Description: جستجو و فهرست سلامتجویان با نمایش ارقام فارسی برای کدملی/موبایل
 Parent Dependencies: lib/persian.ts, lib/workspace.ts, lib/client-db.ts
 */
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AppInput, AppTextarea } from "@/components/AppInput";
import { CheckCircle2, ClipboardList, Clock3, Filter, History, MapPin, Pill, RotateCcw, Search, ShieldAlert, X } from "lucide-react";
import type { ClinicSnapshot } from "@/types/clinic";
import { normalizeNationalId, patientStatus } from "@/lib/workspace";
import { toFaDigits } from "@/lib/persian";
import { dispatchClinicAction } from "@/lib/client-db";

export interface DirectoryResult {
  nationalId: string;
  patient: { id: number; fullName: string; nationalId: string; age: number; gender: string; phone: string; pathwayTitle: string; allergies: { substance: string }[]; medications: { name: string }[]; intakeCompleted: boolean };
  currentStationName: string | null;
  currentStationStatus: string | null;
  hasActiveVisit: boolean;
  activeVisitId: number | null;
  visitCount: number;
  lastVisitAt: string;
}

const STATUS_OPTIONS = [
  { value: "any", label: "همه وضعیت‌ها" },
  { value: "active", label: "مراجعه فعال در کلینیک" },
  { value: "completed", label: "مراجعه تکمیل‌شده" },
  { value: "intake_pending", label: "پرسشنامه تکمیل‌نشده" },
  { value: "allergy", label: "دارای حساسیت ثبت‌شده" },
];

const CURRENT_STATUS_LABELS: Record<string, string> = {
  waiting: "در صف انتظار",
  checked_in: "حاضر پشت درب",
  in_progress: "داخل اتاق",
  sample_taken: "نمونه‌گیری شده",
};

interface Props {
  open: boolean;
  snapshot: ClinicSnapshot;
  onClose: () => void;
  onSelect: (result: DirectoryResult) => void;
  onOpenRecord?: (patientId: number) => void;
}

export function PatientDirectoryDialog({ open, snapshot: liveSnapshot, onClose, onSelect, onOpenRecord }: Props) {
  // Freeze the data source while the dialog is open so live clinic polling cannot
  // re-render the results table mid-click.
  const [snapshot, setSnapshot] = useState(liveSnapshot);
  useEffect(() => { if (open) setSnapshot(liveSnapshot); }, [open, liveSnapshot]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("any");
  const [roomFilter, setRoomFilter] = useState("any");
  const [results, setResults] = useState<DirectoryResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, onClose]);

  const runSearch = async (nextQuery = query, nextStatus = statusFilter, nextRoom = roomFilter) => {
    const trimmed = nextQuery.trim();
    if (!trimmed && nextStatus === "any" && nextRoom === "any") return;
    setBusy(true); setError("");
    try {
      const data = await dispatchClinicAction({
        action: "SEARCH_PATIENT_DIRECTORY",
        query: trimmed,
        visitStatus: nextStatus,
        roomCode: nextRoom,
      });
      if (!data.ok) throw new Error(data.error ?? "جست‌وجو انجام نشد.");
      setResults((data.candidates ?? []) as DirectoryResult[]);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "جست‌وجو انجام نشد.");
      setResults([]);
    } finally { setBusy(false); }
  };

  const reset = () => { setQuery(""); setStatusFilter("any"); setRoomFilter("any"); setResults([]); setError(""); setSearched(false); };

  const allergiesInScope = useMemo(() => new Set(snapshot.patients.flatMap((p) => p.allergies.map((a) => a.substance))), [snapshot.patients]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-3 pt-10 backdrop-blur-sm sm:p-6 sm:pt-16" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="جست‌وجوی پیشرفته سلامتجو" onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl overflow-hidden rounded-2xl bg-[#f7f9fa] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-800">جست‌وجوی پیشرفته سلامتجو</h2>
            <p className="mt-1 text-[11px] text-slate-500">با نام و نام خانوادگی، بخشی از نام، کد ملی، تلفن، بسته درمانی یا ایستگاه فعلی جست‌وجو کنید و سلامتجو را از جدول انتخاب کنید.</p>
          </div>
          <button onClick={onClose} aria-label="بستن جست‌وجو" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3 border-b border-slate-200 bg-white px-5 py-4">
          <form onSubmit={(e) => { e.preventDefault(); void runSearch(query, statusFilter, roomFilter); }} className="flex flex-wrap items-center gap-2">
            <AppInput autoFocus aria-label="جست‌وجو در همه فیلدهای سلامتجو" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="نام و نام خانوادگی، بخشی از نام، کد ملی، تلفن یا بسته درمانی..." className="app-input min-w-56 flex-1" />
            <button type="submit" disabled={busy} className="primary-button"><Search className="h-4 w-4" />{busy ? "در حال جست‌وجو..." : "جست‌وجو"}</button>
            <button type="button" onClick={reset} className="secondary-button"><RotateCcw className="h-3.5 w-3.5" />پاک‌کردن فیلترها</button>
          </form>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-slate-500"><Filter className="h-3.5 w-3.5" />فیلترها:</span>
            <select aria-label="فیلتر وضعیت مراجعه" value={statusFilter} onChange={(e) => { const next = e.target.value; setStatusFilter(next); void runSearch(query, next, roomFilter); }} className="app-select">
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select aria-label="فیلتر ایستگاه فعلی" value={roomFilter} onChange={(e) => { const next = e.target.value; setRoomFilter(next); void runSearch(query, statusFilter, next); }} className="app-select max-w-56">
              <option value="any">همه ایستگاه‌ها</option>
              {snapshot.rooms.map((room) => <option key={room.code} value={room.code}>{room.name}</option>)}
            </select>
            <span className="text-slate-400">جست‌وجو با چند کلمه هم کار می‌کند؛ مثلاً «مریم تابش» یا «چکاپ جامع ۴۶».</span>
          </div>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600">{error}</p>}
        </div>

        <DirectoryResultsTable
          results={results}
          busy={busy}
          searched={searched}
          allergiesInScope={allergiesInScope}
          onSelect={onSelect}
          onOpenRecord={onOpenRecord}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-3 text-[10px] text-slate-500">
          <span>{searched ? `${toFaDigits(results.length)} سلامتجو پیدا شد` : "جست‌وجو در همه پرونده‌های کلینیک"}</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />انتخاب سلامتجو، سوابق و کد ملی او را در فرم پذیرش بارگذاری می‌کند.</span>
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  results: DirectoryResult[];
  busy: boolean;
  searched: boolean;
  allergiesInScope: Set<string>;
  onSelect: (result: DirectoryResult) => void;
  onOpenRecord?: (patientId: number) => void;
}

/** Memoized so a parent re-render (live clinic polling) cannot rebuild rows mid-click. */
const DirectoryResultsTable = memo(function DirectoryResultsTable({ results, busy, searched, allergiesInScope, onSelect, onOpenRecord }: RowProps) {
  if (results.length === 0) {
    return <div className="px-6 py-14 text-center text-xs text-slate-400">{busy ? "در حال جست‌وجو..." : searched ? "سلامتجویی با این مشخصات یا فیلترها پیدا نشد. فیلترها را تغییر دهید یا نام کوتاه‌تری امتحان کنید." : "برای شروع، عبارت مورد نظر را وارد و جست‌وجو کنید."}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="patient-table w-full whitespace-nowrap text-right text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-[#fbfcfd] text-[10px] font-medium text-slate-400">
            <th className="px-3 py-3 font-medium">نام سلامتجو</th>
            <th className="px-3 py-3 font-medium">کد ملی</th>
            <th className="px-3 py-3 font-medium">سن / جنسیت</th>
            <th className="px-3 py-3 font-medium">تلفن</th>
            <th className="px-3 py-3 font-medium">بسته درمانی</th>
            <th className="px-3 py-3 font-medium">وضعیت مراجعه</th>
            <th className="px-3 py-3 font-medium">ایستگاه فعلی</th>
            <th className="px-3 py-3 font-medium">هشدار / سوابق</th>
            <th className="py-3 pl-4 font-medium">عملیات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/90">
          {results.map((result) => {
            const status = result.hasActiveVisit ? { label: "مراجعه فعال", tone: "teal" } : { label: "تکمیل‌شده", tone: "green" };
            const currentLabel = result.currentStationStatus ? CURRENT_STATUS_LABELS[result.currentStationStatus] : null;
            const hasAllergy = result.patient.allergies.some((a) => allergiesInScope.has(a.substance));
            return (
              <tr key={result.nationalId} className="transition-colors hover:bg-[#f9fbfb]">
                <td className="px-3 py-3">
                  <button type="button" onClick={() => onSelect(result)} className="text-right">
                    <span className="block font-semibold text-slate-700">{result.patient.fullName}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{result.patient.intakeCompleted ? "پرسشنامه ثبت شده" : "پرسشنامه تکمیل‌نشده"}</span>
                  </button>
                </td>
                <td className="px-3 py-3"><span dir="ltr" className="font-mono text-[11px] text-teal-700">{toFaDigits(result.nationalId)}</span></td>
                <td className="px-3 py-3 text-[11px] text-slate-600">{toFaDigits(result.patient.age)} سال · {result.patient.gender}</td>
                <td className="px-3 py-3" dir="ltr"><span className="font-mono text-[11px] text-slate-600">{toFaDigits(result.patient.phone)}</span></td>
                <td className="max-w-44 truncate px-3 py-3 text-[11px] text-slate-600">{result.patient.pathwayTitle}</td>
                <td className="px-3 py-3"><span className={`status-badge status-${status.tone}`}>{status.label}</span><span className="mt-1 block text-[10px] text-slate-400">{toFaDigits(result.visitCount)} مراجعه در سامانه</span></td>
                <td className="px-3 py-3">
                  {currentLabel ? (
                    <span className="block">
                      <span className="block text-[11px] font-semibold text-slate-700">{result.currentStationName}</span>
                      <span className="mt-1 block text-[10px] text-slate-500">{currentLabel}</span>
                    </span>
                  ) : <span className="text-[11px] text-slate-400">در صف نیست</span>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {hasAllergy && <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-1 text-[10px] font-semibold text-red-700"><ShieldAlert className="h-3 w-3" />حساسیت</span>}
                    {result.patient.medications.length > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-1 text-[10px] font-semibold text-sky-700"><Pill className="h-3 w-3" />{toFaDigits(result.patient.medications.length)} دارو</span>}
                    {result.patient.intakeCompleted && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-1 text-[10px] font-semibold text-emerald-700"><ClipboardList className="h-3 w-3" />پرسشنامه</span>}
                    {result.visitCount > 1 && <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-1 text-[10px] font-semibold text-slate-600"><History className="h-3 w-3" />{toFaDigits(result.visitCount)} سابقه</span>}
                  </div>
                </td>
                <td className="pl-4">
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => onSelect(result)} className="primary-button !px-3 !py-2 !text-[10px]">انتخاب برای پذیرش</button>
                    {onOpenRecord && <button type="button" onClick={() => onOpenRecord(result.patient.id)} aria-label={`پرونده ${result.patient.fullName}`} className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"><MapPin className="h-3.5 w-3.5" /></button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
