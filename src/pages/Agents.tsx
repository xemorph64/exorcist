import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, Bot, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { Agent } from "@/data/types";
import { DataTable } from "@/components/DataTable";
import { AgentMark, AgentStatusBadge, FrameworkTag, PageHeader, RiskPill } from "@/components/domain";
import { Badge, Empty, Input, Panel } from "@/components/ui/primitives";
import { Select, Switch } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Agents() {
  const agents = useStore((s) => s.agents);
  const contracts = useStore((s) => s.contracts);
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const status = params.get("status") ?? "all";
  const framework = params.get("framework") ?? "all";
  const [showDecoys, setShowDecoys] = useState(false);

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v === "all") p.delete(k);
    else p.set(k, v);
    setParams(p, { replace: true });
  };

  const rows = useMemo(
    () =>
      agents.filter(
        (a) =>
          (showDecoys || !a.isCanary) &&
          (status === "all" || a.status === status) &&
          (framework === "all" || a.framework === framework),
      ),
    [agents, status, framework, showDecoys],
  );

  const columns = useMemo<ColumnDef<Agent, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Agent",
        accessorFn: (a) => `${a.name} ${a.id} ${a.owner}`,
        cell: ({ row: { original: a } }) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <AgentMark agentId={a.id} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate font-medium text-fg">
                {a.name}
                {a.isCanary && <Badge tone="accent">Decoy</Badge>}
              </div>
              <div className="truncate font-mono text-[11px] text-subtle">{a.id}</div>
            </div>
          </div>
        ),
        size: 260,
      },
      { id: "role", header: "Role", accessorKey: "role", cell: ({ row: { original: a } }) => <div><div className="text-fg">{a.role}</div><div className="text-[11px] text-muted">{a.team}</div></div> },
      { id: "framework", header: "Framework", accessorKey: "framework", cell: ({ getValue }) => <FrameworkTag framework={getValue() as string} /> },
      { id: "status", header: "Status", accessorKey: "status", cell: ({ getValue }) => <AgentStatusBadge status={getValue() as Agent["status"]} /> },
      { id: "risk", header: "Risk", accessorKey: "risk", cell: ({ getValue }) => <RiskPill score={getValue() as number} /> },
      {
        id: "delta",
        header: "vs baseline",
        accessorFn: (a) => a.risk - a.baselineRisk,
        cell: ({ getValue }) => {
          const d = getValue() as number;
          return <span className={cn("font-mono text-[12px] tabular", d > 15 ? "text-critical" : d > 5 ? "text-warning" : "text-muted")}>{d > 0 ? `+${d}` : d}</span>;
        },
      },
      { id: "calls", header: "Calls 24h", accessorKey: "toolCalls24h", cell: ({ getValue }) => <span className="font-mono text-[12px] tabular text-muted">{(getValue() as number).toLocaleString()}</span> },
      {
        id: "contract",
        header: "Contract",
        accessorFn: (a) => contracts.find((c) => c.id === a.contractId)?.version ?? "",
        cell: ({ row: { original: a } }) => {
          const c = contracts.find((x) => x.id === a.contractId);
          return <span className="font-mono text-[12px] text-muted">{c ? `${c.id} v${c.version}` : "none"}</span>;
        },
      },
      { id: "owner", header: "Owner", accessorKey: "owner", cell: ({ getValue }) => <span className="text-muted">{getValue() as string}</span> },
    ],
    [contracts],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    agents.filter((a) => !a.isCanary).forEach((a) => (c[a.status] = (c[a.status] ?? 0) + 1));
    return c;
  }, [agents]);

  const filtersActive = q || status !== "all" || framework !== "all";

  return (
    <div>
      <PageHeader
        title="Agent Fleet"
        description="Inventory of registered agents, the role contract each is held to, and how far current behavior sits from its learned baseline."
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {(["protected", "learning", "held", "restricted", "quarantined"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setParam("status", status === s ? "all" : s)}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md border px-3 text-xs capitalize transition-colors",
              status === s ? "border-accent/50 bg-accent-soft text-fg" : "border-border bg-surface text-muted hover:text-fg",
            )}
            aria-pressed={status === s}
          >
            {s}
            <span className="font-mono tabular text-subtle">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, id or owner" className="pl-8" aria-label="Search agents" />
          </div>
          <Select
            ariaLabel="Framework"
            value={framework}
            onValueChange={(v) => setParam("framework", v)}
            options={[{ value: "all", label: "All frameworks" }, ...["LangGraph", "CrewAI", "AutoGen", "OpenAI Agents SDK", "MCP Custom"].map((f) => ({ value: f, label: f }))]}
            className="w-44"
          />
          <Select
            ariaLabel="Status"
            value={status}
            onValueChange={(v) => setParam("status", v)}
            options={[{ value: "all", label: "Any status" }, ...["protected", "learning", "held", "restricted", "quarantined"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]}
            className="w-36"
          />
          <label className="ml-1 flex items-center gap-2 text-xs text-muted">
            <Switch checked={showDecoys} onCheckedChange={setShowDecoys} ariaLabel="Show decoy agents" /> Show decoy agents
          </label>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setParams({}, { replace: true });
              }}
            >
              <X /> Clear
            </Button>
          )}
          <span className="ml-auto text-xs text-subtle">{rows.length} agents</span>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          globalFilter={q}
          initialSort={[{ id: "risk", desc: true }]}
          onRowClick={(a) => nav(`/agents/${a.id}`)}
          empty={<Empty icon={<Bot />} title="No agents match" body="Try a different status or framework, or clear the search." />}
        />
      </Panel>
    </div>
  );
}
