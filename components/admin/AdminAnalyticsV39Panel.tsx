"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchAnalyticsV39Overview,
  fetchAnalyticsV39Records,
  fetchAnalyticsV39Status,
} from "@/lib/analyticsV39/client";
import type { AnalyticsV39Overview, AnalyticsV39Record, AnalyticsV39Status } from "@/lib/analyticsV39/types";

const FEATURES = [
  "Dashboards",
  "KPI snapshots",
  "Reports",
  "Segments",
  "Analytics jobs",
];

export default function AdminAnalyticsV39Panel() {
  const [status, setStatus] = useState<AnalyticsV39Status | null>(null);
  const [overview, setOverview] = useState<AnalyticsV39Overview | null>(null);
  const [records, setRecords] = useState<AnalyticsV39Record[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, recordRows] = await Promise.all([
      fetchAnalyticsV39Status(),
      fetchAnalyticsV39Overview(),
      fetchAnalyticsV39Records(),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setRecords(recordRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "analyticsV39.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Analytics & BI…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Analytics & BI v3.9</h1>
        <p>Dashboards, KPI snapshots, reports and analytics jobs</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Records", overview.records],
            ["Active", overview.active],
            ["Jobs", overview.jobs],
            ["Queued", overview.queuedJobs],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="admin-card">
        <div className="admin-toolbar">
          <button type="button" className="btn-secondary" onClick={() => reload().catch(() => undefined)}>
            Refresh
          </button>
        </div>

        <h2>Records</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.code}</strong></td>
                  <td>{row.name}</td>
                  <td>{row.status}</td>
                  <td>{row.updated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Module capabilities</h2>
        <ul className="admin-feature-list">
          {FEATURES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {status && <p className="admin-meta">API version {status.version}</p>}
      </section>
    </div>
  );
}
