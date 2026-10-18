import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FileJson, FileSpreadsheet, Printer } from "lucide-react";
import { useStore } from "@/store/useStore";
import { ORG } from "@/data/agents";
import { Panel, PanelHeader, Badge } from "@/components/ui/primitives";
import { Select } from "@/components/ui/radix";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/domain";
import { SIGNAL_META, SIGNAL_KEYS } from "@/lib/risk";
import { downloadFile, fmtDateTime, toCSV } from "@/lib/utils";

export default function Reports() {
  const incidents = useStore((s) => s.incidents);
  const agents = useStore((s) => s.agents);
  const contracts = useStore((s) => s.contracts);
  const events = useStore((s) => s.events);
  const analyst = useStore((s) => s.settings.analystName);
  const [params, setParams] = useSearchParams();
  const kind = params.get("incident") ? "incident" : params.get("type") ?? "incident";
  const incident = incidents.find((i) => i.id === params.get("incident")) ?? incidents[0];
  const name = (id: string) => agents.find((a) => a.id === id)?.name ?? id;
  const generated = fmtDateTime(Date.now());

  const exportJSON = () => {
    const payload =
      kind === "incident"
        ? { generatedAt: new Date().toISOString(), simulated: true, org: ORG, incident, agents: incident.agentIds.map((id) => agents.find((a) => a.id === id)), relatedEvents: events.filter((e) => e.incidentId === incident.id) }
        : { generatedAt: new Date().toISOString(), simulated: true, org: ORG, incidents, contracts, agents };
    downloadFile(kind === "incident" ? `exorcist-${incident.id}.json` : "exorcist-compliance.json", JSON.stringify(payload, null, 2));
    toast.success("JSON exported");
  };
  const exportCSV = () => {
    const rows =
      kind === "incident"
        ? incident.timeline.map((t) => ({ incident: incident.id, time: new Date(t.ts).toISOString(), event: t.label, actor: t.actor, tone: t.tone }))
        : incidents.map((i) => ({ id: i.id, title: i.title, severity: i.severity, status: i.status, agent: name(i.agentIds[0]), risk: i.risk, containment: i.containment, opened: new Date(i.createdAt).toISOString(), simulated: !!i.simulated }));
    downloadFile(kind === "incident" ? `exorcist-${incident.id}-timeline.csv` : "exorcist-incidents.csv", toCSV(rows), "text/csv");
    toast.success("CSV exported");
  };

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Reports"
          description="Incident and compliance reports built from the same state as every other page. Exports are labeled as simulated data."
          actions={
            <>
              <Select
                ariaLabel="Report type"
                value={kind === "incident" ? `i:${incident.id}` : "compliance"}
                onValueChange={(v) => setParams(v === "compliance" ? { type: "compliance" } : { incident: v.slice(2) })}
                className="w-72"
                options={[{ value: "compliance", label: "Fleet compliance summary" }, ...incidents.map((i) => ({ value: `i:${i.id}`, label: `Incident ${i.id}` }))]}
              />
              <Button onClick={exportCSV}><FileSpreadsheet /> CSV</Button>
              <Button onClick={exportJSON}><FileJson /> JSON</Button>
              <Button variant="primary" onClick={() => window.print()}><Printer /> Print / PDF</Button>
            </>
          }
        />
      </div>

      <Panel className="print-only-surface mx-auto max-w-[860px]">
        <PanelHeader className="no-print" title="Preview" actions={<Badge tone="accent">Simulated data</Badge>} />
        <article className="space-y-6 p-6 text-[13px] leading-relaxed md:p-10">
          <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.16em] text-accent">EXORCIST</div>
              <h2 className="mt-1 text-lg font-semibold">{kind === "incident" ? `Incident report: ${incident.id}` : "Agent fleet compliance summary"}</h2>
              <p className="text-xs text-muted">{ORG.name} / tenant {ORG.tenant} / generated {generated} by {analyst}</p>
            </div>
            <span className="rounded border border-border px-2 py-1 text-[10px] text-muted">DEMO: SIMULATED</span>
          </header>

          {kind === "incident" ? (
            <>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Summary</h3>
                <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 text-xs">
                  <dt className="text-muted">Title</dt><dd>{incident.title}</dd>
                  <dt className="text-muted">Severity / status</dt><dd className="capitalize">{incident.severity} / {incident.status.replace("_", " ")}</dd>
                  <dt className="text-muted">Agents</dt><dd>{[...new Set(incident.agentIds)].map(name).join(", ")}</dd>
                  <dt className="text-muted">Opened</dt><dd>{fmtDateTime(incident.createdAt)}</dd>
                  <dt className="text-muted">Risk at detection</dt><dd>{incident.risk} (demonstration score, not a probability)</dd>
                  <dt className="text-muted">Response</dt><dd className="capitalize">{incident.containment.replace("_", " ")}</dd>
                  <dt className="text-muted">Assignee</dt><dd>{incident.assignee}</dd>
                </dl>
                <p className="mt-3">{incident.summary}</p>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Root cause</h3>
                <p>{incident.rootCause}</p>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Signal contributions</h3>
                <table className="w-full text-xs">
                  <tbody>
                    {SIGNAL_KEYS.filter((k) => incident.signals[k] > 0).map((k) => (
                      <tr key={k} className="border-b border-border">
                        <td className="py-1.5">{SIGNAL_META[k].label}</td>
                        <td className="py-1.5 text-right font-mono">{incident.signals[k].toFixed(2)} x {SIGNAL_META[k].weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Timeline</h3>
                <ol className="space-y-1 text-xs">
                  {incident.timeline.map((t, i) => (
                    <li key={i} className="grid grid-cols-[150px_1fr] gap-2">
                      <span className="font-mono text-muted">{fmtDateTime(t.ts)}</span>
                      <span>{t.label}</span>
                    </li>
                  ))}
                </ol>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Ghost Replay</h3>
                <p className="text-xs">{incident.replay.verdict} ({incident.replay.confidence} evidence).</p>
                <ul className="mt-1 text-xs text-muted">
                  {incident.replay.runs.map((r) => (
                    <li key={r.label}>{r.label} {r.name}: flagged action reproduced in {r.actionReproduced} of 3 runs</li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-muted">Replay results are diagnostic evidence and do not establish causality on their own.</p>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Evidence chain</h3>
                <ul className="space-y-1.5 text-xs">
                  {incident.evidence.map((e) => (
                    <li key={e.id}>
                      <span className="font-medium">{e.title}.</span> {e.detail} <span className="font-mono text-muted">sha256:{e.hash}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Fleet posture</h3>
                <p>
                  {agents.filter((a) => !a.isCanary).length} registered agents, {contracts.filter((c) => c.status === "active").length} active role contracts, {incidents.length} incidents in the reporting window ({incidents.filter((i) => i.status === "resolved" || i.status === "false_positive").length} closed).
                </p>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Agents and contracts</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="py-1.5 font-medium">Agent</th><th className="py-1.5 font-medium">Contract</th><th className="py-1.5 font-medium">Status</th><th className="py-1.5 text-right font-medium">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.filter((a) => !a.isCanary).map((a) => (
                      <tr key={a.id} className="border-b border-border">
                        <td className="py-1.5">{a.name}</td>
                        <td className="py-1.5 font-mono">{a.contractId} v{contracts.find((c) => c.id === a.contractId)?.version}</td>
                        <td className="py-1.5 capitalize">{a.status}</td>
                        <td className="py-1.5 text-right font-mono">{a.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Incidents</h3>
                <table className="w-full text-xs">
                  <tbody>
                    {incidents.map((i) => (
                      <tr key={i.id} className="border-b border-border">
                        <td className="py-1.5 font-mono">{i.id}</td>
                        <td className="py-1.5">{i.title}</td>
                        <td className="py-1.5 capitalize">{i.severity}</td>
                        <td className="py-1.5 capitalize">{i.status.replace("_", " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Control mapping</h3>
                <ul className="list-disc space-y-1 pl-5 text-xs">
                  <li>OWASP Agentic ASI03 identity and privilege abuse: credential reconciliation, DPoP-bound tokens.</li>
                  <li>Least privilege: role contracts with two-person change approval.</li>
                  <li>Data protection (DPDP Act 2023): data-flow guard on sensitive classes, zero bytes disclosed in blocked flows.</li>
                  <li>Incident reporting (CERT-In 6-hour window): timeline and evidence hashes exportable per incident.</li>
                </ul>
              </section>
            </>
          )}
          <footer className="border-t border-border pt-4 text-[11px] text-muted">
            Generated from the EXORCIST demonstration environment. All agents, events and incidents are simulated. Risk scores are explainable heuristics, not calibrated probabilities.
          </footer>
        </article>
      </Panel>
    </div>
  );
}
