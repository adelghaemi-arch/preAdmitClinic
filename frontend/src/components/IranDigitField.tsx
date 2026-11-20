/*
 File: frontend/src/components/IranDigitField.tsx
 Description: ورودی هویت ایران — sanitize هنگام تایپ و paste (فاصله/junk حذف)
 Parent Dependencies: AppInput, person-identity
 */

import { forwardRef, type ClipboardEvent, type ChangeEvent } from "react";
import { AppInput, type AppInputProps } from "@/components/AppInput";
import {
  clampIranDigitInput,
  iranDigitMaxLength,
  type IranDigitKind,
} from "@/lib/person-identity";

export type IranDigitFieldProps = Omit<AppInputProps, "type" | "inputMode" | "maxLength" | "onChange"> & {
  kind: IranDigitKind;
  value: string;
  onValueChange: (next: string) => void;
};

export const IranDigitField = forwardRef<HTMLInputElement, IranDigitFieldProps>(function IranDigitField(
  { kind, value, onValueChange, onPaste, ...rest },
  ref,
) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onValueChange(clampIranDigitInput(kind, e.target.value));
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    // پیست خام را می‌گیریم تا maxLength مرورگر قبل از sanitize قطع نکند
    e.preventDefault();
    const text = e.clipboardData.getData("text") ?? "";
    onValueChange(clampIranDigitInput(kind, text));
    onPaste?.(e);
  };

  return (
    <AppInput
      {...rest}
      ref={ref}
      type="tel"
      inputMode="numeric"
      dir={rest.dir ?? "ltr"}
      maxLength={iranDigitMaxLength(kind)}
      value={value}
      onChange={handleChange}
      onPaste={handlePaste}
      className={rest.className}
    />
  );
});
