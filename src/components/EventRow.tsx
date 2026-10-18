import { Link } from "react-router-dom";
import { ArrowUpRight, Bot, Database, Globe, Gavel, KeyRound, Radar, Repeat, Wrench } from "lucide-react";
import type { SecurityEvent } from "@/data/types";
import { cn, fmtTime } from "@/lib/utils";
import { DecisionBadge, riskTone } from "./domain";
import { toneText } from "./ui/primitives";
import { useStore } from "@/store/useStore";

const KIND_ICON = {
  tool_call: Wrench,
  policy: Gavel,
  delegation: Repeat,
  egress: Globe,
  llm: Bot,
  credential: KeyRound,
  decoy: Radar,
  change: Database,
} as const;

export function EventRow({ e, dense, onClick, selected }: { e: SecurityEvent; dense?: boolean; onClick?: () => void; selected?: boolean }) {
  const agent = useStore((s) => s.agents.find((a) => a.id === e.agentId));
  const Icon = KIND_ICON[e.kind];
  const flagged = e.decision !== "allow";
  return (
    <div
      onClick={onClick}
      className={cn(
        "ticker-in group grid items-center gap-x-3 px-4 transition-colors",
        dense ? "grid-cols-[auto_1fr_auto] py-2" : "grid-cols-[64px_auto_minmax(0,1.2fr)_minmax(0,1fr)_auto_44px] py-2.5",
        onClick && "cursor-pointer hover:bg-hover/50",
        selected && "bg-hover/70",
        flagged && "bg-critical-soft/30",
      )}
    >
      {!dense && <span className="font-mono text-[11px] tabular text-subtle">{fmtTime(e.ts)}</span>}
      <span className={cn("grid size-6 place-items-center rounded-md border border-border bg-elevated", flagged ? "text-critical" : "text-subtle")}>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-[12px] text-fg">{e.action}</span>
          {e.simulated && dense && <span className="text-[10px] text-subtle">sim</span>}
        </div>
        <div className="truncate text-[11px] text-muted">
          {agent?.name ?? e.agentId}
          {dense ? ` / ${fmtTime(e.ts)}` : ""}
        </div>
      </div>
      {!dense && <span className="hidden truncate font-mono text-[11px] text-muted md:block">{e.target}</span>}
      <div className="flex items-center gap-2">
        <DecisionBadge decision={e.decision} />
        {e.incidentId && (
          <Link to={`/incidents/${e.incidentId}`} onClick={(ev) => ev.stopPropagation()} className="hidden items-center gap-0.5 font-mono text-[11px] text-accent hover:underline sm:inline-flex">
            {e.incidentId}
            <ArrowUpRight className="size-3" />
          </Link>
        )}
      </div>
      {!dense && <span className={cn("text-right font-mono text-[12px] tabular", toneText[riskTone(e.risk)])}>{e.risk}</span>}
    </div>
  );
}
