import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, Copy, FilePlus2, Save, Send, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { RoleContract } from "@/data/types";
import { Panel, PanelHeader, Badge, Input, Label, Mono } from "@/components/ui/primitives";
import { Slider } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/domain";
import { cn } from "@/lib/utils";

function toYaml(c: RoleContract) {
  const list = (k: string, v: string[]) => `${k}:\n${v.length ? v.map((x) => `  - ${JSON.stringify(x)}`).join("\n") : "  []"}`;
  return [
    `apiVersion: exorcist.dev/v1`,
    `kind: RoleContract`,
    `metadata:`,
    `  id: ${c.id}`,
    `  name: ${JSON.stringify(c.name)}`,
    `  version: ${c.version}`,
    `  status: ${c.status}`,
    `spec:`,
    `  role: ${JSON.stringify(c.role)}`,
    `  agents: [${c.agentIds.join(", ")}]`,
    ...list("  allowedTools", c.allowedTools).split("\n").map((l, i) => (i === 0 ? l : "  " + l)),
    ...list("  allowedDomains", c.allowedDomains).split("\n").map((l, i) => (i === 0 ? l : "  " + l)),
    ...list("  dataClasses", c.dataClasses).split("\n").map((l, i) => (i === 0 ? l : "  " + l)),
    ...list("  prohibited", c.prohibited).split("\n").map((l, i) => (i === 0 ? l : "  " + l)),
    `  delegation:`,
    `    maxDepth: ${c.maxDelegationDepth}`,
    `  response:`,
    `    stepUpAbove: ${c.stepUpOver}`,
    `  approvers: [${c.approvers.map((a) => JSON.stringify(a)).join(", ")}]`,
  ].join("\n");
}

function TagField({ label, values, onChange, tone, id }: { label: string; values: string[]; onChange: (v: string[]) => void; tone: "healthy" | "critical" | "info"; id: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-border bg-bg p-1.5 focus-within:border-accent">
        {values.map((v) => (
          <Badge key={v} tone={tone} className="font-mono">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="opacity-70 hover:opacity-100">
              <X />
            </button>
          </Badge>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={add}
          placeholder="Type and press Enter"
          className="h-6 min-w-32 flex-1 bg-transparent px-1 text-[12px] text-fg placeholder:text-subtle focus:outline-none"
        />
      </div>
    </div>
  );
}

export default function Contracts() {
  const contracts = useStore((s) => s.contracts);
  const { saveContract, submitContract, approveContract } = useStore.getState();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id") ?? contracts[1].id;
  const original = contracts.find((c) => c.id === selectedId) ?? contracts[0];
  const [draft, setDraft] = useState<RoleContract>(original);
  useEffect(() => setDraft(original), [original]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const yaml = useMemo(() => toYaml(draft), [draft]);
  const set = <K extends keyof RoleContract>(k: K, v: RoleContract[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const bump = (v: string) => {
    const [a, b] = v.split(".").map(Number);
    return `${a}.${b + 1}.0`;
  };

  return (
    <div>
      <PageHeader
        title="Role Contracts"
        description="The declared identity each agent is held to: what it may call, where it may send data and what it must never touch."
        actions={
          <Button
            onClick={() => {
              const id = `rc-new-${Date.now().toString(36).slice(-4)}`;
              saveContract({ id, name: "Untitled role", role: "Untitled role", version: "0.1.0", status: "draft", agentIds: [], allowedTools: [], allowedDomains: [], dataClasses: [], prohibited: ["external egress"], maxDelegationDepth: 0, stepUpOver: 40, approvers: ["Security Engineering"], updatedHoursAgo: 0 });
              setParams({ id });
            }}
          >
            <FilePlus2 /> New contract
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-3">
          <PanelHeader title="Contracts" description={`${contracts.length} total`} />
          <ul className="max-h-[680px] overflow-y-auto p-1.5">
            {contracts.map((c) => (
              <li key={c.id}>
                <button onClick={() => setParams({ id: c.id })} className={cn("w-full rounded-md px-2.5 py-2 text-left transition-colors", c.id === selectedId ? "bg-elevated" : "hover:bg-hover/60")}>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px]">{c.name}</span>
                    <Badge tone={c.status === "active" ? "healthy" : c.status === "pending_approval" ? "warning" : "neutral"} className="ml-auto shrink-0">
                      {c.status === "pending_approval" ? "pending" : c.status}
                    </Badge>
                  </div>
                  <Mono className="text-[11px] text-subtle">{c.id} v{c.version}</Mono>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="xl:col-span-5">
          <PanelHeader
            title="Editor"
            description={dirty ? "Unsaved changes" : `Last updated ${original.updatedHoursAgo}h ago`}
            actions={
              <>
                <Button size="sm" variant="ghost" disabled={!dirty} onClick={() => setDraft(original)}>Discard</Button>
                <Button
                  size="sm"
                  disabled={!dirty}
                  onClick={() => {
                    if (original.status === "active") {
                      const version = bump(original.version);
                      const id = `${original.id}-v${version.replace(/\./g, "")}`;
                      saveContract({ ...draft, id, version, status: "draft", updatedHoursAgo: 0 });
                      setParams({ id });
                      toast.success(`Draft v${version} created`, { description: "Active contracts are immutable. Submit the draft for approval to replace it." });
                    } else {
                      saveContract(draft);
                      toast.success("Draft saved");
                    }
                  }}
                >
                  <Save /> Save draft
                </Button>
              </>
            }
          />
          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="cn">Name</Label>
                <Input id="cn" value={draft.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cr">Role</Label>
                <Input id="cr" value={draft.role} onChange={(e) => set("role", e.target.value)} />
              </div>
            </div>
            <TagField id="tools" label="Allowed tools" values={draft.allowedTools} onChange={(v) => set("allowedTools", v)} tone="healthy" />
            <TagField id="domains" label="Allowed domains" values={draft.allowedDomains} onChange={(v) => set("allowedDomains", v)} tone="healthy" />
            <TagField id="data" label="Data classes" values={draft.dataClasses} onChange={(v) => set("dataClasses", v)} tone="info" />
            <TagField id="prohibited" label="Prohibited" values={draft.prohibited} onChange={(v) => set("prohibited", v)} tone="critical" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Step-up above risk <Mono className="text-fg">{draft.stepUpOver}</Mono></Label>
                <Slider value={draft.stepUpOver} onValueChange={(v) => set("stepUpOver", v)} min={20} max={80} ariaLabel="Step-up threshold" />
              </div>
              <div>
                <Label>Max delegation depth <Mono className="text-fg">{draft.maxDelegationDepth}</Mono></Label>
                <Slider value={draft.maxDelegationDepth} onValueChange={(v) => set("maxDelegationDepth", v)} min={0} max={3} ariaLabel="Delegation depth" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
            <span className="text-xs text-muted">Approvers: {draft.approvers.join(", ")}</span>
            <div className="ml-auto flex gap-2">
              {original.status === "draft" && (
                <Button size="sm" variant="primary" disabled={dirty} onClick={() => { submitContract(original.id); toast.success("Submitted for two-person approval"); }}>
                  <Send /> Submit for approval
                </Button>
              )}
              {original.status === "pending_approval" && (
                <Button size="sm" variant="success" onClick={() => { approveContract(original.id); toast.success(`${original.id} v${original.version} approved and active`); }}>
                  <Check /> Approve
                </Button>
              )}
            </div>
          </div>
        </Panel>

        <Panel className="xl:col-span-4">
          <PanelHeader
            title="YAML preview"
            actions={
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(yaml); toast.success("YAML copied"); }}>
                <Copy /> Copy
              </Button>
            }
          />
          <pre className="max-h-[640px] overflow-auto p-4 font-mono text-[11.5px] leading-[1.65] text-muted">
            {yaml.split("\n").map((line, i) => {
              const m = line.match(/^(\s*-?\s*)([\w]+)(:)(.*)$/);
              return (
                <div key={i} className="whitespace-pre">
                  <span className="mr-3 inline-block w-5 select-none text-right text-subtle">{i + 1}</span>
                  {m ? (
                    <>
                      {m[1]}
                      <span className="text-accent">{m[2]}</span>
                      {m[3]}
                      <span className="text-fg">{m[4]}</span>
                    </>
                  ) : (
                    <span className="text-fg">{line}</span>
                  )}
                </div>
              );
            })}
          </pre>
        </Panel>
      </div>
    </div>
  );
}
