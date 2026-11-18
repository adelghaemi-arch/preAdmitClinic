import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUp, Clock, FileHeart, GripVertical, MapPin, ShieldAlert, X } from "lucide-react";
import type { ClinicSnapshot, PatientFullDto, RoomDto, VisitStationDto } from "@/types/clinic";
import { formatFaTime, toFaDigits } from "@/lib/persian";

export interface RoomQueueEntry {
  patient: PatientFullDto;
  station: VisitStationDto;
}

/** Order a room's queue: manual rank first, then arrival time. Checked-in / in-progress patients are listed by the same rule. */
export function sortRoomQueue(entries: RoomQueueEntry[]): RoomQueueEntry[] {
  return [...entries].sort((a, b) => {
    const ra = a.station.queueRank || Number.MAX_SAFE_INTEGER;
    const rb = b.station.queueRank || Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    const ta = a.station.enteredQueueAt ? new Date(a.station.enteredQueueAt).getTime() : 0;
    const tb = b.station.enteredQueueAt ? new Date(b.station.enteredQueueAt).getTime() : 0;
    return ta - tb;
  });
}

export function roomEntries(snapshot: ClinicSnapshot, roomCode: string) {
  const active: RoomQueueEntry[] = [];
  const inRoom: RoomQueueEntry[] = [];
  const pendingResults: RoomQueueEntry[] = [];
  const upcoming: RoomQueueEntry[] = [];
  for (const patient of snapshot.patients) {
    for (const station of patient.stations) {
      if (station.roomCode !== roomCode) continue;
      if (station.status === "in_progress") inRoom.push({ patient, station });
      else if (station.status === "waiting" || station.status === "checked_in") active.push({ patient, station });
      else if (station.status === "sample_taken") pendingResults.push({ patient, station });
      else if (station.status === "pending") upcoming.push({ patient, station });
    }
  }
  return { queue: sortRoomQueue(active), inRoom, pendingResults, upcoming };
}

const STATUS: Record<string, { label: string; tone: string }> = {
  waiting: { label: "در صف", tone: "bg-amber-50 text-amber-700" },
  checked_in: { label: "حاضر پشت درب", tone: "bg-emerald-50 text-emerald-700" },
  in_progress: { label: "داخل اتاق", tone: "bg-blue-50 text-blue-700" },
  sample_taken: { label: "نمونه‌گیری شد", tone: "bg-teal-50 text-teal-700" },
  pending: { label: "در ایستگاه قبلی", tone: "bg-slate-100 text-slate-500" },
};

interface Props {
  snapshot: ClinicSnapshot;
  room: RoomDto;
  onClose: () => void;
  onOpenPatient: (id: number) => void;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
}

export function RoomQueueBoard({ snapshot, room, onClose, onOpenPatient, onAction, busy }: Props) {
  const data = useMemo(() => roomEntries(snapshot, room.code), [snapshot, room.code]);
  const [order, setOrder] = useState<number[]>(() => data.queue.map((e) => e.station.id));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  // Keep the local order in sync with live data unless the operator is editing.
  useEffect(() => {
    if (!dirty) setOrder(data.queue.map((e) => e.station.id));
  }, [data.queue, dirty]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  const byId = new Map(data.queue.map((e) => [e.station.id, e]));
  const orderedQueue = order.map((id) => byId.get(id)).filter((e): e is RoomQueueEntry => Boolean(e));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setDirty(true);
  };
  const toTop = (index: number) => {
    if (index === 0) return;
    const next = [...order];
    const [id] = next.splice(index, 1);
    next.unshift(id);
    setOrder(next);
    setDirty(true);
  };

  const save = async () => {
    setError("");
    try {
      await onAction({ action: "REORDER_ROOM_QUEUE", roomCode: room.code, orderedStationIds: order });
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره ترتیب صف انجام نشد.");
    }
  };

  const Row = ({ entry, index, editable }: { entry: RoomQueueEntry; index?: number; editable?: boolean }) => {
    const st = STATUS[entry.station.status] ?? STATUS.pending;
    const longWait = entry.station.spentMinutes >= 25;
    return (
      <div className={`flex items-center gap-3 rounded-xl border p-3 ${longWait && editable ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white"}`}>
        {editable && <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />}
        {index !== undefined && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{toFaDigits(index + 1)}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => onOpenPatient(entry.patient.id)} className="text-xs font-bold text-slate-800 hover:text-teal-700">{entry.patient.fullName}</button>
            {entry.patient.allergies.length > 0 && <ShieldAlert className="h-3.5 w-3.5 text-red-500" aria-label="دارای حساسیت" />}
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${st.tone}`}>{st.label}</span>
            {entry.station.queueRank > 0 && editable && <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-700">ترتیب دستی</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[10px] text-slate-400">
            <span>{toFaDigits(entry.patient.age)} ساله · {entry.patient.pathwayTitle}</span>
            {entry.station.enteredQueueAt && <span>ورود به صف {formatFaTime(entry.station.enteredQueueAt)}</span>}
            <span className={`flex items-center gap-1 ${longWait ? "font-bold text-red-600" : ""}`}><Clock className="h-3 w-3" />{toFaDigits(entry.station.spentMinutes)} دقیقه</span>
            {(entry.station.status === "waiting" || entry.station.status === "checked_in") && <span className="font-semibold text-blue-700">{toFaDigits(entry.station.queueAhead)} نفر جلوتر · حدود {toFaDigits(entry.station.estimatedWaitMinutes)} دقیقه تا فراخوان</span>}
          </div>
        </div>
        {editable && index !== undefined && (
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={() => toTop(index)} disabled={busy || index === 0} title="انتقال به اول صف" aria-label="انتقال به اول صف" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-30"><ChevronsUp className="h-3.5 w-3.5" /></button>
            <button onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label="جلوتر در صف" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button onClick={() => move(index, 1)} disabled={busy || index === order.length - 1} aria-label="عقب‌تر در صف" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <button onClick={() => onOpenPatient(entry.patient.id)} aria-label="پرونده سلامتجو" className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-teal-700"><FileHeart className="h-3.5 w-3.5" /></button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`تابلوی ${room.name}`} onClick={(e) => e.stopPropagation()} className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-[#f7f9fa] shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-800">تابلوی {room.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />طبقه {toFaDigits(room.floor)}، اتاق {room.roomNumber}</span>
              <span>{room.specialistName}</span>
              <span>زمان استاندارد خدمت: {toFaDigits(room.avgServiceMinutes)} دقیقه</span>
            </p>
          </div>
          <button onClick={onClose} aria-label="بستن" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-200 border-b border-slate-200 bg-white text-center text-[11px]">
          <div className="py-2.5"><strong className="block text-lg font-bold text-blue-700">{toFaDigits(data.inRoom.length)}</strong><span className="text-slate-400">داخل اتاق</span></div>
          <div className="py-2.5"><strong className="block text-lg font-bold text-amber-700">{toFaDigits(data.queue.length)}</strong><span className="text-slate-400">در صف انتظار</span></div>
          <div className="py-2.5"><strong className="block text-lg font-bold text-slate-600">{toFaDigits(data.upcoming.length)}</strong><span className="text-slate-400">در راه (ایستگاه قبلی)</span></div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {data.inRoom.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold text-blue-700">در حال دریافت خدمت</h3>
              <div className="space-y-2">{data.inRoom.map((e) => <Row key={e.station.id} entry={e} />)}</div>
            </section>
          )}

          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-700">صف انتظار اتاق <span className="text-[10px] font-normal text-slate-400">— ترتیب را دستی تغییر دهید و ذخیره کنید</span></h3>
              {dirty && (
                <div className="flex items-center gap-2">
                  <button onClick={() => { setOrder(data.queue.map((e) => e.station.id)); setDirty(false); }} className="secondary-button">انصراف</button>
                  <button onClick={() => void save()} disabled={busy} className="primary-button">ذخیره ترتیب جدید صف</button>
                </div>
              )}
            </div>
            {error && <p role="alert" className="mb-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-600">{error}</p>}
            {orderedQueue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">صف این اتاق خالی است.</div>
            ) : (
              <div className="space-y-2">{orderedQueue.map((e, i) => <Row key={e.station.id} entry={e} index={i} editable />)}</div>
            )}
          </section>

          {data.pendingResults.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold text-teal-700">نمونه‌گیری شده؛ در انتظار ثبت نتیجه</h3>
              <div className="space-y-2">{data.pendingResults.map((e) => <Row key={e.station.id} entry={e} />)}</div>
            </section>
          )}

          {data.upcoming.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold text-slate-500">در راه این اتاق (هنوز در ایستگاه قبلی)</h3>
              <div className="space-y-2">{data.upcoming.map((e) => <Row key={e.station.id} entry={e} />)}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
