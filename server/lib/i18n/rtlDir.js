/**
 * Storefront RTL contract. Arabic is the only RTL catalogue language.
 */
function isRtlLanguage(code) {
  return String(code || "").toLowerCase() === "ar";
}

function htmlDirForLanguage(code) {
  return isRtlLanguage(code) ? "rtl" : "ltr";
}

function isolateLtrFields() {
  return ["price", "sku", "ean", "mpn", "postalCode"];
}

module.exports = { isRtlLanguage, htmlDirForLanguage, isolateLtrFields };
