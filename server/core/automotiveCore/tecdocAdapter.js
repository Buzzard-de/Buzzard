/**
 * Automotive Core — TecDoc adapter (Mock / DryRun / Real — real disabled by default).
 */
const legacyMock = require("../../lib/adapters/tecdocAdapter");
const { assertAutomotiveCoreSafety } = require("./safetyPolicy");

function getTecDocMode() {
  const enabled = process.env.TECDOC_ENABLED === "1";
  const dryRun = process.env.TECDOC_DRY_RUN !== "0";
  const hasCreds = Boolean(process.env.TECDOC_API_KEY || process.env.TECDOC_USERNAME);
  if (!enabled || dryRun || !hasCreds) return "mock";
  return "real";
}

function createTecDocAdapter() {
  const mode = getTecDocMode();
  if (mode === "real") {
    return {
      mode: "real",
      live: false,
      blocked: true,
      reason: "AUTOMOTIVE_LIVE_DISABLED",
      searchParts: async () => ({ ok: false, blocked: true, mock: false }),
      getPart: async () => ({ ok: false, blocked: true }),
      getVehicle: async () => ({ ok: false, blocked: true }),
      getVehicleFitment: async () => ({ ok: false, blocked: true }),
      getCategories: async () => ({ ok: false, blocked: true }),
      getManufacturers: async () => ({ ok: false, blocked: true }),
    };
  }

  if (mode === "mock" && process.env.TECDOC_ENABLED === "1" && process.env.TECDOC_DRY_RUN !== "0") {
    return {
      mode: "dry_run",
      live: false,
      dryRun: true,
      searchParts: async (q) => ({ ok: true, dryRun: true, query: q, records: [], source: "TECDOC_DRY_RUN" }),
      getPart: async (id) => ({ ok: true, dryRun: true, id, record: null, source: "TECDOC_DRY_RUN" }),
      getVehicle: async (q) => ({ ok: true, dryRun: true, vehicles: legacyMock.lookupVehicle(q), source: "TECDOC_DRY_RUN" }),
      getVehicleFitment: async (sku) => ({ ok: true, dryRun: true, fitment: legacyMock.getCompatibility(sku), source: "TECDOC_DRY_RUN" }),
      getCategories: async () => ({ ok: true, dryRun: true, categories: [], source: "TECDOC_DRY_RUN" }),
      getManufacturers: async () => ({ ok: true, dryRun: true, manufacturers: [], source: "TECDOC_DRY_RUN" }),
    };
  }

  return {
    mode: "mock",
    live: false,
    mock: true,
    searchParts: async (q) => ({ ok: true, mock: true, query: q, records: [], source: "MOCK" }),
    getPart: async (id) => ({ ok: true, mock: true, id, record: null, source: "MOCK" }),
    getVehicle: async (q) => ({ ok: true, mock: true, vehicles: legacyMock.lookupVehicle(q), source: "MOCK" }),
    getVehicleFitment: async (sku) => ({ ok: true, mock: true, fitment: legacyMock.getCompatibility(sku), source: "MOCK" }),
    getCategories: async () => ({ ok: true, mock: true, categories: [], source: "MOCK" }),
    getManufacturers: async () => ({ ok: true, mock: true, manufacturers: [], source: "MOCK" }),
  };
}

function getTecDocStatus() {
  const safety = assertAutomotiveCoreSafety();
  return {
    mode: getTecDocMode(),
    configured: Boolean(process.env.TECDOC_API_KEY || process.env.TECDOC_USERNAME),
    enabled: process.env.TECDOC_ENABLED === "1",
    dryRun: process.env.TECDOC_DRY_RUN !== "0",
    live: false,
    compliant: safety.compliant,
  };
}

module.exports = {
  getTecDocMode,
  createTecDocAdapter,
  getTecDocStatus,
};
