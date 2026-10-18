import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Panel, PanelHeader, Input, Label, Mono } from "@/components/ui/primitives";
import { Dialog, Select, Slider, Switch } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/domain";
import { SIGNAL_META, SIGNAL_KEYS } from "@/lib/risk";

function Row({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="grid gap-2 px-4 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
      <div>
        <label htmlFor={htmlFor} className="text-[13px] text-fg">{label}</label>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const reset = useStore((s) => s.resetDemo);
  const nav = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const t = settings.thresholds;
  const setT = (k: keyof typeof t, v: number) => {
    const next = { ...t, [k]: v };
    if (next.stepUp >= next.restrict) next.restrict = Math.min(99, next.stepUp + 1);
    if (next.restrict >= next.quarantine) next.quarantine = Math.min(100, next.restrict + 1);
    update({ thresholds: next });
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Workspace preferences for this browser. Stored locally; nothing leaves the device." />
      <div className="space-y-4">
        <Panel>
          <PanelHeader title="Appearance" />
          <div className="divide-y divide-border">
            <Row label="Theme" hint="Dark is the default for SOC environments">
              <Select ariaLabel="Theme" value={settings.theme} onValueChange={(v) => update({ theme: v as "dark" | "light" })} className="w-36" options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
            </Row>
            <Row label="Compact tables" hint="Tighter rows for dense triage" htmlFor="compact">
              <Switch id="compact" checked={settings.compactTables} onCheckedChange={(v) => update({ compactTables: v })} />
            </Row>
            <Row label="Analyst name" hint="Used on notes, approvals and reports" htmlFor="analyst">
              <Input id="analyst" value={settings.analystName} onChange={(e) => update({ analystName: e.target.value || "Analyst" })} className="w-48" />
            </Row>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Risk bands" description="Thresholds that map a score to a response" />
          <div className="space-y-5 p-4">
            {(
              [
                ["stepUp", "Step-up from", "info"],
                ["restrict", "Restrict from", "warning"],
                ["quarantine", "Quarantine from", "critical"],
              ] as const
            ).map(([k, l, tone]) => (
              <div key={k}>
                <Label>
                  {l} <Mono className={`text-${tone}`}>{t[k]}</Mono>
                </Label>
                <Slider value={t[k]} onValueChange={(v) => setT(k, v)} min={10} max={100} ariaLabel={l} />
              </div>
            ))}
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => update({ thresholds: { stepUp: 40, restrict: 60, quarantine: 80 } })}>Restore 40 / 60 / 80</Button>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Scoring weights" description="Read-only in demo. Risk = 100 x (1 - product of (1 - w x s))" />
          <ul className="divide-y divide-border">
            {SIGNAL_KEYS.map((k) => (
              <li key={k} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                <span className="text-fg">{SIGNAL_META[k].label}</span>
                <span className="text-muted">{SIGNAL_META[k].hint}</span>
                <Mono className="ml-auto text-fg">{SIGNAL_META[k].weight}</Mono>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader title="Simulation" />
          <div className="divide-y divide-border">
            <Row label="Live event stream" hint="Generates a routine in-role event every few seconds" htmlFor="live">
              <Switch id="live" checked={settings.liveStream} onCheckedChange={(v) => update({ liveStream: v })} />
            </Row>
            <Row label="Auto-hold on deviation" hint="Lab scenarios hold the agent as soon as a deviation is detected" htmlFor="auto">
              <Switch id="auto" checked={settings.autoContain} onCheckedChange={(v) => update({ autoContain: v })} />
            </Row>
            <Row label="Reset demo" hint="Restores Acme Corp agents, incidents, contracts and events to their initial state">
              <Button variant="danger" onClick={() => setConfirm(true)}>
                <RotateCcw /> Reset simulation
              </Button>
            </Row>
          </div>
        </Panel>
      </div>

      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Reset the simulation?"
        description="All Lab-generated incidents, analyst notes, contract edits and containment actions are discarded. Your theme is kept."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                reset();
                setConfirm(false);
                toast.success("Simulation reset");
                nav("/dashboard");
              }}
            >
              Reset
            </Button>
          </>
        }
      />
    </div>
  );
}
