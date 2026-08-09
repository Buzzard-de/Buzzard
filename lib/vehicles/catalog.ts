import type { SupplierHubVehicle } from "@/lib/supplierHub/types";
import { fetchVehicles } from "@/lib/supplierHub/client";
import { isVehicleApiEnabled } from "@/lib/api/config";
import { vehicleBrands, vehicleEngines, vehicleYears } from "./static";
import type { SavedVehicle } from "@/types";

export type VehicleCatalog = {
  brands: Record<string, string[]>;
  years: string[];
  engines: string[];
  apiRows: SupplierHubVehicle[];
  fromApi: boolean;
};

export function getStaticVehicleCatalog(): VehicleCatalog {
  return {
    brands: vehicleBrands,
    years: vehicleYears,
    engines: vehicleEngines,
    apiRows: [],
    fromApi: false,
  };
}

function yearsForRange(from: number, to: number): string[] {
  const years: string[] = [];
  for (let year = to; year >= from; year -= 1) {
    years.push(String(year));
  }
  return years;
}

export function buildVehicleCatalogFromApi(rows: SupplierHubVehicle[]): VehicleCatalog {
  const brands: Record<string, string[]> = {};
  const engineSet = new Set<string>();
  const yearSet = new Set<string>();

  for (const row of rows) {
    if (!brands[row.make]) brands[row.make] = [];
    if (!brands[row.make].includes(row.model)) brands[row.make].push(row.model);
    if (row.engine) engineSet.add(row.engine);
    for (const year of yearsForRange(row.year_from, row.year_to)) {
      yearSet.add(year);
    }
  }

  for (const make of Object.keys(brands)) {
    brands[make].sort((a, b) => a.localeCompare(b, "de"));
  }

  return {
    brands,
    years: [...yearSet].sort((a, b) => Number(b) - Number(a)),
    engines: [...engineSet].sort((a, b) => a.localeCompare(b, "de")),
    apiRows: rows,
    fromApi: true,
  };
}

let activeCatalog: VehicleCatalog = getStaticVehicleCatalog();

export function getActiveVehicleCatalog(): VehicleCatalog {
  return activeCatalog;
}

export function setActiveVehicleCatalog(catalog: VehicleCatalog): void {
  activeCatalog = catalog;
}

export async function loadVehicleCatalog(): Promise<VehicleCatalog> {
  if (!isVehicleApiEnabled()) {
    const fallback = getStaticVehicleCatalog();
    setActiveVehicleCatalog(fallback);
    return fallback;
  }

  try {
    const rows = await fetchVehicles();
    if (!rows.length) {
      const fallback = getStaticVehicleCatalog();
      setActiveVehicleCatalog(fallback);
      return fallback;
    }
    const catalog = buildVehicleCatalogFromApi(rows);
    setActiveVehicleCatalog(catalog);
    return catalog;
  } catch {
    const fallback = getStaticVehicleCatalog();
    setActiveVehicleCatalog(fallback);
    return fallback;
  }
}

export function yearsForVehicleSelection(
  catalog: VehicleCatalog,
  brand: string,
  model: string
): string[] {
  if (!catalog.fromApi) return catalog.years;
  const years = new Set<string>();
  for (const row of catalog.apiRows) {
    if (row.make !== brand || row.model !== model) continue;
    for (const year of yearsForRange(row.year_from, row.year_to)) {
      years.add(year);
    }
  }
  const list = [...years].sort((a, b) => Number(b) - Number(a));
  return list.length ? list : catalog.years;
}

export function enginesForVehicleSelection(
  catalog: VehicleCatalog,
  brand: string,
  model: string
): string[] {
  if (!catalog.fromApi) return catalog.engines;
  const engines = new Set<string>();
  for (const row of catalog.apiRows) {
    if (row.make === brand && row.model === model && row.engine) {
      engines.add(row.engine);
    }
  }
  const list = [...engines].sort((a, b) => a.localeCompare(b, "de"));
  return list.length ? list : catalog.engines;
}

export function resolveVehicleId(catalog: VehicleCatalog, vehicle: SavedVehicle): number | undefined {
  if (vehicle.vehicleId) return vehicle.vehicleId;
  if (!catalog.fromApi) return undefined;

  const year = Number(vehicle.year);
  const match = catalog.apiRows.find(
    (row) =>
      row.make === vehicle.brand &&
      row.model === vehicle.model &&
      row.engine === vehicle.engine &&
      year >= row.year_from &&
      year <= row.year_to
  );
  return match?.id;
}
