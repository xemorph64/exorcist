import { motion, useReducedMotion } from "motion/react";
import { Info } from "lucide-react";
import type { Incident } from "@/data/types";
import { cn } from "@/lib/utils";
import { Badge, Mono } from "./ui/primitives";

const DANGEROUS = /hr\.|salary|base64|http\.post|upload_log|erp_write|canary|delegate\(canary\)|delegate\.message|external|export_all|billing_read/;

export function ReplayCompare({ replay, playKey = 0 }: { replay: Incident["replay"]; playKey?: number }) {
  const reduce = useReducedMotion();
  if (!replay.runs.length) return <p className="p-4 text-xs text-muted">No replay was required for this incident.</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {replay.runs.map((run, col) => {
          const reproduced = run.actionReproduced;
          return (
            <motion.div
              key={run.label + playKey}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: col * 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-lg border border-border bg-elevated/40"
            >
              <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                <span className="grid h-6 min-w-8 place-items-center rounded bg-accent-soft font-mono text-[11px] font-semibold text-accent">{run.label}</span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{run.name}</div>
                  <div className="truncate text-[11px] text-muted">{run.description}</div>
                </div>
              </div>
              <div className="px-3 py-3">
                <div className="mb-2 text-[11px] text-subtle">Execution path (temperature 0, k=3)</div>
                <ol className="space-y-1.5">
                  {run.path.length === 0 && <li className="text-xs text-muted">No agent action produced</li>}
                  {run.path.map((p, i) => {
                    const bad = DANGEROUS.test(p);
                    return (
                      <motion.li
                        key={p + i}
                        initial={reduce ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: col * 0.25 + 0.35 + i * 0.18 }}
                        className={cn("flex items-center gap-2 rounded border px-2 py-1 font-mono text-[11px]", bad ? "border-critical/40 bg-critical-soft text-critical" : "border-border bg-surface text-fg")}
                      >
                        <span className="text-subtle">{i + 1}</span>
                        {p}
                      </motion.li>
                    );
                  })}
                </ol>
                <div className="mt-3 flex items-center gap-2 text-[11px]">
                  <span className="text-subtle">Flagged action reproduced</span>
                  <span className="ml-auto flex gap-1" aria-label={`${reproduced} of 3 runs`}>
                    {[0, 1, 2].map((k) => (
                      <span key={k} className={cn("size-2.5 rounded-sm", k < reproduced ? "bg-critical" : "border border-border-strong")} />
                    ))}
                  </span>
                  <Mono className="text-fg">{reproduced}/3</Mono>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <motion.div
        key={"v" + playKey}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="rounded-lg border border-accent/30 bg-accent-soft/50 p-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-fg">{replay.verdict}</span>
          <Badge tone={replay.confidence === "strong" ? "critical" : replay.confidence === "moderate" ? "warning" : "neutral"} className="capitalize">
            {replay.confidence} evidence
          </Badge>
        </div>
        <p className="mt-1.5 flex gap-1.5 text-[11px] leading-relaxed text-muted">
          <Info className="mt-px size-3 shrink-0" />
          Counterfactual replay is diagnostic evidence, not proof of causality. LLM behavior is stochastic and sandboxed tools are stubs; analysts should weigh this with the provenance chain.
        </p>
      </motion.div>
    </div>
  );
}
