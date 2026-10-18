import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, CircleDashed, GitPullRequestArrow, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Panel, PanelHeader, Badge, Mono, Empty } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { AgentLink, PageHeader } from "@/components/domain";
import { cn, fmtDateTime } from "@/lib/utils";

const TONE = { pending: "warning", approved: "info", applied: "healthy", rejected: "critical" } as const;

export default function Changes() {
  const changes = useStore((s) => s.changes);
  const { approveChange, rejectChange } = useStore.getState();
  const [selectedId, setSelectedId] = useState(changes[0]?.id);
  const ch = changes.find((c) => c.id === selectedId);

  return (
    <div>
      <PageHeader
        title="Change Registry"
        description="Declared, two-person-approved role changes. When behavior shifts in line with an applied change, EXORCIST updates the baseline instead of raising an alert."
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-5">
          <PanelHeader title="Change requests" />
          <ul className="divide-y divide-border">
            {changes.map((c) => (
              <li key={c.id}>
                <button onClick={() => setSelectedId(c.id)} className={cn("w-full px-4 py-3 text-left transition-colors", c.id === selectedId ? "bg-elevated" : "hover:bg-hover/50")}>
                  <div className="flex items-center gap-2">
                    <Mono className="text-subtle">{c.id}</Mono>
                    <Badge tone={TONE[c.status]} className="capitalize">{c.status}</Badge>
                    <span className="ml-auto text-[11px] text-subtle">{c.createdHoursAgo}h ago</span>
                  </div>
                  <div className="mt-1 text-[13px]">{c.title}</div>
                  <div className="mt-1 font-mono text-[11px] text-muted">{c.contractId}: {c.fromVersion} to {c.toVersion}</div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="xl:col-span-7">
          {ch ? (
            <>
              <PanelHeader title={ch.title} description={`Requested by ${ch.requestedBy}`} icon={<GitPullRequestArrow />} actions={<Badge tone={TONE[ch.status]} className="capitalize">{ch.status}</Badge>} />
              <div className="space-y-5 p-4">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <AgentLink agentId={ch.agentId} showRole />
                  <Link to={`/contracts?id=${ch.contractId}`} className="font-mono text-accent hover:underline">{ch.contractId}</Link>
                </div>
                <div>
                  <div className="mb-1 text-xs text-subtle">Reason</div>
                  <p className="text-[13px]">{ch.reason}</p>
                </div>
                <div>
                  <div className="mb-1.5 text-xs text-subtle">Contract diff</div>
                  <pre className="overflow-x-auto rounded-md border border-border bg-bg font-mono text-[12px]">
                    {ch.diff.map((d, i) => (
                      <div key={i} className={cn("px-3 py-1", d.op === "+" ? "bg-healthy-soft text-healthy" : "bg-critical-soft text-critical")}>
                        {d.op} {d.line}
                      </div>
                    ))}
                  </pre>
                </div>
                <div>
                  <div className="mb-2 text-xs text-subtle">Approvals ({ch.approvals.filter((a) => a.at).length} of {ch.requiredApprovals} required)</div>
                  <ul className="space-y-2">
                    {ch.approvals.map((a) => (
                      <li key={a.name} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-xs">
                        {a.at ? <Check className="size-4 text-healthy" /> : <CircleDashed className="size-4 text-subtle" />}
                        <span className="text-fg">{a.name}</span>
                        {a.at ? (
                          <span className="ml-auto font-mono text-[11px] text-subtle">{fmtDateTime(a.at)}</span>
                        ) : ch.status === "pending" ? (
                          <Button size="sm" className="ml-auto" onClick={() => { approveChange(ch.id, a.name); toast.success(`Approved as ${a.name}`, { description: "Simulated approval." }); }}>
                            Approve as {a.name.split(" ")[0]}
                          </Button>
                        ) : (
                          <span className="ml-auto text-[11px] text-subtle">Not required</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {ch.status === "applied" && (
                  <div className="rounded-md border border-healthy/30 bg-healthy-soft/40 p-3 text-xs leading-relaxed text-fg">
                    Contract {ch.toVersion} is active. Observed behavior that matches this diff is attributed to {ch.id} and folded into the baseline, so it does not raise a critical alert.
                  </div>
                )}
                {ch.status === "pending" && (
                  <div className="flex justify-end">
                    <Button variant="danger" size="sm" onClick={() => { rejectChange(ch.id); toast("Change rejected"); }}>
                      <X /> Reject
                    </Button>
                  </div>
                )}
                {ch.id === "CHG-311" && ch.status === "pending" && (
                  <p className="text-[11px] text-muted">
                    Tip: the Lab scenario "Legitimate role change" applies this change and shows the agent's new tool use staying out of the critical band.
                  </p>
                )}
              </div>
            </>
          ) : (
            <Empty title="Select a change request" />
          )}
        </Panel>
      </div>
    </div>
  );
}
