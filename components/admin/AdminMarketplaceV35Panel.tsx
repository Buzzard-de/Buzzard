"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchMarketplaceV35Overview,
  fetchMarketplaceV35Records,
  fetchMarketplaceV35Status,
} from "@/lib/marketplaceV35/client";
import type { MarketplaceV35Overview, MarketplaceV35Record, MarketplaceV35Status } from "@/lib/marketplaceV35/types";

const FEATURES = [
  "Channel listings",
  "Inventory sync",
  "Order import",
  "Price rules",
  "Marketplace jobs",
];

export default function AdminMarketplaceV35Panel() {
  const [status, setStatus] = useState<MarketplaceV35Status | null>(null);
  const [overview, setOverview] = useState<MarketplaceV35Overview | null>(null);
  const [records, setRecords] = useState<MarketplaceV35Record[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, recordRows] = await Promise.all([
      fetchMarketplaceV35Status(),
      fetchMarketplaceV35Overview(),
      fetchMarketplaceV35Records(),
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
      .catch((err) => setError(err instanceof Error ? err.message : "marketplaceV35.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Marketplace Integration…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Marketplace Integration v3.5</h1>
        <p>Channel listings, sync jobs and marketplace orders</p>
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
