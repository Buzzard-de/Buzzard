"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchLogisticsV34Overview,
  fetchLogisticsV34Records,
  fetchLogisticsV34Status,
} from "@/lib/logisticsV34/client";
import type { LogisticsV34Overview, LogisticsV34Record, LogisticsV34Status } from "@/lib/logisticsV34/types";

const FEATURES = [
  "Carriers",
  "Shipping labels",
  "Tracking events",
  "Zones",
  "Delivery promises",
];

export default function AdminLogisticsV34Panel() {
  const [status, setStatus] = useState<LogisticsV34Status | null>(null);
  const [overview, setOverview] = useState<LogisticsV34Overview | null>(null);
  const [records, setRecords] = useState<LogisticsV34Record[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, recordRows] = await Promise.all([
      fetchLogisticsV34Status(),
      fetchLogisticsV34Overview(),
      fetchLogisticsV34Records(),
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
      .catch((err) => setError(err instanceof Error ? err.message : "logisticsV34.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Logistics & Shipping…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Logistics & Shipping v3.4</h1>
        <p>Carriers, labels, tracking events and shipping zones</p>
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
