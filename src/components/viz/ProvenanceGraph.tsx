import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Edge } from "@xyflow/react";
import { useEffect, useMemo } from "react";
import type { Scenario } from "@/data/types";
import { edgeStyle, nodeTypes, type SecNode, type SecNodeKind } from "./flow";
import { stepTone } from "@/lib/paths";
import { fmtTime } from "@/lib/utils";

export interface ProvNodeInfo {
  id: string;
  kind: SecNodeKind;
  label: string;
  detail: string;
  ts?: number;
  stepIndex: number;
  policy?: string;
}

const COL = { source: 0, agent: 1, tool: 2, resource: 3, policy: 4 } as const;
const XS = 250;
const YS = 92;

export function buildProvenance(s: Scenario, agentName: (id: string) => string, t0: number) {
  const infos: ProvNodeInfo[] = [];
  const nodes: SecNode[] = [];
  const edges: Edge[] = [];
  const rows = { source: 0, agent: 0, tool: 0, resource: 0, policy: 0 };
  const add = (id: string, col: keyof typeof COL, data: SecNode["data"], info: Omit<ProvNodeInfo, "id" | "kind" | "label">) => {
    if (nodes.some((n) => n.id === id)) return;
    nodes.push({ id, type: "sec", position: { x: COL[col] * XS, y: rows[col]++ * YS }, data });
    infos.push({ id, kind: data.kind, label: data.label, ...info });
  };

  add("task", "source", { label: "User task", sub: s.steps[0]?.target, kind: "task", tone: "neutral" }, { detail: s.steps[0]?.target ?? "", stepIndex: 0, ts: t0 });
  add("untrusted", "source", { label: s.payloadLabel.split(" (")[0].slice(0, 34), sub: "untrusted input", kind: "document", tone: s.legitimate ? "neutral" : "warning", badge: s.legitimate ? undefined : "Tainted" }, { detail: s.defaultPayload, stepIndex: 1, ts: t0 + 20_000 });
  add("agent", "agent", { label: agentName(s.targetAgentId), sub: s.targetAgentId, kind: "agent", tone: "accent" }, { detail: "Primary agent under investigation", stepIndex: 0, ts: t0 });
  edges.push({ id: "task-agent", source: "task", target: "agent", style: edgeStyle("neutral"), label: "delegates", labelStyle: { fill: "var(--subtle)", fontSize: 10 }, labelBgStyle: { fill: "var(--surface)" } });
  edges.push({ id: "src-agent", source: "untrusted", target: "agent", style: edgeStyle(s.legitimate ? "muted" : "warning", true), label: "in_context", labelStyle: { fill: "var(--subtle)", fontSize: 10 }, labelBgStyle: { fill: "var(--surface)" } });

  s.steps.forEach((st, i) => {
    if (st.tool.startsWith("llm.") || st.tool === "task.receive" || st.kind === "resume") return;
    const ts = t0 + i * 22_000;
    const tone = stepTone(st, s.legitimate);
    const toolId = `tool-${i}`;
    let from = "agent";
    if (st.tool.startsWith("delegate") && st.target.startsWith("agt-")) {
      const aid = `agent-${st.target}`;
      add(aid, "agent", { label: agentName(st.target), sub: st.target, kind: st.signals.canary ? "decoy" : "agent", tone, badge: st.signals.canary ? "Decoy" : undefined }, { detail: st.evidence, stepIndex: i, ts });
      edges.push({ id: `d-${i}`, source: "agent", target: aid, animated: true, style: edgeStyle(tone === "neutral" ? "muted" : tone), label: "delegates", labelStyle: { fill: "var(--subtle)", fontSize: 10 }, labelBgStyle: { fill: "var(--surface)" } });
      from = aid;
    }
    const kind: SecNodeKind = st.kind === "containment" || st.tool.includes("replay") ? "policy" : st.signals.credentialMismatch ? "credential" : "tool";
    add(toolId, kind === "policy" ? "policy" : "tool", { label: st.tool, sub: st.title, kind, tone, ts: fmtTime(ts) }, { detail: st.evidence, stepIndex: i, ts, policy: st.policy });
    edges.push({ id: `e-${toolId}`, source: from, target: toolId, style: edgeStyle(tone === "neutral" ? "muted" : tone) });
    if (st.resource) {
      const rid = `res-${st.resource}`;
      const isDest = /\.(io|app|example)|#|^[a-z-]+\.(com|net)/.test(st.resource) || st.tool.startsWith("http");
      add(rid, "resource", { label: st.resource, sub: isDest ? "destination" : "data resource", kind: isDest ? "destination" : st.resource.endsWith(".pdf") || st.resource.endsWith(".docx") ? "document" : st.signals.canary ? "decoy" : "resource", tone: st.decision === "allow" ? "neutral" : tone }, { detail: `${st.tool} touched ${st.resource}`, stepIndex: i, ts });
      edges.push({ id: `r-${toolId}`, source: toolId, target: rid, style: edgeStyle(st.decision === "allow" ? "muted" : tone), animated: st.decision !== "allow" });
    }
    if (st.decision !== "allow" && kind !== "policy") {
      const pid = `pol-${i}`;
      add(pid, "policy", { label: `Decision: ${st.decision.replace("_", " ")}`, sub: st.policy ?? "risk band action", kind: "policy", tone: st.decision === "block" || st.decision === "quarantine" ? "critical" : "warning" }, { detail: st.policy ? `Checked against ${st.policy}` : st.evidence, stepIndex: i, ts, policy: st.policy });
      edges.push({ id: `p-${i}`, source: st.resource ? `res-${st.resource}` : toolId, target: pid, style: edgeStyle("muted", true) });
    }
  });
  // Lane backdrops behind each column
  const LANES: [keyof typeof COL, string, string][] = [
    ["source", "Input", "What entered the context"],
    ["agent", "Agent", "Who acted on it"],
    ["tool", "Action", "Tool and API calls"],
    ["resource", "Reached", "Data and destinations"],
    ["policy", "Decision", "What EXORCIST did"],
  ];
  const maxRows = Math.max(...Object.values(rows), 1);
  const lanes = LANES.map(([col, label, hint]) => ({
    id: `lane-${col}`,
    type: "lane" as const,
    position: { x: COL[col] * XS - 20, y: -64 },
    data: { label, hint, height: maxRows * YS + 80 },
    draggable: false,
    selectable: false,
    zIndex: -1,
  }));
  return { nodes, edges, infos, lanes };
}

function Inner({
  scenario,
  agentName,
  t0,
  hiddenKinds,
  maxStep,
  selectedId,
  onSelect,
}: {
  scenario: Scenario;
  agentName: (id: string) => string;
  t0: number;
  hiddenKinds: Set<SecNodeKind>;
  maxStep: number;
  selectedId: string | null;
  onSelect: (info: ProvNodeInfo | null) => void;
}) {
  const { fitView } = useReactFlow();
  const graph = useMemo(() => buildProvenance(scenario, agentName, t0), [scenario, agentName, t0]);
  const visible = useMemo(() => {
    const ok = new Set(graph.infos.filter((n) => !hiddenKinds.has(n.kind) && n.stepIndex <= maxStep).map((n) => n.id));
    return {
      nodes: [...graph.lanes, ...graph.nodes.filter((n) => ok.has(n.id)).map((n) => ({ ...n, selected: n.id === selectedId }))] as SecNode[],
      edges: graph.edges.filter((e) => ok.has(e.source) && ok.has(e.target)),
    };
  }, [graph, hiddenKinds, maxStep, selectedId]);

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 40);
    return () => clearTimeout(t);
  }, [scenario.id, fitView]);

  return (
    <ReactFlow
      nodes={visible.nodes}
      edges={visible.edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      minZoom={0.25}
      onNodeClick={(_, n) => (n.id.startsWith("lane-") ? null : onSelect(graph.infos.find((i) => i.id === n.id) ?? null))}
      onPaneClick={() => onSelect(null)}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
      <MiniMap pannable zoomable nodeColor={(n) => (n.type === "lane" ? "transparent" : "var(--border-strong)")} maskColor="rgb(7 8 10 / 0.6)" className="!hidden md:!block" />
      <Controls showInteractive={false} position="bottom-left" />
    </ReactFlow>
  );
}

export default function ProvenanceGraph(props: Parameters<typeof Inner>[0]) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
