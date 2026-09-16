"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchProductionArmingDashboard,
  requestProductionOrderArming,
  type ProductionArmingDashboard,
} from "@/lib/admin/supplierProductionOrderArmingClient";

export default function AdminSupplierProductionOrderArmingPanel() {
  const [dashboard, setDashboard] = useState<ProductionArmingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetchProductionArmingDashboard();
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
      await requestProductionOrderArming({ market: "DE", channel: "DIRECT" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Inter Cars Production Order Arming</h1>
          <p className="admin-muted">
            ARMED ≠ EXECUTED ·{" "}
            <Link href="/admin/supplier-production-order-validation">Validation (#342)</Link> ·{" "}
            <Link href="/admin/supplier-order-activation">Activation (#340)</Link>
          </p>
        </div>
      </header>

      <div className="admin-alert admin-alert-warning" role="status">
        CREATE ORDER: {dashboard?.createOrderCapability || "UNVERIFIED"} · ARMING:{" "}
        {dashboard?.armingState || "ARMING_BLOCKED"} · EVIDENCE: {dashboard?.validationEvidence || "NONE"} · NETWORK:{" "}
        {dashboard?.productionOrderNetwork || "OFF"} · REAL ORDERS: {dashboard?.realSupplierOrderCalls ?? 0}
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-muted">Loading…</p>}

      {dashboard && (
        <>
          <section className="admin-grid admin-grid-4">
            <div className="admin-card">
              <h3>Arming Records</h3>
              <p>{dashboard.armingCount}</p>
            </div>
            <div className="admin-card">
              <h3>Armed</h3>
              <p>{dashboard.armed}</p>
            </div>
            <div className="admin-card">
              <h3>Ready</h3>
              <p>{dashboard.ready}</p>
            </div>
            <div className="admin-card">
              <h3>Blocked</h3>
              <p>{dashboard.blocked}</p>
            </div>
          </section>
          <p className="admin-muted">Blockers: {(dashboard.blockers || []).join(", ") || "none"}</p>
          <button type="button" className="admin-btn" onClick={handleRequest}>
            Request Arming
          </button>
        </>
      )}
    </div>
  );
}
