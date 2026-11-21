/*
 File: frontend/src/components/LoginForm.tsx
 Description: فرم ورود OTP؛ دمو سریع فقط وقتی FixedOtp فعال است
 Parent Dependencies: lib/auth.ts, lib/persian.ts, lib/viewer.ts
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AppInput } from "@/components/AppInput";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  MessageSquareText,
  Phone,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  fetchOtpFixedModeEnabled,
  listOtpDemoLogins,
  normalizePhone,
  requestOtp,
  selectOtpIdentity,
  shouldShowOtpDemoQuickLogin,
  shouldShowOtpDemoSmsPreview,
  verifyOtp,
} from "@/lib/auth";
import type { OtpIdentityCandidate } from "@/lib/api/auth";
import { IranDigitField } from "@/components/IranDigitField";
import { writeStoredRole } from "@/lib/viewer";
import { toFaDigits, toLatinDigits } from "@/lib/persian";
import type { WorkspaceRole } from "@/types/clinic";

type Step = "phone" | "code" | "select";

export function LoginForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [targetName, setTargetName] = useState("");
  const [candidates, setCandidates] = useState<OtpIdentityCandidate[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fixedOtpEnabled, setFixedOtpEnabled] = useState<boolean | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const demos = useMemo(() => listOtpDemoLogins(), []);
  const showDemoQuickLogin = shouldShowOtpDemoQuickLogin(fixedOtpEnabled);
  const showDemoSmsPreview = shouldShowOtpDemoSmsPreview(fixedOtpEnabled, demoCode);

  useEffect(() => {
    let cancelled = false;
    void fetchOtpFixedModeEnabled().then((enabled) => {
      if (!cancelled) setFixedOtpEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft > 0]);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const sendCode = async (rawPhone: string) => {
    setError("");
    const result = await requestOtp(rawPhone);
    if (!result.ok) {
      setError(result.error ?? "ارسال کد انجام نشد.");
      return false;
    }
    setDemoCode(result.code ?? "");
    setTargetName(result.targetName ?? "");
    setSecondsLeft(result.expiresInSec ?? 120);
    setCode("");
    setStep("code");
    return true;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendCode(phone);
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = (result: { user?: { primaryRole: WorkspaceRole }; role?: WorkspaceRole }) => {
    if (!result.user) return;
    const role = (result.role ?? (result.user.primaryRole as WorkspaceRole)) || "owner";
    writeStoredRole(role);
    navigate("/", { replace: true });
  };

  const handleVerify = async (value: string) => {
    const result = await verifyOtp(phone, value);
    if (!result.ok) {
      setError(result.error ?? "ورود انجام نشد.");
      return;
    }
    // چند کدملی روی یک شماره — انتخاب قبل از داشبورد
    if (result.needsSelection && result.candidates?.length) {
      setCandidates(result.candidates);
      setStep("select");
      return;
    }
    if (!result.user) {
      setError(result.error ?? "ورود انجام نشد.");
      return;
    }
    completeLogin(result);
  };

  const handleSelect = async (nationalId: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await selectOtpIdentity(nationalId);
      if (!result.ok || !result.user) {
        setError(result.error ?? "انتخاب هویت انجام نشد.");
        return;
      }
      completeLogin(result);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await handleVerify(code);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (demoPhone: string) => {
    setPhone(demoPhone);
    void sendCode(demoPhone);
  };

  return (
    <div>
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf6f0] text-[#287957]">
        <ShieldCheck className="h-6 w-6 stroke-[1.5]" />
      </span>
      <h2 className="text-xl font-bold text-slate-700">ورود با کد تأیید (OTP)</h2>
      <p className="mt-2 text-xs leading-7 text-slate-400">
        شماره موبایل خود را وارد کنید تا کد تأیید برایتان ارسال شود؛ بدون نام کاربری و بدون گذرواژه.
      </p>

      {step === "select" ? (
        <div className="mt-6 space-y-4">
          <p className="text-xs leading-7 text-slate-500">
            چند نفر با این شماره ثبت شده‌اند. کدملی و نام خود را انتخاب کنید.
          </p>
          <div className="space-y-2">
            {candidates.map((c) => (
              <button
                key={c.nationalId}
                type="button"
                disabled={loading}
                onClick={() => void handleSelect(c.nationalId)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-right transition hover:border-teal-300 hover:bg-teal-50/40 disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf6f0] text-[#287957]">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-700">
                    {c.firstName} {c.lastName}
                  </span>
                  <span dir="ltr" className="mt-0.5 block font-mono text-[11px] text-slate-400">
                    {toFaDigits(c.nationalId)}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-600">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setError("");
              setCandidates([]);
            }}
            className="flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-teal-700"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            تغییر شماره موبایل
          </button>
        </div>
      ) : step === "phone" ? (
        <form onSubmit={handleSend} className="mt-6 space-y-4">
          <label htmlFor="otp-phone" className="app-label">
            شماره موبایل
          </label>
          <div className="relative !mt-2">
            <Phone className="absolute top-3 right-3 h-4 w-4 text-slate-400" />
            <IranDigitField
              id="otp-phone"
              name="phone"
              kind="mobile"
              autoComplete="tel"
              required
              value={phone}
              onValueChange={setPhone}
              placeholder="09123456789"
              className="app-input !pr-10 text-left font-mono tracking-wider"
            />
          </div>
          <p className="-mt-2 text-[10px] leading-5 text-slate-400">
            کد تأیید برای افراد معرفی‌شده در قرارداد سازمانی، پروندهٔ کلینیک، یا ناظران صادر می‌شود.
          </p>
          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-600">
              {error}
            </p>
          )}
          <button disabled={loading} type="submit" className="primary-button !mt-6 w-full justify-center !py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
            ارسال کد تأیید
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifySubmit} className="mt-6 space-y-4">
          {showDemoSmsPreview ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4" data-testid="otp-demo-sms-preview">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                <MessageSquareText className="h-4 w-4" />
                پیامک نمایشی نفس
              </div>
              <p className="mt-2 text-xs leading-7 text-teal-900">
                {targetName || "کاربر"} عزیز، کد تأیید ورود شما:
              </p>
              <div dir="ltr" className="mt-1 text-center font-mono text-3xl font-extrabold tracking-[0.35em] text-teal-800">
                {toFaDigits(demoCode)}
              </div>
              <p className="mt-1 text-center text-[10px] text-teal-700">
                (در نسخه واقعی این کد پیامک می‌شود؛ اینجا برای تست نمایش داده شده است)
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4" data-testid="otp-sms-sent-hint">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <MessageSquareText className="h-4 w-4 text-teal-700" />
                کد تأیید پیامک شد
              </div>
              <p className="mt-2 text-[11px] leading-6 text-slate-500">
                کد پنج‌رقمی به شماره {toFaDigits(normalizePhone(phone))} ارسال شد؛ آن را وارد کنید.
              </p>
            </div>
          )}

          <label htmlFor="otp-code" className="app-label">
            کد پنج‌رقمی ارسال‌شده به {toFaDigits(normalizePhone(phone))}
          </label>
          <AppInput
            ref={codeInputRef}
            id="otp-code"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            dir="ltr"
            maxLength={5}
            value={code}
            onChange={(e) => {
              const next = toLatinDigits(e.target.value).replace(/\D/g, "").slice(0, 5);
              setCode(next);
              // طول کد OTP جدا از نرمال‌سازی موبایل است
              if (next.length === 5) {
                setLoading(true);
                setError("");
                try {
                  handleVerify(next);
                } finally {
                  setLoading(false);
                }
              }
            }}
            placeholder="•••••"
            className="app-input text-center font-mono text-2xl font-bold tracking-[0.4em]"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {secondsLeft > 0 ? (
                <>اعتبار کد: {toFaDigits(Math.floor(secondsLeft / 60))}:{toFaDigits(String(secondsLeft % 60).padStart(2, "0"))}</>
              ) : (
                <span className="text-rose-500">کد منقضی شده است</span>
              )}
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={() => sendCode(phone)}
              className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              ارسال دوباره کد
            </button>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-600">
              {error}
            </p>
          )}

          <button disabled={loading || code.length !== 5} type="submit" className="primary-button w-full justify-center !py-3 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
            تأیید و ورود
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setError("");
              setCode("");
            }}
            className="flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-teal-700"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            تغییر شماره موبایل
          </button>
        </form>
      )}

      {showDemoQuickLogin && (
        <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3" data-testid="otp-demo-quick-login">
          <div className="text-[10px] leading-6 text-slate-400">
            ورود سریع با شماره سلامتجویان نمایشی (کد تأیید بلافاصله نمایش داده می‌شود):
          </div>
          <div className="mt-2 grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
            {demos.map((item) => (
              <button
                key={`${item.kind}-${item.phone}`}
                type="button"
                disabled={loading}
                onClick={() => quickLogin(item.phone)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-right text-[10px] leading-4 text-slate-600 transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-50"
              >
                <span className="block font-semibold">{item.name}</span>
                <span className="mt-0.5 block text-[9px] text-slate-400">{item.hint}</span>
                <span dir="ltr" className="mt-0.5 block font-mono text-[9px] text-teal-700">
                  {item.phone}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
