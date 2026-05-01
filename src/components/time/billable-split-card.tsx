"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Briefcase, Coffee, Phone, BookOpen, MoreHorizontal } from "lucide-react";
import { TimeEntry, NonBillableCategory, NON_BILLABLE_LABELS } from "@/lib/types";
import { formatMinutes } from "@/lib/billing-rules";

interface BillableSplitCardProps {
  entries: TimeEntry[];
}

const CATEGORY_ICONS: Record<NonBillableCategory, typeof Coffee> = {
  admin: Briefcase,
  client_communication: Phone,
  internal: Clock,
  learning: BookOpen,
  other: MoreHorizontal,
};

const CATEGORY_COLORS: Record<NonBillableCategory, string> = {
  admin: "text-amber-600 bg-amber-50",
  client_communication: "text-blue-600 bg-blue-50",
  internal: "text-slate-600 bg-slate-100",
  learning: "text-violet-600 bg-violet-50",
  other: "text-gray-600 bg-gray-50",
};

export function BillableSplitCard({ entries }: BillableSplitCardProps) {
  const split = useMemo(() => {
    const billableEntries = entries.filter((e) => e.isBillable);
    const nonBillableEntries = entries.filter((e) => !e.isBillable);

    const billableMinutes = billableEntries.reduce((sum, e) => sum + e.actualMinutes, 0);
    const nonBillableMinutes = nonBillableEntries.reduce((sum, e) => sum + e.actualMinutes, 0);
    const totalMinutes = billableMinutes + nonBillableMinutes;

    // Group non-billable by category
    const categoryBreakdown = nonBillableEntries.reduce<
      Record<NonBillableCategory, number>
    >(
      (acc, e) => {
        const cat = e.nonBillableCategory || "other";
        acc[cat] = (acc[cat] || 0) + e.actualMinutes;
        return acc;
      },
      { admin: 0, client_communication: 0, internal: 0, learning: 0, other: 0 }
    );

    return {
      billableMinutes,
      nonBillableMinutes,
      totalMinutes,
      billableCount: billableEntries.length,
      nonBillableCount: nonBillableEntries.length,
      categoryBreakdown,
    };
  }, [entries]);

  const billablePct =
    split.totalMinutes > 0
      ? Math.round((split.billableMinutes / split.totalMinutes) * 100)
      : 0;

  const activeCategories = (Object.entries(split.categoryBreakdown) as [NonBillableCategory, number][])
    .filter(([, mins]) => mins > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-100 overflow-hidden"
    >
      <div className="px-4 sm:px-6 py-4 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Billable vs Non-Billable</h3>
          <span className="text-xs font-medium text-slate-400">Today</span>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Bar visual */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Billable {billablePct}%</span>
            <span>Non-billable {100 - billablePct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <motion.div
              className="bg-emerald-500 rounded-l-full"
              initial={{ width: 0 }}
              animate={{ width: `${billablePct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            <div className="bg-slate-300 flex-1 rounded-r-full" />
          </div>
        </div>

        {/* Time totals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 rounded-lg p-3">
            <div className="text-xs font-medium text-emerald-600 mb-1">Billable</div>
            <div className="text-lg font-bold text-emerald-700 font-mono-nums">
              {formatMinutes(split.billableMinutes)}
            </div>
            <div className="text-xs text-emerald-500 mt-0.5">
              {split.billableCount} entries
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs font-medium text-slate-500 mb-1">Non-Billable</div>
            <div className="text-lg font-bold text-slate-700 font-mono-nums">
              {formatMinutes(split.nonBillableMinutes)}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {split.nonBillableCount} entries
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        {activeCategories.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Where your time went
            </div>
            {activeCategories.map(([cat, mins]) => {
              const Icon = CATEGORY_ICONS[cat];
              const colorClass = CATEGORY_COLORS[cat];
              return (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm text-slate-700">{NON_BILLABLE_LABELS[cat]}</span>
                  </div>
                  <span className="text-sm font-mono-nums font-medium text-slate-600">
                    {formatMinutes(mins)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
