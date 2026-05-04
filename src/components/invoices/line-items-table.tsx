"use client";

import { motion } from "framer-motion";
import {
  formatCurrency,
  formatMinutes,
  formatTimeRange,
  getRuleLabel,
} from "@/lib/billing-rules";
import { InvoiceItem, TimeEntry } from "@/lib/types";

interface LineItemsTableProps {
  invoiceItems: InvoiceItem[];
  timeEntries: TimeEntry[];
  projects: { id: string; name: string }[];
}

export function LineItemsTable({
  invoiceItems,
  timeEntries,
  projects,
}: LineItemsTableProps) {
  const sortedItems = [...invoiceItems].sort((a, b) => a.sortOrder - b.sortOrder);

  const headerClass =
    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600";
  const rightHeaderClass =
    "px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-600";
  const cellClass = "border-t border-slate-300 px-4 py-3.5 text-sm text-slate-700";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-x-auto border border-slate-300 bg-white"
    >
      {/* Mobile layout */}
      <div className="divide-y divide-slate-200 md:hidden">
        {sortedItems.map((item) => {
          const entry = timeEntries.find((e) => e.id === item.timeEntryId);
          const project = projects.find((p) => p.id === entry?.projectId);
          const projectDisplayName = item.projectNameSnapshot || project?.name || "Hourly work";

          return (
            <div key={item.id} className="p-4 space-y-2">
              <div className="text-sm font-semibold text-slate-900">{item.description}</div>
              <div className="text-xs text-slate-500">
                {entry ? getRuleLabel(entry.billingRuleSnapshot.rule) : "Manual entry"} · {projectDisplayName}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {entry?.entryDate && (
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">Date</div>
                    <div className="mt-0.5 text-sm text-slate-700">
                      {new Date(entry.entryDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-slate-400 uppercase tracking-wide">Session</div>
                  <div className="mt-0.5 text-sm text-slate-700 font-mono">
                    {entry ? formatTimeRange(entry.startTime, entry.endTime) || "—" : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 uppercase tracking-wide">Time</div>
                  <div className="mt-0.5 text-sm text-slate-700 font-mono">
                    {formatMinutes(item.billedMinutes)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 uppercase tracking-wide">Rate</div>
                  <div className="mt-0.5 text-sm text-slate-700 font-mono">
                    {formatCurrency(item.hourlyRate)}/hr
                  </div>
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-900 font-mono">
                {formatCurrency(item.amount)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop layout */}
      <table className="hidden md:table w-full min-w-[820px]">
        <thead className="bg-slate-100">
          <tr>
            <th className={headerClass}>Date</th>
            <th className={headerClass}>Session</th>
            <th className={`${headerClass} w-full`}>Description</th>
            <th className={rightHeaderClass}>Time</th>
            <th className={rightHeaderClass}>Rate</th>
            <th className={rightHeaderClass}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => {
            const entry = timeEntries.find((e) => e.id === item.timeEntryId);
            const project = projects.find((p) => p.id === entry?.projectId);
            const projectDisplayName = item.projectNameSnapshot || project?.name || "Hourly work";

            return (
              <tr key={item.id}>
                <td className={`${cellClass} whitespace-nowrap text-slate-500`}>
                  {entry?.entryDate
                    ? new Date(entry.entryDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </td>
                <td className={`${cellClass} whitespace-nowrap text-slate-500 font-mono`}>
                  {entry ? formatTimeRange(entry.startTime, entry.endTime) || "—" : "—"}
                </td>
                <td className={cellClass}>
                  <div className="font-medium text-slate-900">{item.description}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {entry ? getRuleLabel(entry.billingRuleSnapshot.rule) : "Manual entry"} · {projectDisplayName}
                  </div>
                </td>
                <td className={`${cellClass} text-right font-mono`}>
                  {formatMinutes(item.billedMinutes)}
                </td>
                <td className={`${cellClass} text-right font-mono`}>
                  {formatCurrency(item.hourlyRate)}/hr
                </td>
                <td className={`${cellClass} text-right font-mono font-semibold text-slate-900`}>
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </motion.div>
  );
}
