/**
 * Part 16 — Automotive fitment schema preparation (MOCK TecDoc until real credentials).
 * Missing fitment must not be invented.
 */
const { BLOCKING_CODES } = require("../../core/productLifecycleConstants");

function normalizeFitmentEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const brand = String(entry.brand || entry.manufacturer || "").trim();
  const model = String(entry.model || "").trim();
  if (!brand || !model) return null;

  return {
    brand,
    model,
    type: String(entry.type || entry.variant || "").trim() || null,
    engine: String(entry.engine || "").trim() || null,
    yearFrom: entry.year_from ?? entry.yearFrom ?? null,
    yearTo: entry.year_to ?? entry.yearTo ?? null,
    kba: String(entry.kba || entry.kba_number || "").trim() || null,
    oemNumber: String(entry.oem_number || entry.oemNumber || entry.part_reference || "").trim() || null,
    tecdocReference: String(entry.tecdoc_reference || entry.tecdocArticle || entry.tecdoc_article || "").trim() || null,
    source: entry.source || "supplier_feed",
    verified: Boolean(entry.verified),
  };
}

function normalizeFitmentList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeFitmentEntry).filter(Boolean).slice(0, 100);
}

function validateFitmentRecord(record, { requireFitment = false } = {}) {
  const fitment = normalizeFitmentList(record.vehicleFitment || record.fitment || []);
  const issues = [];

  if (requireFitment && fitment.length === 0) {
    issues.push(BLOCKING_CODES.FITMENT_UNVERIFIED);
  }

  const tecdocConfigured = Boolean(process.env.TECDOC_API_KEY);
  const hasTecdocRef = Boolean(record.tecdocArticle) || fitment.some((f) => f.tecdocReference);

  return {
    ok: issues.length === 0,
    issues,
    fitment,
    tecdoc: {
      adapterMode: tecdocConfigured ? "CONFIGURED_MOCK" : "MOCK",
      configured: tecdocConfigured,
      liveCalls: false,
      hasReference: hasTecdocRef,
      note: "TecDoc adapter remains MOCK until real API credentials and live integration are approved.",
    },
    oemNumbers: Array.isArray(record.oemNumbers) ? record.oemNumbers.filter(Boolean) : [],
    mpn: record.mpn || null,
  };
}

module.exports = {
  normalizeFitmentEntry,
  normalizeFitmentList,
  validateFitmentRecord,
};
