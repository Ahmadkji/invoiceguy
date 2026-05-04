import { NextResponse, type NextRequest } from "next/server";
import type { BillingRule } from "@/lib/types";
import { BILLING_RULES, isValidCurrency } from "@/lib/validation";
import { createRouteClient } from "@/lib/supabase/route";
import { hasAllowedOrigin } from "@/lib/security/request";
import { checkRateLimitWithProvider } from "@/lib/security/rate-limit";

type ProfilePayload = {
  businessName: string;
  fullName: string;
  email: string;
  address: string;
  defaultHourlyRate: string;
  defaultBillingIncrement: BillingRule;
  defaultMinimumBillableMinutes: string;
  defaultCurrency: string;
  invoiceNumberPrefix: string;
  nextInvoiceNumber: string;
  defaultDueDays: string;
  taxLabel: string;
  taxPercentage: string;
  paymentInstructions: string;
  defaultInvoiceNotes: string;
};

function toNullableInteger(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toNullableDecimal(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function fromProfileRow(profile: Record<string, unknown>) {
  return {
    businessName: String(profile.business_name ?? ""),
    fullName: String(profile.full_name ?? ""),
    email: String(profile.email ?? ""),
    address: String(profile.address ?? ""),
    defaultHourlyRate: String(profile.default_hourly_rate ?? "0"),
    defaultBillingIncrement: (profile.default_billing_increment as BillingRule) ?? "exact",
    defaultMinimumBillableMinutes: profile.default_minimum_billable_minutes
      ? String(profile.default_minimum_billable_minutes)
      : "",
    defaultCurrency: String(profile.default_currency ?? "$"),
    invoiceNumberPrefix: String(profile.invoice_number_prefix ?? "INV"),
    nextInvoiceNumber: String(profile.next_invoice_number ?? "1"),
    defaultDueDays: String(profile.default_due_days ?? "14"),
    taxLabel: String(profile.tax_label ?? ""),
    taxPercentage: profile.tax_percentage ? String(profile.tax_percentage) : "",
    paymentInstructions: String(profile.payment_instructions ?? ""),
    defaultInvoiceNotes: String(profile.default_invoice_notes ?? ""),
  };
}

export async function GET(request: NextRequest) {
  const { supabase, withCookies } = createRouteClient(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, message: profileError.message }, { status: 400 });
  }

  const payload = profile
    ? fromProfileRow(profile as Record<string, unknown>)
    : {
        businessName: "",
        fullName:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          user.email?.split("@")[0] ??
          "",
        email: user.email ?? "",
        address: "",
        defaultHourlyRate: "0",
        defaultBillingIncrement: "exact" as BillingRule,
        defaultMinimumBillableMinutes: "",
        defaultCurrency: "$",
        invoiceNumberPrefix: "INV",
        nextInvoiceNumber: "1",
        defaultDueDays: "14",
        taxLabel: "",
        taxPercentage: "",
        paymentInstructions: "",
        defaultInvoiceNotes: "",
      };

  return withCookies(NextResponse.json({ ok: true, profile: payload }));
}

export async function PUT(request: NextRequest) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { supabase, withCookies } = createRouteClient(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const rl = await checkRateLimitWithProvider(`mutate:${user.id}:profile-update`, 15, 60_000, { supabase });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, code: "RATE_LIMITED", message: "Too many requests. Try again later." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as ProfilePayload | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const fieldErrors: Record<string, string> = {};
  const billingRule = (BILLING_RULES as readonly string[]).includes(body.defaultBillingIncrement)
    ? (body.defaultBillingIncrement as BillingRule)
    : null;
  const defaultCurrency = body.defaultCurrency.trim();
  const defaultHourlyRate = toNullableDecimal(body.defaultHourlyRate);
  const defaultMinimumBillableMinutes = toNullableInteger(body.defaultMinimumBillableMinutes);
  const taxPercentage = toNullableDecimal(body.taxPercentage);
  const nextNum = toNullableInteger(body.nextInvoiceNumber);
  const dueDays = toNullableInteger(body.defaultDueDays);
  if (!billingRule) {
    fieldErrors.defaultBillingIncrement = "Invalid billing increment.";
  }
  if (!defaultCurrency || !isValidCurrency(defaultCurrency)) {
    fieldErrors.defaultCurrency = "Use a 3-letter code like USD or a 1-3 symbol currency like $.";
  }
  if (body.invoiceNumberPrefix.trim().length > 20) {
    fieldErrors.invoiceNumberPrefix = "Prefix must be 20 characters or less.";
  }
  if (nextNum !== null && nextNum < 1) {
    fieldErrors.nextInvoiceNumber = "Must be 1 or greater.";
  }
  if (dueDays !== null && (dueDays < 1 || dueDays > 365)) {
    fieldErrors.defaultDueDays = "Must be between 1 and 365.";
  }
  if (defaultHourlyRate !== null && (!Number.isFinite(defaultHourlyRate) || defaultHourlyRate < 0)) {
    fieldErrors.defaultHourlyRate = "Hourly rate must be zero or a positive number.";
  }
  if (
    defaultMinimumBillableMinutes !== null &&
    (!Number.isFinite(defaultMinimumBillableMinutes) || defaultMinimumBillableMinutes < 0)
  ) {
    fieldErrors.defaultMinimumBillableMinutes = "Minimum billable minutes must be zero or a positive number.";
  }
  if (taxPercentage !== null && (!Number.isFinite(taxPercentage) || taxPercentage < 0 || taxPercentage > 100)) {
    fieldErrors.taxPercentage = "Tax percentage must be between 0 and 100.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ ok: false, message: "Validation failed.", fieldErrors }, { status: 400 });
  }

  const payload = {
    user_id: user.id,
    business_name: body.businessName.trim() || "My Business",
    full_name: body.fullName.trim() || "New User",
    email: body.email.trim(),
    address: body.address.trim() || null,
    default_hourly_rate: defaultHourlyRate ?? 0,
    default_billing_increment: billingRule,
    default_minimum_billable_minutes: defaultMinimumBillableMinutes,
    default_currency: defaultCurrency,
    invoice_number_prefix: body.invoiceNumberPrefix.trim() || "INV",
    next_invoice_number: nextNum ?? 1,
    default_due_days: dueDays ?? 14,
    tax_label: body.taxLabel.trim() || null,
    tax_percentage: taxPercentage,
    payment_instructions: body.paymentInstructions.trim() || null,
    default_invoice_notes: body.defaultInvoiceNotes.trim() || null,
  };

  const { error: upsertError } = await supabase.from("profiles").upsert(payload, {
    onConflict: "user_id",
  });

  if (upsertError) {
    return NextResponse.json(
      { ok: false, message: "Failed to save profile. Please check your input and try again." },
      { status: 400 },
    );
  }

  return withCookies(NextResponse.json({ ok: true }));
}
