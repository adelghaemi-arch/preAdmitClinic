/*
 File: frontend/src/components/PlatformSmsTemplatesEditor.tsx
 Description: ویرایش قالب‌های پیامک گروهی توسط ادمین کل
 Parent Dependencies: api/sms-templates, AppInput
 */

import { useEffect, useState } from "react";
import { AppInput, AppTextarea } from "@/components/AppInput";
import { fetchSmsTemplates, upsertSmsTemplate, type ApiSmsCampaignTemplateDto } from "@/lib/api/sms-templates";
import { toFaDigits } from "@/lib/persian";

const TOKEN_HINT = "name · invite_token · invite_url · emr_url";

interface Props {
  busy?: boolean;
}

export function PlatformSmsTemplatesEditor({ busy }: Props) {
  const [rows, setRows] = useState<ApiSmsCampaignTemplateDto[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    code: "",
    title: "",
    bodyPreview: "",
    providerTemplateName: "",
    tokenKeys: "name,invite_url",
    requiresEmrUrl: false,
    isActive: true,
    sortOrder: 1,
  });

  const reload = async () => {
    const list = await fetchSmsTemplates(false);
    setRows(list);
    return list;
  };

  useEffect(() => {
    void reload()
      .then((list) => {
        const first = list[0];
        if (first) applyRow(first);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "بارگذاری قالب‌ها ناموفق بود."));
  }, []);

  const applyRow = (row: ApiSmsCampaignTemplateDto) => {
    setSelectedId(row.id);
    setDraft({
      code: row.code,
      title: row.title,
      bodyPreview: row.bodyPreview,
      providerTemplateName: row.providerTemplateName,
      tokenKeys: row.tokenKeys.join(","),
      requiresEmrUrl: row.requiresEmrUrl,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const tokenKeys = draft.tokenKeys
        .split(/[,\s]+/)
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
      const saved = await upsertSmsTemplate({
        id: selectedId || null,
        code: draft.code,
        title: draft.title,
        bodyPreview: draft.bodyPreview,
        providerTemplateName: draft.providerTemplateName,
        tokenKeys,
        requiresEmrUrl: draft.requiresEmrUrl,
        isActive: draft.isActive,
        sortOrder: Number(draft.sortOrder) || 1,
      });
      const list = await reload();
      const next = list.find((r) => r.id === saved.id) ?? saved;
      applyRow(next);
      setMessage("قالب پیامک ذخیره شد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره قالب ناموفق بود.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="text-xs font-semibold text-slate-800">قالب‌های پیامک گروهی</div>
      <p className="text-[11px] leading-5 text-slate-500">
        ادمین کلینیک فقط از این فهرست انتخاب می‌کند. ارسال فقط قالبی کاوه‌نگار است؛ توکن‌های مجاز: {TOKEN_HINT}.
        لینک پرونده (`emr_url`) فعلاً آماده نیست.
      </p>
      <label className="block text-[11px] text-slate-600">
        انتخاب قالب
        <select
          value={selectedId}
          onChange={(e) => {
            const row = rows.find((r) => r.id === e.target.value);
            if (row) applyRow(row);
          }}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px]"
        >
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} ({r.code}){r.isActive ? "" : " — غیرفعال"}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[11px] text-slate-600">
          کد
          <AppInput value={draft.code} onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px]" dir="ltr" />
        </label>
        <label className="block text-[11px] text-slate-600">
          عنوان نمایشی
          <AppInput value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px]" />
        </label>
      </div>
      <label className="block text-[11px] text-slate-600">
        پیش‌نمایش متن (با {"{name}"} / {"{invite_url}"} / …)
        <AppTextarea rows={3} value={draft.bodyPreview} onChange={(e) => setDraft((d) => ({ ...d, bodyPreview: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px] leading-5" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[11px] text-slate-600">
          نام قالب کاوه‌نگار
          <AppInput value={draft.providerTemplateName} onChange={(e) => setDraft((d) => ({ ...d, providerTemplateName: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-[11px]" dir="ltr" />
        </label>
        <label className="block text-[11px] text-slate-600">
          ترتیب توکن‌ها (با کاما)
          <AppInput value={draft.tokenKeys} onChange={(e) => setDraft((d) => ({ ...d, tokenKeys: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-[11px]" dir="ltr" placeholder="invite_token,name" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))} />
          فعال
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={draft.requiresEmrUrl} onChange={(e) => setDraft((d) => ({ ...d, requiresEmrUrl: e.target.checked }))} />
          نیاز به لینک پرونده (`emr_url`)
        </label>
        <label className="inline-flex items-center gap-2">
          ترتیب
          <AppInput type="number" value={String(draft.sortOrder)} onChange={(e) => setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) || 1 }))} className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-[11px]" />
        </label>
        <span className="text-slate-400">{toFaDigits(rows.length)} قالب</span>
      </div>
      {error && <p className="text-[11px] text-rose-700">{error}</p>}
      {message && <p className="text-[11px] text-emerald-700">{message}</p>}
      <button
        type="button"
        disabled={busy || saving || !draft.title.trim() || !draft.code.trim()}
        onClick={() => void save()}
        className="rounded-xl bg-slate-800 px-4 py-2.5 text-[11px] font-medium text-white disabled:opacity-50"
      >
        ذخیره قالب
      </button>
    </div>
  );
}
