"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchFinalGoLiveDashboard,
  type FinalGoLiveDashboard,
} from "@/lib/admin/finalProductionGoLiveClient";

export default function AdminFinalProductionGoLivePanel() {
  const [dashboard, setDashboard] = useState<FinalGoLiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetchFinalGoLiveDashboard();
      setDashboard(res.data);
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
          <h1>Final Production Go-Live (#354)</h1>
          <p className="admin-muted">
            Authoritative gate · Sales CLOSED until all mandatory items PASS ·{" "}
            <Link href="/admin/inter-cars-production-access">#347 Inter Cars</Link>
          </p>
        </div>
      </header>

      <div className="admin-alert admin-alert-warning" role="status">
        LIVE validation remains BLOCKED without genuine external evidence. This dashboard never exposes secrets.
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-muted">Loading…</p>}

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
