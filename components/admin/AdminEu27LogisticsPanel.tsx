"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchEu27LogisticsStatus } from "@/lib/eu27Logistics/client";

type Quality = {
  named?: number;
  uniqueLegal?: number;
  apiDocs?: number;
  mockTested?: number;
  parcelVerified?: number;
  postcodeCountries?: number;
};

export default function AdminEu27LogisticsPanel() {
  const [quality, setQuality] = useState<Quality | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const snap = await fetchEu27LogisticsStatus();
    setLive(Boolean(snap.liveShipment));
    setQuality((snap.quality as Quality) || null);
  }, []);

  const display: Quality = quality || {
    named: 1602,
    uniqueLegal: 1465,
    apiDocs: 17,
    mockTested: 3,
    parcelVerified: 0,
    postcodeCountries: 0,
  };

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "eu27.logistics.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade EU-27 Logistikstatus…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>EU-27 Logistik (v11)</h1>
        <p>Nur Status. Kein Live-Versand, kein Verkauf.</p>
      </header>
      {error && <p className="shop-modal-error">{error}</p>}
      <section className="admin-kpi-grid">
        {[
          ["Named", display.named ?? "—"],
          ["Legal keys", display.uniqueLegal ?? "—"],
          ["API docs", display.apiDocs ?? "—"],
          ["Mock tested", display.mockTested ?? "—"],
          ["Parcel verified", display.parcelVerified ?? "—"],
          ["Postcode countries", display.postcodeCountries ?? "—"],
          ["Live shipment", live ? "ON" : "OFF"],
        ].map(([label, value]) => (
          <div key={String(label)} className="admin-kpi">
            <span>{label}</span>
            <strong>{String(value)}</strong>
          </div>
        ))}
      </section>
      <p className="admin-note">Sandbox 0 · Live usable 0 · Sales closed</p>
    </div>
  );
}
