/*
 File: frontend/my/src/components/PathwayStationEditor.tsx
 Description: ویرایشگر ترتیب ایستگاه‌های مسیر سلامتی در فرم ساخت/ویرایش
 Parent Dependencies: pathway-stations, types/clinic
 */

import React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { PathwayStationDraft } from "@/lib/pathway-stations";
import type { RoomDto } from "@/types/clinic";
import { reindexStationDrafts } from "@/lib/pathway-stations";

interface Props {
  rooms: RoomDto[];
  stations: PathwayStationDraft[];
  onChange: (stations: PathwayStationDraft[]) => void;
  disabled?: boolean;
}

export function PathwayStationEditor({ rooms, stations, onChange, disabled }: Props) {
  const ordered = [...stations].sort((a, b) => a.stepOrder - b.stepOrder);
  const usedCodes = new Set(ordered.map((s) => s.roomCode));
  const availableRooms = rooms.filter((r) => !usedCodes.has(r.code));

  const apply = (next: PathwayStationDraft[]) => onChange(reindexStationDrafts(next));

  const addRoom = (roomCode: string) => {
    if (!roomCode || usedCodes.has(roomCode)) return;
    const room = rooms.find((r) => r.code === roomCode);
    apply([
      ...ordered,
      {
        roomCode,
        titleFa: room?.name ?? roomCode,
        stepOrder: ordered.length + 1,
        isOptional: false,
      },
    ]);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    apply(next);
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="text-[11px] font-semibold text-slate-700">ایستگاه‌های مسیر (به ترتیب مراجعه)</div>
      {ordered.length === 0 ? (
        <p className="text-[10px] text-slate-400">حداقل یک ایستگاه اضافه کنید.</p>
      ) : (
        <ul className="space-y-1.5">
          {ordered.map((row, idx) => (
            <li
              key={`${row.roomCode}-${idx}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px]"
            >
              <span className="font-mono text-slate-400" dir="ltr">
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1 font-medium text-slate-800">
                {row.titleFa}
                <span className="mr-1 font-mono text-[9px] text-slate-400" dir="ltr">
                  ({row.roomCode})
                </span>
              </span>
              <label className="flex items-center gap-1 text-slate-600">
                <input
                  type="checkbox"
                  checked={row.isOptional}
                  disabled={disabled}
                  onChange={(e) => {
                    const next = ordered.map((s, i) => (i === idx ? { ...s, isOptional: e.target.checked } : s));
                    apply(next);
                  }}
                  className="accent-teal-700"
                />
                اختیاری
              </label>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  disabled={disabled || idx === 0}
                  onClick={() => move(idx, -1)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="بالا"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={disabled || idx === ordered.length - 1}
                  onClick={() => move(idx, 1)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="پایین"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => apply(ordered.filter((_, i) => i !== idx))}
                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="حذف ایستگاه"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1 pt-1">
        <Plus className="h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden />
        {availableRooms.length > 0 ? (
          <select
            disabled={disabled}
            defaultValue=""
            onChange={(e) => {
              const code = e.target.value;
              if (!code) return;
              addRoom(code);
              e.target.value = "";
            }}
            className="app-select w-full text-[10px]"
          >
            <option value="">افزودن ایستگاه از اتاق‌های کلینیک…</option>
            {availableRooms.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[10px] text-slate-400">همه اتاق‌های موجود اضافه شده‌اند.</p>
        )}
      </div>
    </div>
  );
}