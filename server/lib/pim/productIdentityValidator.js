/**
 * Part 22 — Deterministic product identity validation (no invented identifiers).
 */
const { validateGtin, validateMpn } = require("../supplier/realSupplierConnector");
const { BLOCKING_CODES } = require("../../core/productLifecycleConstants");
const { buildBlockReason, PLACEHOLDER_PATTERNS } = require("../../core/productQualityHardeningConstants");
const { normalizeSku } = require("./skuNormalizer");
const { normalizeBrand } = require("./brandNormalizer");

function isPlaceholder(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(text));
}

function validateProductIdentity(record, options = {}) {
  const findings = [];
  const requireGtin = options.requireGtin !== false;
  const requireMpn = options.requireMpn !== false;

  const gtinCheck = validateGtin(record.gtin || record.ean || record.ean_gtin);
  if (requireGtin && !gtinCheck.ok) {
    findings.push(
      buildBlockReason(
        gtinCheck.code === "missing_gtin" ? BLOCKING_CODES.GTIN_MISSING : BLOCKING_CODES.GTIN_INVALID,
        "gtin",
        gtinCheck.code === "missing_gtin" ? "GTIN is required." : "GTIN format or checksum is invalid."
      )
    );
  }

  const mpnCheck = validateMpn(record.mpn);
  if (requireMpn && !mpnCheck.ok) {
    findings.push(
      buildBlockReason(
        mpnCheck.code === "missing_mpn" ? BLOCKING_CODES.MPN_MISSING : BLOCKING_CODES.MPN_INVALID,
        "mpn",
        mpnCheck.code === "missing_mpn" ? "MPN is required." : "MPN is missing, invalid, or a placeholder."
      )
    );
  }

  const brandRaw = record.brand || record.manufacturer;
  const brandNorm = normalizeBrand(brandRaw);
  if (!brandRaw || !String(brandRaw).trim()) {
    findings.push(buildBlockReason(BLOCKING_CODES.BRAND_MISSING, "manufacturer", "Brand/manufacturer is required."));
  } else if (isPlaceholder(brandRaw)) {
    findings.push(
      buildBlockReason(BLOCKING_CODES.BRAND_MISSING, "manufacturer", "Brand/manufacturer appears to be a placeholder.")
    );
  } else if (!brandNorm.canonical && brandNorm.unknown) {
    findings.push(
      buildBlockReason(
        "MANUFACTURER_UNKNOWN",
        "manufacturer",
        "Manufacturer is unknown and requires review.",
        "CONDITION"
      )
    );
  }

  const name = String(record.title || record.name || "").trim();
  if (!name) {
    findings.push(buildBlockReason(BLOCKING_CODES.TITLE_MISSING, "name", "Product name is required."));
  } else if (isPlaceholder(name)) {
    findings.push(buildBlockReason("TITLE_PLACEHOLDER", "name", "Product name appears to be a placeholder."));
  }

  const skuResult = normalizeSku(record.sku || record.supplier_sku || record.supplierSku);
  if (!skuResult.original) {
    findings.push(buildBlockReason("SKU_MISSING", "sku", "SKU is required."));
  } else if (!skuResult.ok) {
    findings.push(buildBlockReason("SKU_INVALID", "sku", skuResult.reason || "SKU format is invalid."));
  }

  const blocked = findings.some((f) => f.severity === "BLOCKED");
  const condition = findings.some((f) => f.severity === "CONDITION");

  return {
    ok: !blocked,
    status: blocked ? "BLOCKED" : condition ? "CONDITION" : "PASS",
    findings,
    normalized: {
      gtin: gtinCheck.ok ? gtinCheck.value : null,
      mpn: mpnCheck.ok ? mpnCheck.value : null,
      brand: brandNorm.normalized,
      brandRaw: brandNorm.raw,
      sku: skuResult.normalized,
      skuOriginal: skuResult.original,
      name,
    },
  };
}

module.exports = {
  validateProductIdentity,
  isPlaceholder,
};
