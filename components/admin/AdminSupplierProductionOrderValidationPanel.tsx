"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchCreateOrderValidationDashboard,
  runCreateOrderProductionValidation,
  type CreateOrderValidationDashboard,
} from "@/lib/admin/supplierProductionOrderValidationClient";

export default function AdminSupplierProductionOrderValidationPanel() {
  const [dashboard, setDashboard] = useState<CreateOrderValidationDashboard | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const dashRes = await fetchCreateOrderValidationDashboard();
      setDashboard(dashRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
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

  async function handleRun() {
    try {
      const res = await runCreateOrderProductionValidation({ market: "DE", channel: "DIRECT" });
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
          <h1>Inter Cars createOrder Production Validation</h1>
          <p className="admin-muted">
            Capability validation gate ·{" "}
            <Link href="/admin/supplier-order-activation">Activation Safety</Link> ·{" "}
            <Link href="/admin/supplier-production-validation">Production Validation</Link>
          </p>
        </div>
      </header>

      <div className="admin-alert admin-alert-warning" role="status">
        INTER CARS CREATEORDER: {dashboard?.createOrderCapability || "UNVERIFIED"} · PRODUCTION NETWORK:{" "}
        {dashboard?.productionOrderNetwork || "OFF"} · REAL SUPPLIER ORDER HTTP CALLS:{" "}
        {dashboard?.realSupplierOrderCalls ?? 0} · REAL CUSTOMER ORDERS: {dashboard?.realCustomerOrders ?? 0}
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
            <h3>Capability</h3>
            <p>{dashboard.createOrderCapability}</p>
          </div>
          <div className="admin-card">
            <h3>Tracking</h3>
            <p>{dashboard.trackingCapability}</p>
          </div>
        </section>
      )}

      <section className="admin-section">
        <button type="button" className="admin-button" onClick={handleRun}>
          Run createOrder Validation (DE / DIRECT)
        </button>
      </section>

      {lastResult && (
        <section className="admin-section">
          <h2>Last Result</h2>
          <pre className="admin-code">{JSON.stringify(lastResult, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}
