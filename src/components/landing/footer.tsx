"use client";

import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export function LandingFooter() {
  return (
    <>
      {/* CTA Section */}
      <section className="py-24 bg-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="cta-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1.5" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-grid)" />
          </svg>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to stop explaining your invoices?
            </h2>
            <p className="text-lg text-emerald-100 mb-8 max-w-xl mx-auto">
              Join freelancers who trust their billing. Start tracking time and sending 
              client-proof invoices today.
            </p>
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 px-8 py-4 rounded-xl font-bold hover:bg-emerald-50 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              Start tracking time
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-lg">TimeProof</span>
            </div>
            <p className="text-sm">
              Built for freelancers who bill by the hour.
            </p>
            <p className="text-sm text-slate-500">
              © 2026 TimeProof Invoice. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
