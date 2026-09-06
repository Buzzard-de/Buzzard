/**
 * Automotive Core — identity engine (wraps existing validators).
 */
const { validateProductIdentity } = require("../../lib/pim/productIdentityValidator");
const { validateGtin, validateMpn } = require("../../lib/supplier/realSupplierConnector");

function validateGTIN(gtin) {
  return validateGtin(gtin);
}

function validateEAN(ean) {
  return validateGtin(ean);
}

function validateMPN(mpn) {
  return validateMpn(mpn);
}

function validateOEM(oem) {
  const text = String(oem || "").trim();
  if (!text) return { ok: false, code: "missing_oem" };
  if (text.length < 3) return { ok: false, code: "invalid_oem" };
  return { ok: true, code: "valid_oem", normalized: text.toUpperCase() };
}

function buildIdentityFingerprint(product = {}, { includeSku = false } = {}) {
  const parts = [
    product.gtin || product.ean,
    product.mpn,
    product.brand || product.manufacturer,
    product.oem,
  ];
  if (includeSku && product.sku) parts.push(`sku:${product.sku}`);
  const filtered = parts.filter(Boolean).map((p) => String(p).trim().toLowerCase());
  return filtered.length ? filtered.join("|") : null;
}

function detectDuplicateProduct(product = {}, existing = []) {
  if (!product.sku && !product.mpn && !product.gtin && !product.ean) {
    return { duplicate: false, status: "REVIEW_REQUIRED", matches: [] };
  }

  const skuMatches = existing.filter((other) => other.sku && product.sku && other.sku === product.sku);
  if (skuMatches.length) {
    return { duplicate: true, status: "REVIEW_REQUIRED", matches: skuMatches.map((m) => ({ sku: m.sku, id: m.id })) };
  }

  const fp = buildIdentityFingerprint(product);
  const matches = existing.filter((other) => {
    const otherFp = buildIdentityFingerprint(other);
    return fp && otherFp && fp === otherFp;
  });

  if (matches.length === 0) return { duplicate: false, status: "PASS", matches: [] };
  return {
    duplicate: true,
    status: "REVIEW_REQUIRED",
    matches: matches.map((m) => ({ sku: m.sku, id: m.id })),
  };
}

function validateIdentity(product = {}, options = {}) {
  const result = validateProductIdentity(product, options);
  const oemCheck = product.oem ? validateOEM(product.oem) : { ok: true };
  return {
    ...result,
    gtin: validateGTIN(product.gtin || product.ean),
    ean: validateEAN(product.ean),
    mpn: validateMPN(product.mpn),
    oem: oemCheck,
    fingerprint: buildIdentityFingerprint(product),
  };
}

module.exports = {
  validateGTIN,
  validateEAN,
  validateMPN,
  validateOEM,
  buildIdentityFingerprint,
  detectDuplicateProduct,
  validateIdentity,
};
