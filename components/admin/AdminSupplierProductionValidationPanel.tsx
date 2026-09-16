"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchProductionValidationDashboard,
  fetchProductionValidationRecords,
  runProductionCapabilityValidation,
  type ProductionValidationDashboard,
} from "@/lib/admin/supplierProductionValidationClient";

export default function AdminSupplierProductionValidationPanel() {
  const [dashboard, setDashboard] = useState<ProductionValidationDashboard | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [dashRes, rowsRes] = await Promise.all([
        fetchProductionValidationDashboard(),
        fetchProductionValidationRecords(),
      ]);
      setDashboard(dashRes.data);
      setRows(rowsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load validation dashboard");
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

  async function handleRunValidation() {
    try {
      const res = await runProductionCapabilityValidation({
        market: "DE",
        channel: "DIRECT",
        allowLiveRead: false,
      });
      setLastResult({ data: res.data, safety: res.safety });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation run failed");
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Inter Cars Production Capability Validation</h1>
          <p className="admin-muted">
            Credential &amp; capability gate ·{" "}
            <Link href="/admin/supplier-order-readiness">Readiness Gate</Link> ·{" "}
            <Link href="/admin/supplier-order-rehearsal">Go-Live Rehearsal</Link>
          </p>
        </div>
      </header>

      <div className="admin-alert admin-alert-warning" role="status">
        REAL SUPPLIER ORDER NETWORK: {dashboard?.realSupplierOrderNetwork || "DISABLED"} · REAL ORDER HTTP CALLS:{" "}
        {dashboard?.safety.realOrderCalls ?? 0} · REAL CUSTOMER SHIPMENT: NO · REAL PAYMENT CAPTURE: NO · LIVE READ:{" "}
        {dashboard?.liveReadMode || "CONTROLLED"} · PRODUCTION ORDER ACTIVATION:{" "}
        {dashboard?.productionOrderActivation || "NOT ACTIVE"}
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-muted">Loading…</p>}

      {dashboard && (
        <section className="admin-grid admin-grid-4">
          <div className="admin-card">
            <h3>Validations</h3>
            <p>{dashboard.validationCount}</p>
          </div>
          <div className="admin-card">
            <h3>Blocked</h3>
            <p>{dashboard.blocked}</p>
          </div>
          <div className="admin-card">
            <h3>Passed</h3>
            <p>{dashboard.passed}</p>
          </div>
          <div className="admin-card">
            <h3>Markets</h3>
            <p>{dashboard.marketsValidated}</p>
          </div>
        </section>
      )}

      <section className="admin-section">
        <button type="button" className="admin-button" onClick={handleRunValidation}>
          Run Production Validation (DE / DIRECT)
        </button>
      </section>

      {lastResult && (
        <section className="admin-section">
          <h2>Last Result</h2>
          <pre className="admin-code">{JSON.stringify(lastResult, null, 2)}</pre>
        </section>
      )}

      {rows.length > 0 && (
        <section className="admin-section">
          <h2>Recent Validations</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Supplier</th>
                <th>Market</th>
                <th>Channel</th>
                <th>Credential</th>
                <th>createOrder</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((row) => (
                <tr key={String(row.validationId)}>
                  <td>{String(row.validationId)}</td>
                  <td>{String(row.supplierId)}</td>
                  <td>{String(row.market)}</td>
                  <td>{String(row.channel)}</td>
                  <td>{String(row.credentialStatus)}</td>
                  <td>{String(row.createOrderCapability)}</td>
                  <td>{String(row.overallStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
