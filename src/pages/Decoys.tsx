import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Bot, FileText, KeyRound, Plus, Radar, Wrench, Zap, Power } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { Decoy } from "@/data/types";
import { Panel, PanelHeader, Badge, Mono, SimTag, Input, Label, Skeleton } from "@/components/ui/primitives";
import { Dialog, Select } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { PageHeader, Stat } from "@/components/domain";
import { cn } from "@/lib/utils";

const LineageGraph = lazy(() => import("@/components/viz/LineageGraph"));
const ICON = { tool: Wrench, document: FileText, credential: KeyRound, agent: Bot };

export default function Decoys() {
  const decoys = useStore((s) => s.decoys);
  const agents = useStore((s) => s.agents);
  const { addDecoy, triggerDecoy, toggleDecoy } = useStore.getState();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ kind: Decoy["kind"]; name: string; plantedIn: string }>({ kind: "document", name: "", plantedIn: "" });
  const [selected, setSelected] = useState<string | null>(null);
  const names = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a.name])), [agents]);

  const armed = decoys.filter((d) => d.status === "armed").length;
  const triggered = decoys.filter((d) => d.status === "triggered").length;

  const LINEAGE_INFO: Record<string, string> = {
    web: "External page with a self-replicating instruction. Taint label T-WEB-07 travels with every derived message.",
    "agt-sales-05": "Earliest agent tainted by external input. Capped to read-only for 30 minutes.",
    "agt-orch-00": "Received the tainted message. Attenuated; delegation to specialist agents held for review.",
    "agt-canary-99": "No legitimate workflow calls this agent. Contact produced a 100% canary signal and policy floor 85.",
    "agt-procure-01": "Reachable within 2 hops but no tainted message arrived. Not attenuated.",
    "agt-hr-03": "Reachable within 2 hops but no tainted message arrived. Not attenuated.",
  };

  return (
    <div>
      <PageHeader
        title="D3COY Mesh"
        description="Canary tools, documents, credentials and agents that no role ever needs. Touching one is a high-confidence signal an attacker cannot optimize against."
        meta={<SimTag />}
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus /> Plant decoy
          </Button>
        }
      />
      <Panel className="mb-4 grid grid-cols-2 md:grid-cols-4 [&>*]:border-border md:[&>*:not(:last-child)]:border-r">
        <Stat label="Decoys deployed" icon={<Radar />} value={decoys.length} sub="Role-orthogonal placement" />
        <Stat label="Armed" tone="healthy" value={armed} sub="Waiting silently" />
        <Stat label="Triggered" tone={triggered ? "critical" : "healthy"} value={triggered} sub="Each one opens an incident" />
        <Stat label="False triggers, 30d" value={0} sub="No legitimate role reaches them" />
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-7">
          <PanelHeader title="Canary inventory" />
          <ul className="divide-y divide-border">
            {decoys.map((d) => {
              const Icon = ICON[d.kind];
              return (
                <li key={d.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", d.status === "disabled" && "opacity-55")}>
                  <span className={cn("grid size-8 place-items-center rounded-md border border-border bg-elevated", d.status === "triggered" ? "text-critical" : "text-accent")}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Mono className="block truncate text-fg">{d.name}</Mono>
                    <div className="truncate text-[11px] text-muted">{d.kind} in {d.plantedIn}</div>
                  </div>
                  <Badge tone={d.status === "triggered" ? "critical" : d.status === "armed" ? "healthy" : "neutral"} className="capitalize">{d.status}</Badge>
                  <span className="w-24 text-right text-[11px] text-subtle">
                    {d.triggers} trigger{d.triggers === 1 ? "" : "s"}
                    {d.lastTriggeredHoursAgo !== null && <span className="block">{d.lastTriggeredHoursAgo < 1 ? "just now" : `${d.lastTriggeredHoursAgo}h ago`}</span>}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" disabled={d.status === "disabled"} onClick={() => { triggerDecoy(d.id); toast.error(`Decoy ${d.name} touched`, { description: "Test trigger. Canary floor 85 applied (simulated)." }); }}>
                      <Zap /> Test
                    </Button>
                    <Button size="iconSm" variant="ghost" onClick={() => toggleDecoy(d.id)} aria-label={d.status === "disabled" ? "Arm decoy" : "Disable decoy"}>
                      <Power />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="space-y-4 xl:col-span-5">
          <Panel className="overflow-hidden">
            <PanelHeader title="Influence graph: INC-1040" description="Delegation lineage and blast radius" actions={<Link to="/incidents/INC-1040" className="text-xs text-accent hover:underline">Open incident</Link>} />
            <div className="h-[320px]">
              <Suspense fallback={<Skeleton className="m-4 h-[280px]" />}>
                <LineageGraph names={names} onSelect={setSelected} />
              </Suspense>
            </div>
            <div className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted">
              {selected ? LINEAGE_INFO[selected] : "Click a node. Risk propagates as r = max(r, 0.8^hops x r_source); only agents that actually received tainted content are attenuated."}
            </div>
          </Panel>
          <Panel className="p-4 text-xs">
            <div className="text-[13px] font-medium">Delegation lineage</div>
            <ol className="mt-3 space-y-2">
              {[
                ["Patient zero", "Sales Research", "critical"],
                ["Hop 1", "Orchestrator (attenuated)", "warning"],
                ["Contained at", "Archive Agent canary", "accent"],
                ["Unaffected", "Procurement, HR, Finance, Legal", "healthy"],
              ].map(([k, v, t]) => (
                <li key={k} className="grid grid-cols-[96px_1fr] gap-2">
                  <span className="text-subtle">{k}</span>
                  <span className={`text-${t}`}>{v}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Plant a decoy"
        description="Decoys are placed where an injected agent would look but no legitimate role ever needs to go."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!form.name.trim() || !form.plantedIn.trim()}
              onClick={() => {
                addDecoy({ kind: form.kind, name: form.name.trim(), plantedIn: form.plantedIn.trim() });
                toast.success(`Decoy ${form.name} armed`);
                setForm({ kind: "document", name: "", plantedIn: "" });
                setOpen(false);
              }}
            >
              Arm decoy
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select ariaLabel="Decoy type" value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as Decoy["kind"] })} className="w-full" options={[{ value: "document", label: "Document" }, { value: "tool", label: "Tool" }, { value: "credential", label: "Credential (honeytoken)" }, { value: "agent", label: "Agent" }]} />
          </div>
          <div>
            <Label htmlFor="dn">Name</Label>
            <Input id="dn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. vendor_bank_master_export.csv" />
          </div>
          <div>
            <Label htmlFor="dp">Planted in</Label>
            <Input id="dp" value={form.plantedIn} onChange={(e) => setForm({ ...form, plantedIn: e.target.value })} placeholder="e.g. Finance shared drive" />
            <p className="mt-1.5 text-[11px] text-subtle">Choose a location outside every role's allowed domains.</p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
