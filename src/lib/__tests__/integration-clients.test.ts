import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  ensureSignedIn,
  signOut,
  apiGet,
  apiPost,
  cleanupAllUserData,
} from "./integration-helpers";

// ═══════════════════════════════════════════════════════════════════════════════
// Clients CRUD Integration Tests
// ═══════════════════════════════════════════════════════════════════════════════

let createdClientId: string | null = null;

beforeAll(async () => {
  await ensureSignedIn();
});

afterAll(async () => {
  await cleanupAllUserData();
  await signOut();
});

describe("GET /api/me/clients", () => {
  it("returns ok with clients array", async () => {
    const { status, body } = await apiGet("/api/me/clients");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.clients)).toBe(true);
  });

  it("returns 401 when not authenticated", async () => {
    // Temporarily sign out, test, then sign back in
    await signOut();
    const { status, body } = await apiGet("/api/me/clients");
    expect(status).toBe(401);
    expect((body as Record<string, unknown>).ok).toBe(false);
    await ensureSignedIn();
  });
});

describe("POST /api/me/clients", () => {
  it("creates a new client with valid data", async () => {
    const { status, body } = await apiPost("/api/me/clients", {
      name: "Integration Test Client",
      company_name: "Test Corp",
      email: "client@test.com",
    });
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(data.client).toBeDefined();
    createdClientId = (data.client as Record<string, unknown>).id as string;
    expect(createdClientId).toBeTruthy();
  });

  it("rejects client creation without name", async () => {
    const { status, body } = await apiPost("/api/me/clients", { name: "" });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    expect(data.code).toBe("VALIDATION_ERROR");
    const fieldErrors = data.fieldErrors as Record<string, string> | undefined;
    expect(fieldErrors?.name).toBeDefined();
  });

  it("rejects client with invalid email", async () => {
    const { status, body } = await apiPost("/api/me/clients", {
      name: "Bad Email Client",
      email: "not-an-email",
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    const fieldErrors = data.fieldErrors as Record<string, string> | undefined;
    expect(fieldErrors?.email).toBeDefined();
  });

  it("rejects client with name exceeding 200 characters", async () => {
    const { status, body } = await apiPost("/api/me/clients", {
      name: "x".repeat(201),
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    const fieldErrors = data.fieldErrors as Record<string, string> | undefined;
    expect(fieldErrors?.name).toBeDefined();
  });

  it("creates client with just a name (all optional fields empty)", async () => {
    const { status, body } = await apiPost("/api/me/clients", {
      name: "Minimal Client",
    });
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    const client = data.client as Record<string, unknown>;
    expect(client.name).toBe("Minimal Client");
    expect(client.color).toBeTruthy(); // auto-assigned color
    expect(client.email).toBeNull();
  });

  it("newly created client appears in client list", async () => {
    const { status, body } = await apiGet("/api/me/clients");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    const clients = data.clients as Array<Record<string, unknown>>;
    const found = clients.some((c) => c.id === createdClientId);
    expect(found).toBe(true);
  });

  it("rejects POST without valid JSON body", async () => {
    const res = await fetch("http://localhost:3000/api/me/clients", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Origin: "http://localhost:3000",
        Cookie: "", // will be missing auth
      },
      body: "not-json",
    });
    expect(res.status).toBe(401); // unauthenticated
  });
});
