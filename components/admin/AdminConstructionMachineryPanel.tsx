"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchConstructionAdminOverview,
  importMockConstructionCatalog,
} from "@/lib/constructionMachinery/client";

export default function AdminConstructionMachineryPanel() {
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);

  const reload = useCallback(async () => {
    const data = await fetchConstructionAdminOverview();
    setOverview(data);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      return;
    }
    reload().catch((err) => setError(err instanceof Error ? err.message : "requestFailed"));
  }, [reload]);

  async function onImport() {
    setError("");
    try {
      const result = await importMockConstructionCatalog();
      setImportResult(result);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "importFailed");
    }
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Baumaschinen-Kompatibilität</h1>
        <p>Lokaler Mock-Katalog. Keine Live-Lieferanten, keine Bestellungen, keine Verkaufsfreigabe.</p>
      </header>
      {error && <p className="shop-modal-error">{error}</p>}
      {overview && (
        <section className="admin-kpi-grid">
          <div className="admin-kpi">
            <strong>{String(overview.machines ?? 0)}</strong>
            <span>Maschinen</span>
          </div>
          <div className="admin-kpi">
            <strong>{String(overview.parts ?? 0)}</strong>
            <span>Teile</span>
          </div>
          <div className="admin-kpi">
            <strong>{String(overview.evidence ?? 0)}</strong>
            <span>Evidenz</span>
          </div>
          <div className="admin-kpi">
            <strong>{String(overview.implementation ?? "")}</strong>
            <span>Status</span>
          </div>
        </section>
      )}
      <p>
        <button type="button" className="shop-btn-primary" onClick={onImport}>
          Mock-Katalog importieren
        </button>
      </p>
      {importResult ? <pre>{JSON.stringify(importResult, null, 2)}</pre> : null}
    </div>
  );
}
