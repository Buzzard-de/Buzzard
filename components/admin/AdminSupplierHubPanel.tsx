"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  createSupplier,
  fetchMargins,
  fetchSupplierHubStatus,
  fetchSupplierOrders,
  fetchSupplierSyncJobs,
  fetchSuppliers,
  fetchSyncRuns,
  fetchVehicles,
  queueSupplierSyncAll,
  searchSourcing,
  seedDemoVehicles,
  syncSupplierFeed,
} from "@/lib/supplierHub/client";
import type {
  SupplierHubMargin,
  SupplierHubOrder,
  SupplierHubSourcingRow,
  SupplierHubStatus,
  SupplierHubSupplier,
  SupplierHubSyncJob,
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
  const [syncJobs, setSyncJobs] = useState<SupplierHubSyncJob[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierHubOrder[]>([]);
  const [sourcing, setSourcing] = useState<SupplierHubSourcingRow[]>([]);
  const [searchSku, setSearchSku] = useState("BZ-OIL-5W30");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [dropship, setDropship] = useState(false);

  const reload = useCallback(async () => {
    setError("");
    const [supplierRows, runRows, marginRows, vehicleRows, hubStatus, jobRows, orderRows, sourcingRows] =
      await Promise.all([
      fetchSuppliers(),
      fetchSyncRuns(15),
      fetchMargins(),
      fetchVehicles(),
      fetchSupplierHubStatus().catch(() => null),
      fetchSupplierSyncJobs().catch(() => []),
      fetchSupplierOrders().catch(() => []),
      searchSourcing({ sku: searchSku }).catch(() => []),
    ]);
    setSuppliers(supplierRows);
    setRuns(runRows);
    setMargins(marginRows);
    setVehicles(vehicleRows);
    setStatus(hubStatus);
    setSyncJobs(jobRows);
    setSupplierOrders(orderRows);
    setSourcing(sourcingRows);
  }, [searchSku]);

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

  async function handleQueueSyncAll() {
    setBusy(true);
    setError("");
    try {
      const result = await queueSupplierSyncAll();
      await reload();
      setMessage(`Sync queued: ${result.queued} jobs across ${result.suppliers} suppliers`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "supplierHub.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSourcingSearch() {
    setBusy(true);
    setError("");
    try {
      setSourcing(await searchSourcing({ sku: searchSku.trim() || undefined }));
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
        <h1>Supplier Hub v1.6</h1>
        {status?.version && <span className="admin-note">API v{status.version}</span>}
      </div>

      <p className="admin-note">
        B2B-Lieferanten, Feed-Sync, Sourcing-Engine, Dropship-Queue, Margen und TecDoc-Kompatibilität.
        Keine Live-Credentials — TecDoc erfordert eine kommerzielle Lizenz.
      </p>

      {error && <p className="shop-modal-error">{error}</p>}
      {message && <p className="admin-message">{message}</p>}

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
            <strong>{status.totals.queuedJobs ?? 0}</strong>
            <span>Queued Jobs</span>
          </article>
          <article className="admin-stat">
            <strong>{status.totals.supplierOrders ?? 0}</strong>
            <span>Dropship Orders</span>
          </article>
          <article className="admin-stat">
            <strong>{status.tecdocConfigured ? "JA" : "DEMO"}</strong>
            <span>TecDoc API</span>
          </article>
        </div>
      )}

      <section className="admin-panel">
        <h2>Sourcing Engine</h2>
        <div className="automation-queue-form">
          <input value={searchSku} onChange={(e) => setSearchSku(e.target.value)} placeholder="SKU / EAN / TecDoc" />
          <button type="button" className="shop-btn-primary" disabled={busy} onClick={handleSourcingSearch}>
            Suchen
          </button>
        </div>
        {sourcing.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Lieferant</th>
                  <th>SKU</th>
                  <th>Bestand</th>
                  <th>Kosten</th>
                  <th>Rating</th>
                  <th>Lead Time</th>
                </tr>
              </thead>
              <tbody>
                {sourcing.map((row) => (
                  <tr key={`${row.supplier}-${row.supplier_sku}`}>
                    <td>{row.supplier_name}</td>
                    <td>{row.supplier_sku}</td>
                    <td>{row.stock}</td>
                    <td>{row.cost?.toFixed(2)} €</td>
                    <td>{row.rating}</td>
                    <td>{row.lead_time_days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>Sync Queue</h2>
        <button type="button" className="shop-btn-primary" disabled={busy} onClick={handleQueueSyncAll}>
          Stock + Price + Catalog sync queue
        </button>
        {syncJobs.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Lieferant</th>
                  <th>Typ</th>
                  <th>Entity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {syncJobs.slice(0, 15).map((job) => (
                  <tr key={job.id}>
                    <td>{job.supplier}</td>
                    <td>{job.job_type}</td>
                    <td>{job.entity_key}</td>
                    <td>{job.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                  <th>Rating</th>
                  <th>Queued</th>
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
                    <td>{s.products ?? s.product_count ?? 0}</td>
                    <td>{s.rating ?? "—"}</td>
                    <td>{s.queuedJobs ?? 0}</td>
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
        <h2>Dropship Orders</h2>
        {supplierOrders.length === 0 ? (
          <p className="admin-note">Noch keine Dropship-Bestellungen in der Queue.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Lieferant</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>White Label</th>
                  <th>Blind Ship</th>
                </tr>
              </thead>
              <tbody>
                {supplierOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.supplier_name}</td>
                    <td>{order.order_number}</td>
                    <td>{order.status}</td>
                    <td>{order.white_label ? "YES" : "NO"}</td>
                    <td>{order.blind_shipping ? "YES" : "NO"}</td>
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
