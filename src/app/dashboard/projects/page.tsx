"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FolderKanban, Plus, X } from "lucide-react";
import { useAppStore } from "@/lib/store/use-app-store";
import { formatCurrency, formatMinutes } from "@/lib/billing-rules";
import type { BillingRule } from "@/lib/types";

export default function ProjectsPage() {
  const projects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const invoices = useAppStore((s) => s.invoices);
  const isDataLoading = useAppStore((s) => s.isDataLoading);
  const dataError = useAppStore((s) => s.dataError);
  const profile = useAppStore((s) => s.profile);
  const paidThisMonth = useAppStore((s) => s.paidThisMonth);
  const paidBilledMinutes = useAppStore((s) => s.paidBilledMinutes);
  const setDashboardSnapshot = useAppStore((s) => s.setDashboardSnapshot);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formClientId, setFormClientId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formHourlyRate, setFormHourlyRate] = useState("");
  const [formBillingIncrement, setFormBillingIncrement] = useState<BillingRule>("exact");

  const BILLING_OPTIONS: { value: BillingRule; label: string }[] = [
    { value: "exact", label: "Standard" },
    { value: "round_up_5", label: "Round up 5m" },
    { value: "round_up_10", label: "Round up 10m" },
    { value: "round_up_15", label: "Round up 15m" },
    { value: "round_up_30", label: "Round up 30m" },
    { value: "round_up_60", label: "Round up 60m" },
    { value: "min_15", label: "Min 15m" },
    { value: "min_30", label: "Min 30m" },
  ];

  const resetCreateForm = () => {
    setFormClientId("");
    setFormName("");
    setFormDescription("");
    setFormHourlyRate("");
    setFormBillingIncrement("exact");
    setCreateFormError(null);
    setShowCreateForm(false);
  };

  const handleCreateProject = async () => {
    if (!formClientId.trim()) {
      setCreateFormError("Please select a client.");
      return;
    }
    if (!formName.trim()) {
      setCreateFormError("Project name is required.");
      return;
    }

    setCreateFormError(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/me/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: formClientId,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          hourly_rate: formHourlyRate || profile?.defaultHourlyRate || 0,
          billing_increment: formBillingIncrement,
          status: "active",
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        fieldErrors?: Record<string, string>;
        project?: (typeof projects)[number];
      } | null;

      if (!response.ok || !result?.ok) {
        const firstFieldError = result?.fieldErrors
          ? Object.values(result.fieldErrors)[0]
          : null;
        setCreateFormError(firstFieldError ?? result?.message ?? "Unable to create project.");
        return;
      }

      resetCreateForm();
      if (result.project) {
        const createdProject = result.project;
        const nextProjects = [
          createdProject,
          ...projects.filter((existingProject) => existingProject.id !== createdProject.id),
        ];

        setDashboardSnapshot({
          profile,
          clients,
          projects: nextProjects,
          timeEntries,
          invoices,
          paidThisMonth: paidThisMonth ?? 0,
          paidBilledMinutes: paidBilledMinutes ?? 0,
        });
      }
    } catch {
      setCreateFormError("Network error while creating project.");
    } finally {
      setIsCreating(false);
    }
  };

  const getProjectStats = (projectId: string) => {
    const entries = timeEntries.filter((e) => e.projectId === projectId);
    const trackedMinutes = entries.reduce((sum, e) => sum + e.billedMinutes, 0);
    const uninvoiced = entries.filter((e) => e.invoiceId === null);
    const uninvoicedAmount = uninvoiced.reduce((sum, e) => sum + e.amount, 0);
    return { trackedMinutes, uninvoicedAmount, entryCount: entries.length };
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-600",
    paused: "bg-amber-50 text-amber-600",
    completed: "bg-blue-50 text-blue-600",
    archived: "bg-slate-50 text-slate-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500">Track work across all your projects</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg active:scale-[0.98] self-start"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      {isDataLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading projects...
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
            <h2 className="text-lg font-bold text-slate-900">New Project</h2>
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
                Client <span className="text-red-400">*</span>
              </label>
              <select
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">Create a client first on the Clients page.</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Project Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Website Redesign"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Description</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional project description"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Hourly Rate</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formHourlyRate}
                onChange={(e) => setFormHourlyRate(e.target.value)}
                placeholder={String(profile?.defaultHourlyRate ?? 0)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Billing Increment</label>
              <select
                value={formBillingIncrement}
                onChange={(e) => setFormBillingIncrement(e.target.value as BillingRule)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                {BILLING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => void handleCreateProject()}
              disabled={isCreating || clients.length === 0}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {isCreating ? "Creating..." : "Create Project"}
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

      {!isDataLoading && !dataError && projects.length === 0 && !showCreateForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No projects yet. Click &ldquo;Add Project&rdquo; to create your first project.
        </div>
      )}

      <div className="space-y-4">
        {projects.map((project, index) => {
          const client = clients.find((c) => c.id === project.clientId);
          const stats = getProjectStats(project.id);
          return (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="block"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border border-slate-100 p-6 hover:shadow-md transition-shadow"
              >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${client?.color}15` }}
                  >
                    <FolderKanban className="w-5 h-5" style={{ color: client?.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-slate-900">{project.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[project.status]}`}>
                        {project.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{client?.name}</p>
                    {project.description && (
                      <p className="text-sm text-slate-400">{project.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono-nums">{formatCurrency(project.hourlyRate)}</div>
                  <div className="text-xs text-slate-400">/ hour</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-50">
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Tracked Time</div>
                  <div className="text-sm font-semibold text-slate-700 font-mono-nums">{formatMinutes(stats.trackedMinutes)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Entries</div>
                  <div className="text-sm font-semibold text-slate-700">{stats.entryCount}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Uninvoiced</div>
                  <div className="text-sm font-semibold text-emerald-600 font-mono-nums">{formatCurrency(stats.uninvoicedAmount)}</div>
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
