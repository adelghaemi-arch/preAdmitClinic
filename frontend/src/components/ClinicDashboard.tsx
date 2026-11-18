import { useMemo, useState } from "react";
import { AppInput, AppTextarea } from "@/components/AppInput";
import { Activity, ArrowLeft, ArrowUpLeft, Check, CheckCheck, Clock3, FlaskConical, HeartPulse, Layers3, Plus, Search, ShieldCheck, Sparkles, Stethoscope, Sun, Users, Zap } from "lucide-react";
import type { AppUserDto, ClinicSnapshot, WorkspaceRole } from "@/types/clinic";
import type { AppPage } from "@/lib/workspace";
import { currentStation, matchesPatient, patientStatus, stationLabel, totalVisitMinutes } from "@/lib/workspace";
import { formatFaTime, toFaDigits } from "@/lib/persian";
import { PatientTable } from "./PatientTable";

interface Props {
  snapshot: ClinicSnapshot;
  user: AppUserDto;
  role?: WorkspaceRole;
  onNavigate: (page: AppPage, patientId?: number) => void;
}

export function ClinicDashboard({ snapshot, user, role = "admin", onNavigate }: Props) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const stats = useMemo(() => {
    const active = snapshot.patients.filter((p) => !p.completedAt);
    const completed = snapshot.patients.filter((p) => Boolean(p.completedAt));
    const waiting = active.filter((p) => currentStation(p)?.status === "waiting");
    const duration = snapshot.patients.map((p) => totalVisitMinutes(p, snapshot.serverTime));
    const avgMinutes = duration.length ? Math.round(duration.reduce((a, b) => a + b, 0) / duration.length) : 0;
    const rooms = snapshot.rooms.map((room) => {
      const entries = snapshot.patients.flatMap((p) => p.stations.filter((s) => s.roomCode === room.code));
      const here = entries.filter((s) => ["waiting", "checked_in", "in_progress"].includes(s.status));
      const visited = entries.filter((s) => s.spentMinutes > 0);
      const avg = visited.length ? Math.round(visited.reduce((sum, s) => sum + s.spentMinutes, 0) / visited.length) : 0;
      return { room, count: here.length, completed: entries.filter((s) => s.status === "completed").length, avg, crowded: here.some((s) => s.spentMinutes >= 25) || here.length >= 3 };
    });
    const events = snapshot.patients.flatMap((p) => [
      ...p.clinicalNotes.map((n) => ({ id: `n${n.id}`, title: `ویزیت ${stationLabel(n.roomCode)} ثبت شد`, sub: `${p.fullName} · ${n.doctorName}`, time: n.createdAt, patientId: p.id, type: "visit" })),
      ...p.paraclinicResults.map((r) => ({ id: `r${r.id}`, title: `نتیجه ${stationLabel(r.roomCode)} آماده شد`, sub: p.fullName, time: r.createdAt, patientId: p.id, type: "result" })),
      { id: `p${p.id}`, title: "پذیرش سلامتجو انجام شد", sub: p.fullName, time: p.checkInTime, patientId: p.id, type: "admission" },
    ]).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 4);
    return { active, completed, waiting, avgMinutes, rooms, events };
  }, [snapshot]);

  const filteredPatients = snapshot.patients.filter((p) => matchesPatient(p, query) && (filter === "all" || (filter === "active" && !p.completedAt) || (filter === "waiting" && patientStatus(p).tone === "amber") || (filter === "done" && Boolean(p.completedAt))));
  const congested = stats.rooms.find((r) => r.crowded);
  const shortName = user.fullName.includes("سعیدی") ? "دکتر سعیدی" : user.fullName;
  const kpis = [
    { label: "کل مراجعین امروز", value: snapshot.patients.length, unit: "نفر", icon: Users, color: "teal", sub: `${toFaDigits(stats.active.length)} سلامتجو در کلینیک حضور دارند`, detail: "پذیرش‌های ثبت‌شده" },
    { label: "در حال دریافت خدمت", value: stats.active.length, unit: "نفر", icon: HeartPulse, color: "blue", sub: `${toFaDigits(stats.waiting.length)} نفر در انتظار نوبت`, detail: "جریان درمان فعال" },
    { label: "میانگین زمان حضور", value: stats.avgMinutes, unit: "دقیقه", icon: Clock3, color: "amber", sub: "از زمان پذیرش تا آخرین ایستگاه", detail: "بر اساس مراجعات امروز" },
    { label: "مراجعات تکمیل‌شده", value: stats.completed.length, unit: "نفر", icon: CheckCheck, color: "violet", sub: "پرونده نهایی آماده دریافت است", detail: "آماده ترخیص" },
  ];

  return (
    <div className="dashboard-content space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] text-slate-400"><span>فضای کاری</span><span>/</span><span className="text-slate-600">نمای کلی</span></div>
          <h1 className="text-[23px] font-extrabold tracking-tight text-[#203536]">داشبورد کلینیک</h1>
          <p className="mt-1.5 text-xs text-slate-400">نبض امروز کلینیک را، یک‌جا ببینید و مدیریت کنید.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" />به‌روزرسانی {formatFaTime(snapshot.serverTime)}</span>
          <button onClick={() => onNavigate("admission")} className="primary-button"><Plus className="h-4 w-4" />پذیرش سلامتجو جدید</button>
        </div>
      </div>

      <section className="welcome-banner relative flex min-h-36 flex-wrap items-center justify-between gap-5 overflow-hidden rounded-2xl border border-[#dcebe6] bg-[#edf6f1] px-6 py-6">
        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium text-[#6b9080]"><Sun className="h-3.5 w-3.5" />یک روز تازه، فرصتی برای مراقبت بهتر</div>
          <h2 className="text-xl font-bold text-[#244e40]">{role === "reception" ? "هماهنگی امروز پذیرش" : "سلام، " + shortName}<span className="mr-2 inline-block text-lg">✦</span></h2>
          <p className="mt-2 max-w-xl text-[11px] leading-6 text-[#658276]">{role === "reception" ? <>امروز <strong className="font-bold text-[#2d7056]">{toFaDigits(snapshot.patients.length)} سلامتجو</strong> در مسیر درمان هستند؛ پذیرش، صف‌ها و اعلان‌ها را از همین صفحه پیگیری کنید.</> : <>امروز <strong className="font-bold text-[#2d7056]">{toFaDigits(snapshot.patients.length)} سلامتجو</strong> همراه شما هستند. همه مراحل درمان، از پذیرش تا ترخیص، زیر نظر شماست.</>}</p>
        </div>
        <div className="relative z-10 flex items-center gap-6 pl-2">
          <div className="hidden items-center gap-2 lg:flex">
            {[{ Icon: Users, text: "پذیرش", done: true }, { Icon: Stethoscope, text: "مراقبت", done: true }, { Icon: ShieldCheck, text: "سلامت", done: false }].map(({ Icon, text, done }, i) => <div key={text} className="flex items-center gap-3"><div className="flex flex-col items-center gap-2"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${done ? "border border-[#c5ddcf] bg-white/90 text-[#5b957b]" : "bg-[#207659] text-white shadow-md shadow-teal-900/10"}`}><Icon className="h-5 w-5 stroke-[1.6]" /></span><span className="text-[9px] text-[#6b9080]">{text}</span></div>{i < 2 && <span className="mb-5 w-4 border-t border-dashed border-[#aacabb]" />}</div>)}
          </div>
          <button onClick={() => onNavigate("flow")} className="inline-flex items-center gap-2 rounded-xl border border-[#d3e5da] bg-white/80 px-4 py-2.5 text-[11px] font-semibold text-[#3f6e58] transition hover:bg-white">مشاهده جریان سلامتجویان<ArrowLeft className="h-3.5 w-3.5" /></button>
        </div>
        <div className="pointer-events-none absolute -left-16 -top-36 h-96 w-96 rounded-full border-[35px] border-white/25" />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, unit, icon: Icon, color, sub, detail }) => <div key={label} className="metric-card rounded-2xl border border-[#e6ebea] bg-white p-[18px]">
          <div className="flex items-center justify-between"><span className="text-[11px] font-medium text-slate-500">{label}</span><span className={`metric-icon metric-${color}`}><Icon className="h-[18px] w-[18px] stroke-[1.7]" /></span></div>
          <div className="mt-2 flex items-baseline gap-2"><strong className="text-[32px] font-bold leading-none tracking-tight text-[#263e3c] tabular-fa">{toFaDigits(value)}</strong><span className="text-[11px] text-slate-400">{unit}</span><span className="mr-auto hidden text-[9px] text-slate-300 2xl:block">{detail}</span></div>
          <div className="mt-4 flex items-center gap-1.5 border-t border-slate-50 pt-2.5 text-[10px] text-slate-400"><span className={`h-1 w-1 rounded-full ${color === "amber" ? "bg-amber-400" : "bg-teal-400"}`} />{sub}</div>
        </div>)}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e6ebea] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
            <div className="flex items-center gap-2"><h2 className="text-[13px] font-bold text-[#263e3c]">سلامتجویان امروز</h2><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{toFaDigits(snapshot.patients.length)} نفر</span></div>
            <button onClick={() => onNavigate("patients")} className="flex items-center gap-1.5 text-[10px] font-medium text-teal-700">مشاهده همه<ArrowLeft className="h-3 w-3" /></button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-4">
            <div className="flex items-center gap-1 rounded-lg bg-slate-50 p-1">
              {[['all','همه'],['active','فعال'],['waiting','در انتظار'],['done','تکمیل‌شده']].map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={`rounded-md px-2.5 py-1.5 text-[10px] transition ${filter === id ? "bg-white font-semibold text-teal-700 shadow-sm shadow-slate-200/70" : "text-slate-400 hover:text-slate-700"}`}>{label}</button>)}
            </div>
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-slate-400"><Search className="h-3.5 w-3.5" /><AppInput aria-label="جستجو در سلامتجویان امروز" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی سلامتجو..." className="w-24 bg-transparent text-[10px] outline-none" /></label>
          </div>
          <PatientTable patients={filteredPatients} rooms={snapshot.rooms} compact onOpen={(id) => onNavigate("records", id)} />
        </section>

        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-2xl bg-[#184e43] p-5 text-white">
            <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[11px] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-[#91d9b2]" />وضعیت جریان درمان</span><Zap className="h-4 w-4 text-[#91d9b2]" /></div>
            <div className="mt-4 flex items-center gap-4"><div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#93d8b5 ${(snapshot.patients.length ? stats.completed.length / snapshot.patients.length : 0) * 360}deg, #ffffff14 0deg)` }}><div className="flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full bg-[#184e43]"><strong className="text-lg font-bold">{toFaDigits(snapshot.patients.length ? Math.round(stats.completed.length / snapshot.patients.length * 100) : 0)}٪</strong><span className="text-[8px] text-white/45">تکمیل مسیر</span></div></div><div><div className="text-[11px] font-semibold">مراقبت، بدون وقفه</div><p className="mt-1.5 text-[10px] leading-5 text-white/55">{toFaDigits(stats.active.length)} سلامتجو در مسیر درمان<br />{toFaDigits(stats.completed.length)} مراجعه تکمیل شده</p></div></div>
            <div className="mt-4 border-t border-white/10 pt-3"><button onClick={() => onNavigate("queues")} className="flex w-full items-center justify-between text-[10px] text-white/75"><span>{congested ? `نیاز به توجه: صف ${stationLabel(congested.room.code)}` : "همه ایستگاه‌ها در وضعیت عادی هستند"}</span><ArrowUpLeft className="h-3.5 w-3.5 text-[#a2dfbe]" /></button></div>
            <div className="pointer-events-none absolute -left-12 -top-10 h-36 w-36 rounded-full border-[18px] border-white/[0.025]" />
          </section>
          <section className="rounded-2xl border border-[#e6ebea] bg-white px-5 py-4">
            <div className="flex items-center justify-between"><h2 className="text-[12px] font-bold text-[#263e3c]">آخرین رویدادها</h2><span className="h-1.5 w-1.5 rounded-full bg-teal-500" /></div>
            <div className="mt-4 space-y-3.5">{stats.events.map((event, i) => <button key={event.id} onClick={() => onNavigate("records", event.patientId)} className="relative flex w-full items-start gap-2.5 text-right"><span className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${event.type === "result" ? "bg-blue-50 text-blue-500" : "bg-teal-50 text-teal-600"}`}>{event.type === "result" ? <FlaskConical className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span>{i < stats.events.length - 1 && <span className="absolute top-7 right-3 h-6 border-r border-dashed border-slate-200" />}<span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-1"><span className="truncate text-[10px] font-medium text-slate-600">{event.title}</span><span className="text-[9px] text-slate-300">{formatFaTime(event.time)}</span></span><span className="mt-1 block truncate text-[9px] text-slate-400">{event.sub}</span></span></button>)}</div>
          </section>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-slate-400" /><h2 className="text-[13px] font-bold text-[#263e3c]">ایستگاه‌های کلینیک</h2><span className="text-[10px] text-slate-400">{toFaDigits(snapshot.rooms.length)} ایستگاه فعال</span></div><button onClick={() => onNavigate("rooms")} className="flex items-center gap-1.5 text-[10px] font-medium text-teal-700">مدیریت ایستگاه‌ها<ArrowLeft className="h-3 w-3" /></button></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">{stats.rooms.map(({ room, count, completed, crowded }) => <button key={room.id} onClick={() => onNavigate("flow")} className="rounded-xl border border-[#e6ebea] bg-white p-3.5 text-right transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-sm"><div className="flex items-center justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${crowded ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-teal-600"}`}>{room.code === "ECG" || room.code === "CARDIO" ? <HeartPulse className="h-4 w-4 stroke-[1.6]" /> : room.category === "paraclinic" ? <FlaskConical className="h-4 w-4 stroke-[1.6]" /> : <Stethoscope className="h-4 w-4 stroke-[1.6]" />}</span><span className={`h-1.5 w-1.5 rounded-full ${crowded ? "bg-amber-400" : "bg-teal-400"}`} /></div><h3 className="mt-2.5 text-[11px] font-semibold text-slate-600">{stationLabel(room.code)}</h3><p className="mt-1 text-[9px] text-slate-400">طبقه {toFaDigits(room.floor)}، اتاق {room.roomNumber}</p><div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2 text-[9px]"><span className={crowded ? "text-amber-600" : "text-slate-500"}>{toFaDigits(count)} نفر در صف</span><span className="text-slate-400">{toFaDigits(completed)} تکمیل</span></div></button>)}</div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-4 text-[9px] text-slate-400"><span>نبض • مراقبت پیوسته، مدیریت یکپارچه</span><span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-teal-500" />اطلاعات سلامتجویان در یک پرونده مشترک نگهداری می‌شود.</span></div>
    </div>
  );
}
