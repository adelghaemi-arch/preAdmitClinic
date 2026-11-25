/*
 File: frontend/my/src/lib/__tests__/app-input-digits.test.tsx
 Description: AppInput — placeholder و value با digits=fa فارسی می‌شوند
 Parent Dependencies: components/AppInput.tsx
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppInput, AppTextarea } from "@/components/AppInput";

describe("AppInput Persian digits", () => {
  it("با digits=fa، placeholder لاتین را فارسی نشان می‌دهد", () => {
    render(<AppInput aria-label="موبایل" placeholder="09123456789" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("موبایل")).toHaveAttribute("placeholder", "۰۹۱۲۳۴۵۶۷۸۹");
  });

  it("با digits=latin، placeholder لاتین می‌ماند", () => {
    render(
      <AppInput
        aria-label="آدرس"
        digits="latin"
        placeholder="http://127.0.0.1:8080"
        value=""
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("آدرس")).toHaveAttribute("placeholder", "http://127.0.0.1:8080");
  });

  it("value لاتین را با digits=fa فارسی نمایش می‌دهد", () => {
    render(<AppInput aria-label="کد" value="12345" onChange={() => {}} />);
    expect(screen.getByLabelText("کد")).toHaveValue("۱۲۳۴۵");
  });

  it("AppTextarea هم placeholder را فارسی می‌کند", () => {
    render(<AppTextarea aria-label="یادداشت" placeholder="خط 1" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("یادداشت")).toHaveAttribute("placeholder", "خط ۱");
  });
});
