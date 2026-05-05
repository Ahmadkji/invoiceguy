"use client";

import { motion } from "framer-motion";
import { PresentedInvoiceLineItem } from "@/lib/invoices/presentation";

interface LineItemsTableProps {
  lineItems: PresentedInvoiceLineItem[];
}

export function LineItemsTable({ lineItems }: LineItemsTableProps) {
  const headerClass =
    "border-r border-[#d9c3a1] px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5f5042] last:border-r-0";
  const rightHeaderClass = `${headerClass} text-right`;
  const cellClass =
    "border-r border-t border-[#e6d7c2] px-4 py-5 text-sm text-[#4e4134] align-top last:border-r-0";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden rounded-[24px] border border-[#d9c3a1] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(252,247,240,0.95))] shadow-[0_16px_45px_rgba(188,151,98,0.08)]"
    >
      <div className="divide-y divide-[#eadbc7] lg:hidden">
        {lineItems.map((item) => (
          <div key={item.id} className="space-y-3 p-4 sm:p-5">
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-[#a8834d]">{item.date}</div>
            <div className="font-serif text-2xl text-[#18120d]">{item.description}</div>
            <div className="text-sm text-[#7b6854]">{item.meta}</div>

            <div className="grid grid-cols-2 gap-4 border-t border-[#eadbc7] pt-4 text-sm">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9c7c4d]">
                  Time
                </div>
                <div className="mt-1 text-[#3f3429]">{item.session}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9c7c4d]">
                  Hours
                </div>
                <div className="mt-1 text-[#3f3429]">{item.hours}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9c7c4d]">
                  Rate
                </div>
                <div className="mt-1 text-[#3f3429]">{item.rate}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9c7c4d]">
                  Amount
                </div>
                <div className="mt-1 font-semibold text-[#18120d]">{item.amount}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <table className="hidden w-full table-fixed lg:table">
        <thead className="bg-[linear-gradient(180deg,rgba(250,242,230,0.95),rgba(246,236,220,0.98))]">
          <tr>
            <th className={`${headerClass} w-[132px]`}>Date</th>
            <th className={`${headerClass} w-[128px]`}>Time</th>
            <th className={`${headerClass} w-auto`}>Description</th>
            <th className={`${rightHeaderClass} w-[108px]`}>Hours</th>
            <th className={`${rightHeaderClass} w-[130px]`}>Rate</th>
            <th className={`${rightHeaderClass} w-[120px]`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => (
            <tr key={item.id}>
              <td className={`${cellClass} whitespace-nowrap text-[#3f3429]`}>{item.date}</td>
              <td className={`${cellClass} whitespace-nowrap text-[#3f3429]`}>{item.session}</td>
              <td className={cellClass}>
                <div className="break-words font-medium text-[#18120d]">{item.description}</div>
                <div className="mt-1.5 break-words text-xs text-[#8c7558]">{item.meta}</div>
              </td>
              <td className={`${cellClass} whitespace-nowrap text-right`}>{item.hours}</td>
              <td className={`${cellClass} whitespace-nowrap text-right`}>{item.rate}</td>
              <td className={`${cellClass} whitespace-nowrap text-right font-semibold text-[#18120d]`}>
                {item.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
