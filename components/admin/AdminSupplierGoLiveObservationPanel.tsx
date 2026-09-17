"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchObservationDashboard,
  startObservation,
  type ObservationDashboard,
} from "@/lib/admin/supplierGoLiveObservationClient";

export default function AdminSupplierGoLiveObservationPanel() {
  const [dashboard, setDashboard] = useState<ObservationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetchObservationDashboard();
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

  async function handleStart() {
    try {
      await startObservation({ market: "DE", channel: "DIRECT" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Start failed");
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Go-Live Observation & Broader Rollout (#346)</h1>
          <p className="admin-muted">
            OBSERVATION_ACTIVE ≠ BROADER_ROLLOUT_ACTIVE ·{" "}
            <Link href="/admin/supplier-controlled-go-live">Controlled Go-Live (#345)</Link> ·{" "}
            <Link href="/admin/supplier-first-production-order">First Order (#344)</Link>
          </p>
        </div>
      </header>

      <div className="admin-alert admin-alert-warning" role="status">
        OBSERVATION: {dashboard?.observationState || "BLOCKED"} · ROLLOUT:{" "}
        {dashboard?.broaderRollout || "BLOCKED"} · GO-LIVE: {dashboard?.controlledGoLive || "BLOCKED"} · EVIDENCE:{" "}
        {dashboard?.liveValidation || "NONE"} · NETWORK: {dashboard?.productionNetwork || "OFF"} · REAL HTTP:{" "}
        {dashboard?.realSupplierHttpCalls ?? 0}
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-muted">Loading…</p>}

      {dashboard && (
        <>
          <section className="admin-grid admin-grid-4">
            <div className="admin-card">
              <h3>Observations</h3>
              <p>{dashboard.observationCount}</p>
            </div>
            <div className="admin-card">
              <h3>Observed Orders</h3>
              <p>{dashboard.observedOrders}</p>
            </div>
            <div className="admin-card">
              <h3>Success Rate</h3>
              <p>{(dashboard.successRate * 100).toFixed(1)}%</p>
            </div>
            <div className="admin-card">
              <h3>Critical Incidents</h3>
              <p>{dashboard.criticalIncidents}</p>
            </div>
          </section>

          <section className="admin-grid admin-grid-3">
            <div className="admin-card">
              <h3>Supplier Health</h3>
              <p>{dashboard.supplierHealth}</p>
            </div>
            <div className="admin-card">
              <h3>Fulfillment</h3>
              <p>{dashboard.fulfillmentQuality}</p>
            </div>
            <div className="admin-card">
              <h3>Financial</h3>
              <p>{dashboard.financialQuality}</p>
            </div>
            <div className="admin-card">
              <h3>Returns</h3>
              <p>{dashboard.returns}</p>
            </div>
            <div className="admin-card">
              <h3>Rollout Scope</h3>
              <p>{dashboard.rolloutScope}</p>
            </div>
            <div className="admin-card">
              <h3>Four-Eyes</h3>
              <p>{dashboard.fourEyesApproval}</p>
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

          <button type="button" className="admin-button" onClick={handleStart}>
            Start Observation
          </button>
        </>
      )}
    </div>
  );
}
