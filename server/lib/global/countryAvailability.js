/**
 * Country product availability — unknown availability → REVIEW_REQUIRED.
 */
function normalizeAvailabilityMap(countryAvailability = {}) {
  const map = {};
  for (const [code, value] of Object.entries(countryAvailability || {})) {
    map[String(code).toUpperCase()] = Boolean(value);
  }
  return map;
}

function isProductAvailableInCountry(product = {}, countryCode) {
  const code = String(countryCode || "").toUpperCase();
  const availability = normalizeAvailabilityMap(product.countryAvailability);

  if (!Object.keys(availability).length) {
    return { available: false, status: "REVIEW_REQUIRED", reason: "UNKNOWN_COUNTRY_AVAILABILITY" };
  }

  if (!(code in availability)) {
    return { available: false, status: "REVIEW_REQUIRED", reason: "COUNTRY_NOT_DEFINED" };
  }

  if (!availability[code]) {
    return { available: false, status: "BLOCKED", reason: "COUNTRY_RESTRICTED" };
  }

  const restrictions = product.countryRestrictions || {};
  if (restrictions[code]) {
    return { available: false, status: "BLOCKED", reason: "COUNTRY_RESTRICTED" };
  }

  return { available: true, status: "AVAILABLE", reason: null };
}

function filterProductsByCountry(products = [], countryCode) {
  return products.filter((product) => {
    const result = isProductAvailableInCountry(product, countryCode);
    return result.available;
  });
}

function validateCountryAvailability(product = {}) {
  const availability = normalizeAvailabilityMap(product.countryAvailability);
  const errors = [];
  const warnings = [];

  if (!Object.keys(availability).length) {
    errors.push({ code: "UNKNOWN_COUNTRY_AVAILABILITY", field: "countryAvailability", status: "REVIEW_REQUIRED" });
  }

  return {
    valid: errors.length === 0,
    status: errors.length ? "REVIEW_REQUIRED" : "VALID",
    errors,
    warnings,
    availability,
  };
}

module.exports = {
  normalizeAvailabilityMap,
  isProductAvailableInCountry,
  filterProductsByCountry,
  validateCountryAvailability,
};
