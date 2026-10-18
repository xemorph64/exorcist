import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bot, Database, FileText, Gavel, Globe, KeyRound, Radar, Wrench, Flag, MousePointerClick } from "lucide-react";
import { useStore } from "@/store/useStore";
import { scenarioById, SCENARIOS } from "@/data/scenarios";
import { Panel, PanelHeader, Badge, Mono, Empty, Skeleton, SimTag } from "@/components/ui/primitives";
import { Select, Slider } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/domain";
import type { ProvNodeInfo } from "@/components/viz/ProvenanceGraph";
import type { SecNodeKind } from "@/components/viz/flow";
import { cn, fmtDateTime } from "@/lib/utils";

const ProvenanceGraph = lazy(() => import("@/components/viz/ProvenanceGraph"));

const KINDS: { kind: SecNodeKind; label: string; icon: typeof Bot }[] = [
  { kind: "task", label: "Tasks", icon: Flag },
  { kind: "document", label: "Documents", icon: FileText },
  { kind: "agent", label: "Agents", icon: Bot },
  { kind: "tool", label: "Tools / API calls", icon: Wrench },
  { kind: "credential", label: "Credentials", icon: KeyRound },
  { kind: "resource", label: "Data resources", icon: Database },
  { kind: "destination", label: "Destinations", icon: Globe },
  { kind: "decoy", label: "Decoys", icon: Radar },
  { kind: "policy", label: "Policy decisions", icon: Gavel },
];

export default function ThreatGraph() {
  const incidents = useStore((s) => s.incidents);
  const agents = useStore((s) => s.agents);
  const [params, setParams] = useSearchParams();
  const withScenario = incidents.filter((i) => i.scenarioId !== "manual");
  const incidentId = params.get("incident") ?? withScenario[0]?.id ?? "";
  const scenarioParam = params.get("scenario");
  const incident = incidents.find((i) => i.id === incidentId);
  const scenario = scenarioById(scenarioParam ?? incident?.scenarioId ?? "") ?? SCENARIOS[0];
  const [hidden, setHidden] = useState<Set<SecNodeKind>>(new Set());
  const [maxStep, setMaxStep] = useState(scenario.steps.length);
  const [sel, setSel] = useState<ProvNodeInfo | null>(null);
  const agentName = useCallback((id: string) => agents.find((a) => a.id === id)?.name ?? id, [agents]);
  const t0 = incident ? incident.createdAt - scenario.steps.length * 22_000 : Date.now() - 5 * 60_000;
  const options = useMemo(
    () => [
      ...withScenario.map((i) => ({ value: `i:${i.id}`, label: `${i.id} / ${scenarioById(i.scenarioId)?.name}` })),
      ...SCENARIOS.filter((s) => !withScenario.some((i) => i.scenarioId === s.id)).map((s) => ({ value: `s:${s.id}`, label: `Scenario / ${s.name}` })),
    ],
    [withScenario],
  );
  const currentValue = scenarioParam ? `s:${scenarioParam}` : `i:${incidentId}`;

  const toggle = (k: SecNodeKind) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <div>
      <PageHeader
        title="Provenance Graph"
        description="Source-to-action lineage. Follow taint from the input that entered the agent's context to every tool call, resource and destination it reached."
        meta={<SimTag />}
        actions={
          <Select
            ariaLabel="Investigation"
            value={currentValue}
            onValueChange={(v) => {
              setSel(null);
              setMaxStep(99);
              setParams(v.startsWith("i:") ? { incident: v.slice(2) } : { scenario: v.slice(2) }, { replace: true });
            }}
            options={options}
            className="w-72"
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="overflow-hidden xl:col-span-9">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2.5">
            {KINDS.map(({ kind, label, icon: Icon }) => {
              const on = !hidden.has(kind);
              return (
                <button
                  key={kind}
                  onClick={() => toggle(kind)}
                  aria-pressed={on}
                  className={cn("flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors", on ? "border-border-strong bg-elevated text-fg" : "border-border text-subtle line-through")}
                >
                  <Icon className="size-3" /> {label}
                </button>
              );
            })}
          </div>
          <div className="h-[520px]">
            <Suspense fallback={<Skeleton className="m-4 h-[480px]" />}>
              <ProvenanceGraph scenario={scenario} agentName={agentName} t0={t0} hiddenKinds={hidden} maxStep={maxStep} selectedId={sel?.id ?? null} onSelect={setSel} />
            </Suspense>
          </div>
          <div className="flex items-center gap-4 border-t border-border px-4 py-3">
            <span className="shrink-0 text-xs text-muted">Time window</span>
            <Slider value={Math.min(maxStep, scenario.steps.length)} onValueChange={setMaxStep} min={0} max={scenario.steps.length} ariaLabel="Show graph up to step" />
            <Mono className="w-20 shrink-0 text-right text-muted">
              step {Math.min(maxStep, scenario.steps.length)}/{scenario.steps.length}
            </Mono>
          </div>
        </Panel>

        <div className="space-y-4 xl:col-span-3">
          <Panel>
            <PanelHeader title="Evidence inspector" />
            {sel ? (
              <div className="space-y-3 p-4 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="capitalize">{sel.kind}</Badge>
                  {sel.policy && <Badge tone="critical">Policy hit</Badge>}
                </div>
                <div className="break-words font-mono text-[13px] text-fg">{sel.label}</div>
                {sel.ts && <div className="font-mono text-subtle">{fmtDateTime(sel.ts)}</div>}
                <p className="leading-relaxed text-muted">{sel.detail}</p>
                {sel.policy && <div className="rounded-md border border-critical/30 bg-critical-soft p-2 font-mono text-critical">{sel.policy}</div>}
              </div>
            ) : (
              <Empty icon={<MousePointerClick />} title="Select a node" body="Pan, zoom and click any node to inspect it. Use the filters to isolate a node type." />
            )}
          </Panel>
          <Panel>
            <PanelHeader title="Lineage summary" />
            <div className="space-y-3 p-4 text-xs">
              <p className="leading-relaxed text-muted">{scenario.rootCause}</p>
              <div className="flex flex-wrap gap-1.5">
                {scenario.affectedResources.map((r) => (
                  <Badge key={r} tone="warning" className="font-mono">{r}</Badge>
                ))}
              </div>
              {incident && (
                <Link to={`/incidents/${incident.id}`}>
                  <Button size="sm" className="mt-1 w-full">Open {incident.id}</Button>
                </Link>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
