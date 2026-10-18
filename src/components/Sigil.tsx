import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * EXORCIST sigil: the role is a ring; the dot is the agent that steps outside it.
 * A single geometric mark, used for the logo, loaders and empty states.
 */
export function Sigil({ className, animated, tone = "var(--fg)", escape = "var(--accent)" }: { className?: string; animated?: boolean; tone?: string; escape?: string }) {
  const reduce = useReducedMotion();
  // Ring with a 50 degree gap at the upper right; the escaping dot sits just outside the gap.
  const r = 10;
  const cx = 16;
  const cy = 16;
  const a0 = (-20 * Math.PI) / 180;
  const a1 = (-70 * Math.PI) / 180;
  const start = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
  const end = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
  const d = `M ${start[0]} ${start[1]} A ${r} ${r} 0 1 1 ${end[0]} ${end[1]}`;
  return (
    <svg viewBox="0 0 32 32" className={cn("shrink-0", className)} aria-hidden>
      <path d={d} fill="none" stroke={tone} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={2.2} fill={tone} opacity={0.9} />
      <motion.circle
        r={2.6}
        fill={escape}
        initial={false}
        animate={animated && !reduce ? { cx: [24.4, 26.2, 24.4], cy: [7.6, 5.8, 7.6] } : { cx: 25.2, cy: 6.8 }}
        transition={animated && !reduce ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Sigil className="size-6" />
      <span className="text-[13px] font-semibold tracking-[0.22em] text-fg">EXORCIST</span>
    </span>
  );
}
