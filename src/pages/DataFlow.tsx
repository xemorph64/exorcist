import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, EyeOff, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Panel, PanelHeader, Badge, Mono, SimTag } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { DecisionBadge, PageHeader, Stat } from "@/components/domain";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  {
    id: "INC-1043",
    title: "Customer data in an approved Slack channel",
    sink: "#partners-external (hooks.slack.com, allowed domain)",
    before: "Summary for #partners-external: Halden ACV $1.84M, renewal 2027-03, contact anika.r@halden.example",
    after: "Summary for #partners-external: Halden renewal discussion in progress. Details in #deal-halden (internal).",
    why: "Domain was allowed; data class customer_contact and contract value were not allowed for a shared channel.",
  },
  {
    id: "Lab",
    title: "HR salary bands toward a paste site",
    sink: "paste-drop.io (not in any allowlist)",
    before: "POST /api/v1 body=eyJiYW5kIjoiTDQiLCJtaW4iOjI4MDAwMDAsIm1heCI6...",
    after: "Request held at gateway. 0 bytes left the network.",
    why: "Sensitive-data echo matched base64-decoded salary values read 2 steps earlier.",
  },
  {
    id: "INC-1032",
    title: "NDA text toward a third-party MCP logger",
    sink: "docs-plus.app/log",
    before: "upload_log(doc='MUTUAL NON-DISCLOSURE AGREEMENT between Acme Corp and Lumen Freight...')",
    after: "Tool call rejected. MCP server docs-plus disabled tenant-wide.",
    why: "41 shingles from the NDA found in the outbound argument; tool not in contract.",
  },
];

export default function DataFlow() {
  const flows = useStore((s) => s.dataFlows);
  const agents = useStore((s) => s.agents);
  const [filter, setFilter] = useState<"all" | "approved" | "prohibited">("all");
  const [reveal, setReveal] = useState<string | null>(null);
  const rows = flows.filter((f) => filter === "all" || (filter === "approved" ? f.approved : !f.approved));

  return (
    <div>
      <PageHeader title="Data Flow Guard" description="Sensitive-data lineage from source to sink. Decisions follow the data class, not just the destination domain." meta={<SimTag />} />
      <Panel className="mb-4 grid grid-cols-2 md:grid-cols-4 [&>*]:border-border md:[&>*:not(:last-child)]:border-r">
        <Stat label="Tracked flows" value={flows.length} sub="Source / agent / sink triples" />
        <Stat label="Approved" tone="healthy" value={flows.filter((f) => f.approved).length} sub="Match contract data classes" />
        <Stat label="Prohibited" tone="critical" value={flows.filter((f) => !f.approved).length} sub="Blocked, held or stepped up" />
        <Stat label="Bytes disclosed" value="0" sub="Across all prohibited flows" />
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-7">
          <PanelHeader
            title="Sensitive-data lineage"
            actions={
              <div className="flex gap-1">
                {(["all", "approved", "prohibited"] as const).map((f) => (
                  <Button key={f} size="sm" variant={filter === f ? "secondary" : "ghost"} onClick={() => setFilter(f)} aria-pressed={filter === f} className="capitalize">
                    {f}
                  </Button>
                ))}
              </div>
            }
          />
          <ul className="divide-y divide-border">
            {rows.map((f) => (
              <li key={f.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("grid size-5 place-items-center rounded-full", f.approved ? "bg-healthy-soft text-healthy" : "bg-critical-soft text-critical")}>
                    {f.approved ? <Check className="size-3" /> : <X className="size-3" />}
                  </span>
                  <Badge tone="info" className="font-mono">{f.dataClass}</Badge>
                  <DecisionBadge decision={f.decision} />
                  <span className="ml-auto text-[11px] text-subtle">{f.volume}</span>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-xs">
                  <Mono className="truncate rounded border border-border bg-elevated px-2 py-1 text-muted">{f.source}</Mono>
                  <ArrowRight className="size-3.5 text-subtle" />
                  <Link to={`/agents/${f.agentId}`} className="truncate rounded border border-border bg-elevated px-2 py-1 text-fg hover:border-accent">
                    {agents.find((a) => a.id === f.agentId)?.name}
                  </Link>
                  <ArrowRight className={cn("size-3.5", f.approved ? "text-subtle" : "text-critical")} />
                  <Mono className={cn("truncate rounded border px-2 py-1", f.approved ? "border-border bg-elevated text-muted" : "border-critical/40 bg-critical-soft text-critical")}>{f.sink}</Mono>
                </div>
                <p className="mt-1.5 text-[11px] text-muted">{f.note}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-4 xl:col-span-5">
          <Panel>
            <PanelHeader title="Blocked disclosure examples" />
            <ul className="divide-y divide-border">
              {EXAMPLES.map((e) => (
                <li key={e.title} className="space-y-2 px-4 py-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{e.title}</span>
                    {e.id.startsWith("INC") ? (
                      <Link to={`/incidents/${e.id}`} className="ml-auto font-mono text-[11px] text-accent hover:underline">{e.id}</Link>
                    ) : (
                      <Link to="/lab" className="ml-auto text-[11px] text-accent hover:underline">Run in Lab</Link>
                    )}
                  </div>
                  <div className="text-muted">Sink: <Mono>{e.sink}</Mono></div>
                  <div className="rounded-md border border-critical/30 bg-critical-soft/40 p-2">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-critical">
                      Attempted
                      <button onClick={() => setReveal(reveal === e.title ? null : e.title)} className="flex items-center gap-1 text-muted hover:text-fg">
                        <EyeOff className="size-3" /> {reveal === e.title ? "Mask" : "Reveal"}
                      </button>
                    </div>
                    <Mono className={cn("block break-all text-[11px]", reveal === e.title ? "text-fg" : "select-none text-transparent [text-shadow:0_0_6px_var(--muted)]")}>{e.before}</Mono>
                  </div>
                  <div className="rounded-md border border-healthy/30 bg-healthy-soft/40 p-2">
                    <div className="mb-1 text-[10px] font-medium text-healthy">Outcome</div>
                    <Mono className="block break-all text-[11px] text-fg">{e.after}</Mono>
                  </div>
                  <p className="text-muted">{e.why}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
