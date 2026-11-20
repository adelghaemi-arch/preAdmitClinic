/*
 File: frontend/src/lib/api/http.ts
 Description: کلاینت HTTP با Bearer برای Nabz.Api؛ بدون وابستگی به mock
 Parent Dependencies: session-token
 */

const TOKEN_KEY = "nabz_api_token";
const SESSION_ID_KEY = "nabz_api_session_id";
const ROLES_KEY = "nabz_api_roles";

export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  return (raw && raw.length > 0 ? raw : "http://localhost:5233").replace(/\/$/, "");
}

export function readApiToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function readApiSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_ID_KEY);
  } catch {
    return null;
  }
}

export function writeApiSession(token: string, sessionId: string, roles?: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(SESSION_ID_KEY, sessionId);
  if (roles) window.localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
}

export function clearApiSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(SESSION_ID_KEY);
    window.localStorage.removeItem(ROLES_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, auth = true, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);
  if (body !== undefined && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = readApiToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  if (res.status === 401 && auth) {
    clearApiSession();
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const errMsg =
      typeof parsed === "object" && parsed && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : `خطای سرور (${res.status})`;
    throw new ApiError(errMsg, res.status, parsed);
  }

  return parsed as T;
}
