"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchFirstProductionOrderDashboard,
  requestFirstProductionOrder,
  type FirstProductionOrderDashboard,
} from "@/lib/admin/supplierFirstProductionOrderClient";

export default function AdminSupplierFirstProductionOrderPanel() {
  const [dashboard, setDashboard] = useState<FirstProductionOrderDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetchFirstProductionOrderDashboard();
      setDashboard(res.data);
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

  async function handleRequest() {
    try {
      await requestFirstProductionOrder({ market: "DE", channel: "DIRECT" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Inter Cars First Production Order</h1>
          <p className="admin-muted">
            EXECUTION_AUTHORIZED ≠ EXECUTED ·{" "}
            <Link href="/admin/supplier-production-order-arming">Arming (#343)</Link> ·{" "}
            <Link href="/admin/supplier-production-order-validation">Validation (#342)</Link> ·{" "}
            <Link href="/admin/supplier-controlled-go-live">Go-Live (#345)</Link>
          </p>
        </div>
      </header>

      <div className="admin-alert admin-alert-warning" role="status">
        CREATE ORDER: {dashboard?.createOrderCapability || "UNVERIFIED"} · FIRST ORDER:{" "}
        {dashboard?.firstOrderState || "BLOCKED"} · ARMING: {dashboard?.armingState || "ARMING_BLOCKED"} · EVIDENCE:{" "}
        {dashboard?.validationEvidence || "NONE"} · NETWORK: {dashboard?.productionOrderNetwork || "OFF"} · REAL HTTP:{" "}
        {dashboard?.realSupplierHttpCalls ?? 0}
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-muted">Loading…</p>}

      {dashboard && (
        <>
          <section className="admin-grid admin-grid-4">
            <div className="admin-card">
              <h3>Executions</h3>
              <p>{dashboard.executionCount}</p>
            </div>
            <div className="admin-card">
              <h3>Ready</h3>
              <p>{dashboard.ready}</p>
            </div>
            <div className="admin-card">
              <h3>Authorized</h3>
              <p>{dashboard.authorized}</p>
            </div>
            <div className="admin-card">
              <h3>Executed</h3>
              <p>{dashboard.executed}</p>
            </div>
          </section>

          {dashboard.blockers.length > 0 && (
            <section className="admin-card">
              <h3>Blockers</h3>
              <ul>
                {dashboard.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          )}

          <button type="button" className="admin-button" onClick={handleRequest}>
            Request First Order
          </button>
        </>
      )}
    </div>
  );
}
