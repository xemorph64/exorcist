import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, ShieldCheck, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { Incident } from "@/data/types";
import { DataTable } from "@/components/DataTable";
import { AgentLink, DecisionBadge, IncidentStatusBadge, PageHeader, RiskPill, SeverityBadge } from "@/components/domain";
import { Badge, Empty, Input, Mono, Panel } from "@/components/ui/primitives";
import { Select } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { cn, fmtAgo } from "@/lib/utils";

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export default function Incidents() {
  const incidents = useStore((s) => s.incidents);
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const status = params.get("status") ?? "all";
  const severity = params.get("severity") ?? "all";
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v === "all") p.delete(k);
    else p.set(k, v);
    setParams(p, { replace: true });
  };

  const rows = useMemo(
    () => incidents.filter((i) => (status === "all" || i.status === status) && (severity === "all" || i.severity === severity)),
    [incidents, status, severity],
  );

  const columns = useMemo<ColumnDef<Incident, unknown>[]>(
    () => [
      { id: "id", header: "ID", accessorKey: "id", cell: ({ row: { original: i } }) => <div className="flex items-center gap-1.5"><Mono className="text-muted">{i.id}</Mono>{i.simulated && <Badge tone="accent">Lab</Badge>}</div>, size: 120 },
      { id: "sev", header: "Severity", accessorFn: (i) => SEV_ORDER[i.severity], cell: ({ row: { original: i } }) => <SeverityBadge severity={i.severity} /> },
      { id: "title", header: "Incident", accessorFn: (i) => `${i.title} ${i.id} ${i.assignee}`, cell: ({ row: { original: i } }) => <span className="line-clamp-1 text-fg">{i.title}</span>, size: 340 },
      { id: "agent", header: "Agent", accessorFn: (i) => i.agentIds[0], cell: ({ row: { original: i } }) => <AgentLink agentId={i.agentIds[0]} /> },
      { id: "status", header: "Status", accessorKey: "status", cell: ({ row: { original: i } }) => <IncidentStatusBadge status={i.status} /> },
      { id: "risk", header: "Risk", accessorKey: "risk", cell: ({ getValue }) => <RiskPill score={getValue() as number} /> },
      { id: "containment", header: "Action", accessorKey: "containment", cell: ({ row: { original: i } }) => <DecisionBadge decision={i.containment} /> },
      { id: "assignee", header: "Assignee", accessorKey: "assignee", cell: ({ getValue }) => <span className="text-muted">{getValue() as string}</span> },
      { id: "created", header: "Opened", accessorKey: "createdAt", cell: ({ getValue }) => <span className="whitespace-nowrap text-xs text-subtle">{fmtAgo(getValue() as number)}</span> },
    ],
    [],
  );

  const counts = {
    open: incidents.filter((i) => i.status === "open").length,
    investigating: incidents.filter((i) => i.status === "investigating").length,
    contained: incidents.filter((i) => i.status === "contained").length,
    resolved: incidents.filter((i) => i.status === "resolved" || i.status === "false_positive").length,
  };

  return (
    <div>
      <PageHeader title="Incident Center" description="Every incident links back to the agent, the evidence chain and the replay that classified it." />
      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-border bg-border md:grid-cols-4">
        {(
          [
            ["open", "Open", "critical"],
            ["investigating", "Investigating", "warning"],
            ["contained", "Contained", "accent"],
            ["resolved", "Closed", "healthy"],
          ] as const
        ).map(([k, l, t]) => (
          <button
            key={k}
            onClick={() => set("status", status === k ? "all" : k)}
            className={cn("bg-surface px-4 py-3 text-left transition-colors hover:bg-hover/50", status === k && "bg-elevated")}
            aria-pressed={status === k}
          >
            <div className="text-xs text-muted">{l}</div>
            <div className={cn("mt-1 text-2xl font-semibold tabular", `text-${t}`)}>{counts[k]}</div>
          </button>
        ))}
      </div>
      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, id, assignee" className="pl-8" aria-label="Search incidents" />
          </div>
          <Select ariaLabel="Severity" value={severity} onValueChange={(v) => set("severity", v)} className="w-36" options={[{ value: "all", label: "Any severity" }, ...["critical", "high", "medium", "low"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]} />
          <Select ariaLabel="Status" value={status} onValueChange={(v) => set("status", v)} className="w-40" options={[{ value: "all", label: "Any status" }, ...["open", "investigating", "contained", "resolved", "false_positive"].map((s) => ({ value: s, label: s.replace("_", " ") }))]} />
          {(q || status !== "all" || severity !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setQ(""); setParams({}, { replace: true }); }}>
              <X /> Clear
            </Button>
          )}
          <span className="ml-auto text-xs text-subtle">{rows.length} incidents</span>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          globalFilter={q}
          initialSort={[{ id: "created", desc: true }]}
          onRowClick={(i) => nav(`/incidents/${i.id}`)}
          empty={<Empty icon={<ShieldCheck />} title="No incidents match" body="Nothing in this filter. Run a scenario in the Possession Lab to generate one." />}
        />
      </Panel>
    </div>
  );
}
