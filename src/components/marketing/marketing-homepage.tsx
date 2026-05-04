import Link from "next/link";
import { featureHighlights, getPublicPage, pricingPlans, workflowSteps } from "@/lib/marketing-content";
import { PublicPageShell } from "@/components/marketing/public-page-shell";

export function MarketingHomepage() {
  const page = getPublicPage("home");

  return (
    <PublicPageShell page={page}>
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl shadow-slate-300/40">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Why freelancers switch
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">
            Keep the invoice tied to the actual work, not your memory.
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
            <p>
              TimeProof keeps tracked time, rate context, and task descriptions in the same system so invoice day feels like review instead of reconstruction.
            </p>
            <p>
              That means fewer missed tiny tasks, fewer awkward explanations after sending an invoice, and fewer spreadsheets trying to represent work that already happened.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Operational snapshot</p>
          <dl className="mt-5 space-y-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <dt className="text-sm text-slate-500">Capture modes</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">Timer, manual entry, tiny task</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <dt className="text-sm text-slate-500">Billing logic</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">Standard time, round-up rules, minimums</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <dt className="text-sm text-slate-500">Invoice detail</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">Simple, standard, audit-ready</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Core workflow</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              A workflow designed around how hourly freelancers actually bill.
            </h2>
          </div>
          <Link href="/how-it-works" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Read the full walkthrough
          </Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <article key={step.title} className="rounded-2xl bg-slate-50 p-5">
              <div className="text-sm font-semibold text-emerald-600">Step {index + 1}</div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Feature set</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Focused tools for time-based invoicing
            </h2>
          </div>
          <Link href="/features" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Explore every feature
          </Link>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {featureHighlights.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Pricing overview</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Two plans, one focused workflow
            </h2>
          </div>
          <Link href="/pricing" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Compare plans
          </Link>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-3xl border p-6 ${plan.name === "Pro" ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}
            >
              <div className="flex items-end gap-2">
                <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                <p className="text-sm text-slate-500">{plan.summary}</p>
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
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
    </PublicPageShell>
  );
}
