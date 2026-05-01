import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  ensureSignedIn,
  signOut,
  apiGet,
  cleanupAllUserData,
} from "./integration-helpers";

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard Data & Profile Integration Tests
// ═══════════════════════════════════════════════════════════════════════════════

beforeAll(async () => {
  await ensureSignedIn();
});

afterAll(async () => {
  await cleanupAllUserData();
  await signOut();
});

// ─── Dashboard Data ──────────────────────────────────────────────────────────

describe("GET /api/me/dashboard-data", () => {
  it("returns complete dashboard snapshot", async () => {
    const { status, body } = await apiGet("/api/me/dashboard-data");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(data.profile).toBeDefined();
    expect(Array.isArray(data.clients)).toBe(true);
    expect(Array.isArray(data.projects)).toBe(true);
    expect(Array.isArray(data.timeEntries)).toBe(true);
    expect(Array.isArray(data.invoices)).toBe(true);
    expect(typeof data.paidThisMonth).toBe("number");
    expect(typeof data.paidBilledMinutes).toBe("number");
  });

  it("returns 401 when unauthenticated", async () => {
    await signOut();
    const { status } = await apiGet("/api/me/dashboard-data");
    expect(status).toBe(401);
    await ensureSignedIn();
  });

  it("profile contains expected fields", async () => {
    const { status, body } = await apiGet("/api/me/dashboard-data");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    const profile = data.profile as Record<string, unknown>;
    expect(profile.businessName).toBeDefined();
    expect(profile.fullName).toBeDefined();
    expect(profile.email).toBeDefined();
    expect(profile.defaultCurrency).toBeTruthy();
    expect(profile.invoiceNumberPrefix).toBeTruthy();
  });
});

// ─── Profile ─────────────────────────────────────────────────────────────────

describe("GET /api/me/profile", () => {
  it("returns the user profile", async () => {
    const { status, body } = await apiGet("/api/me/profile");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    const profile = data.profile as Record<string, unknown>;
    expect(profile.email).toBeTruthy();
    expect(profile.businessName).toBeTruthy();
  });

  it("returns 401 when unauthenticated", async () => {
    await signOut();
    const { status } = await apiGet("/api/me/profile");
    expect(status).toBe(401);
    await ensureSignedIn();
  });
});
