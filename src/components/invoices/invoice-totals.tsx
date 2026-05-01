"use client";

import { formatCurrency } from "@/lib/billing-rules";
import { Invoice, UserProfile } from "@/lib/types";

interface InvoiceTotalsProps {
  invoice: Invoice;
  profile: UserProfile;
}

export function InvoiceTotals({ invoice, profile }: InvoiceTotalsProps) {
  const showTaxRate =
    invoice.taxAmount > 0 && typeof profile.taxPercentage === "number";
  const formattedTaxRate = showTaxRate
    ? `${Number.isInteger(profile.taxPercentage) ? profile.taxPercentage : profile.taxPercentage?.toFixed(2)}%`
    : null;

  return (
    <div className="w-full border border-slate-300 bg-white p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span className="font-mono text-slate-900">
            {formatCurrency(invoice.subtotal, profile.defaultCurrency)}
          </span>
        </div>

        {showTaxRate && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Tax Rate</span>
            <span className="font-mono text-slate-900">{formattedTaxRate}</span>
          </div>
        )}

        {invoice.taxAmount > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{profile.taxLabel || "Tax"}</span>
            <span className="font-mono text-slate-900">
              {formatCurrency(invoice.taxAmount, profile.defaultCurrency)}
            </span>
          </div>
        )}

        {invoice.discountAmount > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Discount</span>
            <span className="font-mono text-slate-900">
              -{formatCurrency(invoice.discountAmount, profile.defaultCurrency)}
            </span>
          </div>
        )}

        <div className="border-t border-slate-300 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Total
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {profile.defaultCurrency === "$" ? "USD" : profile.defaultCurrency}
              </p>
            </div>
            <span className="font-mono text-2xl font-bold text-slate-900">
              {formatCurrency(invoice.totalAmount, profile.defaultCurrency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
