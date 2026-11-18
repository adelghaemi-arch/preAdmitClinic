import { ensureClientDb, persistClientDb } from "@/lib/client-db";
import { mockMutations, mockStore } from "@/lib/mock-store";
import type { AppUserDto } from "@/types/clinic";

/**
 * Browser-only OTP (one-time code) session for the fully client-side demo.
 * There is no password and no server: the patient enters their mobile number,
 * receives a simulated SMS code inside the app, and is signed in as that patient.
 */

export const SESSION_COOKIE = "nabz_session";
const SESSION_KEY = "nabz_session_user";
const OTP_KEY = "nabz_otp_challenge";
const OTP_TTL_MS = 2 * 60 * 1000;

export interface SessionResult {
  user: AppUserDto;
  isDemoSession: boolean;
}

export function readUsername(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function toDto(id: number): AppUserDto | null {
  const row = mockStore.userById(id);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    fullName: row.fullName,
    jobTitle: row.jobTitle,
    primaryRole: row.primaryRole,
    medicalCouncilCode: row.medicalCouncilCode,
    canAccessAllRoles: row.canAccessAllRoles,
  };
}

export async function getCurrentUser(): Promise<SessionResult> {
  ensureClientDb();
  const username = readUsername();
  if (username) {
    const row = mockStore.userByUsername(username);
    if (row) return { user: toDto(row.id)!, isDemoSession: false };
  }
  const fallback = mockStore.userByUsername("maryam") ?? mockStore.users[0];
  return { user: toDto(fallback.id)!, isDemoSession: true };
}

/* ------------------------------- OTP login ------------------------------- */

export function normalizePhone(value: string): string {
  let digits = value
    .replace(/[۰-۹٠-٩]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(d) % 10))
    .replace(/\D/g, "");
  if (digits.startsWith("0098")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("98") && digits.length === 12) digits = `0${digits.slice(2)}`;
  return digits;
}

export interface OtpRequestResult {
  ok: boolean;
  error?: string;
  /** Demo code shown inside the simulated SMS panel (no real SMS gateway in the mock). */
  code?: string;
  targetName?: string;
  kind?: "patient" | "supervisor";
  expiresInSec?: number;
}

interface OtpChallenge {
  phone: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

function readChallenge(): OtpChallenge | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OTP_KEY);
    return raw ? (JSON.parse(raw) as OtpChallenge) : null;
  } catch {
    return null;
  }
}

function findPatientByPhone(phone: string) {
  return mockStore.patients.find((p) => normalizePhone(p.phone) === phone) ?? null;
}

function findSupervisorContract(phone: string) {
  return (
    mockStore.contracts.find(
      (c) => c.supervisor.isActive && normalizePhone(c.supervisor.phone) === phone
    ) ?? null
  );
}

/** Steps 1 of OTP login: validates the mobile number and issues a demo code. */
export function requestOtp(phoneRaw: string): OtpRequestResult {
  ensureClientDb();
  const phone = normalizePhone(phoneRaw);
  if (!/^09\d{9}$/.test(phone)) {
    return { ok: false, error: "شماره موبایل معتبر ۱۱ رقمی وارد کنید (مثل ۰۹۱۲۳۴۵۶۷۸۹)." };
  }

  const patient = findPatientByPhone(phone);
  const supervisorContract = patient ? null : findSupervisorContract(phone);
  if (!patient && !supervisorContract) {
    return {
      ok: false,
      error: "این شماره موبایل در میان بیماران یا ناظران سازمانی ثبت نشده است. یکی از شماره‌های فهرست ورود سریع پایین را انتخاب کنید.",
    };
  }

  const code = String(Math.floor(10000 + Math.random() * 90000));
  const challenge: OtpChallenge = { phone, code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 };
  try {
    window.localStorage.setItem(OTP_KEY, JSON.stringify(challenge));
  } catch {}

  return {
    ok: true,
    code,
    kind: patient ? "patient" : "supervisor",
    targetName: patient ? patient.fullName : supervisorContract!.supervisor.fullName,
    expiresInSec: Math.round(OTP_TTL_MS / 1000),
  };
}

export interface OtpVerifyResult {
  ok: boolean;
  error?: string;
  user?: AppUserDto;
  patientId?: number;
  role?: "owner" | "supervisor";
}

function ensurePatientUser(patientId: number) {
  const patient = mockStore.patientById(patientId);
  if (!patient) return null;

  const selfLink = mockStore.links.find((l) => l.patientId === patientId && l.relationship === "self");
  if (selfLink) {
    const existing = mockStore.userById(selfLink.userId);
    if (existing) return existing;
  }

  const byPhoneUsername = mockStore.userByUsername(patient.phone);
  const existingUser =
    byPhoneUsername ??
    mockStore.users.find(
      (u) => normalizePhone(u.fullName) === normalizePhone(patient.fullName) && u.primaryRole === "owner"
    );
  const user =
    existingUser ??
    (() => {
      const nextId = mockStore.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
      const created = {
        id: nextId,
        username: patient.phone,
        fullName: patient.fullName,
        jobTitle: "بیمار",
        primaryRole: "owner",
        medicalCouncilCode: "—",
        canAccessAllRoles: true,
        isActive: true,
        lastLoginAt: new Date().toISOString(),
      };
      mockStore.users.push(created);
      return created;
    })();

  if (!mockStore.links.some((l) => l.userId === user.id && l.patientId === patientId && l.relationship === "self")) {
    mockMutations.insertLink({
      userId: user.id,
      patientId,
      relationship: "self",
      permission: "manage",
      visibility: {
        journey: true,
        results: true,
        diagnoses: true,
        medications: true,
        allergies: true,
        familyHistory: true,
        reports: true,
      },
      createdAt: new Date().toISOString(),
    });
  }
  return user;
}

function ensureSupervisorUser(phone: string) {
  const contract = findSupervisorContract(phone);
  if (!contract) return null;
  let user = mockStore.users.find(
    (u) => u.username === phone || normalizePhone(u.medicalCouncilCode) === phone
  );
  if (!user) {
    const nextId = mockStore.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
    user = {
      id: nextId,
      username: phone,
      fullName: contract.supervisor.fullName,
      jobTitle: `ناظر سازمان (${contract.organizationName})`,
      primaryRole: "supervisor",
      medicalCouncilCode: phone,
      canAccessAllRoles: false,
      isActive: true,
      lastLoginAt: new Date().toISOString(),
    };
    mockStore.users.push(user);
  }
  contract.supervisor.lastSeenAt = new Date().toISOString();
  return user;
}

function startSession(username: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_KEY, username);
    window.localStorage.removeItem(OTP_KEY);
  } catch {}
}

/** Step 2 of OTP login: verifies the code and opens the session. */
export function verifyOtp(phoneRaw: string, codeRaw: string): OtpVerifyResult {
  ensureClientDb();
  const phone = normalizePhone(phoneRaw);
  const code = normalizePhone(codeRaw);
  const challenge = readChallenge();

  if (!challenge || challenge.phone !== phone) {
    return { ok: false, error: "کد تأییدی برای این شماره صادر نشده است. دوباره درخواست کد بدهید." };
  }
  if (Date.now() > challenge.expiresAt) {
    return { ok: false, error: "کد تأیید منقضی شده است. کد جدید درخواست کنید." };
  }
  if (challenge.attempts >= 5) {
    return { ok: false, error: "تعداد تلاش‌های ناموفق زیاد است. کد جدید درخواست کنید." };
  }
  if (code !== challenge.code) {
    challenge.attempts += 1;
    try {
      window.localStorage.setItem(OTP_KEY, JSON.stringify(challenge));
    } catch {}
    return { ok: false, error: "کد واردشده درست نیست. کد داخل پیامک نمایشی را بررسی کنید." };
  }

  const patient = findPatientByPhone(phone);
  if (patient) {
    const user = ensurePatientUser(patient.id);
    if (!user) return { ok: false, error: "حساب بیمار ساخته نشد. دوباره تلاش کنید." };
    mockMutations.touchUserLogin(user.id, new Date().toISOString());
    persistClientDb();
    startSession(user.username);
    return { ok: true, user: toDto(user.id)!, patientId: patient.id, role: "owner" };
  }

  const supervisorUser = ensureSupervisorUser(phone);
  if (supervisorUser) {
    mockMutations.touchUserLogin(supervisorUser.id, new Date().toISOString());
    persistClientDb();
    startSession(supervisorUser.username);
    return { ok: true, user: toDto(supervisorUser.id)!, role: "supervisor" };
  }

  return { ok: false, error: "حسابی برای این شماره پیدا نشد." };
}

/** Demo patients/supervisors that can request an OTP code right away. */
export function listOtpDemoLogins(): Array<{ name: string; phone: string; hint: string; kind: "patient" | "supervisor" }> {
  ensureClientDb();
  const patients = mockStore.patients
    .slice()
    .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())
    .map((p) => ({
      name: p.fullName,
      phone: normalizePhone(p.phone),
      hint: p.completedAt ? "پرونده تکمیل‌شده" : "مسیر درمان فعال",
      kind: "patient" as const,
    }));
  const supervisors = mockStore.contracts
    .filter((c) => c.supervisor.isActive && c.supervisor.phone)
    .map((c) => ({
      name: c.supervisor.fullName,
      phone: normalizePhone(c.supervisor.phone),
      hint: `ناظر ${c.organizationName}`,
      kind: "supervisor" as const,
    }));
  return [...supervisors, ...patients];
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem("nabz_tab_role");
    window.localStorage.removeItem(OTP_KEY);
  } catch {}
}

export async function listDemoAccounts(): Promise<AppUserDto[]> {
  ensureClientDb();
  return mockStore.users.map((user) => toDto(user.id)!).filter(Boolean);
}
