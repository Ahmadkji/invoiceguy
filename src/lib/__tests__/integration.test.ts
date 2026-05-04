import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  signIn,
  signOut,
  ensureSignedIn,
  apiGet,
  apiPost,
  cleanupAllUserData,
  TEST_EMAIL,
} from "./integration-helpers";

// ═══════════════════════════════════════════════════════════════════════════════
// Unified Integration Test Suite
//
// ALL integration tests in ONE file = ONE beforeAll = ONE sign-in.
// This eliminates Supabase rate-limiting issues caused by vitest spawning
// multiple parallel fork/thread processes.
//
// Test order: Auth → Clients → Projects → Invoices → Dashboard → Sign-out
// ═══════════════════════════════════════════════════════════════════════════════

// Shared test fixture — created once for all suites
let testClientId: string | null = null;

beforeAll(async () => {
  // THE ONE AND ONLY SIGN-IN for the entire integration suite
  await ensureSignedIn();

  // Create a test client that projects and invoices can use
  const { body: clientBody } = await apiPost("/api/me/clients", {
    name: "Integration Test Client (shared)",
  });
  const clientData = clientBody as Record<string, unknown>;
  testClientId = (clientData.client as Record<string, unknown>).id as string;
  expect(testClientId).toBeTruthy();
});

afterAll(async () => {
  // Cleanup should already have happened in sign-out test, but safety net:
  await cleanupAllUserData();
  await signOut();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════

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
    const res = await fetch("http://localhost:3000/api/auth/signin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: TEST_EMAIL, password: "wrongpassword123" }),
    });
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.message).toBe("Invalid credentials.");
  });

  it("accepts valid credentials and sets session cookies", async () => {
    // Verify the beforeAll sign-in produced a working session
    const profile = await apiGet("/api/me/profile");
    expect(profile.status).toBe(200);
    const data = profile.body as Record<string, unknown>;
    const p = data.profile as Record<string, unknown>;
    expect(p.email).toBe(TEST_EMAIL);
  });
});

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

describe("Session persistence", () => {
  it("maintains session across multiple API calls", async () => {
    const first = await apiGet("/api/me/profile");
    expect(first.status).toBe(200);
    const second = await apiGet("/api/me/profile");
    expect(second.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CLIENTS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

let createdClientId: string | null = null;

describe("GET /api/me/clients", () => {
  it("returns ok with clients array", async () => {
    const { status, body } = await apiGet("/api/me/clients");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.clients)).toBe(true);
  });

  it("returns 401 when not authenticated", async () => {
    // Direct fetch without cookies — no signOut needed
    const res = await fetch("http://localhost:3000/api/me/clients", {
      headers: { Origin: "http://localhost:3000" },
      redirect: "manual",
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
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
    expect(client.color).toBeTruthy();
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
        Cookie: "",
      },
      body: "not-json",
    });
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PROJECTS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

let createdProjectId: string | null = null;

describe("GET /api/me/projects", () => {
  it("returns ok with projects array", async () => {
    const { status, body } = await apiGet("/api/me/projects");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.projects)).toBe(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await fetch("http://localhost:3000/api/me/projects", {
      headers: { Origin: "http://localhost:3000" },
      redirect: "manual",
    });
    expect(res.status).toBe(401);
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

// ═══════════════════════════════════════════════════════════════════════════════
// 4. INVOICES
// ═══════════════════════════════════════════════════════════════════════════════

let createdInvoiceId: string | null = null;

describe("GET /api/me/invoices", () => {
  it("returns ok with invoices and clients arrays", async () => {
    const { status, body } = await apiGet("/api/me/invoices");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.invoices)).toBe(true);
    expect(Array.isArray(data.clients)).toBe(true);
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await fetch("http://localhost:3000/api/me/invoices", {
      headers: { Origin: "http://localhost:3000" },
      redirect: "manual",
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/me/invoices - validation", () => {
  it("rejects invoice without clientId", async () => {
    const { status, body } = await apiPost("/api/me/invoices", {
      invoiceDate: "2024-06-15",
      lineItems: [{ description: "Work", quantity: 1, rate: 100 }],
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    const fieldErrors = data.fieldErrors as Record<string, string> | undefined;
    expect(fieldErrors?.clientId).toBeDefined();
  });

  it("rejects invoice without invoiceDate", async () => {
    const { status, body } = await apiPost("/api/me/invoices", {
      clientId: testClientId,
      lineItems: [{ description: "Work", quantity: 1, rate: 100 }],
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    const fieldErrors = data.fieldErrors as Record<string, string> | undefined;
    expect(fieldErrors?.invoiceDate).toBeDefined();
  });

  it("rejects invoice without line items", async () => {
    const { status, body } = await apiPost("/api/me/invoices", {
      clientId: testClientId,
      invoiceDate: "2024-06-15",
      lineItems: [],
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    const fieldErrors = data.fieldErrors as Record<string, string> | undefined;
    expect(fieldErrors?.lineItems).toBeDefined();
  });

  it("rejects invoice with tax over 100%", async () => {
    const { status, body } = await apiPost("/api/me/invoices", {
      clientId: testClientId,
      invoiceDate: "2024-06-15",
      taxPercentage: 150,
      lineItems: [{ description: "Work", quantity: 1, rate: 100 }],
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    const fieldErrors = data.fieldErrors as Record<string, string> | undefined;
    expect(fieldErrors?.taxPercentage).toBeDefined();
  });

  it("rejects invoice with due date before issue date", async () => {
    const { status, body } = await apiPost("/api/me/invoices", {
      clientId: testClientId,
      invoiceDate: "2024-06-15",
      dueDate: "2024-06-10",
      lineItems: [{ description: "Work", quantity: 1, rate: 100 }],
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
  });

  it("rejects line item with empty description", async () => {
    const { status, body } = await apiPost("/api/me/invoices", {
      clientId: testClientId,
      invoiceDate: "2024-06-15",
      lineItems: [{ description: "", quantity: 1, rate: 100 }],
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
    const fieldErrors = data.fieldErrors as Record<string, string> | undefined;
    expect(fieldErrors?.["lineItems.0.description"]).toBeDefined();
  });

  it("rejects line item with zero quantity", async () => {
    const { status, body } = await apiPost("/api/me/invoices", {
      clientId: testClientId,
      invoiceDate: "2024-06-15",
      lineItems: [{ description: "Work", quantity: 0, rate: 100 }],
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
  });

  it("rejects line item with negative rate", async () => {
    const { status, body } = await apiPost("/api/me/invoices", {
      clientId: testClientId,
      invoiceDate: "2024-06-15",
      lineItems: [{ description: "Work", quantity: 1, rate: -50 }],
    });
    expect(status).toBe(400);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(false);
  });
});

describe("POST /api/me/invoices - creation", () => {
  it("creates an invoice with a single line item", async () => {
    const ts = Date.now();
    const payload = {
      clientId: testClientId,
      invoiceDate: "2024-06-15",
      dueDate: "2024-07-15",
      detailLevel: "detailed",
      status: "draft",
      taxPercentage: 0,
      discountAmount: 0,
      invoiceNumber: `TEST-${ts}-A`,
      lineItems: [{ description: "Web Development", quantity: 5, rate: 100 }],
    };
    const { status, body } = await apiPost("/api/me/invoices", payload);
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    createdInvoiceId = data.invoiceId as string;
    expect(createdInvoiceId).toBeTruthy();
  });

  it("creates invoice with multiple line items and tax", async () => {
    const ts = Date.now();
    const payload = {
      clientId: testClientId,
      invoiceDate: "2024-06-15",
      detailLevel: "detailed",
      taxPercentage: 10,
      invoiceNumber: `TEST-${ts}-B`,
      lineItems: [
        { description: "Design", quantity: 2, rate: 80 },
        { description: "Development", quantity: 5, rate: 100 },
      ],
    };
    const { status, body } = await apiPost("/api/me/invoices", payload);
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(data.ok).toBe(true);
    if (!createdInvoiceId) createdInvoiceId = data.invoiceId as string;
  });

  it("lists invoices after creation", async () => {
    const { status, body } = await apiGet("/api/me/invoices");
    expect(status).toBe(200);
    const data = body as Record<string, unknown>;
    expect(Array.isArray(data.invoices)).toBe(true);
    if (createdInvoiceId) {
      const invoices = data.invoices as Array<Record<string, unknown>>;
      const found = invoices.some((inv) => inv.id === createdInvoiceId);
      expect(found).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DASHBOARD & PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

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
    const res = await fetch("http://localhost:3000/api/me/dashboard-data", {
      headers: { Origin: "http://localhost:3000" },
      redirect: "manual",
    });
    expect(res.status).toBe(401);
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
    const res = await fetch("http://localhost:3000/api/me/profile", {
      headers: { Origin: "http://localhost:3000" },
      redirect: "manual",
    });
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SIGN-OUT (MUST be last — verifies sign-out and leaves session terminated)
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/signout (final)", () => {
  it("signs out and protected route returns 401", async () => {
    await signOut();
    const { status, body } = await apiGet("/api/me/clients");
    expect(status).toBe(401);
    expect((body as Record<string, unknown>).ok).toBe(false);
    // NOTE: No re-authentication. This is the final test.
  });
});
