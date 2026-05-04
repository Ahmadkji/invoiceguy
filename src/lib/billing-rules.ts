import { BillingRule } from "@/lib/types";
import { calculateLineAmountCents, fromCurrencyCents } from "@/lib/validation";

export function getRuleLabel(rule: BillingRule): string {
  const labels: Record<BillingRule, string> = {
    exact: "Exact time",
    round_up_5: "Round up to 5 min",
    round_up_10: "Round up to 10 min",
    round_up_15: "Round up to 15 min",
    round_up_30: "Round up to 30 min",
    round_up_60: "Round up to 1 hour",
    min_15: "Minimum 15 min",
    min_30: "Minimum 30 min",
  };
  return labels[rule];
}

export function getRuleDescription(rule: BillingRule): string {
  const descriptions: Record<BillingRule, string> = {
    exact: "Bills the exact time worked",
    round_up_5: "Rounds up to nearest 5 minutes",
    round_up_10: "Rounds up to nearest 10 minutes",
    round_up_15: "Rounds up to nearest 15 minutes",
    round_up_30: "Rounds up to nearest 30 minutes",
    round_up_60: "Rounds up to nearest 1 hour",
    min_15: "Bills at least 15 minutes per entry",
    min_30: "Bills at least 30 minutes per entry",
  };
  return descriptions[rule];
}

export function calculateBilledMinutes(
  actualMinutes: number,
  rule: BillingRule,
  minimumMinutes: number | null = null
): number {
  let billed = actualMinutes;

  switch (rule) {
    case "exact":
      billed = actualMinutes;
      break;
    case "round_up_5":
      billed = Math.ceil(actualMinutes / 5) * 5;
      break;
    case "round_up_10":
      billed = Math.ceil(actualMinutes / 10) * 10;
      break;
    case "round_up_15":
      billed = Math.ceil(actualMinutes / 15) * 15;
      break;
    case "round_up_30":
      billed = Math.ceil(actualMinutes / 30) * 30;
      break;
    case "round_up_60":
      billed = Math.ceil(actualMinutes / 60) * 60;
      break;
    case "min_15":
      billed = Math.max(actualMinutes, 15);
      break;
    case "min_30":
      billed = Math.max(actualMinutes, 30);
      break;
  }

  if (minimumMinutes !== null && minimumMinutes > 0) {
    billed = Math.max(billed, minimumMinutes);
  }

  return billed;
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatDecimalHours(minutes: number): string {
  return (minutes / 60).toFixed(2);
}

export function formatCurrency(amount: number, currency = "$"): string {
  if (!Number.isFinite(amount)) {
    return `${currency}—`;
  }
  return `${currency}${amount.toFixed(2)}`;
}

export function formatTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime || !endTime) return "";
  const start = new Date(startTime);
  const end = new Date(endTime);
  const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
  return `${start.toLocaleTimeString("en-US", options)} – ${end.toLocaleTimeString("en-US", options)}`;
}

export function calculateAmount(minutes: number, hourlyRate: number): number {
  return fromCurrencyCents(calculateLineAmountCents(minutes / 60, hourlyRate));
}

export function getBillingRuleConfig(rule: BillingRule): {
  rule: BillingRule;
  incrementMinutes: number | null;
  minimumMinutes: number | null;
} {
  const configs: Record<
    BillingRule,
    { rule: BillingRule; incrementMinutes: number | null; minimumMinutes: number | null }
  > = {
    exact: { rule: "exact", incrementMinutes: null, minimumMinutes: null },
    round_up_5: { rule: "round_up_5", incrementMinutes: 5, minimumMinutes: null },
    round_up_10: { rule: "round_up_10", incrementMinutes: 10, minimumMinutes: null },
    round_up_15: { rule: "round_up_15", incrementMinutes: 15, minimumMinutes: null },
    round_up_30: { rule: "round_up_30", incrementMinutes: 30, minimumMinutes: null },
    round_up_60: { rule: "round_up_60", incrementMinutes: 60, minimumMinutes: null },
    min_15: { rule: "min_15", incrementMinutes: null, minimumMinutes: 15 },
    min_30: { rule: "min_30", incrementMinutes: null, minimumMinutes: 30 },
  };
  return configs[rule];
}
