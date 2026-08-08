"use client";

import { FormEvent, useEffect, useState } from "react";
import { fetchSyncLogs, retryImport, runImport } from "@/lib/admin/client";
import type { ImportLogEntry, SyncJob } from "@/lib/admin/types";

const DEMO_IMPORT = [
  {
    supplier_sku: "DEMO-IMPORT-001",
    name: "Demo Import Bremsflüssigkeit",
    brand: "Demo Brand",
    supplier_category: "Brakes",
    supplier_price: { amount: 4.5, currency: "EUR" },
    stock: 120,
    ean_gtin: "4006633999001",
  },
];

export default function AdminSyncPanel() {
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLogEntry[]>([]);
  const [supplierId, setSupplierId] = useState("SUP-DEMO-001");
  const [message, setMessage] = useState("");

  async function load() {
    const data = await fetchSyncLogs();
    setSyncJobs(data.syncJobs);
    setImportLogs(data.importLogs);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function handleDemoImport(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      const job = await runImport({ supplierId, format: "json", payload: DEMO_IMPORT, mode: "manual" });
      setMessage(`Import abgeschlossen: ${job.records_created} neu, ${job.records_updated} aktualisiert, ${job.records_failed} Fehler.`);
      load();
    } catch {
      setMessage("Import fehlgeschlagen.");
    }
  }

  async function handleRetry(logId: string) {
    await retryImport(logId);
    load();
  }

  return (
    <div className="admin-page">
      <h1>Sync & Import</h1>
      <form className="admin-panel" onSubmit={handleDemoImport}>
        <h2>Test-Import</h2>
        <label>Lieferant
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="SUP-DEMO-001">SUP-DEMO-001</option>
            <option value="SUP-INTERNAL-001">SUP-INTERNAL-001</option>
          </select>
        </label>
        <button type="submit" className="shop-btn-primary">Demo-Produkt importieren</button>
        {message && <p className="admin-message">{message}</p>}
      </form>

      <section className="admin-panel">
        <h2>Sync-Jobs</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Lieferant</th><th>Modus</th><th>Status</th><th>Gelesen</th><th>Neu</th><th>Update</th><th>Fehler</th></tr>
            </thead>
            <tbody>
              {syncJobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.id}</td>
                  <td>{job.supplier_id}</td>
                  <td>{job.mode}</td>
                  <td>{job.status}</td>
                  <td>{job.records_read}</td>
                  <td>{job.records_created}</td>
                  <td>{job.records_updated}</td>
                  <td>{job.records_failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <h2>Import-Log</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Zeit</th><th>Lieferant</th><th>Referenz</th><th>Fehler</th><th>Retry</th><th></th></tr>
            </thead>
            <tbody>
              {importLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString("de-DE")}</td>
                  <td>{log.supplier_id}</td>
                  <td>{log.record_reference}</td>
                  <td>{log.error_message}</td>
                  <td>{log.retry_status}</td>
                  <td>
                    {log.retry_status === "pending" && (
                      <button type="button" className="shop-btn-secondary" onClick={() => handleRetry(log.id)}>
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
