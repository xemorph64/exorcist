import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Ghost, GitBranch } from "lucide-react";
import { SCENARIOS, scenarioById } from "@/data/scenarios";
import type { ScenarioStep } from "@/data/types";
import { useStore } from "@/store/useStore";
import { Panel, PanelHeader, Badge, Mono, Skeleton, SimTag } from "@/components/ui/primitives";
import { Select } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { AgentLink, PageHeader, RiskGauge, SignalBreakdown } from "@/components/domain";
import { StepInspector } from "@/components/StepInspector";
import { axisProps, ChartTooltip, gridProps, SERIES } from "@/components/viz/charts";
import { divergenceIndex, observedSteps } from "@/lib/paths";
import { computeRisk, emptySignals, mergeSignals } from "@/lib/risk";
import { rng } from "@/lib/utils";

const RoleBoundaryGraph = lazy(() => import("@/components/viz/RoleBoundaryGraph"));

function driftSeries(seed: number, slow: boolean) {
  const r = rng(seed);
  let cusum = 0;
  return Array.from({ length: 14 }, (_, d) => {
    const base = 0.03 + r() * 0.03;
    const js = slow ? base + Math.max(0, d - 2) * 0.028 + r() * 0.02 : d === 13 ? 0.41 : base;
    cusum = Math.max(0, cusum + (js - 0.06) * 12);
    return { day: `D-${13 - d}`, js: +js.toFixed(3), cusum: +cusum.toFixed(2) };
  });
}

export default function Drift() {
  const [params, setParams] = useSearchParams();
  const scenarioId = params.get("scenario") ?? "scn-poisoned-pdf";
  const scenario = scenarioById(scenarioId) ?? SCENARIOS[0];
  const contracts = useStore((s) => s.contracts);
  const agents = useStore((s) => s.agents);
  const agent = agents.find((a) => a.id === scenario.targetAgentId)!;
  const [selected, setSelected] = useState<ScenarioStep | null>(null);

  const steps = observedSteps(scenario);
  const div = divergenceIndex(steps);
  const divStep = steps[div];
  const cumulative = useMemo(() => scenario.steps.reduce((acc, s) => mergeSignals(acc, s.signals), emptySignals()), [scenario]);
  const score = computeRisk(cumulative).score;
  const series = useMemo(() => driftSeries(scenario.id.length * 31, scenario.id === "scn-slow-drift"), [scenario.id]);

  return (
    <div>
      <PageHeader
        title="Identity Drift"
        description="Expected execution path for the role versus what the agent actually did. The first costly edit in the alignment marks where the agent turned."
        meta={<SimTag label="Replayed scenario" />}
        actions={
          <>
            <Select
              ariaLabel="Scenario"
              value={scenario.id}
              onValueChange={(v) => {
                setSelected(null);
                setParams({ scenario: v }, { replace: true });
              }}
              options={SCENARIOS.map((s) => ({ value: s.id, label: s.name }))}
              className="w-60"
            />
            <Link to={`/ghost-replay?scenario=${scenario.id}`}>
              <Button>
                <Ghost /> Ghost Replay
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="overflow-hidden xl:col-span-9">
          <PanelHeader
            title="Behavioral deviation graph"
            description={`${agent.name} / contract ${agent.contractId}`}
            icon={<GitBranch />}
            actions={
              divStep && !scenario.legitimate ? (
                <Badge tone="critical">
                  Divergence at step {div + 1}: <Mono>{divStep.tool}</Mono>
                </Badge>
              ) : (
                <Badge tone="healthy">No adversarial divergence</Badge>
              )
            }
          />
          <div className="px-2 pb-2">
            <Suspense fallback={<Skeleton className="m-4 h-[320px]" />}>
              <RoleBoundaryGraph scenario={scenario} includeResponse={false} selectedStepId={selected?.id} onSelect={setSelected} />
            </Suspense>
          </div>
          <div className="flex flex-wrap items-center gap-5 border-t border-border px-4 py-3 text-[11px] text-muted">
            <span className="flex items-center gap-2"><span className="h-3 w-6 rounded-full border border-border-strong bg-fg/5" /> Role lane: what the contract allows</span>
            <span className="flex items-center gap-2"><span className="h-px w-6 border-t border-dashed border-subtle" /> Path the role expects</span>
            <span className="flex items-center gap-2"><span className="h-0.5 w-6 rounded bg-critical" /> Path the agent took</span>
          </div>
        </Panel>

        <Panel className="xl:col-span-3">
          <PanelHeader title="Step inspector" />
          <StepInspector step={selected} contractId={agent.contractId} />
        </Panel>

        <Panel className="xl:col-span-6">
          <PanelHeader title="Drift timeline, 14 days" description="Jensen-Shannon divergence of tool histogram vs frozen anchor, with CUSUM" />
          <div className="h-[240px] px-2 pb-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="day" {...axisProps} interval={1} />
                <YAxis yAxisId="l" {...axisProps} domain={[0, 0.5]} />
                <YAxis yAxisId="r" orientation="right" {...axisProps} domain={[0, 8]} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine yAxisId="r" y={4} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: "CUSUM h=4", fill: "var(--warning)", fontSize: 10, position: "insideTopLeft" }} />
                <Area yAxisId="l" type="monotone" dataKey="js" name="JS divergence" stroke={SERIES.accent} fill="var(--accent-soft)" strokeWidth={1.75} />
                <Line yAxisId="r" type="stepAfter" dataKey="cusum" name="CUSUM" stroke={SERIES.critical} strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="xl:col-span-3">
          <PanelHeader title="Risk contributors" />
          <div className="flex justify-center pt-3">
            <RiskGauge score={score} size={150} />
          </div>
          <div className="p-4">
            <SignalBreakdown signals={cumulative} compact />
          </div>
        </Panel>

        <Panel className="xl:col-span-3">
          <PanelHeader title="Context" />
          <div className="space-y-4 p-4 text-xs">
            <div>
              <div className="mb-1.5 text-subtle">Agent</div>
              <AgentLink agentId={agent.id} showRole />
            </div>
            <div>
              <div className="mb-1 text-subtle">Scenario</div>
              <p className="leading-relaxed text-fg">{scenario.description}</p>
            </div>
            <div>
              <div className="mb-1 text-subtle">Contract checked</div>
              <Mono>{contracts.find((c) => c.id === agent.contractId)?.id} v{contracts.find((c) => c.id === agent.contractId)?.version}</Mono>
            </div>
            <Link to={`/lab`} className="block">
              <Button size="sm" className="w-full">Run this live in the Lab</Button>
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
