"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchAdvancedSearchStatus,
  fetchSearchOverview,
  fetchZeroResultQueries,
} from "@/lib/advancedSearch/client";
import type { AdvancedSearchStatus, SearchOverview, ZeroResultRow } from "@/lib/advancedSearch/types";
import { formatPrice } from "@/lib/products";

const FEATURES = [
  "Autocomplete",
  "Full-text search",
  "Category filters",
  "Brand filters",
  "Price filters",
  "Rating filters",
  "Attribute filters",
  "Sorting",
  "Pagination",
  "Synonyms",
  "Search analytics",
  "Zero-result analytics",
  "AI search ready",
  "OpenSearch ready",
];

export default function AdminAdvancedSearchPanel() {
  const [status, setStatus] = useState<AdvancedSearchStatus | null>(null);
  const [overview, setOverview] = useState<SearchOverview | null>(null);
  const [zeroResults, setZeroResults] = useState<ZeroResultRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, zeroRows] = await Promise.all([
      fetchAdvancedSearchStatus(),
      fetchSearchOverview(),
      fetchZeroResultQueries(),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setZeroResults(zeroRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "advancedSearch.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Advanced Search…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Advanced Search v2.9</h1>
        <p>Product discovery, filters, synonyms, ranking and search analytics</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Products", overview.products],
            ["Searches", overview.searches],
            ["Zero results", overview.zeroResults],
            ["Clicks", overview.clicks],
            ["Synonyms", overview.synonyms],
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

        <h2>Top queries</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Query</th>
                <th>Searches</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.topQueries || []).map((row) => (
                <tr key={row.normalized_query}>
                  <td>{row.normalized_query}</td>
                  <td>{row.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Zero-result queries</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Query</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {zeroResults.map((row) => (
                <tr key={row.normalized_query}>
                  <td>{row.normalized_query}</td>
                  <td>{row.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Discovery features</h2>
        <div className="admin-flow">
          {FEATURES.map((item) => (
            <span key={item} className="admin-tag">
              {item}
            </span>
          ))}
        </div>
      </section>

      {status && (
        <section className="admin-card admin-meta">
          <p>
            Module v{status.version} · {status.totals.products} indexed products · handoff to v2.8 AI Center and OpenSearch
          </p>
          <p>Demo index includes products from {formatPrice(9.9)} to {formatPrice(299)}.</p>
        </section>
      )}
    </div>
  );
}
