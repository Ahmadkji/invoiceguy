export type ContentSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type PublicPageKey =
  | "home"
  | "features"
  | "pricing"
  | "how-it-works"
  | "faq"
  | "hourly-freelancers";

export type PublicPageDefinition = {
  key: PublicPageKey;
  pathname: string;
  navLabel: string;
  metadataTitle: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
  sections: ContentSection[];
};

export const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    cadence: "/month",
    summary: "Best for freelancers who want to test a calmer invoicing workflow.",
    features: [
      "2 active clients",
      "5 invoices per month",
      "Manual time entries",
      "Basic billing rules",
      "PDF export with TimeProof branding",
    ],
  },
  {
    name: "Pro",
    price: "$9",
    cadence: "/month",
    summary: "Built for hourly freelancers who invoice every week and need their time data to stay reliable.",
    features: [
      "Unlimited clients and invoices",
      "Timer, manual entry, and tiny task capture",
      "Advanced billing increments and minimums",
      "Multiple invoice detail levels",
      "Brand-ready PDFs without watermark",
    ],
  },
] as const;

export const faqItems = [
  {
    question: "Who is TimeProof built for?",
    answer:
      "TimeProof is built for hourly freelancers and solo service providers who need clean invoices backed by real time records.",
  },
  {
    question: "Can I capture tiny tasks that usually go unbilled?",
    answer:
      "Yes. Tiny Task Mode is designed for short support requests, quick edits, password resets, and other small jobs that are easy to forget.",
  },
  {
    question: "How does TimeProof handle billing increments?",
    answer:
      "You can apply exact billing, rounding rules, and minimum billable times so the app calculates billed minutes before the invoice is created.",
  },
  {
    question: "Can clients see actual time versus billed time?",
    answer:
      "Yes. TimeProof supports multiple detail levels, including audit-style invoices that show actual work time, billed time, and the rule that was applied.",
  },
  {
    question: "Does TimeProof replace accounting software?",
    answer:
      "No. TimeProof focuses on time-based invoicing for freelancers. It helps you capture work accurately and turn it into invoices clients can understand.",
  },
  {
    question: "Can I create invoices from tracked time?",
    answer:
      "Yes. You can import uninvoiced tracked entries, review the line items, and generate a draft or send-ready invoice from the same workflow.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. The free plan is designed for early-stage freelancers who want to test the workflow before moving to unlimited usage.",
  },
  {
    question: "Why does clear time data matter so much?",
    answer:
      "Clients are more likely to pay quickly when the invoice is easy to understand. TimeProof keeps the work log, billing rule, and invoice language aligned.",
  },
] as const;

export const featureHighlights = [
  {
    title: "Capture work in the moment",
    description:
      "Use the timer, manual entry, or tiny task mode to keep your billable record complete while the work is still fresh.",
  },
  {
    title: "Let billing rules handle the math",
    description:
      "Apply rounding, minimums, and project-specific rates so the invoice reflects your real billing policy instead of ad-hoc spreadsheet edits.",
  },
  {
    title: "Send invoices clients can trust",
    description:
      "Choose a detail level that fits the client relationship and show actual time, billed time, and descriptions in a format that feels professional.",
  },
] as const;

export const workflowSteps = [
  {
    title: "Track the work",
    description: "Start a timer, log manual time, or save a tiny task before it disappears from memory.",
  },
  {
    title: "Apply billing rules",
    description: "TimeProof calculates billed minutes using the rules you set for the client or project.",
  },
  {
    title: "Review the invoice draft",
    description: "Import uninvoiced entries, adjust descriptions, and confirm totals before you send.",
  },
  {
    title: "Share a client-ready invoice",
    description: "Choose the right detail level and export an invoice that answers the usual client questions upfront.",
  },
] as const;

export const publicPages: readonly PublicPageDefinition[] = [
  {
    key: "home",
    pathname: "/",
    navLabel: "Overview",
    metadataTitle: "Time-Based Invoicing Software for Hourly Freelancers",
    heroEyebrow: "Time-based invoicing for hourly freelancers",
    heroTitle: "Turn tracked time into invoices clients can understand.",
    heroDescription:
      "TimeProof helps hourly freelancers capture work sessions, apply billing rules automatically, and send invoices without awkward follow-up explanations.",
    description:
      "Track work sessions, apply billing rules automatically, and send client-ready hourly invoices without spreadsheet math.",
    ctaLabel: "Start tracking time",
    ctaHref: "/signin",
    changeFrequency: "weekly",
    priority: 1,
    sections: [
      {
        heading: "Stop rebuilding your work log every time you invoice",
        paragraphs: [
          "Hourly freelancers lose revenue when time records live in notes apps, chat messages, memory, and half-finished spreadsheets.",
          "TimeProof keeps time capture, billing rules, and invoice creation in one flow so each invoice starts from real work data instead of guesswork.",
        ],
      },
      {
        heading: "Built for client-proof billing",
        paragraphs: [
          "Every part of the product is designed to make hourly invoicing easier to defend. You can show session details, billed minutes, and clean service descriptions in the same invoice.",
        ],
        bullets: [
          "Track exact work sessions across projects",
          "Round time with project-level billing rules",
          "Convert uninvoiced entries into invoice line items",
        ],
      },
      {
        heading: "Simple enough for daily use",
        paragraphs: [
          "TimeProof is not full accounting software. It is a focused operating system for freelancers who bill by the hour and want their invoices to feel fair, clear, and fast to approve.",
        ],
      },
    ],
  },
  {
    key: "features",
    pathname: "/features",
    navLabel: "Features",
    metadataTitle: "Features for Time Tracking and Hourly Invoicing",
    heroEyebrow: "Feature deep dive",
    heroTitle: "Everything you need to track time and invoice with confidence.",
    heroDescription:
      "Explore the features behind TimeProof, from work-session capture to billing increments, invoice detail levels, and PDF-ready delivery.",
    description:
      "Explore timer capture, billing rules, tiny tasks, invoice detail levels, and PDF export for hourly freelancers.",
    ctaLabel: "See pricing",
    ctaHref: "/pricing",
    changeFrequency: "monthly",
    priority: 0.9,
    sections: [
      {
        heading: "Multiple ways to capture billable work",
        paragraphs: [
          "Use a live timer when you want exact session history, a manual entry form when you already know the hours, or tiny task mode for short support work that usually slips away.",
        ],
        bullets: [
          "Live timer for deep work sessions",
          "Manual entry for after-the-fact logging",
          "Tiny task mode for fast administrative requests",
        ],
      },
      {
        heading: "Billing rules that match how freelancers actually charge",
        paragraphs: [
          "Instead of recalculating every invoice by hand, TimeProof applies the billing increment and minimum billable time you choose for the project.",
        ],
        bullets: [
          "Exact time billing",
          "Round-up increments like 5, 10, 15, 30, or 60 minutes",
          "Minimum billable thresholds for small jobs",
        ],
      },
      {
        heading: "Invoice detail levels for different client relationships",
        paragraphs: [
          "Some clients want simple summaries, while others want audit-level detail. TimeProof lets you generate the invoice format that fits the context.",
        ],
        bullets: [
          "Simple summaries for trusted clients",
          "Standard grouped detail for recurring work",
          "Audit-level breakdowns with actual and billed time",
        ],
      },
      {
        heading: "A clear path from tracked time to exported invoice",
        paragraphs: [
          "Import uninvoiced work, clean up the descriptions, review totals, and export a PDF without rebuilding the invoice from scratch.",
        ],
      },
    ],
  },
  {
    key: "pricing",
    pathname: "/pricing",
    navLabel: "Pricing",
    metadataTitle: "Pricing for Hourly Freelancers",
    heroEyebrow: "Simple pricing",
    heroTitle: "Start free, upgrade when the workflow is already paying for itself.",
    heroDescription:
      "TimeProof keeps pricing simple so freelancers can test the workflow early and move to unlimited usage only when they need it.",
    description:
      "Compare TimeProof free and pro pricing for hourly freelancers who need clear, time-based invoicing.",
    ctaLabel: "Start free",
    ctaHref: "/signup",
    changeFrequency: "monthly",
    priority: 0.8,
    sections: [
      {
        heading: "A free plan for early momentum",
        paragraphs: [
          "The free plan gives freelancers enough room to test the core workflow with real clients before committing to a paid tool.",
        ],
      },
      {
        heading: "A pro plan for consistent weekly invoicing",
        paragraphs: [
          "The pro plan removes the limits that get in the way once time tracking and invoicing become part of your weekly routine.",
        ],
      },
      {
        heading: "Pay for clarity, not accounting bloat",
        paragraphs: [
          "TimeProof is priced as a focused invoicing workflow for hourly freelancers. It is meant to reduce lost billable time and shorten the explanation cycle after you send an invoice.",
        ],
      },
    ],
  },
  {
    key: "how-it-works",
    pathname: "/how-it-works",
    navLabel: "How It Works",
    metadataTitle: "How Time-Based Invoicing Works for Freelancers",
    heroEyebrow: "Workflow walkthrough",
    heroTitle: "A calmer path from tracked time to paid invoice.",
    heroDescription:
      "See how TimeProof helps hourly freelancers capture the work, apply billing rules, and build invoices that reduce client friction.",
    description:
      "Learn how TimeProof turns work sessions, billing rules, and invoice detail levels into a clean hourly invoicing workflow.",
    ctaLabel: "Explore features",
    ctaHref: "/features",
    changeFrequency: "monthly",
    priority: 0.75,
    sections: [
      {
        heading: "Step 1: Record the actual work",
        paragraphs: [
          "TimeProof starts with the work session itself. You capture the task note, time spent, and client/project context before the billing conversation begins.",
        ],
      },
      {
        heading: "Step 2: Convert actual time into billed time",
        paragraphs: [
          "The app applies your billing rule so the invoice reflects the way you actually charge, whether that means exact time, round-up increments, or a minimum billable threshold.",
        ],
      },
      {
        heading: "Step 3: Build an invoice from tracked entries",
        paragraphs: [
          "Instead of retyping everything, you import uninvoiced entries and turn them into invoice line items with editable descriptions and clean totals.",
        ],
      },
      {
        heading: "Step 4: Choose the right level of detail",
        paragraphs: [
          "When the invoice is ready, you can decide how much detail the client needs to see. That keeps the explanation burden low while still protecting trust.",
        ],
      },
    ],
  },
  {
    key: "faq",
    pathname: "/faq",
    navLabel: "FAQ",
    metadataTitle: "Hourly Invoicing FAQ for Freelancers",
    heroEyebrow: "Frequently asked questions",
    heroTitle: "Straight answers for freelancers who bill by the hour.",
    heroDescription:
      "This FAQ explains how TimeProof approaches time capture, billing rules, invoice detail, and pricing for hourly freelancers.",
    description:
      "Read common questions about TimeProof, hourly invoicing workflows, billing increments, tiny tasks, and invoice detail levels.",
    ctaLabel: "See how it works",
    ctaHref: "/how-it-works",
    changeFrequency: "monthly",
    priority: 0.7,
    sections: [
      {
        heading: "Answers built from real invoicing pain points",
        paragraphs: [
          "The questions below focus on the issues freelancers run into when clients ask for more detail, short tasks get missed, or spreadsheet math becomes the bottleneck.",
        ],
      },
    ],
  },
  {
    key: "hourly-freelancers",
    pathname: "/for/hourly-freelancers",
    navLabel: "For Freelancers",
    metadataTitle: "Time Tracking and Invoicing for Hourly Freelancers",
    heroEyebrow: "Built for hourly freelancers",
    heroTitle: "The invoicing workflow hourly freelancers actually need.",
    heroDescription:
      "TimeProof is designed for freelancers who want a cleaner handoff from time tracking to invoice delivery without turning their week into admin work.",
    description:
      "TimeProof helps hourly freelancers track work, protect billable minutes, and send clearer invoices with less friction.",
    ctaLabel: "Create your account",
    ctaHref: "/signup",
    changeFrequency: "monthly",
    priority: 0.85,
    sections: [
      {
        heading: "Protect the minutes that disappear between tasks",
        paragraphs: [
          "Hourly freelancers are rarely underpaid because of one giant mistake. Most leakage comes from the small jobs that never make it into the invoice or the manual adjustments that erode confidence.",
        ],
      },
      {
        heading: "Stay credible when clients want proof",
        paragraphs: [
          "When a client asks what happened during a six-hour block of work, TimeProof gives you a consistent record instead of forcing you to reconstruct the story after the fact.",
        ],
      },
      {
        heading: "Invoice faster at the end of the week",
        paragraphs: [
          "By the time you build the invoice, the time entries, billing rules, and rate context are already in the system. That keeps invoice day from becoming a separate project.",
        ],
        bullets: [
          "Less spreadsheet cleanup",
          "Less underbilling on small support work",
          "Less back-and-forth after the invoice lands",
        ],
      },
    ],
  },
] as const;

export const publicPageMap = new Map(publicPages.map((page) => [page.key, page]));

export function getPublicPage(key: PublicPageKey) {
  const page = publicPageMap.get(key);

  if (!page) {
    throw new Error(`Unknown public page: ${key}`);
  }

  return page;
}
