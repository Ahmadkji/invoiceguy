"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, CreditCard, FileText, Save } from "lucide-react";
import type { BillingRule } from "@/lib/types";
import { useAppStore } from "@/lib/store/use-app-store";

type ProfileFormState = {
  businessName: string;
  fullName: string;
  email: string;
  address: string;
  defaultHourlyRate: string;
  defaultBillingIncrement: BillingRule;
  defaultMinimumBillableMinutes: string;
  defaultCurrency: string;
  invoiceNumberPrefix: string;
  nextInvoiceNumber: string;
  defaultDueDays: string;
  taxLabel: string;
  taxPercentage: string;
  paymentInstructions: string;
  defaultInvoiceNotes: string;
};

const initialFormState: ProfileFormState = {
  businessName: "",
  fullName: "",
  email: "",
  address: "",
  defaultHourlyRate: "0",
  defaultBillingIncrement: "exact",
  defaultMinimumBillableMinutes: "",
  defaultCurrency: "$",
  invoiceNumberPrefix: "INV",
  nextInvoiceNumber: "1",
  defaultDueDays: "14",
  taxLabel: "",
  taxPercentage: "",
  paymentInstructions: "",
  defaultInvoiceNotes: "",
};

function toProfileFormState(profile: {
  businessName?: string | null;
  fullName?: string | null;
  email?: string | null;
  address?: string | null;
  defaultHourlyRate?: number | null;
  defaultBillingIncrement?: BillingRule | null;
  defaultMinimumBillableMinutes?: number | null;
  defaultCurrency?: string | null;
  invoiceNumberPrefix?: string | null;
  nextInvoiceNumber?: number | null;
  defaultDueDays?: number | null;
  taxLabel?: string | null;
  taxPercentage?: number | null;
  paymentInstructions?: string | null;
  defaultInvoiceNotes?: string | null;
}): ProfileFormState {
  return {
    businessName: profile.businessName ?? "",
    fullName: profile.fullName ?? "",
    email: profile.email ?? "",
    address: profile.address ?? "",
    defaultHourlyRate: String(profile.defaultHourlyRate ?? 0),
    defaultBillingIncrement: profile.defaultBillingIncrement ?? "exact",
    defaultMinimumBillableMinutes: String(profile.defaultMinimumBillableMinutes ?? ""),
    defaultCurrency: profile.defaultCurrency ?? "$",
    invoiceNumberPrefix: profile.invoiceNumberPrefix ?? "INV",
    nextInvoiceNumber: String(profile.nextInvoiceNumber ?? 1),
    defaultDueDays: String(profile.defaultDueDays ?? 14),
    taxLabel: profile.taxLabel ?? "",
    taxPercentage: String(profile.taxPercentage ?? ""),
    paymentInstructions: profile.paymentInstructions ?? "",
    defaultInvoiceNotes: profile.defaultInvoiceNotes ?? "",
  };
}

export default function SettingsPage() {
  const storeProfile = useAppStore((s) => s.profile);
  const [form, setForm] = useState<ProfileFormState>(() =>
    storeProfile ? toProfileFormState(storeProfile) : initialFormState
  );
  const [loading, setLoading] = useState(!storeProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (storeProfile) {
      setForm(toProfileFormState(storeProfile));
      setError(null);
      setLoading(false);
      return;
    }

    let ignore = false;
    void fetch("/api/me/profile", { method: "GET" })
      .then(async (response) => {
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; message?: string; profile?: ProfileFormState }
          | null;
        if (ignore) return;
        if (!response.ok || !result?.ok || !result.profile) {
          setError(result?.message ?? "Unable to load your session. Please sign in again.");
          setLoading(false);
          return;
        }
        setForm(result.profile);
        setLoading(false);
      })
      .catch(() => {
        if (ignore) return;
        setError("Unable to load your session. Please sign in again.");
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [storeProfile]);

  const setField = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/me/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string }
      | null;

    if (!response.ok || !result?.ok) {
      setError(result?.message ?? "Could not save settings.");
      setIsSaving(false);
      return;
    }

    setMessage("Settings saved.");
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your business and billing preferences</p>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading settings...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-100 p-4 sm:p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Business Info</h3>
              <p className="text-sm text-slate-500">How you appear on invoices</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Business Name</label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) => setField("businessName", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Your Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Address</label>
              <textarea
                rows={3}
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-100 p-4 sm:p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Billing Defaults</h3>
              <p className="text-sm text-slate-500">Default rates and rules</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Default Hourly Rate</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  value={form.defaultHourlyRate}
                  onChange={(e) => setField("defaultHourlyRate", e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Default Billing Rule</label>
              <select
                value={form.defaultBillingIncrement}
                onChange={(e) =>
                  setField("defaultBillingIncrement", e.target.value as BillingRule)
                }
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="exact">Standard time</option>
                <option value="round_up_5">Round up to 5 min</option>
                <option value="round_up_10">Round up to 10 min</option>
                <option value="round_up_15">Round up to 15 min</option>
                <option value="round_up_30">Round up to 30 min</option>
                <option value="round_up_60">Round up to 1 hour</option>
                <option value="min_15">Minimum 15 min</option>
                <option value="min_30">Minimum 30 min</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Minimum Billable Time (minutes)</label>
              <input
                type="number"
                value={form.defaultMinimumBillableMinutes}
                onChange={(e) => setField("defaultMinimumBillableMinutes", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Currency</label>
              <select
                value={form.defaultCurrency}
                onChange={(e) => setField("defaultCurrency", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="$">USD ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
              </select>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-100 p-4 sm:p-6 lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Invoice Settings</h3>
              <p className="text-sm text-slate-500">Numbering, terms, and defaults</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Invoice Prefix</label>
              <input
                type="text"
                value={form.invoiceNumberPrefix}
                onChange={(e) => setField("invoiceNumberPrefix", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Next Invoice Number</label>
              <input
                type="number"
                value={form.nextInvoiceNumber}
                onChange={(e) => setField("nextInvoiceNumber", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Default Due Days</label>
              <input
                type="number"
                value={form.defaultDueDays}
                onChange={(e) => setField("defaultDueDays", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tax Label</label>
              <input
                type="text"
                value={form.taxLabel}
                onChange={(e) => setField("taxLabel", e.target.value)}
                placeholder="e.g., Tax, GST, VAT"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tax Percentage</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.taxPercentage}
                  onChange={(e) => setField("taxPercentage", e.target.value)}
                  className="w-full pr-8 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Default Payment Instructions</label>
            <textarea
              rows={2}
              value={form.paymentInstructions}
              onChange={(e) => setField("paymentInstructions", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Default Invoice Notes</label>
            <textarea
              rows={2}
              value={form.defaultInvoiceNotes}
              onChange={(e) => setField("defaultInvoiceNotes", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>
        </motion.div>
      </div>

      <div className="flex justify-center sm:justify-end">
        <button
          onClick={handleSave}
          disabled={loading || isSaving}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
