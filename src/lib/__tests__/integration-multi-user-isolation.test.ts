import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { BASE_URL, TEST_EMAIL, TEST_PASSWORD } from "./integration-helpers";

const ALT_EMAIL = process.env.E2E_TEST_EMAIL_ALT ?? "";
const ALT_PASSWORD = process.env.E2E_TEST_PASSWORD_ALT ?? "";

function parseCookiePairs(setCookies: string[]): string {
  return setCookies
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

async function signInAs(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
    },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });

  if (res.status !== 200) {
    throw new Error(`Failed to sign in ${email}. Status ${res.status}`);
  }

  const cookieHeader = parseCookiePairs(res.headers.getSetCookie?.() ?? []);
  if (!cookieHeader) {
    throw new Error(`No auth cookie returned for ${email}`);
  }

  return cookieHeader;
}

async function createClientAs(cookieHeader: string, name: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/me/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ name }),
    redirect: "manual",
  });

  if (res.status !== 200) {
    throw new Error(`Client create failed (${res.status})`);
  }

  const body = (await res.json()) as { client?: { id?: string } };
  const clientId = body.client?.id;
  if (!clientId) {
    throw new Error("Client create response did not include client.id");
  }

  return clientId;
}

async function createInvoiceAs(cookieHeader: string, clientId: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const res = await fetch(`${BASE_URL}/api/me/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      clientId,
      invoiceDate: today,
      dueDate: due,
      detailLevel: "detailed",
      status: "draft",
      notes: "",
      paymentInstructions: "",
      taxPercentage: 0,
      discountAmount: 0,
      currency: "$",
      idempotencyKey: `multi-user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      lineItems: [{ description: "Isolation test line", quantity: 1, rate: 100 }],
      clientTotals: { subtotal: 100, taxAmount: 0, totalAmount: 100 },
    }),
    redirect: "manual",
  });

  if (res.status !== 200) {
    throw new Error(`Invoice create failed (${res.status})`);
  }

  const body = (await res.json()) as { invoiceId?: string };
  if (!body.invoiceId) {
    throw new Error("Invoice create response did not include invoiceId");
  }

  return body.invoiceId;
}

const canRun = Boolean(TEST_EMAIL && TEST_PASSWORD && ALT_EMAIL && ALT_PASSWORD);
(canRun ? describe : describe.skip)("Multi-user isolation (session + RLS)", () => {
  let userACookie = "";
  let userBCookie = "";
  let createdClientId: string | null = null;
  let createdInvoiceId: string | null = null;

  afterAll(async () => {
    if (!createdClientId && !createdInvoiceId) {
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SERVICE_ROLE_KEY;
    if (!url || !serviceRole) {
      return;
    }

    const supabase = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (createdInvoiceId) {
      await supabase.from("invoice_items").delete().eq("invoice_id", createdInvoiceId);
      await supabase.from("invoices").delete().eq("id", createdInvoiceId);
    }

    if (createdClientId) {
      await supabase.from("clients").delete().eq("id", createdClientId);
    }
  });

  it("User B cannot read/update User A invoice by id and cannot see it in list", async () => {
    userACookie = await signInAs(TEST_EMAIL, TEST_PASSWORD);
    userBCookie = await signInAs(ALT_EMAIL, ALT_PASSWORD);

    createdClientId = await createClientAs(userACookie, `Isolation Client ${Date.now()}`);
    createdInvoiceId = await createInvoiceAs(userACookie, createdClientId);

    const listB = await fetch(`${BASE_URL}/api/me/invoices`, {
      headers: { Cookie: userBCookie },
      redirect: "manual",
    });
    expect(listB.status).toBe(200);
    const listBody = (await listB.json()) as { invoices?: Array<{ id?: string }> };
    const found = (listBody.invoices ?? []).some((inv) => inv.id === createdInvoiceId);
    expect(found).toBe(false);

    const readB = await fetch(`${BASE_URL}/api/me/invoices/${createdInvoiceId}`, {
      headers: { Cookie: userBCookie },
      redirect: "manual",
    });
    expect([403, 404]).toContain(readB.status);

    const patchB = await fetch(`${BASE_URL}/api/me/invoices/${createdInvoiceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
        Cookie: userBCookie,
      },
      body: JSON.stringify({ status: "sent" }),
      redirect: "manual",
    });
    expect([403, 404]).toContain(patchB.status);
  });
});
