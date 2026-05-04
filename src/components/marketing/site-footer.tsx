import Link from "next/link";
import { Clock } from "lucide-react";
import { publicPages } from "@/lib/marketing-content";

const footerPages = publicPages.filter((page) => page.pathname !== "/");

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">TimeProof</div>
                <div className="text-sm text-slate-500">Time-based invoicing software for hourly freelancers</div>
              </div>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              Capture work sessions, apply billing rules automatically, and send invoices clients can understand without rebuilding your week in a spreadsheet.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Explore</h2>
            <div className="mt-4 space-y-3">
              {footerPages.slice(0, 3).map((page) => (
                <Link
                  key={page.pathname}
                  href={page.pathname}
                  className="block text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  {page.navLabel}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">More</h2>
            <div className="mt-4 space-y-3">
              {footerPages.slice(3).map((page) => (
                <Link
                  key={page.pathname}
                  href={page.pathname}
                  className="block text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  {page.navLabel}
                </Link>
              ))}
              <Link href="/signin" className="block text-sm text-slate-600 transition-colors hover:text-slate-900">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
          © 2026 TimeProof. Built for freelancers who bill by the hour.
        </div>
      </div>
    </footer>
  );
}
