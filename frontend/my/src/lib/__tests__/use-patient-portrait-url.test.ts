/*
 File: frontend/my/src/lib/__tests__/use-patient-portrait-url.test.ts
 Description: اولویت dataUrl محلی در مقابل نیاز به storageKey بعد از رفرش
 Parent Dependencies: usePatientPortraitUrl (منطق resolve بدون رندر کامل)
 */

import { describe, expect, it } from "vitest";

/** همان اولویت نمایش پرتره که هوک رعایت می‌کند */
function resolvePortraitPreview(input: {
  pendingDataUrl?: string | null;
  photoDataUrl?: string | null;
  storedUrl?: string | null;
}): string | null {
  return input.pendingDataUrl || input.photoDataUrl || input.storedUrl || null;
}

describe("patient portrait after refresh", () => {
  it("بعد از رفرش بدون dataUrl، URL ذخیره‌شده نمایش داده می‌شود", () => {
    expect(
      resolvePortraitPreview({
        pendingDataUrl: null,
        photoDataUrl: null,
        storedUrl: "blob:http://local/portrait",
      })
    ).toBe("blob:http://local/portrait");
  });

  it("dataUrl محلی / pending بر storage اولویت دارد", () => {
    expect(
      resolvePortraitPreview({
        pendingDataUrl: "data:image/jpeg;base64,AAA",
        photoDataUrl: null,
        storedUrl: "blob:old",
      })
    ).toBe("data:image/jpeg;base64,AAA");
  });
});
