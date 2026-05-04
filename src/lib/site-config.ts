export const SITE_NAME = "TimeProof";
export const SITE_TAGLINE = "Time-based invoicing software for hourly freelancers";
export const SITE_DESCRIPTION =
  "Track work sessions, apply billing rules automatically, and send client-ready hourly invoices without spreadsheet math.";
export const SUPPORT_EMAIL = "support@timeproof.app";

function normalizeSiteUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    return normalizeSiteUrl(configured);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing NEXT_PUBLIC_SITE_URL. Set the canonical production URL for SEO metadata.");
  }

  return "http://localhost:3000";
}

export function getAbsoluteUrl(pathname = "/") {
  const siteUrl = getSiteUrl();
  const normalizedPath = pathname === "/" ? "" : pathname.replace(/\/$/, "");
  return `${siteUrl}${normalizedPath || ""}`;
}
