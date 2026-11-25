/*
 File: frontend/my/src/components/ClinicSettingsPanel.tsx
 Description: تنظیمات بیمارستان — لوکیشن، پشتیبانی، طوبی SOAP (UserInfo/خط) و تست پیامک (UC-ADM-21/23)
 Parent Dependencies: LocationPickerPopup, AppInput, clinic-sms-test, api/clinics, api/sms-templates
 */

import { useEffect, useMemo, useState } from "react";
import { MapPin, MessageSquare, Phone, Save, Send } from "lucide-react";
import { AppInput, AppTextarea } from "@/components/AppInput";
import { LocationPickerPopup, type LocationPickResult } from "@/components/LocationPickerPopup";
import { normalizePhone, readUsername } from "@/lib/auth";
import { apiGetOtpMode } from "@/lib/api/auth";
import {
  DEFAULT_TOUBA_SOAP_URL,
  fetchToubaAccount,
  mergeToubaSenderOptions,
  testClinicSms,
  uploadClinicLogo,
  type ClinicSmsProvider,
  type ClinicSmsTestModeApi,
} from "@/lib/api/clinics";
import { useStorageObjectUrl } from "@/hooks/useStorageObjectUrl";
import { fetchSmsTemplates, type ApiSmsCampaignTemplateDto } from "@/lib/api/sms-templates";
import {
  allowedSmsTestModes,
  isSmsTestModeAllowed,
  resolveSmsTestProviderParam,
  smsTestModeLabel,
  smsTestUnavailableHint,
  type ClinicSmsTestMode,
  type ClinicSmsTestTarget,
} from "@/lib/clinic-sms-test";
import type { ClinicLocation, ClinicSnapshot } from "@/types/clinic";

interface Props {
  snapshot: ClinicSnapshot;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  busy?: boolean;
}

const SECRET_MASK = "••••••••";

export function ClinicSettingsPanel({ snapshot, onAction, busy }: Props) {
  const clinic = snapshot.platform.clinics.find((c) => c.isCurrentTenant) ?? snapshot.platform.clinics[0];
  const loc: ClinicLocation = snapshot.clinicLocation;
  const savedSmsProvider = (clinic?.smsProvider as ClinicSmsProvider) || "None";

  const [name, setName] = useState(clinic?.name ?? "");
  const [logoKey, setLogoKey] = useState(clinic?.logoStorageKey ?? null);
  const { url: logoUrl } = useStorageObjectUrl(logoKey);
  const [logoBusy, setLogoBusy] = useState(false);
  const [city, setCity] = useState(clinic?.city ?? loc.city ?? "");
  const [address, setAddress] = useState(loc.address ?? "");
  const [supportPhone, setSupportPhone] = useState(clinic?.preAdmitSupportPhone ?? "");
  const [lat, setLat] = useState(loc.lat);
  const [lon, setLon] = useState(loc.lon);
  const [mapOpen, setMapOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [smsProvider, setSmsProvider] = useState<ClinicSmsProvider>(
    (clinic?.smsProvider as ClinicSmsProvider) || "None"
  );
  const [configTarget, setConfigTarget] = useState<ClinicSmsTestTarget>(() => {
    const p = (clinic?.smsProvider as ClinicSmsProvider) || "None";
    if (p === "Kavenegar") return "Kavenegar";
    return "Touba";
  });
  const [smsSenderNumber, setSmsSenderNumber] = useState(clinic?.smsSenderNumber ?? "");
  const [kavenegarApiKey, setKavenegarApiKey] = useState(
    clinic?.kavenegarApiKeySet ? SECRET_MASK : clinic?.kavenegarApiKey ?? ""
  );
  const [kavenegarOtpTemplate, setKavenegarOtpTemplate] = useState(clinic?.kavenegarOtpTemplate ?? "");
  const [toubaUsername, setToubaUsername] = useState(clinic?.toubaUsername ?? "");
  const [toubaPassword, setToubaPassword] = useState(clinic?.toubaPasswordSet ? SECRET_MASK : "");
  const [toubaSendUrl, setToubaSendUrl] = useState(
    clinic?.toubaSendUrl ?? DEFAULT_TOUBA_SOAP_URL
  );
  const [toubaOtpMessageTemplate, setToubaOtpMessageTemplate] = useState(
    clinic?.toubaOtpMessageTemplate ?? "کد ورود شما: {code}"
  );
  const [toubaCredit, setToubaCredit] = useState<number | null>(null);
  const [toubaSenderOptions, setToubaSenderOptions] = useState<string[]>([]);
  const [toubaAccountBusy, setToubaAccountBusy] = useState(false);
  const [toubaAccountError, setToubaAccountError] = useState("");

  const [testTarget, setTestTarget] = useState<ClinicSmsTestTarget>(() => {
    if (savedSmsProvider === "Kavenegar") return "Kavenegar";
    return "Touba";
  });

  const effectiveTestProvider: ClinicSmsTestTarget =
    savedSmsProvider === "Touba" || savedSmsProvider === "Kavenegar"
      ? savedSmsProvider
      : testTarget;

  const allowedModes = useMemo(
    () => allowedSmsTestModes(effectiveTestProvider),
    [effectiveTestProvider]
  );
  const [testMode, setTestMode] = useState<ClinicSmsTestMode>("AppTemplate");
  const [testMobile, setTestMobile] = useState(() => {
    try {
      return normalizePhone(readUsername() ?? "") || "";
    } catch {
      return "";
    }
  });
  const [testPlainBody, setTestPlainBody] = useState("پیامک تست از تنظیمات بیمارستان");
  const [testProviderTemplate, setTestProviderTemplate] = useState(clinic?.kavenegarOtpTemplate ?? "otp");
  const [testToken1, setTestToken1] = useState("تست");
  const [testToken2, setTestToken2] = useState("");
  const [testToken3, setTestToken3] = useState("");
  const [templates, setTemplates] = useState<ApiSmsCampaignTemplateDto[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testError, setTestError] = useState("");
  const [fixedOtpEnabled, setFixedOtpEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    setLogoKey(clinic?.logoStorageKey ?? null);
  }, [clinic?.logoStorageKey]);

  useEffect(() => {
    if (!isSmsTestModeAllowed(effectiveTestProvider, testMode) && allowedModes[0]) {
      setTestMode(allowedModes[0]);
    }
  }, [effectiveTestProvider, allowedModes, testMode]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [list, mode] = await Promise.all([fetchSmsTemplates(true), apiGetOtpMode()]);
        if (cancelled) return;
        setTemplates(list);
        if (!templateId && list[0]?.id) setTemplateId(list[0].id);
        setFixedOtpEnabled(mode.fixedOtpEnabled === true);
      } catch {
        /* فهرست قالب / otp mode اختیاری است تا UI تنظیمات نشکند */
        try {
          const mode = await apiGetOtpMode();
          if (!cancelled) setFixedOtpEnabled(mode.fixedOtpEnabled === true);
        } catch {
          if (!cancelled) setFixedOtpEnabled(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMapConfirm = (result: LocationPickResult) => {
    setLat(result.lat);
    setLon(result.lon);
    if (result.address.trim()) setAddress(result.address.trim());
    setMapOpen(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await onAction({
        action: "UPDATE_CLINIC_PROFILE",
        name,
        city,
        address,
        latitude: lat,
        longitude: lon,
        preAdmitSupportPhone: supportPhone.trim(),
        smsProvider,
        smsSenderNumber: smsSenderNumber.trim(),
        kavenegarApiKey,
        kavenegarOtpTemplate: kavenegarOtpTemplate.trim(),
        toubaUsername: toubaUsername.trim(),
        toubaPassword,
        toubaSendUrl: toubaSendUrl.trim(),
        toubaOtpMessageTemplate: toubaOtpMessageTemplate.trim(),
      });
      setMessage("مشخصات بیمارستان و پیامک ذخیره شد.");
      if (kavenegarApiKey && kavenegarApiKey !== SECRET_MASK) setKavenegarApiKey(SECRET_MASK);
      if (toubaPassword && toubaPassword !== SECRET_MASK) setToubaPassword(SECRET_MASK);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره ناموفق بود.");
    } finally {
      setSaving(false);
    }
  };

  const runSmsTest = async () => {
    setTesting(true);
    setTestError("");
    setTestMessage("");
    try {
      // تست درگاه مستقل از FixedOtp است؛ FixedOtp فقط OTP/کمپین تولید را قطع می‌کند
      if (!isSmsTestModeAllowed(effectiveTestProvider, testMode)) {
        throw new Error(
          smsTestUnavailableHint(savedSmsProvider, testTarget) ?? "این حالت برای درگاه تست مجاز نیست."
        );
      }
      const providerParam = resolveSmsTestProviderParam(savedSmsProvider, testTarget);
      if (!providerParam) {
        throw new Error("درگاه ارسال تست را انتخاب کنید.");
      }

      const mobile = normalizePhone(testMobile);
      const body: {
        mode: ClinicSmsTestModeApi;
        mobile: string;
        templateId?: string;
        plainBody?: string;
        providerTemplateName?: string;
        tokens?: string[];
        provider?: "Touba" | "Kavenegar";
      } = { mode: testMode, mobile, provider: providerParam };

      if (testMode === "AppTemplate") {
        if (!templateId) throw new Error("قالب آماده را انتخاب کنید.");
        body.templateId = templateId;
      } else if (testMode === "Direct") {
        body.plainBody = testPlainBody.trim();
      } else {
        body.providerTemplateName = testProviderTemplate.trim();
        body.tokens = [testToken1, testToken2, testToken3].map((t) => t.trim()).filter(Boolean);
      }

      const result = await testClinicSms(body);
      setTestMessage(result.detail || "ارسال تست انجام شد.");
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "ارسال تست ناموفق بود.");
    } finally {
      setTesting(false);
    }
  };

  const unavailable = smsTestUnavailableHint(savedSmsProvider, testTarget);

  const loadToubaAccount = async () => {
    setToubaAccountBusy(true);
    setToubaAccountError("");
    try {
      const info = await fetchToubaAccount();
      setToubaCredit(info.credit);
      const options = mergeToubaSenderOptions(smsSenderNumber, info.senderNumbers ?? []);
      setToubaSenderOptions(options);
      if (!smsSenderNumber.trim() && options[0]) setSmsSenderNumber(options[0]);
    } catch (e) {
      setToubaAccountError(e instanceof Error ? e.message : "بارگذاری حساب طوبی ناموفق بود.");
    } finally {
      setToubaAccountBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-extrabold text-slate-800">تنظیمات بیمارستان / کلینیک</h2>
        <p className="mt-1 text-[11px] leading-6 text-slate-500">
          نام و موقعیت برای صفحهٔ نقشه راه، شماره پشتیبانی پیش‌پذیرش، و سامانه پیامک (کاوه‌نگار یا طوبی).
        </p>
      </div>

      <label className="app-label text-[11px]">
        نام بیمارستان
        <AppInput value={name} onChange={(e) => setName(e.target.value)} className="app-input mt-1" placeholder="مثلاً عدل" />
      </label>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <div className="text-[11px] font-semibold text-slate-700">لوگوی بیمارستان (برای PDF پرسشنامه)</div>
        <p className="mt-1 text-[10px] leading-5 text-slate-500">PNG، JPEG یا WebP — حداکثر ۲ مگابایت.</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="لوگوی بیمارستان" className="h-14 w-auto max-w-[7rem] object-contain" />
          ) : (
            <div className="flex h-14 w-28 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-[10px] text-slate-400">
              بدون لوگو
            </div>
          )}
          <label className="secondary-button cursor-pointer !py-1.5 !text-[11px]">
            {logoBusy ? "در حال آپلود…" : "انتخاب فایل"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={busy || logoBusy || saving}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void (async () => {
                  setLogoBusy(true);
                  setError("");
                  try {
                    const res = await uploadClinicLogo(file);
                    setLogoKey(res.logoStorageKey);
                    await onAction({ action: "SET_CLINIC_LOGO", logoStorageKey: res.logoStorageKey });
                    setMessage("لوگوی بیمارستان ذخیره شد.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "آپلود لوگو ناموفق بود.");
                  } finally {
                    setLogoBusy(false);
                  }
                })();
              }}
            />
          </label>
        </div>
      </div>

      <label className="app-label text-[11px]">
        شهر
        <AppInput value={city} onChange={(e) => setCity(e.target.value)} className="app-input mt-1" />
      </label>

      <label className="app-label text-[11px]">
        آدرس نمایشی
        <AppInput value={address} onChange={(e) => setAddress(e.target.value)} className="app-input mt-1" />
      </label>

      <label className="app-label text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-teal-600" />
          شماره پشتیبانی پیش‌پذیرش
        </span>
        <AppInput
          value={supportPhone}
          onChange={(e) => setSupportPhone(e.target.value)}
          className="app-input mt-1 font-mono tracking-wide"
          dir="ltr"
          inputMode="tel"
          placeholder="02191000000"
        />
        <span className="mt-1.5 block text-[10px] leading-5 text-slate-400">
          اگر شمارهٔ کاربر در سیستم نباشد، در صفحه ورود به او گفته می‌شود با این شماره تماس بگیرد.
        </span>
      </label>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600">
        مختصات: {Number.isFinite(lat) ? lat.toFixed(5) : "—"} ، {Number.isFinite(lon) ? lon.toFixed(5) : "—"}
      </div>

      <button type="button" onClick={() => setMapOpen(true)} className="secondary-button w-full justify-center">
        <MapPin className="h-4 w-4" />
        انتخاب موقعیت روی نقشه
      </button>

      <div className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
        <div className="flex items-center gap-2 text-[12px] font-bold text-teal-900">
          <MessageSquare className="h-4 w-4" />
          سامانه پیامک
        </div>
        <p className="text-[10px] leading-5 text-teal-800/80">
          اول اعتبارنامه را ذخیره و تست کنید؛ بعد «درگاه فعال» را برای OTP/کمپین روشن کنید. طوبی = SOAP نمونه
          tsms.ir/soapWSDL.
        </p>
        {fixedOtpEnabled && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-5 text-amber-900">
            <span className="font-semibold">OTP دمو:</span>{" "}
            <code className="font-mono">Auth:FixedOtp</code> فعال است — ورود با کد ثابت و بدون SMS تولیدی؛{" "}
            <span className="font-semibold">تست درگاه پایین همچنان مجاز است</span>. OTP/کمپین واقعی فقط وقتی FixedOtp خالی
            باشد از درگاه فعال می‌روند.
          </p>
        )}

        <label className="app-label text-[11px]">
          درگاه فعال (OTP/کمپین تولید — وقتی FixedOtp خالی است)
          <select
            value={smsProvider}
            onChange={(e) => setSmsProvider(e.target.value as ClinicSmsProvider)}
            className="app-select mt-1 w-full text-xs"
            data-testid="sms-active-provider"
          >
            <option value="None">غیرفعال (فقط FixedOtp)</option>
            <option value="Kavenegar">کاوه‌نگار</option>
            <option value="Touba">طوبی</option>
          </select>
        </label>

        <label className="app-label text-[11px]">
          پیکربندی اعتبارنامه
          <select
            value={configTarget}
            onChange={(e) => setConfigTarget(e.target.value as ClinicSmsTestTarget)}
            className="app-select mt-1 w-full text-xs"
            data-testid="sms-config-target"
          >
            <option value="Touba">طوبی</option>
            <option value="Kavenegar">کاوه‌نگار</option>
          </select>
        </label>

        <label className="app-label text-[11px]">
          شماره / خط ارسال
          {configTarget === "Touba" && toubaSenderOptions.length > 0 ? (
            <select
              value={smsSenderNumber}
              onChange={(e) => setSmsSenderNumber(e.target.value)}
              className="app-select mt-1 w-full font-mono text-xs"
              dir="ltr"
              data-testid="touba-sender-select"
            >
              {toubaSenderOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          ) : (
            <AppInput
              value={smsSenderNumber}
              onChange={(e) => setSmsSenderNumber(e.target.value)}
              className="app-input mt-1 font-mono"
              dir="ltr"
              placeholder="1000…"
            />
          )}
        </label>

        {configTarget === "Kavenegar" && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-semibold text-slate-700">تنظیمات کاوه‌نگار</div>
            <label className="app-label text-[11px]">
              ApiKey
              <AppInput
                value={kavenegarApiKey}
                onChange={(e) => setKavenegarApiKey(e.target.value)}
                className="app-input mt-1 font-mono"
                dir="ltr"
                type="password"
                autoComplete="off"
                placeholder="خالی = بدون تغییر / fallback از سرور"
              />
            </label>
            <label className="app-label text-[11px]">
              نام قالب OTP
              <AppInput
                value={kavenegarOtpTemplate}
                onChange={(e) => setKavenegarOtpTemplate(e.target.value)}
                className="app-input mt-1 font-mono"
                dir="ltr"
                placeholder="otp"
              />
            </label>
            <p className="text-[10px] text-slate-400">قالب دعوت گروهی از پنل ادمین کل (ProviderTemplateName) می‌آید.</p>
          </div>
        )}

        {configTarget === "Touba" && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-semibold text-slate-700">تنظیمات طوبی (TSMS)</div>
            <label className="app-label text-[11px]">
              نام کاربری
              <AppInput
                value={toubaUsername}
                onChange={(e) => setToubaUsername(e.target.value)}
                className="app-input mt-1 font-mono"
                dir="ltr"
                autoComplete="off"
              />
            </label>
            <label className="app-label text-[11px]">
              رمز عبور
              <AppInput
                value={toubaPassword}
                onChange={(e) => setToubaPassword(e.target.value)}
                className="app-input mt-1 font-mono"
                dir="ltr"
                type="password"
                autoComplete="off"
                placeholder="خالی یا •••• = بدون تغییر"
              />
            </label>
            <label className="app-label text-[11px]">
              آدرس سرویس SOAP
              <AppInput
                value={toubaSendUrl}
                onChange={(e) => setToubaSendUrl(e.target.value)}
                className="app-input mt-1 font-mono text-[11px]"
                dir="ltr"
                placeholder={DEFAULT_TOUBA_SOAP_URL}
              />
            </label>
            <p className="text-[10px] text-slate-400">
              پیش‌فرض نمونه: <span className="font-mono">{DEFAULT_TOUBA_SOAP_URL}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="app-btn-secondary text-[11px]"
                disabled={toubaAccountBusy || busy}
                onClick={() => void loadToubaAccount()}
                data-testid="touba-load-account"
              >
                {toubaAccountBusy ? "در حال بارگذاری…" : "بارگذاری خطوط و اعتبار"}
              </button>
              {toubaCredit != null && (
                <span className="text-[11px] font-semibold text-teal-800" data-testid="touba-credit">
                  اعتبار: {toubaCredit.toLocaleString("fa-IR")} ریال
                </span>
              )}
            </div>
            {toubaAccountError && (
              <p className="text-[10px] text-rose-600" data-testid="touba-account-error">
                {toubaAccountError}
              </p>
            )}
            <label className="app-label text-[11px]">
              متن OTP (باید شامل {"{code}"} باشد)
              <AppTextarea
                rows={2}
                value={toubaOtpMessageTemplate}
                onChange={(e) => setToubaOtpMessageTemplate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px] leading-5"
              />
            </label>
            <p className="text-[10px] text-slate-400">
              جای خالی کد را با {"{code}"} بنویسید (مثلاً «کد ورود شما: {"{code}"}»). عدد ثابت مثل ۱۱۱۱۱ باعث
              نامعتبر شدن OTP می‌شود. کمپین/OTP با SOAP sendSms است؛ اول اعتبار را ذخیره کنید، بعد خطوط را از
              UserInfo بارگذاری کنید.
            </p>
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-dashed border-teal-200 bg-white/80 p-3">
          <div className="text-[11px] font-semibold text-teal-900">تست ارسال (قبل از فعال‌سازی)</div>
          <p className="text-[10px] leading-5 text-slate-500">
            از اعتبار <span className="font-semibold">ذخیره‌شده روی سرور</span> استفاده می‌شود. درگاه فعال فعلی:{" "}
            {savedSmsProvider === "None" ? "غیرفعال" : savedSmsProvider === "Touba" ? "طوبی" : "کاوه‌نگار"}. اول ذخیره،
            بعد تست؛ اگر OK بود درگاه فعال را روشن کنید.
          </p>

          {savedSmsProvider === "None" && (
            <label className="app-label text-[11px]">
              ارسال تست از طریق
              <select
                value={testTarget}
                onChange={(e) => setTestTarget(e.target.value as ClinicSmsTestTarget)}
                className="app-select mt-1 w-full text-xs"
                data-testid="sms-test-target"
              >
                <option value="Touba">طوبی</option>
                <option value="Kavenegar">کاوه‌نگار</option>
              </select>
            </label>
          )}

          {unavailable ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800">
              {unavailable}
            </p>
          ) : (
            <>
              <label className="app-label text-[11px]">
                نوع تست
                <select
                  value={testMode}
                  onChange={(e) => setTestMode(e.target.value as ClinicSmsTestMode)}
                  className="app-select mt-1 w-full text-xs"
                  data-testid="sms-test-mode"
                >
                  {allowedModes.map((m) => (
                    <option key={m} value={m}>
                      {smsTestModeLabel(m)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="app-label text-[11px]">
                موبایل مقصد
                <AppInput
                  value={testMobile}
                  onChange={(e) => setTestMobile(e.target.value)}
                  className="app-input mt-1 font-mono"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="0912…"
                  data-testid="sms-test-mobile"
                />
              </label>

              {testMode === "AppTemplate" && (
                <label className="app-label text-[11px]">
                  قالب آمادهٔ سامانه
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="app-select mt-1 w-full text-xs"
                    data-testid="sms-test-app-template"
                  >
                    {templates.length === 0 && <option value="">قالبی یافت نشد</option>}
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {testMode === "Direct" && (
                <label className="app-label text-[11px]">
                  متن پیامک
                  <AppTextarea
                    rows={3}
                    value={testPlainBody}
                    onChange={(e) => setTestPlainBody(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px] leading-5"
                    data-testid="sms-test-plain-body"
                  />
                </label>
              )}

              {testMode === "ProviderTemplate" && (
                <div className="space-y-2">
                  <label className="app-label text-[11px]">
                    نام قالب پنل کاوه‌نگار
                    <AppInput
                      value={testProviderTemplate}
                      onChange={(e) => setTestProviderTemplate(e.target.value)}
                      className="app-input mt-1 font-mono"
                      dir="ltr"
                      data-testid="sms-test-provider-template"
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <AppInput
                      value={testToken1}
                      onChange={(e) => setTestToken1(e.target.value)}
                      className="app-input font-mono text-[11px]"
                      dir="ltr"
                      placeholder="token"
                    />
                    <AppInput
                      value={testToken2}
                      onChange={(e) => setTestToken2(e.target.value)}
                      className="app-input font-mono text-[11px]"
                      dir="ltr"
                      placeholder="token2"
                    />
                    <AppInput
                      value={testToken3}
                      onChange={(e) => setTestToken3(e.target.value)}
                      className="app-input font-mono text-[11px]"
                      dir="ltr"
                      placeholder="token3"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={busy || testing || !!unavailable}
                onClick={() => void runSmsTest()}
                className="secondary-button w-full justify-center"
                data-testid="sms-test-send"
              >
                <Send className="h-4 w-4" />
                {testing ? "در حال ارسال…" : "ارسال تست"}
              </button>
            </>
          )}

          {testError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] text-rose-700">
              {testError}
            </p>
          )}
          {testMessage && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] text-emerald-800">
              {testMessage}
            </p>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700">{error}</p>}
      {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800">{message}</p>}

      <button type="button" disabled={busy || saving || !name.trim()} onClick={() => void save()} className="primary-button w-full justify-center">
        <Save className="h-4 w-4" />
        ذخیره
      </button>

      {mapOpen && (
        <LocationPickerPopup
          initial={{ lat, lon, address }}
          onConfirm={onMapConfirm}
          onClose={() => setMapOpen(false)}
        />
      )}
    </section>
  );
}
