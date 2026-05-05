"use client";

interface InvoiceTotalsProps {
  subtotal: string;
  tax: string;
  discount: string;
  amountDue: string;
  taxLabel: string;
  showTax: boolean;
  showDiscount: boolean;
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#e0ccb0] py-4 text-base text-[#2e241b]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5f5042]">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function InvoiceTotals({
  subtotal,
  tax,
  discount,
  amountDue,
  taxLabel,
  showTax,
  showDiscount,
}: InvoiceTotalsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <TotalRow label="Subtotal" value={subtotal} />
        {showTax ? <TotalRow label={taxLabel} value={tax} /> : null}
        {showDiscount ? <TotalRow label="Discount" value={discount} /> : null}
      </div>

      <div className="rounded-[26px] border border-[#cda56d] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,239,227,0.96))] px-6 py-7 text-center shadow-[0_18px_50px_rgba(188,151,98,0.12)]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.36em] text-[#9c7846]">Amount Due</p>
        <div className="mx-auto mt-3 flex max-w-[190px] items-center gap-3 text-[#c29a62]">
          <div className="h-px flex-1 bg-[#d7bb92]" />
          <span className="text-base">*</span>
          <div className="h-px flex-1 bg-[#d7bb92]" />
        </div>
        <p className="mt-5 break-words font-serif text-[3.6rem] leading-none text-[#111111] sm:text-[4.6rem]">
          {amountDue}
        </p>
      </div>
    </div>
  );
}
