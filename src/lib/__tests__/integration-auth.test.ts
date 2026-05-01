import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  signIn,
  signOut,
  ensureSignedIn,
  apiGet,
  TEST_EMAIL,
} from "./integration-helpers";

// ═══════════════════════════════════════════════════════════════════════════════
// Authentication Integration Tests
//
// Tests signin, signup validation, CSRF, session persistence.
// STRICT: only 1 real sign-in per run (in beforeAll). Sign-out test runs LAST.
// ═══════════════════════════════════════════════════════════════════════════════

beforeAll(async () => {
  await ensureSignedIn(); // ← the ONE and ONLY sign-in for this file
});

afterAll(async () => {
  // Session already cleaned up by sign-out test, but just in case:
  await signOut();
});

// ─── Sign-in validation (rejection paths — no real sign-in) ──────────────────

describe("POST /api/auth/signin", () => {
  it("rejects signin with missing credentials", async () => {
    const res = await fetch("http://localhost:3000/api/auth/signin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
  });

  it("rejects signin with wrong password", async () => {
    // Use a separate email to avoid consuming the test user's rate-limit bucket
    const res = await fetch("http://localhost:3000/api/auth/signin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "wrongpass.test@invoiceguy.test", password: "wrongpassword123" }),
    });
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.message).toBe("Invalid credentials.");
  });

  it("accepts valid credentials and sets session cookies", async () => {
    // Verify that the beforeAll sign-in produced a working session.
    // We test cookie presence indirectly: the session works.
    const profile = await apiGet("/api/me/profile");
    expect(profile.status).toBe(200);
    expect((profile.body as Record<string, unknown>).email).toBe(TEST_EMAIL);
  });
});

// ─── CSRF Protection ─────────────────────────────────────────────────────────

describe("CSRF / Origin protection", () => {
  it("rejects signin POST without Origin header", async () => {
    const res = await fetch("http://localhost:3000/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: "irrelevant" }),
    });
    expect(res.status).toBe(403);
  });

  it("rejects signin POST from cross-origin", async () => {
    const res = await fetch("http://localhost:3000/api/auth/signin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.com",
      },
      body: JSON.stringify({ email: TEST_EMAIL, password: "irrelevant" }),
    });
    expect(res.status).toBe(403);
  });
});

// ─── Sign-up validation ──────────────────────────────────────────────────────

describe("POST /api/auth/signup", () => {
  it("rejects signup with invalid email", async () => {
    const res = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "not-an-email", password: "password123" }),
    });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it("rejects signup with short password", async () => {
    const res = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "test@example.com", password: "123" }),
    });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.message).toContain("8 characters");
  });

  it("rejects signup without Origin header", async () => {
    const res = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123" }),
    });
    expect(res.status).toBe(403);
  });
});

// ─── Session persistence ─────────────────────────────────────────────────────

describe("Session persistence", () => {
  it("maintains session across multiple API calls", async () => {
    const first = await apiGet("/api/me/profile");
    expect(first.status).toBe(200);

    const second = await apiGet("/api/me/profile");
    expect(second.status).toBe(200);
  });
});

// ─── Sign-out (MUST be the last test — no re-auth after) ─────────────────────

describe("POST /api/auth/signout", () => {
  it("signs out and protected route returns 401", async () => {
    await signOut();
    const { status, body } = await apiGet("/api/me/clients");
    expect(status).toBe(401);
    expect((body as Record<string, unknown>).ok).toBe(false);
    // NOTE: No re-authentication — this is the last test.
  });
});
