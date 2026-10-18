import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Ghost, Play, ShieldCheck } from "lucide-react";
import { useStore } from "@/store/useStore";
import { SCENARIOS, scenarioById } from "@/data/scenarios";
import type { Incident } from "@/data/types";
import { Panel, PanelHeader, Badge, Mono, SimTag } from "@/components/ui/primitives";
import { Select } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { AgentLink, PageHeader } from "@/components/domain";
import { ReplayCompare } from "@/components/ReplayCompare";
import { cn } from "@/lib/utils";

const MATRIX: { r0: boolean; r1: boolean | null; r2: boolean | null; verdict: string }[] = [
  { r0: false, r1: null, r2: null, verdict: "Inconclusive: not reproducible from agent context" },
  { r0: true, r1: false, r2: true, verdict: "Injected by suspect source (strongest evidence)" },
  { r0: true, r1: false, r2: false, verdict: "Likely injected by suspect source" },
  { r0: true, r1: true, r2: false, verdict: "Task-driven (legitimate unless out of role)" },
  { r0: true, r1: true, r2: true, verdict: "Persistent: check memory and tool descriptions next" },
];

function Mark({ v }: { v: boolean | null }) {
  if (v === null) return <span className="text-subtle">any</span>;
  return <span className={v ? "text-critical" : "text-healthy"}>{v ? "action" : "no action"}</span>;
}

export default function GhostReplay() {
  const incidents = useStore((s) => s.incidents);
  const [params, setParams] = useSearchParams();
  const replayable = incidents.filter((i) => i.replay.runs.length);
  const incId = params.get("incident");
  const scnId = params.get("scenario");
  const incident: Incident | undefined = incidents.find((i) => i.id === incId) ?? (scnId ? undefined : replayable[0]);
  const scenario = scenarioById(scnId ?? incident?.scenarioId ?? "");
  const replay = incident?.replay ?? scenario?.replay ?? SCENARIOS[0].replay;
  const agentId = incident?.agentIds[0] ?? scenario?.targetAgentId ?? "agt-procure-01";
  const [phase, setPhase] = useState<"idle" | "running" | "done">("done");
  const [progress, setProgress] = useState(9);
  const [key, setKey] = useState(0);

  const run = () => {
    setPhase("running");
    setProgress(0);
  };
  useEffect(() => {
    if (phase !== "running") return;
    if (progress >= 9) {
      setPhase("done");
      setKey((k) => k + 1);
      return;
    }
    const t = setTimeout(() => setProgress((p) => p + 1), 260);
    return () => clearTimeout(t);
  }, [phase, progress]);

  const outcome = useMemo(() => {
    const [r0, r1, r2] = replay.runs.map((r) => r.actionReproduced >= 2);
    return MATRIX.findIndex((m) => m.r0 === r0 && (m.r1 === null || m.r1 === r1) && (m.r2 === null || m.r2 === r2));
  }, [replay]);

  const options = [
    ...replayable.map((i) => ({ value: `i:${i.id}`, label: `${i.id} / ${i.title}` })),
    ...SCENARIOS.filter((s) => s.legitimate).map((s) => ({ value: `s:${s.id}`, label: `Control / ${s.name}` })),
  ];
  const value = incident ? `i:${incident.id}` : `s:${scnId}`;

  return (
    <div>
      <PageHeader
        title="Ghost Replay"
        description="The flagged step is re-run in a sandbox with stubbed tools: once unchanged, once with the suspect source sanitized, once with the user task masked. Differences point to what drove the action."
        meta={<SimTag label="Simulated replay" />}
        actions={
          <>
            <Select ariaLabel="Incident" value={value} onValueChange={(v) => { setParams(v.startsWith("i:") ? { incident: v.slice(2) } : { scenario: v.slice(2) }, { replace: true }); setKey((k) => k + 1); }} options={options} className="w-80" />
            <Button variant="primary" onClick={run} disabled={phase === "running"}>
              <Play /> {phase === "running" ? "Replaying" : "Run replay"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-9">
          <PanelHeader
            title="Counterfactual runs"
            icon={<Ghost />}
            description={incident ? incident.title : scenario?.name}
            actions={<AgentLink agentId={agentId} />}
          />
          <div className="p-4">
            {phase === "running" ? (
              <div className="grid h-[320px] place-items-center">
                <div className="w-full max-w-sm space-y-3 text-center">
                  <p className="text-[13px]">Replaying flagged step in sandbox</p>
                  <div className="grid grid-cols-9 gap-1">
                    {Array.from({ length: 9 }, (_, i) => (
                      <motion.span key={i} className={cn("h-1.5 rounded-full", i < progress ? "bg-accent" : "bg-elevated")} animate={{ opacity: i === progress ? [0.4, 1, 0.4] : 1 }} transition={{ repeat: Infinity, duration: 0.8 }} />
                    ))}
                  </div>
                  <Mono className="text-muted">run {Math.min(progress + 1, 9)} of 9 / {["R0", "R1", "R2"][Math.floor(Math.min(progress, 8) / 3)]}</Mono>
                </div>
              </div>
            ) : (
              <ReplayCompare replay={replay} playKey={key} />
            )}
          </div>
        </Panel>

        <div className="space-y-4 xl:col-span-3">
          <Panel>
            <PanelHeader title="Verdict matrix" description="Rule used to classify the replay" />
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border text-subtle">
                    <th className="px-3 py-2 text-left font-medium">R0</th>
                    <th className="px-2 py-2 text-left font-medium">R1</th>
                    <th className="px-2 py-2 text-left font-medium">R2</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((m, i) => (
                    <tr key={i} className={cn("border-b border-border last:border-0", i === outcome && "bg-accent-soft")}>
                      <td className="px-3 pt-2 align-top" colSpan={3}>
                        <div className="grid grid-cols-3 gap-2 font-mono">
                          <Mark v={m.r0} />
                          <Mark v={m.r1} />
                          <Mark v={m.r2} />
                        </div>
                        <div className={cn("pb-2 pt-1", i === outcome ? "text-fg" : "text-muted")}>{m.verdict}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel className="p-4 text-xs">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" />
              <span className="text-[13px] font-medium">How to read this</span>
            </div>
            <ul className="space-y-1.5 leading-relaxed text-muted">
              <li>Action vanishes when the source is sanitized: the source most likely drove it.</li>
              <li>Action vanishes when the task is masked: the task drove it, so it may be a legitimate change.</li>
              <li>Replays run at temperature 0 with stubbed tools. Treat results as evidence weight, never as proof.</li>
            </ul>
            {incident && (
              <Link to={`/incidents/${incident.id}`}>
                <Button size="sm" className="mt-3 w-full">Back to {incident.id}</Button>
              </Link>
            )}
            {!incident && scenario?.legitimate && <Badge tone="healthy" className="mt-3">No incident: change explained</Badge>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
