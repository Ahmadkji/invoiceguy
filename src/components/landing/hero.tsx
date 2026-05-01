"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Clock, Shield } from "lucide-react";
import Link from "next/link";

const invoiceSteps = [
  { text: "3:15 PM – 9:50 PM", type: "time" },
  { text: "Total time: 6h 35m", type: "total" },
  { text: "Amount: $528.33", type: "amount" },
];

export function TimeGlassHero() {
  const [step, setStep] = useState(0);
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    const currentStep = invoiceSteps[step];
    let charIndex = 0;

    const typeInterval = setInterval(() => {
      if (charIndex <= currentStep.text.length) {
        setTypedText(currentStep.text.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          setStep((prev) => (prev + 1) % invoiceSteps.length);
        }, 1500);
      }
    }, 60);

    return () => clearInterval(typeInterval);
  }, [step]);

  const getStepColor = (type: string) => {
    switch (type) {
      case "time": return "text-slate-700";
      case "total": return "text-emerald-600";
      case "amount": return "text-emerald-700 font-bold";
      default: return "text-slate-700";
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#F8FAFC]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Built for hourly freelancers
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1] mb-6">
              Stop turning messy{" "}
              <span className="text-emerald-600">time logs</span> into{" "}
              <span className="relative">
                awkward invoices
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path d="M2 6C50 2 150 2 198 6" stroke="#10B981" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            
            <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">
              Track work, apply your billing rules, and send clean hourly invoices 
              clients can actually understand. No more explaining your math.
            </p>

            <div>
              <Link
                href="/signin"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5"
              >
                Create your first invoice
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="flex items-center gap-6 mt-10 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>Work session tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Transparent time ranges</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Animated invoice card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative bg-white rounded-2xl shadow-2xl shadow-slate-200/50 p-8 border border-slate-100">
              {/* Invoice header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Invoice</div>
                  <div className="text-lg font-bold text-slate-900">INV-0024</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Date</div>
                  <div className="text-sm text-slate-700">Apr 24, 2026</div>
                </div>
              </div>

              {/* Client info */}
              <div className="mb-6">
                <div className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Bill to</div>
                <div className="text-sm font-semibold text-slate-900">TechStart Inc.</div>
                <div className="text-sm text-slate-500">Marcus Johnson</div>
              </div>

              {/* Line items */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">App development</span>
                  <span className="font-mono-nums text-slate-900">4.5 hrs × $80</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Bug fixes</span>
                  <span className="font-mono-nums text-slate-900">1.5 hrs × $80</span>
                </div>
              </div>

              {/* Animated typing area */}
              <div className="bg-slate-50 rounded-xl p-4 mb-6 min-h-[60px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className={`font-mono-nums text-lg ${getStepColor(invoiceSteps[step % invoiceSteps.length].type)}`}
                  >
                    {typedText}
                    <span className="animate-pulse">|</span>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-2xl font-bold text-emerald-600 font-mono-nums">$480.00</span>
              </div>

              {/* Glow effect */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10 pointer-events-none" />
            </div>

            {/* Floating badges */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg px-4 py-2 border border-slate-100"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-700">Session recorded</span>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg px-4 py-2 border border-slate-100"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-slate-700">3:15 PM – 9:50 PM</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
