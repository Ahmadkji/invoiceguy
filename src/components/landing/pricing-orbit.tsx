"use client";

import { motion } from "framer-motion";
import { Check, Clock, Zap, Infinity } from "lucide-react";

const freeFeatures = [
  "2 clients",
  "5 invoices/month",
  "Manual time entries",
  "Basic billing rules",
  "PDF export with branding",
];

const proFeatures = [
  "Unlimited clients",
  "Unlimited invoices",
  "Timer mode",
  "Tiny Task Mode",
  "All detail levels",
  "Custom branding",
  "No watermark",
];

export function PricingOrbit() {
  return (
    <section className="py-24 bg-[#F8FAFC] relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-lg text-slate-500">
            Start free. Upgrade when you&apos;re ready.
          </p>
        </motion.div>

        {/* Orbital layout */}
        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
          {/* Center icon */}
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", delay: 0.2 }}
            className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-slate-900 rounded-2xl items-center justify-center shadow-xl z-10"
          >
            <Clock className="w-8 h-8 text-white" />
          </motion.div>

          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -4 }}
            className="w-full lg:w-80 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Free</h3>
                <p className="text-xs text-slate-400">For getting started</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-slate-900">$0</span>
              <span className="text-slate-400">/month</span>
            </div>

            <ul className="space-y-3 mb-6">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button className="w-full py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors">
              Get started free
            </button>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            whileHover={{ y: -4 }}
            className="w-full lg:w-80 bg-white rounded-2xl border-2 border-emerald-200 p-6 shadow-lg shadow-emerald-100/50 relative"
          >
            {/* Popular ribbon */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Infinity className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Pro</h3>
                <p className="text-xs text-slate-400">For serious freelancers</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-slate-900">$9</span>
              <span className="text-slate-400">/month</span>
            </div>

            <ul className="space-y-3 mb-6">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200">
              Start Pro trial
            </button>
          </motion.div>
        </div>

        {/* Comparison micro-table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 max-w-lg mx-auto"
        >
          <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <div className="min-w-[420px]">
              <div className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div>Feature</div>
                <div className="text-center">Free</div>
                <div className="text-center text-emerald-600">Pro</div>
              </div>
              {[
                { feature: "Clients", free: "2", pro: "Unlimited" },
                { feature: "Invoices/mo", free: "5", pro: "Unlimited" },
                { feature: "Timer", free: "—", pro: "✓" },
                { feature: "Tiny Tasks", free: "—", pro: "✓" },
                { feature: "Detail Levels", free: "Simple", pro: "All 3" },
                { feature: "Branding", free: "Basic", pro: "Custom" },
              ].map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-3 gap-4 px-4 py-2.5 text-sm ${
                    i % 2 === 0 ? "bg-slate-50/50" : ""
                  }`}
                >
                  <div className="text-slate-600">{row.feature}</div>
                  <div className="text-center text-slate-400">{row.free}</div>
                  <div className="text-center font-medium text-emerald-600">{row.pro}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
