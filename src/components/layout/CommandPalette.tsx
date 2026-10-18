import * as DialogP from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot, CornerDownLeft, Search, ShieldAlert } from "lucide-react";
import { ALL_NAV } from "./nav";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

type Item = { id: string; label: string; hint: string; to: string; kind: "page" | "agent" | "incident" };

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const nav = useNavigate();
  const agents = useStore((s) => s.agents);
  const incidents = useStore((s) => s.incidents);

  const items = useMemo<Item[]>(() => {
    const all: Item[] = [
      ...ALL_NAV.map((n) => ({ id: n.to, label: n.label, hint: n.to, to: n.to, kind: "page" as const })),
      ...agents.map((a) => ({ id: a.id, label: a.name, hint: `${a.role} / ${a.id}`, to: `/agents/${a.id}`, kind: "agent" as const })),
      ...incidents.map((i) => ({ id: i.id, label: i.title, hint: i.id, to: `/incidents/${i.id}`, kind: "incident" as const })),
    ];
    const t = q.trim().toLowerCase();
    if (!t) return all.slice(0, 12);
    return all.filter((i) => (i.label + i.hint).toLowerCase().includes(t)).slice(0, 14);
  }, [q, agents, incidents]);

  const go = (it?: Item) => {
    if (!it) return;
    nav(it.to);
    onOpenChange(false);
    setQ("");
  };

  return (
    <DialogP.Root open={open} onOpenChange={onOpenChange}>
      <DialogP.Portal>
        <DialogP.Overlay className="fixed inset-0 z-[70] bg-bg/70 backdrop-blur-[2px]" />
        <DialogP.Content className="fixed left-1/2 top-[14vh] z-[71] w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-panel">
          <DialogP.Title className="sr-only">Search</DialogP.Title>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-subtle" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(items.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") go(items[active]);
              }}
              placeholder="Jump to an agent, incident or page"
              aria-label="Search"
              className="h-12 flex-1 bg-transparent text-sm text-fg placeholder:text-subtle focus:outline-none"
            />
          </div>
          <ul className="max-h-[50vh] overflow-y-auto p-1.5" role="listbox">
            {items.length === 0 && <li className="px-3 py-8 text-center text-xs text-muted">No matches for "{q}"</li>}
            {items.map((it, i) => (
              <li key={it.kind + it.id} role="option" aria-selected={i === active}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(it)}
                  className={cn("flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left", i === active ? "bg-hover" : "")}
                >
                  <span className="grid size-6 place-items-center rounded border border-border bg-elevated text-subtle [&_svg]:size-3.5">
                    {it.kind === "agent" ? <Bot /> : it.kind === "incident" ? <ShieldAlert /> : <ArrowRight />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-fg">{it.label}</span>
                    <span className="block truncate font-mono text-[11px] text-subtle">{it.hint}</span>
                  </span>
                  {i === active && <CornerDownLeft className="size-3.5 text-subtle" />}
                </button>
              </li>
            ))}
          </ul>
        </DialogP.Content>
      </DialogP.Portal>
    </DialogP.Root>
  );
}
