import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Cell } from "recharts";
import { ArrowRight, Ban, Bot, Clock3, FlaskConical, ShieldAlert, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Panel, PanelHeader, Badge, Skeleton, SimTag, toneVar } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import {
  AgentStatusBadge,
  FrameworkTag,
  IncidentStatusBadge,
  RiskPill,
  SeverityBadge,
  Stat,
  AnimatedNumber,
  RiskGauge,
  riskTone,
} from "@/components/domain";
import { EventRow } from "@/components/EventRow";
import { axisProps, ChartTooltip, gridProps, riskTrend, SERIES } from "@/components/viz/charts";
import { fmtAgo } from "@/lib/utils";
import { scenarioById } from "@/data/scenarios";

const AgentNetwork3D = lazy(() => import("@/components/viz/AgentNetwork3D"));

export default function Dashboard() {
  const agents = useStore((s) => s.agents);
  const events = useStore((s) => s.events);
  const incidents = useStore((s) => s.incidents);
  const lab = useStore((s) => s.lab);
  const nav = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const now = events[0]?.ts ?? Date.now();

  const real = agents.filter((a) => !a.isCanary);
  const protectedCount = real.filter((a) => a.status === "protected" || a.status === "learning").length;
  const avgRisk = Math.round(real.reduce((s, a) => s + a.risk, 0) / real.length);
  const open = incidents.filter((i) => i.status === "open" || i.status === "investigating");
  const blocked24 = events.filter((e) => (e.decision === "block" || e.decision === "quarantine") && now - e.ts < 24 * 3600_000).length;
  const trend = useMemo(() => riskTrend(events, now), [events, now]);
  const critical = incidents
    .filter((i) => i.status !== "resolved" && i.status !== "false_positive")
    .sort((a, b) => (a.severity === "critical" ? -1 : 0) - (b.severity === "critical" ? -1 : 0) || b.createdAt - a.createdAt)
    .slice(0, 5);
  const sel = agents.find((a) => a.id === selected);

  // While the lab runs, highlight the edge the scenario travels on
  const activeEdges = useMemo<[string, string][]>(() => {
    if (lab.stepIndex < 0 || lab.completed) return [];
    const scn = scenarioById(lab.scenarioId);
    if (!scn || scn.legitimate) return [];
    const e: [string, string][] = [["agt-orch-00", lab.targetAgentId]];
    if (scn.id === "scn-propagation" && lab.stepIndex >= 2) e.push([lab.targetAgentId, "agt-orch-00"], ["agt-orch-00", "agt-canary-99"]);
    return e;
  }, [lab]);

  const byRisk = [...real].sort((a, b) => b.risk - a.risk);

  return (
    <div>
      <section className="mb-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="eyebrow">Command Center</span>
            <SimTag />
          </div>
          <h1 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-fg md:text-[42px]">
            <AnimatedNumber value={protectedCount} /> of {real.length} agents are <span className="text-muted">in character.</span>
          </h1>
          <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-muted">
            {real.length - protectedCount > 0
              ? `${real.length - protectedCount} agents have stepped outside their role and are held, restricted or quarantined. Legitimate work on the rest continues.`
              : "Every agent is acting within its role contract."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/lab">
              <Button variant="primary" size="lg">
                <FlaskConical /> Possession Lab
              </Button>
            </Link>
            <Link to="/incidents">
              <Button size="lg">Review incidents</Button>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6 lg:pr-4">
          <RiskGauge score={avgRisk} size={176} label="Fleet mean risk" />
          <div className="hidden space-y-1 text-xs sm:block">
            <div className="eyebrow">Fleet risk</div>
            <p className="max-w-[22ch] leading-relaxed text-muted">Mean of agent scores. Explainable heuristic, not a probability.</p>
          </div>
        </div>
      </section>

      <Panel className="grid grid-cols-2 sm:grid-cols-4 [&>*]:border-border max-sm:[&>*:nth-child(-n+2)]:border-b sm:[&>*:not(:last-child)]:border-r">
        <Stat label="Open incidents" icon={<ShieldAlert />} tone={open.length ? "critical" : "healthy"} value={<AnimatedNumber value={open.length} />} sub={`${incidents.filter((i) => i.severity === "critical" && i.status === "open").length} critical awaiting triage`} />
        <Stat label="Actions blocked, 24h" icon={<Ban />} value={<AnimatedNumber value={blocked24} />} sub="Gateway and policy engine" />
        <Stat label="Median time to contain" icon={<Clock3 />} value="11.4s" sub="Detection to scope revocation" />
        <Stat label="Tool calls, 24h" icon={<Bot />} value={real.reduce((a, b) => a + b.toolCalls24h, 0).toLocaleString()} sub="Across the registered fleet" />
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="relative overflow-hidden xl:col-span-8">
          <PanelHeader
            title="Agent network"
            description="Delegation topology. Drag to orbit, click an agent to focus."
            actions={
              <div className="hidden items-center gap-3 text-[11px] text-muted sm:flex">
                {[
                  ["In character", "var(--fg)"],
                  ["Held / restricted", "var(--warning)"],
                  ["Quarantined", "var(--critical)"],
                  ["Decoy", "var(--accent)"],
                ].map(([l, c]) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full border-[1.5px]" style={{ borderColor: c }} />
                    {l}
                  </span>
                ))}
              </div>
            }
          />
          <div className="relative h-[460px] bg-[radial-gradient(50%_60%_at_50%_45%,rgb(237_235_230/0.035),transparent)]">
            <Suspense fallback={<Skeleton className="absolute inset-4" />}>
              <AgentNetwork3D agents={agents} selectedId={selected} onSelect={setSelected} activeEdges={activeEdges} />
            </Suspense>
            {sel && (
              <div className="ticker-in absolute bottom-3 left-3 w-[min(320px,calc(100%-24px))] rounded-lg border border-border bg-surface/95 p-3 shadow-panel backdrop-blur">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{sel.name}</div>
                    <div className="truncate text-xs text-muted">{sel.role}</div>
                  </div>
                  <button onClick={() => setSelected(null)} className="rounded p-1 text-subtle hover:bg-hover hover:text-fg" aria-label="Clear selection">
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <AgentStatusBadge status={sel.status} />
                  <FrameworkTag framework={sel.framework} />
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-subtle">Risk</div>
                    <RiskPill score={sel.risk} />
                  </div>
                  <div>
                    <div className="text-subtle">Calls 24h</div>
                    <div className="font-mono tabular">{sel.toolCalls24h.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-subtle">Delegates</div>
                    <div className="font-mono tabular">{sel.delegatesTo.length}</div>
                  </div>
                </div>
                <Button size="sm" className="mt-3 w-full" onClick={() => nav(`/agents/${sel.id}`)}>
                  Open agent <ArrowRight />
                </Button>
              </div>
            )}
            {lab.stepIndex >= 0 && !lab.completed && (
              <Link to="/lab" className="absolute right-3 top-3">
                <Badge tone="critical" className="h-6 px-2">
                  <span className="live-pulse size-1.5 rounded-full bg-critical" /> Lab simulation running
                </Badge>
              </Link>
            )}
          </div>
        </Panel>

        <Panel className="flex flex-col xl:col-span-4">
          <PanelHeader
            title="Incidents needing attention"
            actions={
              <Link to="/incidents" className="text-xs text-muted hover:text-fg">
                View all
              </Link>
            }
          />
          <ul className="flex-1 divide-y divide-border">
            {critical.map((i) => (
              <li key={i.id}>
                <Link to={`/incidents/${i.id}`} className="block px-4 py-3 transition-colors hover:bg-hover/50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-subtle">{i.id}</span>
                    <SeverityBadge severity={i.severity} />
                    {i.simulated && <Badge tone="accent">Lab</Badge>}
                    <span className="ml-auto text-[11px] text-subtle">{fmtAgo(i.createdAt, now)}</span>
                  </div>
                  <div className="mt-1.5 line-clamp-1 text-[13px] text-fg">{i.title}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <IncidentStatusBadge status={i.status} />
                    <span className="truncate text-[11px] text-muted">{agents.find((a) => a.id === i.agentIds[0])?.name}</span>
                    <RiskPill score={i.risk} className="ml-auto" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="xl:col-span-8">
          <PanelHeader title="Fleet risk, last 6 hours" description="Mean and peak event risk per 20-minute window" actions={<Badge tone="neutral">Updates live</Badge>} />
          <div className="h-[240px] px-2 pb-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 12, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="gPeak" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--critical)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--critical)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="t" {...axisProps} interval={2} />
                <YAxis {...axisProps} domain={[0, 100]} ticks={[0, 40, 60, 80, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="peak" name="Peak" stroke={SERIES.critical} strokeWidth={1.5} fill="url(#gPeak)" />
                <Area type="monotone" dataKey="avg" name="Mean" stroke={SERIES.accent} strokeWidth={1.75} fill="url(#gAvg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="flex max-h-[300px] flex-col xl:col-span-4 xl:max-h-none">
          <PanelHeader
            title="Event ticker"
            actions={
              <Link to="/activity" className="text-xs text-muted hover:text-fg">
                Open stream
              </Link>
            }
          />
          <div className="relative flex-1 overflow-hidden">
            <div className="absolute inset-0 divide-y divide-border overflow-y-auto">
              {events.slice(0, 14).map((e) => (
                <EventRow key={e.id} e={e} dense />
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="xl:col-span-12">
          <PanelHeader title="Agents by current risk" description="Click a bar to open the agent" />
          <div className="h-[200px] px-2 pb-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byRisk.map((a) => ({ name: a.name, risk: a.risk, id: a.id }))} margin={{ top: 4, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 10 }} />
                <YAxis {...axisProps} domain={[0, 100]} ticks={[0, 40, 60, 80, 100]} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--hover)" }} />
                <Bar dataKey="risk" name="Risk" radius={[3, 3, 0, 0]} maxBarSize={36} onClick={(d) => nav(`/agents/${(d as unknown as { id: string }).id}`)} className="cursor-pointer">
                  {byRisk.map((a) => (
                    <Cell key={a.id} fill={toneVar[riskTone(a.risk)]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
