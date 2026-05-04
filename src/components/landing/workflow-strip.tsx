"use client";

import { motion } from "framer-motion";
import { Timer, ClipboardCheck, Settings, FileText, Download } from "lucide-react";

const steps = [
  {
    icon: Timer,
    title: "Track Time",
    desc: "Manual, timer, or tiny task",
    preview: "2h 35m logged",
    color: "bg-blue-500",
    lightColor: "bg-blue-50",
  },
  {
    icon: ClipboardCheck,
    title: "Work session",
    desc: "Transparent work sessions",
    preview: "3:15 PM – 9:50 PM\nTotal time: 6h 35m",
    color: "bg-cyan-500",
    lightColor: "bg-cyan-50",
  },
  {
    icon: Settings,
    title: "Apply Rules",
    desc: "Auto-rounding per project",
    preview: "15-min rounding applied",
    color: "bg-teal-500",
    lightColor: "bg-teal-50",
  },
  {
    icon: FileText,
    title: "Build Invoice",
    desc: "Select detail level",
    preview: "3 entries → $162.50",
    color: "bg-emerald-500",
    lightColor: "bg-emerald-50",
  },
  {
    icon: Download,
    title: "Export PDF",
    desc: "Send to client",
    preview: "INV-0024 exported",
    color: "bg-green-500",
    lightColor: "bg-green-50",
  },
];

export function WorkflowStrip() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background gradient river */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-1/2 top-0 bottom-0 w-32 -translate-x-1/2 bg-gradient-to-b from-transparent via-emerald-50 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            From work log to paid invoice
          </h2>
          <p className="text-lg text-slate-500">
            Five steps. Zero copy-paste. One seamless flow.
          </p>
        </motion.div>

        {/* Desktop: horizontal flow */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-12 left-[10%] right-[10%] h-1 bg-slate-100 rounded-full">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 rounded-full"
                initial={{ width: "0%" }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </div>

            <div className="grid grid-cols-5 gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 }}
                    className="relative text-center group"
                  >
                    {/* Island card */}
                    <motion.div
                      whileHover={{ y: -8 }}
                      className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all cursor-default"
                    >
                      <div
                        className={`w-12 h-12 ${step.lightColor} rounded-xl flex items-center justify-center mx-auto mb-3`}
                      >
                        <Icon className={`w-6 h-6 ${step.color.replace("bg-", "text-")}`} />
                      </div>
                      <div className="font-semibold text-slate-900 text-sm mb-0.5">
                        {step.title}
                      </div>
                      <div className="text-xs text-slate-400 mb-2">{step.desc}</div>
                      <div className="text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 whitespace-pre-line">
                        {step.preview}
                      </div>
                    </motion.div>

                    {/* Node on line */}
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.2 + 0.3, type: "spring" }}
                      className={`absolute top-10 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full ${step.color} ring-4 ring-white`}
                    />

                    {/* Step number */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400">
                      {index + 1}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile: vertical stack */}
        <div className="lg:hidden space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="flex items-center gap-4"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 ${step.lightColor} rounded-lg flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${step.color.replace("bg-", "text-")}`} />
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-0.5 h-8 bg-slate-100 mt-1" />
                  )}
                </div>
                <div className="flex-1 bg-white rounded-xl border border-slate-100 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">
                        {step.title}
                      </div>
                      <div className="text-xs text-slate-400">{step.desc}</div>
                    </div>
                    <div className="text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 whitespace-pre-line self-start sm:self-auto">
                      {step.preview}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
