import Link from "next/link";
import { faqItems, getPublicPage, pricingPlans, type PublicPageKey } from "@/lib/marketing-content";
import { PublicPageShell } from "@/components/marketing/public-page-shell";

export function MarketingPage({ pageKey }: { pageKey: Exclude<PublicPageKey, "home"> }) {
  const page = getPublicPage(pageKey);

  return (
    <PublicPageShell page={page}>
      {pageKey === "pricing" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-5 lg:grid-cols-2">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-3xl border p-6 ${plan.name === "Pro" ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}
              >
                <h2 className="text-2xl font-bold text-slate-900">{plan.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{plan.summary}</p>
                <div className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
                  {plan.price}
                  <span className="text-base font-medium text-slate-500">{plan.cadence}</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {pageKey === "faq" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-5">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-2xl bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-900">{item.question}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-300/30 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight">Ready to make invoice day lighter?</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              TimeProof is built to help hourly freelancers capture the work clearly, bill it consistently, and send invoices with less back-and-forth.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
            >
              Start free
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-900"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
