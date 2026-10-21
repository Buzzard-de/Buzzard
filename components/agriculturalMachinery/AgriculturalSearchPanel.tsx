"use client";

import { useState, type FormEvent } from "react";
import {
  evaluateAgriculturalCompatibility,
  isAgriculturalMachineryApiConfigured,
  searchAgriculturalMachinery,
} from "@/lib/agriculturalMachinery/client";

export default function AgriculturalSearchPanel() {
  const [q, setQ] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [modelCode, setModelCode] = useState("");
  const [serial, setSerial] = useState("");
  const [year, setYear] = useState("");
  const [pto, setPto] = useState("");
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [decision, setDecision] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const apiReady = isAgriculturalMachineryApiConfigured();

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!apiReady) {
      setError("API ist nicht konfiguriert. Keine Live-Lieferantenabfrage.");
      return;
    }
    const result = await searchAgriculturalMachinery({
      q,
      manufacturer,
      modelCode,
      serial,
      year,
      pto,
      categoryId: "cat-20",
    });
    setItems(result.items || []);
    if (q && (manufacturer || modelCode)) {
      const compat = await evaluateAgriculturalCompatibility({
        oemPartNumber: q,
        manufacturer,
        modelCode,
        serialNumber: serial,
        year: year ? Number(year) : undefined,
        ptoSpeed: pto,
        categoryId: "cat-20",
      });
      setDecision(compat.decision || compat);
    }
  }

  return (
    <div className="legal-prose">
      <p>
        Nur Landtechnik. Baumaschinen- und Kfz-Kompatibilität werden hier nicht ausgewertet. Unsichere Treffer
        bleiben unsicher. Bestand ist Lieferantenmeldung, kein verifizierter Lagerbestand.
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
        <label>
          Zapfwellendrehzahl
          <input value={pto} onChange={(event) => setPto(event.target.value)} name="pto" />
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
          </li>
        ))}
      </ul>
    </div>
  );
}
