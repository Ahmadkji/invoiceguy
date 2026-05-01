// ═══════════════════════════════════════════════════════════════════════════════
// Integration Test Helpers
//
// Prerequisites:
//   1. `npm run dev` must be running on http://localhost:3000
//   2. .env.local must have valid Supabase credentials
//   3. E2E test user (E2E_TEST_EMAIL / E2E_TEST_PASSWORD) must exist
//
// Session sharing: cookies + userId are persisted to a temp file so that
// multiple test files (running in separate vitest forks) can share a single
// sign-in session without hitting Supabase rate limits.
// ═══════════════════════════════════════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const BASE_URL = process.env.INTEGRATION_BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

// ═══════════════════════════════════════════════════════════════════════════════
// File-based session persistence (shared across vitest fork processes)
// ═══════════════════════════════════════════════════════════════════════════════

const SESSION_FILE = path.join(__dirname, "..", "..", "..", "..", ".integration-session.json");
const LOCK_FILE = path.join(__dirname, "..", "..", "..", "..", ".integration-session.lock");

type SessionData = {
  cookies: string[];
  userId: string | null;
  email: string;
};

function readSessionFile(): SessionData | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const raw = fs.readFileSync(SESSION_FILE, "utf-8");
    const data = JSON.parse(raw) as SessionData;
    // Only reuse if the same test user (avoid cross-user contamination)
    if (data.email !== TEST_EMAIL) return null;
    return data;
  } catch {
    return null;
  }
}

function writeSessionFile(data: SessionData): void {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data), "utf-8");
}

function deleteSessionFile(): void {
  try { fs.unlinkSync(SESSION_FILE); } catch { /* ok */ }
}

// Simple file-based mutex with timeout
function sleepSync(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* busy-wait */ }
}

function acquireLock(timeoutMs = 15_000): boolean {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // Exclusive-create (O_EXCL) ensures only one process wins
      fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: "wx" });
      return true;
    } catch {
      // Lock exists — wait a bit and retry
      const lockAge = Date.now() - (fs.statSync(LOCK_FILE).mtimeMs || 0);
      if (lockAge > 30_000) {
        // Stale lock — break it
        try { fs.unlinkSync(LOCK_FILE); } catch { /* race — ok */ }
      }
      sleepSync(50 + Math.random() * 150);
    }
  }
  return false;
}

function releaseLock(): void {
  try { fs.unlinkSync(LOCK_FILE); } catch { /* ok */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
// In-memory shared state (within a single test file)
// ═══════════════════════════════════════════════════════════════════════════════

let sharedCookies: string[] = [];
let currentUserId: string | null = null;

function getCookieHeader(): string {
  return sharedCookies.join("; ");
}

function storeCookies(setCookieHeaders: string[]): void {
  for (const header of setCookieHeaders) {
    const parts = header.split(";");
    const firstPart = parts[0]?.trim() ?? "";
    const [name] = firstPart.split("=");
    if (name) {
      sharedCookies = sharedCookies.filter((c) => !c.startsWith(`${name}=`));
      sharedCookies.push(firstPart);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type ApiResult<T = Record<string, unknown>> = {
  ok: boolean;
  status: number;
  body: T;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Auth helpers
// ═══════════════════════════════════════════════════════════════════════════════

export async function signIn(
  email = TEST_EMAIL,
  password = TEST_PASSWORD,
): Promise<ApiResult> {
  const res = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
      Cookie: getCookieHeader(),
    },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  storeCookies(setCookie);
  const body = (await res.json()) as Record<string, unknown>;
  return { ok: body.ok === true, status: res.status, body };
}

export async function signOut(): Promise<void> {
  await fetch(`${BASE_URL}/api/auth/signout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
      Cookie: getCookieHeader(),
    },
    redirect: "manual",
  });
  sharedCookies = [];
  currentUserId = null;
  deleteSessionFile();
}

export async function ensureSignedIn(): Promise<void> {
  // 1. In-memory cookies (same file, already signed in)
  if (sharedCookies.length > 0) {
    const res = await fetch(`${BASE_URL}/api/me/profile`, {
      headers: { Cookie: getCookieHeader() },
    });
    if (res.status === 200) return;
    sharedCookies = [];
  }

  // 2. Check file-based session (another test file may have signed in)
  const fileSession = readSessionFile();
  if (fileSession && fileSession.cookies.length > 0) {
    sharedCookies = fileSession.cookies;
    currentUserId = fileSession.userId;
    // Validate the session is still valid
    const res = await fetch(`${BASE_URL}/api/me/profile`, {
      headers: { Cookie: getCookieHeader() },
    });
    if (res.status === 200) return;
    // Session expired — clear and re-sign-in
    sharedCookies = [];
    currentUserId = null;
    deleteSessionFile();
  }

  // 3. Acquire lock and sign in (only one process at a time)
  const locked = acquireLock();
  try {
    // Check again — another process may have signed in while we waited
    const freshSession = readSessionFile();
    if (freshSession && freshSession.cookies.length > 0) {
      sharedCookies = freshSession.cookies;
      currentUserId = freshSession.userId;
      const res = await fetch(`${BASE_URL}/api/me/profile`, {
        headers: { Cookie: getCookieHeader() },
      });
      if (res.status === 200) return;
    }

    const result = await signIn();
    if (!result.ok) {
      throw new Error(`Failed to sign in: ${JSON.stringify(result.body)}`);
    }

    // Persist to file so other test files can reuse
    writeSessionFile({
      cookies: sharedCookies,
      userId: currentUserId,
      email: TEST_EMAIL,
    });
  } finally {
    if (locked) releaseLock();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API helpers
// ═══════════════════════════════════════════════════════════════════════════════

export async function apiGet<T = Record<string, unknown>>(
  path: string,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Cookie: getCookieHeader() },
    redirect: "manual",
  });
  const body = (await res.json()) as T;
  return { status: res.status, body };
}

export async function apiPost<T = Record<string, unknown>>(
  path: string,
  payload: unknown,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
      Cookie: getCookieHeader(),
    },
    body: JSON.stringify(payload),
    redirect: "manual",
  });
  storeCookiesFromResponse(res);
  const body = (await res.json()) as T;
  return { status: res.status, body };
}

function storeCookiesFromResponse(res: Response): void {
  const setCookie = res.headers.getSetCookie?.() ?? [];
  storeCookies(setCookie);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Admin cleanup (service_role key)
// ═══════════════════════════════════════════════════════════════════════════════

import type { SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

async function getAdminClient(): Promise<SupabaseClient> {
  if (adminClient) return adminClient;
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SERVICE_ROLE_KEY!;
  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

type InvoiceIdRow = { id: string };

export async function cleanupAllUserData(): Promise<void> {
  if (!currentUserId) return;
  const supabase = await getAdminClient();

  try {
    const { data } = await supabase
      .from("invoices")
      .select("id")
      .eq("user_id", currentUserId);
    const invoices = (data ?? []) as InvoiceIdRow[];

    if (invoices.length > 0) {
      const ids = invoices.map((r) => r.id);
      await supabase.from("invoice_items").delete().in("invoice_id", ids);
      await supabase.from("invoices").delete().eq("user_id", currentUserId);
    }

    await supabase.from("time_entries").delete().eq("user_id", currentUserId);
    await supabase.from("projects").delete().eq("user_id", currentUserId);
    await supabase.from("clients").delete().eq("user_id", currentUserId);
  } catch (e) {
    console.warn("[cleanup] Non-fatal:", e);
  }
}

export function setCurrentUserId(id: string | null): void {
  currentUserId = id;
}

export { BASE_URL, TEST_EMAIL, TEST_PASSWORD };
