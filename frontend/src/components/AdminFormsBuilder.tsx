import { AppInput, AppTextarea } from "@/components/AppInput";
import { TerminologyConceptPicker } from "@/components/TerminologyConceptPicker";
import React, { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type {
  ClinicSnapshot,
  FormConceptKind,
  FormDefinition,
  FormItemDefinition,
  FormSectionDefinition,
} from "@/types/clinic";
import { itemCodingIssues, validateFormDefinitionCoding } from "@/lib/form-engine";
import { toFaDigits } from "@/lib/persian";
import {
  mergeCodingFromConcept,
  resolveCuiLabels,
} from "@/lib/terminology-lookup";
import { randomUUID } from "@/lib/uuid";

interface AdminFormsBuilderProps {
  snapshot: ClinicSnapshot;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}

const CONCEPT_KINDS: FormConceptKind[] = [
  "demographics",
  "symptom",
  "history",
  "family",
  "lifestyle",
  "screening",
  "behavior",
];

function emptyItem(sectionId: string, sortOrder: number): FormItemDefinition {
  return {
    id: `item_${randomUUID()}`,
    sectionId,
    code: `CUSTOM_${randomUUID().slice(0, 8).toUpperCase()}`,
    labelFa: "سؤال جدید",
    inputType: "yn_unk",
    required: true,
    sortOrder,
    visibilityRules: [],
    helpText: "",
    notesPolicy: "required_if_yes",
    prefillFromPatient: null,
    readOnlyIfPrefill: false,
    selectOptions: null,
    coding: {
      snomed: [],
      loinc: [],
      icd10: [],
      umls: [],
      conceptKind: "symptom",
      aiTags: [],
      redFlagOnYes: false,
    },
  };
}

function splitCodes(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function AdminFormsBuilder({ snapshot, onAction, busy }: AdminFormsBuilderProps) {
  const forms = snapshot.forms ?? [];
  const [selectedId, setSelectedId] = useState(forms[0]?.id ?? "");
  const selected = forms.find((f) => f.id === selectedId) ?? forms[0] ?? null;
  const [draft, setDraft] = useState<FormDefinition | null>(null);
  const [sectionId, setSectionId] = useState("");
  const [notice, setNotice] = useState("");

  React.useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    setDraft(structuredClone(selected));
    setSectionId((prev) => (selected.sections.some((s) => s.id === prev) ? prev : selected.sections[0]?.id ?? ""));
  }, [selected]);

  const sectionItems = useMemo(() => {
    if (!draft || !sectionId) return [];
    return draft.items.filter((i) => i.sectionId === sectionId).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [draft, sectionId]);

  const codingIssues = useMemo(
    () => (draft ? validateFormDefinitionCoding(draft) : []),
    [draft]
  );

  const saveDraft = async () => {
    if (!draft) return;
    if (draft.status === "published" && codingIssues.length) {
      setNotice(
        `ذخیره ممکن نیست: ${toFaDigits(codingIssues.length)} آیتم بدون کدینگ کامل (UMLS + SNOMED/LOINC/ICD-10).`
      );
      return;
    }
    await onAction({ action: "UPSERT_FORM", form: draft });
    setNotice("فرم ذخیره شد.");
    setSelectedId(draft.id);
  };

  const publish = async (bump: boolean) => {
    if (!draft) return;
    const issues = validateFormDefinitionCoding(draft);
    if (issues.length) {
      setNotice(
        `انتشار ممکن نیست: ${toFaDigits(issues.length)} آیتم بدون کدینگ کامل. ابتدا UMLS و حداقل یک کد استاندارد را تکمیل کنید.`
      );
      return;
    }
    await onAction({
      action: "UPSERT_FORM",
      form: { ...draft, status: draft.status === "published" && bump ? "draft" : draft.status },
    });
    await onAction({ action: "PUBLISH_FORM", formId: draft.id, bumpVersion: bump });
    setNotice(bump ? "نسخه جدید منتشر شد." : "فرم منتشر شد.");
  };

  const createForm = async () => {
    const id = `form_${randomUUID()}`;
    const secId = `sec_${randomUUID()}`;
    const form: FormDefinition = {
      id,
      code: `custom_form_${Date.now()}`,
      title: "فرم جدید پیش‌پذیرش",
      version: 1,
      status: "draft",
      sortOrder: forms.length + 1,
      warningText: "این پرسشنامه برای غربالگری و پشتیبانی تصمیم پزشک است و جایگزین معاینه نیست.",
      targetAudience: { gender: "همه", ageMin: null, ageMax: null, maritalStatuses: [] },
      sections: [
        {
          id: secId,
          formId: id,
          code: "SEC_1",
          title: "بخش ۱",
          sortOrder: 1,
          timeWindowHint: "",
          guideText: "",
        },
      ],
      items: [emptyItem(secId, 1)],
    };
    await onAction({ action: "UPSERT_FORM", form });
    setSelectedId(id);
    setNotice("فرم جدید ساخته شد.");
  };

  const moveItem = async (itemId: string, dir: -1 | 1) => {
    if (!draft || !sectionId) return;
    const ordered = [...sectionItems];
    const idx = ordered.findIndex((i) => i.id === itemId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ordered.length) return;
    const ids = ordered.map((i) => i.id);
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    const nextItems = draft.items.map((item) => {
      if (item.sectionId !== sectionId) return item;
      const order = ids.indexOf(item.id);
      return order >= 0 ? { ...item, sortOrder: order + 1 } : item;
    });
    setDraft({ ...draft, items: nextItems });
    await onAction({
      action: "REORDER_FORM_ITEMS",
      formId: draft.id,
      sectionId,
      orderedItemIds: ids,
    });
  };

  if (!draft) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void createForm()}
          className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3 py-2 text-xs text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          افزودن فرم جدید
        </button>
        <p className="text-xs text-slate-500">هنوز فرمی در کاتالوگ نیست.</p>
      </div>
    );
  }

  const currentSection: FormSectionDefinition | undefined = draft.sections.find((s) => s.id === sectionId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">مدیریت فرم‌های پیش‌پذیرش</h2>
          <p className="text-[11px] text-slate-500">جامعه هدف، آیتم‌ها، جابجایی و کدینگ استاندارد برای تحلیل AI</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createForm()}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          فرم جدید
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {forms.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedId(f.id)}
            className={`rounded-full border px-3 py-1.5 text-[10px] ${
              f.id === draft.id ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {f.title} · v{toFaDigits(f.version)} · {f.status}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <label className="text-[11px] text-slate-600">
          عنوان
          <AppInput
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs"
          />
        </label>
        <label className="text-[11px] text-slate-600">
          کد فرم
          <AppInput
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs"
          />
        </label>
        <label className="text-[11px] text-slate-600">
          جامعه هدف (جنسیت)
          <select
            value={draft.targetAudience.gender}
            onChange={(e) =>
              setDraft({
                ...draft,
                targetAudience: {
                  ...draft.targetAudience,
                  gender: e.target.value as FormDefinition["targetAudience"]["gender"],
                },
              })
            }
            className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs"
          >
            <option value="مرد">مرد</option>
            <option value="زن">زن</option>
            <option value="همه">همه</option>
          </select>
        </label>
        <label className="text-[11px] text-slate-600">
          وضعیت
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as FormDefinition["status"] })}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs"
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label className="text-[11px] text-slate-600 md:col-span-2">
          متن هشدار بالای فرم
          <AppTextarea
            value={draft.warningText}
            onChange={(e) => setDraft({ ...draft, warningText: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {draft.sections
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSectionId(sec.id)}
              className={`rounded-full border px-3 py-1.5 text-[10px] ${
                sec.id === sectionId ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200 bg-white"
              }`}
            >
              {sec.title}
            </button>
          ))}
        <button
          type="button"
          className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-[10px]"
          onClick={() => {
            const id = `sec_${randomUUID()}`;
            const sec: FormSectionDefinition = {
              id,
              formId: draft.id,
              code: `SEC_${draft.sections.length + 1}`,
              title: `بخش ${draft.sections.length + 1}`,
              sortOrder: draft.sections.length + 1,
              timeWindowHint: "",
              guideText: "",
            };
            setDraft({ ...draft, sections: [...draft.sections, sec] });
            setSectionId(id);
          }}
        >
          + بخش
        </button>
      </div>

      {currentSection && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 grid gap-2 md:grid-cols-2">
            <label className="text-[11px] text-slate-600">
              عنوان بخش
              <AppInput
                value={currentSection.title}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    sections: draft.sections.map((s) =>
                      s.id === currentSection.id ? { ...s, title: e.target.value } : s
                    ),
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs"
              />
            </label>
            <label className="text-[11px] text-slate-600">
              راهنما
              <AppInput
                value={currentSection.guideText}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    sections: draft.sections.map((s) =>
                      s.id === currentSection.id ? { ...s, guideText: e.target.value } : s
                    ),
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs"
              />
            </label>
          </div>

          <div className="space-y-3">
            {sectionItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <AppInput
                    value={item.labelFa}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        items: draft.items.map((i) =>
                          i.id === item.id ? { ...i, labelFa: e.target.value } : i
                        ),
                      })
                    }
                    className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white p-2 text-xs"
                  />
                  <div className="flex gap-1">
                    <button type="button" className="rounded-lg border bg-white p-1.5" onClick={() => void moveItem(item.id, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="rounded-lg border bg-white p-1.5" onClick={() => void moveItem(item.id, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600"
                      onClick={() => setDraft({ ...draft, items: draft.items.filter((i) => i.id !== item.id) })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  <label className="text-[10px] text-slate-500">
                    کد آیتم
                    <AppInput
                      value={item.code}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) => (i.id === item.id ? { ...i, code: e.target.value } : i)),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[11px]"
                    />
                  </label>
                  <label className="text-[10px] text-slate-500">
                    نوع
                    <select
                      value={item.inputType}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) =>
                            i.id === item.id ? { ...i, inputType: e.target.value as FormItemDefinition["inputType"] } : i
                          ),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[11px]"
                    >
                      <option value="yn_unk">بله/خیر/نمی‌دانم</option>
                      <option value="text">متن</option>
                      <option value="number">عدد</option>
                      <option value="date">تاریخ</option>
                      <option value="select">انتخابی</option>
                      <option value="province_city">استان / شهر</option>
                    </select>
                  </label>
                  <label className="text-[10px] text-slate-500">
                    conceptKind
                    <select
                      value={
                        (item.coding.conceptKind as string) === "demo"
                          ? "demographics"
                          : item.coding.conceptKind
                      }
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) =>
                            i.id === item.id
                              ? { ...i, coding: { ...i.coding, conceptKind: e.target.value as FormConceptKind } }
                              : i
                          ),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[11px]"
                    >
                      {CONCEPT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k === "demographics" ? "demographics (اطلاعات پایه)" : k}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-[10px] text-slate-500">
                    <input
                      type="checkbox"
                      checked={Boolean(item.coding.redFlagOnYes)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) =>
                            i.id === item.id
                              ? { ...i, coding: { ...i.coding, redFlagOnYes: e.target.checked } }
                              : i
                          ),
                        })
                      }
                    />
                    redFlagOnYes
                  </label>
                  {(() => {
                    const issues = itemCodingIssues({
                      ...item,
                      coding: {
                        ...item.coding,
                        umls: item.coding.umls ?? [],
                      },
                    });
                    return issues.length ? (
                      <p className="md:col-span-4 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-900">
                        کدینگ ناقص: {issues.join(" · ")}
                      </p>
                    ) : null;
                  })()}
                  <TerminologyConceptPicker
                    disabled={busy}
                    onPick={(concept) =>
                      setDraft({
                        ...draft,
                        items: draft.items.map((i) =>
                          i.id === item.id
                            ? {
                                ...i,
                                coding: mergeCodingFromConcept(
                                  {
                                    ...i.coding,
                                    umls: i.coding.umls ?? [],
                                    snomed: i.coding.snomed ?? [],
                                    loinc: i.coding.loinc ?? [],
                                    icd10: i.coding.icd10 ?? [],
                                  },
                                  concept
                                ),
                              }
                            : i
                        ),
                      })
                    }
                  />
                  <label className="text-[10px] text-slate-500 md:col-span-2">
                    SNOMED (با ویرگول)
                    <AppInput
                      value={(item.coding.snomed ?? []).join(",")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  coding: {
                                    ...i.coding,
                                    snomed: splitCodes(e.target.value),
                                  },
                                }
                              : i
                          ),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[11px]"
                      dir="ltr"
                    />
                  </label>
                  <label className="text-[10px] text-slate-500">
                    LOINC
                    <AppInput
                      value={(item.coding.loinc ?? []).join(",")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  coding: {
                                    ...i.coding,
                                    loinc: splitCodes(e.target.value),
                                  },
                                }
                              : i
                          ),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[11px]"
                      dir="ltr"
                    />
                  </label>
                  <label className="text-[10px] text-slate-500">
                    ICD-10
                    <AppInput
                      value={(item.coding.icd10 ?? []).join(",")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  coding: {
                                    ...i.coding,
                                    icd10: splitCodes(e.target.value),
                                  },
                                }
                              : i
                          ),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[11px]"
                      dir="ltr"
                    />
                  </label>
                  <label className="text-[10px] text-slate-500 md:col-span-2">
                    UMLS CUI (با ویرگول)
                    <AppInput
                      value={(item.coding.umls ?? []).join(",")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  coding: {
                                    ...i.coding,
                                    umls: splitCodes(e.target.value),
                                  },
                                }
                              : i
                          ),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[11px]"
                      dir="ltr"
                      placeholder="C0006826"
                    />
                    {(item.coding.umls ?? []).length > 0 && (
                      <p className="mt-1 text-[10px] leading-relaxed text-teal-800" dir="rtl">
                        {resolveCuiLabels(item.coding.umls ?? []).join(" · ")}
                      </p>
                    )}
                  </label>
                  <label className="text-[10px] text-slate-500 md:col-span-2">
                    aiTags (با ویرگول)
                    <AppInput
                      value={(item.coding.aiTags ?? []).join(",")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  coding: {
                                    ...i.coding,
                                    aiTags: splitCodes(e.target.value),
                                  },
                                }
                              : i
                          ),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[11px]"
                      dir="ltr"
                    />
                  </label>
                  <label className="text-[10px] text-slate-500 md:col-span-2">
                    شرط نمایش: فقط متأهل/ازدواج‌کرده
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={item.visibilityRules.some((r) => r.field === "maritalStatus")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  visibilityRules: e.target.checked
                                    ? [{ field: "maritalStatus", op: "in", value: ["متأهل", "ازدواج‌کرده"] }]
                                    : i.visibilityRules.filter((r) => r.field !== "maritalStatus"),
                                }
                              : i
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="text-[10px] text-slate-500 md:col-span-2">
                    شرط نمایش: سن ≥ ۵۰
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={item.visibilityRules.some((r) => r.field === "age")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  visibilityRules: e.target.checked
                                    ? [
                                        ...i.visibilityRules.filter((r) => r.field !== "age"),
                                        { field: "age", op: "gte", value: 50 },
                                      ]
                                    : i.visibilityRules.filter((r) => r.field !== "age"),
                                }
                              : i
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            onClick={() =>
              setDraft({
                ...draft,
                items: [...draft.items, emptyItem(currentSection.id, sectionItems.length + 1)],
              })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            افزودن آیتم
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveDraft()}
          className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs text-white"
        >
          <Save className="h-3.5 w-3.5" />
          ذخیره پیش‌نویس
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void publish(false)}
          className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3 py-2 text-xs text-white"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          انتشار
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void publish(true)}
          className="inline-flex items-center gap-1 rounded-xl border border-teal-700 px-3 py-2 text-xs text-teal-800"
        >
          انتشار نسخه جدید
        </button>
      </div>

      {codingIssues.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
          <p className="font-medium">
            {toFaDigits(codingIssues.length)} آیتم بدون کدینگ کامل — انتشار تا تکمیل UMLS و حداقل یک کد استاندارد ممکن نیست.
          </p>
          <ul className="mt-1 max-h-28 list-disc space-y-0.5 overflow-auto pr-4 text-[10px]">
            {codingIssues.slice(0, 12).map((row) => (
              <li key={row.itemCode}>
                <span dir="ltr">{row.itemCode}</span> — {row.labelFa}: {row.problems.join(" · ")}
              </li>
            ))}
            {codingIssues.length > 12 && (
              <li>و {toFaDigits(codingIssues.length - 12)} مورد دیگر…</li>
            )}
          </ul>
        </div>
      )}

      {notice && (
        <p className={`text-xs ${codingIssues.length && notice.includes("ممکن نیست") ? "text-amber-800" : "text-emerald-700"}`}>
          {notice}
        </p>
      )}
    </div>
  );
}
