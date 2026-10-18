# EXORCIST

**Every agent has a role. Know when it breaks character.**

EXORCIST is a frontend demonstration of a behavioral identity security platform for AI agents. It watches a fleet of agents at the fictional company Acme Corp, compares what each agent does with the role contract it is held to, and shows the moment one steps outside it.

> All data is simulated. There is no backend, no authentication and no real AI or security integration. Risk scores are an explainable heuristic, not a calibrated probability of compromise.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. `npm run build` produces a static build in `dist/`.

## What to try

1. **Command Center** (`/dashboard`): fleet integrity, the 3D agent constellation, live risk trend and event ticker.
2. **Possession Lab** (`/lab`): run one of seven scenarios (poisoned supplier PDF, malicious MCP tool, stolen token, slow drift, agent-to-agent propagation, exfiltration through an approved channel, legitimate role change). Results flow into incidents, agent risk and every graph.
3. **Identity Drift** (`/drift`): the role-lane graph. The shaded lane is what the role allows; the agent's path leaves it at the divergence point.
4. **Ghost Replay** (`/ghost-replay`): original vs sanitized-source vs task-masked replays, with a cautious verdict.
5. **System Preview** (`/showcase`): a fixed-size artboard for slides. Press `H` to hide the controls before taking a screenshot.

The demo state persists in `localStorage`. Reset it from **Settings**.

## Risk model

```
Risk = 100 x (1 - product(1 - weight_i x signal_i))
```

Signals: role deviation, sequence anomaly, slow drift, data-flow violation, task mismatch, credential mismatch, canary activation. Deterministic policy floors apply to high-confidence violations. Bands: 0-39 Observe, 40-59 Step-up, 60-79 Restrict, 80-100 Quarantine.

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI, Motion, React Three Fiber, React Flow, Recharts, TanStack Table, Zustand, React Router, Sonner, Lucide.

## Structure

```
src/
  data/        typed mock data: agents, contracts, scenarios, seed generator
  store/       Zustand store with simulation engine and persistence
  lib/         risk model, path helpers, utilities
  components/  design system, domain components, visualizations
  pages/       one file per route
```
