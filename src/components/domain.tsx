import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AgentStatus, Decision, IncidentStatus, Severity, Signals } from "@/data/types";
import { BAND_META, bandFor, computeRisk, getBandThresholds, SIGNAL_META } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { Badge, toneBg, toneText, toneVar, type Tone } from "./ui/primitives";
import { Tip } from "./ui/radix";
import { useStore } from "@/store/useStore";

export const severityTone: Record<Severity, Tone> = { critical: "critical", high: "warning", medium: "info", low: "neutral" };
export const statusTone: Record<AgentStatus, Tone> = {
  protected: "healthy",
  learning: "info",
  held: "warning",
  restricted: "warning",
  quarantined: "critical",
};
export const incidentTone: Record<IncidentStatus, Tone> = {
  open: "critical",
  investigating: "warning",
  contained: "accent",
  resolved: "healthy",
  false_positive: "neutral",
};
export const decisionTone: Record<Decision, Tone> = {
  allow: "healthy",
  step_up: "info",
  hold: "warning",
  restrict: "warning",
  block: "critical",
  quarantine: "critical",
};

const label = (s: string) => s.replace(/_/g, " ");

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge tone={severityTone[severity]} className="capitalize">
      <span className={cn("size-1.5 rounded-full", toneBg[severityTone[severity]])} aria-hidden />
      {severity}
    </Badge>
  );
}

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  return (
    <Badge tone={statusTone[status]} className="capitalize">
      {label(status)}
    </Badge>
  );
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <Badge tone={incidentTone[status]} className="capitalize">
      {label(status)}
    </Badge>
  );
}

export function DecisionBadge({ decision }: { decision: Decision }) {
  return (
    <Badge tone={decisionTone[decision]} className="font-mono uppercase tracking-wide">
      {label(decision)}
    </Badge>
  );
}

export function riskTone(score: number): Tone {
  return BAND_META[bandFor(score)].tone;
}

/** Animated count to communicate score changes as they happen (discrete updates, not per-frame input). */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      from.current = value;
      return;
    }
    const c = animate(from.current, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    from.current = value;
    return () => c.stop();
  }, [value, reduce]);
  return <span className={cn("tabular", className)}>{display}</span>;
}

export function RiskPill({ score, className }: { score: number; className?: string }) {
  const tone = riskTone(score);
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[12px] tabular", toneText[tone], className)}>
      <span className="relative h-1.5 w-8 overflow-hidden rounded-full bg-elevated">
        <span className={cn("absolute inset-y-0 left-0 rounded-full", toneBg[tone])} style={{ width: `${score}%` }} />
      </span>
      {score}
    </span>
  );
}

export function BandBadge({ score }: { score: number }) {
  const b = BAND_META[bandFor(score)];
  return <Badge tone={b.tone}>{b.label}</Badge>;
}

/**
 * Integrity ring. The ring is the role boundary (same idea as the sigil); the colored arc is how far
 * the agent has drifted from it. Ticks mark the band thresholds. The dot at the arc end is the agent.
 */
export function RiskGauge({ score, size = 168, label: lbl = "Risk score" }: { score: number; size?: number; label?: string }) {
  const tone = riskTone(score);
  const reduce = useReducedMotion();
  const th = getBandThresholds();
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const angle = (v: number) => ((v / 100) * 360 - 90) * (Math.PI / 180);
  const end = angle(Math.max(0.5, score));
  return (
    <div className="relative" style={{ width: size, height: size }} role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={lbl}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border-strong)" strokeWidth={1.25} />
        <circle cx={cx} cy={cx} r={r - 9} fill="none" stroke="var(--border)" strokeWidth={1} strokeDasharray="1 5" />
        {[th.stepUp, th.restrict, th.quarantine].map((t) => {
          const a = angle(t);
          return <line key={t} x1={cx + (r - 5) * Math.cos(a)} y1={cx + (r - 5) * Math.sin(a)} x2={cx + (r + 5) * Math.cos(a)} y2={cx + (r + 5) * Math.sin(a)} stroke="var(--subtle)" strokeWidth={1.25} />;
        })}
        <motion.circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={toneVar[tone]}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          transform={`rotate(-90 ${cx} ${cx})`}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - Math.max(0.5, score) / 100) }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 20 }}
        />
        <motion.circle
          r={4.5}
          fill={toneVar[tone]}
          stroke="var(--surface)"
          strokeWidth={2}
          initial={false}
          animate={{ cx: cx + r * Math.cos(end), cy: cx + r * Math.sin(end) }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedNumber value={score} className={cn("text-[40px] font-semibold leading-none tracking-[-0.04em]", toneText[tone])} />
        <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{BAND_META[bandFor(score)].label}</span>
      </div>
    </div>
  );
}

export function SignalBreakdown({ signals, compact }: { signals: Partial<Signals>; compact?: boolean }) {
  const br = computeRisk(signals);
  const rows = compact ? br.contributions.filter((c) => c.value > 0) : br.contributions;
  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-xs text-muted">No active signals. Behavior matches the role baseline.</p>}
      {rows.map((c) => (
        <Tip key={c.key} content={`${SIGNAL_META[c.key].hint}. Weight ${SIGNAL_META[c.key].weight}, signal ${c.value.toFixed(2)}`}>
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
            <span className="truncate text-xs text-muted">{c.label}</span>
            <span className="font-mono text-[11px] tabular text-fg">{(c.weighted * 100).toFixed(0)}</span>
            <div className="col-span-2 h-1 overflow-hidden rounded-full bg-elevated">
              <motion.div
                className="h-full rounded-full"
                style={{ background: c.weighted > 0.5 ? "var(--critical)" : c.weighted > 0.25 ? "var(--warning)" : "var(--accent)" }}
                initial={false}
                animate={{ width: `${c.weighted * 100}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              />
            </div>
          </div>
        </Tip>
      ))}
      {br.floor && (
        <p className="pt-1 text-[11px] text-warning">
          Policy floor applied: {br.floor.reason} ({br.floor.value})
        </p>
      )}
    </div>
  );
}

const FRAMEWORK_MARK: Record<string, string> = {
  LangGraph: "LG",
  CrewAI: "CR",
  AutoGen: "AG",
  "OpenAI Agents SDK": "OA",
  "MCP Custom": "MC",
};

export function AgentMark({ agentId, size = "md" }: { agentId: string; size?: "sm" | "md" | "lg" }) {
  const agent = useStore((s) => s.agents.find((a) => a.id === agentId));
  const initials = agent?.name.split(" ").map((w) => w[0]).slice(0, 2).join("") ?? "?";
  const tone = agent ? statusTone[agent.status] : "neutral";
  const dims = size === "sm" ? "size-6 text-[10px]" : size === "lg" ? "size-11 text-sm" : "size-8 text-[11px]";
  return (
    <span className={cn("relative grid shrink-0 place-items-center rounded-md border border-border bg-elevated font-semibold text-fg", dims)}>
      {initials}
      <span className={cn("absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-surface", toneBg[tone])} aria-hidden />
    </span>
  );
}

export function AgentLink({ agentId, showRole }: { agentId: string; showRole?: boolean }) {
  const agent = useStore((s) => s.agents.find((a) => a.id === agentId));
  if (!agent) return <span className="font-mono text-xs text-muted">{agentId}</span>;
  return (
    <Link to={`/agents/${agent.id}`} className="group inline-flex min-w-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <AgentMark agentId={agentId} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-[13px] text-fg group-hover:text-accent">{agent.name}</span>
        {showRole && <span className="block truncate text-[11px] text-muted">{agent.role}</span>}
      </span>
    </Link>
  );
}

export function FrameworkTag({ framework }: { framework: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="grid h-4 min-w-5 place-items-center rounded-sm bg-elevated px-1 font-mono text-[9px] font-semibold text-fg">{FRAMEWORK_MARK[framework] ?? "?"}</span>
      {framework}
    </span>
  );
}

export function PageHeader({ title, description, actions, meta }: { title: string; description?: string; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-7 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-fg">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label: l, value, sub, tone = "neutral", icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; icon?: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-xs text-muted [&_svg]:size-3.5">
        {icon}
        {l}
      </div>
      <div className={cn("mt-1.5 text-2xl font-semibold tracking-tight tabular", tone === "neutral" ? "text-fg" : toneText[tone])}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-muted">{sub}</div>}
    </div>
  );
}
