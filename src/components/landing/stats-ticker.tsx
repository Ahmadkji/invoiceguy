"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { TrendingDown, DollarSign, FileQuestion, Clock } from "lucide-react";

const stats = [
  {
    icon: TrendingDown,
    value: 2.3,
    suffix: " hours",
    label: "Lost to unbilled tiny tasks",
    sublabel: "per week",
    color: "text-rose-500",
    bgColor: "bg-rose-50",
    sparkline: [30, 45, 25, 60, 40, 55, 35, 50, 30, 45],
  },
  {
    icon: DollarSign,
    value: 147,
    prefix: "$",
    suffix: "",
    label: "Left on the table",
    sublabel: "per month",
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    sparkline: [20, 35, 30, 55, 45, 60, 50, 70, 65, 80],
  },
  {
    icon: FileQuestion,
    value: 8,
    suffix: " invoices",
    label: "Questioned by clients",
    sublabel: "per month",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    sparkline: [40, 30, 50, 35, 55, 40, 60, 45, 50, 55],
  },
  {
    icon: Clock,
    value: 14,
    suffix: " min",
    label: "Saved per entry",
    sublabel: "with auto-rounding",
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
    sparkline: [10, 20, 35, 45, 55, 65, 70, 75, 80, 85],
  },
];

function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = value * eased;
      setDisplay(
        value % 1 === 0
          ? Math.round(current).toString()
          : current.toFixed(1)
      );
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <span ref={ref} className="font-mono-nums">
      {prefix}{display}{suffix}
    </span>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 30 - ((v - min) / range) * 30;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" className="w-full h-10 mt-3 opacity-40" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={color}
      />
    </svg>
  );
}

export function StatsTicker() {
  return (
    <section className="py-20 bg-white border-y border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            The hidden cost of messy billing
          </h2>
          <p className="text-lg text-slate-500">
            Freelancers lose more than they realize
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:shadow-slate-200/40 transition-all overflow-hidden"
              >
                {/* Background glow */}
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${stat.bgColor} opacity-50 blur-2xl`} />

                <div className="relative">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} ${stat.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className={`text-4xl font-bold ${stat.color} mb-1`}>
                    <AnimatedCounter
                      value={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                    />
                  </div>

                  <div className="text-sm font-semibold text-slate-900">
                    {stat.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {stat.sublabel}
                  </div>

                  <MiniSparkline data={stat.sparkline} color={stat.color} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
