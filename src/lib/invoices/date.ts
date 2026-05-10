const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseInvoiceDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function invoiceDateTime(value: string | null | undefined): number | null {
  const date = parseInvoiceDate(value);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() : null;
}

export function isInvoiceOverdue({
  dueDate,
  status,
  now,
}: {
  dueDate: string | null | undefined;
  status: string;
  now: number;
}) {
  if (!dueDate || status === "paid" || status === "void") {
    return false;
  }

  const dueTime = invoiceDateTime(dueDate);
  return dueTime !== null && dueTime < now;
}

export function formatInvoiceDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = "—",
) {
  const date = parseInvoiceDate(value);
  if (!date) {
    return fallback;
  }

  return date.toLocaleDateString("en-US", options);
}

export function addDaysToInvoiceDate(dateValue: string, days: number) {
  const date = parseInvoiceDate(dateValue);
  if (!date) {
    return dateValue;
  }

  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameOrAfterInvoiceDate(firstDate: string, secondDate: string) {
  const firstTime = invoiceDateTime(firstDate);
  const secondTime = invoiceDateTime(secondDate);

  if (firstTime === null || secondTime === null) {
    return true;
  }

  return secondTime >= firstTime;
}
