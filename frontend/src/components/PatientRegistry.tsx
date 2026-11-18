import { useState } from "react";
import { Download, ListFilter, Plus, Search, Users } from "lucide-react";
import type { ClinicSnapshot } from "@/types/clinic";
import { downloadPatientsCsv, matchesPatient, patientStatus, type AppPage } from "@/lib/workspace";
import { toFaDigits } from "@/lib/persian";
import { PatientTable } from "./PatientTable";

interface Props {
  snapshot: ClinicSnapshot;
  initialQuery?: string;
  onNavigate: (page: AppPage, patientId?: number) => void;
}

export function PatientRegistry({ snapshot, initialQuery = "", onNavigate }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState("all");
  const [pathway, setPathway] = useState("all");
  const patients = snapshot.patients.filter((p) => matchesPatient(p, query) && (pathway === "all" || p.pathwayTitle === pathway) && (status === "all" || (status === "active" && !p.completedAt) || (status === "completed" && Boolean(p.completedAt)) || (status === "waiting" && patientStatus(p).tone === "amber") || (status === "allergy" && p.allergies.length > 0)));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: "همه بیماران", value: snapshot.patients.length, text: "پرونده در سامانه", tone: "bg-teal-50 text-teal-600" }, { label: "مسیر درمان فعال", value: snapshot.patients.filter((p) => !p.completedAt).length, text: "مراجعه در حال انجام", tone: "bg-blue-50 text-blue-600" }, { label: "شرح حال تکمیل‌شده", value: snapshot.patients.filter((p) => p.intakeCompleted).length, text: "پرونده آماده ویزیت", tone: "bg-violet-50 text-violet-600" }].map((card) => <div key={card.label} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}><Users className="h-5 w-5 stroke-[1.5]" /></span><div><span className="text-[11px] text-slate-400">{card.label}</span><div className="mt-1"><strong className="text-xl font-bold text-slate-700">{toFaDigits(card.value)}</strong><span className="mr-2 text-[10px] text-slate-400">{card.text}</span></div></div></div>)}
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5"><div><h2 className="text-sm font-bold text-slate-700">فهرست بیماران</h2><p className="mt-1 text-[10px] text-slate-400">پرونده مشترک بیمار در تمام مراحل پذیرش، تشخیص و درمان</p></div><div className="flex gap-2"><button onClick={() => downloadPatientsCsv(patients)} className="secondary-button"><Download className="h-3.5 w-3.5" />خروجی Excel / CSV</button><button onClick={() => onNavigate("admission")} className="primary-button"><Plus className="h-3.5 w-3.5" />پذیرش جدید</button></div></div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3"><label className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"><Search className="h-3.5 w-3.5 text-slate-400" /><input aria-label="جستجوی بیماران" placeholder="نام بیمار، کد ملی، شماره موبایل یا کد پرونده..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-transparent text-[11px] outline-none" /></label><ListFilter className="h-4 w-4 text-slate-400" /><select aria-label="فیلتر وضعیت بیمار" value={status} onChange={(e) => setStatus(e.target.value)} className="app-select"><option value="all">همه وضعیت‌ها</option><option value="active">مسیر فعال</option><option value="waiting">در انتظار</option><option value="completed">تکمیل‌شده</option><option value="allergy">دارای حساسیت</option></select><select aria-label="فیلتر بسته درمانی" value={pathway} onChange={(e) => setPathway(e.target.value)} className="app-select max-w-52"><option value="all">همه بسته‌های درمانی</option>{Array.from(new Set(snapshot.patients.map((p) => p.pathwayTitle))).map((title) => <option key={title} value={title}>{title}</option>)}</select>{(query || status !== "all" || pathway !== "all") && <button onClick={() => { setQuery(""); setStatus("all"); setPathway("all"); }} className="text-[10px] text-teal-700">حذف فیلترها</button>}</div>
        <PatientTable patients={patients} rooms={snapshot.rooms} onOpen={(id) => onNavigate("records", id)} onClinical={(id) => onNavigate("clinical", id)} />
      </section>
    </div>
  );
}
