"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchFinalGoLiveDashboard,
  fetchFinalProductionCompletionReport,
  fetchFinalClosureReport,
  fetchFinalOperationsReport,
  type FinalGoLiveDashboard,
  type FinalProductionCompletionReport,
  type FinalClosureReport,
  type FinalOperationsReport,
} from "@/lib/admin/finalProductionGoLiveClient";

const SECTION_LINKS: Record<string, string> = {
  ACCESS: "/admin/inter-cars-production-access",
  SUPPLIERS: "/admin/inter-cars-production-access",
  FIRST_ORDER: "/admin/supplier-first-production-order",
  OBSERVATION: "/admin/supplier-go-live-observation",
  GO_LIVE: "/admin/supplier-controlled-go-live",
};

export default function AdminFinalProductionGoLivePanel() {
  const [dashboard, setDashboard] = useState<FinalGoLiveDashboard | null>(null);
  const [completion, setCompletion] = useState<FinalProductionCompletionReport | null>(null);
  const [closure, setClosure] = useState<FinalClosureReport | null>(null);
  const [operations, setOperations] = useState<FinalOperationsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [dashRes, completionRes, closureRes, opsRes] = await Promise.all([
        fetchFinalGoLiveDashboard(),
        fetchFinalProductionCompletionReport(),
        fetchFinalClosureReport(),
        fetchFinalOperationsReport(),
      ]);
      setDashboard(dashRes.data);
      setCompletion(completionRes.data);
      setClosure(closureRes.data);
      setOperations(opsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("admin.auth.required");
      setLoading(false);
      return;
    }
    reload();
  }, [reload]);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Final Production Dashboard (#354)</h1>
          <p className="admin-muted">
            Authoritative production completion gate · Sales CLOSED until all mandatory items PASS ·{" "}
            <Link href="/admin/inter-cars-production-access">#347 Inter Cars</Link>
          </p>
        </div>
      </header>

      <div className="admin-alert admin-alert-warning" role="status">
        LIVE validation remains BLOCKED without genuine external evidence. Secret values are never shown.
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-muted">Loading…</p>}

      {operations && (
        <section className="admin-card">
          <h2>Final operations — SOFTWARE COMPLETE</h2>
          <p className="admin-muted">
            Operational blockers: {operations.operationalBlockers.length} · Fake evidence: {operations.fakeEvidenceCount}
          </p>
          <ul>
            <li>Inter Cars credential: {operations.interCarsCredential}</li>
            <li>Read validation: {operations.interCarsRead}</li>
            <li>#342 CreateOrder: {operations.createOrder342}</li>
            <li>#343 Arming: {operations.arming343}</li>
            <li>#344 First order: {operations.firstOrder344}</li>
            <li>#345 Go-live: {operations.controlledGoLive345}</li>
            <li>#346 Observation: {operations.observation346}</li>
            <li>Financial: {operations.financialReconciliation}</li>
            <li>Final go-live: {operations.finalGoLive}</li>
          </ul>
          <h3>Operations chain</h3>
          <ul>
            {operations.chain.map((step) => (
              <li key={step.id}>
                [{step.status}] {step.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {closure && (
        <section className="admin-card">
          <h2>Final closure — {closure.finalState}</h2>
          <ul>
            <li>Final go-live: {closure.finalGoLive}</li>
            <li>Decision: {closure.finalDecision}</li>
            <li>Critical blockers: {closure.criticalBlockerCount}</li>
            <li>Fake evidence: {closure.fakeEvidenceCount}</li>
          </ul>
          <h3>Inter Cars flow (A→F)</h3>
          <ul>
            {closure.interCarsFlow.map((s) => (
              <li key={s.stage}>
                Stage {s.stage}: [{s.status}] {s.name}
              </li>
            ))}
          </ul>
          <h3>All sections</h3>
          <ul>
            {closure.sections.map((s) => (
              <li key={s.section}>
                [{s.status}] {s.section}
              </li>
            ))}
          </ul>
          {closure.blockers.length > 0 && (
            <>
              <h3>Blockers (required actions — no secrets shown)</h3>
              <ul>
                {closure.blockers.slice(0, 20).map((b) => (
                  <li key={`${b.code}-${b.provider || ""}`}>
                    [{b.severity}] {b.code}: {b.requiredAction}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {completion && (
        <section className="admin-card">
          <h2>Production completion ({completion.software})</h2>
          <ul>
            <li>Final go-live: {completion.finalGoLive}</li>
            <li>Sales: {completion.sales}</li>
            <li>Monitoring health: {completion.monitoring.healthStatus}</li>
            <li>Fake evidence: {completion.fakeEvidenceCount}</li>
            <li>Structured blockers: {completion.blockers.length}</li>
          </ul>
          <h3>Sections</h3>
          <ul>
            {completion.sections.map((s) => (
              <li key={s.section}>
                [{s.status}] {s.section}: {s.message}
                {SECTION_LINKS[s.section] && (
                  <>
                    {" "}
                    <Link href={SECTION_LINKS[s.section]}>open</Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {dashboard && (
        <>
          <section className="admin-card">
            <h2>Gate status</h2>
            <ul>
              <li>Phase: {dashboard.phase}</li>
              <li>Sales: {dashboard.salesEnabled}</li>
              <li>Live: {dashboard.liveStatus}</li>
              <li>Marketing spend: {dashboard.marketingSpendEnabled}</li>
            </ul>
          </section>

          <section className="admin-card">
            <h2>Real side effects (must be 0 in prep)</h2>
            <pre>{JSON.stringify(dashboard.safetyCounters, null, 2)}</pre>
          </section>

          <section className="admin-card">
            <h2>Mandatory checklist</h2>
            <ul>
              {dashboard.mandatoryChecklist.map((item) => (
                <li key={item.id}>
                  [{item.status}] {item.label}
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-card">
            <h2>Supplier chain</h2>
            <ul className="admin-link-list">
              <li><Link href="/admin/supplier-production-validation">#339 Validation</Link></li>
              <li><Link href="/admin/supplier-order-activation">#340 Activation</Link></li>
              <li><Link href="/admin/supplier-production-order-validation">#341/#342 CreateOrder</Link></li>
              <li><Link href="/admin/supplier-production-order-arming">#343 Arming</Link></li>
              <li><Link href="/admin/supplier-first-production-order">#344 First Order</Link></li>
              <li><Link href="/admin/supplier-controlled-go-live">#345 Go-Live</Link></li>
              <li><Link href="/admin/supplier-go-live-observation">#346 Observation</Link></li>
            </ul>
          </section>

          {dashboard.blockers.length > 0 && (
            <section className="admin-card">
              <h2>Blockers</h2>
              <ul>
                {dashboard.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
