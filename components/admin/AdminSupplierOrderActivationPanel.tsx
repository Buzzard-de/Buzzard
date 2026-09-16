"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchActivationDashboard,
  fetchActivationRecords,
  runActivationPreflight,
  type ActivationDashboard,
} from "@/lib/admin/supplierOrderActivationClient";

export default function AdminSupplierOrderActivationPanel() {
  const [dashboard, setDashboard] = useState<ActivationDashboard | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [preflight, setPreflight] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [dashRes, rowsRes] = await Promise.all([
        fetchActivationDashboard(),
        fetchActivationRecords(),
      ]);
      setDashboard(dashRes.data);
      setRows(rowsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activation dashboard");
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

  async function handlePreflight() {
    try {
      const res = await runActivationPreflight({ market: "DE", channel: "DIRECT" });
      setPreflight(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preflight failed");
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Inter Cars Production Activation Safety Gate</h1>
          <p className="admin-muted">
            Controlled activation boundary ·{" "}
            <Link href="/admin/supplier-production-validation">Production Validation</Link> ·{" "}
            <Link href="/admin/supplier-order-rehearsal">Go-Live Rehearsal</Link> ·{" "}
            <Link href="/admin/supplier-order-readiness">Readiness Gate</Link>
          </p>
        </div>
      </header>

      <div className="admin-alert admin-alert-warning" role="status">
        REAL SUPPLIER ORDER NETWORK: {dashboard?.realSupplierOrderNetwork || "DISABLED"} · REAL ORDER HTTP CALLS:{" "}
        {dashboard?.safety.realSupplierOrderCalls ?? 0} · INTER CARS CREATEORDER:{" "}
        {dashboard?.interCarsCreateOrder || "UNVERIFIED"} · PRODUCTION ACTIVATION:{" "}
        {dashboard?.productionActivation || "NOT ACTIVE"} · FIRST ORDER: {dashboard?.firstRealOrder || "NOT SENT"}
      </div>

      <div className="admin-alert" role="status">
        Network state: {dashboard?.networkState || "DISABLED"} · Activation request ≠ network enabled ≠ real order
        sent
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-muted">Loading…</p>}

      {dashboard && (
        <section className="admin-grid admin-grid-4">
          <div className="admin-card">
            <h3>Activations</h3>
            <p>{dashboard.activationCount}</p>
          </div>
          <div className="admin-card">
            <h3>Blocked</h3>
            <p>{dashboard.blocked}</p>
          </div>
          <div className="admin-card">
            <h3>Armed</h3>
            <p>{dashboard.armed}</p>
          </div>
          <div className="admin-card">
            <h3>First Orders Prepared</h3>
            <p>{dashboard.firstOrdersPrepared}</p>
          </div>
        </section>
      )}

      <section className="admin-section">
        <button type="button" className="admin-button" onClick={handlePreflight}>
          Run Preflight (DE / DIRECT)
        </button>
      </section>

      {preflight && (
        <section className="admin-section">
          <h2>Preflight Result</h2>
          <pre className="admin-code">{JSON.stringify(preflight, null, 2)}</pre>
        </section>
      )}

      {rows.length > 0 && (
        <section className="admin-section">
          <h2>Activation Records</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Network</th>
                <th>Real Order</th>
                <th>Market</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((row) => (
                <tr key={String(row.activationId)}>
                  <td>{String(row.activationId)}</td>
                  <td>{String(row.status)}</td>
                  <td>{String(row.networkState)}</td>
                  <td>{row.realOrderSent ? "SENT" : "NOT SENT"}</td>
                  <td>{String(row.market)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
