"use client";

import { motion } from "framer-motion";
import { Timer, FileText, BarChart3, Shield, Sparkles, Download } from "lucide-react";

const features = [
  {
    icon: Timer,
    title: "Smart Timer",
    description: "Track time with a beautiful circular timer. Runs across pages, pauses when you need it.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Sparkles,
    title: "Tiny Task Mode",
    description: "Log 2-minute password resets and 5-minute updates instantly. Never underbill small work again.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: BarChart3,
    title: "Billing Rules",
    description: "Set 15-min rounding, 30-min minimums, or exact time per client. The math is automatic.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: FileText,
    title: "Three Detail Levels",
    description: "Simple for trusted clients, standard for most, or audit-level with full time breakdown.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Shield,
    title: "Transparent Billing",
    description: "Every entry shows actual time, billed time, and the rule applied. Clients trust what they understand.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: Download,
    title: "PDF Export",
    description: "Generate professional PDFs in seconds. Clean layout, your branding, ready to send.",
    color: "bg-cyan-50 text-cyan-600",
  },
];

export function FeaturesGrid() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Purpose-built for hourly freelancers who want clean invoices without the complexity of accounting software
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="group bg-[#F8FAFC] rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 border border-transparent hover:border-slate-100"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
