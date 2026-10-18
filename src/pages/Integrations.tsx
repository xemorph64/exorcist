import { useState } from "react";
import { toast } from "sonner";
import { Copy, Cable, PlugZap } from "lucide-react";
import { Panel, PanelHeader, Badge, Mono } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/domain";
import { cn } from "@/lib/utils";

const INTEGRATIONS = [
  {
    id: "langgraph",
    name: "LangGraph",
    kind: "Agent framework",
    desc: "Callback handler emits a signed span for every node and tool call.",
    agents: 4,
    snippet: `from exorcist.langgraph import ExorcistCallback

graph = builder.compile()
graph.invoke(
    {"task": task},
    config={"callbacks": [ExorcistCallback(agent_id="agt-procure-01")]},
)`,
  },
  {
    id: "mcp",
    name: "MCP gateway",
    kind: "Tool catalog",
    desc: "Proxies MCP servers, pins tool descriptions by hash and plants canary tools.",
    agents: 9,
    snippet: `# mcp.json
{
  "mcpServers": {
    "erp": {
      "url": "https://mcp-gw.acme.internal/erp",
      "headers": { "X-Exorcist-Agent": "agt-procure-01" }
    }
  }
}`,
  },
  {
    id: "proxy",
    name: "LLM proxy",
    kind: "Context capture",
    desc: "Records which inputs were in context for each decision, so taint can be traced.",
    agents: 9,
    snippet: `export OPENAI_BASE_URL=https://llm-proxy.acme.internal/v1
export ANTHROPIC_BASE_URL=https://llm-proxy.acme.internal/anthropic
export EXORCIST_AGENT_ID=agt-procure-01`,
  },
  {
    id: "otel",
    name: "OpenTelemetry",
    kind: "Telemetry",
    desc: "Exports gen_ai.* spans to EXORCIST alongside your existing collector.",
    agents: 6,
    snippet: `exporters:
  otlphttp/exorcist:
    endpoint: https://ingest.exorcist.acme.internal
service:
  pipelines:
    traces:
      exporters: [otlphttp/exorcist]`,
  },
  {
    id: "gateway",
    name: "API gateway",
    kind: "Enforcement",
    desc: "Reconciles every agent-token request with a reasoning span and enforces band actions.",
    agents: 9,
    snippet: `plugins:
  - name: exorcist-reconcile
    config:
      window_ms: 2000
      require_dpop: true
      on_unmatched: block`,
  },
];

export default function Integrations() {
  const [active, setActive] = useState(INTEGRATIONS[0].id);
  const [testing, setTesting] = useState<string | null>(null);
  const it = INTEGRATIONS.find((i) => i.id === active)!;

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Where EXORCIST sits in an agent stack. This demo ships setup references only; nothing here connects to a real service."
        meta={<Badge tone="accent">Demo setup reference</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-5">
          <PanelHeader title="Insertion points" />
          <ul className="p-1.5">
            {INTEGRATIONS.map((i) => (
              <li key={i.id}>
                <button onClick={() => setActive(i.id)} className={cn("flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors", i.id === active ? "bg-elevated" : "hover:bg-hover/60")}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-surface text-accent">
                    <Cable className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-medium">{i.name}</span>
                      <span className="text-[11px] text-subtle">{i.kind}</span>
                    </span>
                    <span className="block text-xs text-muted">{i.desc}</span>
                  </span>
                  <Badge tone="neutral" className="shrink-0">{i.agents} agents (mock)</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="xl:col-span-7">
          <PanelHeader
            title={`${it.name} setup`}
            description={it.desc}
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(it.snippet); toast.success("Snippet copied"); }}>
                  <Copy /> Copy
                </Button>
                <Button
                  size="sm"
                  disabled={testing === it.id}
                  onClick={() => {
                    setTesting(it.id);
                    setTimeout(() => {
                      setTesting(null);
                      toast.success(`${it.name}: simulated handshake ok`, { description: "Demo mode check. No network request was made." });
                    }, 900);
                  }}
                >
                  <PlugZap /> {testing === it.id ? "Checking" : "Run demo check"}
                </Button>
              </>
            }
          />
          <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-fg">{it.snippet}</pre>
          <div className="border-t border-border p-4 text-xs text-muted">
            Agent ids in snippets refer to the Acme Corp demo fleet, for example <Mono className="text-fg">agt-procure-01</Mono>.
          </div>
        </Panel>
      </div>
    </div>
  );
}
