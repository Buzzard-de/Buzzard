import type { AutomotiveCompatibility } from "./types";

export function normalizeCompatibilityEntry(raw: Record<string, unknown>): AutomotiveCompatibility | null {
  const make = String(raw.make || raw.brand || raw.manufacturer || "").trim();
  const model = String(raw.model || "").trim();
  if (!make || !model) return null;

  const oemRaw = raw.oemNumbers || raw.oem_numbers || raw.oemNumber || raw.oem_number || raw.part_reference;
  const oemNumbers = Array.isArray(oemRaw)
    ? oemRaw.map(String)
    : oemRaw
      ? [String(oemRaw)]
      : [];

  return {
    vehicleId: raw.vehicleId ? String(raw.vehicleId) : undefined,
    make,
    model,
    generation: raw.generation ? String(raw.generation) : undefined,
    engine: raw.engine ? String(raw.engine) : undefined,
    yearFrom: raw.yearFrom != null ? Number(raw.yearFrom) : raw.year_from != null ? Number(raw.year_from) : undefined,
    yearTo: raw.yearTo != null ? Number(raw.yearTo) : raw.year_to != null ? Number(raw.year_to) : undefined,
    kw: raw.kw != null ? Number(raw.kw) : raw.kW != null ? Number(raw.kW) : undefined,
    ps: raw.ps != null ? Number(raw.ps) : raw.PS != null ? Number(raw.PS) : undefined,
    oemNumbers,
    tecdocReference: raw.tecdocReference || raw.tecdoc_reference
      ? String(raw.tecdocReference || raw.tecdoc_reference)
      : undefined,
    source: raw.source ? String(raw.source) : "supplier_feed",
    verified: Boolean(raw.verified),
  };
}

export function normalizeCompatibilityList(list: unknown[]): AutomotiveCompatibility[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => normalizeCompatibilityEntry(entry as Record<string, unknown>))
    .filter((e): e is AutomotiveCompatibility => e !== null)
    .slice(0, 100);
}

/** TecDoc-ready structure — no live API calls. */
export function toTecdocReadyFormat(compatibility: AutomotiveCompatibility[]): Array<Record<string, unknown>> {
  return compatibility.map((c) => ({
    make: c.make,
    model: c.model,
    generation: c.generation,
    engine: c.engine,
    yearFrom: c.yearFrom,
    yearTo: c.yearTo,
    kw: c.kw,
    ps: c.ps,
    oemNumbers: c.oemNumbers,
    tecdocReference: c.tecdocReference,
    adapterMode: "MOCK",
  }));
}
