import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, EyeOff, Ghost } from "lucide-react";
import { scenarioById } from "@/data/scenarios";
import { useStore } from "@/store/useStore";
import { computeRisk, emptySignals, mergeSignals } from "@/lib/risk";
import { RiskGauge } from "@/components/domain";
import { Sigil } from "@/components/Sigil";
import { Select, TooltipProvider } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RoleBoundaryGraph = lazy(() => import("@/components/viz/RoleBoundaryGraph"));

/**
 * A fixed-size artboard that composes the system's signature output for slides and screenshots.
 * It renders at a fixed pixel size and is scaled to fit the window, so a screenshot is always crisp and identical.
 */
const ASPECTS = {
  "16:9": [1600, 900],
  "2:1": [1600, 800],
  "3:2": [1500, 1000],
  "4:3": [1440, 1080],
} as const;
type Aspect = keyof typeof ASPECTS;

export default function Showcase() {
  const theme = useStore((s) => s.settings.theme);
  const incidents = useStore((s) => s.incidents);
  const [aspect, setAspect] = useState<Aspect>("16:9");
  const [chrome, setChrome] = useState(true);
  const [scale, setScale] = useState(1);
  const wrap = useRef<HTMLDivElement>(null);
  const [W, H] = ASPECTS[aspect];

  const scenario = scenarioById("scn-poisoned-pdf")!;
  const signals = useMemo(() => scenario.steps.reduce((a, s) => mergeSignals(a, s.signals), emptySignals()), [scenario]);
  const risk = computeRisk(signals);
  const top = [...risk.contributions].filter((c) => c.value > 0).sort((a, b) => b.weighted - a.weighted).slice(0, 3);
  const incidentId = incidents.find((i) => i.scenarioId === scenario.id)?.id ?? "INC-2001";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / W, el.clientHeight / H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H, chrome]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "h" && !(e.target instanceof HTMLInputElement)) setChrome((c) => !c);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tall = H / W > 0.6;

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col bg-bg text-fg">
        {chrome && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft /> Back to app
              </Button>
            </Link>
            <span className="text-xs text-muted">System preview artboard for slides. Press H to hide these controls before taking a screenshot.</span>
            <div className="ml-auto flex items-center gap-2">
              <Select ariaLabel="Aspect ratio" value={aspect} onValueChange={(v) => setAspect(v as Aspect)} className="w-28" options={Object.keys(ASPECTS).map((k) => ({ value: k, label: k }))} />
              <Button size="sm" variant="primary" onClick={() => setChrome(false)}>
                <EyeOff /> Hide controls
              </Button>
            </div>
          </div>
        )}

        <div ref={wrap} className="relative flex-1 overflow-hidden">
          <div className="absolute left-1/2 top-1/2" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
            {/* Artboard */}
            <div
              className="relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-border bg-bg p-12"
              style={{ backgroundImage: "radial-gradient(70% 60% at 30% 0%, rgb(139 124 255 / 0.08), transparent 70%), radial-gradient(50% 50% at 100% 100%, rgb(240 100 114 / 0.05), transparent 70%)" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Sigil className="size-9" animated />
                  <div className="leading-tight">
                    <div className="text-[17px] font-semibold tracking-[0.26em]">EXORCIST</div>
                    <div className="font-mono text-[12px] text-subtle">Behavioral identity security for AI agents</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  <span className="live-pulse size-1.5 rounded-full bg-critical" /> Live detection / simulated
                </div>
              </div>

              <div className="mt-7 max-w-[1100px]">
                <h2 className="text-[42px] font-semibold leading-[1.05] tracking-[-0.035em]">
                  Procurement Agent <span className="text-muted">broke character</span> <span className="text-critical">at step 3.</span>
                </h2>
                <p className="mt-2.5 max-w-[78ch] text-[16px] leading-relaxed text-muted">
                  A hidden instruction in a supplier PDF steered it toward HR salary data. EXORCIST blocked the action, revoked only the risky scopes, and the purchase workflow carried on.
                </p>
              </div>

              {/* Body */}
              <div className={cn("mt-7 grid min-h-0 flex-1 gap-5", tall ? "grid-rows-[1fr_auto]" : "grid-cols-[1fr_360px]")}>
                <div className="relative min-h-0 rounded-[22px] border border-border bg-surface/70 p-5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">Role boundary / supplier_quote_northwind.pdf</span>
                    <span className="flex items-center gap-4 text-[12px] text-muted">
                      <span className="flex items-center gap-1.5"><span className="h-px w-5 border-t border-dashed border-subtle" /> Expected path</span>
                      <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-critical" /> Agent path</span>
                    </span>
                  </div>
                  <div className="h-[calc(100%-24px)]">
                    <Suspense fallback={null}>
                      <RoleBoundaryGraph scenario={scenario} includeResponse />
                    </Suspense>
                  </div>
                </div>

                <div className={cn("grid min-h-0 gap-5", tall ? "grid-cols-3" : "grid-rows-[auto_1fr]")}>
                  <div className="flex items-center gap-5 rounded-[22px] border border-border bg-surface/70 p-5">
                    <RiskGauge score={risk.score} size={tall ? 130 : 128} />
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">Risk score</div>
                      <div className="mt-1 text-[13px] leading-snug text-muted">Explainable, with a policy floor for prohibited data flow. Not a probability.</div>
                    </div>
                  </div>
                  <div className={cn("min-h-0 overflow-hidden rounded-[22px] border border-border bg-surface/70 p-5", tall && "col-span-2")}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-subtle">{incidentId}</span>
                      <span className="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[11px] text-accent">Contained</span>
                    </div>
                    <div className="mt-2 text-[16px] font-medium leading-snug">Indirect prompt injection via supplier PDF</div>
                    <div className="mt-4 space-y-2.5">
                      {top.map((c) => (
                        <div key={c.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                          <span className="text-[12.5px] text-muted">{c.label}</span>
                          <span className="font-mono text-[12px] text-fg">{Math.round(c.weighted * 100)}</span>
                          <div className="col-span-2 h-1 overflow-hidden rounded-full bg-elevated">
                            <div className="h-full rounded-full" style={{ width: `${c.weighted * 100}%`, background: c.weighted > 0.5 ? "var(--critical)" : "var(--warning)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-elevated/60 p-3 text-[12.5px] leading-snug text-muted">
                      <Ghost className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span>
                        Ghost Replay: with the PDF sanitized the HR action appeared in <span className="font-mono text-fg">0/3</span> runs, versus <span className="font-mono text-fg">3/3</span> unchanged.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer metrics */}
              <div className="mt-5 grid grid-cols-4 gap-6 border-t border-border pt-4">
                {[
                  ["Detected", "Step 3 of 8", "First divergence from the role path"],
                  ["Exfiltrated", "0 bytes", "Egress held at the gateway"],
                  ["Contained in", "11.4 s", "Scopes revoked, agent kept online"],
                  ["Business impact", "None", "Recommendation still reached approval"],
                ].map(([k, v, d]) => (
                  <div key={k}>
                    <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{k}</div>
                    <div className="mt-1 text-[24px] font-semibold tracking-[-0.02em]">{v}</div>
                    <div className="text-[12.5px] text-muted">{d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
