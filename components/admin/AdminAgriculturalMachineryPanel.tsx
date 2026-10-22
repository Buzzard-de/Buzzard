"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import { fetchAgriculturalAdminOverview, importMockAgriculturalCatalog } from "@/lib/agriculturalMachinery/client";

export default function AdminAgriculturalMachineryPanel() {
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);

  const reload = useCallback(async () => {
    setOverview(await fetchAgriculturalAdminOverview());
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      return;
    }
    reload().catch((err) => setError(err instanceof Error ? err.message : "requestFailed"));
  }, [reload]);

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Landmaschinen-Kompatibilität</h1>
        <p>Lokaler Mock-Katalog. Getrennt von Baumaschinen und Kfz. Keine Live-Bestellung.</p>
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
            <strong>{String(overview.implementation ?? "")}</strong>
            <span>Status</span>
          </div>
        </section>
      )}
      <button
        type="button"
        className="shop-btn-primary"
        onClick={async () => {
          setImportResult(await importMockAgriculturalCatalog());
          await reload();
        }}
      >
        Mock-Katalog importieren
      </button>
      {importResult ? <pre>{JSON.stringify(importResult, null, 2)}</pre> : null}
    </div>
  );
}
