"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchOrderManagementV32Overview,
  fetchOrderManagementV32Records,
  fetchOrderManagementV32Status,
} from "@/lib/orderManagementV32/client";
import type { OrderManagementV32Overview, OrderManagementV32Record, OrderManagementV32Status } from "@/lib/orderManagementV32/types";

const FEATURES = [
  "Orders",
  "Order items",
  "Status lifecycle",
  "Split orders",
  "Partial fulfillment",
  "Supplier routing",
  "Tracking",
];

export default function AdminOrderManagementV32Panel() {
  const [status, setStatus] = useState<OrderManagementV32Status | null>(null);
  const [overview, setOverview] = useState<OrderManagementV32Overview | null>(null);
  const [records, setRecords] = useState<OrderManagementV32Record[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, recordRows] = await Promise.all([
      fetchOrderManagementV32Status(),
      fetchOrderManagementV32Overview(),
      fetchOrderManagementV32Records(),
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
      .catch((err) => setError(err instanceof Error ? err.message : "orderManagementV32.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Order Management System…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Order Management System v3.2</h1>
        <p>Orders, lifecycle, split orders, supplier routing and tracking</p>
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
