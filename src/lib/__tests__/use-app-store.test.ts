import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/lib/store/use-app-store";
import type {
  Client,
  Project,
  TimeEntry,
  Invoice,
  UserProfile,
} from "@/lib/types";

// Reset store before each test
beforeEach(() => {
  useAppStore.setState({
    profile: null,
    clients: [],
    projects: [],
    timeEntries: [],
    invoices: [],
    timer: {
      isRunning: false,
      startTime: null,
      elapsedSeconds: 0,
      clientId: null,
      projectId: null,
      taskNote: "",
    },
    sidebarCollapsed: false,
    sidebarOpen: false,
    invoiceDraft: null,
    isDataLoading: false,
    dataError: null,
    hasLoadedData: false,
    lastLoadedAt: null,
    paidThisMonth: 0,
    paidBilledMinutes: 0,
  });
});

// ─── Mock data helpers ───────────────────────────────────────────────────────

const mockProfile: UserProfile = {
  id: "prof-1",
  userId: "user-1",
  businessName: "Test Business",
  fullName: "Test User",
  email: "test@example.com",
  phone: null,
  address: null,
  logoUrl: null,
  defaultCurrency: "$",
  defaultHourlyRate: 100,
  defaultBillingIncrement: "exact",
  defaultMinimumBillableMinutes: null,
  defaultInvoiceDetailLevel: "detailed",
  defaultInvoiceNotes: null,
  invoiceNumberPrefix: "INV",
  nextInvoiceNumber: 1,
  defaultDueDays: 14,
  taxLabel: null,
  taxPercentage: null,
  paymentInstructions: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockClient: Client = {
  id: "client-1",
  userId: "user-1",
  name: "Acme Corp",
  companyName: "Acme Inc",
  email: "acme@test.com",
  phone: null,
  billingAddress: null,
  notes: null,
  color: "#10B981",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockProject: Project = {
  id: "proj-1",
  userId: "user-1",
  clientId: "client-1",
  name: "Website",
  description: null,
  hourlyRate: 100,
  billingIncrement: "exact",
  minimumBillableMinutes: null,
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTimeEntry: TimeEntry = {
  id: "te-1",
  userId: "user-1",
  clientId: "client-1",
  projectId: "proj-1",
  invoiceId: null,
  entryDate: "2024-06-15",
  startTime: "2024-06-15T09:00:00Z",
  endTime: "2024-06-15T10:00:00Z",
  actualMinutes: 60,
  billedMinutes: 60,
  hourlyRate: 100,
  amount: 100,
  taskNote: "Work done",
  internalNote: null,
  billingRuleSnapshot: { rule: "exact", incrementMinutes: null, minimumMinutes: null },
  status: "uninvoiced",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockInvoice: Invoice = {
  id: "inv-1",
  userId: "user-1",
  clientId: "client-1",
  invoiceNumber: "INV-001",
  invoiceDate: "2024-06-15",
  dueDate: "2024-07-15",
  detailLevel: "detailed",
  subtotal: 1000,
  taxAmount: 0,
  discountAmount: 0,
  totalAmount: 1000,
  status: "draft",
  notes: null,
  paymentInstructions: null,
  clientNameSnapshot: "Acme Corp",
  clientEmailSnapshot: null,
  clientCompanySnapshot: null,
  clientAddressSnapshot: null,
  clientPhoneSnapshot: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Dashboard Snapshot ──────────────────────────────────────────────────────

describe("setDashboardSnapshot", () => {
  it("sets all dashboard data from snapshot", () => {
    useAppStore.getState().setDashboardSnapshot({
      profile: mockProfile,
      clients: [mockClient],
      projects: [mockProject],
      timeEntries: [mockTimeEntry],
      invoices: [mockInvoice],
      paidThisMonth: 5000,
      paidBilledMinutes: 300,
    });

    const state = useAppStore.getState();
    expect(state.profile).toEqual(mockProfile);
    expect(state.clients).toHaveLength(1);
    expect(state.projects).toHaveLength(1);
    expect(state.timeEntries).toHaveLength(1);
    expect(state.invoices).toHaveLength(1);
    expect(state.paidThisMonth).toBe(5000);
    expect(state.paidBilledMinutes).toBe(300);
    expect(state.hasLoadedData).toBe(true);
    expect(state.dataError).toBeNull();
    expect(state.lastLoadedAt).toBeGreaterThan(0);
  });
});

describe("clearDashboardSnapshot", () => {
  it("clears all dashboard data", () => {
    // First set some data
    useAppStore.getState().setDashboardSnapshot({
      profile: mockProfile,
      clients: [mockClient],
      projects: [],
      timeEntries: [],
      invoices: [],
      paidThisMonth: 0,
      paidBilledMinutes: 0,
    });

    // Then clear
    useAppStore.getState().clearDashboardSnapshot();

    const state = useAppStore.getState();
    expect(state.profile).toBeNull();
    expect(state.clients).toHaveLength(0);
    expect(state.projects).toHaveLength(0);
    expect(state.hasLoadedData).toBe(false);
    expect(state.lastLoadedAt).toBeNull();
  });
});

// ─── Loading / Error State ───────────────────────────────────────────────────

describe("setDataLoading", () => {
  it("updates loading state", () => {
    useAppStore.getState().setDataLoading(true);
    expect(useAppStore.getState().isDataLoading).toBe(true);

    useAppStore.getState().setDataLoading(false);
    expect(useAppStore.getState().isDataLoading).toBe(false);
  });
});

describe("setDataError", () => {
  it("sets and clears data error", () => {
    useAppStore.getState().setDataError("Failed to load");
    expect(useAppStore.getState().dataError).toBe("Failed to load");

    useAppStore.getState().setDataError(null);
    expect(useAppStore.getState().dataError).toBeNull();
  });
});

// ─── Entity Add/Upsert ───────────────────────────────────────────────────────

describe("addClient", () => {
  it("adds a new client to the list", () => {
    useAppStore.getState().addClient(mockClient);
    expect(useAppStore.getState().clients).toHaveLength(1);
    expect(useAppStore.getState().clients[0].id).toBe("client-1");
  });

  it("upserts - same id replaces existing client", () => {
    useAppStore.getState().addClient(mockClient);
    const updated = { ...mockClient, name: "Updated Corp" };
    useAppStore.getState().addClient(updated);
    expect(useAppStore.getState().clients).toHaveLength(1);
    expect(useAppStore.getState().clients[0].name).toBe("Updated Corp");
  });
});

describe("addProject", () => {
  it("adds a new project to the list", () => {
    useAppStore.getState().addProject(mockProject);
    expect(useAppStore.getState().projects).toHaveLength(1);
    expect(useAppStore.getState().projects[0].name).toBe("Website");
  });

  it("upserts projects with same id", () => {
    useAppStore.getState().addProject(mockProject);
    const updated = { ...mockProject, name: "Updated Project" };
    useAppStore.getState().addProject(updated);
    expect(useAppStore.getState().projects).toHaveLength(1);
    expect(useAppStore.getState().projects[0].name).toBe("Updated Project");
  });
});

describe("addTimeEntry", () => {
  it("adds a new time entry to the beginning of the list", () => {
    const entry1 = { ...mockTimeEntry, id: "te-1" };
    const entry2 = { ...mockTimeEntry, id: "te-2" };
    useAppStore.getState().addTimeEntry(entry1);
    useAppStore.getState().addTimeEntry(entry2);
    expect(useAppStore.getState().timeEntries).toHaveLength(2);
    // Most recent should be first
    expect(useAppStore.getState().timeEntries[0].id).toBe("te-2");
    expect(useAppStore.getState().timeEntries[1].id).toBe("te-1");
  });
});

describe("addInvoice", () => {
  it("adds a new invoice", () => {
    useAppStore.getState().addInvoice(mockInvoice);
    expect(useAppStore.getState().invoices).toHaveLength(1);
    expect(useAppStore.getState().invoices[0].invoiceNumber).toBe("INV-001");
  });
});

describe("updateInvoice", () => {
  it("updates an existing invoice in place", () => {
    useAppStore.getState().addInvoice(mockInvoice);
    const updated = { ...mockInvoice, status: "paid" as const, totalAmount: 1100 };
    useAppStore.getState().updateInvoice(updated);
    expect(useAppStore.getState().invoices).toHaveLength(1);
    expect(useAppStore.getState().invoices[0].status).toBe("paid");
    expect(useAppStore.getState().invoices[0].totalAmount).toBe(1100);
  });

  it("does nothing for non-existent invoice id", () => {
    useAppStore.getState().addInvoice(mockInvoice);
    const unknown = { ...mockInvoice, id: "non-existent" };
    useAppStore.getState().updateInvoice(unknown);
    expect(useAppStore.getState().invoices[0].id).toBe("inv-1");
  });
});

// ─── Invoice Draft ───────────────────────────────────────────────────────────

describe("invoiceDraft", () => {
  it("sets and clears invoice draft", () => {
    const draft = {
      clientId: "client-1",
      invoiceDate: "2024-06-15",
      dueDate: "2024-07-15",
      detailLevel: "detailed" as const,
      notes: "",
      paymentInstructions: "",
      taxPercentage: 0,
      discountAmount: 0,
      lineItems: [],
    };
    useAppStore.getState().setInvoiceDraft(draft);
    expect(useAppStore.getState().invoiceDraft).toEqual(draft);

    useAppStore.getState().clearInvoiceDraft();
    expect(useAppStore.getState().invoiceDraft).toBeNull();
  });
});

// ─── Timer ───────────────────────────────────────────────────────────────────

describe("timer", () => {
  it("updates timer partially", () => {
    useAppStore.getState().updateTimer({ isRunning: true, clientId: "client-1" });
    const timer = useAppStore.getState().timer;
    expect(timer.isRunning).toBe(true);
    expect(timer.clientId).toBe("client-1");
    // other fields should remain unchanged
    expect(timer.projectId).toBeNull();
  });

  it("resets timer to default", () => {
    useAppStore.getState().updateTimer({ isRunning: true, elapsedSeconds: 300, clientId: "c1" });
    useAppStore.getState().resetTimer();
    const timer = useAppStore.getState().timer;
    expect(timer.isRunning).toBe(false);
    expect(timer.elapsedSeconds).toBe(0);
    expect(timer.clientId).toBeNull();
  });

  it("ticks timer increments elapsedSeconds by 1", () => {
    const before = useAppStore.getState().timer.elapsedSeconds;
    useAppStore.getState().tickTimer();
    expect(useAppStore.getState().timer.elapsedSeconds).toBe(before + 1);

    useAppStore.getState().tickTimer();
    useAppStore.getState().tickTimer();
    expect(useAppStore.getState().timer.elapsedSeconds).toBe(before + 3);
  });
});

// ─── Sidebar ─────────────────────────────────────────────────────────────────

describe("sidebar", () => {
  it("toggles sidebar collapsed state", () => {
    expect(useAppStore.getState().sidebarCollapsed).toBe(false);
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarCollapsed).toBe(true);
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarCollapsed).toBe(false);
  });

  it("sets sidebar open state", () => {
    useAppStore.getState().setSidebarOpen(true);
    expect(useAppStore.getState().sidebarOpen).toBe(true);
    useAppStore.getState().setSidebarOpen(false);
    expect(useAppStore.getState().sidebarOpen).toBe(false);
  });
});

// ─── Invalidate Data ─────────────────────────────────────────────────────────

describe("invalidateData", () => {
  it("sets lastLoadedAt to null", () => {
    useAppStore.getState().setDashboardSnapshot({
      profile: mockProfile,
      clients: [],
      projects: [],
      timeEntries: [],
      invoices: [],
      paidThisMonth: 0,
      paidBilledMinutes: 0,
    });
    expect(useAppStore.getState().lastLoadedAt).not.toBeNull();

    useAppStore.getState().invalidateData();
    expect(useAppStore.getState().lastLoadedAt).toBeNull();
  });
});
