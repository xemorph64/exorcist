import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ArrowLeft, FlaskConical, KeyRound, ShieldBan, ShieldCheck, Unlock, Repeat } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";
import { Panel, PanelHeader, Badge, Empty, Mono } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger, Dropdown } from "@/components/ui/radix";
import {
  AgentLink,
  AgentMark,
  AgentStatusBadge,
  FrameworkTag,
  IncidentStatusBadge,
  PageHeader,
  RiskGauge,
  SeverityBadge,
  SignalBreakdown,
} from "@/components/domain";
import { EventRow } from "@/components/EventRow";
import { axisProps, ChartTooltip, gridProps, SERIES } from "@/components/viz/charts";
import { fmtAgo, fmtDateTime } from "@/lib/utils";
import { emptySignals, mergeSignals } from "@/lib/risk";
import { NotFound } from "./NotFound";

export default function AgentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const agent = useStore((s) => s.agents.find((a) => a.id === id));
  const agents = useStore((s) => s.agents);
  const contracts = useStore((s) => s.contracts);
  const allEvents = useStore((s) => s.events);
  const sessions = useStore((s) => s.sessions);
  const incidents = useStore((s) => s.incidents);
  const receipts = useStore((s) => s.receipts);
  const setStatus = useStore((s) => s.setAgentStatus);
  const labSelect = useStore((s) => s.labSelect);
  const labTarget = useStore((s) => s.labSetTarget);

  const events = useMemo(() => allEvents.filter((e) => e.agentId === id), [allEvents, id]);
  const agentIncidents = incidents.filter((i) => i.agentIds.includes(id ?? ""));
  const signals = useMemo(
    () => agentIncidents.filter((i) => i.status !== "resolved" && i.status !== "false_positive").reduce((acc, i) => mergeSignals(acc, i.signals), emptySignals()),
    [agentIncidents],
  );

  if (!agent) return <NotFound />;
  const contract = contracts.find((c) => c.id === agent.contractId);
  const delegatedBy = agents.filter((a) => a.delegatesTo.includes(agent.id));
  const agentSessions = sessions.filter((s) => s.agentId === agent.id);
  const lastSession = agentSessions[agentSessions.length - 1];

  // Observed tool distribution in recent events vs learned baseline
  const observed = new Map<string, number>();
  events.forEach((e) => observed.set(e.action, (observed.get(e.action) ?? 0) + 1));
  const totalObs = [...observed.values()].reduce((a, b) => a + b, 0) || 1;
  const toolSet = new Set([...agent.baselineTools.map((t) => t.tool), ...[...observed.keys()].slice(0, 8)]);
  const dist = [...toolSet].map((tool) => ({
    tool,
    Baseline: Math.round((agent.baselineTools.find((t) => t.tool === tool)?.share ?? 0) * 100),
    Observed: Math.round(((observed.get(tool) ?? 0) / totalObs) * 100),
  }));

  const contain = (status: "restricted" | "quarantined" | "held" | "protected") => {
    setStatus(agent.id, status);
    toast.success(status === "protected" ? `${agent.name} released to normal operation` : `${agent.name} set to ${status}`, { description: "Simulated containment action. No real system was changed." });
  };

  return (
    <div>
      <Link to="/agents" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Agent Fleet
      </Link>
      <PageHeader
        title={agent.name}
        description={agent.description}
        meta={
          <>
            <AgentStatusBadge status={agent.status} />
            {agent.isCanary && <Badge tone="accent">Decoy agent</Badge>}
          </>
        }
        actions={
          <>
            {!agent.isCanary && (
              <Button
                onClick={() => {
                  labSelect(agent.id === "agt-procure-01" ? "scn-poisoned-pdf" : agent.id === "agt-finance-02" ? "scn-stolen-token" : agent.id === "agt-legal-07" ? "scn-mcp-tool" : agent.id === "agt-support-04" ? "scn-slow-drift" : "scn-propagation");
                  if (!["agt-procure-01", "agt-finance-02", "agt-legal-07", "agt-support-04"].includes(agent.id)) labTarget(agent.id);
                  nav("/lab");
                }}
              >
                <FlaskConical /> Simulate attack
              </Button>
            )}
            <Dropdown
              trigger={
                <Button variant={agent.status === "protected" ? "secondary" : "warning"}>
                  <ShieldBan /> Containment
                </Button>
              }
              items={[
                { label: "Hold next sensitive action", icon: <ShieldBan />, onSelect: () => contain("held") },
                { label: "Restrict to read-only", icon: <ShieldBan />, onSelect: () => contain("restricted") },
                { label: "Quarantine agent", icon: <ShieldBan />, onSelect: () => contain("quarantined"), tone: "critical" },
                { label: "Release", icon: <Unlock />, onSelect: () => contain("protected") },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-4">
          <Panel>
            <PanelHeader title="Identity" />
            <div className="flex items-center gap-3 px-4 pt-4">
              <AgentMark agentId={agent.id} size="lg" />
              <div className="min-w-0">
                <div className="truncate font-medium">{agent.role}</div>
                <Mono className="text-subtle">{agent.id}</Mono>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-xs">
              {[
                ["Framework", <FrameworkTag framework={agent.framework} />],
                ["Model", <Mono>{agent.model}</Mono>],
                ["Owner", agent.owner],
                ["Team", agent.team],
                ["Registered", `${agent.createdDaysAgo} days ago`],
                ["Sessions, 30d", <Mono>{agent.sessions30d.toLocaleString()}</Mono>],
              ].map(([k, v], i) => (
                <div key={i} className="min-w-0">
                  <dt className="text-subtle">{k}</dt>
                  <dd className="mt-0.5 truncate text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title="Current risk" description="Explainable demonstration score" />
            <div className="flex justify-center pt-4">
              <RiskGauge score={agent.risk} />
            </div>
            <div className="p-4">
              <SignalBreakdown signals={signals} compact />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Delegation" icon={<Repeat />} />
            <div className="space-y-3 p-4 text-xs">
              <div>
                <div className="mb-1.5 text-subtle">Receives work from</div>
                <div className="flex flex-col gap-2">{delegatedBy.length ? delegatedBy.map((a) => <AgentLink key={a.id} agentId={a.id} />) : <span className="text-muted">Direct user requests only</span>}</div>
              </div>
              <div>
                <div className="mb-1.5 text-subtle">Delegates to</div>
                <div className="flex flex-col gap-2">{agent.delegatesTo.length ? agent.delegatesTo.map((a) => <AgentLink key={a} agentId={a} />) : <span className="text-muted">No delegation permitted (depth {contract?.maxDelegationDepth ?? 0})</span>}</div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-8">
          <Tabs defaultValue="contract">
            <Panel>
              <TabsList className="px-2">
                <TabsTrigger value="contract">Role contract</TabsTrigger>
                <TabsTrigger value="baseline">Behavior baseline</TabsTrigger>
                <TabsTrigger value="trace">Execution trace</TabsTrigger>
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
                <TabsTrigger value="incidents">Incidents {agentIncidents.length > 0 && <span className="font-mono text-[11px] text-subtle">{agentIncidents.length}</span>}</TabsTrigger>
              </TabsList>

              <TabsContent value="contract" className="p-4">
                {contract ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Mono className="text-fg">{contract.id}</Mono>
                      <Badge tone={contract.status === "active" ? "healthy" : "warning"}>v{contract.version} {contract.status.replace("_", " ")}</Badge>
                      <span className="text-xs text-muted">Updated {contract.updatedHoursAgo}h ago</span>
                      <Link to={`/contracts?id=${contract.id}`} className="ml-auto text-xs text-accent hover:underline">
                        Open in editor
                      </Link>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <ContractList title="Allowed tools" items={contract.allowedTools} tone="healthy" />
                      <ContractList title="Allowed domains" items={contract.allowedDomains} tone="healthy" />
                      <ContractList title="Data classes" items={contract.dataClasses} tone="info" />
                      <ContractList title="Prohibited" items={contract.prohibited} tone="critical" />
                    </div>
                    <p className="text-xs text-muted">
                      Step-up approval above risk <Mono className="text-fg">{contract.stepUpOver}</Mono>. Approvers: {contract.approvers.join(", ")}.
                    </p>
                  </div>
                ) : (
                  <Empty title="No contract bound" body="Bind a role contract before this agent leaves learning mode." />
                )}
              </TabsContent>

              <TabsContent value="baseline" className="p-4">
                <p className="mb-3 text-xs text-muted">Share of tool calls: learned baseline vs the recent observation window ({events.length} events).</p>
                <div className="h-[280px]">
                  {dist.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dist} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                        <CartesianGrid {...gridProps} />
                        <XAxis dataKey="tool" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 10 }} />
                        <YAxis {...axisProps} unit="%" />
                        <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: "var(--hover)" }} />
                        <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} iconType="square" iconSize={8} />
                        <Bar dataKey="Baseline" fill={SERIES.muted} radius={[2, 2, 0, 0]} maxBarSize={22} />
                        <Bar dataKey="Observed" fill={SERIES.accent} radius={[2, 2, 0, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty title="No baseline" body="Decoy agents have no legitimate behavior to learn." />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="trace">
                {lastSession && (
                  <div className="border-b border-border p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-subtle">Latest session</span>
                      <Mono className="text-fg">{lastSession.id}</Mono>
                      <span className="text-muted">{lastSession.task}</span>
                      <span className="ml-auto text-subtle">{fmtDateTime(lastSession.startedAt)}</span>
                    </div>
                    <ol className="flex flex-wrap items-center gap-1.5">
                      {lastSession.path.map((t, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-fg">{t}</span>
                          {i < lastSession.path.length - 1 && <span className="text-subtle">/</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <div className="max-h-[420px] divide-y divide-border overflow-y-auto">
                  {events.slice(0, 40).map((e) => (
                    <EventRow key={e.id} e={e} />
                  ))}
                  {!events.length && <Empty title="No activity recorded" body="This agent has not executed any tool calls in the window." />}
                </div>
              </TabsContent>

              <TabsContent value="credentials" className="p-4">
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-elevated/50 p-3">
                  <KeyRound className="size-4 text-subtle" />
                  <Mono className="text-fg">{agent.credentialId}</Mono>
                  <Badge tone={agent.status === "quarantined" ? "critical" : "healthy"}>{agent.status === "quarantined" ? "Revoked" : "DPoP-bound, TTL 15m"}</Badge>
                  <span className="ml-auto text-xs text-muted">Scopes follow contract {contract?.id}</span>
                </div>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {receipts.filter((r) => r.agentId === agent.id).slice(0, 10).map((r) => (
                    <div key={r.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 px-3 py-2 text-xs">
                      <Mono className="text-muted">{r.method}</Mono>
                      <Mono className="truncate text-fg">{r.endpoint}</Mono>
                      {r.matched ? <Badge tone="healthy"><ShieldCheck /> span {r.spanId}</Badge> : <Badge tone="critical">No matching span</Badge>}
                    </div>
                  ))}
                  {!receipts.some((r) => r.agentId === agent.id) && <Empty title="No gateway receipts" />}
                </div>
              </TabsContent>

              <TabsContent value="incidents">
                <ul className="divide-y divide-border">
                  {agentIncidents.map((i) => (
                    <li key={i.id}>
                      <Link to={`/incidents/${i.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-hover/50">
                        <Mono className="text-subtle">{i.id}</Mono>
                        <SeverityBadge severity={i.severity} />
                        <span className="min-w-0 flex-1 truncate text-[13px]">{i.title}</span>
                        <IncidentStatusBadge status={i.status} />
                        <span className="text-[11px] text-subtle">{fmtAgo(i.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                  {!agentIncidents.length && <Empty icon={<ShieldCheck />} title="No incidents" body="This agent has stayed in character." />}
                </ul>
              </TabsContent>
            </Panel>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function ContractList({ title, items, tone }: { title: string; items: string[]; tone: "healthy" | "critical" | "info" }) {
  return (
    <div>
      <div className="mb-2 text-xs text-subtle">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.length ? items.map((t) => <Badge key={t} tone={tone} className="font-mono">{t}</Badge>) : <span className="text-xs text-muted">None</span>}
      </div>
    </div>
  );
}
