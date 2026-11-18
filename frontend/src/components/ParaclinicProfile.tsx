import React, { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  FileUp,
  FlaskConical,
  ListChecks,
  ShieldAlert,
  Smartphone,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import type { ClinicSnapshot, PatientFullDto } from "@/types/clinic";
import { ResultAttachment } from "./ResultAttachment";
import type { LabMetricItem } from "@/types/clinic";
import {
  createChestXraySvgDataUrl,
  createEcgWaveformSvgDataUrl,
  toFaDigits,
} from "@/lib/persian";

type ParaclinicSection = "queue" | "tracker" | "upload";

interface ParaclinicProfileProps {
  snapshot: ClinicSnapshot;
  onSwitchToPatientMobile: (patientId: number) => void;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  embedded?: boolean;
  initialSection?: ParaclinicSection;
  onSectionChange?: (section: ParaclinicSection) => void;
}

export function ParaclinicProfile({
  snapshot,
  onSwitchToPatientMobile,
  onAction,
  busy,
  initialSection = "queue",
  onSectionChange,
  embedded = false,
}: ParaclinicProfileProps) {
  const [section, setLocalSection] = useState<ParaclinicSection>(initialSection);
  const setSection = (next: ParaclinicSection) => { setLocalSection(next); onSectionChange?.(next); };
  const [deptFilter, setDeptFilter] = useState<"ALL" | "LAB" | "ECG" | "RADIO">(
    "ALL"
  );

  // Collect paraclinic station items across all patients
  const paraclinicItems = useMemo(() => {
    const items: Array<{
      patient: PatientFullDto;
      station: PatientFullDto["stations"][number];
    }> = [];

    for (const p of snapshot.patients) {
      for (const st of p.stations) {
        if (st.category === "paraclinic") {
          if (deptFilter === "ALL" || st.roomCode === deptFilter) {
            items.push({ patient: p, station: st });
          }
        }
      }
    }
    const weight = (st: PatientFullDto["stations"][number]) => st.status === "in_progress" ? 0 : st.status === "waiting" || st.status === "checked_in" ? 1 : st.status === "sample_taken" ? 2 : st.status === "completed" ? 4 : 3;
    return items.sort((a, b) => {
      if (weight(a.station) !== weight(b.station)) return weight(a.station) - weight(b.station);
      const ra = a.station.queueRank || Number.MAX_SAFE_INTEGER, rb = b.station.queueRank || Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return (a.station.enteredQueueAt ? new Date(a.station.enteredQueueAt).getTime() : 0) - (b.station.enteredQueueAt ? new Date(b.station.enteredQueueAt).getTime() : 0);
    });
  }, [snapshot.patients, deptFilter]);

  // Upload Form State (default to Maryam Tabesh who has Lab sample_taken & is at ECG!)
  const [uploadPatientId, setUploadPatientId] = useState<number>(
    snapshot.patients[0]?.id ?? 1
  );
  const [uploadRoomCode, setUploadRoomCode] = useState<"LAB" | "ECG" | "RADIO">(
    "ECG"
  );
  const [uploadTitle, setUploadTitle] = useState("");
  const [summaryStatus, setSummaryStatus] = useState<
    "نرمال" | "نیازمند توجه پزشک"
  >("نرمال");
  const [interpretation, setInterpretation] = useState("");
  const [metrics, setMetrics] = useState<LabMetricItem[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [statusBanner, setStatusBanner] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [fileReading, setFileReading] = useState(false);

  const selectedUploadPatient =
    snapshot.patients.find((p) => p.id === uploadPatientId) ??
    snapshot.patients[0];

  const loadPresetForDept = (code: "LAB" | "ECG" | "RADIO", _patientName: string) => {
    setUploadRoomCode(code);
    setUploadTitle(({ LAB: "گزارش آزمایشگاه تشخیص طبی", ECG: "نوار قلب ۱۲ لید", RADIO: "گزارش تصویربرداری" })[code]);
    setInterpretation(""); setMetrics([]); setAttachmentUrl(""); setFileName(""); setSummaryStatus("نرمال"); setUploadError("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError("حجم فایل باید حداکثر ۵ مگابایت باشد."); e.target.value = ""; return; }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") { setUploadError("فقط فایل PDF یا تصویر قابل بارگذاری است."); return; }
    setUploadError(""); setFileReading(true); setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") setAttachmentUrl(reader.result); setFileReading(false); };
    reader.onerror = () => { setUploadError("خواندن فایل انجام نشد."); setFileReading(false); };
    reader.readAsDataURL(file);
  };

  const handleTrackerStatusChange = async (
    patient: PatientFullDto,
    stationId: number,
    newStatus: "in_progress" | "sample_taken" | "completed"
  ) => {
    await onAction({
      action: "UPDATE_PARACLINIC_STATUS",
      patientId: patient.id,
      stationId,
      newStatus,
    });
    if (newStatus === "sample_taken") {
      setStatusBanner(
        `وضعیت «${patient.fullName}» به «نمونه‌گیری انجام شد / در حال آماده‌سازی جواب» تغییر یافت و سلامتجو بدون توقف به ایستگاه متخصص بعدی هدایت شد!`
      );
    } else {
      setStatusBanner(`وضعیت تست «${patient.fullName}» با موفقیت به‌روزرسانی شد.`);
    }
    setTimeout(() => setStatusBanner(""), 5000);
  };

  const handleQuickUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadPatient || fileReading) return;
    if (!uploadTitle.trim() || !interpretation.trim()) { setUploadError("عنوان و تفسیر گزارش را وارد کنید."); return; }

    const matchingSt = selectedUploadPatient.stations.find(
      (s) => s.roomCode === uploadRoomCode && s.status !== "completed"
    ) ?? selectedUploadPatient.stations.find((s) => s.roomCode === uploadRoomCode);

    await onAction({
      action: "UPLOAD_PARACLINIC_RESULT",
      patientId: selectedUploadPatient.id,
      stationId: matchingSt?.id ?? null,
      roomCode: uploadRoomCode,
      title: uploadTitle,
      resultType:
        uploadRoomCode === "LAB"
          ? "lab_panel"
          : uploadRoomCode === "ECG"
            ? "ecg_trace"
            : "imaging",
      operatorName:
        uploadRoomCode === "LAB"
          ? "علیرضا محمدی (آزمایشگاه)"
          : uploadRoomCode === "ECG"
            ? "پریسا نادری (نوار قلب)"
            : "واحد تصویربرداری دیجیتال",
      summaryStatus,
      metrics,
      interpretation,
      attachmentUrl: attachmentUrl || null,
      fileName,
    });

    setStatusBanner(
      `نتیجه «${uploadTitle}» مستقیماً در پرونده لحظه‌ای «${selectedUploadPatient.fullName}» آپلود شد و هم‌اکنون در پنل متخصصین و پرونده سلامتجو قابل مشاهده است!`
    );
    setTimeout(() => setStatusBanner(""), 5500);
  };

  return (
    <div className="module-content space-y-5">
      {/* Right-hand RTL Paraclinic Sidebar */}
      

      {/* Main Paraclinic Workspace */}
      <section className="min-w-0 space-y-5">
        <div className="module-toolbar">
          <div className={embedded ? "hidden" : "section-tabs"}>{([['queue', 'صف تشخیصی'], ['tracker', 'پیگیری تست‌ها'], ['upload', 'ثبت و بارگذاری نتیجه']] as const).map(([id, title]) => <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => setSection(id)}>{title}</button>)}</div>
          <select aria-label="بخش تشخیصی" className="app-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value as typeof deptFilter)}><option value="ALL">همه بخش‌های تشخیصی</option><option value="LAB">آزمایشگاه</option><option value="ECG">نوار قلب</option><option value="RADIO">تصویربرداری</option></select>
        </div>

        {uploadError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{uploadError}</div>}
        {statusBanner && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900">
            {statusBanner}
          </div>
        )}

        {/* ================= 1. DEPARTMENT QUEUE ================= */}
        {section === "queue" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h1 className="text-lg font-extrabold text-slate-900">
              صف پذیرش بخش‌های تشخیصی (آزمایشگاه، نوار قلب، تصویربرداری)
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              لیست سلامتجویانی که در مسیر روزانه‌شان نوبت انجام تست تشخیصی دارند
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {paraclinicItems.map(({ patient: p, station: st }) => (
                <div
                  key={st.id}
                  className={`rounded-2xl border p-4 ${
                    st.status === "checked_in" || st.status === "waiting"
                      ? "border-teal-400 bg-teal-50/40"
                      : st.status === "sample_taken"
                        ? "border-amber-300 bg-amber-50/40"
                        : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                        {st.roomName}
                      </span>
                      <h3 className="mt-1.5 text-sm font-extrabold text-slate-900">
                        {p.fullName}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          ({toFaDigits(p.age)} سال)
                        </span>
                      </h3>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        st.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : st.status === "sample_taken"
                            ? "bg-amber-100 text-amber-900"
                            : st.status === "checked_in"
                              ? "bg-teal-600 text-white"
                              : st.status === "waiting"
                                ? "bg-sky-600 text-white"
                                : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {st.status === "completed"
                        ? "تکمیل و جواب آپلود شد"
                        : st.status === "sample_taken"
                          ? "نمونه‌گیری شد • در انتظار آپلود جواب"
                          : st.status === "checked_in"
                            ? "حضور پشت درب واحد"
                            : st.status === "waiting"
                              ? "در نوبت پذیرش بخش"
                              : "در ایستگاه قبلی"}
                    </span>
                  </div>

                  {p.allergies.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-800">
                      <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                      حساسیت ثبت‌شده:{" "}
                      {p.allergies.map((a) => a.substance).join("، ")}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {st.status !== "completed" &&
                      st.status !== "sample_taken" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handleTrackerStatusChange(
                              p,
                              st.id,
                              "sample_taken"
                            )
                          }
                          className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                        >
                          نمونه‌گیری انجام شد (هدایت به مطب بعدی)
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={() => {
                        setUploadPatientId(p.id);
                        loadPresetForDept(
                          (st.roomCode as "LAB" | "ECG" | "RADIO") || "LAB",
                          p.fullName
                        );
                        setSection("upload");
                      }}
                      className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
                    >
                      آپلود سریع جواب / تصویر
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 2. SAMPLE & TEST TRACKER ================= */}
        {section === "tracker" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h1 className="text-lg font-extrabold text-slate-900">
              ردیاب وضعیت انجام تست و هدایت بدون توقف سلامتجو (Sample & Test Tracker)
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              با تغییر وضعیت به «نمونه‌گیری انجام شد / در حال آماده‌سازی جواب»، سلامتجو
              در سالن انتظار آزمایشگاه معطل نمی‌ماند و سیستم او را به سمت مطب متخصص
              بعدی هدایت می‌کند.
            </p>

            <div className="mt-4 space-y-3">
              {paraclinicItems.map(({ patient: p, station: st }) => (
                <div
                  key={st.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">
                        {p.fullName}
                      </span>
                      <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-900">
                        {st.roomName}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      وضعیت فعلی:{" "}
                      <strong className="text-slate-900">
                        {st.status === "sample_taken"
                          ? "نمونه‌گیری انجام شد / در حال آماده‌سازی جواب"
                          : st.status === "completed"
                            ? "تکمیل نهایی"
                            : st.status === "in_progress"
                              ? "در حال انجام تست"
                              : "در صف انتظار"}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy || st.status === "completed"}
                      onClick={() =>
                        handleTrackerStatusChange(p, st.id, "in_progress")
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      شروع انجام تست
                    </button>

                    <button
                      type="button"
                      disabled={
                        busy ||
                        st.status === "sample_taken" ||
                        st.status === "completed"
                      }
                      onClick={() =>
                        handleTrackerStatusChange(p, st.id, "sample_taken")
                      }
                      className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-amber-700 disabled:opacity-40"
                    >
                      نمونه‌گیری انجام شد / هدایت سلامتجو به ایستگاه بعد
                    </button>

                    <button
                      type="button"
                      onClick={() => onSwitchToPatientMobile(p.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      پرونده سلامتجو
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 3. QUICK RESULT UPLOADER ================= */}
        {section === "upload" && selectedUploadPatient && (
          <form
            onSubmit={handleQuickUploadSubmit}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h1 className="text-lg font-extrabold text-slate-900">
                  آپلود سریع نتایج آزمایش و تصاویر تشخیصی در پرونده لحظه‌ای
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  به محض بارگذاری، نتیجه هم در پنل پزشک متخصص و هم در تب «پرونده
                  امروز» پرونده سلامتجو قابل مشاهده است.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  انتخاب سلامتجو
                </label>
                <select
                  value={selectedUploadPatient.id}
                  onChange={(e) => {
                    const nextId = Number(e.target.value);
                    setUploadPatientId(nextId);
                    const nextP = snapshot.patients.find(
                      (x) => x.id === nextId
                    );
                    if (nextP) {
                      loadPresetForDept(uploadRoomCode, nextP.fullName);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold"
                >
                  {snapshot.patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.qrToken})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  بخش تشخیصی صادرکننده جواب
                </label>
                <select
                  value={uploadRoomCode}
                  onChange={(e) =>
                    loadPresetForDept(
                      e.target.value as "LAB" | "ECG" | "RADIO",
                      selectedUploadPatient.fullName
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold"
                >
                  <option value="LAB">آزمایشگاه تشخیص طبی (پانل خون/PDF)</option>
                  <option value="ECG">نوار قلب ۱۲ لید (تصویر اسکن نوار قلب)</option>
                  <option value="RADIO">تصویربرداری و رادیولوژی دیجیتال</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  وضعیت خلاصه بالینی
                </label>
                <select
                  value={summaryStatus}
                  onChange={(e) =>
                    setSummaryStatus(
                      e.target.value as "نرمال" | "نیازمند توجه پزشک"
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold"
                >
                  <option value="نرمال">نرمال (در محدوده مرجع)</option>
                  <option value="نیازمند توجه پزشک">
                    نیازمند توجه پزشک (دارای شاخص خارج از نرمال)
                  </option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                عنوان گزارش / آزمایش
              </label>
              <input
                type="text"
                required
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                تفسیر فنی / شرح گزارش پاراکلینیک
              </label>
              <textarea
                rows={2}
                required
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">شاخص‌های گزارش (اختیاری)</span><button type="button" className="secondary-button" onClick={() => setMetrics((prev) => [...prev, { parameter: '', value: '', unit: '', normalRange: '', abnormal: false }])}>+ افزودن شاخص</button></div>
              {metrics.map((m, index) => <div key={index} className="mt-3 flex flex-wrap items-center gap-2">{(['parameter', 'value', 'unit', 'normalRange'] as const).map((key) => <input key={key} required className="min-w-20 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" placeholder={({parameter:'نام شاخص',value:'مقدار نتیجه',unit:'واحد',normalRange:'بازه مرجع'})[key]} value={m[key]} onChange={(e) => setMetrics((prev) => prev.map((row, i) => i === index ? {...row, [key]: e.target.value} : row))} />)}<label className="flex items-center gap-1 text-[10px] text-rose-600"><input type="checkbox" checked={Boolean(m.abnormal)} onChange={(e) => setMetrics((prev) => prev.map((row, i) => i === index ? {...row, abnormal: e.target.checked} : row))} />خارج از محدوده</label><button type="button" onClick={() => setMetrics((prev) => prev.filter((_, i) => i !== index))} className="px-2 text-rose-500" aria-label="حذف شاخص">×</button></div>)}
            </div>
            {/* File Attachment Dropzone + Preview */}
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <UploadCloud className="h-6 w-6 text-teal-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      بارگذاری فایل PDF جواب آزمایش یا تصویر اسکن‌شده نوار قلب
                    </div>
                    <div className="text-[11px] text-slate-500">
                      فایل انتخابی: <span dir="ltr">{fileName || "فایلی انتخاب نشده"}</span>
                    </div>
                  </div>
                </div>

                <label className="cursor-pointer rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900">
                  انتخاب فایل از سیستم
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {attachmentUrl && (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <ResultAttachment url={attachmentUrl} title={uploadTitle || "پیش‌نمایش فایل"} fileName={fileName} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={busy || fileReading}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-xs font-extrabold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                ثبت نهایی و انتشار آنی در پنل متخصصین و پرونده سلامتجو
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
