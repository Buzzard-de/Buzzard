"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import { fetchReturnsRmaStatus, fetchRmaOverview, fetchRmaReturns } from "@/lib/returnsRma/client";
import type { ReturnsRmaStatus, RmaOverview, RmaReturnRow } from "@/lib/returnsRma/types";
import { formatPrice } from "@/lib/products";

const FLOW = ["Request", "Approve", "Label", "Transit", "Inspect", "Refund / Exchange", "Closed"];

export default function AdminReturnsRmaPanel() {
  const [status, setStatus] = useState<ReturnsRmaStatus | null>(null);
  const [overview, setOverview] = useState<RmaOverview | null>(null);
  const [returns, setReturns] = useState<RmaReturnRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, returnRows] = await Promise.all([
      fetchReturnsRmaStatus(),
      fetchRmaOverview(),
      fetchRmaReturns(search),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setReturns(returnRows);
  }, [search]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "returnsRma.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Returns & RMA…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Returns & RMA v2.5</h1>
        <p>Return requests, inspection, labels, refunds, exchanges and warranty claims</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Total", overview.total],
            ["Requested", overview.requested],
            ["In transit", overview.inTransit],
            ["Inspecting", overview.inspecting],
            ["Refunded", overview.refunded],
            ["Refund value", formatPrice(overview.refundValue)],
            ["Warranty", overview.warranty],
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="RMA, order number or customer email"
            aria-label="Search returns"
          />
          <button type="button" className="btn-secondary" onClick={() => reload().catch(() => undefined)}>
            Search
          </button>
        </div>

        <h2>Return queue</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>RMA</th>
                <th>Order</th>
                <th>Reason</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.rma_number}</strong>
                    <br />
                    <small>{row.customer_email || "—"}</small>
                  </td>
                  <td>{row.order_number}</td>
                  <td>{row.reason}</td>
                  <td>{row.type}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>RMA flow</h2>
        <div className="admin-flow">
          {FLOW.map((step, index) => (
            <span key={step}>
              {index > 0 && <span aria-hidden="true"> → </span>}
              <strong>{step}</strong>
            </span>
          ))}
        </div>
      </section>

      {status && (
        <section className="admin-card admin-meta">
          <p>
            Module v{status.version} · handoff to v2.1 refunds, v2.2 OMS exchange, v1.7 return labels
          </p>
        </section>
      )}
    </div>
  );
}
