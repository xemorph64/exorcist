import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "@/store/useStore";
import { Panel, PanelHeader, SimTag } from "@/components/ui/primitives";
import { Select } from "@/components/ui/radix";
import { PageHeader, Stat } from "@/components/domain";
import { axisProps, ChartTooltip, gridProps, riskTrend, SERIES } from "@/components/viz/charts";
import { rng } from "@/lib/utils";

const SEV_COLOR = { critical: SERIES.critical, high: SERIES.warning, medium: SERIES.info, low: SERIES.muted };

export default function Analytics() {
  const events = useStore((s) => s.events);
  const agents = useStore((s) => s.agents);
  const incidents = useStore((s) => s.incidents);
  const [range, setRange] = useState("6h");
  const now = events[0]?.ts ?? Date.now();
  const trend = useMemo(() => (range === "6h" ? riskTrend(events, now, 18, 20 * 60_000) : riskTrend(events, now, 24, 5 * 60_000)), [events, now, range]);
  const real = agents.filter((a) => !a.isCanary);

  const anomalies = useMemo(
    () =>
      real
        .map((a) => {
          const ev = events.filter((e) => e.agentId === a.id);
          return { name: a.name.split(" ")[0], Flagged: ev.filter((e) => e.decision !== "allow").length, Allowed: ev.filter((e) => e.decision === "allow").length };
        })
        .sort((a, b) => b.Flagged - a.Flagged),
    [events, real],
  );

  const tools = useMemo(() => {
    const m = new Map<string, number>();
    events.forEach((e) => m.set(e.action, (m.get(e.action) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tool, count]) => ({ tool, count }));
  }, [events]);

  const drift = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 14 }, (_, d) => ({
      day: `D-${13 - d}`,
      "Support Triage": +(0.04 + Math.max(0, d - 3) * 0.03 + r() * 0.02).toFixed(3),
      "Sales Research": +(0.05 + (d > 10 ? 0.12 : 0) + r() * 0.02).toFixed(3),
      "Procurement Agent": +(0.03 + r() * 0.025).toFixed(3),
      "Finance Reconciler": +(0.03 + (d > 11 ? 0.06 : 0) + r() * 0.02).toFixed(3),
    }));
  }, []);

  const bySev = (["critical", "high", "medium", "low"] as const).map((s) => ({ name: s, value: incidents.filter((i) => i.severity === s).length }));
  const closed = incidents.filter((i) => i.status === "resolved" || i.status === "false_positive");
  const fp = incidents.filter((i) => i.status === "false_positive").length;

  return (
    <div>
      <PageHeader
        title="Behavioral Analytics"
        description="Fleet-wide trends behind the alerts: where risk comes from, which tools dominate, and which agents are drifting."
        meta={<SimTag />}
        actions={<Select ariaLabel="Range" value={range} onValueChange={setRange} className="w-36" options={[{ value: "6h", label: "Last 6 hours" }, { value: "2h", label: "Last 2 hours" }]} />}
      />
      <Panel className="mb-4 grid grid-cols-2 md:grid-cols-4 [&>*]:border-border md:[&>*:not(:last-child)]:border-r">
        <Stat label="Events analyzed" value={events.length.toLocaleString()} sub="In current window" />
        <Stat label="Incidents closed" tone="healthy" value={`${closed.length}/${incidents.length}`} sub="Resolved or false positive" />
        <Stat label="False positive rate" value={`${((fp / Math.max(1, incidents.length)) * 100).toFixed(1)}%`} sub="Analyst-confirmed" />
        <Stat label="Agents drifting" tone="warning" value={real.filter((a) => a.risk - a.baselineRisk > 15).length} sub="More than 15 above baseline" />
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-8">
          <PanelHeader title="Risk score evolution" description="Mean and peak event risk" />
          <div className="h-[260px] px-2 pb-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="t" {...axisProps} interval={2} />
                <YAxis {...axisProps} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="peak" name="Peak" stroke={SERIES.critical} fill="var(--critical-soft)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="avg" name="Mean" stroke={SERIES.accent} fill="var(--accent-soft)" strokeWidth={1.75} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="xl:col-span-4">
          <PanelHeader title="Incidents by severity" />
          <div className="flex h-[260px] items-center gap-4 px-4">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie data={bySev} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="var(--surface)">
                  {bySev.map((s) => (
                    <Cell key={s.name} fill={SEV_COLOR[s.name]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-2 text-xs">
              {bySev.map((s) => (
                <li key={s.name} className="flex items-center gap-2 capitalize">
                  <span className="size-2 rounded-sm" style={{ background: SEV_COLOR[s.name] }} />
                  <span className="text-muted">{s.name}</span>
                  <span className="ml-3 font-mono tabular text-fg">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel className="xl:col-span-6">
          <PanelHeader title="Baseline deviations by agent" description="Flagged vs allowed actions" />
          <div className="h-[260px] px-2 pb-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={anomalies} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 10 }} />
                <YAxis {...axisProps} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--hover)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" iconSize={8} />
                <Bar dataKey="Allowed" stackId="a" fill={SERIES.muted} maxBarSize={28} />
                <Bar dataKey="Flagged" stackId="a" fill={SERIES.critical} radius={[2, 2, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="xl:col-span-6">
          <PanelHeader title="Tool-use frequency" description="Top 10 actions in window" />
          <div className="h-[260px] px-2 pb-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tools} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 40 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="tool" {...axisProps} width={110} tick={{ ...axisProps.tick, fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--hover)" }} />
                <Bar dataKey="count" name="Calls" fill={SERIES.accent} radius={[0, 2, 2, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="xl:col-span-12">
          <PanelHeader title="Drift, 14 days" description="Jensen-Shannon divergence vs frozen anchor baseline" />
          <div className="h-[260px] px-2 pb-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={drift} margin={{ top: 4, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis {...axisProps} domain={[0, 0.5]} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
                <Line dataKey="Support Triage" stroke={SERIES.critical} strokeWidth={1.75} dot={false} />
                <Line dataKey="Sales Research" stroke={SERIES.warning} strokeWidth={1.5} dot={false} />
                <Line dataKey="Finance Reconciler" stroke={SERIES.info} strokeWidth={1.5} dot={false} />
                <Line dataKey="Procurement Agent" stroke={SERIES.accent} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
