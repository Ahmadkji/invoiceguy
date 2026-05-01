import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  ensureSignedIn,
  signOut,
  apiGet,
  apiPost,
  cleanupAllUserData,
} from "./integration-helpers";

// ═══════════════════════════════════════════════════════════════════════════════
// Projects CRUD Integration Tests
// ═══════════════════════════════════════════════════════════════════════════════

let testClientId: string | null = null;
let createdProjectId: string | null = null;

beforeAll(async () => {
  await ensureSignedIn();
  // Create a client first (projects require a clientId)
  const { body: clientBody } = await apiPost("/api/me/clients", {
    name: "Test Client for Projects",
  });
  const clientData = clientBody as Record<string, unknown>;
  testClientId = (clientData.client as Record<string, unknown>).id as string;
  expect(testClientId).toBeTruthy();
});

afterAll(async () => {
  await cleanupAllUserData();
  await signOut();
});

describe("GET /api/me/projects", () => {
  it("returns ok with projects array", async () => {
    const { status, body } = await apiGet("/api/me/projects");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.projects)).toBe(true);
  });

  it("returns 401 when unauthenticated", async () => {
    await signOut();
    const { status } = await apiGet("/api/me/projects");
    expect(status).toBe(401);
    await ensureSignedIn();
  });
});

describe("POST /api/me/projects", () => {
  it("creates a project with valid data", async () => {
    const { status, body } = await apiPost("/api/me/projects", {
      client_id: testClientId,
      name: "Integration Test Project",
      hourly_rate: 150,
      billing_increment: "round_up_15",
      description: "A test project",
    });
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    const project = data.project as Record<string, unknown>;
    createdProjectId = project.id as string;
    expect(project.name).toBe("Integration Test Project");
    expect(project.hourlyRate).toBe(150);
    expect(project.billingIncrement).toBe("round_up_15");
  });

  it("rejects project creation without client_id", async () => {
    const { status, body } = await apiPost("/api/me/projects", {
      name: "Orphan Project",
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    const fieldErrors = data.fieldErrors as Record<string, string> | undefined;
    expect(fieldErrors?.client_id).toBeDefined();
  });

  it("rejects project creation without name", async () => {
    const { status, body } = await apiPost("/api/me/projects", {
      client_id: testClientId,
      name: "",
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
  });

  it("rejects project with negative hourly rate", async () => {
    const { status, body } = await apiPost("/api/me/projects", {
      client_id: testClientId,
      name: "Bad Rate Project",
      hourly_rate: -50,
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    const fieldErrors = data.fieldErrors as Record<string, string> | undefined;
    expect(fieldErrors?.hourly_rate).toBeDefined();
  });

  it("rejects project with invalid billing_increment", async () => {
    const { status, body } = await apiPost("/api/me/projects", {
      client_id: testClientId,
      name: "Bad Billing Project",
      billing_increment: "round_up_999",
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    const fieldErrors = data.fieldErrors as Record<string, string> | undefined;
    expect(fieldErrors?.billing_increment).toBeDefined();
  });

  it("rejects project with invalid status", async () => {
    const { status, body } = await apiPost("/api/me/projects", {
      client_id: testClientId,
      name: "Bad Status Project",
      status: "unknown_status",
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
  });

  it("creates project with valid status values", async () => {
    for (const s of ["active", "paused", "completed", "archived"]) {
      const { status, body } = await apiPost("/api/me/projects", {
        client_id: testClientId,
        name: `Status ${s} Project`,
        status: s,
      });
      expect(status).toBe(200);
      const data = body as Record<string, unknown>;
      expect(data.ok).toBe(true);
      const project = data.project as Record<string, unknown>;
      expect(project.status).toBe(s);
    }
  });

  it("rejects project with non-existent client_id", async () => {
    const { status, body } = await apiPost("/api/me/projects", {
      client_id: "00000000-0000-0000-0000-000000000000",
      name: "Ghost Client Project",
    });
    expect(status).toBe(404);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    expect(data.code).toBe("CLIENT_NOT_FOUND");
  });

  it("newly created project appears in list", async () => {
    const { status, body } = await apiGet("/api/me/projects");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    const projects = data.projects as Array<Record<string, unknown>>;
    const found = projects.some((p) => p.id === createdProjectId);
    expect(found).toBe(true);
  });
});
