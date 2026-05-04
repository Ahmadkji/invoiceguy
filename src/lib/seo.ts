import type { Metadata } from "next";
import { faqItems, getPublicPage, pricingPlans, type PublicPageKey } from "@/lib/marketing-content";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SUPPORT_EMAIL, getAbsoluteUrl, getSiteUrl } from "@/lib/site-config";

const DEFAULT_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export function buildPublicMetadata(pageKey: PublicPageKey): Metadata {
  const page = getPublicPage(pageKey);

  return {
    title:
      pageKey === "home"
        ? {
            absolute: `${page.metadataTitle} | ${SITE_NAME}`,
          }
        : page.metadataTitle,
    description: page.description,
    alternates: {
      canonical: page.pathname,
    },
    openGraph: {
      type: "website",
      url: page.pathname,
      siteName: SITE_NAME,
      title: `${page.metadataTitle} | ${SITE_NAME}`,
      description: page.description,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.metadataTitle} | ${SITE_NAME}`,
      description: page.description,
    },
    robots: DEFAULT_ROBOTS,
  };
}

export function buildNoIndexMetadata(
  title: string,
  description: string,
  pathname: string,
  follow = false,
): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: pathname,
    },
    robots: {
      index: false,
      follow,
      googleBot: {
        index: false,
        follow,
        noimageindex: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function buildRootMetadata(): Metadata {
  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();

  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: SITE_NAME,
    title: {
      default: `${SITE_NAME} | ${SITE_TAGLINE}`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: "/",
      siteName: SITE_NAME,
      title: `${SITE_NAME} | ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} | ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
    },
    robots: DEFAULT_ROBOTS,
    verification: googleVerification ? { google: googleVerification } : undefined,
    other: bingVerification
      ? {
          "msvalidate.01": bingVerification,
        }
      : undefined,
  };
}

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: getAbsoluteUrl("/"),
    email: SUPPORT_EMAIL,
    description: SITE_DESCRIPTION,
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: getAbsoluteUrl("/"),
    description: SITE_DESCRIPTION,
  };
}

export function buildSoftwareApplicationJsonLd(options?: {
  pageName?: string;
  pageDescription?: string;
  includeOffers?: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: getAbsoluteUrl("/"),
    description: options?.pageDescription ?? SITE_DESCRIPTION,
    audience: {
      "@type": "Audience",
      audienceType: "Hourly freelancers",
    },
    offers: options?.includeOffers
      ? pricingPlans.map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          price: plan.price.replace("$", ""),
          priceCurrency: "USD",
          description: plan.summary,
          url: getAbsoluteUrl("/pricing"),
        }))
      : undefined,
  };
}

export function buildFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(pageKey: Exclude<PublicPageKey, "home">) {
  const page = getPublicPage(pageKey);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: getAbsoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: page.navLabel,
        item: getAbsoluteUrl(page.pathname),
      },
    ],
  };
}

export function buildLlmsTxt() {
  const lines = [
    `# ${SITE_NAME}`,
    `> ${SITE_TAGLINE}.`,
    "",
    "## Public pages",
  ];

  for (const page of [getPublicPage("home"), ...Array.from(publicPageMapValues()).filter((page) => page.key !== "home")]) {
    lines.push(`- [${page.metadataTitle}](${getAbsoluteUrl(page.pathname)}): ${page.description}`);
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("- Private dashboard and authenticated app routes are intentionally excluded.");
  lines.push("- Use llms-full.txt for a clean long-form text export of the public marketing content.");

  return lines.join("\n");
}

function* publicPageMapValues() {
  yield getPublicPage("features");
  yield getPublicPage("pricing");
  yield getPublicPage("how-it-works");
  yield getPublicPage("faq");
  yield getPublicPage("hourly-freelancers");
}

export function buildLlmsFullTxt() {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    SITE_DESCRIPTION,
    "",
    "TimeProof is a web application for hourly freelancers who need time-based invoicing, billing rules, and client-ready invoice detail.",
    "",
  ];

  for (const page of [getPublicPage("home"), ...Array.from(publicPageMapValues())]) {
    lines.push(`## ${page.metadataTitle}`);
    lines.push(`URL: ${getAbsoluteUrl(page.pathname)}`);
    lines.push("");
    lines.push(page.heroDescription);
    lines.push("");

    for (const section of page.sections) {
      lines.push(`### ${section.heading}`);
      lines.push("");
      for (const paragraph of section.paragraphs) {
        lines.push(paragraph);
        lines.push("");
      }
      if (section.bullets?.length) {
        for (const bullet of section.bullets) {
          lines.push(`- ${bullet}`);
        }
        lines.push("");
      }
    }

    if (page.key === "pricing") {
      lines.push("### Pricing plans");
      lines.push("");
      for (const plan of pricingPlans) {
        lines.push(`- ${plan.name}: ${plan.price}${plan.cadence} — ${plan.summary}`);
        for (const feature of plan.features) {
          lines.push(`  - ${feature}`);
        }
      }
      lines.push("");
    }

    if (page.key === "faq") {
      lines.push("### Frequently asked questions");
      lines.push("");
      for (const item of faqItems) {
        lines.push(`- ${item.question}`);
        lines.push(`  ${item.answer}`);
      }
      lines.push("");
    }
  }

  lines.push("## Private routes");
  lines.push("");
  lines.push("Authenticated dashboard routes, account settings, and API endpoints are intentionally excluded from this file.");

  return lines.join("\n");
}
