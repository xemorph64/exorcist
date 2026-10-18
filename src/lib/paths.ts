import type { Scenario, ScenarioStep } from "@/data/types";
import type { Tone } from "@/components/ui/primitives";

export function stepTone(step: ScenarioStep, legit?: boolean): Tone {
  switch (step.kind) {
    case "suspicious":
      return legit ? "info" : "warning";
    case "deviation":
      return "critical";
    case "detection":
      return legit ? "healthy" : "critical";
    case "containment":
      return "accent";
    case "resume":
      return "healthy";
    default:
      return "neutral";
  }
}

/** Which steps form the observed path (planning steps are internal and omitted). */
export function observedSteps(s: Scenario, includeResponse = false) {
  return s.steps.filter((st) => !st.tool.startsWith("llm.") && (includeResponse || (st.kind !== "containment" && st.kind !== "resume")));
}

export function divergenceIndex(steps: ScenarioStep[]) {
  const i = steps.findIndex((st) => st.kind !== "normal");
  return i === -1 ? steps.length : i;
}
