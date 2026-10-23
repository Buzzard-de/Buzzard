"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { searchAgriculturalMachinery } from "@/lib/agriculturalMachinery/client";
import { searchConstructionMachinery } from "@/lib/constructionMachinery/client";
import {
  machineryHubCopy,
  type MachineryHubDomain,
} from "@/lib/machinery/hubDomain";
import { isMachineryApiConfigured } from "@/lib/machineryApi";
import { searchVehicleParts } from "@/lib/vehiclePartsIntelligence/client";
import {
  MIN_VEHICLE_SEARCH_YEAR,
  isAcceptedVehicleSearchYear,
  maxVehicleSearchYear,
} from "@/lib/vehicles/yearRange";

interface CategoryHubMachinerySearchProps {
  domain: MachineryHubDomain;
  categoryId: string;
}

interface HubHit {
  id: string;
  label: string;
  meta: string;
}

export default function CategoryHubMachinerySearch({
  domain,
  categoryId,
}: CategoryHubMachinerySearchProps) {
  const copy = machineryHubCopy(domain);
  const [q, setQ] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [items, setItems] = useState<HubHit[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const apiReady = isMachineryApiConfigured();

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    setError("");
    setItems([]);
    if (!apiReady) {
      setError("API ist nicht konfiguriert. Keine Live-Lieferantenabfrage.");
      return;
    }
    if (domain === "automotive" && year && !isAcceptedVehicleSearchYear(year)) {
      setError(
        `Baujahr muss zwischen ${MIN_VEHICLE_SEARCH_YEAR} und ${maxVehicleSearchYear()} liegen.`
      );
      return;
    }
    setLoading(true);
    try {
      const scopedCategory = categoryId || copy.categoryId;
      const params: Record<string, string> = {
        q,
        manufacturer,
        categoryId: scopedCategory,
      };
      if (year) params.year = year;
      if (domain === "automotive") {
        if (model) params.model = model;
        const result = await searchVehicleParts(params);
        setItems(mapHits(result.items));
        return;
      }
      if (model) params.modelCode = model;
      const result =
        domain === "agricultural"
          ? await searchAgriculturalMachinery(params)
          : await searchConstructionMachinery(params);
      setItems(mapHits(result.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suche fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="hub-machinery-search" aria-label={copy.title}>
      <div className="hub-machinery-search-head">
        <strong>{copy.title}</strong>
        <p>{copy.hint}</p>
      </div>
      <form onSubmit={onSearch} className="hub-machinery-search-form">
        <label>
          OEM / Teil
          <input value={q} onChange={(event) => setQ(event.target.value)} name="q" />
        </label>
        <label>
          Hersteller
          <input
            value={manufacturer}
            onChange={(event) => setManufacturer(event.target.value)}
            name="manufacturer"
          />
        </label>
        <label>
          Modell
          <input value={model} onChange={(event) => setModel(event.target.value)} name="model" />
        </label>
        <label>
          Baujahr
          <input
            value={year}
            onChange={(event) => setYear(event.target.value)}
            name="year"
            inputMode="numeric"
            min={domain === "automotive" ? MIN_VEHICLE_SEARCH_YEAR : undefined}
            max={domain === "automotive" ? maxVehicleSearchYear() : undefined}
          />
        </label>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Suche…" : "Suchen"}
        </button>
      </form>
      <p className="hub-machinery-search-more">
        <Link href={copy.moreHref}>{copy.moreLabel}</Link>
      </p>
      {error ? <p className="shop-modal-error">{error}</p> : null}
      {items.length > 0 ? (
        <ul className="hub-machinery-search-hits">
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong>
              {item.meta ? <span> · {item.meta}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

function mapHits(raw: unknown): HubHit[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 5).map((item, index) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id || `hit-${index}`),
      label: String(row.oemPartNumber || row.id || "Treffer"),
      meta: String(row.matchKind || row.manufacturer || ""),
    };
  });
}
