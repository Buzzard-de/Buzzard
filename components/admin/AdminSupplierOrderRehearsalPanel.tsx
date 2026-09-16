"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchSupplierOrderRehearsalDashboard,
  fetchSupplierOrderRehearsalRecords,
  runSupplierOrderRehearsal,
  type RehearsalDashboard,
} from "@/lib/admin/supplierOrderRehearsalClient";

export default function AdminSupplierOrderRehearsalPanel() {
  const [dashboard, setDashboard] = useState<RehearsalDashboard | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [dashRes, rowsRes] = await Promise.all([
        fetchSupplierOrderRehearsalDashboard(),
        fetchSupplierOrderRehearsalRecords(),
      ]);
      setDashboard(dashRes.data);
      setRows(rowsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rehearsal dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("admin.auth.required");
      setLoading(false);
      return;
    }
    reload();
  }, [reload]);

  async function handleRunRehearsal() {
    try {
      const res = await runSupplierOrderRehearsal({
        market: "DE",
        channel: "DIRECT",
        productId: "reifen-pilot-sport",
        approverEmail: "manager@example.com",
      });
      setLastResult({ data: res.data, safety: res.safety });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rehearsal run failed");
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Supplier Order Go-Live Rehearsal</h1>
          <p className="admin-muted">
            Production activation simulation ·{" "}
            <Link href="/admin/supplier-order-readiness">Readiness Gate</Link> ·{" "}
            <Link href="/admin/fulfillment">Control Tower</Link>
          </p>
        </div>
      </header>

      <div className="admin-alert admin-alert-warning" role="status">
        REAL SUPPLIER ORDER NETWORK: {dashboard?.realSupplierOrderNetwork || "DISABLED"} · REAL SUPPLIER ORDER HTTP
        CALLS: {dashboard?.safety.realSupplierOrderHttpCalls ?? 0} · REHEARSAL MODE:{" "}
        {dashboard?.rehearsalMode || "ACTIVE"} · SIMULATED SUPPLIER RESPONSE: YES · REAL CUSTOMER SHIPMENT: NO
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p>Loading…</p>}

      {dashboard && (
        <section className="admin-grid admin-grid-4">
          <div className="admin-card">
            <h3>Passed</h3>
            <p>{dashboard.passed}</p>
          </div>
          <div className="admin-card">
            <h3>Blocked</h3>
            <p>{dashboard.blocked}</p>
          </div>
          <div className="admin-card">
            <h3>Failed</h3>
            <p>{dashboard.failed}</p>
          </div>
          <div className="admin-card">
            <h3>Markets Tested</h3>
            <p>{dashboard.marketsTested ?? 0}</p>
          </div>
        </section>
      )}

      <section className="admin-actions">
        <button type="button" className="admin-btn" onClick={handleRunRehearsal}>
          Run Go-Live Rehearsal (DE / DIRECT)
        </button>
      </section>

      {lastResult && (
        <section className="admin-card">
          <h3>Last Rehearsal Result</h3>
          <pre>{JSON.stringify(lastResult, null, 2)}</pre>
        </section>
      )}

      <section className="admin-card">
        <h3>Rehearsal Records</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Order</th>
              <th>Supplier</th>
              <th>Market</th>
              <th>Status</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row) => (
              <tr key={String(row.rehearsalId)}>
                <td>{String(row.rehearsalId)}</td>
                <td>{String(row.orderId)}</td>
                <td>{String(row.supplierId)}</td>
                <td>{String(row.market)}</td>
                <td>{String(row.overallStatus)}</td>
                <td>{String(row.currentStage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
