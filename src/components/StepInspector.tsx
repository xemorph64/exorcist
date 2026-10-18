import type { ScenarioStep } from "@/data/types";
import { computeRisk } from "@/lib/risk";
import { DecisionBadge, RiskPill } from "./domain";
import { Badge, Empty, Mono } from "./ui/primitives";
import { MousePointerClick } from "lucide-react";

export function StepInspector({ step, contractId }: { step: ScenarioStep | null; contractId?: string }) {
  if (!step)
    return <Empty icon={<MousePointerClick />} title="Select a node" body="Click any observed step to see the tool call, its source, the policy it was checked against and its risk contribution." />;
  const contribution = computeRisk(step.signals);
  const top = contribution.contributions.filter((c) => c.value > 0).sort((a, b) => b.weighted - a.weighted);
  return (
    <div className="space-y-4 p-4 text-xs">
      <div>
        <div className="text-sm font-medium text-fg">{step.title}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <DecisionBadge decision={step.decision} />
          <Badge tone="neutral" className="capitalize">{step.kind}</Badge>
        </div>
      </div>
      <dl className="grid grid-cols-[92px_1fr] gap-y-2.5">
        <dt className="text-subtle">Tool call</dt>
        <dd><Mono className="break-all text-fg">{step.tool}</Mono></dd>
        <dt className="text-subtle">Target</dt>
        <dd><Mono className="break-all">{step.target}</Mono></dd>
        <dt className="text-subtle">Source</dt>
        <dd className={step.source.startsWith("T-") ? "font-mono text-warning" : "font-mono"}>{step.source}</dd>
        <dt className="text-subtle">Policy</dt>
        <dd className={step.policy ? "text-critical" : "text-muted"}>{step.policy ?? `Within ${contractId ?? "role contract"}`}</dd>
        <dt className="text-subtle">Step risk</dt>
        <dd><RiskPill score={contribution.score} /></dd>
      </dl>
      {top.length > 0 && (
        <div>
          <div className="mb-1.5 text-subtle">Signals raised at this step</div>
          <div className="flex flex-wrap gap-1.5">
            {top.map((c) => (
              <Badge key={c.key} tone={c.weighted > 0.5 ? "critical" : "warning"}>
                {c.label} <span className="font-mono">{c.value.toFixed(2)}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="mb-1 text-subtle">Evidence</div>
        <p className="leading-relaxed text-fg">{step.evidence}</p>
      </div>
    </div>
  );
}
