"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Timer, Plus, Zap, CheckCircle, ToggleLeft, ToggleRight, Tag } from "lucide-react";
import { useAppStore } from "@/lib/store/use-app-store";
import { formatMinutes, formatCurrency, formatTimeRange, calculateBilledMinutes, calculateAmount, getBillingRuleConfig } from "@/lib/billing-rules";
import { BillableSplitCard } from "@/components/time/billable-split-card";
import { NonBillableCategory, NON_BILLABLE_LABELS, TimeEntry } from "@/lib/types";

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

  const [activeTab, setActiveTab] = useState<"timer" | "manual" | "tiny">("timer");
  const [isBillable, setIsBillable] = useState(true);
  const [nonBillableCategory, setNonBillableCategory] = useState<NonBillableCategory>("admin");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  // Manual entry form state
  const [manualClientId, setManualClientId] = useState("");
  const [manualProjectId, setManualProjectId] = useState("");
  const [manualTaskNote, setManualTaskNote] = useState("");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualStartTime, setManualStartTime] = useState("");
  const [manualEndTime, setManualEndTime] = useState("");
  const [manualDuration, setManualDuration] = useState(0);

  // Tiny task form state
  const [tinyClientId, setTinyClientId] = useState("");
  const [tinyProjectId, setTinyProjectId] = useState("");
  const [tinyTaskNote, setTinyTaskNote] = useState("");
  const [tinyDuration, setTinyDuration] = useState<number>(5);

  // Timer interval managed in useEffect
  useEffect(() => {
    if (!timer.isRunning) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.isRunning, tickTimer]);

  const handleStartTimer = () => {
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
    if (manualStartTime && manualEndTime) {
      const [sh, sm] = manualStartTime.split(":").map(Number);
      const [eh, em] = manualEndTime.split(":").map(Number);
      const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMinutes > 0) actualMinutes = diffMinutes;
    }
    if (actualMinutes <= 0) {
      setSaveError("Duration must be greater than 0. Set start/end time or duration.");
      return;
    }

    const billedMinutes = isBillable ? calculateBilledMinutes(actualMinutes, rule, minimumMinutes) : 0;
    const amount = isBillable ? calculateAmount(billedMinutes, hourlyRate) : 0;

    setSaveError(null);
    if (savingRef.current) return;
    setIsSaving(true);
    savingRef.current = true;
    try {
      const entry = await saveTimeEntry({
        clientId: manualClientId,
        projectId: manualProjectId,
        entryDate: manualDate,
        startTime: manualStartTime || null,
        endTime: manualEndTime || null,
        actualMinutes,
        billedMinutes: isBillable ? billedMinutes : 0,
        hourlyRate: isBillable ? hourlyRate : 0,
        amount,
        taskNote: manualTaskNote.trim(),
        internalNote: null,
        isBillable,
        nonBillableCategory: isBillable ? null : nonBillableCategory,
        billingRuleSnapshot: getBillingRuleConfig(rule),
        status: isBillable ? "uninvoiced" : "non_billable",
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
    const billedMinutes = isBillable ? calculateBilledMinutes(actualMinutes, rule, minimumMinutes) : 0;
    const amount = isBillable ? calculateAmount(billedMinutes, hourlyRate) : 0;
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
        billedMinutes: isBillable ? billedMinutes : 0,
        hourlyRate: isBillable ? hourlyRate : 0,
        amount,
        taskNote: tinyTaskNote.trim(),
        internalNote: null,
        isBillable,
        nonBillableCategory: isBillable ? null : nonBillableCategory,
        billingRuleSnapshot: getBillingRuleConfig(rule),
        status: isBillable ? "uninvoiced" : "non_billable",
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
    const amount = isBillable ? calculateAmount(billedMinutes, hourlyRate) : 0;
    const startTime = timer.startTime;
    const endTime = new Date(new Date(startTime).getTime() + timer.elapsedSeconds * 1000).toISOString();
    const now = new Date().toISOString();

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
          entryDate: now.split("T")[0],
          startTime,
          endTime,
          actualMinutes,
          billedMinutes: isBillable ? billedMinutes : 0,
          hourlyRate: isBillable ? hourlyRate : 0,
          amount,
          taskNote: timer.taskNote || "Timer session",
          internalNote: null,
          isBillable,
          nonBillableCategory: isBillable ? null : nonBillableCategory,
          billingRuleSnapshot: getBillingRuleConfig(rule),
          status: isBillable ? "uninvoiced" : "non_billable",
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

  const timerMinutes = Math.floor(timer.elapsedSeconds / 60);
  const timerHours = Math.floor(timerMinutes / 60);
  const timerMins = timerMinutes % 60;
  const timerSecs = timer.elapsedSeconds % 60;

  const recentEntries = timeEntries.slice(0, 10);

  // Show all entries because users often log and review across multiple days.
  const splitEntries = useMemo(() => timeEntries, [timeEntries]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Time Tracking</h1>
          <p className="text-slate-500">Track billable and non-billable hours</p>
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

      {/* Billable vs Non-Billable Split */}
      <BillableSplitCard entries={splitEntries} />

      {/* Tab switcher */}
      <div className="bg-white rounded-xl border border-slate-100 p-1 flex gap-1 w-fit">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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

      {/* Timer panel */}
      {activeTab === "timer" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-100 p-8"
        >
          <div className="flex flex-col items-center">
            {/* Timer metadata */}
            <div className="w-full max-w-md mb-6 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={timer.clientId ?? ""}
                  onChange={(e) => updateTimer({ clientId: e.target.value || null })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={timer.projectId ?? ""}
                  onChange={(e) => updateTimer({ projectId: e.target.value || null })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                >
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={timer.taskNote}
                onChange={(e) => updateTimer({ taskNote: e.target.value })}
                placeholder="What are you working on?"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Circular timer display */}
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
                  strokeDasharray={`${(timer.elapsedSeconds % 3600) / 3600 * 283} 283`}
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

            {/* Controls */}
            <div className="flex gap-3">
              {!timer.isRunning ? (
                <button
                  onClick={() => void handleStartTimer()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg"
                >
                  <Timer className="w-5 h-5" />
                  {timer.elapsedSeconds > 0 ? "Resume" : "Start Timer"}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => updateTimer({ isRunning: false })}
                    className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-6 py-3 rounded-xl font-semibold hover:bg-amber-100 transition-colors"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => void handleStopAndSave()}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
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

      {/* Manual entry panel */}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
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

            {/* Billable toggle */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsBillable(!isBillable)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors ${
                  isBillable
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isBillable ? (
                    <ToggleRight className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                  <span className={`text-sm font-medium ${isBillable ? "text-emerald-700" : "text-slate-600"}`}>
                    Billable
                  </span>
                </div>
                <span className={`text-xs ${isBillable ? "text-emerald-500" : "text-slate-400"}`}>
                  {isBillable ? "Will be invoiced" : "Internal / non-billable"}
                </span>
              </button>

              {!isBillable && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(NON_BILLABLE_LABELS) as [NonBillableCategory, string][]).map(
                        ([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setNonBillableCategory(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              nonBillableCategory === key
                                ? "bg-slate-700 text-white"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {label}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <button onClick={() => void handleManualSubmit()} disabled={isSaving} className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              <Plus className="w-5 h-5" />
              {isSaving && activeTab === "manual" ? "Saving..." : "Save Time Entry"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Tiny task panel */}
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
                    className={`flex-1 min-w-[60px] py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
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
                {tinyDuration}m{isBillable && tinyProjectId ? ` = ${formatCurrency(calculateAmount(calculateBilledMinutes(tinyDuration, projects.find((p) => p.id === tinyProjectId)?.billingIncrement ?? profile?.defaultBillingIncrement ?? "exact", projects.find((p) => p.id === tinyProjectId)?.minimumBillableMinutes ?? profile?.defaultMinimumBillableMinutes ?? null), projects.find((p) => p.id === tinyProjectId)?.hourlyRate ?? profile?.defaultHourlyRate ?? 0))}` : ""}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {isBillable ? "Billable" : "Non-billable"} entry
              </div>
            </div>

            {/* Billable toggle for tiny tasks */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsBillable(!isBillable)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors ${
                  isBillable
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isBillable ? (
                    <ToggleRight className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                  <span className={`text-sm font-medium ${isBillable ? "text-emerald-700" : "text-slate-600"}`}>
                    Billable
                  </span>
                </div>
                <span className={`text-xs ${isBillable ? "text-emerald-500" : "text-slate-400"}`}>
                  {isBillable ? "Will be invoiced" : "Internal / non-billable"}
                </span>
              </button>

              {!isBillable && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(NON_BILLABLE_LABELS) as [NonBillableCategory, string][]).map(
                        ([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setNonBillableCategory(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              nonBillableCategory === key
                                ? "bg-slate-700 text-white"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {label}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <button onClick={() => void handleTinySubmit()} disabled={isSaving} className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              <Zap className="w-5 h-5" />
              {isSaving && activeTab === "tiny" ? "Saving..." : "Save Tiny Task"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Recent entries list */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-900">Recent Entries</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {recentEntries.map((entry) => {
            const client = clients.find((c) => c.id === entry.clientId);
            const project = projects.find((p) => p.id === entry.projectId);
            return (
              <div
                key={entry.id}
                className={`px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between transition-colors gap-2 ${
                  !entry.isBillable ? "bg-slate-50/50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      !entry.isBillable ? "bg-slate-400" : ""
                    }`}
                    style={entry.isBillable ? { backgroundColor: client?.color || "#94A3B8" } : undefined}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${!entry.isBillable ? "text-slate-500" : "text-slate-900"}`}>
                        {entry.taskNote}
                      </span>
                      {!entry.isBillable && (
                        <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">
                          {entry.nonBillableCategory ? NON_BILLABLE_LABELS[entry.nonBillableCategory] : "Non-billable"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {client?.name} • {project?.name} • {entry.entryDate}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 pl-5 sm:pl-0">
                  {entry.isBillable ? (
                    <>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Work Session</div>
                        <div className="text-sm font-mono-nums text-slate-600">
                          {formatTimeRange(entry.startTime, entry.endTime) || "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Total Time</div>
                        <div className="text-sm font-mono-nums font-semibold text-emerald-600">{formatMinutes(entry.actualMinutes)}</div>
                      </div>
                      <div className="text-right w-16 sm:w-20">
                        <div className="text-xs text-slate-400">Amount</div>
                        <div className="text-sm font-mono-nums font-semibold text-slate-900">{formatCurrency(entry.amount)}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Work Session</div>
                        <div className="text-sm font-mono-nums text-slate-500">
                          {formatTimeRange(entry.startTime, entry.endTime) || "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Total Time</div>
                        <div className="text-sm font-mono-nums text-slate-500">{formatMinutes(entry.actualMinutes)}</div>
                      </div>
                      <div className="text-right w-20">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Non-billable
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
