"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Sparkles } from "lucide-react";

const orbitButtons = [
  { mins: 2, angle: -60, color: "bg-blue-500", glow: "shadow-blue-200" },
  { mins: 5, angle: -30, color: "bg-cyan-500", glow: "shadow-cyan-200" },
  { mins: 10, angle: 0, color: "bg-teal-500", glow: "shadow-teal-200" },
  { mins: 15, angle: 30, color: "bg-emerald-500", glow: "shadow-emerald-200" },
  { mins: 0, angle: 60, color: "bg-amber-500", glow: "shadow-amber-200", label: "Custom" },
];

const frequentTasks = [
  "Reset password",
  "Fix typo",
  "Update plugin",
  "Quick email",
  "Check error log",
];

function deterministicFraction(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function TinyTaskConstellation() {
  const [selected, setSelected] = useState<number | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const stars = useMemo(
    () =>
      Array.from({ length: 40 }).map((_, index) => ({
        // Keep SSR/client style serialization identical to avoid hydration drift.
        left: `${(deterministicFraction(index + 1) * 100).toFixed(5)}%`,
        top: `${(deterministicFraction(index + 101) * 100).toFixed(5)}%`,
        duration: 2 + deterministicFraction(index + 201) * 3,
        delay: deterministicFraction(index + 301) * 2,
      })),
    []
  );

  const handleSelect = (mins: number) => {
    setSelected(mins);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 2000);
  };

  return (
    <section className="py-24 bg-[#F8FAFC] relative overflow-hidden">
      {/* Starfield background */}
      <div className="absolute inset-0">
        {stars.map((star, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-slate-300 rounded-full"
            style={{
              left: star.left,
              top: star.top,
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
            }}
          />
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-white text-amber-600 px-4 py-1.5 rounded-full text-sm font-medium mb-4 shadow-sm">
            <Sparkles className="w-4 h-4" />
            Tiny Task Mode
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Never lose a 5-minute task again
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Password resets, quick fixes, small updates — they all add up. Log them in seconds.
          </p>
        </motion.div>

        {/* Constellation */}
        <div className="flex justify-center mb-12">
          <div className="relative w-80 h-80">
            {/* Orbit rings */}
            <div className="absolute inset-8 rounded-full border border-slate-200/60" />
            <div className="absolute inset-16 rounded-full border border-slate-200/40" />

            {/* Center button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center shadow-xl shadow-slate-300/50 z-10"
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.button>

            {/* Orbiting buttons */}
            {orbitButtons.map((btn, index) => {
              const radius = 110;
              const rad = (btn.angle * Math.PI) / 180;
              const x = Math.sin(rad) * radius;
              const y = -Math.cos(rad) * radius;

              return (
                <div
                  key={btn.mins}
                  className="absolute top-1/2 left-1/2"
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  }}
                >
                  <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelect(btn.mins)}
                    className={`w-14 h-14 rounded-full ${btn.color} text-white font-bold text-sm shadow-lg ${btn.glow} flex items-center justify-center transition-shadow hover:shadow-xl`}
                  >
                    {btn.label || `${btn.mins}m`}
                  </motion.button>
                </div>
              );
            })}

            {/* Popup */}
            <AnimatePresence>
              {showPopup && selected !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: -20 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl px-5 py-3 border border-emerald-100 z-20 whitespace-nowrap"
                >
                  <div className="text-xs text-slate-400">Saved!</div>
                  <div className="text-lg font-bold text-emerald-600 font-mono-nums">
                    {selected === 0 ? "Custom" : `${selected} min`} →{" "}
                    {selected === 0 ? "?" : "15 min"}
                  </div>
                  <div className="text-xs text-emerald-500">
                    Minimum billing applied
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Frequent tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="text-sm text-slate-400 mb-3">Frequent tiny tasks</div>
          <div className="flex flex-wrap justify-center gap-2">
            {frequentTasks.map((task, i) => (
              <motion.span
                key={task}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="px-3 py-1.5 bg-white rounded-full text-sm text-slate-600 border border-slate-200 shadow-sm"
              >
                {task}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
