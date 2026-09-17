"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchProductionAccessDashboard,
  runProductionAccessPreflightCheck,
  type ProductionAccessDashboard,
} from "@/lib/admin/interCarsProductionAccessClient";

export default function AdminInterCarsProductionAccessPanel() {
  const [dashboard, setDashboard] = useState<ProductionAccessDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetchProductionAccessDashboard();
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

  async function handlePreflight() {
    try {
      await runProductionAccessPreflightCheck();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preflight failed");
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Inter Cars Production Access Preparation</h1>
          <p className="admin-muted">
            Dry-run diagnostics only — no createOrder ·{" "}
            <Link href="/admin/supplier-production-order-validation">#342 Validation</Link>
          </p>
        </div>
      </header>

      <div className="admin-alert admin-alert-warning" role="status">
        CREDENTIALS: {dashboard?.productionCredentials || "NOT_CONFIGURED"} · #342:{" "}
        {dashboard?.controlledLiveValidation || "BLOCKED"} · CREATE ORDER:{" "}
        {dashboard?.createOrderCapability || "UNVERIFIED"} · NETWORK:{" "}
        {dashboard?.productionNetwork || "OFF"} · ORDER NETWORK:{" "}
        {dashboard?.supplierOrderNetwork || "OFF"} · REAL HTTP: {dashboard?.realHttpCalls ?? 0}
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-muted">Loading…</p>}

      {dashboard && (
        <>
          <section className="admin-grid admin-grid-4">
            <div className="admin-card">
              <h3>Profile</h3>
              <p>{dashboard.interCarsProfile}</p>
            </div>
            <div className="admin-card">
              <h3>Read-only Live</h3>
              <p>{dashboard.readOnlyLiveValidation}</p>
            </div>
            <div className="admin-card">
              <h3>Live Evidence</h3>
              <p>{dashboard.liveValidationEvidence}</p>
            </div>
            <div className="admin-card">
              <h3>Controlled Go-Live</h3>
              <p>{dashboard.controlledGoLive}</p>
            </div>
          </section>

          <section className="admin-card">
            <h3>Deployment Checklist</h3>
            <ul>
              {dashboard.checklist.map((item) => (
                <li key={item.id}>
                  [{item.status}] {item.label}: {item.message}
                </li>
              ))}
            </ul>
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

          <button type="button" className="admin-button" onClick={handlePreflight}>
            Validate Configuration (Dry-Run)
          </button>
        </>
      )}
    </div>
  );
}
