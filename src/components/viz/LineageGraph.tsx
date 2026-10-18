import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider, type Edge } from "@xyflow/react";
import { edgeStyle, nodeTypes, type SecNode } from "./flow";

/** Infection lineage for INC-1040: patient zero, blast radius, attenuated agents. */
export default function LineageGraph({ names, onSelect }: { names: Record<string, string>; onSelect?: (id: string | null) => void }) {
  const nodes: SecNode[] = [
    { id: "web", type: "sec", position: { x: 0, y: 120 }, data: { label: "haldenlogistics.example", sub: "T-WEB-07 / external", kind: "document", tone: "warning", badge: "Source" } },
    { id: "agt-sales-05", type: "sec", position: { x: 240, y: 120 }, data: { label: names["agt-sales-05"], sub: "patient zero", kind: "agent", tone: "critical", badge: "Patient zero" } },
    { id: "agt-orch-00", type: "sec", position: { x: 480, y: 120 }, data: { label: names["agt-orch-00"], sub: "hop 1 / attenuated", kind: "agent", tone: "warning" } },
    { id: "agt-canary-99", type: "sec", position: { x: 720, y: 20 }, data: { label: names["agt-canary-99"], sub: "canary agent", kind: "decoy", tone: "accent", badge: "Triggered" } },
    { id: "agt-procure-01", type: "sec", position: { x: 720, y: 130 }, data: { label: names["agt-procure-01"], sub: "hop 2 / not reached", kind: "agent", tone: "neutral", dim: true } },
    { id: "agt-hr-03", type: "sec", position: { x: 720, y: 230 }, data: { label: names["agt-hr-03"], sub: "hop 2 / not reached", kind: "agent", tone: "neutral", dim: true } },
  ];
  const edges: Edge[] = [
    { id: "a", source: "web", target: "agt-sales-05", style: edgeStyle("warning", true), label: "in_context", labelStyle: { fill: "var(--subtle)", fontSize: 10 }, labelBgStyle: { fill: "var(--surface)" } },
    { id: "b", source: "agt-sales-05", target: "agt-orch-00", animated: true, style: edgeStyle("critical"), label: "tainted message", labelStyle: { fill: "var(--critical)", fontSize: 10 }, labelBgStyle: { fill: "var(--surface)" } },
    { id: "c", source: "agt-orch-00", target: "agt-canary-99", animated: true, style: edgeStyle("critical"), label: "blocked", labelStyle: { fill: "var(--critical)", fontSize: 10 }, labelBgStyle: { fill: "var(--surface)" } },
    { id: "d", source: "agt-orch-00", target: "agt-procure-01", style: edgeStyle("muted", true) },
    { id: "e", source: "agt-orch-00", target: "agt-hr-03", style: edgeStyle("muted", true) },
  ];
  return (
    <ReactFlowProvider>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.15 }} nodesConnectable={false} proOptions={{ hideAttribution: true }} onNodeClick={(_, n) => onSelect?.(n.id)} onPaneClick={() => onSelect?.(null)}>
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
