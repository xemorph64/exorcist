import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Line, LineChart, ResponsiveContainer, YAxis, ReferenceLine } from "recharts";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileWarning,
  FlaskConical,
  Ghost,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  SkipForward,
  FileDown,
  Target,
} from "lucide-react";
import { SCENARIOS, scenarioById } from "@/data/scenarios";
import type { ScenarioStep } from "@/data/types";
import { useStore } from "@/store/useStore";
import { Panel, PanelHeader, Badge, Label, Textarea, Mono, Skeleton, Empty, toneBg } from "@/components/ui/primitives";
import { Select } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { DecisionBadge, PageHeader, RiskGauge, SignalBreakdown, AgentLink } from "@/components/domain";
import { StepInspector } from "@/components/StepInspector";
import { BAND_META, bandFor, computeRisk } from "@/lib/risk";
import { stepTone } from "@/lib/paths";
import { cn } from "@/lib/utils";

const RoleBoundaryGraph = lazy(() => import("@/components/viz/RoleBoundaryGraph"));

const PHASES = ["normal", "suspicious", "deviation", "detection", "containment", "resume"] as const;
const PHASE_LABEL: Record<(typeof PHASES)[number], string> = {
  normal: "Normal",
  suspicious: "Suspicious",
  deviation: "Deviation",
  detection: "Detection",
  containment: "Contain",
  resume: "Resume",
};

export default function Lab() {
  const lab = useStore((s) => s.lab);
  const agents = useStore((s) => s.agents);
  const scoreboard = useStore((s) => s.scoreboard);
  const { labSelect, labSetPayload, labSetTarget, labStart, labPause, labStep, labReset } = useStore.getState();
  const nav = useNavigate();
  const scenario = scenarioById(lab.scenarioId)!;
  const [inspect, setInspect] = useState<ScenarioStep | null>(null);
  const score = computeRisk(lab.signals).score;
  const current = lab.stepIndex >= 0 ? scenario.steps[lab.stepIndex] : null;
  const done = lab.completed;
  const prevIncident = useRef<string | null>(lab.incidentId);

  // Autoplay
  useEffect(() => {
    if (!lab.running) return;
    const id = setInterval(() => useStore.getState().labStep(), 1700);
    return () => clearInterval(id);
  }, [lab.running]);

  useEffect(() => {
    if (lab.incidentId && prevIncident.current !== lab.incidentId) {
      toast.error(`${lab.incidentId} created`, { description: scenario.incidentTitle + " (simulated)", action: { label: "Open", onClick: () => nav(`/incidents/${lab.incidentId}`) } });
    }
    prevIncident.current = lab.incidentId;
  }, [lab.incidentId, scenario.incidentTitle, nav]);

  useEffect(() => {
    if (done && scenario.legitimate) toast.success("Legitimate change recognized", { description: "No incident created. Baseline updated under CHG-311." });
  }, [done, scenario.legitimate]);

  const revealed = scenario.steps.slice(0, lab.stepIndex + 1);
  const violations = revealed.filter((s) => s.policy);
  const decisions = revealed.filter((s) => s.decision !== "allow" || s.kind === "containment" || s.kind === "resume");
  const resources = [...new Set(revealed.map((s) => s.resource).filter(Boolean))] as string[];
  const phaseReached = new Set(revealed.map((s) => s.kind));
  const history = useMemo(() => [{ step: -1, score: 0 }, ...lab.history], [lab.history]);
  const started = lab.stepIndex >= 0;

  return (
    <div>
      <PageHeader
        title="Possession Lab"
        description="Run attacks against Acme Corp's agents and watch EXORCIST detect, explain and contain them. Results flow into the dashboard, incidents and graphs."
        meta={
          <Badge tone="accent" className="h-6 px-2">
            <FlaskConical /> Simulation: no real systems are touched
          </Badge>
        }
        actions={
          <div className="hidden items-center gap-4 rounded-md border border-border bg-surface px-3 py-1.5 text-xs md:flex">
            <span className="text-muted">Runs <Mono className="text-fg">{scoreboard.runs}</Mono></span>
            <span className="text-muted">Detected <Mono className="text-critical">{scoreboard.detected}</Mono></span>
            <span className="text-muted">Legit passed <Mono className="text-healthy">{scoreboard.legitPassed}</Mono></span>
            <span className="text-muted">False alarms <Mono className="text-fg">{scoreboard.falseAlarms}</Mono></span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* LEFT: configuration */}
        <div className="space-y-4 xl:col-span-3">
          <Panel>
            <PanelHeader title="Scenario" description="7 attack and control scenarios" />
            <ul className="p-1.5">
              {SCENARIOS.map((s) => {
                const active = s.id === lab.scenarioId;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        setInspect(null);
                        labSelect(s.id);
                      }}
                      disabled={lab.running}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed",
                        active ? "bg-elevated" : "hover:bg-hover/60",
                      )}
                      aria-pressed={active}
                    >
                      <span className={cn("mt-1 size-2 shrink-0 rounded-full", s.legitimate ? "bg-healthy" : active ? "bg-critical" : "bg-border-strong")} aria-hidden />
                      <span className="min-w-0">
                        <span className={cn("block text-[13px]", active ? "text-fg" : "text-muted")}>{s.name}</span>
                        <span className="block text-[11px] text-subtle">{s.short}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Target and payload" icon={<Target />} />
            <div className="space-y-4 p-4">
              <div>
                <Label>Target agent</Label>
                <Select
                  ariaLabel="Target agent"
                  value={lab.targetAgentId}
                  onValueChange={labSetTarget}
                  options={agents.filter((a) => !a.isCanary).map((a) => ({ value: a.id, label: `${a.name} (${a.role})` }))}
                  className="w-full"
                />
                {lab.targetAgentId !== scenario.targetAgentId && <p className="mt-1.5 text-[11px] text-warning">Scenario was authored for {agents.find((a) => a.id === scenario.targetAgentId)?.name}; step labels keep that context.</p>}
              </div>
              <div>
                <Label htmlFor="payload">{scenario.payloadLabel}</Label>
                <Textarea id="payload" rows={5} value={lab.payload} onChange={(e) => labSetPayload(e.target.value)} disabled={started && !done} className="font-mono text-[12px] leading-relaxed" />
                <p className="mt-1.5 text-[11px] text-subtle">Captured verbatim as incident evidence. The simulator does not execute it.</p>
              </div>
            </div>
          </Panel>
        </div>

        {/* CENTER: execution graph */}
        <div className="space-y-4 xl:col-span-6">
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
              {lab.running ? (
                <Button variant="secondary" onClick={labPause}>
                  <Pause /> Pause
                </Button>
              ) : (
                <Button variant="primary" onClick={labStart}>
                  <Play /> {done ? "Run again" : started ? "Resume" : "Start"}
                </Button>
              )}
              <Button onClick={labStep} disabled={lab.running || done}>
                <SkipForward /> Next step
              </Button>
              <Button variant="ghost" onClick={() => { setInspect(null); labReset(); }} disabled={!started}>
                <RotateCcw /> Reset
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => nav(`/drift?scenario=${scenario.id}`)} disabled={!started}>
                  <Search /> Investigate
                </Button>
                <Button size="sm" onClick={() => lab.incidentId && nav(`/incidents/${lab.incidentId}`)} disabled={!lab.incidentId}>
                  <ShieldAlert /> View incident
                </Button>
              </div>
            </div>

            {/* phase strip */}
            <ol className="grid grid-cols-3 gap-px border-b border-border bg-border sm:grid-cols-6">
              {PHASES.map((p) => {
                const reached = phaseReached.has(p);
                const active = current?.kind === p;
                const exists = scenario.steps.some((s) => s.kind === p);
                const tone = stepTone({ kind: p } as ScenarioStep, scenario.legitimate);
                return (
                  <li key={p} className={cn("flex items-center gap-2 bg-surface px-3 py-2 text-[11px]", !exists && "opacity-40")}>
                    <span className={cn("size-1.5 rounded-full transition-colors", reached ? toneBg[tone] : "bg-border-strong", active && "live-pulse")} />
                    <span className={reached ? "text-fg" : "text-subtle"}>{PHASE_LABEL[p]}</span>
                  </li>
                );
              })}
            </ol>

            <div className="relative h-[520px]">
              {started ? (
                <Suspense fallback={<Skeleton className="m-4 h-[400px]" />}>
                  <div className="flex h-full justify-center overflow-y-auto px-2 py-2"><div className="w-full max-w-[520px]"><RoleBoundaryGraph vertical scenario={scenario} revealed={lab.stepIndex} includeResponse selectedStepId={inspect?.id} onSelect={setInspect} /></div></div>
                </Suspense>
              ) : (
                <div className="canvas-grid grid h-full place-items-center">
                  <Empty
                    icon={<FlaskConical />}
                    title={scenario.name}
                    body={scenario.description}
                    action={
                      <Button variant="primary" onClick={labStart}>
                        <Play /> Start simulation
                      </Button>
                    }
                  />
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={current.id + lab.scenarioId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3"
                >
                  <span className="font-mono text-[11px] text-subtle">
                    Step {lab.stepIndex + 1}/{scenario.steps.length}
                  </span>
                  <span className="text-[13px] font-medium">{current.title}</span>
                  <Mono className="text-muted">{current.tool}</Mono>
                  <span className="ml-auto">
                    <DecisionBadge decision={current.decision} />
                  </span>
                  <p className="w-full text-xs leading-relaxed text-muted">{current.evidence}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>

          {done && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Panel className={cn("p-4", scenario.legitimate ? "border-healthy/40" : "border-accent/40")}>
                {scenario.legitimate ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <CheckCircle2 className="size-5 text-healthy" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">No critical alert. Change explained by CHG-311.</div>
                      <p className="text-xs text-muted">Peak score {Math.max(...lab.history.map((h) => h.score))} stayed in the Observe band. Ghost Replay classified the action as task-driven.</p>
                    </div>
                    <Link to="/changes"><Button size="sm">Change Registry</Button></Link>
                    <Link to="/ghost-replay?scenario=scn-legit-change"><Button size="sm"><Ghost /> Replay</Button></Link>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <FileWarning className="size-5 text-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{lab.incidentId} contained. Legitimate work continued.</div>
                      <p className="text-xs text-muted">{scenario.replay.verdict}.</p>
                    </div>
                    <Link to={`/ghost-replay?incident=${lab.incidentId}`}><Button size="sm"><Ghost /> Ghost Replay</Button></Link>
                    <Link to={`/reports?incident=${lab.incidentId}`}><Button size="sm"><FileDown /> Report</Button></Link>
                  </div>
                )}
              </Panel>
            </motion.div>
          )}

          <Panel>
            <PanelHeader title="Step inspector" description="Click a node in the graph" />
            <StepInspector step={inspect} contractId={agents.find((a) => a.id === lab.targetAgentId)?.contractId} />
          </Panel>
        </div>

        {/* RIGHT: live telemetry */}
        <div className="space-y-4 xl:col-span-3">
          <Panel>
            <PanelHeader title="Live risk" actions={<Badge tone={BAND_META[bandFor(score)].tone}>{BAND_META[bandFor(score)].label}</Badge>} />
            <div className="flex justify-center pt-4">
              <RiskGauge score={score} />
            </div>
            <div className="h-16 px-3 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <YAxis hide domain={[0, 100]} />
                  <ReferenceLine y={80} stroke="var(--critical)" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={40} stroke="var(--info)" strokeDasharray="3 3" strokeOpacity={0.4} />
                  <Line type="stepAfter" dataKey="score" stroke="var(--accent)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="border-t border-border p-4">
              <SignalBreakdown signals={lab.signals} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Policy violations" description={`${violations.length} so far`} />
            <ul className="divide-y divide-border">
              {violations.map((v) => (
                <li key={v.id} className="ticker-in px-4 py-2.5 text-xs">
                  <div className="font-mono text-critical">{v.policy}</div>
                  <div className="mt-0.5 text-muted">{v.tool} on {v.target}</div>
                </li>
              ))}
              {!violations.length && <li className="px-4 py-4 text-xs text-muted">None yet.</li>}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Security decisions" />
            <ul className="divide-y divide-border">
              {decisions.map((d) => (
                <li key={d.id} className="ticker-in flex items-center gap-2 px-4 py-2 text-xs">
                  <DecisionBadge decision={d.decision} />
                  <span className="truncate text-muted">{d.title}</span>
                </li>
              ))}
              {!decisions.length && <li className="px-4 py-4 text-xs text-muted">All actions allowed so far.</li>}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Affected resources" />
            <div className="space-y-3 p-4 text-xs">
              <AgentLink agentId={lab.targetAgentId} showRole />
              <div className="flex flex-wrap gap-1.5">
                {resources.map((r) => (
                  <Badge key={r} tone="warning" className="font-mono">{r}</Badge>
                ))}
                {!resources.length && <span className="text-muted">No sensitive resources touched.</span>}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
