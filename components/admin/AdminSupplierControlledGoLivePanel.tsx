"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchControlledGoLiveDashboard,
  requestGoLiveReview,
  type ControlledGoLiveDashboard,
} from "@/lib/admin/supplierControlledGoLiveClient";

export default function AdminSupplierControlledGoLivePanel() {
  const [dashboard, setDashboard] = useState<ControlledGoLiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetchControlledGoLiveDashboard();
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

  async function handleRequestReview() {
    try {
      await requestGoLiveReview({ market: "DE", channel: "DIRECT" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Controlled Go-Live Gate (#345)</h1>
          <p className="admin-muted">
            CONTROLLED_GO_LIVE ≠ UNLIMITED_GO_LIVE ·{" "}
            <Link href="/admin/supplier-first-production-order">First Order (#344)</Link> ·{" "}
            <Link href="/admin/supplier-production-order-arming">Arming (#343)</Link> ·{" "}
            <Link href="/admin/supplier-production-order-validation">Validation (#342)</Link>
          </p>
        </div>
      </header>

      <div className="admin-alert admin-alert-warning" role="status">
        GO-LIVE: {dashboard?.controlledGoLive || "BLOCKED"} · LIVE EVIDENCE:{" "}
        {dashboard?.liveValidation || "NONE"} · CREATE ORDER: {dashboard?.createOrderCapability || "UNVERIFIED"} ·
        ARMING: {dashboard?.armingState || "ARMING_BLOCKED"} · FIRST ORDER: {dashboard?.firstOrderState || "BLOCKED"}{" "}
        · NETWORK: {dashboard?.productionNetwork || "OFF"} · REAL HTTP: {dashboard?.realSupplierHttpCalls ?? 0}
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-muted">Loading…</p>}

      {dashboard && (
        <>
          <section className="admin-grid admin-grid-4">
            <div className="admin-card">
              <h3>Go-Live Records</h3>
              <p>{dashboard.goLiveCount}</p>
            </div>
            <div className="admin-card">
              <h3>Review Ready</h3>
              <p>{dashboard.reviewReady}</p>
            </div>
            <div className="admin-card">
              <h3>Active</h3>
              <p>{dashboard.active}</p>
            </div>
            <div className="admin-card">
              <h3>Blocked</h3>
              <p>{dashboard.blocked}</p>
            </div>
          </section>

          <section className="admin-grid admin-grid-3">
            <div className="admin-card">
              <h3>Supplier Confirmation</h3>
              <p>{dashboard.supplierConfirmation}</p>
            </div>
            <div className="admin-card">
              <h3>Tracking</h3>
              <p>{dashboard.tracking}</p>
            </div>
            <div className="admin-card">
              <h3>Four-Eyes</h3>
              <p>{dashboard.fourEyesApproval}</p>
            </div>
            <div className="admin-card">
              <h3>FCT</h3>
              <p>{dashboard.fctReconciliation}</p>
            </div>
            <div className="admin-card">
              <h3>Inventory</h3>
              <p>{dashboard.inventoryReconciliation}</p>
            </div>
            <div className="admin-card">
              <h3>Financial</h3>
              <p>{dashboard.financialReconciliation}</p>
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

          <button type="button" className="admin-button" onClick={handleRequestReview}>
            Request Go-Live Review
          </button>
        </>
      )}
    </div>
  );
}
