/*
 File: frontend/my/src/lib/__tests__/focus-next-field.test.ts
 Description: فوکوس فیلد بعدی با Enter در ظرف preadmit
 Parent Dependencies: focus-next-field
 */

import { describe, expect, it } from "vitest";
import { focusNextFieldFrom, handleEnterToNextField, listFocusableFields } from "@/lib/focus-next-field";

describe("focus-next-field", () => {
  it("listFocusableFields ترتیب DOM را برمی‌گرداند", () => {
    const root = document.createElement("div");
    root.setAttribute("data-preadmit-fields", "");
    root.innerHTML = `
      <input class="app-input" value="a" />
      <input class="app-input" readonly value="skip" />
      <input class="app-input" value="b" />
      <select><option>1</option></select>
    `;
    document.body.appendChild(root);
    const list = listFocusableFields(root);
    expect(list).toHaveLength(3);
    expect((list[0] as HTMLInputElement).value).toBe("a");
    expect((list[1] as HTMLInputElement).value).toBe("b");
    expect(list[2].tagName).toBe("SELECT");
    root.remove();
  });

  it("focusNextFieldFrom به کنترل بعدی می‌رود", () => {
    const root = document.createElement("div");
    root.setAttribute("data-preadmit-fields", "");
    const a = document.createElement("input");
    a.className = "app-input";
    const b = document.createElement("input");
    b.className = "app-input";
    root.append(a, b);
    document.body.appendChild(root);
    a.focus();
    expect(focusNextFieldFrom(a)).toBe(true);
    expect(document.activeElement).toBe(b);
    expect(focusNextFieldFrom(b)).toBe(false);
    root.remove();
  });

  it("handleEnterToNextField برای input اینتر را مصرف می‌کند", () => {
    const root = document.createElement("div");
    root.setAttribute("data-preadmit-fields", "");
    const a = document.createElement("input");
    a.className = "app-input";
    const b = document.createElement("input");
    b.className = "app-input";
    root.append(a, b);
    document.body.appendChild(root);
    let prevented = false;
    const ok = handleEnterToNextField({
      key: "Enter",
      ctrlKey: false,
      metaKey: false,
      target: a,
      preventDefault: () => {
        prevented = true;
      },
    });
    expect(ok).toBe(true);
    expect(prevented).toBe(true);
    expect(document.activeElement).toBe(b);
    root.remove();
  });
});
