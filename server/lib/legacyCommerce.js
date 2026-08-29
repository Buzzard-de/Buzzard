/**
 * Part 10 — Legacy commerce route markers (migration to /api/commerce/*)
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
};
