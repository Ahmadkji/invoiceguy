import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Client,
  Project,
  TimeEntry,
  Invoice,
  UserProfile,
  TimerState,
  InvoiceDraft,
} from "@/lib/types";

type DashboardSnapshot = {
  profile: UserProfile | null;
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  invoices: Invoice[];
  paidThisMonth: number;
  paidBilledMinutes: number;
};

interface AppState {
  profile: UserProfile | null;
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  invoices: Invoice[];
  timer: TimerState;
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  invoiceDraft: InvoiceDraft | null;
  isDataLoading: boolean;
  dataError: string | null;
  hasLoadedData: boolean;
  lastLoadedAt: number | null;
  paidThisMonth: number;
  paidBilledMinutes: number;

  // Actions
  setDashboardSnapshot: (snapshot: DashboardSnapshot) => void;
  clearDashboardSnapshot: () => void;
  setDataLoading: (loading: boolean) => void;
  setDataError: (message: string | null) => void;
  addTimeEntry: (entry: TimeEntry) => void;
  addClient: (client: Client) => void;
  addProject: (project: Project) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  setInvoiceDraft: (draft: InvoiceDraft | null) => void;
  clearInvoiceDraft: () => void;
  updateTimer: (updates: Partial<TimerState>) => void;
  resetTimer: () => void;
  tickTimer: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  invalidateData: () => void;
}

const defaultTimer: TimerState = {
  isRunning: false,
  startTime: null,
  elapsedSeconds: 0,
  clientId: null,
  projectId: null,
  taskNote: "",
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      clients: [],
      projects: [],
      timeEntries: [],
      invoices: [],
      timer: defaultTimer,
      sidebarCollapsed: false,
      sidebarOpen: false,
      invoiceDraft: null,
      isDataLoading: false,
      dataError: null,
      hasLoadedData: false,
      lastLoadedAt: null,
      paidThisMonth: 0,
      paidBilledMinutes: 0,

      setDashboardSnapshot: (snapshot) =>
        set({
          profile: snapshot.profile,
          clients: snapshot.clients,
          projects: snapshot.projects,
          timeEntries: snapshot.timeEntries,
          invoices: snapshot.invoices,
          paidThisMonth: snapshot.paidThisMonth,
          paidBilledMinutes: snapshot.paidBilledMinutes,
          dataError: null,
          hasLoadedData: true,
          lastLoadedAt: Date.now(),
        }),

      clearDashboardSnapshot: () =>
        set({
          profile: null,
          clients: [],
          projects: [],
          timeEntries: [],
          invoices: [],
          paidThisMonth: 0,
          paidBilledMinutes: 0,
          hasLoadedData: false,
          lastLoadedAt: null,
        }),

      setDataLoading: (loading) => set({ isDataLoading: loading }),

      setDataError: (message) => set({ dataError: message }),

      addTimeEntry: (entry) =>
        set((state) => ({
          timeEntries: [entry, ...state.timeEntries.filter((existing) => existing.id !== entry.id)],
        })),

      addClient: (client) =>
        set((state) => ({
          clients: [client, ...state.clients.filter((existing) => existing.id !== client.id)],
        })),

      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects.filter((existing) => existing.id !== project.id)],
        })),

      addInvoice: (invoice) =>
        set((state) => ({
          invoices: [invoice, ...state.invoices.filter((existing) => existing.id !== invoice.id)],
        })),

      updateInvoice: (invoice) =>
        set((state) => ({
          invoices: state.invoices.map((i) => (i.id === invoice.id ? invoice : i)),
        })),

      setInvoiceDraft: (draft) => set({ invoiceDraft: draft }),

      clearInvoiceDraft: () => set({ invoiceDraft: null }),

      updateTimer: (updates) =>
        set((state) => ({ timer: { ...state.timer, ...updates } })),

      resetTimer: () => set({ timer: defaultTimer }),

      tickTimer: () =>
        set((state) => ({
          timer: { ...state.timer, elapsedSeconds: state.timer.elapsedSeconds + 1 },
        })),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      invalidateData: () => set({ lastLoadedAt: null }),
    }),
    {
      name: "timeproof-app-store-v2",
      partialize: (state) => ({
        timer: state.timer,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarOpen: state.sidebarOpen,
        // invoiceDraft intentionally excluded — do not persist draft across sessions
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.timer?.isRunning && state.timer.startTime) {
          const startMs = new Date(state.timer.startTime).getTime();
          const correctElapsed = Math.floor((Date.now() - startMs) / 1000);
          if (correctElapsed > state.timer.elapsedSeconds) {
            state.timer = { ...state.timer, elapsedSeconds: Math.max(correctElapsed, 0) };
          }
        }
      },
    }
  )
);
