/**
 * Part 16 — Product data provenance tracking.
 * Every staged/imported product retains traceable source metadata.
 */
const { BLOCKING_CODES } = require("../../core/productLifecycleConstants");

function buildProvenance({
  sourceSupplierCode,
  sourceProductId,
  sourceFeedFormat,
  sourceUrl,
  importJobId,
  actorId,
  rawChecksum,
  verified = false,
} = {}) {
  const now = new Date().toISOString();
  return {
    sourceSupplierCode: sourceSupplierCode || null,
    sourceProductId: sourceProductId || null,
    sourceFeedFormat: sourceFeedFormat || null,
    sourceUrl: sourceUrl || null,
    importJobId: importJobId || null,
    actorId: actorId || null,
    rawChecksum: rawChecksum || null,
    verified: Boolean(verified),
    importedAt: now,
    updatedAt: now,
    lastValidatedAt: null,
    validationSource: verified ? "supplier_feed" : "unverified",
  };
}

function touchProvenance(provenance, patch = {}) {
  const base = provenance && typeof provenance === "object" ? { ...provenance } : buildProvenance();
  return {
    ...base,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

function validateProvenance(provenance) {
  const issues = [];
  if (!provenance?.sourceSupplierCode) {
    issues.push(BLOCKING_CODES.SUPPLIER_MISSING);
  }
  if (!provenance?.importedAt) {
    issues.push(BLOCKING_CODES.PROVENANCE_MISSING);
  }
  return { ok: issues.length === 0, issues };
}

function serializeProvenance(provenance) {
  return JSON.stringify(provenance || {});
}

function parseProvenance(json) {
  if (!json) return null;
  try {
    return typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    return null;
  }
}

module.exports = {
  buildProvenance,
  touchProvenance,
  validateProvenance,
  serializeProvenance,
  parseProvenance,
};
