import { Suspense, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Command,
  FlaskConical,
  Menu,
  Moon,
  Pause,
  Play,
  Search,
  Sun,
  X,
} from "lucide-react";
import { NAV, ALL_NAV } from "./nav";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { setBandThresholds } from "@/lib/risk";
import { Button } from "../ui/button";
import { Kbd, Skeleton } from "../ui/primitives";
import { Tip, TooltipProvider } from "../ui/radix";
import { CommandPalette } from "./CommandPalette";
import { ORG } from "@/data/agents";
import { Sigil } from "../Sigil";

export function BrandMark({ className }: { className?: string }) {
  return <Sigil className={className} />;
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const openIncidents = useStore((s) => s.incidents.filter((i) => i.status === "open" || i.status === "investigating").length);
  const labActive = useStore((s) => s.lab.stepIndex >= 0 && !s.lab.completed);
  return (
    <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Primary">
      {NAV.map((g) => (
        <div key={g.group} className="mt-5 first:mt-3">
          {!collapsed && <div className="eyebrow px-2 pb-1.5">{g.group}</div>}
          {collapsed && <div className="mx-auto my-2 h-px w-6 bg-border" />}
          <ul className="space-y-px">
            {g.items.map((it) => {
              const Icon = it.icon;
              const badge = it.to === "/incidents" ? openIncidents : 0;
              const link = (
                <NavLink
                  to={it.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex h-8 items-center gap-2.5 rounded-lg px-2 text-[13px] transition-colors",
                      isActive ? "bg-elevated text-fg shadow-[inset_0_0_0_1px_var(--border)]" : "text-muted hover:bg-hover/60 hover:text-fg",
                      collapsed && "justify-center px-0",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn("size-4 shrink-0", isActive ? "text-fg" : "text-subtle group-hover:text-muted")} strokeWidth={1.75} />
                      {!collapsed && <span className="truncate">{it.label}</span>}
                      {!collapsed && badge > 0 && (
                        <span className="ml-auto rounded bg-critical-soft px-1.5 font-mono text-[10px] leading-4 text-critical">{badge}</span>
                      )}
                      {!collapsed && it.to === "/lab" && labActive && (
                        <span className="ml-auto rounded bg-accent-soft px-1.5 text-[10px] leading-4 text-accent">running</span>
                      )}
                    </>
                  )}
                </NavLink>
              );
              return <li key={it.to}>{collapsed ? <Tip content={it.label} side="right">{link}</Tip> : link}</li>;
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Sidebar() {
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggle = useStore((s) => s.toggleSidebar);
  return (
    <aside
      className={cn(
        "no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-bg transition-[width] duration-200 lg:flex",
        collapsed ? "w-14" : "w-[248px]",
      )}
    >
      <div className={cn("flex h-14 items-center gap-2.5 px-4", collapsed && "justify-center px-0")}>
        <BrandMark className="size-6 shrink-0" />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="text-[12.5px] font-semibold tracking-[0.22em] text-fg">EXORCIST</div>
            <div className="truncate font-mono text-[10.5px] text-subtle">{ORG.name.toLowerCase().replace(" ", "-")} / {ORG.region}</div>
          </div>
        )}
      </div>
      <SidebarContent collapsed={collapsed} />
      {!collapsed && (
        <div className="mx-3 mb-2 rounded-xl border border-border bg-surface p-3">
          <p className="text-[12px] leading-snug text-fg">Every agent has a role.</p>
          <p className="text-[12px] leading-snug text-muted">Know when it breaks character.</p>
        </div>
      )}
      <div className={cn("border-t border-border p-2", collapsed && "flex justify-center")}>
        <Button variant="ghost" size={collapsed ? "iconSm" : "sm"} className={cn(!collapsed && "w-full justify-start")} onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronsRight /> : <><ChevronsLeft /> Collapse</>}
        </Button>
      </div>
    </aside>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-bg/70 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className="fixed inset-y-0 left-0 z-[61] flex w-[264px] flex-col border-r border-border bg-surface lg:hidden"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-3">
              <div className="flex items-center gap-2.5">
                <BrandMark className="size-6" />
                <span className="text-[12.5px] font-semibold tracking-[0.22em]">EXORCIST</span>
              </div>
              <Button variant="ghost" size="iconSm" onClick={onClose} aria-label="Close navigation">
                <X />
              </Button>
            </div>
            <SidebarContent collapsed={false} onNavigate={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const loc = useLocation();
  const nav = useNavigate();
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const openCritical = useStore((s) => s.incidents.filter((i) => i.status === "open" && (i.severity === "critical" || i.severity === "high")).length);
  const current = ALL_NAV.find((n) => loc.pathname.startsWith(n.to));
  const sub = loc.pathname.split("/")[2];

  return (
    <header className="no-print sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-bg/80 px-4 backdrop-blur-md md:px-8">
      <Button variant="ghost" size="iconSm" className="lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu />
      </Button>
      <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <Link to={current?.to ?? "/dashboard"} className="truncate text-muted hover:text-fg">
          {current?.label ?? "EXORCIST"}
        </Link>
        {sub && (
          <>
            <span className="text-subtle">/</span>
            <span className="truncate font-mono text-xs text-fg">{decodeURIComponent(sub)}</span>
          </>
        )}
      </div>

      <button
        onClick={onSearch}
        className="ml-auto hidden h-8 w-72 items-center gap-2 whitespace-nowrap rounded-md border border-border bg-surface px-2.5 text-[13px] text-subtle transition-colors hover:border-border-strong lg:flex"
      >
        <Search className="size-3.5" />
        <span className="truncate">Search agents, incidents, pages</span>
        <span className="ml-auto flex items-center gap-0.5">
          <Kbd>
            <Command className="inline size-2.5" />K
          </Kbd>
        </span>
      </button>
      <Button variant="ghost" size="iconSm" className="ml-auto lg:hidden" onClick={onSearch} aria-label="Search">
        <Search />
      </Button>

      <Tip content="Every event in this workspace is generated by the demo simulator">
        <span className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted sm:inline-flex">
          <FlaskConical className="size-3 text-accent" /> Simulated
        </span>
      </Tip>

      <Tip content={settings.liveStream ? "Pause simulated live stream" : "Resume simulated live stream"}>
        <Button variant="ghost" size="sm" onClick={() => update({ liveStream: !settings.liveStream })} aria-pressed={settings.liveStream}>
          {settings.liveStream ? (
            <>
              <span className="live-pulse size-1.5 rounded-full bg-healthy" aria-hidden /> <span className="hidden sm:inline">Live</span>
              <Pause className="hidden sm:block" />
            </>
          ) : (
            <>
              <span className="size-1.5 rounded-full bg-subtle" aria-hidden /> <span className="hidden sm:inline">Paused</span>
              <Play className="hidden sm:block" />
            </>
          )}
        </Button>
      </Tip>

      <Tip content={`${openCritical} open high or critical incidents`}>
        <Button variant="ghost" size="iconSm" onClick={() => nav("/incidents?status=open")} aria-label="Open incidents" className="relative">
          <Bell />
          {openCritical > 0 && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-critical" />}
        </Button>
      </Tip>
      <Tip content={settings.theme === "dark" ? "Light theme" : "Dark theme"}>
        <Button variant="ghost" size="iconSm" onClick={() => update({ theme: settings.theme === "dark" ? "light" : "dark" })} aria-label="Toggle theme">
          {settings.theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </Tip>
      <Link to="/settings" className="ml-1 grid size-7 place-items-center rounded-full border border-border bg-elevated text-[11px] font-semibold text-fg" aria-label="Analyst settings">
        {settings.analystName.split(" ").map((w) => w[0]).join("")}
      </Link>
    </header>
  );
}

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

export function AppShell() {
  const theme = useStore((s) => s.settings.theme);
  const live = useStore((s) => s.settings.liveStream);
  const thresholds = useStore((s) => s.settings.thresholds);
  const push = useStore((s) => s.pushLiveEvent);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useMemo(() => setBandThresholds(thresholds), [thresholds]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(push, 4200);
    return () => clearInterval(id);
  }, [live, push]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <TooltipProvider>
      <div className="grain flex min-h-dvh bg-bg text-fg">
        <Sidebar />
        <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMobileOpen(true)} onSearch={() => setPaletteOpen(true)} />
          <main className="aura mx-auto w-full max-w-[1600px] flex-1 px-4 py-7 md:px-8">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <Toaster
          theme={theme}
          position="bottom-right"
          toastOptions={{
            style: { background: "var(--elevated)", border: "1px solid var(--border)", color: "var(--fg)", fontSize: 13 },
          }}
        />
      </div>
    </TooltipProvider>
  );
}
