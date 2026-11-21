/*
 File: frontend/src/lib/__tests__/uc-own-01-login-demo.test.tsx
 Description: UC-OWN-01 — مخفی بودن دمو لاگین و پیامک نمایشی وقتی FixedOtp خاموش است
 Parent Dependencies: LoginForm, lib/auth
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchOtpFixedModeEnabled = vi.fn();
const requestOtp = vi.fn();

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    fetchOtpFixedModeEnabled: (...args: unknown[]) => fetchOtpFixedModeEnabled(...args),
    requestOtp: (...args: unknown[]) => requestOtp(...args),
  };
});

import { LoginForm } from "@/components/LoginForm";

describe("UC-OWN-01", () => {
  beforeEach(() => {
    fetchOtpFixedModeEnabled.mockReset();
    requestOtp.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("با FixedOtp فعال، بلوک ورود سریع دیده می‌شود", async () => {
    fetchOtpFixedModeEnabled.mockResolvedValue(true);
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("otp-demo-quick-login")).toBeTruthy();
    expect(screen.queryByText("ادمین کل")).toBeNull();
  });

  it("با حالت پیامک (FixedOtp خاموش)، بلوک ورود سریع دیده نمی‌شود", async () => {
    fetchOtpFixedModeEnabled.mockResolvedValue(false);
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );
    await waitFor(() => expect(fetchOtpFixedModeEnabled).toHaveBeenCalled());
    expect(screen.queryByTestId("otp-demo-quick-login")).toBeNull();
    expect(screen.queryByText("ورود سریع با شماره سلامتجویان نمایشی", { exact: false })).toBeNull();
  });

  it("با FixedOtp، پس از درخواست OTP پیامک نمایشی با کد دیده می‌شود", async () => {
    fetchOtpFixedModeEnabled.mockResolvedValue(true);
    requestOtp.mockResolvedValue({
      ok: true,
      code: "12345",
      targetName: "کاربر نمونه",
      expiresInSec: 120,
    });
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );
    await screen.findByTestId("otp-demo-quick-login");
    fireEvent.change(screen.getByLabelText("شماره موبایل"), { target: { value: "09120000001" } });
    fireEvent.click(screen.getByRole("button", { name: /ارسال کد تأیید/ }));
    expect(await screen.findByTestId("otp-demo-sms-preview")).toBeTruthy();
    expect(screen.getByText("پیامک نمایشی نفس")).toBeTruthy();
    expect(screen.queryByTestId("otp-sms-sent-hint")).toBeNull();
  });

  it("با حالت پیامک، پس از درخواست OTP پیامک نمایشی دیده نمی‌شود", async () => {
    fetchOtpFixedModeEnabled.mockResolvedValue(false);
    requestOtp.mockResolvedValue({
      ok: true,
      code: null,
      targetName: "",
      expiresInSec: 120,
    });
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );
    await waitFor(() => expect(fetchOtpFixedModeEnabled).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText("شماره موبایل"), { target: { value: "09120000001" } });
    fireEvent.click(screen.getByRole("button", { name: /ارسال کد تأیید/ }));
    expect(await screen.findByTestId("otp-sms-sent-hint")).toBeTruthy();
    expect(screen.queryByTestId("otp-demo-sms-preview")).toBeNull();
    expect(screen.queryByText("پیامک نمایشی نفس")).toBeNull();
  });
});
