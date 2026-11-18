import { HeartPulse, Check } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";

export function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8f5] px-4 py-10">
      <div className="grid w-full max-w-[900px] overflow-hidden rounded-3xl border border-[#e2eae4] bg-white shadow-xl shadow-teal-950/5 md:grid-cols-2">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#1d5545] p-9 text-white md:flex">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                <HeartPulse className="h-6 w-6 stroke-[1.5]" />
              </span>
              <div>
                <strong className="block text-lg font-bold">نبض کلینیک</strong>
                <span className="mt-1 block text-[10px] text-white/40">نسخه نمایشی — تمام‌کلاینت</span>
              </div>
            </div>
            <h1 className="mt-14 text-[28px] leading-[1.8] font-bold">
              یک حساب کاربری،
              <br />
              یک کلینیک یکپارچه.
            </h1>
            <p className="mt-4 text-xs leading-8 text-white/50">
              ورود فقط با شماره موبایل و کد تأیید پیامکی (OTP پنج‌رقمی) انجام می‌شود؛ بدون نام کاربری و بدون گذرواژه.
              داده‌ها به‌صورت کامل در مرورگر شما ذخیره می‌شوند و هیچ سرور یا دیتابیسی لازم نیست.
            </p>
          </div>
          <div className="relative z-10 mt-12 space-y-3">
            {["ورود با کد تأیید پیامکی (OTP پنج‌رقمی)", "پرونده مشترک در تمام مراحل درمان", "داده نمایشی ذخیره‌شده در مرورگر"].map(
              (t) => (
                <div key={t} className="flex items-center gap-2 text-[11px] text-white/70">
                  <Check className="h-3.5 w-3.5 text-[#a7d5b3]" />
                  {t}
                </div>
              )
            )}
          </div>
          <span className="pointer-events-none absolute -bottom-36 -left-36 h-96 w-96 rounded-full border-[50px] border-white/[0.025]" />
        </section>
        <section className="p-7 md:p-10">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
