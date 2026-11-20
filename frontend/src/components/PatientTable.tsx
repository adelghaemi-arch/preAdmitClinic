import { useState } from "react";
import { ArrowUpLeft, Inbox, ShieldAlert } from "lucide-react";
import { ListPager, slicePage, type ListPageSize } from "@/components/ListPager";
import type { PatientFullDto, RoomDto } from "@/types/clinic";
import { toFaDigits } from "@/lib/persian";
import { currentStation, initials, patientStatus, stationLabel } from "@/lib/workspace";

interface Props {
  patients: PatientFullDto[];
  rooms: RoomDto[];
  onOpen: (id: number) => void;
  onClinical?: (id: number) => void;
  compact?: boolean;
}

const avatarTones = [
  "bg-teal-50 text-teal-700",
  "bg-violet-50 text-violet-600",
  "bg-blue-50 text-blue-600",
  "bg-orange-50 text-orange-600",
  "bg-rose-50 text-rose-600",
];

export function PatientTable({ patients, rooms, onOpen, onClinical, compact }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ListPageSize>(compact ? 10 : 20);
  const displayed = slicePage(patients, page, pageSize);

  const pagination = (
    <ListPager
      page={page}
      pageSize={pageSize}
      totalCount={patients.length}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      itemLabel="سلامتجو"
    />
  );

  const empty = (
    <div className="flex flex-col items-center gap-2 py-14 text-xs text-slate-400">
      <Inbox className="h-8 w-8 stroke-1 text-slate-300" />
      سلامتجویی با این مشخصات پیدا نشد.
    </div>
  );

  return (
    <>
      {/* Mobile / narrow: card list */}
      <div className="space-y-2 px-3.5 pb-1 md:hidden">
        {displayed.map((p) => {
          const current = currentStation(p);
          const status = patientStatus(p);
          const room = rooms.find((r) => r.code === current?.roomCode);
          const done = p.stations.filter((s) => s.status === "completed").length;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p.id)}
              className="flex w-full items-start gap-3 rounded-xl border border-slate-100 bg-[#fbfcfd] p-3 text-right transition active:bg-teal-50/50"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold ${
                  avatarTones[p.id % avatarTones.length]
                }`}
              >
                {initials(p.fullName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <span className="truncate">{p.fullName}</span>
                      {p.allergies.length > 0 && (
                        <ShieldAlert
                          aria-label="حساسیت ثبت شده"
                          className="h-3 w-3 shrink-0 text-rose-500"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-slate-400">
                      {toFaDigits(p.age)} سال •{" "}
                      {current ? stationLabel(current.roomCode) : "پایان مراجعه"}
                      {room
                        ? ` · طبقه ${toFaDigits(room.floor)}`
                        : ""}
                    </span>
                  </span>
                  <span className={`status-badge status-${status.tone} shrink-0`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {status.label}
                  </span>
                </span>
                <span className="mt-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="flex gap-1"
                      aria-label={`${done} از ${p.stations.length} مرحله`}
                    >
                      {p.stations.map((s) => (
                        <span
                          key={s.id}
                          title={s.roomName}
                          className={`h-1.5 w-3 rounded-full ${
                            s.status === "completed"
                              ? "bg-teal-500"
                              : s.id === current?.id
                                ? "bg-blue-300"
                                : "bg-slate-100"
                          }`}
                        />
                      ))}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {toFaDigits(done)}/{toFaDigits(p.stations.length)}
                    </span>
                  </span>
                  <ArrowUpLeft className="h-3.5 w-3.5 text-slate-300" />
                </span>
              </span>
            </button>
          );
        })}
        {displayed.length === 0 && empty}
      </div>

      {/* Desktop / tablet: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="patient-table w-full whitespace-nowrap text-right text-xs">
          <thead>
            <tr className="border-y border-slate-100 bg-[#fbfcfd] text-[10px] font-medium text-slate-400">
              <th className="w-10 py-3 pr-5 font-medium">#</th>
              <th className="px-3 py-3 font-medium">نام و مشخصات سلامتجو</th>
              {!compact && <th className="px-3 py-3 font-medium">بسته درمانی</th>}
              <th className="px-3 py-3 font-medium">ایستگاه فعلی</th>
              <th className="px-3 py-3 font-medium">وضعیت</th>
              <th className="px-3 py-3 font-medium">پیشرفت مسیر</th>
              <th className="py-3 pl-5 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90">
            {displayed.map((p, index) => {
              const current = currentStation(p);
              const status = patientStatus(p);
              const room = rooms.find((r) => r.code === current?.roomCode);
              const done = p.stations.filter((s) => s.status === "completed").length;
              return (
                <tr key={p.id} className="group transition-colors hover:bg-[#f9fbfb]">
                  <td className="py-4 pr-5 text-[10px] text-slate-400">
                    {toFaDigits((page - 1) * pageSize + index + 1)}
                  </td>
                  <td className="px-3 py-4">
                    <button
                      type="button"
                      onClick={() => onOpen(p.id)}
                      className="flex items-center gap-2.5 text-right"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold ${
                          avatarTones[p.id % avatarTones.length]
                        }`}
                      >
                        {initials(p.fullName)}
                      </span>
                      <span>
                        <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                          {p.fullName}
                          {p.allergies.length > 0 && (
                            <ShieldAlert
                              aria-label="حساسیت ثبت شده"
                              className="h-3 w-3 text-rose-500"
                            />
                          )}
                        </span>
                        <span className="mt-1 block text-[10px] text-slate-400">
                          {toFaDigits(p.age)} سال • کد {toFaDigits(1000 + p.id)}
                        </span>
                      </span>
                    </button>
                  </td>
                  {!compact && (
                    <td className="max-w-44 truncate px-3 text-[11px] text-slate-500">
                      {p.pathwayTitle}
                    </td>
                  )}
                  <td className="px-3">
                    <span className="block text-[11px] font-medium text-slate-600">
                      {current ? stationLabel(current.roomCode) : "پایان مراجعه"}
                    </span>
                    <span className="mt-1 block text-[9px] text-slate-400">
                      {room
                        ? `طبقه ${toFaDigits(room.floor)} · اتاق ${room.roomNumber}`
                        : "پرونده نهایی آماده است"}
                    </span>
                  </td>
                  <td className="px-3">
                    <span className={`status-badge status-${status.tone}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex gap-1"
                        aria-label={`${done} از ${p.stations.length} مرحله`}
                      >
                        {p.stations.map((s) => (
                          <span
                            key={s.id}
                            title={s.roomName}
                            className={`h-1.5 w-3.5 rounded-full ${
                              s.status === "completed"
                                ? "bg-teal-500"
                                : s.id === current?.id
                                  ? "bg-blue-300"
                                  : "bg-slate-100"
                            }`}
                          />
                        ))}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {toFaDigits(done)}/{toFaDigits(p.stations.length)}
                      </span>
                    </div>
                  </td>
                  <td className="pl-5">
                    <div className="flex items-center gap-1">
                      {onClinical && !compact && (
                        <button
                          type="button"
                          onClick={() => onClinical(p.id)}
                          className="rounded-lg px-2 py-1.5 text-[10px] font-semibold text-teal-700 hover:bg-teal-50"
                        >
                          ویزیت
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpen(p.id)}
                        aria-label={`پرونده ${p.fullName}`}
                        className="rounded-lg border border-slate-200/80 p-1.5 text-slate-400 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                      >
                        <ArrowUpLeft className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayed.length === 0 && empty}
      </div>
      {pagination}
    </>
  );
}
