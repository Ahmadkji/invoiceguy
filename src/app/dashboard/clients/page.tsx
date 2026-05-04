"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Building2, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/billing-rules";
import { useAppStore } from "@/lib/store/use-app-store";

export default function ClientsPage() {
  const clients = useAppStore((s) => s.clients);
  const projects = useAppStore((s) => s.projects);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const isDataLoading = useAppStore((s) => s.isDataLoading);
  const dataError = useAppStore((s) => s.dataError);
  const addClient = useAppStore((s) => s.addClient);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBillingAddress, setFormBillingAddress] = useState("");

  const clientStats = useMemo(() => {
    const map = new Map<string, { projectCount: number; uninvoicedAmount: number }>();

    for (const project of projects) {
      const current = map.get(project.clientId) ?? { projectCount: 0, uninvoicedAmount: 0 };
      current.projectCount += 1;
      map.set(project.clientId, current);
    }

    for (const entry of timeEntries) {
      if (entry.invoiceId !== null) {
        continue;
      }

      const current = map.get(entry.clientId) ?? { projectCount: 0, uninvoicedAmount: 0 };
      current.uninvoicedAmount += entry.amount;
      map.set(entry.clientId, current);
    }

    return map;
  }, [projects, timeEntries]);

  const getClientStats = (clientId: string) => {
    const stats = clientStats.get(clientId);
    if (!stats) {
      return { projectCount: 0, uninvoicedAmount: 0 };
    }

    return stats;
  };

  const resetCreateForm = () => {
    setFormName("");
    setFormEmail("");
    setFormCompanyName("");
    setFormPhone("");
    setFormBillingAddress("");
    setCreateFormError(null);
    setShowCreateForm(false);
  };

  const handleCreateClient = async () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setCreateFormError("Client name is required.");
      return;
    }

    setCreateFormError(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/me/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: formEmail.trim() || undefined,
          company_name: formCompanyName.trim() || undefined,
          phone: formPhone.trim() || undefined,
          billing_address: formBillingAddress.trim() || undefined,
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        fieldErrors?: Record<string, string>;
        client?: { id: string; name: string; company_name: string | null; email: string | null; color: string };
      } | null;

      if (!response.ok || !result?.ok) {
        const firstFieldError = result?.fieldErrors
          ? Object.values(result.fieldErrors)[0]
          : null;
        setCreateFormError(firstFieldError ?? result?.message ?? "Unable to create client.");
        return;
      }

      resetCreateForm();
      if (result.client) {
        addClient({
          id: result.client.id,
          userId: "",
          name: result.client.name,
          companyName: result.client.company_name ?? null,
          email: result.client.email ?? null,
          phone: null,
          billingAddress: null,
          notes: null,
          color: result.client.color,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      setCreateFormError("Network error while creating client.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500">Manage your client relationships</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg active:scale-[0.98] self-start"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {isDataLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading clients...
        </div>
      )}

      {dataError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {dataError}
        </div>
      )}

      {createFormError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {createFormError}
        </div>
      )}

      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-100 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">New Client</h2>
            <button
              onClick={resetCreateForm}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Acme Corp"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="contact@example.com"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Company</label>
              <input
                type="text"
                value={formCompanyName}
                onChange={(e) => setFormCompanyName(e.target.value)}
                placeholder="Company name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Phone</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Billing Address</label>
              <input
                type="text"
                value={formBillingAddress}
                onChange={(e) => setFormBillingAddress(e.target.value)}
                placeholder="123 Main St, City, State"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => void handleCreateClient()}
              disabled={isCreating}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {isCreating ? "Creating..." : "Create Client"}
            </button>
            <button
              onClick={resetCreateForm}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {!isDataLoading && !dataError && clients.length === 0 && !showCreateForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No clients yet. Click &ldquo;Add Client&rdquo; to create your first client.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client, index) => {
          const stats = getClientStats(client.id);
          return (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="block"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border border-slate-100 p-4 sm:p-6 hover:shadow-lg hover:shadow-slate-200/50 transition-all group"
              >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: client.color }}
                >
                  {client.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Uninvoiced</div>
                  <div className="text-sm font-semibold text-emerald-600 font-mono-nums">
                    {formatCurrency(stats.uninvoicedAmount)}
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 mb-0.5">{client.name}</h3>
              {client.companyName && (
                <p className="text-sm text-slate-500 mb-3">{client.companyName}</p>
              )}

              <div className="space-y-2 pt-3 border-t border-slate-50">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="w-4 h-4" />
                    {client.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Building2 className="w-4 h-4" />
                  {stats.projectCount} active project{stats.projectCount !== 1 ? "s" : ""}
                </div>
              </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
