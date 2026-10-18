import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildIncident, buildSeed, type SeedState } from "@/data/seed";
import { scenarioById } from "@/data/scenarios";
import type {
  AgentStatus,
  Decoy,
  Decision,
  Incident,
  IncidentStatus,
  RoleContract,
  SecurityEvent,
  Signals,
} from "@/data/types";
import { computeRisk, emptySignals, mergeSignals, type RiskBreakdown } from "@/lib/risk";
import { pick, rng } from "@/lib/utils";

export type Theme = "dark" | "light";

export interface Settings {
  theme: Theme;
  liveStream: boolean;
  thresholds: { stepUp: number; restrict: number; quarantine: number };
  autoContain: boolean;
  compactTables: boolean;
  analystName: string;
}

export interface LabState {
  scenarioId: string;
  targetAgentId: string;
  payload: string;
  stepIndex: number; // -1 = not started
  running: boolean;
  signals: Signals;
  history: { step: number; score: number }[];
  incidentId: string | null;
  completed: boolean;
}

export interface AppState extends SeedState {
  epoch: number;
  settings: Settings;
  lab: LabState;
  runCount: number;
  scoreboard: { runs: number; detected: number; falseAlarms: number; legitPassed: number };
  sidebarCollapsed: boolean;

  toggleSidebar: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setAgentStatus: (agentId: string, status: AgentStatus, reason?: string) => void;
  updateIncident: (id: string, patch: Partial<Pick<Incident, "status" | "assignee" | "containment">>) => void;
  addIncidentNote: (id: string, text: string) => void;
  approveChange: (id: string, approver: string) => void;
  rejectChange: (id: string) => void;
  saveContract: (c: RoleContract) => void;
  submitContract: (id: string) => void;
  approveContract: (id: string) => void;
  pushLiveEvent: () => void;
  simulateGhostCall: (agentId: string) => void;
  addDecoy: (d: Omit<Decoy, "id" | "triggers" | "lastTriggeredHoursAgo" | "status">) => void;
  triggerDecoy: (id: string) => void;
  toggleDecoy: (id: string) => void;

  labSelect: (scenarioId: string) => void;
  labSetPayload: (payload: string) => void;
  labSetTarget: (agentId: string) => void;
  labStart: () => void;
  labPause: () => void;
  labStep: () => void;
  labReset: () => void;

  resetDemo: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  liveStream: true,
  thresholds: { stepUp: 40, restrict: 60, quarantine: 80 },
  autoContain: true,
  compactTables: false,
  analystName: "Nikhil Rao",
};

function freshLab(scenarioId = "scn-poisoned-pdf"): LabState {
  const s = scenarioById(scenarioId)!;
  return {
    scenarioId,
    targetAgentId: s.targetAgentId,
    payload: s.defaultPayload,
    stepIndex: -1,
    running: false,
    signals: emptySignals(),
    history: [],
    incidentId: null,
    completed: false,
  };
}

function freshState() {
  const epoch = Math.floor(Date.now() / 60_000) * 60_000;
  return {
    ...buildSeed(epoch),
    epoch,
    lab: freshLab(),
    runCount: 0,
    scoreboard: { runs: 0, detected: 0, falseAlarms: 0, legitPassed: 0 },
  };
}

const statusForDecision: Partial<Record<Decision, AgentStatus>> = {
  restrict: "restricted",
  quarantine: "quarantined",
  step_up: "held",
  hold: "held",
  block: "held",
};

let liveCounter = 0;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...freshState(),
      settings: DEFAULT_SETTINGS,
      sidebarCollapsed: false,

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setAgentStatus: (agentId, status, reason) =>
        set((s) => {
          const agent = s.agents.find((a) => a.id === agentId);
          if (!agent) return s;
          const released = status === "protected";
          const ev: SecurityEvent = {
            id: `evt-c-${Date.now().toString(36)}`,
            ts: Date.now(),
            agentId,
            sessionId: "analyst",
            kind: "policy",
            action: released ? "release" : `containment:${status}`,
            target: agent.credentialId,
            decision: released ? "allow" : status === "quarantined" ? "quarantine" : status === "restricted" ? "restrict" : "hold",
            risk: released ? agent.baselineRisk : agent.risk,
            detail: reason ?? `Analyst set ${agent.name} to ${status} (simulated)`,
            simulated: true,
          };
          return {
            agents: s.agents.map((a) =>
              a.id === agentId ? { ...a, status, risk: released ? a.baselineRisk : a.risk } : a,
            ),
            events: [ev, ...s.events].slice(0, 500),
          };
        }),

      updateIncident: (id, patch) =>
        set((s) => ({
          incidents: s.incidents.map((i) =>
            i.id === id
              ? {
                  ...i,
                  ...patch,
                  timeline: [
                    ...i.timeline,
                    ...(patch.status
                      ? [{ ts: Date.now(), label: `Status set to ${patch.status.replace("_", " ")}`, actor: s.settings.analystName, tone: "accent" as const }]
                      : []),
                    ...(patch.assignee ? [{ ts: Date.now(), label: `Assigned to ${patch.assignee}`, actor: s.settings.analystName, tone: "neutral" as const }] : []),
                  ],
                }
              : i,
          ),
        })),

      addIncidentNote: (id, text) =>
        set((s) => ({
          incidents: s.incidents.map((i) =>
            i.id === id ? { ...i, notes: [...i.notes, { ts: Date.now(), author: s.settings.analystName, text }] } : i,
          ),
        })),

      approveChange: (id, approver) =>
        set((s) => {
          const changes = s.changes.map((c) => {
            if (c.id !== id) return c;
            const approvals = c.approvals.map((a) => (a.name === approver && !a.at ? { ...a, at: Date.now() } : a));
            const count = approvals.filter((a) => a.at).length;
            return { ...c, approvals, status: count >= c.requiredApprovals ? ("applied" as const) : c.status };
          });
          const ch = changes.find((c) => c.id === id)!;
          const contracts =
            ch.status === "applied"
              ? s.contracts.map((c) => {
                  if (c.id === ch.contractId) return { ...c, status: "active" as const, updatedHoursAgo: 0 };
                  // retire the previous active version of the same role for the same agent
                  if (c.agentIds.includes(ch.agentId) && c.status === "active" && c.id !== ch.contractId && ch.contractId !== c.id && c.role === s.contracts.find((x) => x.id === ch.contractId)?.role)
                    return { ...c, status: "draft" as const };
                  return c;
                })
              : s.contracts;
          const agents =
            ch.status === "applied"
              ? s.agents.map((a) => (a.id === ch.agentId && contracts.some((c) => c.id === ch.contractId) ? { ...a, contractId: ch.contractId } : a))
              : s.agents;
          return { changes, contracts, agents };
        }),

      rejectChange: (id) => set((s) => ({ changes: s.changes.map((c) => (c.id === id ? { ...c, status: "rejected" as const } : c)) })),

      saveContract: (c) =>
        set((s) => ({
          contracts: s.contracts.some((x) => x.id === c.id) ? s.contracts.map((x) => (x.id === c.id ? { ...c, updatedHoursAgo: 0 } : x)) : [...s.contracts, c],
        })),
      submitContract: (id) => set((s) => ({ contracts: s.contracts.map((c) => (c.id === id ? { ...c, status: "pending_approval" as const } : c)) })),
      approveContract: (id) => set((s) => ({ contracts: s.contracts.map((c) => (c.id === id ? { ...c, status: "active" as const, updatedHoursAgo: 0 } : c)) })),

      pushLiveEvent: () =>
        set((s) => {
          const r = rng(Date.now() % 100000);
          const healthy = s.agents.filter((a) => !a.isCanary && a.status !== "quarantined" && a.baselineTools.length);
          if (!healthy.length) return s;
          const a = pick(r, healthy);
          const tool = pick(r, a.baselineTools).tool;
          const ev: SecurityEvent = {
            id: `evt-l-${Date.now().toString(36)}-${liveCounter++}`,
            ts: Date.now(),
            agentId: a.id,
            sessionId: `ses-live-${(Math.floor(Date.now() / 120000) % 1000).toString()}`,
            kind: tool.includes("post") || tool === "send_email" ? "egress" : tool === "delegate" ? "delegation" : "tool_call",
            action: tool,
            target: a.status === "restricted" ? "scope-limited token" : "acme.internal",
            decision: "allow",
            risk: Math.max(3, Math.round(a.baselineRisk * 0.7 + r() * 10)),
            detail: `${tool} matched role contract ${a.contractId} (simulated live)`,
            simulated: true,
          };
          return { events: [ev, ...s.events].slice(0, 500) };
        }),

      simulateGhostCall: (agentId) =>
        set((s) => {
          const a = s.agents.find((x) => x.id === agentId);
          if (!a) return s;
          const now = Date.now();
          const receipt = {
            id: `rcpt-sim-${now.toString(36)}`,
            ts: now,
            agentId,
            credentialId: a.credentialId,
            method: "GET",
            endpoint: `${a.baselineTools[0]?.tool ?? "api"}/export?limit=5000`,
            sourceIp: "203.0.113.77",
            spanId: null,
            matched: false,
            scenario: "Simulated replay",
          };
          const ev: SecurityEvent = {
            id: `evt-g-${now.toString(36)}`,
            ts: now,
            agentId,
            sessionId: "no-session",
            kind: "credential",
            action: "token.reconcile",
            target: receipt.endpoint,
            decision: "block",
            risk: 82,
            detail: "API call carried the agent token but no matching reasoning span within 2s. Request rejected (simulated).",
            simulated: true,
          };
          return { receipts: [receipt, ...s.receipts], events: [ev, ...s.events].slice(0, 500) };
        }),

      addDecoy: (d) =>
        set((s) => ({ decoys: [{ ...d, id: `dcy-${(s.decoys.length + 1).toString().padStart(2, "0")}-${Date.now().toString(36).slice(-3)}`, triggers: 0, lastTriggeredHoursAgo: null, status: "armed" }, ...s.decoys] })),
      triggerDecoy: (id) =>
        set((s) => {
          const d = s.decoys.find((x) => x.id === id);
          if (!d) return s;
          const ev: SecurityEvent = {
            id: `evt-d-${Date.now().toString(36)}`,
            ts: Date.now(),
            agentId: "agt-canary-99",
            sessionId: "decoy-test",
            kind: "decoy",
            action: `decoy.touch:${d.name}`,
            target: d.plantedIn,
            decision: "quarantine",
            risk: 85,
            detail: `Test trigger of ${d.kind} decoy. Canary floor 85 applied (simulated).`,
            simulated: true,
          };
          return {
            decoys: s.decoys.map((x) => (x.id === id ? { ...x, triggers: x.triggers + 1, lastTriggeredHoursAgo: 0, status: "triggered" as const } : x)),
            events: [ev, ...s.events].slice(0, 500),
          };
        }),
      toggleDecoy: (id) => set((s) => ({ decoys: s.decoys.map((x) => (x.id === id ? { ...x, status: x.status === "disabled" ? ("armed" as const) : ("disabled" as const) } : x)) })),

      labSelect: (scenarioId) => set({ lab: freshLab(scenarioId) }),
      labSetPayload: (payload) => set((s) => ({ lab: { ...s.lab, payload } })),
      labSetTarget: (agentId) => set((s) => ({ lab: { ...s.lab, targetAgentId: agentId } })),
      labStart: () => {
        const { lab } = get();
        if (lab.completed) get().labReset();
        set((s) => ({ lab: { ...s.lab, running: true } }));
        if (get().lab.stepIndex === -1) get().labStep();
      },
      labPause: () => set((s) => ({ lab: { ...s.lab, running: false } })),
      labReset: () =>
        set((s) => {
          const fresh = freshLab(s.lab.scenarioId);
          return { lab: { ...fresh, payload: s.lab.payload, targetAgentId: s.lab.targetAgentId } };
        }),

      labStep: () => {
        const s = get();
        const scn = scenarioById(s.lab.scenarioId)!;
        const next = s.lab.stepIndex + 1;
        if (next >= scn.steps.length) {
          set({ lab: { ...s.lab, running: false, completed: true } });
          return;
        }
        const step = scn.steps[next];
        const signals = mergeSignals(s.lab.signals, step.signals);
        const score = computeRisk(signals).score;
        const agentId = s.lab.targetAgentId;
        const now = Date.now();
        const sessionId = `ses-lab-${s.runCount + 1}`;
        let incidentId = s.lab.incidentId;
        let incidents = s.incidents;
        let agents = s.agents;
        let changes = s.changes;
        let contracts = s.contracts;
        let scoreboard = s.scoreboard;

        const ev: SecurityEvent = {
          id: `evt-lab-${now.toString(36)}-${next}`,
          ts: now,
          agentId,
          sessionId,
          kind: step.signals.canary ? "decoy" : step.signals.credentialMismatch ? "credential" : step.kind === "containment" ? "policy" : step.tool.startsWith("http") || step.tool.includes("post") || step.tool.includes("upload") ? "egress" : "tool_call",
          action: step.tool,
          target: step.target,
          decision: step.decision,
          risk: score,
          detail: `${step.title}. ${step.evidence}`,
          simulated: true,
        };

        // Agent risk + status follow the simulation
        const statusNow: AgentStatus | undefined =
          scn.legitimate ? undefined : step.kind === "containment" ? statusForDecision[scn.containment] : step.kind === "deviation" || step.kind === "detection" ? (s.settings.autoContain ? "held" : undefined) : undefined;
        agents = agents.map((a) =>
          a.id === agentId
            ? {
                ...a,
                risk: scn.legitimate ? Math.max(a.baselineRisk, Math.min(score, 39)) : Math.max(a.risk, score),
                status: statusNow ?? a.status,
                toolCalls24h: a.toolCalls24h + 1,
              }
            : a,
        );

        // First detection creates the incident; later steps append to it
        const isDetection = step.kind === "detection" || (step.kind === "deviation" && step.decision === "block");
        if (!scn.legitimate && isDetection && !incidentId) {
          const n = 2001 + incidents.filter((i) => i.simulated).length;
          incidentId = `INC-${n}`;
          const inc = buildIncident(
            { ...scn, targetAgentId: agentId },
            incidentId,
            now,
            "investigating",
            s.settings.analystName,
            { simulated: true, payload: s.lab.payload },
          );
          // timeline reflects only steps so far; finished on containment
          inc.timeline = scn.steps.slice(0, next + 1).map((st, i) => ({
            ts: now - (next - i) * 1600,
            label: `${st.title} (${st.tool})`,
            actor: st.source,
            tone: st.kind === "deviation" || st.kind === "detection" ? "critical" : st.kind === "suspicious" ? "warning" : "neutral",
          }));
          inc.signals = signals;
          inc.risk = score;
          incidents = [inc, ...incidents];
          scoreboard = { ...scoreboard, detected: scoreboard.detected + 1 };
          ev.incidentId = incidentId;
        } else if (incidentId) {
          ev.incidentId = incidentId;
          incidents = incidents.map((i) =>
            i.id === incidentId
              ? {
                  ...i,
                  risk: Math.max(i.risk, score),
                  signals,
                  status: step.kind === "containment" ? "contained" : i.status,
                  timeline: [
                    ...i.timeline,
                    {
                      ts: now,
                      label: `${step.title} (${step.tool})`,
                      actor: step.source,
                      tone: step.kind === "containment" ? "accent" : step.kind === "resume" ? "healthy" : step.kind === "suspicious" ? "warning" : "critical",
                    },
                  ],
                }
              : i,
          );
        }

        // Legitimate change: apply CHG-311 and update baseline, never create an incident
        if (scn.legitimate && next === 0) {
          changes = changes.map((c) =>
            c.id === "CHG-311" ? { ...c, status: "applied", approvals: c.approvals.map((a) => (a.name === "Treasury" ? { ...a, at: now } : a)) } : c,
          );
          contracts = contracts.map((c) => (c.id === "rc-finance-v41" ? { ...c, status: "active", updatedHoursAgo: 0 } : c.id === "rc-finance" ? { ...c, status: "draft" } : c));
          agents = agents.map((a) => (a.id === "agt-finance-02" ? { ...a, contractId: "rc-finance-v41" } : a));
        }
        if (scn.legitimate && next === scn.steps.length - 1) {
          agents = agents.map((a) =>
            a.id === agentId
              ? { ...a, baselineTools: a.baselineTools.some((t) => t.tool === "vendor_payment_schedule") ? a.baselineTools : [...a.baselineTools.map((t) => ({ ...t, share: +(t.share * 0.92).toFixed(2) })), { tool: "vendor_payment_schedule", share: 0.08 }] }
              : a,
          );
          scoreboard = { ...scoreboard, legitPassed: scoreboard.legitPassed + 1 };
        }

        const done = next === scn.steps.length - 1;
        set({
          agents,
          incidents,
          changes,
          contracts,
          scoreboard: done ? { ...scoreboard, runs: scoreboard.runs + 1 } : scoreboard,
          runCount: done ? s.runCount + 1 : s.runCount,
          events: [ev, ...s.events].slice(0, 500),
          lab: {
            ...s.lab,
            stepIndex: next,
            signals,
            history: [...s.lab.history, { step: next, score }],
            incidentId,
            running: done ? false : s.lab.running,
            completed: done,
          },
        });
      },

      resetDemo: () => {
        const { settings } = get();
        set({ ...freshState(), settings: { ...DEFAULT_SETTINGS, theme: settings.theme } });
      },
    }),
    {
      name: "exorcist-demo-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => {
        const { lab, ...rest } = s;
        return { ...rest, lab: { ...lab, running: false } } as unknown as AppState;
      },
    },
  ),
);

export function useRisk(signals: Partial<Signals>): RiskBreakdown {
  return computeRisk(signals);
}

export const INCIDENT_STATUSES: IncidentStatus[] = ["open", "investigating", "contained", "resolved", "false_positive"];
