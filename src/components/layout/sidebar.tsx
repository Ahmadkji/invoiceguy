"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Timer,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useAppStore } from "@/lib/store/use-app-store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/time", label: "Time", icon: Timer },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function CommandDock() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-close sidebar on mobile route change
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile, setSidebarOpen]);

  const handleNavClick = useCallback(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile, setSidebarOpen]);

  const sidebarWidth = collapsed ? 72 : 240;

  // On mobile: sidebar is always 240px wide (expanded) when open, hidden when closed
  const currentWidth = isMobile ? 240 : sidebarWidth;
  const shouldShow = isMobile ? sidebarOpen : true;

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: currentWidth,
          x: shouldShow ? 0 : -currentWidth,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-0 bottom-0 bg-white border-r border-slate-100 z-50 flex flex-col"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-50">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={handleNavClick}>
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <AnimatePresence>
              {(!collapsed || isMobile) && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-slate-900 text-lg whitespace-nowrap overflow-hidden"
                >
                  TimeProof
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed && !isMobile ? item.label : undefined}
                onClick={handleNavClick}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-emerald-50 rounded-xl"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 flex-shrink-0 ${isActive ? "text-emerald-600" : ""}`} />
                <AnimatePresence>
                  {(!collapsed || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium relative z-10 whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !collapsed && !isMobile && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-emerald-500"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle - hidden on mobile */}
        <div className="p-3 border-t border-slate-50 hidden md:block">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
