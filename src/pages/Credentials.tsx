import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { KeyRound, Link2, Link2Off, ShieldCheck, Zap } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { CredentialReceipt } from "@/data/types";
import { DataTable } from "@/components/DataTable";
import { Panel, PanelHeader, Badge, Mono, SimTag } from "@/components/ui/primitives";
import { Select } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { AgentLink, PageHeader, Stat } from "@/components/domain";
import { fmtDateTime } from "@/lib/utils";

const MISUSE = [
  { title: "Replayed bearer token", body: "Token copied from a CI log and used from an external host. No reasoning span exists, so every call is unmatched.", control: "Span reconciliation (+/-2s window)" },
  { title: "Token used without proof-of-possession", body: "Request lacks the DPoP proof bound to the agent runtime key. Rejected before reconciliation.", control: "DPoP binding" },
  { title: "Scope escalation on exchange", body: "Agent asks the token service for scopes wider than its contract (INC-1045).", control: "Contract-bound scope minting" },
  { title: "Ghost call inside a live session", body: "Attacker injects a call between legitimate ones using a valid token. The gateway receipt has no matching tool_call hash.", control: "Body hash join" },
];

export default function Credentials() {
  const receipts = useStore((s) => s.receipts);
  const agents = useStore((s) => s.agents);
  const simulate = useStore((s) => s.simulateGhostCall);
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched">("all");
  const [target, setTarget] = useState("agt-finance-02");
  const rows = receipts.filter((r) => filter === "all" || (filter === "matched" ? r.matched : !r.matched));
  const unmatched = receipts.filter((r) => !r.matched).length;

  const columns = useMemo<ColumnDef<CredentialReceipt, unknown>[]>(
    () => [
      { id: "ts", header: "Time", accessorKey: "ts", cell: ({ getValue }) => <Mono className="whitespace-nowrap text-subtle">{fmtDateTime(getValue() as number)}</Mono> },
      { id: "agent", header: "Agent", accessorKey: "agentId", cell: ({ getValue }) => <AgentLink agentId={getValue() as string} /> },
      { id: "cred", header: "Credential", accessorKey: "credentialId", cell: ({ getValue }) => <Mono className="text-muted">{getValue() as string}</Mono> },
      { id: "req", header: "Request", accessorFn: (r) => `${r.method} ${r.endpoint}`, cell: ({ row: { original: r } }) => <Mono className="text-fg"><span className="text-subtle">{r.method}</span> {r.endpoint}</Mono> },
      { id: "ip", header: "Source", accessorKey: "sourceIp", cell: ({ row: { original: r } }) => <Mono className={r.matched ? "text-muted" : "text-critical"}>{r.sourceIp}</Mono> },
      {
        id: "span",
        header: "Reasoning span",
        accessorKey: "matched",
        cell: ({ row: { original: r } }) =>
          r.matched ? (
            <Badge tone="healthy"><Link2 /> {r.spanId}</Badge>
          ) : (
            <Badge tone="critical"><Link2Off /> unmatched</Badge>
          ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Credential Integrity"
        description="Every API call made with an agent's token must match a reasoning span the agent emitted. A call with no thought behind it is a ghost credential."
        meta={<SimTag />}
        actions={
          <>
            <Select ariaLabel="Agent token" value={target} onValueChange={setTarget} className="w-48" options={agents.filter((a) => !a.isCanary).map((a) => ({ value: a.id, label: a.name }))} />
            <Button
              variant="danger"
              onClick={() => {
                simulate(target);
                setFilter("unmatched");
                toast.error("Ghost credential detected", { description: `${agents.find((a) => a.id === target)?.name} token used with no matching span. Blocked (simulated).` });
              }}
            >
              <Zap /> Simulate stolen-token call
            </Button>
          </>
        }
      />
      <Panel className="mb-4 grid grid-cols-2 md:grid-cols-4 [&>*]:border-border md:[&>*:not(:last-child)]:border-r">
        <Stat label="Receipts reconciled" icon={<ShieldCheck />} value={receipts.length} sub="Gateway calls in window" />
        <Stat label="Matched to spans" icon={<Link2 />} tone="healthy" value={receipts.length - unmatched} sub="Hash join within 2s" />
        <Stat label="Unmatched" icon={<Link2Off />} tone={unmatched ? "critical" : "healthy"} value={unmatched} sub="Treated as token misuse" />
        <Stat label="DPoP-bound tokens" icon={<KeyRound />} value={`${agents.filter((a) => !a.isCanary && a.status !== "quarantined").length}/${agents.filter((a) => !a.isCanary).length}`} sub="TTL 15 minutes" />
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-8">
          <PanelHeader
            title="API reconciliation"
            actions={
              <div className="flex gap-1">
                {(["all", "matched", "unmatched"] as const).map((f) => (
                  <Button key={f} size="sm" variant={filter === f ? "secondary" : "ghost"} onClick={() => setFilter(f)} aria-pressed={filter === f} className="capitalize">
                    {f}
                  </Button>
                ))}
              </div>
            }
          />
          <DataTable data={rows} columns={columns} initialSort={[{ id: "ts", desc: true }]} rowClassName={(r) => (!r.matched ? "bg-critical-soft/30" : undefined)} />
        </Panel>
        <Panel className="xl:col-span-4">
          <PanelHeader title="Token misuse scenarios" />
          <ul className="divide-y divide-border">
            {MISUSE.map((m) => (
              <li key={m.title} className="px-4 py-3">
                <div className="text-[13px] font-medium">{m.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{m.body}</p>
                <Badge tone="accent" className="mt-2">{m.control}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
