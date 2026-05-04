import type { BillingRule } from "@/lib/types";

/**
 * Shared validation and coercion utilities.
 * Single source of truth — used by invoices/server.ts, time-entries, projects, etc.
 */

export const BILLING_RULES: BillingRule[] = [
  "exact",
  "round_up_5",
  "round_up_10",
  "round_up_15",
  "round_up_30",
  "round_up_60",
  "min_15",
  "min_30",
];

export type DbRecord = Record<string, unknown>;

export function asRecord(value: unknown): DbRecord {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as DbRecord;
}

export function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function toInteger(value: unknown, fallback = 0) {
  const parsed = toNumber(value, fallback);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

export function toStringValue(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

export function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = toStringValue(value).trim();
  return normalized ? normalized : null;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().slice(0, 10) === value;
}

export const CURRENCY_PATTERN = /^([A-Z]{3}|[^A-Za-z0-9\s]{1,3})$/;

export function isValidCurrency(value: string) {
  return CURRENCY_PATTERN.test(value);
}

// ── Currency-accurate arithmetic (shared between client & server) ──────────

export function toCurrencyCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100);
}

export function fromCurrencyCents(value: number) {
  return Number((value / 100).toFixed(2));
}

export function calculateLineAmountCents(quantity: number, rate: number) {
  const quantityMillis = Math.round(quantity * 1000);
  const hourlyRateCents = toCurrencyCents(rate);
  return Math.round((quantityMillis * hourlyRateCents) / 1000);
}
