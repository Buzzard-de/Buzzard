"use client";

import { useState, type FormEvent } from "react";
import {
  evaluateVehicleCompatibility,
  isVehiclePartsApiConfigured,
  searchVehicleParts,
} from "@/lib/vehiclePartsIntelligence/client";

export default function VehiclePartsSearchPanel() {
  const [q, setQ] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [generation, setGeneration] = useState("");
  const [engineCode, setEngineCode] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [decision, setDecision] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const apiReady = isVehiclePartsApiConfigured();

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!apiReady) {
      setError("API ist nicht konfiguriert. Keine Live-Lieferantenabfrage.");
      return;
    }
    const result = await searchVehicleParts({
      q,
      manufacturer,
      model,
      generation,
      engineCode,
      year,
      categoryId: "cat-05",
    });
    setItems(result.items || []);
    if (q && (manufacturer || model)) {
      const compat = await evaluateVehicleCompatibility({
        oemPartNumber: q,
        manufacturer,
        model,
        generation,
        engineCode,
        year: year ? Number(year) : undefined,
        vin: vin || undefined,
        categoryId: "cat-05",
      });
      setDecision(compat.decision || compat);
    }
  }

  return (
    <div className="legal-prose">
      <p>
        Nur Fahrzeugteile. Landtechnik- und Baumaschinen-Kompatibilität werden hier nicht ausgewertet. VIN wird
        nicht gespeichert und gilt nicht als Katalogautorität. Hochvoltteile tragen Warnungen. Bestand ist
        Lieferantenmeldung.
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
          Modell
          <input value={model} onChange={(event) => setModel(event.target.value)} name="model" />
        </label>
        <label>
          Generation
          <input value={generation} onChange={(event) => setGeneration(event.target.value)} name="generation" />
        </label>
        <label>
          Motorcode
          <input value={engineCode} onChange={(event) => setEngineCode(event.target.value)} name="engineCode" />
        </label>
        <label>
          Baujahr
          <input value={year} onChange={(event) => setYear(event.target.value)} name="year" inputMode="numeric" />
        </label>
        <label>
          VIN (optional, nicht gespeichert)
          <input value={vin} onChange={(event) => setVin(event.target.value)} name="vin" autoComplete="off" />
        </label>
        <button type="submit" className="btn-primary">
          Suchen
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
        </section>
      )}
      <ul>
        {items.map((item) => (
          <li key={String(item.id)}>
            {String(item.oemPartNumber || item.id)} · {String(item.matchKind || "")}
            {item.hvWarning ? " · HV" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
