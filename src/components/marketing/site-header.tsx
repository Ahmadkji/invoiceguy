import Link from "next/link";
import { Clock } from "lucide-react";
import { publicPages } from "@/lib/marketing-content";

const navPages = publicPages.filter((page) => page.pathname !== "/");

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#F8FAFC]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">TimeProof</div>
            <div className="text-xs text-slate-500">Invoicing for hourly freelancers</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {navPages.map((page) => (
            <Link
              key={page.pathname}
              href={page.pathname}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {page.navLabel}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
