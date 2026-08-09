"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  createSupplier,
  fetchMargins,
  fetchSuppliers,
  fetchSyncRuns,
  fetchSupplierHubStatus,
  fetchVehicles,
  seedDemoVehicles,
  syncSupplierFeed,
} from "@/lib/supplierHub/client";
import type {
  SupplierHubMargin,
  SupplierHubStatus,
  SupplierHubSupplier,
  SupplierHubSyncRun,
  SupplierHubVehicle,
} from "@/lib/supplierHub/types";

const DEMO_FEED = [
  { sku: "SUP-001", name: "Bremsbelag Satz", cost_eur: 18.5, stock: 120, buzzard_sku: "BZ-BRAKE-001" },
  { sku: "SUP-002", name: "Ölfilter", cost_eur: 4.2, stock: 400 },
  { sku: "SUP-003", name: "Luftfilter", cost_eur: 6.8, stock: 250, buzzard_sku: "BZ-AIR-003" },
];

export default function AdminSupplierHubPanel() {
  const [status, setStatus] = useState<SupplierHubStatus | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierHubSupplier[]>([]);
  const [runs, setRuns] = useState<SupplierHubSyncRun[]>([]);
  const [margins, setMargins] = useState<SupplierHubMargin[]>([]);
  const [vehicles, setVehicles] = useState<SupplierHubVehicle[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [dropship, setDropship] = useState(false);

  const reload = useCallback(async () => {
    setError("");
    const [supplierRows, runRows, marginRows, vehicleRows, hubStatus] = await Promise.all([
      fetchSuppliers(),
      fetchSyncRuns(15),
      fetchMargins(),
      fetchVehicles(),
      fetchSupplierHubStatus().catch(() => null),
    ]);
    setSuppliers(supplierRows);
    setRuns(runRows);
    setMargins(marginRows);
    setVehicles(vehicleRows);
    setStatus(hubStatus);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "supplierHub.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function handleCreateSupplier(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createSupplier({ code: code.trim(), name: name.trim(), dropship, feedType: "manual" });
      setCode("");
      setName("");
      setDropship(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "supplierHub.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDemoSync(supplierId: number) {
    setBusy(true);
    setError("");
    try {
      await syncSupplierFeed(supplierId, { format: "json", payload: DEMO_FEED });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "supplierHub.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSeedVehicles() {
    setBusy(true);
    setError("");
    try {
      await seedDemoVehicles();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "supplierHub.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Supplier Hub wird geladen…</p>;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Supplier Hub + TecDoc</h1>
        {status?.version && <span className="admin-note">API v{status.version}</span>}
      </div>

      <p className="admin-note">
        Lieferanten-Registry, Feed-Sync (JSON/XML), Margen und Fahrzeug-/TecDoc-Kompatibilität. Keine Live-Credentials
        enthalten — TecDoc erfordert eine kommerzielle Lizenz.
      </p>

      {error && <p className="shop-modal-error">{error}</p>}

      {status && (
        <div className="admin-stat-grid">
          <article className="admin-stat">
            <strong>{status.totals.suppliers}</strong>
            <span>Lieferanten</span>
          </article>
          <article className="admin-stat">
            <strong>{status.totals.supplierProducts}</strong>
            <span>Supplier-Produkte</span>
          </article>
          <article className="admin-stat">
            <strong>{status.totals.vehicles}</strong>
            <span>Fahrzeuge</span>
          </article>
          <article className="admin-stat">
            <strong>{status.tecdocConfigured ? "JA" : "DEMO"}</strong>
            <span>TecDoc API</span>
          </article>
        </div>
      )}

      <section className="admin-panel">
        <h2>Lieferant anlegen</h2>
        <form className="automation-queue-form" onSubmit={handleCreateSupplier}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code z. B. ACME" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <label className="admin-checkbox">
            <input type="checkbox" checked={dropship} onChange={(e) => setDropship(e.target.checked)} />
            Dropship
          </label>
          <button type="submit" className="shop-btn-primary" disabled={busy}>
            Anlegen
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <h2>Lieferanten</h2>
        {suppliers.length === 0 ? (
          <p className="admin-note">Noch keine Lieferanten — oben anlegen oder Demo-Sync starten.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Feed</th>
                  <th>Produkte</th>
                  <th>Modus</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.code}</td>
                    <td>{s.feed_type}</td>
                    <td>{s.product_count ?? 0}</td>
                    <td>{s.dropship ? "DROPSHIP" : "STANDARD"}</td>
                    <td>
                      <button
                        type="button"
                        className="shop-btn-secondary"
                        disabled={busy}
                        onClick={() => handleDemoSync(s.id)}
                      >
                        Demo-Sync
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>Sync-Verlauf</h2>
        {runs.length === 0 ? (
          <p className="admin-note">Noch keine Sync-Läufe.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Lieferant</th>
                  <th>Status</th>
                  <th>Import</th>
                  <th>Update</th>
                  <th>Fehler</th>
                  <th>Zeit</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.supplier_name}</td>
                    <td>{run.status}</td>
                    <td>{run.imported}</td>
                    <td>{run.updated}</td>
                    <td>{run.errors}</td>
                    <td>{run.started_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>Margen (Einkauf vs. Verkauf)</h2>
        {margins.length === 0 ? (
          <p className="admin-note">Nach einem Demo-Sync mit buzzard_sku-Mapping erscheinen Margen.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Artikel</th>
                  <th>Einkauf</th>
                  <th>Verkauf</th>
                  <th>Marge</th>
                </tr>
              </thead>
              <tbody>
                {margins.slice(0, 20).map((row) => (
                  <tr key={row.supplier_sku}>
                    <td>{row.name || row.supplier_sku}</td>
                    <td>{row.cost_eur?.toFixed(2)} €</td>
                    <td>{row.price_eur != null ? `${row.price_eur.toFixed(2)} €` : "—"}</td>
                    <td>{row.margin_percent == null ? "UNMAPPED" : `${row.margin_percent}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>Fahrzeug-Selektor</h2>
        <p className="admin-note">
          Demo-Fahrzeuge für TecDoc-Kompatibilität und spätere Anbindung an die FAHRZEUGWAHL im Shop.
        </p>
        <button type="button" className="shop-btn-primary" disabled={busy} onClick={handleSeedVehicles}>
          Demo-Fahrzeuge seeden
        </button>
        {vehicles.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Marke</th>
                  <th>Modell</th>
                  <th>Motor</th>
                  <th>Baujahre</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td>{v.make}</td>
                    <td>{v.model}</td>
                    <td>{v.engine}</td>
                    <td>
                      {v.year_from}–{v.year_to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
