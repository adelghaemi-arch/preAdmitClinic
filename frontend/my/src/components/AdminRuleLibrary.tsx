/*
 File: frontend/my/src/components/AdminRuleLibrary.tsx
 Description: مدیریت کامل کتابخانه مرکزی قوانین — CRUD، جستجو و آمار استفاده
 Parent Dependencies: types/clinic, persian, pathway-stations, PathwayStationEditor
 */

import React, { useMemo, useState } from "react";
import { AppInput, AppTextarea } from "@/components/AppInput";
import { PathwayStationEditor } from "@/components/PathwayStationEditor";
import { BookOpen, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import type { ClinicSnapshot, PathwayDto } from "@/types/clinic";
import { JOB_CATEGORIES } from "@/lib/mock-contracts";
import { draftsFromPathway, stationCodesToDrafts, type PathwayStationDraft } from "@/lib/pathway-stations";
import { toFaDigits } from "@/lib/persian";
import { normalizeText } from "@/lib/workspace";

interface Props {
  snapshot: ClinicSnapshot;
  onAction: (payload: Record<string, unknown>) => Promise<Record<string, unknown> | void>;
  busy: boolean;
}

export function AdminRuleLibrary({ snapshot, onAction, busy }: Props) {
  const library = snapshot.pathwayLibrary ?? [];
  const rooms = snapshot.rooms ?? [];
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PathwayDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gender, setGender] = useState<"همه" | "مرد" | "زن">("همه");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [jobCategory, setJobCategory] = useState("همه");
  const [estimatedMinutes, setEstimatedMinutes] = useState("60");
  const [stations, setStations] = useState<PathwayStationDraft[]>(() =>
    stationCodesToDrafts(["LAB"], [], snapshot.rooms ?? [])
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [expandedContractsRuleId, setExpandedContractsRuleId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = normalizeText(query.trim());
    return library.filter(
      (r) =>
        !q ||
        normalizeText(`${r.title} ${r.description} ${r.code} ${r.jobCategory} ${r.gender}`).includes(q)
    );
  }, [library, query]);

  const attachedTitlesByRuleId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of snapshot.contracts ?? []) {
      const cTitle = c.title?.trim() || c.organizationName?.trim() || c.code;
      if (!cTitle) continue;
      for (const r of c.pathwayRules ?? []) {
        const libId = r.libraryPathwayId?.trim();
        if (!libId) continue;
        const list = map.get(libId) ?? [];
        if (!list.includes(cTitle)) list.push(cTitle);
        map.set(libId, list);
      }
    }
    return map;
  }, [snapshot.contracts]);

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setTitle("");
    setDescription("");
    setGender("همه");
    setMinAge("");
    setMaxAge("");
    setJobCategory("همه");
    setEstimatedMinutes("60");
    setStations(stationCodesToDrafts(["LAB"], [], rooms));
  }

  function openEdit(rule: PathwayDto) {
    setCreating(false);
    setEditing(rule);
    setTitle(rule.title);
    setDescription(rule.description);
    setGender(rule.gender);
    setMinAge(rule.minAge != null ? String(rule.minAge) : "");
    setMaxAge(rule.maxAge != null ? String(rule.maxAge) : "");
    setJobCategory(rule.jobCategory || "همه");
    setEstimatedMinutes(String(rule.estimatedTotalMinutes ?? 60));
    setStations(draftsFromPathway(rule, rooms));
  }

  function closeForm() {
    setEditing(null);
    setCreating(false);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const rule = {
      title,
      description,
      gender,
      minAge: minAge !== "" ? Number(minAge) : null,
      maxAge: maxAge !== "" ? Number(maxAge) : null,
      jobCategory,
      isInLibrary: true,
      estimatedTotalMinutes: estimatedMinutes !== "" ? Number(estimatedMinutes) : null,
      stations,
    };
    if (editing) {
      await onAction({ action: "UPSERT_PATHWAY_LIBRARY_ITEM", rule: { ...rule, id: editing.id } });
      setFlash(`مسیر «${title}» به‌روزرسانی شد.`);
    } else {
      await onAction({ action: "UPSERT_PATHWAY_LIBRARY_ITEM", rule });
      setFlash(`مسیر «${title}» در کتابخانه ثبت شد.`);
    }
    closeForm();
  }

  async function removeRule(rule: PathwayDto) {
    if ((rule.attachedContractCount ?? 0) > 0) {
      setFlash("این مسیر به قرارداد متصل است؛ ابتدا از قراردادها جدا کنید.");
      return;
    }
    await onAction({ action: "DELETE_PATHWAY_LIBRARY_ITEM", id: rule.id });
    setFlash(`مسیر «${rule.title}» حذف شد.`);
  }

  const formOpen = creating || editing;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-800">کتابخانه مرکزی مسیرهای سلامتی</h1>
          <p className="mt-1 text-xs text-slate-500">
            مسیرهای قابل استفاده مجدد در همه قراردادها؛ آمار اتصال فعال و استفاده‌های قبلی برای هر مسیر.
          </p>
        </div>
        <button type="button" disabled={busy} onClick={openCreate} className="primary-button">
          <Plus className="h-4 w-4" />
          مسیر جدید
        </button>
      </div>

      {flash && (
        <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900">
          <span>{flash}</span>
          <button type="button" onClick={() => setFlash(null)} aria-label="بستن">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <label className="flex max-w-md items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs">
        <Search className="h-3.5 w-3.5 text-slate-400" />
        <AppInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجو بر اساس عنوان، کد، شغل..."
          className="w-full bg-transparent outline-none"
        />
      </label>

      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((rule) => {
          const attachedTitles = attachedTitlesByRuleId.get(rule.id) ?? [];
          const attachedCount = Math.max(rule.attachedContractCount ?? 0, attachedTitles.length);
          const contractsOpen = expandedContractsRuleId === rule.id;
          return (
            <div key={rule.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-teal-700" />
                    <strong className="text-sm text-slate-800">{rule.title}</strong>
                    <span className="font-mono text-[10px] text-slate-400" dir="ltr">
                      {rule.code}
                    </span>
                  </div>
                  {rule.description ? (
                    <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{rule.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openEdit(rule)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-teal-700"
                    aria-label="ویرایش"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeRule(rule)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] text-slate-600">
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5">جنسیت: {rule.gender}</span>
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5">
                  سن: {rule.minAge != null ? `از ${toFaDigits(rule.minAge)}` : "هر سن"}
                  {rule.maxAge != null ? ` تا ${toFaDigits(rule.maxAge)}` : ""}
                </span>
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5">شغل: {rule.jobCategory}</span>
                <span className="rounded border border-teal-100 bg-teal-50 px-2 py-0.5 font-semibold text-teal-800">
                  {toFaDigits(rule.stationCodes.length)} ایستگاه
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-2.5 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-teal-700">
                    <Users className="h-3 w-3" />
                    متصل و فعال
                  </div>
                  <div className="mt-1 text-base font-bold text-teal-900 tabular-fa">
                    {toFaDigits(rule.activeMatchedCount ?? 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                  <div className="text-[10px] text-slate-500">قبلاً استفاده‌کرده</div>
                  <div className="mt-1 text-base font-bold text-slate-800 tabular-fa">
                    {toFaDigits(rule.previouslyUsedCount ?? 0)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedContractsRuleId((id) => (id === rule.id ? null : rule.id))}
                  aria-expanded={contractsOpen}
                  className={`rounded-xl border px-2.5 py-2 text-right transition ${
                    contractsOpen
                      ? "border-teal-300 bg-teal-50 ring-1 ring-teal-200"
                      : "border-slate-200 bg-slate-50 hover:border-teal-200 hover:bg-teal-50/40"
                  }`}
                >
                  <div className="text-[10px] text-slate-500">قرارداد متصل</div>
                  <div className="mt-1 text-base font-bold text-slate-800 tabular-fa">
                    {toFaDigits(attachedCount)}
                  </div>
                </button>
              </div>

              {contractsOpen && (
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <div className="mb-1.5 text-[10px] font-semibold text-slate-600">
                    قراردادهای متصل ({toFaDigits(attachedTitles.length)})
                  </div>
                  {attachedTitles.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      {attachedCount > 0
                        ? "عنوان قرارداد در لیست فعلی در دسترس نیست."
                        : "هنوز به قراردادی متصل نشده است."}
                    </p>
                  ) : (
                    <ul className="max-h-40 space-y-1 overflow-y-auto">
                      {attachedTitles.map((t) => (
                        <li
                          key={t}
                          className="rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          {library.length === 0 ? "هنوز مسیری در کتابخانه نیست — یک مسیر جدید بسازید." : "نتیجه‌ای برای این جست‌وجو یافت نشد."}
        </div>
      )}

      {formOpen && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={closeForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "ویرایش مسیر" : "ساخت مسیر"}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">
                {editing ? `ویرایش: ${editing.title}` : "ساخت مسیر جدید"}
              </h2>
              <button type="button" onClick={closeForm} aria-label="بستن">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={(e) => void submitForm(e)} className="space-y-3">
              <AppInput
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان مسیر سلامتی"
                className="app-input text-xs"
              />
              <AppTextarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیح کوتاه"
                className="app-input text-xs"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "همه" | "مرد" | "زن")}
                  className="app-select text-xs"
                >
                  <option value="همه">همه</option>
                  <option value="مرد">مرد</option>
                  <option value="زن">زن</option>
                </select>
                <AppInput
                  type="number"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  placeholder="حداقل سن"
                  className="app-input text-xs"
                />
                <AppInput
                  type="number"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  placeholder="حداکثر سن"
                  className="app-input text-xs"
                />
              </div>
              <select value={jobCategory} onChange={(e) => setJobCategory(e.target.value)} className="app-select w-full text-xs">
                {JOB_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <AppInput
                type="number"
                min={5}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="زمان تقریبی کل (دقیقه)"
                className="app-input text-xs"
              />
              <PathwayStationEditor rooms={rooms} stations={stations} onChange={setStations} disabled={busy} />
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={busy} className="primary-button flex-1 justify-center">
                  {editing ? "ذخیره ویرایش" : "ثبت در کتابخانه"}
                </button>
                <button type="button" onClick={closeForm} className="secondary-button">
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}