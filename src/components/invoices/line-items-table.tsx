"use client";

import { motion } from "framer-motion";
import {
  formatCurrency,
  formatDecimalHours,
  formatMinutes,
  getRuleLabel,
} from "@/lib/billing-rules";
import { InvoiceDetailLevel, InvoiceItem, TimeEntry } from "@/lib/types";

interface LineItemsTableProps {
  detailLevel: InvoiceDetailLevel;
  invoiceItems: InvoiceItem[];
  timeEntries: TimeEntry[];
  projects: { id: string; name: string }[];
  showActualTime: boolean;
}

export function LineItemsTable({
  detailLevel,
  invoiceItems,
  timeEntries,
  projects,
  showActualTime,
}: LineItemsTableProps) {
  const sortedItems = [...invoiceItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const showDescriptionMeta = detailLevel !== "simple";

  const getStandardGroups = () => {
    const groups: Record<
      string,
      {
        description: string;
        items: InvoiceItem[];
        totalActual: number;
        totalBilled: number;
        sortOrder: number;
      }
    > = {};

    sortedItems.forEach((item) => {
      const entry = timeEntries.find((e) => e.id === item.timeEntryId);
      // Prefer snapshot project name over live project lookup
      const project = projects.find((p) => p.id === entry?.projectId);
      const key = item.projectNameSnapshot || project?.name || "Other";

      if (!groups[key]) {
        groups[key] = {
          description: key,
          items: [],
          totalActual: 0,
          totalBilled: 0,
          sortOrder: item.sortOrder,
        };
      }

      groups[key].items.push(item);
      groups[key].totalActual += item.actualMinutes;
      groups[key].totalBilled += item.billedMinutes;
    });

    return Object.values(groups).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const headerClass =
    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600";
  const rightHeaderClass =
    "px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-600";
  const cellClass = "border-t border-slate-300 px-4 py-3.5 text-sm text-slate-700";

  return (
    <motion.div
      key={detailLevel}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="overflow-x-auto border border-slate-300 bg-white"
    >
      {detailLevel === "simple" && (
        <table className="w-full min-w-[520px]">
          <thead className="bg-slate-100">
            <tr>
              <th className={`${headerClass} w-full`}>Description</th>
              <th className={rightHeaderClass}>Hours</th>
              <th className={rightHeaderClass}>Rate</th>
              <th className={rightHeaderClass}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const entry = timeEntries.find((e) => e.id === item.timeEntryId);
              const project = projects.find((p) => p.id === entry?.projectId);
              // Prefer snapshot project name over live project lookup
              const projectDisplayName = item.projectNameSnapshot || project?.name || "Hourly work";

              return (
                <tr key={item.id}>
                  <td className={cellClass}>
                    <div className="font-medium text-slate-900">{item.description}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {projectDisplayName}
                    </div>
                  </td>
                  <td className={`${cellClass} text-right font-mono`}>
                    {formatDecimalHours(item.billedMinutes)}
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
      )}

      {detailLevel === "standard" && (
        <table className="w-full min-w-[520px]">
          <thead className="bg-slate-100">
            <tr>
              <th className={`${headerClass} w-full`}>Description</th>
              <th className={rightHeaderClass}>Hours</th>
              <th className={rightHeaderClass}>Rate</th>
              <th className={rightHeaderClass}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {getStandardGroups().map((group) => (
              <tr key={group.description}>
                <td className={cellClass}>
                  <div className="font-medium text-slate-900">{group.description}</div>
                  {showDescriptionMeta && (
                    <div className="mt-1 text-xs text-slate-500">
                      {group.items.map((invoiceItem) => invoiceItem.description).join(" · ")}
                    </div>
                  )}
                </td>
                <td className={`${cellClass} text-right font-mono`}>
                  <div>{formatDecimalHours(group.totalBilled)}</div>
                  {showActualTime && group.totalActual !== group.totalBilled && (
                    <div className="mt-1 text-[11px] text-slate-500">
                      Actual {formatMinutes(group.totalActual)}
                    </div>
                  )}
                </td>
                <td className={`${cellClass} text-right font-mono`}>
                  {formatCurrency(group.items[0]?.hourlyRate || 0)}/hr
                </td>
                <td className={`${cellClass} text-right font-mono font-semibold text-slate-900`}>
                  {formatCurrency(
                    group.items.reduce((sum, invoiceItem) => sum + invoiceItem.amount, 0)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {detailLevel === "audit" && (
        <table className={`w-full ${showActualTime ? "min-w-[760px]" : "min-w-[680px]"}`}>
          <thead className="bg-slate-100">
            <tr>
              <th className={headerClass}>Date</th>
              <th className={`${headerClass} w-full`}>Description</th>
              {showActualTime && <th className={rightHeaderClass}>Actual</th>}
              <th className={rightHeaderClass}>Billed</th>
              <th className={rightHeaderClass}>Rate</th>
              <th className={rightHeaderClass}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const entry = timeEntries.find((e) => e.id === item.timeEntryId);

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
                  <td className={cellClass}>
                    <div className="font-medium text-slate-900">{item.description}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {entry ? getRuleLabel(entry.billingRuleSnapshot.rule) : "Manual entry"}
                    </div>
                  </td>
                  {showActualTime && (
                    <td className={`${cellClass} text-right font-mono text-slate-500`}>
                      {entry ? formatMinutes(entry.actualMinutes) : "—"}
                    </td>
                  )}
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
      )}
    </motion.div>
  );
}
