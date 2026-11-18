import { useState } from "react";
import { Check, Clipboard, Clock3, ExternalLink, FileHeart, Pencil, Printer, QrCode, ShieldAlert, Stethoscope, UserRound, X } from "lucide-react";
import type { ClinicSnapshot } from "@/types/clinic";
import { initials, normalizeText, patientStatus, type AppPage } from "@/lib/workspace";
import { formatFaTime, toFaDigits } from "@/lib/persian";
import { PatientMobileProfile } from "./PatientMobileProfile";
import { PrintableEmrReport } from "./PrintableEmrReport";
import { QrCodeVisual } from "./QrCodeVisual";

interface Props {
  snapshot: ClinicSnapshot;
  selectedPatientId: number;
  onSelectPatient: (id: number) => void;
  onNavigate: (page: AppPage, patientId?: number) => void;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}

export function PatientWorkspace({ snapshot, selectedPatientId, onSelectPatient, onNavigate, onAction, busy }: Props) {
  const patient = snapshot.patients.find((p) => p.id === selectedPatientId) ?? snapshot.patients[0];
  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(patient?.fullName ?? "");
  const [nationalId, setNationalId] = useState(patient?.nationalId ?? "");
  const [age, setAge] = useState(String(patient?.age ?? ""));
  const [phone, setPhone] = useState(patient?.phone ?? "");
  const [gender, setGender] = useState(patient?.gender ?? "مرد");
  const [error, setError] = useState("");

  if (!patient) return <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><FileHeart className="mx-auto h-10 w-10 stroke-1 text-slate-300" /><p className="my-4 text-sm text-slate-400">هنوز بیماری پذیرش نشده است.</p><button onClick={() => onNavigate("admission")} className="primary-button">پذیرش اولین بیمار</button></div>;
  const status = patientStatus(patient);
  const done = patient.stations.filter((s) => s.status === "completed").length;
  const allDone = done === patient.stations.length && done > 0;

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await onAction({ action: "UPDATE_PATIENT_DETAILS", patientId: patient.id, fullName: name.trim(), nationalId: nationalId.trim(), age: Number(normalizeText(age)), phone: phone.trim(), gender });
      setEditOpen(false);
    } catch { setError("ذخیره اطلاعات انجام نشد. دوباره تلاش کنید."); }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/patient/?token=${patient.qrToken}`); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setError("امکان کپی خودکار نیست؛ لینک زیر را کپی کنید."); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-[11px] text-slate-400"><UserRound className="h-3.5 w-3.5" />انتخاب پرونده<select aria-label="انتخاب پرونده بیمار" value={patient.id} onChange={(e) => onSelectPatient(Number(e.target.value))} className="app-select max-w-64">{snapshot.patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} · {toFaDigits(1000 + p.id)}</option>)}</select></div><button onClick={() => onNavigate("patients")} className="text-[11px] text-teal-700">بازگشت به فهرست بیماران</button></div>
      <section className="rounded-2xl border border-[#e4ebe7] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4"><span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-100 bg-[#edf6f1] text-xl font-semibold text-teal-700">{initials(patient.fullName)}</span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-slate-700">{patient.fullName}</h2><span className={`status-badge status-${status.tone}`}>{status.label}</span></div><p className="mt-2 text-[11px] text-slate-400">{toFaDigits(patient.age)} سال · {patient.gender} · کد ملی {toFaDigits(patient.nationalId)}</p><div className="mt-1.5 text-[10px] text-slate-400">شماره تماس: {toFaDigits(patient.phone)}<span className="mx-2 text-slate-200">|</span>شماره پرونده: {toFaDigits(1000 + patient.id)}</div></div></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => setEditOpen(true)} className="secondary-button"><Pencil className="h-3.5 w-3.5" />ویرایش اطلاعات</button><button onClick={() => setQrOpen(true)} className="secondary-button"><QrCode className="h-3.5 w-3.5" />QR همراه بیمار</button><button onClick={() => onNavigate("clinical", patient.id)} className="primary-button"><Stethoscope className="h-3.5 w-3.5" />ثبت ویزیت</button></div>
        </div>
        <div className="mt-5 grid divide-y divide-slate-100 rounded-xl bg-[#f9fbfa] text-[11px] sm:grid-cols-4 sm:divide-x sm:divide-y-0 sm:divide-x-reverse"><div className="p-3"><span className="text-[9px] text-slate-400">بسته درمانی</span><strong className="mt-1.5 block text-[11px] font-medium text-slate-600">{patient.pathwayTitle}</strong></div><div className="p-3"><span className="text-[9px] text-slate-400">ساعت پذیرش</span><strong className="mt-1.5 flex items-center gap-1 font-medium text-slate-600"><Clock3 className="h-3 w-3 text-slate-400" />{formatFaTime(patient.checkInTime)}</strong></div><div className="p-3"><span className="text-[9px] text-slate-400">پیشرفت مسیر درمان</span><strong className="mt-1.5 block font-medium text-teal-700">{toFaDigits(done)} از {toFaDigits(patient.stations.length)} ایستگاه</strong></div><div className="p-3"><span className="text-[9px] text-slate-400">شرح حال و سوابق</span><strong className={`mt-1.5 block font-medium ${patient.intakeCompleted ? "text-teal-700" : "text-amber-600"}`}>{patient.intakeCompleted ? "تکمیل و ثبت شده" : "در انتظار تکمیل"}</strong></div></div>
      </section>
      <PatientMobileProfile key={patient.id} snapshot={snapshot} selectedPatientId={patient.id} onSelectPatient={onSelectPatient} onAction={onAction} busy={busy} desktop hidePatientSwitch />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4ebe7] bg-white p-4"><div><h3 className="text-xs font-semibold text-slate-600">گزارش جامع مراجعه {allDone ? "نهایی شده" : "در حال تکمیل"}</h3><p className="mt-1 text-[10px] text-slate-400">تمام نتایج تشخیصی، معاینه‌ها و نسخه‌ها در یک گزارش</p></div><button disabled={!allDone} onClick={() => setReportOpen(true)} className="secondary-button disabled:opacity-50"><Printer className="h-3.5 w-3.5" />{allDone ? "پیش‌نمایش و ذخیره PDF" : "پس از پایان مسیر فعال می‌شود"}</button></div>

      {reportOpen && <PrintableEmrReport patient={patient} onClose={() => setReportOpen(false)} />}
      {(qrOpen || editOpen) && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm" onClick={() => { setQrOpen(false); setEditOpen(false); }}><div role="dialog" aria-modal="true" aria-label={qrOpen ? "QR همراه بیمار" : "ویرایش اطلاعات بیمار"} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-base font-bold text-slate-700">{qrOpen ? "ورود اختصاصی به همراه بیمار" : "ویرایش مشخصات بیمار"}</h2><button aria-label="بستن" onClick={() => { setQrOpen(false); setEditOpen(false); }}><X className="h-4 w-4 text-slate-400" /></button></div>{qrOpen ? <div className="text-center"><p className="mb-5 text-xs leading-6 text-slate-400">{patient.fullName} می‌تواند با اسکن این QR، بدون رمز عبور فقط به پرونده و مسیر درمان خودش دسترسی داشته باشد.</p><QrCodeVisual token={patient.qrToken} size={195} /><div className="mt-5 flex justify-center gap-2"><button onClick={() => void copyLink()} className="secondary-button">{copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? "لینک کپی شد" : "کپی لینک بیمار"}</button><a target="_blank" rel="noreferrer" href={`/patient/?token=${patient.qrToken}`} className="primary-button"><ExternalLink className="h-3.5 w-3.5" />باز کردن همراه بیمار</a></div>{error && <p className="mt-3 text-[10px] text-rose-500">{error}</p>}</div> : <form onSubmit={save} className="space-y-4"><label className="app-label">نام و نام خانوادگی<input required minLength={3} value={name} onChange={(e) => setName(e.target.value)} className="app-input mt-2" /></label><div className="grid grid-cols-2 gap-3"><label className="app-label">کد ملی<input required value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="app-input mt-2" /></label><label className="app-label">تلفن همراه<input required value={phone} onChange={(e) => setPhone(e.target.value)} className="app-input mt-2" /></label><label className="app-label">سن<input required value={age} onChange={(e) => setAge(e.target.value)} className="app-input mt-2" /></label><label className="app-label">جنسیت<select value={gender} onChange={(e) => setGender(e.target.value)} className="app-input mt-2"><option value="مرد">مرد</option><option value="زن">زن</option></select></label></div>{error && <p className="text-xs text-rose-500">{error}</p>}<button disabled={busy} className="primary-button w-full justify-center">ذخیره اطلاعات بیمار</button></form>}</div></div>}
    </div>
  );
}
