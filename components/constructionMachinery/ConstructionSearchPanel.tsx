"use client";

import { useState, type FormEvent } from "react";
import {
  evaluateConstructionCompatibility,
  isConstructionMachineryApiConfigured,
  searchConstructionMachinery,
} from "@/lib/constructionMachinery/client";
import type { ConstructionSearchItem } from "@/lib/constructionMachinery/types";

export default function ConstructionSearchPanel() {
  const [q, setQ] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [modelCode, setModelCode] = useState("");
  const [serial, setSerial] = useState("");
  const [year, setYear] = useState("");
  const [items, setItems] = useState<ConstructionSearchItem[]>([]);
  const [decision, setDecision] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const apiReady = isConstructionMachineryApiConfigured();

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    setError("");
    setDecision(null);
    if (!apiReady) {
      setError("API ist nicht konfiguriert (NEXT_PUBLIC_BUZZARD_API_URL). Keine Live-Lieferantenabfrage.");
      return;
    }
    setLoading(true);
    try {
      const result = await searchConstructionMachinery({
        q,
        manufacturer,
        modelCode,
        serial,
        year,
      });
      setItems(result.items || []);
      if (q && (manufacturer || modelCode)) {
        const compat = await evaluateConstructionCompatibility({
          oem: q,
          manufacturer,
          modelCode,
          serial,
          year: year ? Number(year) : undefined,
        });
        setDecision(compat.decision || compat);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suche fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="legal-prose">
      <p>
        Katalogmodus. Kompatibilität braucht nachvollziehbare Evidenz. Mögliche Alternativen gelten nicht als
        bestätigte OEM-Teile. Lagerbestände werden nur angezeigt, wenn ein Import vorhanden ist — und dann als
        Lieferantenmeldung, nicht als verifizierter Bestand.
      </p>
      <form onSubmit={onSearch} className="contact-form">
        <label>
          OEM / Teilenummer / Stichwort
          <input value={q} onChange={(event) => setQ(event.target.value)} name="q" />
        </label>
        <label>
          Hersteller
          <input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} name="manufacturer" />
        </label>
        <label>
          Modellcode
          <input value={modelCode} onChange={(event) => setModelCode(event.target.value)} name="modelCode" />
        </label>
        <label>
          Seriennummer
          <input value={serial} onChange={(event) => setSerial(event.target.value)} name="serial" />
        </label>
        <label>
          Baujahr
          <input value={year} onChange={(event) => setYear(event.target.value)} name="year" inputMode="numeric" />
        </label>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Prüfe…" : "Suchen"}
        </button>
      </form>
      {error && <p className="shop-modal-error">{error}</p>}
      {decision && (
        <section>
          <h2>Kompatibilität</h2>
          <p>
            <strong>{String(decision.state || "")}</strong>
          </p>
          <p>{String(decision.explanation || "")}</p>
          {Array.isArray(decision.missingInformation) && decision.missingInformation.length > 0 && (
            <p>Fehlende Angaben: {decision.missingInformation.join(", ")}</p>
          )}
        </section>
      )}
      <section>
        <h2>Ergebnisse</h2>
        {items.length === 0 ? <p>Keine Treffer. Ohne Import bleibt der Katalog leer.</p> : null}
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.oemPartNumber || item.id}</strong> · {item.manufacturer} · {item.matchKind}
              {item.verifiedExactMatch ? " · exakte OEM-Nummer" : ""}
              {item.compatibility ? ` · ${item.compatibility.state}` : ""}
              <br />
              {item.descriptions.de || item.descriptions.en || ""}
              <br />
              Quelle: {item.provenance.providerId}
              {item.provenance.mock ? " (Mock)" : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
