/*
 File: frontend/src/components/OwnerProfileForm.tsx
 Description: ویرایش پروفایل سلامتجو — نام، تولد، تاهل، آدرس/لوکیشن، عکس
 Parent Dependencies: ResidenceAddressField, PatientPhotoCapture, PersianDateField, api/patients
 */

import { useMemo, useState, type FormEvent } from "react";
import { AppInput } from "@/components/AppInput";
import { PatientPhotoCapture } from "@/components/PatientPhotoCapture";
import { PersianDateField } from "@/components/PersianDateField";
import { ResidenceAddressField } from "@/components/ResidenceAddressField";
import {
  postPatientPortrait,
  updateMyPatientProfile,
  uploadFileBlob,
} from "@/lib/api/patients";
import { buildResidenceFromPatient, parseResidenceAddress } from "@/lib/residence-address";
import { Loader2 } from "lucide-react";
import { MARITAL_STATUS_OPTIONS, normalizeMaritalStatus } from "@/lib/marital-status";
import type { PatientFullDto } from "@/types/clinic";

interface Props {
  patient: PatientFullDto;
  busy: boolean;
  onSaved: (next: Partial<PatientFullDto>) => void;
  onError: (message: string) => void;
}

export function OwnerProfileForm({ patient, busy, onSaved, onError }: Props) {
  const [firstName, setFirstName] = useState(patient.firstName ?? patient.fullName.split(/\s+/)[0] ?? "");
  const [lastName, setLastName] = useState(
    patient.lastName ?? patient.fullName.split(/\s+/).slice(1).join(" ")
  );
  const [birthDate, setBirthDate] = useState(patient.birthDate ?? "");
  const [maritalStatus, setMaritalStatus] = useState(
    () => normalizeMaritalStatus(patient.maritalStatus) ?? ""
  );
  const [residenceRaw, setResidenceRaw] = useState(() =>
    buildResidenceFromPatient({
      homeLat: patient.homeLat,
      homeLon: patient.homeLon,
      homeAddress: patient.homeAddress,
      homePlaque: patient.homePlaque,
      homeUnit: patient.homeUnit,
      homePostalCode: patient.homePostalCode,
    })
  );
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const phoneDisplay = useMemo(() => patient.phone, [patient.phone]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const home = parseResidenceAddress(residenceRaw);
      const applyHome = Boolean(home && Number.isFinite(home.lat) && Number.isFinite(home.lon) && home.address.trim());
      await updateMyPatientProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate || null,
        maritalStatus: maritalStatus || null,
        applyHome,
        homeLat: applyHome ? home!.lat : null,
        homeLon: applyHome ? home!.lon : null,
        homeAddress: applyHome ? home!.address : null,
        homePlaque: applyHome ? home!.plaque : null,
        homeUnit: applyHome ? home!.unit ?? null : null,
        homePostalCode: applyHome ? home!.postalCode ?? null : null,
      });
      onSaved({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        birthDate: birthDate || null,
        maritalStatus: maritalStatus || null,
        homeLat: applyHome ? home!.lat : patient.homeLat,
        homeLon: applyHome ? home!.lon : patient.homeLon,
        homeAddress: applyHome ? home!.address : patient.homeAddress,
        homePlaque: applyHome ? home!.plaque : patient.homePlaque,
        homeUnit: applyHome ? home!.unit ?? null : patient.homeUnit,
        homePostalCode: applyHome ? home!.postalCode ?? null : patient.homePostalCode,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "ذخیره پروفایل انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (dataUrl: string) => {
    if (!patient.serverId) {
      onError("شناسه سرور پرونده یافت نشد.");
      return;
    }
    setPhotoBusy(true);
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const uploaded = await uploadFileBlob(blob, "portrait.jpg", patient.serverId);
      await postPatientPortrait(patient.serverId, uploaded.storageKey);
      onSaved({ photoDataUrl: dataUrl, hasPortrait: true, portraitStorageKey: uploaded.storageKey });
    } catch (err) {
      onError(err instanceof Error ? err.message : "آپلود عکس انجام نشد.");
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={(e) => void save(e)} className="space-y-3">
        <p className="rounded-xl bg-teal-50 p-3 text-[11px] leading-6 text-teal-800">
          موبایل ({phoneDisplay}) کلید ورود است و از اینجا تغییر نمی‌کند. کدملی نیز قفل است.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="app-label">
            نام
            <AppInput required minLength={2} className="app-input mt-1" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="app-label">
            نام‌خانوادگی
            <AppInput required minLength={2} className="app-input mt-1" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
        </div>
        <label className="app-label">
          تاریخ تولد
          <PersianDateField className="mt-1" value={birthDate} onChange={setBirthDate} aria-label="تاریخ تولد" />
        </label>
        <label className="app-label">
          وضعیت تأهل
          <select className="app-input mt-1" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
            <option value="">انتخاب کنید</option>
            {MARITAL_STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="app-label mb-1">آدرس و موقعیت سکونت</p>
          <ResidenceAddressField value={residenceRaw} onChange={setResidenceRaw} />
        </div>
        <button disabled={busy || saving} className="primary-button w-full justify-center" type="submit">
          {(busy || saving) && <Loader2 className="h-4 w-4 animate-spin" />}
          ذخیره پروفایل
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-xs font-semibold text-slate-700">عکس پرونده</p>
        {patient.photoDataUrl && (
          <img src={patient.photoDataUrl} alt="عکس فعلی" className="mb-3 h-28 w-auto rounded-lg border border-slate-200" />
        )}
        {!patient.serverId ? (
          <p className="rounded-lg bg-amber-50 p-3 text-[11px] leading-6 text-amber-900">
            شناسه سرور پرونده هنوز آماده نیست؛ صفحه را تازه کنید و دوباره عکس بگیرید.
          </p>
        ) : (
          <PatientPhotoCapture
            patientName={patient.fullName}
            busy={photoBusy}
            onConfirm={(url) => void onPhoto(url)}
          />
        )}
      </div>
    </div>
  );
}
