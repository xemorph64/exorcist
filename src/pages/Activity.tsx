import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pause, Play, Search, X, Activity as ActivityIcon } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Panel, PanelHeader, Input, Empty, Mono, Badge, SimTag } from "@/components/ui/primitives";
import { Select } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { AgentLink, DecisionBadge, PageHeader, RiskPill } from "@/components/domain";
import { EventRow } from "@/components/EventRow";
import { fmtDateTime } from "@/lib/utils";
import type { Decision, EventKind } from "@/data/types";

export default function Activity() {
  const events = useStore((s) => s.events);
  const agents = useStore((s) => s.agents);
  const sessions = useStore((s) => s.sessions);
  const live = useStore((s) => s.settings.liveStream);
  const update = useStore((s) => s.updateSettings);
  const [q, setQ] = useState("");
  const [agent, setAgent] = useState("all");
  const [kind, setKind] = useState<"all" | EventKind>("all");
  const [decision, setDecision] = useState<"all" | "flagged" | Decision>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return events.filter(
      (e) =>
        (agent === "all" || e.agentId === agent) &&
        (kind === "all" || e.kind === kind) &&
        (decision === "all" || (decision === "flagged" ? e.decision !== "allow" : e.decision === decision)) &&
        (!t || `${e.action} ${e.target} ${e.detail} ${e.sessionId}`.toLowerCase().includes(t)),
    );
  }, [events, q, agent, kind, decision]);

  const sel = events.find((e) => e.id === selectedId);
  const flaggedCount = events.filter((e) => e.decision !== "allow").length;

  return (
    <div>
      <PageHeader
        title="Live Activity"
        description="Every tool call, delegation and egress attempt, with the policy decision EXORCIST made at the gateway."
        meta={<SimTag label="Simulated stream" />}
        actions={
          <Button onClick={() => update({ liveStream: !live })}>
            {live ? <Pause /> : <Play />} {live ? "Pause stream" : "Resume stream"}
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-8">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tool, target, session" className="pl-8" aria-label="Search events" />
            </div>
            <Select ariaLabel="Agent" value={agent} onValueChange={setAgent} className="w-44" options={[{ value: "all", label: "All agents" }, ...agents.map((a) => ({ value: a.id, label: a.name }))]} />
            <Select
              ariaLabel="Event type"
              value={kind}
              onValueChange={(v) => setKind(v as typeof kind)}
              className="w-36"
              options={[{ value: "all", label: "All types" }, ...["tool_call", "policy", "delegation", "egress", "credential", "decoy"].map((k) => ({ value: k, label: k.replace("_", " ") }))]}
            />
            <Select
              ariaLabel="Decision"
              value={decision}
              onValueChange={(v) => setDecision(v as typeof decision)}
              className="w-36"
              options={[{ value: "all", label: "Any decision" }, { value: "flagged", label: `Flagged (${flaggedCount})` }, ...["allow", "step_up", "hold", "restrict", "block", "quarantine"].map((k) => ({ value: k, label: k.replace("_", " ") }))]}
            />
            <span className="ml-auto flex items-center gap-2 text-xs text-subtle">
              {live && <span className="live-pulse size-1.5 rounded-full bg-healthy" />}
              {filtered.length} events
            </span>
          </div>
          <div className="hidden grid-cols-[64px_auto_minmax(0,1.2fr)_minmax(0,1fr)_auto_44px] gap-x-3 border-b border-border px-4 py-2 text-[11px] text-subtle md:grid">
            <span>Time</span>
            <span className="w-6" />
            <span>Action / agent</span>
            <span>Target</span>
            <span>Decision</span>
            <span className="text-right">Risk</span>
          </div>
          <div className="max-h-[calc(100dvh-280px)] min-h-[400px] divide-y divide-border overflow-y-auto">
            {filtered.slice(0, 200).map((e) => (
              <EventRow key={e.id} e={e} onClick={() => setSelectedId(e.id)} selected={e.id === selectedId} />
            ))}
            {!filtered.length && <Empty icon={<ActivityIcon />} title="No events match" body="Loosen a filter or clear the search." />}
          </div>
        </Panel>

        <div className="space-y-4 xl:col-span-4">
          <Panel className="xl:sticky xl:top-20">
            <PanelHeader
              title="Event inspector"
              actions={sel && <Button variant="ghost" size="iconSm" onClick={() => setSelectedId(null)} aria-label="Close inspector"><X /></Button>}
            />
            {sel ? (
              <div className="space-y-4 p-4 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Mono className="text-fg">{sel.action}</Mono>
                  <DecisionBadge decision={sel.decision} />
                  {sel.simulated && <SimTag />}
                </div>
                <dl className="grid grid-cols-[96px_1fr] gap-y-2.5">
                  <dt className="text-subtle">Agent</dt>
                  <dd><AgentLink agentId={sel.agentId} /></dd>
                  <dt className="text-subtle">Time</dt>
                  <dd className="font-mono">{fmtDateTime(sel.ts)}</dd>
                  <dt className="text-subtle">Session</dt>
                  <dd className="font-mono">{sel.sessionId}</dd>
                  <dt className="text-subtle">Target</dt>
                  <dd className="break-all font-mono">{sel.target}</dd>
                  <dt className="text-subtle">Event type</dt>
                  <dd className="capitalize">{sel.kind.replace("_", " ")}</dd>
                  <dt className="text-subtle">Risk at event</dt>
                  <dd><RiskPill score={sel.risk} /></dd>
                  <dt className="text-subtle">Event id</dt>
                  <dd className="font-mono text-muted">{sel.id}</dd>
                </dl>
                <div>
                  <div className="mb-1 text-subtle">Policy reasoning</div>
                  <p className="leading-relaxed text-fg">{sel.detail}</p>
                </div>
                {sel.incidentId && (
                  <Link to={`/incidents/${sel.incidentId}`}>
                    <Button size="sm" className="w-full">Open {sel.incidentId}</Button>
                  </Link>
                )}
              </div>
            ) : (
              <Empty title="Select an event" body="Click any row to see the policy decision, the session it belongs to and linked incidents." />
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Recent sessions" description={`${sessions.length} sessions in window`} />
            <ul className="max-h-[360px] divide-y divide-border overflow-y-auto">
              {[...sessions].reverse().map((s) => (
                <li key={s.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Mono className="text-subtle">{s.id}</Mono>
                    <span className="truncate text-muted">{agents.find((a) => a.id === s.agentId)?.name}</span>
                    <Badge tone="healthy" className="ml-auto">{s.outcome}</Badge>
                  </div>
                  <div className="mt-1 truncate text-[13px]">{s.task}</div>
                  <div className="mt-1 font-mono text-[11px] text-subtle">{s.steps} steps / {s.durationS}s / peak {s.peakRisk}</div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
