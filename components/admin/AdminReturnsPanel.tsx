"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import { fetchReturnRecoveryList } from "@/lib/returnRecovery/client";
import type { ReturnRecoveryRow, ReturnRecoverySafety } from "@/lib/returnRecovery/types";
import { formatPrice } from "@/lib/products";

const FILTERS = [
  { id: "", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "supplier_recovery_pending", label: "Supplier recovery pending" },
  { id: "unrecovered", label: "Unrecovered" },
];

export default function AdminReturnsPanel() {
  const [rows, setRows] = useState<ReturnRecoveryRow[]>([]);
  const [safety, setSafety] = useState<ReturnRecoverySafety | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const data = await fetchReturnRecoveryList(filter);
    setRows(data.returns || []);
    setSafety(data.safety || null);
  }, [filter]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "returns.loadFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  const exposureTotal = useMemo(
    () => rows.reduce((sum, row) => sum + (row.unrecoveredAmount || 0), 0),
    [rows]
  );

  if (loading) return <p>Lade Return & Recovery…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Return & Recovery Engine</h1>
        <p>
          Central return cases with separate customer refund and supplier recovery tracking
          (dry-run by default).
        </p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {safety && (
        <section className="admin-kpi-grid">
          {[
            ["Payments", safety.paymentsEnabled ? "ON" : "OFF"],
            ["Supplier live", safety.supplierLiveEnabled ? "ON" : "OFF"],
            ["Sales", safety.salesEnabled ? "ON" : "OFF"],
            ["Mode", safety.diagnosticOnly ? "Diagnostic" : "Live"],
            ["Buzzard exposure", formatPrice(exposureTotal)],
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
          {FILTERS.map((f) => (
            <button
              key={f.id || "all"}
              type="button"
              className={filter === f.id ? "btn-primary" : "btn-secondary"}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
          <button type="button" className="btn-secondary" onClick={() => reload().catch(() => undefined)}>
            Refresh
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Return ID</th>
                <th>Order</th>
                <th>Product</th>
                <th>Customer refund</th>
                <th>Supplier expected</th>
                <th>Supplier confirmed</th>
                <th>Unrecovered</th>
                <th>Liability</th>
                <th>Status</th>
                <th>Warnings</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.id}</strong>
                    <br />
                    <small>{row.lastAction || "—"}</small>
                  </td>
                  <td>
                    {row.orderId}
                    <br />
                    <small>{row.orderLineId}</small>
                  </td>
                  <td>{row.productId || "—"}</td>
                  <td>{formatPrice(row.customerRefundAmount || 0)}</td>
                  <td>{formatPrice(row.supplierRecoveryExpected || 0)}</td>
                  <td>{formatPrice(row.supplierRecoveryConfirmed || 0)}</td>
                  <td>{formatPrice(row.unrecoveredAmount || 0)}</td>
                  <td>{row.supplierLiability}</td>
                  <td>{row.status}</td>
                  <td>
                    {(row.warnings || []).map((w) => (
                      <span key={w} className="admin-badge admin-badge-warn">
                        {w}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
