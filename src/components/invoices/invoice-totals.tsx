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
    <div className="flex items-center justify-between gap-4 border-b border-[#e0ccb0] py-4 text-base text-[#2e241b] print:py-2 print:text-[10px]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5f5042] print:text-[9px] print:tracking-[0.12em]">
        {label}
      </span>
      <span className="text-right tabular-nums break-words">{value}</span>
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
    <div className="space-y-6 print:space-y-3">
      <div className="space-y-1">
        <TotalRow label="Subtotal" value={subtotal} />
        {showTax ? <TotalRow label={taxLabel || "Tax"} value={tax} /> : null}
        {showDiscount ? <TotalRow label="Discount" value={discount} /> : null}
      </div>

      <div className="rounded-[26px] border border-[#cda56d] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,239,227,0.96))] px-6 py-7 text-center shadow-[0_18px_50px_rgba(188,151,98,0.12)] print:rounded-xl print:px-4 print:py-4 print:shadow-none">
        <p className="text-[12px] font-semibold uppercase tracking-[0.36em] text-[#9c7846] print:text-[9px] print:tracking-[0.16em]">
          Amount Due
        </p>
        <div className="mx-auto mt-3 flex max-w-[190px] items-center gap-3 text-[#c29a62] print:mt-2 print:max-w-[120px]">
          <div className="h-px flex-1 bg-[#d7bb92]" />
          <span aria-hidden="true" className="text-base print:text-xs">
            *
          </span>
          <div className="h-px flex-1 bg-[#d7bb92]" />
        </div>
        <p className="mt-5 break-words font-serif text-[2.8rem] leading-none text-[#111111] tabular-nums sm:text-[3.8rem] print:mt-3 print:text-[2rem]">
          {amountDue}
        </p>
      </div>
    </div>
  );
}
