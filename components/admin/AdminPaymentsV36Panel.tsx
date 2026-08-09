"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchPaymentsV36Overview,
  fetchPaymentsV36Records,
  fetchPaymentsV36Status,
} from "@/lib/paymentsV36/client";
import type { PaymentsV36Overview, PaymentsV36Record, PaymentsV36Status } from "@/lib/paymentsV36/types";

const FEATURES = [
  "Payment providers",
  "Settlements",
  "Refunds",
  "Invoices",
  "Finance jobs",
];

export default function AdminPaymentsV36Panel() {
  const [status, setStatus] = useState<PaymentsV36Status | null>(null);
  const [overview, setOverview] = useState<PaymentsV36Overview | null>(null);
  const [records, setRecords] = useState<PaymentsV36Record[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, recordRows] = await Promise.all([
      fetchPaymentsV36Status(),
      fetchPaymentsV36Overview(),
      fetchPaymentsV36Records(),
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
      .catch((err) => setError(err instanceof Error ? err.message : "paymentsV36.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Payments & Finance…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Payments & Finance v3.6</h1>
        <p>Payment providers, settlements, refunds and finance jobs</p>
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
