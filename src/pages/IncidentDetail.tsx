import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, FileDown, Ghost, Network, ShieldBan, MessageSquarePlus, Unlock, FileText, Wrench, Globe, KeyRound, Radar, Gavel, RotateCcw } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Panel, PanelHeader, Badge, Mono, Empty, Textarea, SimTag, toneBg } from "@/components/ui/primitives";
import { Select, Tabs, TabsContent, TabsList, TabsTrigger, Dialog } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { AgentLink, DecisionBadge, IncidentStatusBadge, PageHeader, RiskGauge, SeverityBadge, SignalBreakdown } from "@/components/domain";
import { ReplayCompare } from "@/components/ReplayCompare";
import { fmtDateTime, fmtTime } from "@/lib/utils";
import { NotFound } from "./NotFound";
import type { Evidence, IncidentStatus } from "@/data/types";

const EV_ICON: Record<Evidence["kind"], typeof FileText> = {
  document: FileText,
  tool_call: Wrench,
  egress: Globe,
  credential: KeyRound,
  replay: Ghost,
  decoy: Radar,
  policy: Gavel,
};

const ANALYSTS = ["Nikhil Rao", "Sana Qureshi", "Daniel Okafor", "Priya Raman", "Kavya Menon", "Arjun Batra", "Rohan Desai", "Unassigned"];

export default function IncidentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const inc = useStore((s) => s.incidents.find((i) => i.id === id));
  const agents = useStore((s) => s.agents);
  const update = useStore((s) => s.updateIncident);
  const addNote = useStore((s) => s.addIncidentNote);
  const setAgentStatus = useStore((s) => s.setAgentStatus);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<null | "quarantine" | "release">(null);
  const [replayKey, setReplayKey] = useState(0);

  if (!inc) return <NotFound />;
  const primary = agents.find((a) => a.id === inc.agentIds[0]);

  const setStatus = (status: IncidentStatus) => {
    update(inc.id, { status });
    toast.success(`${inc.id} marked ${status.replace("_", " ")}`);
  };

  return (
    <div>
      <Link to="/incidents" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Incident Center
      </Link>
      <PageHeader
        title={inc.title}
        description={inc.summary}
        meta={
          <>
            <Mono className="text-muted">{inc.id}</Mono>
            <SeverityBadge severity={inc.severity} />
            <IncidentStatusBadge status={inc.status} />
            {inc.simulated && <SimTag label="Lab generated" />}
          </>
        }
        actions={
          <>
            <Link to={`/reports?incident=${inc.id}`}>
              <Button>
                <FileDown /> Report
              </Button>
            </Link>
            {inc.status !== "resolved" && (
              <Button variant="success" onClick={() => setStatus("resolved")}>
                <CheckCircle2 /> Resolve
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Tabs defaultValue="overview">
            <Panel>
              <TabsList className="overflow-x-auto px-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="evidence">Evidence <span className="font-mono text-[11px] text-subtle">{inc.evidence.length}</span></TabsTrigger>
                <TabsTrigger value="replay">Replay</TabsTrigger>
                <TabsTrigger value="notes">Notes <span className="font-mono text-[11px] text-subtle">{inc.notes.length}</span></TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-5 p-4">
                <div>
                  <div className="mb-1 text-xs text-subtle">Root cause</div>
                  <p className="text-[13px] leading-relaxed">{inc.rootCause}</p>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs text-subtle">Affected agents</div>
                    <div className="flex flex-col gap-2">
                      {[...new Set(inc.agentIds)].map((a) => (
                        <AgentLink key={a} agentId={a} showRole />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs text-subtle">Affected resources</div>
                    <div className="flex flex-wrap gap-1.5">
                      {inc.affectedResources.length ? inc.affectedResources.map((r) => <Badge key={r} tone="warning" className="font-mono">{r}</Badge>) : <span className="text-xs text-muted">None recorded</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {inc.scenarioId !== "manual" && (
                    <>
                      <Link to={`/drift?scenario=${inc.scenarioId}`}><Button size="sm">Deviation graph</Button></Link>
                      <Link to={`/threat-graph?incident=${inc.id}`}><Button size="sm"><Network /> Provenance</Button></Link>
                    </>
                  )}
                  <Link to={`/ghost-replay?incident=${inc.id}`}><Button size="sm"><Ghost /> Ghost Replay</Button></Link>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="p-4">
                <ol className="relative ml-1.5 border-l border-border">
                  {inc.timeline.map((t, i) => (
                    <li key={i} className="relative pb-4 pl-5 last:pb-0">
                      <span className={`absolute -left-[5px] top-1 size-2.5 rounded-full ring-4 ring-surface ${toneBg[t.tone]}`} />
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <Mono className="text-subtle">{fmtTime(t.ts)}</Mono>
                        <span className="text-[13px]">{t.label}</span>
                      </div>
                      <div className="text-[11px] text-muted">{t.actor}</div>
                    </li>
                  ))}
                </ol>
                {!inc.timeline.length && <Empty title="No timeline entries" />}
              </TabsContent>

              <TabsContent value="evidence">
                <ul className="divide-y divide-border">
                  {inc.evidence.map((e) => {
                    const Icon = EV_ICON[e.kind];
                    return (
                      <li key={e.id} className="flex gap-3 px-4 py-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-elevated text-subtle">
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px]">{e.title}</span>
                            <Badge className="capitalize">{e.kind.replace("_", " ")}</Badge>
                          </div>
                          <p className="mt-1 break-words text-xs leading-relaxed text-muted">{e.detail}</p>
                          <Mono className="mt-1 block text-[10px] text-subtle">sha256:{e.hash}</Mono>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {!inc.evidence.length && <Empty title="No evidence attached" />}
              </TabsContent>

              <TabsContent value="replay" className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-muted">R0 original, R1 suspect source sanitized, R2 user task masked.</p>
                  <Button size="sm" variant="ghost" onClick={() => setReplayKey((k) => k + 1)}>
                    <RotateCcw /> Replay animation
                  </Button>
                </div>
                <ReplayCompare replay={inc.replay} playKey={replayKey} />
              </TabsContent>

              <TabsContent value="notes" className="p-4">
                <ul className="mb-4 space-y-3">
                  {inc.notes.map((n, i) => (
                    <li key={i} className="rounded-lg border border-border bg-elevated/40 p-3">
                      <div className="flex items-center gap-2 text-[11px] text-subtle">
                        <span className="text-fg">{n.author}</span>
                        {fmtDateTime(n.ts)}
                      </div>
                      <p className="mt-1 text-[13px]">{n.text}</p>
                    </li>
                  ))}
                  {!inc.notes.length && <li className="text-xs text-muted">No analyst notes yet.</li>}
                </ul>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!note.trim()) return;
                    addNote(inc.id, note.trim());
                    setNote("");
                    toast.success("Note added");
                  }}
                  className="space-y-2"
                >
                  <label htmlFor="note" className="text-xs text-muted">Add analyst note</label>
                  <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you verify?" />
                  <Button type="submit" size="sm" disabled={!note.trim()}>
                    <MessageSquarePlus /> Add note
                  </Button>
                </form>
              </TabsContent>
            </Panel>
          </Tabs>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Panel>
            <PanelHeader title="Risk at detection" />
            <div className="flex justify-center pt-4">
              <RiskGauge score={inc.risk} size={150} />
            </div>
            <div className="p-4">
              <SignalBreakdown signals={inc.signals} compact />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Triage" />
            <div className="space-y-3 p-4 text-xs">
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <span className="text-subtle">Status</span>
                <Select ariaLabel="Incident status" value={inc.status} onValueChange={(v) => setStatus(v as IncidentStatus)} options={["open", "investigating", "contained", "resolved", "false_positive"].map((s) => ({ value: s, label: s.replace("_", " ") }))} />
                <span className="text-subtle">Assignee</span>
                <Select ariaLabel="Assignee" value={inc.assignee} onValueChange={(v) => update(inc.id, { assignee: v })} options={ANALYSTS.map((a) => ({ value: a, label: a }))} />
                <span className="text-subtle">Opened</span>
                <span className="font-mono">{fmtDateTime(inc.createdAt)}</span>
                <span className="text-subtle">Action</span>
                <span><DecisionBadge decision={inc.containment} /></span>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Containment" description={primary ? `${primary.name} is ${primary.status}` : undefined} />
            <div className="grid grid-cols-2 gap-2 p-4">
              <Button variant="warning" size="sm" onClick={() => { if (primary) { setAgentStatus(primary.id, "restricted"); update(inc.id, { containment: "restrict", status: "contained" }); toast.success("Scopes attenuated (simulated)"); } }}>
                <ShieldBan /> Restrict
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirm("quarantine")}>
                <ShieldBan /> Quarantine
              </Button>
              <Button size="sm" onClick={() => setConfirm("release")} disabled={primary?.status === "protected"}>
                <Unlock /> Release
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setStatus("false_positive"); }}>
                False positive
              </Button>
            </div>
            <div className="border-t border-border px-4 py-3">
              <Button size="sm" variant="ghost" className="w-full" onClick={() => nav("/containment")}>Open Containment Center</Button>
            </div>
          </Panel>
        </div>
      </div>

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "quarantine" ? `Quarantine ${primary?.name}?` : `Release ${primary?.name}?`}
        description={
          confirm === "quarantine"
            ? "Revokes the agent token and stops all tool calls until an analyst releases it. In-flight sessions are held, not dropped."
            : "Restores the agent's contract scopes and returns it to protected monitoring. Risk resets to its baseline."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant={confirm === "quarantine" ? "danger" : "primary"}
              onClick={() => {
                if (!primary) return;
                if (confirm === "quarantine") {
                  setAgentStatus(primary.id, "quarantined");
                  update(inc.id, { containment: "quarantine", status: "contained" });
                  toast.success(`${primary.name} quarantined (simulated)`);
                } else {
                  setAgentStatus(primary.id, "protected");
                  toast.success(`${primary.name} released (simulated)`);
                }
                setConfirm(null);
              }}
            >
              {confirm === "quarantine" ? "Quarantine agent" : "Release agent"}
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted">This is a simulated action. EXORCIST demo mode never changes real credentials.</p>
      </Dialog>
    </div>
  );
}
