/*
 File: frontend/my/src/lib/__tests__/uc-spc.test.ts
 Description: تست یونیت use caseهای پزشک (UC-SPC)
 Parent Dependencies: lib/workspace, test-fixtures
 */

import { describe, expect, it } from "vitest";
import {
  allowedPagesFor,
  matchesAllTerms,
  matchesPatient,
  normalizeNationalId,
  NON_V1_PAGES,
  ROLE_NAV,
  roleNavFor,
} from "@/lib/workspace";
import { minimalPatient } from "./test-fixtures";

describe("UC-SPC-01", () => {
  it("matchesPatient: جستجو روی نام، کد ملی، تلفن، qr", () => {
    const p = minimalPatient({ fullName: "علی رضایی", nationalId: "1234567890", phone: "09121111111", qrToken: "ABC" });
    expect(matchesPatient(p, "رضایی")).toBe(true);
    expect(matchesPatient(p, "1234567890")).toBe(true);
    expect(matchesPatient(p, "ABC")).toBe(true);
    expect(matchesPatient(p, "نامشخص")).toBe(false);
    expect(matchesPatient(p, "")).toBe(true);
  });
});

describe("UC-SPC-02", () => {
  it("matchesAllTerms: همهٔ واژه‌های پرس‌وجو باید در haystack باشند", () => {
    expect(matchesAllTerms("دکتر مریم تابش", "مریم تابش")).toBe(true);
    expect(matchesAllTerms("دکتر مریم تابش", "مریم احمدی")).toBe(false);
    expect(matchesAllTerms("نام", "   ")).toBe(false);
  });
});

describe("UC-SPC-03", () => {
  it("normalizeNationalId: فقط ارقام لاتین", () => {
    expect(normalizeNationalId("۰۰۱۲۳۴۵۶۷۸")).toBe("0012345678");
    expect(normalizeNationalId("1234-5678-9012")).toBe("123456789012");
  });
});

describe("UC-SPC-04", () => {
  it("allowedPagesFor specialist شامل dashboard و records است", () => {
    const pages = allowedPagesFor("specialist");
    expect(pages).toContain("dashboard");
    expect(pages).toContain("records");
  });
});

describe("UC-SPC-05", () => {
  it("در v1 صفحات clinical از ناوبری specialist حذف می‌شوند", () => {
    const pages = allowedPagesFor("specialist");
  // سطح v1 صفحات تشخیصی بالینی را از NON_V1_PAGES کنار می‌گذارد
    for (const clinical of ["clinical", "clinical-notes", "clinical-complete"] as const) {
      expect(NON_V1_PAGES).toContain(clinical);
      expect(pages).not.toContain(clinical);
    }
  });
});

describe("UC-SPC-06", () => {
  it("ROLE_NAV خام بالینی دارد؛ roleNavFor v1 فقط dashboard و records", () => {
    const rawPages = ROLE_NAV.specialist.groups.flatMap((g) => g.pages);
    expect(rawPages).toContain("clinical");
    const filtered = roleNavFor("specialist").groups.flatMap((g) => g.pages);
    expect(filtered).toContain("records");
    expect(filtered).not.toContain("clinical");
  });
});