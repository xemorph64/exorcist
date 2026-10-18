import type { Band, Decision, SignalKey, Signals } from "@/data/types";

/**
 * Demonstration risk model. Not a calibrated probability of compromise.
 * Risk = 100 x (1 - prod(1 - w_i * s_i)), then deterministic policy floors.
 */
export const SIGNAL_META: Record<SignalKey, { label: string; weight: number; hint: string }> = {
  roleDeviation: { label: "Role deviation", weight: 0.55, hint: "Action outside the role contract" },
  sequenceAnomaly: { label: "Sequence anomaly", weight: 0.35, hint: "Tool order unlikely under role automaton" },
  slowDrift: { label: "Slow drift", weight: 0.3, hint: "JS divergence vs anchor baseline (CUSUM)" },
  dataFlow: { label: "Data-flow violation", weight: 0.7, hint: "Sensitive value reached a prohibited sink" },
  taskMismatch: { label: "Task mismatch", weight: 0.45, hint: "Action not explained by the user task" },
  credentialMismatch: { label: "Credential mismatch", weight: 0.9, hint: "API call with no matching agent span" },
  canary: { label: "Canary activation", weight: 0.95, hint: "Touched a decoy no role needs" },
};

export const SIGNAL_KEYS = Object.keys(SIGNAL_META) as SignalKey[];

export const emptySignals = (): Signals => ({
  roleDeviation: 0,
  sequenceAnomaly: 0,
  slowDrift: 0,
  dataFlow: 0,
  taskMismatch: 0,
  credentialMismatch: 0,
  canary: 0,
});

export interface RiskBreakdown {
  score: number;
  raw: number;
  floor: { value: number; reason: string } | null;
  contributions: { key: SignalKey; label: string; value: number; weighted: number; share: number }[];
}

export function computeRisk(signals: Partial<Signals>, weights?: Partial<Record<SignalKey, number>>): RiskBreakdown {
  const s = { ...emptySignals(), ...signals };
  let prod = 1;
  const parts = SIGNAL_KEYS.map((key) => {
    const w = weights?.[key] ?? SIGNAL_META[key].weight;
    const weighted = Math.min(1, w * s[key]);
    prod *= 1 - weighted;
    return { key, label: SIGNAL_META[key].label, value: s[key], weighted, share: 0 };
  });
  const raw = 100 * (1 - prod);

  let floor: RiskBreakdown["floor"] = null;
  if (s.canary >= 0.5) floor = { value: 85, reason: "Canary activation floor" };
  else if (s.credentialMismatch >= 0.8) floor = { value: 82, reason: "Unmatched credential use floor" };
  else if (s.dataFlow >= 0.8) floor = { value: 70, reason: "Prohibited data-flow floor" };
  else if (s.roleDeviation >= 0.85) floor = { value: 60, reason: "High-confidence role violation floor" };

  const score = Math.round(Math.max(raw, floor?.value ?? 0));
  const total = parts.reduce((a, p) => a + p.weighted, 0) || 1;
  parts.forEach((p) => (p.share = p.weighted / total));
  return { score, raw, floor: floor && floor.value > raw ? floor : null, contributions: parts };
}

let TH = { stepUp: 40, restrict: 60, quarantine: 80 };
export function setBandThresholds(t: typeof TH) {
  TH = t;
}
export function getBandThresholds() {
  return TH;
}

export function bandFor(score: number): Band {
  if (score >= TH.quarantine) return "quarantine";
  if (score >= TH.restrict) return "restrict";
  if (score >= TH.stepUp) return "step_up";
  return "observe";
}

export const BAND_META: Record<Band, { label: string; range: string; tone: "healthy" | "info" | "warning" | "critical"; action: Decision }> = {
  observe: { label: "Observe", range: "0-39", tone: "healthy", action: "allow" },
  step_up: { label: "Step-up", range: "40-59", tone: "info", action: "step_up" },
  restrict: { label: "Restrict", range: "60-79", tone: "warning", action: "restrict" },
  quarantine: { label: "Quarantine", range: "80-100", tone: "critical", action: "quarantine" },
};

export function toneForScore(score: number) {
  return BAND_META[bandFor(score)].tone;
}

export function mergeSignals(a: Partial<Signals>, b: Partial<Signals>): Signals {
  const out = { ...emptySignals(), ...a };
  for (const k of SIGNAL_KEYS) out[k] = Math.max(out[k], b[k] ?? 0);
  return out;
}
