"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchSupplierOrderReadinessDashboard,
  fetchSupplierOrderReadinessRecords,
  evaluateSupplierOrderReadinessScope,
  previewSupplierOrderActivation,
  type ReadinessDashboard,
} from "@/lib/admin/supplierOrderReadinessClient";

export default function AdminSupplierOrderReadinessPanel() {
  const [dashboard, setDashboard] = useState<ReadinessDashboard | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [dashRes, rowsRes] = await Promise.all([
        fetchSupplierOrderReadinessDashboard(),
        fetchSupplierOrderReadinessRecords(),
      ]);
      setDashboard(dashRes.data);
      setRows(rowsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load readiness gate");
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

  async function handleEvaluate() {
    const res = await evaluateSupplierOrderReadinessScope({
      supplierId: "TEST_SUPPLIER_A",
      market: "DE",
      channel: "DIRECT",
    });
    setPreview(null);
    setRows((prev) => [res.data, ...prev]);
    await reload();
  }

  async function handlePreview() {
    const res = await previewSupplierOrderActivation({
      supplierId: "TEST_SUPPLIER_A",
      market: "DE",
      channel: "DIRECT",
    });
    setPreview(res.data);
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Supplier Order Readiness Gate</h1>
          <p className="admin-muted">
            Production readiness &amp; approval ·{" "}
            <Link href="/admin/fulfillment">Fulfillment Tower</Link> ·{" "}
            <Link href="/admin/suppliers">Suppliers</Link>
          </p>
        </div>
      </header>

      {dashboard && (
        <div className="admin-alert admin-alert-warning" role="status">
          REAL SUPPLIER ORDER NETWORK: {dashboard.realSupplierOrderNetwork} · Current environment:{" "}
          {dashboard.currentEnvironment} · Global kill switch:{" "}
          {dashboard.globalKillSwitch ? "ENABLED" : "DISABLED"}
        </div>
      )}

      {error && <p className="admin-error">{error}</p>}
      {loading && <p>Loading…</p>}

      {dashboard && (
        <section className="admin-grid admin-grid-4">
          <div className="admin-card">
            <h3>Suppliers Ready</h3>
            <p>{dashboard.suppliersReady}</p>
          </div>
          <div className="admin-card">
            <h3>Suppliers Blocked</h3>
            <p>{dashboard.suppliersBlocked}</p>
          </div>
          <div className="admin-card">
            <h3>Pending Approvals</h3>
            <p>{dashboard.pendingApprovals}</p>
          </div>
          <div className="admin-card">
            <h3>Critical Blockers</h3>
            <p>{dashboard.criticalBlockers}</p>
          </div>
        </section>
      )}

      <section className="admin-actions">
        <button type="button" className="admin-btn" onClick={handleEvaluate}>
          Evaluate TEST_SUPPLIER_A / DE / DIRECT
        </button>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={handlePreview}>
          Dry-run Activation Preview
        </button>
      </section>

      {preview && (
        <section className="admin-card">
          <h3>Dry-run Activation Preview</h3>
          <pre>{JSON.stringify(preview, null, 2)}</pre>
        </section>
      )}

      <section className="admin-card">
        <h3>Readiness Records</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Market</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Approval</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row) => (
              <tr key={String(row.readinessId)}>
                <td>{String(row.supplierId)}</td>
                <td>{String(row.market)}</td>
                <td>{String(row.channel)}</td>
                <td>{String(row.overallStatus)}</td>
                <td>{String(row.approvalStatus)}</td>
                <td>{String(row.riskLevel)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
