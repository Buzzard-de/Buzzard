const FULL_VIN = /\b[A-HJ-NPR-Z0-9]{17}\b/;

const CATALOG_SOURCES = Object.freeze(["mock", "licensed", "supplier", "manual"]);

function inferCatalogSource(record = {}) {
  const explicit = record.catalogSource || record.catalog_source;
  if (CATALOG_SOURCES.includes(explicit)) return explicit;
  if (record.provenance?.mock === true || record.mock === true) return "mock";
  return "manual";
}

function looksLikeFullVin(value) {
  if (typeof value !== "string") return false;
  const compact = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
  return compact.length === 17 && FULL_VIN.test(compact);
}

function stripFullVin(value, key) {
  if (looksLikeFullVin(value)) return "[vin-redacted]";
  if (Array.isArray(value)) return value.map((item) => stripFullVin(item, key));
  if (value && typeof value === "object") {
    const out = {};
    for (const [nextKey, nextValue] of Object.entries(value)) {
      if (nextKey === "fullVin" || nextKey === "full" || nextKey === "rawVin") continue;
      if (nextKey === "vin" && typeof nextValue === "string") {
        out.vin = looksLikeFullVin(nextValue) ? { present: true, fullVinStored: false } : nextValue;
        continue;
      }
      out[nextKey] = stripFullVin(nextValue, nextKey);
    }
    return out;
  }
  return value;
}

function sanitizeRecord(record = {}, domain) {
  const cleaned = stripFullVin(record);
  cleaned.domain = domain;
  cleaned.catalogSource = inferCatalogSource(record);
  if (cleaned.vin && typeof cleaned.vin === "object") {
    delete cleaned.vin.full;
    delete cleaned.vin.vin;
    cleaned.vin.fullVinStored = false;
  }
  return cleaned;
}

function payloadHasFullVin(payload) {
  if (payload == null) return false;
  if (typeof payload === "string") return looksLikeFullVin(payload) || FULL_VIN.test(payload);
  try {
    return FULL_VIN.test(JSON.stringify(payload));
  } catch {
    return false;
  }
}

module.exports = {
  CATALOG_SOURCES,
  inferCatalogSource,
  looksLikeFullVin,
  stripFullVin,
  sanitizeRecord,
  payloadHasFullVin,
};
