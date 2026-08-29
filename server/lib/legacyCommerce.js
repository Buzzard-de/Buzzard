/**
 * Part 10 — Legacy commerce route markers (migration to /api/commerce/*)
 * Part 12 — Server-side commercial block when SALES=0
 */
const LEGACY_COMMERCE_HEADER = "x-buzzard-legacy-commerce";

function markLegacyCommerce(res, route, replacement) {
  res.setHeader(LEGACY_COMMERCE_HEADER, "true");
  res.setHeader("Deprecation", "true");
  if (replacement) {
    res.setHeader("Link", `<${replacement}>; rel="successor-version"`);
  }
  res.setHeader("X-Buzzard-Legacy-Route", route);
}

function requireLegacyCommerceAllowed(req, res) {
  const salesGuard = require("./commerce/salesGuard");
  const block = salesGuard.assertCommercialTransactionAllowed({ req });
  if (block) {
    res.status(block.status || 403).json({
      error: block.message,
      code: block.code,
      legacy: true,
    });
    return false;
  }
  return true;
}

function legacyCommerceWarning(route, replacement) {
  return (_req, res, next) => {
    markLegacyCommerce(res, route, replacement);
    if (typeof next === "function") next();
  };
}

module.exports = {
  LEGACY_COMMERCE_HEADER,
  markLegacyCommerce,
  legacyCommerceWarning,
  requireLegacyCommerceAllowed,
};
