"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Plus, Zap, CheckCircle, X, UserPlus, FolderPlus } from "lucide-react";
import { useAppStore } from "@/lib/store/use-app-store";
import {
  formatMinutes,
  formatCurrency,
  formatTimeRange,
  calculateBilledMinutes,
  calculateAmount,
  getBillingRuleConfig,
} from "@/lib/billing-rules";
import { TimeEntry, type BillingRule } from "@/lib/types";

type CreateTimeEntryResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  timeEntry?: TimeEntry;
};

export default function TimeTrackingPage() {
  const timeEntries = useAppStore((s) => s.timeEntries);
  const clients = useAppStore((s) => s.clients);
  const projects = useAppStore((s) => s.projects);
  const profile = useAppStore((s) => s.profile);
  const isDataLoading = useAppStore((s) => s.isDataLoading);
  const dataError = useAppStore((s) => s.dataError);
  const timer = useAppStore((s) => s.timer);
  const updateTimer = useAppStore((s) => s.updateTimer);
  const resetTimer = useAppStore((s) => s.resetTimer);
  const tickTimer = useAppStore((s) => s.tickTimer);
  const addTimeEntry = useAppStore((s) => s.addTimeEntry);

  const addClient = useAppStore((s) => s.addClient);
  const addProject = useAppStore((s) => s.addProject);

  const [activeTab, setActiveTab] = useState<"timer" | "manual" | "tiny">("timer");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  // Quick-create client state (timer tab)
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientCreating, setQuickClientCreating] = useState(false);
  const [quickClientError, setQuickClientError] = useState<string | null>(null);

  // Quick-create project state (timer tab)
  const [showQuickProject, setShowQuickProject] = useState(false);
  const [quickProjectName, setQuickProjectName] = useState("");
  const [quickProjectClientId, setQuickProjectClientId] = useState("");
  const [quickProjectCreating, setQuickProjectCreating] = useState(false);
  const [quickProjectError, setQuickProjectError] = useState<string | null>(null);

  const [manualClientId, setManualClientId] = useState("");
  const [manualProjectId, setManualProjectId] = useState("");
  const [manualTaskNote, setManualTaskNote] = useState("");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualStartTime, setManualStartTime] = useState("");
  const [manualEndTime, setManualEndTime] = useState("");
  const [manualDuration, setManualDuration] = useState(0);

  const [tinyClientId, setTinyClientId] = useState("");
  const [tinyProjectId, setTinyProjectId] = useState("");
  const [tinyTaskNote, setTinyTaskNote] = useState("");
  const [tinyDuration, setTinyDuration] = useState<number>(5);

  const formatLocalDateInput = (value: Date | string) => {
    const date = typeof value === "string" ? new Date(value) : value;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const addDays = (dateValue: string, days: number) => {
    const date = new Date(`${dateValue}T00:00:00`);
    date.setDate(date.getDate() + days);
    return formatLocalDateInput(date);
  };

  useEffect(() => {
    if (!timer.isRunning) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.isRunning, tickTimer]);

  const handleStartTimer = () => {
    if (!timer.clientId || !timer.projectId) {
      setSaveError("Select a client and project before starting the timer.");
      return;
    }
    setSaveError(null);
    const isFreshStart = timer.elapsedSeconds === 0;
    updateTimer({
      isRunning: true,
      startTime: isFreshStart ? new Date().toISOString() : timer.startTime,
    });
  };

  const saveTimeEntry = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/me/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => null)) as CreateTimeEntryResponse | null;
    if (!response.ok || !result?.ok || !result.timeEntry) {
      throw new Error(result?.message ?? "Unable to save this time entry.");
    }
    return result.timeEntry;
  };

  /**
   * Convert a "HH:MM" time value (from <input type="time">) to an ISO 8601
   * timestamp using the browser's local timezone combined with the entry date.
   * This ensures the server stores the correct absolute time regardless of
   * the server's own timezone setting.
   */
  const localTimeToIso = (date: string, hhmm: string): string => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(date + "T00:00:00");
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const handleManualSubmit = async () => {
    if (!manualClientId || !manualProjectId || !manualTaskNote.trim() || !manualDate) {
      setSaveError("Client, project, task note, and date are required.");
      return;
    }

    const project = projects.find((p) => p.id === manualProjectId);
    const hourlyRate = project?.hourlyRate ?? profile?.defaultHourlyRate ?? 0;
    const rule = project?.billingIncrement ?? profile?.defaultBillingIncrement ?? "exact";
    const minimumMinutes = project?.minimumBillableMinutes ?? profile?.defaultMinimumBillableMinutes ?? null;

    let actualMinutes = manualDuration;
    let overnightEnd = false;
    if (manualStartTime && manualEndTime) {
      const [sh, sm] = manualStartTime.split(":").map(Number);
      const [eh, em] = manualEndTime.split(":").map(Number);
      let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMinutes < 0) {
        diffMinutes += 1440;
        overnightEnd = true;
      }
      if (diffMinutes > 0) actualMinutes = diffMinutes;
    }
    if (actualMinutes <= 0) {
      setSaveError("Duration must be greater than 0. Set start/end time or duration.");
      return;
    }

    const billedMinutes = calculateBilledMinutes(actualMinutes, rule, minimumMinutes);
    const amount = calculateAmount(billedMinutes, hourlyRate);

    setSaveError(null);
    if (savingRef.current) return;
    setIsSaving(true);
    savingRef.current = true;
    try {
      const entry = await saveTimeEntry({
        clientId: manualClientId,
        projectId: manualProjectId,
        entryDate: manualDate,
        startTime: manualStartTime ? localTimeToIso(manualDate, manualStartTime) : null,
        endTime: manualEndTime
          ? localTimeToIso(overnightEnd ? addDays(manualDate, 1) : manualDate, manualEndTime)
          : null,
        actualMinutes,
        billedMinutes,
        hourlyRate,
        amount,
        taskNote: manualTaskNote.trim(),
        internalNote: null,
        billingRuleSnapshot: getBillingRuleConfig(rule),
        status: "uninvoiced",
      });
      addTimeEntry(entry);
      setManualClientId("");
      setManualProjectId("");
      setManualTaskNote("");
      setManualStartTime("");
      setManualEndTime("");
      setManualDuration(0);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save time entry.");
    } finally {
      setIsSaving(false);
      savingRef.current = false;
    }
  };

  const handleTinySubmit = async () => {
    if (!tinyClientId || !tinyProjectId || !tinyTaskNote.trim()) {
      setSaveError("Client, project, and task description are required.");
      return;
    }
    if (tinyDuration <= 0) {
      setSaveError("Duration must be greater than 0.");
      return;
    }

    const project = projects.find((p) => p.id === tinyProjectId);
    const hourlyRate = project?.hourlyRate ?? profile?.defaultHourlyRate ?? 0;
    const rule = project?.billingIncrement ?? profile?.defaultBillingIncrement ?? "exact";
    const minimumMinutes = project?.minimumBillableMinutes ?? profile?.defaultMinimumBillableMinutes ?? null;
    const actualMinutes = tinyDuration;
    const billedMinutes = calculateBilledMinutes(actualMinutes, rule, minimumMinutes);
    const amount = calculateAmount(billedMinutes, hourlyRate);
    const now = new Date().toISOString();

    setSaveError(null);
    if (savingRef.current) return;
    setIsSaving(true);
    savingRef.current = true;
    try {
      const entry = await saveTimeEntry({
        clientId: tinyClientId,
        projectId: tinyProjectId,
        entryDate: now.split("T")[0],
        startTime: null,
        endTime: null,
        actualMinutes,
        billedMinutes,
        hourlyRate,
        amount,
        taskNote: tinyTaskNote.trim(),
        internalNote: null,
        billingRuleSnapshot: getBillingRuleConfig(rule),
        status: "uninvoiced",
      });
      addTimeEntry(entry);
      setTinyTaskNote("");
      setTinyDuration(5);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save tiny task.");
    } finally {
      setIsSaving(false);
      savingRef.current = false;
    }
  };

  const handleStopAndSave = async () => {
    if (!timer.startTime || timer.elapsedSeconds === 0) {
      resetTimer();
      return;
    }

    setSaveError(null);

    const clientId = timer.clientId || "";
    const projectId = timer.projectId || "";
    if (!clientId || !projectId) {
      setSaveError("Select a client and project before saving.");
      return;
    }

    const project = projects.find((p) => p.id === projectId);
    const actualMinutes = Math.round(timer.elapsedSeconds / 60);
    const hourlyRate = project?.hourlyRate ?? profile?.defaultHourlyRate ?? 0;
    const rule = project?.billingIncrement ?? profile?.defaultBillingIncrement ?? "exact";
    const minimumMinutes = project?.minimumBillableMinutes ?? profile?.defaultMinimumBillableMinutes ?? null;
    const billedMinutes = calculateBilledMinutes(actualMinutes, rule, minimumMinutes);
    const amount = calculateAmount(billedMinutes, hourlyRate);
    const startTime = timer.startTime;
    const endTime = new Date(new Date(startTime).getTime() + timer.elapsedSeconds * 1000).toISOString();
    const entryDate = formatLocalDateInput(startTime);

    if (savingRef.current) return;
    setIsSaving(true);
    savingRef.current = true;
    try {
      const response = await fetch("/api/me/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          projectId,
          entryDate,
          startTime,
          endTime,
          actualMinutes,
          billedMinutes,
          hourlyRate,
          amount,
          taskNote: timer.taskNote || "Timer session",
          internalNote: null,
          billingRuleSnapshot: getBillingRuleConfig(rule),
          status: "uninvoiced",
        }),
      });

      const result = (await response.json().catch(() => null)) as CreateTimeEntryResponse | null;
      if (!response.ok || !result?.ok || !result.timeEntry) {
        setSaveError(result?.message ?? "Unable to save this time entry.");
        return;
      }

      addTimeEntry(result.timeEntry);
      resetTimer();
    } catch {
      setSaveError("Network error while saving time entry.");
    } finally {
      setIsSaving(false);
      savingRef.current = false;
    }
  };

  /* ─── Quick-create client (inline on timer tab) ─── */
  const resetQuickClient = useCallback(() => {
    setShowQuickClient(false);
    setQuickClientName("");
    setQuickClientError(null);
  }, []);

  const handleQuickCreateClient = async () => {
    if (quickClientCreating) return;
    const name = quickClientName.trim();
    if (!name) {
      setQuickClientError("Client name is required.");
      return;
    }
    setQuickClientError(null);
    setQuickClientCreating(true);
    try {
      const response = await fetch("/api/me/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        fieldErrors?: Record<string, string>;
        client?: { id: string; name: string; company_name: string | null; email: string | null; color: string };
      } | null;
      if (!response.ok || !result?.ok || !result.client) {
        const firstErr = result?.fieldErrors ? Object.values(result.fieldErrors)[0] : null;
        setQuickClientError(firstErr ?? result?.message ?? "Unable to create client.");
        return;
      }
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
      updateTimer({ clientId: result.client.id });
      resetQuickClient();
    } catch {
      setQuickClientError("Network error while creating client.");
    } finally {
      setQuickClientCreating(false);
    }
  };

  /* ─── Quick-create project (inline on timer tab) ─── */
  const resetQuickProject = useCallback(() => {
    setShowQuickProject(false);
    setQuickProjectName("");
    setQuickProjectClientId("");
    setQuickProjectError(null);
  }, []);

  const handleQuickCreateProject = async () => {
    if (quickProjectCreating) return;
    const name = quickProjectName.trim();
    const clientId = quickProjectClientId || timer.clientId;
    if (!clientId) {
      setQuickProjectError("Select a client first.");
      return;
    }
    if (!name) {
      setQuickProjectError("Project name is required.");
      return;
    }
    setQuickProjectError(null);
    setQuickProjectCreating(true);
    try {
      const response = await fetch("/api/me/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          name,
          hourly_rate: profile?.defaultHourlyRate ?? 0,
          billing_increment: (profile?.defaultBillingIncrement ?? "exact") as BillingRule,
          status: "active",
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        fieldErrors?: Record<string, string>;
        project?: { id: string; name: string; client_id: string };
      } | null;
      if (!response.ok || !result?.ok || !result.project) {
        const firstErr = result?.fieldErrors ? Object.values(result.fieldErrors)[0] : null;
        setQuickProjectError(firstErr ?? result?.message ?? "Unable to create project.");
        return;
      }
      const created = result.project;
      addProject({
        id: created.id,
        userId: "",
        clientId: created.client_id,
        name: created.name,
        description: null,
        hourlyRate: profile?.defaultHourlyRate ?? 0,
        billingIncrement: profile?.defaultBillingIncrement ?? "exact",
        minimumBillableMinutes: profile?.defaultMinimumBillableMinutes ?? null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      updateTimer({ projectId: created.id });
      resetQuickProject();
    } catch {
      setQuickProjectError("Network error while creating project.");
    } finally {
      setQuickProjectCreating(false);
    }
  };

  const timerMinutes = Math.floor(timer.elapsedSeconds / 60);
  const timerHours = Math.floor(timerMinutes / 60);
  const timerMins = timerMinutes % 60;
  const timerSecs = timer.elapsedSeconds % 60;

  const recentEntries = timeEntries.slice(0, 10);
  const tinyProject = projects.find((p) => p.id === tinyProjectId);
  const tinyPreviewAmount = tinyProject
    ? formatCurrency(
        calculateAmount(
          calculateBilledMinutes(
            tinyDuration,
            tinyProject.billingIncrement ?? profile?.defaultBillingIncrement ?? "exact",
            tinyProject.minimumBillableMinutes ?? profile?.defaultMinimumBillableMinutes ?? null,
          ),
          tinyProject.hourlyRate ?? profile?.defaultHourlyRate ?? 0,
        ),
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Time Tracking</h1>
          <p className="text-slate-500">Track hours and add entries to invoices later</p>
        </div>
      </div>

      {isDataLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading time tracking data...
        </div>
      )}

      {dataError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {dataError}
        </div>
      )}

      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 p-1 flex flex-wrap gap-1 w-full sm:w-fit">
        {[
          { key: "timer" as const, label: "Timer", icon: Timer },
          { key: "manual" as const, label: "Manual Entry", icon: Plus },
          { key: "tiny" as const, label: "Tiny Task", icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "timer" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-100 p-8"
        >
          <div className="flex flex-col items-center">
            <div className="w-full max-w-md mb-6 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={timer.clientId ?? ""}
                    onChange={(e) => updateTimer({ clientId: e.target.value || null })}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setShowQuickClient(true); setShowQuickProject(false); }}
                    title="Create new client"
                    className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:text-emerald-600 hover:border-emerald-400 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>

                <AnimatePresence>
                  {showQuickClient && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Quick Add Client</span>
                          <button onClick={resetQuickClient} className="p-1 text-slate-400 hover:text-slate-600 rounded"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        {quickClientError && <p className="text-xs text-red-600">{quickClientError}</p>}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={quickClientName}
                            onChange={(e) => setQuickClientName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !quickClientCreating) void handleQuickCreateClient(); }}
                            placeholder="Client name"
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                            autoFocus
                          />
                          <button
                            onClick={() => void handleQuickCreateClient()}
                            disabled={quickClientCreating}
                            className="px-3 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {quickClientCreating ? "..." : "Add"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={timer.projectId ?? ""}
                    onChange={(e) => updateTimer({ projectId: e.target.value || null })}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setShowQuickProject(true); setShowQuickClient(false); }}
                    title="Create new project"
                    className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:text-emerald-600 hover:border-emerald-400 transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>

                <AnimatePresence>
                  {showQuickProject && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Quick Add Project</span>
                          <button onClick={resetQuickProject} className="p-1 text-slate-400 hover:text-slate-600 rounded"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        {quickProjectError && <p className="text-xs text-red-600">{quickProjectError}</p>}
                        {!timer.clientId && clients.length > 0 && (
                          <select
                            value={quickProjectClientId}
                            onChange={(e) => setQuickProjectClientId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                          >
                            <option value="">Select client for project...</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        )}
                        {!timer.clientId && clients.length === 0 && (
                          <p className="text-xs text-amber-600">Create a client first, then add a project.</p>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={quickProjectName}
                            onChange={(e) => setQuickProjectName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !quickProjectCreating) void handleQuickCreateProject(); }}
                            placeholder="Project name"
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                            autoFocus
                          />
                          <button
                            onClick={() => void handleQuickCreateProject()}
                            disabled={quickProjectCreating || (!timer.clientId && !quickProjectClientId)}
                            className="px-3 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {quickProjectCreating ? "..." : "Add"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <input
                type="text"
                value={timer.taskNote}
                onChange={(e) => updateTimer({ taskNote: e.target.value })}
                placeholder="What are you working on?"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="relative w-48 h-48 sm:w-64 sm:h-64 mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="4"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${((timer.elapsedSeconds % 3600) / 3600) * 283} 283`}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-bold text-slate-900 font-mono-nums">
                  {timerHours > 0 ? `${timerHours}:` : ""}
                  {String(timerMins).padStart(2, "0")}:{String(timerSecs).padStart(2, "0")}
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  {timer.isRunning ? "Running" : timer.elapsedSeconds > 0 ? "Paused" : "Ready"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {!timer.isRunning ? (
                <button
                  onClick={() => void handleStartTimer()}
                  disabled={isSaving || !timer.clientId || !timer.projectId}
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 sm:px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Timer className="w-5 h-5" />
                  {timer.elapsedSeconds > 0 ? "Resume" : "Start Timer"}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => updateTimer({ isRunning: false })}
                    className="inline-flex items-center justify-center gap-2 bg-amber-50 text-amber-600 px-6 py-3 rounded-xl font-semibold hover:bg-amber-100 transition-colors"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => void handleStopAndSave()}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {isSaving ? "Saving..." : "Stop & Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "manual" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-100 p-8"
        >
          <div className="max-w-lg mx-auto space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Client</label>
                <select value={manualClientId} onChange={(e) => setManualClientId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Project</label>
                <select value={manualProjectId} onChange={(e) => setManualProjectId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Task Note</label>
              <textarea
                rows={3}
                value={manualTaskNote}
                onChange={(e) => setManualTaskNote(e.target.value)}
                placeholder="What did you work on?"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Start Time</label>
                <input
                  type="time"
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">End Time</label>
                <input
                  type="time"
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <button onClick={() => void handleManualSubmit()} disabled={isSaving} className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              <Plus className="w-5 h-5" />
              {isSaving && activeTab === "manual" ? "Saving..." : "Save Time Entry"}
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === "tiny" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-100 p-8"
        >
          <div className="max-w-lg mx-auto space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Tiny Task Mode</h3>
              <p className="text-sm text-slate-500">Quickly log small tasks before you forget them</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Client</label>
                <select value={tinyClientId} onChange={(e) => setTinyClientId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Project</label>
                <select value={tinyProjectId} onChange={(e) => setTinyProjectId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">What did you do?</label>
              <input
                type="text"
                value={tinyTaskNote}
                onChange={(e) => setTinyTaskNote(e.target.value)}
                placeholder="e.g., Reset password, fixed typo..."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-3 block">How long did it take?</label>
              <div className="flex flex-wrap gap-3">
                {[2, 5, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTinyDuration(mins)}
                    className={`flex-1 min-w-[calc(33%-0.5rem)] py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      tinyDuration === mins
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTinyDuration(tinyDuration === 30 ? 5 : 30)}
                  className={`flex-1 min-w-[60px] py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    tinyDuration >= 30 && ![2, 5, 10, 15].includes(tinyDuration)
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {tinyDuration >= 30 && ![2, 5, 10, 15].includes(tinyDuration) ? `${tinyDuration}m` : "Custom"}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-500 mb-1">Preview</div>
              <div className="text-lg font-semibold text-slate-900">
                {tinyDuration}m{tinyPreviewAmount ? ` = ${tinyPreviewAmount}` : ""}
              </div>
              <div className="text-xs text-slate-500 mt-1">Ready to include in an invoice later</div>
            </div>

            <button onClick={() => void handleTinySubmit()} disabled={isSaving} className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              <Zap className="w-5 h-5" />
              {isSaving && activeTab === "tiny" ? "Saving..." : "Save Tiny Task"}
            </button>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-900">Recent Entries</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {recentEntries.map((entry) => {
            const client = clients.find((c) => c.id === entry.clientId);
            const project = projects.find((p) => p.id === entry.projectId);
            const isInvoiced = entry.invoiceId !== null || entry.status === "invoiced";
            return (
              <div
                key={entry.id}
                className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between transition-colors gap-2 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: client?.color || "#94A3B8" }}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate text-slate-900">{entry.taskNote}</span>
                    <div className="text-xs text-slate-400 truncate">
                      {client?.name} • {project?.name} • {entry.entryDate}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-6 pl-5 sm:pl-0">
                  <div className="text-right sm:text-right">
                    <div className="text-xs text-slate-400">Work Session</div>
                    <div className="text-sm font-mono-nums text-slate-600">
                      {formatTimeRange(entry.startTime, entry.endTime) || "\u2014"}
                    </div>
                  </div>
                  <div className="text-right sm:text-right">
                    <div className="text-xs text-slate-400">Total Time</div>
                    <div className="text-sm font-mono-nums font-semibold text-emerald-600">
                      {formatMinutes(entry.actualMinutes)}
                    </div>
                  </div>
                  <div className="text-right sm:w-20">
                    <div className="text-xs text-slate-400">Amount</div>
                    <div className="text-sm font-mono-nums font-semibold text-slate-900">
                      {formatCurrency(entry.amount)}
                    </div>
                  </div>
                  <div className="text-right sm:w-24">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        isInvoiced
                          ? "bg-slate-100 text-slate-500"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {isInvoiced ? "Invoiced" : "Uninvoiced"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
