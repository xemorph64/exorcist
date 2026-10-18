import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import type { Scenario, ScenarioStep } from "@/data/types";
import { divergenceIndex, observedSteps, stepTone } from "@/lib/paths";
import { toneVar } from "../ui/primitives";

/**
 * Signature EXORCIST visual. The shaded lane is the role contract.
 * Inside the lane the agent is "in character"; the path that leaves it is the moment it breaks character.
 * Coordinates are computed in (t, h) space: t = progress along the task, h = distance outside the role (negative = outside).
 */

interface Pt {
  t: number;
  h: number;
}

const H_FOR: Record<ScenarioStep["kind"], number> = {
  normal: 0,
  suspicious: -62,
  deviation: -128,
  detection: -140,
  containment: -62,
  resume: -16,
};

function trim(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function RoleBoundaryGraph({
  scenario,
  revealed,
  includeResponse = true,
  selectedStepId,
  onSelect,
  vertical,
  compact,
}: {
  scenario: Scenario;
  revealed?: number;
  includeResponse?: boolean;
  selectedStepId?: string | null;
  onSelect?: (s: ScenarioStep | null) => void;
  vertical?: boolean;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const legit = !!scenario.legitimate;
  const steps = useMemo(() => observedSteps(scenario, includeResponse), [scenario, includeResponse]);
  const div = divergenceIndex(steps);
  const visible = revealed === undefined ? steps.length : steps.filter((st) => scenario.steps.indexOf(st) <= revealed).length;
  const cols = Math.max(steps.length, scenario.expectedPath.length);

  // Geometry
  const W = vertical ? 520 : 1000;
  const STEP = vertical ? 74 : (W - 150) / Math.max(1, cols - 1);
  const H = vertical ? 70 + (cols - 1) * STEP + 50 : compact ? 300 : 330;
  const BAND = 92; // lane thickness
  const C = vertical ? 168 : H - 120; // lane center (x in vertical, y in horizontal)
  const T0 = vertical ? 50 : 75;

  const P = (p: Pt) => (vertical ? { x: C - p.h, y: T0 + p.t * STEP } : { x: T0 + p.t * STEP, y: C + p.h });

  const hFor = (st: ScenarioStep, i: number) => {
    if (i < div) return 0;
    if (legit) return st.kind === "resume" ? 0 : -24; // a legitimate change flexes inside the lane, never outside
    return H_FOR[st.kind];
  };

  const obs = steps.map((st, i) => ({ st, i, p: P({ t: i, h: hFor(st, i) }), tone: stepTone(st, legit) }));
  // After the divergence, the expected path is stretched to span the same distance as the agent's path,
  // so a resumed workflow rejoins the role at its natural end point.
  const lastExp = scenario.expectedPath.length - 1;
  const anchor = Math.max(0, div - 1);
  const expT = (i: number) => (i <= anchor || lastExp === anchor ? i : anchor + ((i - anchor) * (cols - 1 - anchor)) / (lastExp - anchor));
  const expected = scenario.expectedPath.map((label, i) => ({ label, i, p: P({ t: expT(i), h: i < div ? 0 : 22 }) }));

  // Smooth path through points with tangents along the direction of travel
  const curve = (pts: { x: number; y: number }[]) => {
    if (!pts.length) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1];
      const b = pts[k];
      if (vertical) {
        const my = (a.y + b.y) / 2;
        d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
      } else {
        const mx = (a.x + b.x) / 2;
        d += ` C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
      }
    }
    return d;
  };

  const shown = obs.slice(0, visible);
  const sharedPts = shown.filter((o) => o.i < div).map((o) => o.p);
  const branchPts = shown.filter((o) => o.i >= div - 1 && o.i >= 0).map((o) => o.p);
  const expPts = expected.filter((e) => e.i >= div - 1).map((e) => e.p);
  const last = shown[shown.length - 1];
  const rejoin = last?.st.kind === "resume" ? [last.p, expected[expected.length - 1].p] : null;
  const branchColor = legit ? "var(--info)" : "var(--critical)";

  // Lane rectangle
  const lane = vertical
    ? { x: C - BAND / 2, y: 18, w: BAND, h: H - 36 }
    : { x: 24, y: C - BAND / 2, w: W - 48, h: BAND };
  const outside = vertical ? { x: C + BAND / 2 + 6, y: 18, w: W - (C + BAND / 2 + 6) - 12, h: H - 36 } : { x: 24, y: 14, w: W - 48, h: C - BAND / 2 - 20 };

  const draw = (delay = 0) =>
    reduce ? {} : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] as const } };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full select-none" role="img" aria-label={`Role boundary graph for ${scenario.name}`} onClick={() => onSelect?.(null)}>
      <defs>
        <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--critical)" strokeOpacity="0.09" strokeWidth="2" />
        </pattern>
        <linearGradient id="laneFill" x1="0" x2={vertical ? "1" : "0"} y1="0" y2={vertical ? "0" : "1"}>
          <stop offset="0%" stopColor="var(--fg)" stopOpacity="0.045" />
          <stop offset="100%" stopColor="var(--fg)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Outside-of-role zone */}
      <rect {...{ x: outside.x, y: outside.y, width: outside.w, height: outside.h }} rx={14} fill={legit ? "transparent" : "url(#hatch)"} />
      <text
        x={vertical ? outside.x + outside.w - 8 : outside.x + 14}
        y={vertical ? outside.y + 18 : outside.y + 20}
        textAnchor={vertical ? "end" : "start"}
        className="fill-[var(--subtle)] font-mono text-[10px] uppercase tracking-[0.14em]"
      >
        Outside role
      </text>

      {/* The role lane */}
      <rect x={lane.x} y={lane.y} width={lane.w} height={lane.h} rx={BAND / 2} fill="url(#laneFill)" stroke="var(--border-strong)" strokeOpacity="0.7" />
      <text
        x={vertical ? lane.x + lane.w / 2 : lane.x + 22}
        y={vertical ? lane.y + 16 : lane.y + 18}
        textAnchor={vertical ? "middle" : "start"}
        className="fill-[var(--subtle)] font-mono text-[10px] uppercase tracking-[0.14em]"
      >
        {vertical ? "Role" : "Inside role"}
      </text>

      {/* Expected path continues quietly inside the lane */}
      {div < steps.length && <path d={curve(expPts)} fill="none" stroke="var(--subtle)" strokeWidth={1.5} strokeDasharray="4 5" />}
      {expected.map((e) =>
        e.i >= div ? (
          <g key={`exp-${e.i}`}>
            <circle cx={e.p.x} cy={e.p.y} r={5.5} fill="var(--surface)" stroke={rejoin && e.i === expected.length - 1 ? "var(--healthy)" : "var(--subtle)"} strokeWidth={1.5} strokeDasharray={rejoin && e.i === expected.length - 1 ? undefined : "2 2"} />
            <text
              x={vertical ? e.p.x - 14 : e.p.x}
              y={vertical ? e.p.y + 4 : e.p.y + 26}
              textAnchor={vertical ? "end" : "middle"}
              className="fill-[var(--subtle)] text-[11px]"
            >
              {trim(e.label, 20)}
            </text>
          </g>
        ) : null,
      )}

      {/* Observed path */}
      {sharedPts.length > 1 && <motion.path key={`s-${sharedPts.length}`} d={curve(sharedPts)} fill="none" stroke="var(--fg)" strokeOpacity={0.75} strokeWidth={2} {...draw()} />}
      {branchPts.length > 1 && <motion.path key={`b-${branchPts.length}-${scenario.id}`} d={curve(branchPts)} fill="none" stroke={branchColor} strokeWidth={2.25} {...draw(0.05)} />}
      {rejoin && <motion.path d={curve(rejoin)} fill="none" stroke="var(--healthy)" strokeWidth={2} strokeDasharray="5 4" {...draw(0.2)} />}

      {shown.map(({ st, i, p, tone }) => {
        const isDiv = i === div && !legit;
        const sel = st.id === selectedStepId;
        const color = i < div ? "var(--fg)" : toneVar[tone];
        const outsideNode = !legit && i >= div && hFor(st, i) < -40;
        const labelAbove = !vertical && (outsideNode || (i >= div && !legit));
        const lx = vertical ? (outsideNode || i >= div ? p.x + 16 : p.x - 16) : p.x;
        const ly = vertical ? p.y + 4 : labelAbove ? p.y - 18 : p.y + 26;
        const anchor = vertical ? (outsideNode || i >= div ? "start" : "end") : "middle";
        const label = i < div ? scenario.expectedPath[i] ?? st.title : st.short ?? st.title;
        return (
          <motion.g
            key={st.id}
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22, delay: revealed === undefined ? i * 0.08 : 0.15 }}
            style={{ transformOrigin: `${p.x}px ${p.y}px`, cursor: onSelect ? "pointer" : undefined }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(st);
            }}
          >
            {isDiv && !reduce && (
              <motion.circle cx={p.x} cy={p.y} r={14} fill="none" stroke="var(--critical)" strokeWidth={1.5} animate={{ r: [12, 22], opacity: [0.7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
            )}
            {sel && <circle cx={p.x} cy={p.y} r={13} fill="none" stroke="var(--fg)" strokeWidth={1.25} />}
            <circle cx={p.x} cy={p.y} r={18} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={i < div ? 5.5 : 7} fill={i < div ? "var(--bg)" : color} stroke={color} strokeWidth={2} />
            <text x={lx} y={ly} textAnchor={anchor} className="text-[11.5px] font-medium" fill={i < div ? "var(--muted)" : color}>
              {trim(label, 26)}
            </text>
            {!compact && (
              <text x={lx} y={ly + (vertical ? 14 : labelAbove ? -14 : 14)} textAnchor={anchor} className="fill-[var(--subtle)] font-mono text-[9.5px]">
                {trim(st.tool, 24)}
              </text>
            )}
            {isDiv && (
              <g>
                <line x1={p.x} y1={p.y} x2={vertical ? p.x + 6 : p.x} y2={vertical ? p.y + 30 : C - BAND / 2} stroke="var(--critical)" strokeOpacity={0.5} strokeDasharray="2 3" />
                <text
                  x={vertical ? p.x + 16 : p.x + 10}
                  y={vertical ? p.y + 34 : C - BAND / 2 - 8}
                  textAnchor="start"
                  className="font-mono text-[9.5px] uppercase tracking-[0.12em]"
                  fill="var(--critical)"
                >
                  Breaks character
                </text>
              </g>
            )}
          </motion.g>
        );
      })}

      {rejoin && (
        <text
          x={vertical ? expected[expected.length - 1].p.x - 14 : expected[expected.length - 1].p.x}
          y={vertical ? expected[expected.length - 1].p.y + 18 : expected[expected.length - 1].p.y + 40}
          textAnchor={vertical ? "end" : "middle"}
          className="font-mono text-[9.5px] uppercase tracking-[0.12em]"
          fill="var(--healthy)"
        >
          Work continues
        </text>
      )}
    </svg>
  );
}
