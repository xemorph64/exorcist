import type { ReactNode } from "react";
import type { SecurityEvent } from "@/data/types";

/** Shared Recharts styling so every chart reads as one system. */
export const axisProps = {
  stroke: "var(--subtle)",
  tick: { fill: "var(--subtle)", fontSize: 11, fontFamily: "Geist Mono Variable, monospace" },
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = { stroke: "var(--border)", strokeDasharray: "2 4", vertical: false } as const;

export function ChartTooltip({ active, payload, label, unit = "" }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: ReactNode; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-elevated px-2.5 py-2 text-xs shadow-panel">
      {label !== undefined && <div className="mb-1 font-mono text-[11px] text-muted">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto pl-3 font-mono tabular text-fg">
            {typeof p.value === "number" ? Math.round(p.value * 10) / 10 : p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export const SERIES = {
  accent: "var(--accent)",
  critical: "var(--critical)",
  warning: "var(--warning)",
  healthy: "var(--healthy)",
  info: "var(--info)",
  muted: "var(--subtle)",
};

export function riskTrend(events: SecurityEvent[], now: number, buckets = 18, bucketMs = 20 * 60_000) {
  const start = now - buckets * bucketMs;
  const out = Array.from({ length: buckets }, (_, i) => ({
    t: new Date(start + (i + 1) * bucketMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    avg: 0,
    peak: 0,
    blocked: 0,
    n: 0,
  }));
  for (const e of events) {
    if (e.ts < start || e.ts > now + bucketMs) continue;
    const i = Math.min(buckets - 1, Math.floor((e.ts - start) / bucketMs));
    const b = out[i];
    b.n++;
    b.avg += e.risk;
    b.peak = Math.max(b.peak, e.risk);
    if (e.decision === "block" || e.decision === "quarantine") b.blocked++;
  }
  let last = 12;
  return out.map((b) => {
    const avg = b.n ? b.avg / b.n : last;
    last = avg;
    return { ...b, avg: Math.round(avg * 10) / 10, peak: b.peak || Math.round(avg) };
  });
}
