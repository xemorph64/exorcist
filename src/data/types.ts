export type Framework = "LangGraph" | "CrewAI" | "AutoGen" | "OpenAI Agents SDK" | "MCP Custom";
export type AgentStatus = "protected" | "learning" | "held" | "restricted" | "quarantined";
export type Decision = "allow" | "step_up" | "hold" | "restrict" | "block" | "quarantine";
export type Severity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "open" | "investigating" | "contained" | "resolved" | "false_positive";
export type EventKind = "tool_call" | "policy" | "delegation" | "egress" | "llm" | "credential" | "decoy" | "change";
export type Band = "observe" | "step_up" | "restrict" | "quarantine";

export type SignalKey =
  | "roleDeviation"
  | "sequenceAnomaly"
  | "slowDrift"
  | "dataFlow"
  | "taskMismatch"
  | "credentialMismatch"
  | "canary";

export type Signals = Record<SignalKey, number>;

export interface Agent {
  id: string;
  name: string;
  role: string;
  team: string;
  owner: string;
  framework: Framework;
  model: string;
  status: AgentStatus;
  risk: number;
  baselineRisk: number;
  contractId: string;
  credentialId: string;
  delegatesTo: string[];
  description: string;
  createdDaysAgo: number;
  sessions30d: number;
  toolCalls24h: number;
  baselineTools: { tool: string; share: number }[];
  isCanary?: boolean;
}

export interface RoleContract {
  id: string;
  name: string;
  role: string;
  version: string;
  status: "active" | "draft" | "pending_approval";
  agentIds: string[];
  allowedTools: string[];
  allowedDomains: string[];
  dataClasses: string[];
  prohibited: string[];
  maxDelegationDepth: number;
  stepUpOver: number;
  approvers: string[];
  updatedHoursAgo: number;
}

export interface SecurityEvent {
  id: string;
  ts: number;
  agentId: string;
  sessionId: string;
  kind: EventKind;
  action: string;
  target: string;
  decision: Decision;
  risk: number;
  detail: string;
  incidentId?: string;
  simulated?: boolean;
}

export interface Session {
  id: string;
  agentId: string;
  task: string;
  startedAt: number;
  durationS: number;
  steps: number;
  outcome: "completed" | "held" | "blocked" | "running";
  peakRisk: number;
  path: string[];
}

export interface TimelineEntry {
  ts: number;
  label: string;
  actor: string;
  tone: "neutral" | "warning" | "critical" | "healthy" | "accent";
}

export interface Evidence {
  id: string;
  kind: "document" | "tool_call" | "egress" | "credential" | "replay" | "decoy" | "policy";
  title: string;
  detail: string;
  hash: string;
}

export interface ReplayRun {
  label: "R0" | "R1" | "R2";
  name: string;
  description: string;
  actionReproduced: number; // out of 3 runs
  path: string[];
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  agentIds: string[];
  scenarioId: string;
  createdAt: number;
  risk: number;
  signals: Signals;
  assignee: string;
  summary: string;
  rootCause: string;
  timeline: TimelineEntry[];
  evidence: Evidence[];
  replay: { runs: ReplayRun[]; verdict: string; confidence: "strong" | "moderate" | "weak" | "inconclusive" };
  containment: Decision;
  affectedResources: string[];
  notes: { ts: number; author: string; text: string }[];
  simulated?: boolean;
}

export type StepKind = "normal" | "suspicious" | "deviation" | "detection" | "containment" | "resume";

export interface ScenarioStep {
  id: string;
  kind: StepKind;
  title: string;
  short?: string;
  tool: string;
  target: string;
  source: string;
  decision: Decision;
  signals: Partial<Signals>;
  evidence: string;
  policy?: string;
  resource?: string;
}

export interface Scenario {
  id: string;
  name: string;
  short: string;
  description: string;
  targetAgentId: string;
  payloadLabel: string;
  defaultPayload: string;
  legitimate?: boolean;
  expectedPath: string[];
  steps: ScenarioStep[];
  incidentTitle: string;
  severity: Severity;
  containment: Decision;
  replay: Incident["replay"];
  affectedResources: string[];
  rootCause: string;
}

export interface ChangeRequest {
  id: string;
  title: string;
  agentId: string;
  contractId: string;
  fromVersion: string;
  toVersion: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected" | "applied";
  approvals: { name: string; at?: number }[];
  requiredApprovals: number;
  createdHoursAgo: number;
  diff: { op: "+" | "-"; line: string }[];
  reason: string;
}

export interface CredentialReceipt {
  id: string;
  ts: number;
  agentId: string;
  credentialId: string;
  method: string;
  endpoint: string;
  sourceIp: string;
  spanId: string | null;
  matched: boolean;
  scenario?: string;
}

export interface Decoy {
  id: string;
  kind: "tool" | "document" | "credential" | "agent";
  name: string;
  plantedIn: string;
  triggers: number;
  lastTriggeredHoursAgo: number | null;
  status: "armed" | "triggered" | "disabled";
}

export interface DataFlow {
  id: string;
  dataClass: string;
  source: string;
  agentId: string;
  sink: string;
  approved: boolean;
  decision: Decision;
  volume: string;
  note: string;
}
