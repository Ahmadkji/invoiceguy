import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import type { ContentSection, PublicPageDefinition } from "@/lib/marketing-content";

function SectionBlock({ section }: { section: ContentSection }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">{section.heading}</h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {section.bullets?.length ? (
        <ul className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          {section.bullets.map((bullet) => (
            <li key={bullet} className="rounded-2xl bg-slate-50 px-4 py-3">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function PublicPageShell({
  page,
  children,
}: {
  page: PublicPageDefinition;
  children?: React.ReactNode;
}) {
  const isHome = page.pathname === "/";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_42%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            {!isHome ? (
              <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
                <Link href="/" className="hover:text-slate-900">
                  Home
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span>{page.navLabel}</span>
              </div>
            ) : null}

            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
                {page.heroEyebrow}
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                {page.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{page.heroDescription}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={page.ctaHref}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  {page.ctaLabel}
                </Link>
                {page.pathname !== "/pricing" ? (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    View pricing
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {children}
            {page.sections.map((section) => (
              <SectionBlock key={section.heading} section={section} />
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
