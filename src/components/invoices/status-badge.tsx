"use client";

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
  { label: string; icon: React.ReactNode; dot: string; bg: string; border: string; text: string }
> = {
  draft: {
    label: "Draft",
    icon: <FileText className="w-3 h-3" />,
    dot: "bg-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
  },
  sent: {
    label: "Sent",
    icon: <Send className="w-3 h-3" />,
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  paid: {
    label: "Paid",
    icon: <CheckCircle className="w-3 h-3" />,
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  void: {
    label: "Void",
    icon: <XCircle className="w-3 h-3" />,
    dot: "bg-red-400",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
  },
};

export function StatusBadge({ status, overdue = false, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 border rounded-lg font-medium",
          size === "sm" && "px-2 py-0.5 text-[11px] gap-1",
          size === "md" && "px-2.5 py-1 text-xs",
          size === "lg" && "px-3 py-1.5 text-sm",
          config.bg,
          config.border,
          config.text
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
        {size !== "sm" && config.icon}
        {config.label}
      </span>
      {overdue && (
        <span
          className={cn(
            "inline-flex items-center gap-1 border rounded-lg font-medium bg-red-50 text-red-700 border-red-200",
            size === "sm" && "px-2 py-0.5 text-[11px]",
            size === "md" && "px-2.5 py-1 text-xs",
            size === "lg" && "px-3 py-1.5 text-sm"
          )}
        >
          <AlertCircle className="w-3 h-3" />
          Overdue
        </span>
      )}
    </div>
  );
}
