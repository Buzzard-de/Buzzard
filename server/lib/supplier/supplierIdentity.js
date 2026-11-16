/**
 * GTIN and MPN checks shared by the supplier connector and the dry catalog.
 * No database and no network.
 */
const productValidator = require("../productValidator");

function validateGtin(gtin) {
  const result = productValidator.validateEan(gtin);
  if (!result.ok) {
    return { ok: false, code: result.error || "invalid_gtin", value: result.value };
  }
  if (result.warning === "missing_ean") {
    return { ok: false, code: "missing_gtin", value: "" };
  }
  return { ok: true, value: result.value };
}

function validateMpn(mpn) {
  const value = String(mpn || "").trim();
  if (!value) return { ok: false, code: "missing_mpn" };
  if (value.length < 2 || value.length > 64) return { ok: false, code: "invalid_mpn_length" };
  if (/^(mock|demo|test|n\/a|na|none)$/i.test(value)) {
    return { ok: false, code: "invalid_mpn_placeholder" };
  }
  if (/^(mock|demo|test)[-_\s]/i.test(value)) {
    return { ok: false, code: "invalid_mpn_placeholder" };
  }
  return { ok: true, value };
}

module.exports = { validateGtin, validateMpn };
