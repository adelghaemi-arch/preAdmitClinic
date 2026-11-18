import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  MessageSquareText,
  Phone,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { listOtpDemoLogins, normalizePhone, requestOtp, verifyOtp } from "@/lib/auth";
import { writeStoredRole } from "@/lib/viewer";
import { ensureClientDb } from "@/lib/client-db";
import { toFaDigits } from "@/lib/persian";

type Step = "phone" | "code";

export function LoginForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [targetName, setTargetName] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const demos = useMemo(() => {
    try {
      ensureClientDb();
      return listOtpDemoLogins();
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft > 0]);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const sendCode = (rawPhone: string) => {
    setError("");
    const result = requestOtp(rawPhone);
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      sendCode(phone);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (value: string) => {
    const result = verifyOtp(phone, value);
    if (!result.ok || !result.user) {
      setError(result.error ?? "ورود انجام نشد.");
      return;
    }
    writeStoredRole(result.role === "supervisor" ? "supervisor" : "owner");
    const target = result.patientId ? `/?patient=${result.patientId}` : "/";
    navigate(target, { replace: true });
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      handleVerify(code);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (demoPhone: string) => {
    setPhone(demoPhone);
    sendCode(demoPhone);
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

      {step === "phone" ? (
        <form onSubmit={handleSend} className="mt-6 space-y-4">
          <label htmlFor="otp-phone" className="app-label">
            شماره موبایل
          </label>
          <div className="relative !mt-2">
            <Phone className="absolute top-3 right-3 h-4 w-4 text-slate-400" />
            <input
              id="otp-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09123456789"
              className="app-input !pr-10 text-left font-mono tracking-wider"
            />
          </div>
          <p className="-mt-2 text-[10px] leading-5 text-slate-400">
            کد تأیید برای سلامتجویانی که شماره‌شان در فهرست کلینیک ثبت است (و ناظران سازمانی) صادر می‌شود.
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
          <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
              <MessageSquareText className="h-4 w-4" />
              پیامک نمایشی نبض کلینیک
            </div>
            <p className="mt-2 text-xs leading-7 text-teal-900">
              {targetName} عزیز، کد تأیید ورود شما:
            </p>
            <div dir="ltr" className="mt-1 text-center font-mono text-3xl font-extrabold tracking-[0.35em] text-teal-800">
              {toFaDigits(demoCode)}
            </div>
            <p className="mt-1 text-center text-[10px] text-teal-700">
              (در نسخه واقعی این کد پیامک می‌شود؛ اینجا برای تست نمایش داده شده است)
            </p>
          </div>

          <label htmlFor="otp-code" className="app-label">
            کد پنج‌رقمی ارسال‌شده به {toFaDigits(normalizePhone(phone))}
          </label>
          <input
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
              const next = e.target.value.replace(/[^\d۰-۹٠-٩]/g, "").slice(0, 5);
              setCode(next);
              if (normalizePhone(next).length === 5) {
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

          <button disabled={loading || normalizePhone(code).length !== 5} type="submit" className="primary-button w-full justify-center !py-3 disabled:opacity-50">
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

      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
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
    </div>
  );
}
