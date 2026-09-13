"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchSupplierFoundationDetail,
  fetchSupplierFoundationOverview,
  resetSupplierFoundationCursor,
  runSupplierFoundationConnectionTest,
  runSupplierFoundationTestSync,
  runSupplierFoundationLiveReadSync,
  setSupplierFoundationEnabled,
  triggerSupplierFoundationSync,
  type SupplierFoundationDashboard,
  type SupplierFoundationDetail,
  type SupplierFoundationRow,
} from "@/lib/admin/supplierFoundationClient";
import {
  getSupplierAdminLabels,
  type AdminLabelLocale,
} from "@/lib/supplier-engine/adminLabels";

const LOCALES: AdminLabelLocale[] = ["de", "en", "tr", "ar"];

export default function AdminSupplierOperationsPanel() {
  const [locale, setLocale] = useState<AdminLabelLocale>("de");
  const [rows, setRows] = useState<SupplierFoundationRow[]>([]);
  const [dashboard, setDashboard] = useState<SupplierFoundationDashboard | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupplierFoundationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [testSyncResult, setTestSyncResult] = useState<object | null>(null);

  const t = useMemo(() => getSupplierAdminLabels(locale), [locale]);
  const rtl = locale === "ar";

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetchSupplierFoundationOverview();
      setRows(res.data || []);
      setDashboard(res.dashboard || null);
      if (selectedId) {
        const detailRes = await fetchSupplierFoundationDetail(selectedId);
        setDetail(detailRes.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  }, [selectedId, t.error]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("admin.auth.required");
      setLoading(false);
      return;
    }
    reload();
  }, [reload]);

  async function handleSync(supplierId: string, jobType: "FULL" | "INCREMENTAL" = "FULL") {
    setActionLoading(true);
    try {
      await triggerSupplierFoundationSync(supplierId, jobType);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggle(supplierId: string, enable: boolean) {
    setActionLoading(true);
    try {
      await setSupplierFoundationEnabled(supplierId, enable);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConnectionTest(supplierId: string) {
    setActionLoading(true);
    try {
      await runSupplierFoundationConnectionTest(supplierId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLiveReadSync(supplierId: string) {
    setActionLoading(true);
    try {
      await runSupplierFoundationLiveReadSync(supplierId, "FULL");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTestSync(supplierId: string) {
    setActionLoading(true);
    try {
      const res = await runSupplierFoundationTestSync(supplierId);
      setTestSyncResult(res.data);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCursorReset(supplierId: string) {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setActionLoading(true);
    try {
      await resetSupplierFoundationCursor(supplierId);
      setConfirmReset(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="admin-page" dir={rtl ? "rtl" : "ltr"}>
      <header className="admin-page-header">
        <div>
          <h1>{t.title}</h1>
          <p className="admin-muted">
            Supplier Foundation ·{" "}
            <Link href="/admin/supplier-hub">Supplier Hub</Link> ·{" "}
            <Link href="/admin/supplier-integration-hub">Integration Hub</Link>
          </p>
        </div>
        <div className="admin-inline-actions">
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              className={`admin-btn ${locale === code ? "admin-btn-primary" : "admin-btn-secondary"}`}
              onClick={() => setLocale(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}
      {loading ? <p>{t.loading}</p> : null}

      {dashboard ? (
        <section className="admin-kpi-grid">
          <article className="admin-stat"><strong>{dashboard.totalSuppliers}</strong><span>{t.total}</span></article>
          <article className="admin-stat"><strong>{dashboard.activeSuppliers}</strong><span>{t.active}</span></article>
          <article className="admin-stat"><strong>{dashboard.healthy}</strong><span>{t.healthy}</span></article>
          <article className="admin-stat"><strong>{dashboard.degraded}</strong><span>{t.degraded}</span></article>
          <article className="admin-stat"><strong>{dashboard.unhealthy}</strong><span>{t.unhealthy}</span></article>
          <article className="admin-stat"><strong>{dashboard.disabled}</strong><span>{t.disabled}</span></article>
          <article className="admin-stat"><strong>{dashboard.syncing}</strong><span>{t.syncing}</span></article>
          <article className="admin-stat"><strong>{dashboard.productsProcessed}</strong><span>{t.productsProcessed}</span></article>
        </section>
      ) : null}

      <section className="admin-panel">
        <h2>{t.suppliers}</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t.name}</th>
                <th>{t.connector}</th>
                <th>{t.health}</th>
                <th>{t.syncStatus}</th>
                <th>{t.reliability}</th>
                <th>{t.markets}</th>
                <th>{t.capabilities}</th>
                <th>{t.detail}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.supplierId}>
                  <td>
                    <button
                      type="button"
                      className="admin-link-btn"
                      onClick={() => {
                        setSelectedId(row.supplierId);
                        fetchSupplierFoundationDetail(row.supplierId)
                          .then((res) => setDetail(res.data || null))
                          .catch((err) => setError(err instanceof Error ? err.message : t.error));
                      }}
                    >
                      {row.name}
                    </button>
                    <div className="admin-muted">{row.supplierId}</div>
                  </td>
                  <td>{row.integrationTypes}</td>
                  <td>{row.health}</td>
                  <td>{row.syncStatus}</td>
                  <td>{(row.reliabilityScore * 100).toFixed(0)}%</td>
                  <td>{row.supportedMarkets.join(", ")}</td>
                  <td>{row.capabilities}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      disabled={actionLoading}
                      onClick={() => handleSync(row.supplierId, "FULL")}
                    >
                      {t.manualSync}
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading ? (
                <tr><td colSpan={8}>{t.noData}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {detail && selectedId ? (
        <section className="admin-panel">
          <h2>{detail.general.name}</h2>
          <div className="admin-kpi-grid">
            <article className="admin-stat"><strong>{detail.general.supplierId}</strong><span>ID</span></article>
            <article className="admin-stat"><strong>{detail.general.country}</strong><span>Country</span></article>
            <article className="admin-stat"><strong>{detail.general.connector}</strong><span>{t.connector}</span></article>
            <article className="admin-stat"><strong>{detail.general.environment || "MOCK"}</strong><span>{t.environment}</span></article>
            <article className="admin-stat"><strong>{detail.connection?.status || "—"}</strong><span>{t.connectionStatus}</span></article>
            <article className="admin-stat"><strong>{String(detail.health.status)}</strong><span>{t.health}</span></article>
            <article className="admin-stat"><strong>{String(detail.sync.syncStatus)}</strong><span>{t.syncStatus}</span></article>
            <article className="admin-stat"><strong>{Number(detail.health.reliability).toFixed(2)}</strong><span>{t.reliability}</span></article>
          </div>

          <div className="admin-inline-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={actionLoading}
              onClick={() => handleSync(selectedId, "INCREMENTAL")}
            >
              {t.manualSync} (Incremental)
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              disabled={actionLoading}
              onClick={() => handleConnectionTest(selectedId)}
            >
              {t.testConnection}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              disabled={actionLoading}
              onClick={() => handleTestSync(selectedId)}
            >
              {t.testSync}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              disabled={actionLoading}
              onClick={() => handleLiveReadSync(selectedId)}
            >
              {t.liveReadSync}
            </button>
            {detail.general.active ? (
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={actionLoading}
                onClick={() => handleToggle(selectedId, false)}
              >
                {t.disable}
              </button>
            ) : (
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={actionLoading}
                onClick={() => handleToggle(selectedId, true)}
              >
                {t.enable}
              </button>
            )}
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              disabled={actionLoading}
              onClick={() => handleCursorReset(selectedId)}
            >
              {confirmReset ? t.confirmReset : t.resetCursor}
            </button>
          </div>

          <h3>{t.markets}</h3>
          <p>{detail.markets.join(", ") || "—"}</p>

          {detail.connection ? (
            <>
              <h3>{t.connection}</h3>
              <p className="admin-muted">
                {t.connectionStatus}: {detail.connection.status} · {t.lastHealthCheck}:{" "}
                {detail.connection.lastChecked}
              </p>
            </>
          ) : null}

          {"metrics" in detail && detail.metrics ? (
            <div className="admin-kpi-grid">
              <article className="admin-stat"><strong>{String((detail.metrics as Record<string, unknown>).productCount)}</strong><span>{t.productCount}</span></article>
              <article className="admin-stat"><strong>{String((detail.metrics as Record<string, unknown>).offerCount)}</strong><span>{t.offerCount}</span></article>
              <article className="admin-stat"><strong>{String((detail.metrics as Record<string, unknown>).errorCount)}</strong><span>{t.error}</span></article>
            </div>
          ) : null}

          {testSyncResult ? (
            <>
              <h3>{t.testSync}</h3>
              {"dataQuality" in testSyncResult ? <h4>{t.dataQuality}</h4> : null}
              <pre className="admin-code-block">{JSON.stringify(testSyncResult, null, 2)}</pre>
            </>
          ) : null}

          <h3>{t.cursor}</h3>
          <pre className="admin-code-block">
            {JSON.stringify(
              {
                incremental: detail.sync.incrementalCursor,
                full: detail.sync.fullCursor,
              },
              null,
              2
            )}
          </pre>

          <h3>Audit</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Action</th><th>Actor</th><th>Time</th></tr>
              </thead>
              <tbody>
                {detail.audit.map((entry) => (
                  <tr key={String(entry.id)}>
                    <td>{String(entry.action)}</td>
                    <td>{String(entry.actor || "system")}</td>
                    <td>{String(entry.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
