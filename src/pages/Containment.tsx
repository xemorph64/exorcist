import { useState } from "react";
import { toast } from "sonner";
import { Check, CircleSlash, Lock, PauseCircle, ShieldBan, Unlock, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { AgentStatus } from "@/data/types";
import { Panel, PanelHeader, Badge, Mono, SimTag, Empty } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/radix";
import { AgentLink, AgentStatusBadge, DecisionBadge, PageHeader, RiskPill } from "@/components/domain";
import { cn, fmtTime } from "@/lib/utils";

const ACTIONS: { status: AgentStatus; label: string; icon: typeof Lock; desc: string; variant: "success" | "secondary" | "warning" | "danger" }[] = [
  { status: "protected", label: "Allow", icon: Check, desc: "Full contract scopes, monitored", variant: "success" },
  { status: "held", label: "Hold", icon: PauseCircle, desc: "Next sensitive action waits for approval", variant: "secondary" },
  { status: "restricted", label: "Restrict", icon: Lock, desc: "Read-only, egress and write scopes revoked", variant: "warning" },
  { status: "quarantined", label: "Quarantine", icon: ShieldBan, desc: "Token revoked, all calls stopped", variant: "danger" },
];

const UNSAFE = [
  { t: "Read supplier PDF", ok: true },
  { t: "HR salary access", ok: false, note: "Blocked" },
  { t: "Agent killed by kill-switch", ok: false, note: "All work stops" },
  { t: "Price comparison", ok: false, note: "Never runs" },
  { t: "Purchase recommendation", ok: false, note: "Missed SLA, manual rework" },
];
const SAFE = [
  { t: "Read supplier PDF", ok: true },
  { t: "HR salary access", ok: false, note: "Blocked at gateway" },
  { t: "HR + egress scopes revoked, PDF quarantined", ok: true, note: "Attenuated" },
  { t: "Price comparison on sanitized source", ok: true },
  { t: "Recommendation routed for approval", ok: true },
];

export default function Containment() {
  const allAgents = useStore((s) => s.agents);
  const agents = allAgents.filter((a) => !a.isCanary);
  const events = useStore((s) => s.events);
  const setStatus = useStore((s) => s.setAgentStatus);
  const [pending, setPending] = useState<{ agentId: string; status: AgentStatus } | null>(null);
  const log = events.filter((e) => e.kind === "policy").slice(0, 14);
  const contained = agents.filter((a) => a.status !== "protected" && a.status !== "learning");

  const apply = (agentId: string, status: AgentStatus) => {
    setStatus(agentId, status);
    const a = agents.find((x) => x.id === agentId);
    toast.success(`${a?.name}: ${status === "protected" ? "released" : status}`, { description: "Simulated. Credential scopes updated in demo state only." });
  };

  return (
    <div>
      <PageHeader title="Containment Center" description="Graduated responses. Attenuate the scopes that matter instead of killing the agent, so legitimate work keeps flowing." meta={<SimTag />} />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map((a) => {
          const n = agents.filter((x) => x.status === a.status || (a.status === "protected" && x.status === "learning")).length;
          return (
            <Panel key={a.status} className="flex items-start gap-3 p-4">
              <span className={cn("grid size-8 place-items-center rounded-md border border-border bg-elevated", a.variant === "danger" ? "text-critical" : a.variant === "warning" ? "text-warning" : a.variant === "success" ? "text-healthy" : "text-muted")}>
                <a.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium">{a.label}</span>
                  <Mono className="text-subtle">{n}</Mono>
                </div>
                <p className="text-xs text-muted">{a.desc}</p>
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-8">
          <PanelHeader title="Agent controls" description={`${contained.length} agents currently contained`} />
          <ul className="divide-y divide-border">
            {[...agents].sort((a, b) => b.risk - a.risk).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="w-52 min-w-0">
                  <AgentLink agentId={a.id} showRole />
                </div>
                <AgentStatusBadge status={a.status} />
                <RiskPill score={a.risk} />
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {ACTIONS.map((act) => {
                    const current = a.status === act.status || (act.status === "protected" && a.status === "learning");
                    return (
                      <Button
                        key={act.status}
                        size="sm"
                        variant={current ? act.variant : "ghost"}
                        aria-pressed={current}
                        disabled={current}
                        onClick={() => (act.status === "quarantined" || (act.status === "protected" && a.status === "quarantined") ? setPending({ agentId: a.id, status: act.status }) : apply(a.id, act.status))}
                      >
                        {act.status === "protected" && a.status !== "protected" && a.status !== "learning" ? <><Unlock /> Release</> : act.label}
                      </Button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="xl:col-span-4">
          <PanelHeader title="Containment log" />
          <ul className="max-h-[560px] divide-y divide-border overflow-y-auto">
            {log.map((e) => (
              <li key={e.id} className="px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Mono className="text-subtle">{fmtTime(e.ts)}</Mono>
                  <DecisionBadge decision={e.decision} />
                </div>
                <div className="mt-1 truncate text-fg">{agents.find((a) => a.id === e.agentId)?.name ?? e.agentId}: {e.action}</div>
                <div className="truncate text-muted">{e.detail}</div>
              </li>
            ))}
            {!log.length && <Empty title="No containment actions yet" />}
          </ul>
        </Panel>

        <Panel className="xl:col-span-12">
          <PanelHeader title="Why attenuate instead of kill" description="Poisoned supplier PDF, same detection, two responses" />
          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
            {[
              { title: "Unsafe: kill-switch", tone: "critical" as const, steps: UNSAFE, foot: "Attack stopped, but procurement work is lost and the analyst inherits a backlog." },
              { title: "Safe: scope attenuation (EXORCIST)", tone: "healthy" as const, steps: SAFE, foot: "Attack stopped and the purchase recommendation still reaches approval." },
            ].map((col) => (
              <div key={col.title} className="bg-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Badge tone={col.tone}>{col.title}</Badge>
                </div>
                <ol className="space-y-2">
                  {col.steps.map((s, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-[13px]">
                      <span className={cn("grid size-5 place-items-center rounded-full", s.ok ? "bg-healthy-soft text-healthy" : "bg-critical-soft text-critical")}>
                        {s.ok ? <Check className="size-3" /> : s.note === "Never runs" || s.note?.startsWith("Missed") ? <CircleSlash className="size-3" /> : <X className="size-3" />}
                      </span>
                      <span className={s.ok ? "text-fg" : "text-muted"}>{s.t}</span>
                      {s.note && <span className="ml-auto text-[11px] text-subtle">{s.note}</span>}
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-muted">{col.foot}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Dialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.status === "quarantined" ? "Quarantine agent?" : "Release from quarantine?"}
        description={pending?.status === "quarantined" ? "The agent token is revoked and every in-flight session is held." : "A new DPoP-bound token is issued and contract scopes are restored."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
            <Button variant={pending?.status === "quarantined" ? "danger" : "primary"} onClick={() => { if (pending) apply(pending.agentId, pending.status); setPending(null); }}>
              Confirm
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted">Agent: <span className="text-fg">{agents.find((a) => a.id === pending?.agentId)?.name}</span>. This is a simulated action.</p>
      </Dialog>
    </div>
  );
}
