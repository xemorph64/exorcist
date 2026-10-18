import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Bot, Database, FileText, Globe, Gavel, Wrench, Flag, CircleDot, KeyRound, Radar } from "lucide-react";
import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "../ui/primitives";

export type SecNodeKind = "task" | "document" | "agent" | "tool" | "resource" | "destination" | "policy" | "credential" | "decoy" | "step";

export interface SecNodeData extends Record<string, unknown> {
  label: string;
  sub?: string;
  kind: SecNodeKind;
  tone?: Tone;
  ts?: string;
  dim?: boolean;
  pulse?: boolean;
  badge?: string;
  vertical?: boolean;
}

export type SecNode = Node<SecNodeData, "sec">;

const ICON: Record<SecNodeKind, typeof Bot> = {
  task: Flag,
  document: FileText,
  agent: Bot,
  tool: Wrench,
  resource: Database,
  destination: Globe,
  policy: Gavel,
  credential: KeyRound,
  decoy: Radar,
  step: CircleDot,
};

const ring: Record<Tone, string> = {
  neutral: "border-border",
  accent: "border-accent/60",
  healthy: "border-healthy/50",
  warning: "border-warning/60",
  critical: "border-critical/70",
  info: "border-info/50",
};
const iconTone: Record<Tone, string> = {
  neutral: "text-subtle bg-elevated",
  accent: "text-accent bg-accent-soft",
  healthy: "text-healthy bg-healthy-soft",
  warning: "text-warning bg-warning-soft",
  critical: "text-critical bg-critical-soft",
  info: "text-info bg-info-soft",
};

export const SecNodeView = memo(function SecNodeView({ data, selected }: NodeProps<SecNode>) {
  const Icon = ICON[data.kind];
  const tone = data.tone ?? "neutral";
  return (
    <div
      className={cn(
        "relative w-[176px] rounded-xl border bg-surface px-2.5 py-2 transition-[opacity,box-shadow] duration-300",
        ring[tone],
        data.dim && "opacity-35",
        selected && "ring-2 ring-accent/50",
        data.pulse && "shadow-[0_0_0_4px_var(--critical-soft)]",
      )}
    >
      <Handle type="target" position={data.vertical ? Position.Top : Position.Left} className="!size-1.5 !border-0 !bg-border-strong" />
      <div className="flex items-start gap-2">
        <span className={cn("mt-px grid size-6 shrink-0 place-items-center rounded-md", iconTone[tone])}>
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-medium leading-4 text-fg">{data.label}</div>
          {data.sub && <div className="truncate font-mono text-[10px] leading-4 text-muted">{data.sub}</div>}
          {data.ts && <div className="font-mono text-[10px] leading-4 text-subtle">{data.ts}</div>}
        </div>
      </div>
      {data.badge && (
        <span className={cn("absolute -top-2 right-2 rounded px-1 text-[9px] font-semibold uppercase tracking-wide", iconTone[tone])}>{data.badge}</span>
      )}
      <Handle type="source" position={data.vertical ? Position.Bottom : Position.Right} className="!size-1.5 !border-0 !bg-border-strong" />
    </div>
  );
});

export interface LaneData extends Record<string, unknown> {
  label: string;
  hint: string;
  height: number;
}
export type LaneNode = Node<LaneData, "lane">;

/** Column backdrop with a header, so a provenance graph reads left to right as a story. */
export const LaneNodeView = memo(function LaneNodeView({ data }: NodeProps<LaneNode>) {
  return (
    <div className="pointer-events-none w-[216px] rounded-2xl border border-dashed border-border bg-fg/[0.015]" style={{ height: data.height }}>
      <div className="px-3 pt-2.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{data.label}</div>
        <div className="text-[10.5px] text-subtle">{data.hint}</div>
      </div>
    </div>
  );
});

export const nodeTypes = { sec: SecNodeView, lane: LaneNodeView };

export function edgeStyle(tone: Tone | "muted", dashed = false) {
  const color =
    tone === "muted" ? "var(--border-strong)" : tone === "neutral" ? "var(--subtle)" : `var(--${tone === "accent" ? "accent" : tone})`;
  return { stroke: color, strokeWidth: tone === "muted" ? 1.25 : 1.75, strokeDasharray: dashed ? "5 4" : undefined };
}
