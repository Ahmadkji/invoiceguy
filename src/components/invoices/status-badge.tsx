import type { ReactNode } from "react";
import { FileText, Send, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { InvoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: InvoiceStatus;
  overdue?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<
  InvoiceStatus,
  { label: string; icon: ReactNode; dot: string; bg: string; border: string; text: string }
> = {
  draft: {
    label: "Draft",
    icon: <FileText aria-hidden="true" className="h-3 w-3" />,
    dot: "bg-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
  },
  sent: {
    label: "Sent",
    icon: <Send aria-hidden="true" className="h-3 w-3" />,
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  paid: {
    label: "Paid",
    icon: <CheckCircle aria-hidden="true" className="h-3 w-3" />,
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  void: {
    label: "Void",
    icon: <XCircle aria-hidden="true" className="h-3 w-3" />,
    dot: "bg-red-400",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
  },
};

export function StatusBadge({ status, overdue = false, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border font-medium",
          size === "sm" && "gap-1 px-2 py-0.5 text-[11px]",
          size === "md" && "px-2.5 py-1 text-xs",
          size === "lg" && "px-3 py-1.5 text-sm",
          config.bg,
          config.border,
          config.text
        )}
      >
        <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
        {size !== "sm" && config.icon}
        {config.label}
      </span>
      {overdue && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 font-medium text-red-700",
            size === "sm" && "px-2 py-0.5 text-[11px]",
            size === "md" && "px-2.5 py-1 text-xs",
            size === "lg" && "px-3 py-1.5 text-sm"
          )}
        >
          <AlertCircle aria-hidden="true" className="h-3 w-3" />
          Overdue
        </span>
      )}
    </div>
  );
}
