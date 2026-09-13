"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchFulfillmentTowerDashboard,
  fetchFulfillmentTowerDetail,
  fetchFulfillmentTowerIncidents,
  fetchFulfillmentTowerRows,
  runFulfillmentTowerReconciliation,
  type FulfillmentTowerDashboard,
  type FulfillmentTowerRow,
} from "@/lib/admin/fulfillmentControlTowerClient";

export default function AdminFulfillmentControlTowerPanel() {
  const [dashboard, setDashboard] = useState<FulfillmentTowerDashboard | null>(null);
  const [rows, setRows] = useState<FulfillmentTowerRow[]>([]);
  const [incidents, setIncidents] = useState<Array<Record<string, unknown>>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [reconcileResult, setReconcileResult] = useState<Record<string, unknown> | null>(null);

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [dashRes, rowsRes, incRes] = await Promise.all([
        fetchFulfillmentTowerDashboard(),
        fetchFulfillmentTowerRows(),
        fetchFulfillmentTowerIncidents({ status: "OPEN" }),
      ]);
      setDashboard(dashRes.data);
      setRows(rowsRes.data || []);
      setIncidents(incRes.data || []);
      if (selectedId) {
        const detailRes = await fetchFulfillmentTowerDetail(selectedId);
        setDetail(detailRes.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading control tower");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("admin.auth.required");
      setLoading(false);
      return;
    }
    reload();
  }, [reload]);

  async function handleReconcile() {
    setActionLoading(true);
    try {
      const res = await runFulfillmentTowerReconciliation({});
      setReconcileResult(res.data);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconciliation failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Fulfillment Control Tower</h1>
          <p className="admin-muted">
            Operational reconciliation ·{" "}
            <Link href="/admin/suppliers">Suppliers</Link> ·{" "}
            <Link href="/admin/orders">Orders</Link>
          </p>
        </div>
      </header>

      <p className="admin-muted">
        REAL SUPPLIER ORDER NETWORK:{" "}
        <strong>{dashboard?.realSupplierOrderNetwork || "DISABLED"}</strong>
      </p>

      {error ? <p className="admin-error">{error}</p> : null}
      {loading ? <p>Loading…</p> : null}

      {dashboard ? (
        <section className="admin-kpi-grid">
          <article className="admin-stat"><strong>{dashboard.totalFulfillments}</strong><span>Total</span></article>
          <article className="admin-stat"><strong>{dashboard.healthy}</strong><span>Healthy</span></article>
          <article className="admin-stat"><strong>{dashboard.warning}</strong><span>Warning</span></article>
          <article className="admin-stat"><strong>{dashboard.mismatch}</strong><span>Mismatch</span></article>
          <article className="admin-stat"><strong>{dashboard.critical}</strong><span>Critical</span></article>
          <article className="admin-stat"><strong>{dashboard.openIncidents}</strong><span>Open Incidents</span></article>
          <article className="admin-stat"><strong>{dashboard.suppliersAffected}</strong><span>Suppliers Affected</span></article>
          <article className="admin-stat"><strong>{dashboard.ordersAffected}</strong><span>Orders Affected</span></article>
        </section>
      ) : null}

      <div className="admin-inline-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={actionLoading}
          onClick={handleReconcile}
        >
          Run Reconciliation
        </button>
      </div>

      {reconcileResult ? (
        <pre className="admin-code-block">{JSON.stringify(reconcileResult, null, 2)}</pre>
      ) : null}

      <section className="admin-panel">
        <h2>Fulfillments</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Supplier Order</th>
                <th>Classification</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.fulfillmentId}>
                  <td>
                    <button
                      type="button"
                      className="admin-link-btn"
                      onClick={() => {
                        setSelectedId(row.fulfillmentId);
                        fetchFulfillmentTowerDetail(row.fulfillmentId)
                          .then((res) => setDetail(res.data || null))
                          .catch((err) => setError(err instanceof Error ? err.message : "Error"));
                      }}
                    >
                      {row.orderNumber}
                    </button>
                    <div className="admin-muted">{row.fulfillmentId}</div>
                  </td>
                  <td>{row.supplierId}</td>
                  <td>{row.operationalStatus}</td>
                  <td>{row.supplierOrderId || "—"}</td>
                  <td>{row.supplierOrderClassification}</td>
                  <td>{row.supplierHealth}</td>
                </tr>
              ))}
              {!rows.length && !loading ? (
                <tr><td colSpan={6}>No fulfillments</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {detail ? (
        <section className="admin-panel">
          <h2>Fulfillment Detail</h2>
          <pre className="admin-code-block">{JSON.stringify(detail, null, 2)}</pre>
        </section>
      ) : null}

      <section className="admin-panel">
        <h2>Open Incidents</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Severity</th><th>Category</th><th>Code</th><th>Message</th></tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={String(inc.incidentId)}>
                  <td>{String(inc.incidentId)}</td>
                  <td>{String(inc.severity)}</td>
                  <td>{String(inc.category)}</td>
                  <td>{String(inc.code)}</td>
                  <td>{String(inc.message)}</td>
                </tr>
              ))}
              {!incidents.length ? (
                <tr><td colSpan={5}>No open incidents</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
