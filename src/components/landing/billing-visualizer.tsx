"use client";

import { motion } from "framer-motion";
import { Clock, Calendar } from "lucide-react";

const sessions = [
  {
    id: 1,
    project: "Website Redesign",
    client: "Acme Corp",
    start: "3:15 PM",
    end: "9:50 PM",
    total: "6h 35m",
    date: "Today",
  },
  {
    id: 2,
    project: "API Integration",
    client: "Acme Corp",
    start: "10:00 AM",
    end: "2:30 PM",
    total: "4h 30m",
    date: "Today",
  },
  {
    id: 3,
    project: "Bug Fixes",
    client: "Studio Nine",
    start: "9:00 AM",
    end: "11:45 AM",
    total: "2h 45m",
    date: "Yesterday",
  },
];

export function BillingRuleVisualizer() {
  return (
    <section className="py-24 bg-[#F8FAFC]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-white text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 shadow-sm">
            <Clock className="w-4 h-4" />
            Transparent work sessions
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            See exactly when you worked
          </h2>
          <p className="text-lg text-slate-500">
            Clear time ranges with automatic totals. No guesswork.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
        >
          <div className="divide-y divide-slate-100">
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {session.project}
                    </div>
                    <div className="text-sm text-slate-500">
                      {session.client} · {session.date}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900 font-mono-nums">
                    {session.start} – {session.end}
                  </div>
                  <div className="text-sm font-medium text-emerald-600">
                    Total time: {session.total}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
            <span className="text-sm text-slate-500">
              All sessions are logged automatically from your timer entries
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
