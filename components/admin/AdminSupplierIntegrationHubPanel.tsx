"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchSupplierIntegrationHubOverview,
  fetchSupplierIntegrationHubStatus,
  fetchSupplierIntegrationHubSuppliers,
} from "@/lib/supplierIntegrationHub/client";
import type {
  SupplierIntegrationHubOverview,
  SupplierIntegrationHubRow,
  SupplierIntegrationHubStatus,
} from "@/lib/supplierIntegrationHub/types";

const CAPABILITIES = [
  "API",
  "XML",
  "CSV",
  "FTP",
  "Product mapping",
  "Price sync",
  "Stock sync",
  "Lead time",
  "Dropshipping",
  "Blind shipping",
  "White-label shipping",
  "Supplier orders",
  "Sync jobs",
  "Retry-ready",
  "TecDoc mapping ready",
  "PIM v3.0 ready",
  "OMS v2.2 ready",
];

export default function AdminSupplierIntegrationHubPanel() {
  const [status, setStatus] = useState<SupplierIntegrationHubStatus | null>(null);
  const [overview, setOverview] = useState<SupplierIntegrationHubOverview | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierIntegrationHubRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, supplierRows] = await Promise.all([
      fetchSupplierIntegrationHubStatus(),
      fetchSupplierIntegrationHubOverview(),
      fetchSupplierIntegrationHubSuppliers(),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setSuppliers(supplierRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "supplierIntegrationHub.requestFailed")
      )
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Supplier Integration Hub…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Supplier Integration Hub v3.1</h1>
        <p>B2B connectivity, feed sync, SKU mapping, dropshipping and supplier order routing</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Suppliers", overview.suppliers],
            ["Active", overview.active],
            ["Dropship", overview.dropship],
            ["Blind shipping", overview.blindShipping],
            ["White label", overview.whiteLabel],
            ["Mappings", overview.mappings],
            ["Sync jobs", overview.syncJobs],
            ["Supplier orders", overview.supplierOrders],
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

        <h2>Supplier connections</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Feed</th>
                <th>Capabilities</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.code}</strong>
                    <br />
                    <small>{row.country}</small>
                  </td>
                  <td>{row.name}</td>
                  <td>{row.feed_type.toUpperCase()}</td>
                  <td>
                    {[
                      row.supports_dropshipping ? "Dropship" : "",
                      row.supports_blind_shipping ? "Blind" : "",
                      row.supports_white_label ? "White label" : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Integration capabilities</h2>
        <div className="admin-flow">
          {CAPABILITIES.map((item) => (
            <span key={item} className="admin-tag">
              {item}
            </span>
          ))}
        </div>
      </section>

      {status && (
        <section className="admin-card admin-meta">
          <p>
            Module v{status.version} · demo mapping SUP-5W30 → BZ-OIL-5W30 · handoff to PIM v3.0 and OMS v2.2
          </p>
        </section>
      )}
    </div>
  );
}
